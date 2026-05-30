// Email-verification primitives for submissions (RENT-ahstlnjb).
//
// One submission can spawn multiple email_verifications rows over its lifetime
// — but at any moment, at most one is "live" (created, not consumed, not
// expired, not attempt-locked). Helpers below find/create/consume that row.
//
// Token & code:
//   - token: crypto.randomUUID() — the magic-link path component
//             (https://<host>/verify/<token>).
//   - code:  6-digit numeric, kept as a TEXT column so leading zeros survive.
//            Generated with crypto.getRandomValues(Uint32Array(1)) %
//            1_000_000 then zero-padded; uniform enough for one-shot use.
//
// TTL / locks:
//   - LIVE_TTL_MS   = 30 minutes from created_at.
//   - MAX_ATTEMPTS  = 5 wrong-code POSTs; sixth call returns "locked",
//                     contributor must request a resend.
//   - RESEND_COOLDOWN_S = 60s minimum gap between createVerification() calls
//                         for the same submission (silently no-ops a too-soon
//                         resend; caller can detect via Result.cooldown).
//
// All times stored as ISO-8601 strings (datetime('now')) to match the rest of
// the schema. Comparisons use datetime() in SQL or Date.parse() in JS.

import { newShortID } from "./id";

const LIVE_TTL_MS = 30 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_S = 60;

export type Verification = {
  id: string;
  submissionId: string;
  email: string;
  code: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  consumedAt: string | null;
  attempts: number;
};

type Row = {
  id: string;
  submission_id: string;
  email: string;
  code: string;
  token: string;
  created_at: string;
  expires_at: string;
  consumed_at: string | null;
  attempts: number;
};

const rowToVerification = (r: Row): Verification => ({
  id: r.id,
  submissionId: r.submission_id,
  email: r.email,
  code: r.code,
  token: r.token,
  createdAt: r.created_at,
  expiresAt: r.expires_at,
  consumedAt: r.consumed_at,
  attempts: r.attempts,
});

// generateCode returns a 6-digit numeric string, leading-zero preserved.
export function generateCode(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(buf[0] % 1_000_000).padStart(6, "0");
}

// generateToken returns a URL-safe magic-link path component. UUID v4 from
// the Workers runtime; collision-resistance is fine for our scale (millions
// of links before birthday paradox bites).
export function generateToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

export type CreateResult =
  | { kind: "created"; verification: Verification }
  | { kind: "cooldown"; retryAfterSeconds: number };

// createVerification inserts a new email_verifications row, unless the last
// row for this submission was created less than RESEND_COOLDOWN_S ago (in
// which case we return { kind: 'cooldown' } and the caller silently no-ops
// the user-visible "resend sent" UI hint to avoid leaking timing).
export async function createVerification(
  db: D1Database,
  submissionId: string,
  email: string,
): Promise<CreateResult> {
  const last = await db
    .prepare(`SELECT created_at FROM email_verifications WHERE submission_id = ? ORDER BY created_at DESC LIMIT 1`)
    .bind(submissionId)
    .first<{ created_at: string }>();
  if (last) {
    const lastMs = Date.parse(last.created_at + "Z"); // SQLite datetime() returns UTC w/o tz suffix
    const nowMs = Date.parse(new Date().toISOString());
    const elapsedS = (nowMs - lastMs) / 1000;
    if (elapsedS < RESEND_COOLDOWN_S) {
      return { kind: "cooldown", retryAfterSeconds: Math.ceil(RESEND_COOLDOWN_S - elapsedS) };
    }
  }

  const id = newShortID();
  const token = generateToken();
  const code = generateCode();
  const now = new Date();
  const createdAt = isoForSqlite(now);
  const expiresAt = isoForSqlite(new Date(now.getTime() + LIVE_TTL_MS));

  await db
    .prepare(
      `INSERT INTO email_verifications (id, submission_id, email, code, token, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, submissionId, email, code, token, createdAt, expiresAt)
    .run();

  return {
    kind: "created",
    verification: { id, submissionId, email, code, token, createdAt, expiresAt, consumedAt: null, attempts: 0 },
  };
}

// findLive returns the most recent non-consumed, non-expired, non-locked
// verification for a submission, or null. Used to render the "we already
// sent a code" UX on /verify and to look up which row a code belongs to.
export async function findLive(db: D1Database, submissionId: string): Promise<Verification | null> {
  const now = isoForSqlite(new Date());
  const row = await db
    .prepare(
      `SELECT * FROM email_verifications
       WHERE submission_id = ?
         AND consumed_at IS NULL
         AND attempts < ?
         AND expires_at > ?
       ORDER BY created_at DESC LIMIT 1`,
    )
    .bind(submissionId, MAX_ATTEMPTS, now)
    .first<Row>();
  return row ? rowToVerification(row) : null;
}

export type ConsumeResult =
  | { kind: "ok"; verification: Verification }
  | { kind: "not_found" }
  | { kind: "expired" }
  | { kind: "already_consumed" }
  | { kind: "locked" }
  | { kind: "wrong_code"; attemptsRemaining: number };

// consumeByToken — magic-link path. Looks up the row by token, checks expiry/
// consumed/locked, marks consumed + bumps submissions.verify_state. Returns
// the verification on success so the caller can show "we verified <email>".
export async function consumeByToken(db: D1Database, token: string): Promise<ConsumeResult> {
  const row = await db.prepare(`SELECT * FROM email_verifications WHERE token = ?`).bind(token).first<Row>();
  if (!row) return { kind: "not_found" };
  if (row.consumed_at) return { kind: "already_consumed" };
  if (row.attempts >= MAX_ATTEMPTS) return { kind: "locked" };
  const now = new Date();
  if (Date.parse(row.expires_at + "Z") < now.getTime()) return { kind: "expired" };
  await markConsumed(db, row.id, row.submission_id, now);
  return { kind: "ok", verification: rowToVerification({ ...row, consumed_at: isoForSqlite(now) }) };
}

// consumeByCode — code-entry path. Looks up the latest LIVE verification for
// the submission, then constant-time-compares the code. Wrong code bumps
// `attempts`; on the MAX_ATTEMPTS-th wrong code, subsequent calls return
// "locked" (force a resend).
export async function consumeByCode(db: D1Database, submissionId: string, code: string): Promise<ConsumeResult> {
  const row = await db
    .prepare(
      `SELECT * FROM email_verifications
       WHERE submission_id = ?
       ORDER BY created_at DESC LIMIT 1`,
    )
    .bind(submissionId)
    .first<Row>();
  if (!row) return { kind: "not_found" };
  if (row.consumed_at) return { kind: "already_consumed" };
  if (row.attempts >= MAX_ATTEMPTS) return { kind: "locked" };
  const now = new Date();
  if (Date.parse(row.expires_at + "Z") < now.getTime()) return { kind: "expired" };

  if (!constantTimeEq(row.code, code)) {
    const newAttempts = row.attempts + 1;
    await db
      .prepare(`UPDATE email_verifications SET attempts = ? WHERE id = ?`)
      .bind(newAttempts, row.id)
      .run();
    if (newAttempts >= MAX_ATTEMPTS) return { kind: "locked" };
    return { kind: "wrong_code", attemptsRemaining: MAX_ATTEMPTS - newAttempts };
  }

  await markConsumed(db, row.id, row.submission_id, now);
  return { kind: "ok", verification: rowToVerification({ ...row, consumed_at: isoForSqlite(now) }) };
}

// isAlreadyVerified — short-circuit for /verify pages so we don't ask a user
// to verify twice if they hit refresh after consuming.
export async function isAlreadyVerified(db: D1Database, submissionId: string): Promise<boolean> {
  const row = await db
    .prepare(`SELECT verify_state FROM submissions WHERE id = ?`)
    .bind(submissionId)
    .first<{ verify_state: string }>();
  return row?.verify_state === "verified";
}

// ---------------------------------------------------------------------
// Pre-submission verifications (no submission_id yet) — RENT-ahstlnjb
// continued. Mirrors the bound-verification surface, but operates against
// the pre_email_verifications table. Lifecycle: created by POST
// /email/verify-now, consumed by GET /verify/:token or POST /verify, and
// optionally attached to a real submission by attachPreToSubmission() at
// final-submit time.
// ---------------------------------------------------------------------

export type PreVerification = {
  id: string;
  email: string;
  code: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  consumedAt: string | null;
  attempts: number;
  linkedSubmissionId: string | null;
};

type PreRow = {
  id: string;
  email: string;
  code: string;
  token: string;
  created_at: string;
  expires_at: string;
  consumed_at: string | null;
  attempts: number;
  linked_submission_id: string | null;
};

const preRowToVerification = (r: PreRow): PreVerification => ({
  id: r.id,
  email: r.email,
  code: r.code,
  token: r.token,
  createdAt: r.created_at,
  expiresAt: r.expires_at,
  consumedAt: r.consumed_at,
  attempts: r.attempts,
  linkedSubmissionId: r.linked_submission_id,
});

export type CreatePreResult =
  | { kind: "created"; preVerification: PreVerification }
  | { kind: "rate_limited"; retryAfterSeconds: number };

// Per-email rate limit: drops a too-fast resend WITHOUT user-visible signal.
// Pairs with the silent-spam-control intent in RENT-okskjmao (the actual
// downstream silent-spam aggregate logic is separate; this is just a basic
// per-email cooldown to prevent trivial mail-flood abuse).
const PRE_RESEND_COOLDOWN_S = 60;
const PRE_PER_EMAIL_HOURLY_CAP = 5;

export async function createPreVerification(
  db: D1Database,
  email: string,
): Promise<CreatePreResult> {
  // Cooldown: last row for this email within PRE_RESEND_COOLDOWN_S?
  const last = await db
    .prepare(`SELECT created_at FROM pre_email_verifications WHERE email = ? ORDER BY created_at DESC LIMIT 1`)
    .bind(email)
    .first<{ created_at: string }>();
  if (last) {
    const lastMs = Date.parse(last.created_at + "Z");
    const nowMs = Date.parse(new Date().toISOString());
    const elapsed = (nowMs - lastMs) / 1000;
    if (elapsed < PRE_RESEND_COOLDOWN_S) {
      return { kind: "rate_limited", retryAfterSeconds: Math.ceil(PRE_RESEND_COOLDOWN_S - elapsed) };
    }
  }
  // Per-email hourly cap: max PRE_PER_EMAIL_HOURLY_CAP rows in last hour.
  const oneHourAgo = isoForSqliteFromNow(-60 * 60 * 1000);
  const recent = await db
    .prepare(`SELECT count(*) AS n FROM pre_email_verifications WHERE email = ? AND created_at > ?`)
    .bind(email, oneHourAgo)
    .first<{ n: number }>();
  if (recent && recent.n >= PRE_PER_EMAIL_HOURLY_CAP) {
    return { kind: "rate_limited", retryAfterSeconds: 60 * 60 };
  }

  const id = newShortID();
  const token = generateToken();
  const code = generateCode();
  const now = new Date();
  const createdAt = isoForSqlite(now);
  const expiresAt = isoForSqlite(new Date(now.getTime() + LIVE_TTL_MS));

  await db
    .prepare(
      `INSERT INTO pre_email_verifications (id, email, code, token, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, email, code, token, createdAt, expiresAt)
    .run();

  return {
    kind: "created",
    preVerification: {
      id,
      email,
      code,
      token,
      createdAt,
      expiresAt,
      consumedAt: null,
      attempts: 0,
      linkedSubmissionId: null,
    },
  };
}

export async function findPreById(db: D1Database, id: string): Promise<PreVerification | null> {
  const row = await db.prepare(`SELECT * FROM pre_email_verifications WHERE id = ?`).bind(id).first<PreRow>();
  return row ? preRowToVerification(row) : null;
}

export async function consumePreByToken(db: D1Database, token: string): Promise<ConsumeResult> {
  const row = await db.prepare(`SELECT * FROM pre_email_verifications WHERE token = ?`).bind(token).first<PreRow>();
  if (!row) return { kind: "not_found" };
  if (row.consumed_at) return { kind: "already_consumed" };
  if (row.attempts >= MAX_ATTEMPTS) return { kind: "locked" };
  const now = new Date();
  if (Date.parse(row.expires_at + "Z") < now.getTime()) return { kind: "expired" };
  await markPreConsumed(db, row, now);
  return {
    kind: "ok",
    verification: {
      // We reuse the bound Verification shape for the OK return — the consume
      // sites just want { email, submissionId? }; for pre there's no submission_id
      // yet, so a sentinel ""; callers check before reading.
      id: row.id,
      submissionId: "",
      email: row.email,
      code: row.code,
      token: row.token,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      consumedAt: isoForSqlite(now),
      attempts: row.attempts,
    },
  };
}

export async function consumePreById(db: D1Database, preId: string, code: string): Promise<ConsumeResult> {
  const row = await db.prepare(`SELECT * FROM pre_email_verifications WHERE id = ?`).bind(preId).first<PreRow>();
  if (!row) return { kind: "not_found" };
  if (row.consumed_at) return { kind: "already_consumed" };
  if (row.attempts >= MAX_ATTEMPTS) return { kind: "locked" };
  const now = new Date();
  if (Date.parse(row.expires_at + "Z") < now.getTime()) return { kind: "expired" };
  if (!constantTimeEq(row.code, code)) {
    const newAttempts = row.attempts + 1;
    await db.prepare(`UPDATE pre_email_verifications SET attempts = ? WHERE id = ?`).bind(newAttempts, row.id).run();
    if (newAttempts >= MAX_ATTEMPTS) return { kind: "locked" };
    return { kind: "wrong_code", attemptsRemaining: MAX_ATTEMPTS - newAttempts };
  }
  await markPreConsumed(db, row, now);
  return {
    kind: "ok",
    verification: {
      id: row.id,
      submissionId: "",
      email: row.email,
      code: row.code,
      token: row.token,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      consumedAt: isoForSqlite(now),
      attempts: row.attempts,
    },
  };
}

export type AttachResult = "attached_verified" | "attached_pending" | "no_match";

// attachPreToSubmission — bind a Step-1 pre-verification to the freshly
// persisted submission. Three outcomes:
//   - "attached_verified": pre was already consumed → submission.verify_state
//     flips to 'verified' immediately. No fresh email needed.
//   - "attached_pending": email matches but pre isn't consumed yet → link
//     anyway. Saves the user a duplicate email; whenever they click the link
//     in the inbox the existing pre row gets consumed AND, because it's now
//     linked, the submission ALSO flips to verified (see markPreConsumed).
//   - "no_match": email mismatch or pre missing or pre already linked to a
//     different submission → caller falls through to the bound-verify path.
export async function attachPreToSubmission(
  db: D1Database,
  preId: string,
  submission: { id: string; helpContact: string },
): Promise<AttachResult> {
  const pre = await findPreById(db, preId);
  if (!pre) return "no_match";
  if (pre.linkedSubmissionId && pre.linkedSubmissionId !== submission.id) return "no_match";
  if (pre.email.toLowerCase() !== submission.helpContact.toLowerCase()) return "no_match";
  const now = isoForSqlite(new Date());
  if (pre.consumedAt) {
    await db.batch([
      db
        .prepare(`UPDATE pre_email_verifications SET linked_submission_id = ? WHERE id = ?`)
        .bind(submission.id, preId),
      db
        .prepare(`UPDATE submissions SET verify_state = 'verified', verified_at = ? WHERE id = ?`)
        .bind(now, submission.id),
    ]);
    return "attached_verified";
  }
  await db
    .prepare(`UPDATE pre_email_verifications SET linked_submission_id = ? WHERE id = ?`)
    .bind(submission.id, preId)
    .run();
  return "attached_pending";
}

// markPreConsumed — sets pre.consumed_at AND, when the row is already linked
// to a submission (attached_pending happened earlier), flips the submission
// to verified in the same batch. Single source of truth for "verifying a pre
// row" — both consume helpers route through here.
async function markPreConsumed(db: D1Database, row: PreRow, now: Date): Promise<void> {
  const ts = isoForSqlite(now);
  if (row.linked_submission_id) {
    await db.batch([
      db.prepare(`UPDATE pre_email_verifications SET consumed_at = ? WHERE id = ?`).bind(ts, row.id),
      db
        .prepare(`UPDATE submissions SET verify_state = 'verified', verified_at = ? WHERE id = ?`)
        .bind(ts, row.linked_submission_id),
    ]);
  } else {
    await db.prepare(`UPDATE pre_email_verifications SET consumed_at = ? WHERE id = ?`).bind(ts, row.id).run();
  }
}

function isoForSqliteFromNow(deltaMs: number): string {
  return isoForSqlite(new Date(Date.now() + deltaMs));
}

// ---- internals ----

async function markConsumed(db: D1Database, verifId: string, submissionId: string, now: Date): Promise<void> {
  const ts = isoForSqlite(now);
  await db.batch([
    db.prepare(`UPDATE email_verifications SET consumed_at = ? WHERE id = ?`).bind(ts, verifId),
    db
      .prepare(`UPDATE submissions SET verify_state = 'verified', verified_at = ? WHERE id = ?`)
      .bind(ts, submissionId),
  ]);
}

// SQLite datetime() format: 'YYYY-MM-DD HH:MM:SS' (no timezone). We append 'Z'
// at parse time. For inserts we emit the same shape so comparisons in SQL
// (lexicographic on TEXT) line up with rows the DEFAULT (datetime('now'))
// produces.
function isoForSqlite(d: Date): string {
  return d.toISOString().replace("T", " ").slice(0, 19);
}

// constantTimeEq — short string compare in constant time. Both args expected
// to be the same length (6 digits); we still mask the length-mismatch case to
// the same comparison count to avoid leaking via timing.
function constantTimeEq(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length === b.length ? 0 : 1;
  for (let i = 0; i < len; i++) {
    const ca = i < a.length ? a.charCodeAt(i) : 0;
    const cb = i < b.length ? b.charCodeAt(i) : 0;
    diff |= ca ^ cb;
  }
  return diff === 0;
}
