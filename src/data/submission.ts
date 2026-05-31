// Contributor rental-data submission. Port of submission.go + the D1 insert/
// lookup from submission_store.go.
import { newShortID } from "../lib/id";

export type Submission = {
  id: string;
  societyName: string;
  societySlug: string; // empty when typed name not in catalog
  pendingSocietyId: string; // set when societySlug empty (new-society submission)
  locality: string;
  pendingAreaId: string; // set when locality off canonical list
  bhk: string;
  monthlyRent: number;
  monthlyMaint: number;
  floorBand: string;
  furnishing: string;
  sqft: number | null;
  deposit: number | null;
  block: string;
  moveInMonth: string; // "YYYY-MM"
  moveOutMonth: string;
  ratingValue: number | null;
  ratingQuality: number | null;
  ratingOwner: number | null;
  note: string;
  sourceChannel: string;
  sourceDetail: string;
  moverName: string;
  moverRating: number | null;
  moverNeedsReview: boolean;
  willingToHelp: boolean;
  helpContact: string;
  // Silent per-email + per-IP spam control (RENT-okskjmao). Set at insert
  // time by persistSubmission via isProbableSpam(); never mutated through
  // the contributor-facing flow. Aggregate readers filter on spamFlag via
  // effectiveSubmissionFilter() in src/lib/spam.ts.
  spamFlag: boolean;
  // Client IP at submission time (CF-Connecting-IP on prod; XFF leftmost
  // fallback for local dev). Used by the IP-rate spam rule; never shown in
  // public UI. Retention policy is informal for now — older rows can be
  // purged periodically as traffic grows.
  ipAddress: string;
};

// newSubmission returns a blank submission with sensible zero-values.
export function newSubmission(): Submission {
  return {
    id: "",
    societyName: "",
    societySlug: "",
    pendingSocietyId: "",
    locality: "",
    pendingAreaId: "",
    bhk: "",
    monthlyRent: 0,
    monthlyMaint: 0,
    floorBand: "",
    furnishing: "",
    sqft: null,
    deposit: null,
    block: "",
    moveInMonth: "",
    moveOutMonth: "",
    ratingValue: null,
    ratingQuality: null,
    ratingOwner: null,
    note: "",
    sourceChannel: "",
    sourceDetail: "",
    moverName: "",
    moverRating: null,
    moverNeedsReview: false,
    willingToHelp: false,
    helpContact: "",
    spamFlag: false,
    ipAddress: "",
  };
}

// insertSubmission assigns a fresh 8-char id (if blank) and persists the row.
// society_slug is stored only when it references a real catalog row; an empty
// slug stays NULL (the FK allows it). Returns the assigned id.
export async function insertSubmission(db: D1Database, sub: Submission): Promise<string> {
  if (sub.id === "") sub.id = newShortID();
  await db
    .prepare(
      `INSERT INTO submissions (
        id, society_name, society_slug, pending_society_id, locality, pending_area_id,
        bhk, monthly_rent, monthly_maint, floor_band, furnishing,
        sqft, deposit, block, move_in_month, move_out_month,
        rating_value, rating_quality, rating_owner, note,
        source_channel, source_detail, mover_name, mover_rating,
        willing_to_help, help_contact, spam_flag, ip_address
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      sub.id,
      sub.societyName,
      sub.societySlug === "" ? null : sub.societySlug,
      sub.pendingSocietyId === "" ? null : sub.pendingSocietyId,
      sub.locality,
      sub.pendingAreaId === "" ? null : sub.pendingAreaId,
      sub.bhk,
      sub.monthlyRent,
      sub.monthlyMaint,
      sub.floorBand,
      sub.furnishing,
      sub.sqft,
      sub.deposit,
      sub.block,
      sub.moveInMonth,
      sub.moveOutMonth,
      sub.ratingValue,
      sub.ratingQuality,
      sub.ratingOwner,
      sub.note,
      sub.sourceChannel,
      sub.sourceDetail,
      sub.moverName,
      sub.moverRating,
      sub.willingToHelp ? 1 : 0,
      sub.helpContact,
      sub.spamFlag ? 1 : 0,
      sub.ipAddress,
    )
    .run();
  return sub.id;
}

type SubmissionRow = {
  id: string;
  society_name: string;
  society_slug: string | null;
  pending_society_id: string | null;
  locality: string;
  pending_area_id: string | null;
  bhk: string;
  monthly_rent: number;
  monthly_maint: number;
  floor_band: string;
  furnishing: string;
  sqft: number | null;
  deposit: number | null;
};

export async function countSubmissions(db: D1Database): Promise<number> {
  const r = await db.prepare(`SELECT count(*) AS n FROM submissions`).first<{ n: number }>();
  return r?.n ?? 0;
}

// countPendingSubmissions = submissions tagged with a pending society OR area.
export async function countPendingSubmissions(db: D1Database): Promise<number> {
  const r = await db
    .prepare(`SELECT count(*) AS n FROM submissions WHERE pending_society_id IS NOT NULL OR pending_area_id IS NOT NULL`)
    .first<{ n: number }>();
  return r?.n ?? 0;
}

// SubmissionListRow — flat shape returned by listRecentSubmissions for the
// admin /submissions view and the AI-friendly JSON endpoint. ISO timestamps,
// no nullables (NULL slugs come back as "" so JSON downstream is stable).
export type SubmissionListRow = {
  id: string;
  createdAt: string;
  societyName: string;
  societySlug: string;
  pendingSocietyId: string;
  locality: string;
  pendingAreaId: string;
  bhk: string;
  monthlyRent: number;
  monthlyMaint: number;
  floorBand: string;
  furnishing: string;
  sqft: number | null;
  deposit: number | null;
  ratingValue: number | null;
  ratingQuality: number | null;
  ratingOwner: number | null;
  note: string;
  sourceChannel: string;
  sourceDetail: string;
  moverName: string;
  moverRating: number | null;
  willingToHelp: boolean;
  helpContact: string;
  verifyState: "unverified" | "verified";
  verifiedAt: string | null;
  spamFlag: boolean;
  ipAddress: string;
  status: string;
  // RENT-plvqhfmz: true when society_slug points at a real catalog row AND
  // the typed locality differs from that slug's canonical locality (case +
  // whitespace insensitive). Doesn't reject the report — just an admin
  // signal that the contributor may have picked the wrong society or that
  // the catalog's locality is stale. Computed at query time (LEFT JOIN
  // against societies) — no submission-row state, no migration needed.
  areaMismatch: boolean;
};

export type RecentSubmissionFilters = {
  sinceISO: string; // 'YYYY-MM-DD HH:MM:SS' SQLite format
  status?: string; // 'pending' | 'published' | 'rejected'
  spamFlag?: 0 | 1;
  limit?: number;
};

// listRecentSubmissions — time-windowed listing for admin / AI triage. Newest
// first. Optional status + spam_flag filters. Hard limit (default 200) to
// keep responses bounded even before pagination lands.
export async function listRecentSubmissions(
  db: D1Database,
  filters: RecentSubmissionFilters,
): Promise<SubmissionListRow[]> {
  const conds: string[] = ["created_at >= ?"];
  const binds: (string | number)[] = [filters.sinceISO];
  if (filters.status) {
    conds.push("status = ?");
    binds.push(filters.status);
  }
  if (filters.spamFlag !== undefined) {
    conds.push("spam_flag = ?");
    binds.push(filters.spamFlag);
  }
  const limit = Math.min(Math.max(1, filters.limit ?? 200), 500);
  binds.push(limit);
  // area_mismatch is computed via LEFT JOIN against societies — only fires
  // when (a) the slug references a real catalog row AND (b) the canonical
  // locality is non-empty AND (c) typed and canonical differ after a
  // case+whitespace fold. Catalog rows with locality='' are ignored (no
  // truth to compare against). Use s.locality / soc.locality aliases so
  // SELECT * style doesn't collide.
  const sql = `
    SELECT s.id, s.created_at, s.society_name, s.society_slug, s.pending_society_id,
           s.locality, s.pending_area_id, s.bhk, s.monthly_rent, s.monthly_maint,
           s.floor_band, s.furnishing, s.sqft, s.deposit, s.rating_value, s.rating_quality,
           s.rating_owner, s.note, s.source_channel, s.source_detail, s.mover_name,
           s.mover_rating, s.willing_to_help, s.help_contact, s.verify_state,
           s.verified_at, s.spam_flag, s.ip_address, s.status,
           CASE WHEN s.society_slug IS NOT NULL
                 AND soc.locality IS NOT NULL
                 AND TRIM(soc.locality) != ''
                 AND LOWER(TRIM(s.locality)) != LOWER(TRIM(soc.locality))
                THEN 1 ELSE 0 END AS area_mismatch
    FROM submissions s
    LEFT JOIN societies soc ON soc.slug = s.society_slug
    WHERE ${conds.map((c) => c.replace(/^([a-z_]+) (=|>=|<=|>|<|!=) /i, "s.$1 $2 ")).join(" AND ")}
    ORDER BY s.created_at DESC
    LIMIT ?
  `;
  const { results } = await db
    .prepare(sql)
    .bind(...binds)
    .all<{
      id: string;
      created_at: string;
      society_name: string;
      society_slug: string | null;
      pending_society_id: string | null;
      locality: string;
      pending_area_id: string | null;
      bhk: string;
      monthly_rent: number;
      monthly_maint: number;
      floor_band: string;
      furnishing: string;
      sqft: number | null;
      deposit: number | null;
      rating_value: number | null;
      rating_quality: number | null;
      rating_owner: number | null;
      note: string;
      source_channel: string;
      source_detail: string;
      mover_name: string;
      mover_rating: number | null;
      willing_to_help: number;
      help_contact: string;
      verify_state: string;
      verified_at: string | null;
      spam_flag: number;
      ip_address: string;
      status: string;
      area_mismatch: number;
    }>();
  return results.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    societyName: r.society_name,
    societySlug: r.society_slug ?? "",
    pendingSocietyId: r.pending_society_id ?? "",
    locality: r.locality,
    pendingAreaId: r.pending_area_id ?? "",
    bhk: r.bhk,
    monthlyRent: r.monthly_rent,
    monthlyMaint: r.monthly_maint,
    floorBand: r.floor_band,
    furnishing: r.furnishing,
    sqft: r.sqft,
    deposit: r.deposit,
    ratingValue: r.rating_value,
    ratingQuality: r.rating_quality,
    ratingOwner: r.rating_owner,
    note: r.note,
    sourceChannel: r.source_channel,
    sourceDetail: r.source_detail,
    moverName: r.mover_name,
    moverRating: r.mover_rating,
    willingToHelp: r.willing_to_help === 1,
    helpContact: r.help_contact,
    verifyState: r.verify_state === "verified" ? "verified" : "unverified",
    verifiedAt: r.verified_at,
    spamFlag: r.spam_flag === 1,
    ipAddress: r.ip_address,
    status: r.status,
    areaMismatch: r.area_mismatch === 1,
  }));
}

// parseSinceParam — accepts either a relative shortcut ("24h", "6h", "7d",
// "30m") or an absolute ISO timestamp. Returns the SQLite-format cutoff.
// Defaults to last 24h when input is empty / invalid.
export function parseSinceParam(input: string): string {
  const trimmed = input.trim();
  if (trimmed !== "") {
    // Relative: <number><h|d|m>
    const m = /^(\d+)([hdm])$/i.exec(trimmed);
    if (m) {
      const n = parseInt(m[1], 10);
      const unit = m[2].toLowerCase();
      const ms = unit === "h" ? n * 60 * 60 * 1000 : unit === "d" ? n * 24 * 60 * 60 * 1000 : n * 60 * 1000;
      return new Date(Date.now() - ms).toISOString().replace("T", " ").slice(0, 19);
    }
    // ISO / SQLite-shaped passthrough — accept whatever-the-caller-gave when
    // it looks like a datetime; let SQLite handle malformed inputs.
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed.replace("T", " ").replace(/\.\d+Z?$/, "").slice(0, 19);
    }
  }
  // Default: 24h.
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().replace("T", " ").slice(0, 19);
}

// listSubmissionsForModeration returns the minimal per-submission fields the
// admin queues aggregate over (pending links + help-contact for distinct counts).
export async function listSubmissionsForModeration(
  db: D1Database,
): Promise<{ pendingSocietyId: string; pendingAreaId: string; helpContact: string }[]> {
  const { results } = await db
    .prepare(`SELECT pending_society_id, pending_area_id, help_contact FROM submissions`)
    .all<{ pending_society_id: string | null; pending_area_id: string | null; help_contact: string }>();
  return results.map((r) => ({
    pendingSocietyId: r.pending_society_id ?? "",
    pendingAreaId: r.pending_area_id ?? "",
    helpContact: r.help_contact,
  }));
}

// getSubmissionById returns the (partial) submission needed by the success
// page, or null. The success page only reads name/slug/locality/pending ids.
// isActiveOptIn — single source of truth for "may we contact this resident
// for intros?". A submission with `willing_to_help=true` is dormant until
// the contributor's email is verified; downstream intro flows MUST gate on
// this helper rather than reading `willing_to_help` directly. Decoupling the
// rule from the columns means tightening the rule later (e.g. add a "not
// banned" check) is one-file.
export function isActiveOptIn(row: {
  willingToHelp: boolean;
  helpContact: string;
  verifyState: "unverified" | "verified";
}): boolean {
  return row.willingToHelp && row.helpContact !== "" && row.verifyState === "verified";
}

// getSubmissionForVerify returns just the fields the /verify routes need —
// the email (help_contact) we're verifying, the society for the success
// copy, and the current verify_state so we can short-circuit refreshes.
// Separate from getSubmissionById on purpose: that one is for the success
// page and never returned the email.
export type SubmissionVerifyView = {
  id: string;
  societyName: string;
  societySlug: string;
  helpContact: string;
  verifyState: "unverified" | "verified";
};

export async function getSubmissionForVerify(db: D1Database, id: string): Promise<SubmissionVerifyView | null> {
  const row = await db
    .prepare(
      `SELECT id, society_name, society_slug, help_contact, verify_state
       FROM submissions WHERE id = ?`,
    )
    .bind(id)
    .first<{
      id: string;
      society_name: string;
      society_slug: string | null;
      help_contact: string;
      verify_state: string;
    }>();
  if (!row) return null;
  return {
    id: row.id,
    societyName: row.society_name,
    societySlug: row.society_slug ?? "",
    helpContact: row.help_contact,
    verifyState: row.verify_state === "verified" ? "verified" : "unverified",
  };
}

// getSubmissionById returns the (partial) Submission the success page needs.
// Includes society + locality + pending links + the unit/rent core (bhk,
// rent, maint, floor_band, furnishing, sqft, deposit) so the "here's what
// we got" ack on /submit/success?id= can render after a refresh. Other
// fields stay defaulted via newSubmission().
export async function getSubmissionById(db: D1Database, id: string): Promise<Submission | null> {
  const row = await db
    .prepare(
      `SELECT id, society_name, society_slug, pending_society_id, locality, pending_area_id,
              bhk, monthly_rent, monthly_maint, floor_band, furnishing, sqft, deposit
       FROM submissions WHERE id = ?`,
    )
    .bind(id)
    .first<SubmissionRow>();
  if (!row) return null;
  const sub = newSubmission();
  sub.id = row.id;
  sub.societyName = row.society_name;
  sub.societySlug = row.society_slug ?? "";
  sub.pendingSocietyId = row.pending_society_id ?? "";
  sub.locality = row.locality;
  sub.pendingAreaId = row.pending_area_id ?? "";
  sub.bhk = row.bhk;
  sub.monthlyRent = row.monthly_rent;
  sub.monthlyMaint = row.monthly_maint;
  sub.floorBand = row.floor_band;
  sub.furnishing = row.furnishing;
  sub.sqft = row.sqft;
  sub.deposit = row.deposit;
  return sub;
}
