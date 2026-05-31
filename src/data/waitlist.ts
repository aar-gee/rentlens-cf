// Waitlist data layer (RENT-swwqpyth). "Email me when this society has data."

// Per-IP cap on waitlist signups per 24h. Lenient (shared IPs are legit) but
// enough to blunt a script hammering the endpoint. Mirrors the spam.ts posture.
export const WAITLIST_MAX_PER_IP_PER_DAY = 8;

export type WaitlistJoin = {
  email: string;
  societySlug: string;
  societyName: string;
  ipAddress: string;
};

export type JoinResult = { kind: "added" } | { kind: "already" } | { kind: "rate_limited" };

const cutoff24h = (): string =>
  new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().replace("T", " ").slice(0, 19);

// joinWaitlist — rate-check, then dedup-insert. ON CONFLICT (email, society)
// DO NOTHING makes a repeat signup a silent no-op (returns "already"). The id
// is generated here (Workers crypto.randomUUID is always available).
export async function joinWaitlist(db: D1Database, j: WaitlistJoin): Promise<JoinResult> {
  if (j.ipAddress !== "") {
    const row = await db
      .prepare(`SELECT count(*) AS n FROM waitlist WHERE ip_address = ? AND created_at > ?`)
      .bind(j.ipAddress, cutoff24h())
      .first<{ n: number }>();
    if ((row?.n ?? 0) >= WAITLIST_MAX_PER_IP_PER_DAY) return { kind: "rate_limited" };
  }
  const res = await db
    .prepare(
      `INSERT INTO waitlist (id, email, society_slug, society_name, ip_address)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (email, society_slug) DO NOTHING`,
    )
    .bind(crypto.randomUUID(), j.email, j.societySlug, j.societyName, j.ipAddress)
    .run();
  // D1 reports rows written via meta.changes; 0 ⇒ the dedup conflict fired.
  const changed = res.meta?.changes ?? 0;
  return changed > 0 ? { kind: "added" } : { kind: "already" };
}

// ---- Admin reads ----

export type WaitlistGroup = {
  societySlug: string;
  societyName: string;
  total: number;
  pending: number; // not yet notified
  latest: string; // most recent signup time
};

// listWaitlistGrouped — one row per society with counts, most-demanded first.
export async function listWaitlistGrouped(db: D1Database): Promise<WaitlistGroup[]> {
  const { results } = await db
    .prepare(
      `SELECT society_slug AS societySlug,
              MAX(society_name) AS societyName,
              count(*) AS total,
              SUM(CASE WHEN notified_at IS NULL THEN 1 ELSE 0 END) AS pending,
              MAX(created_at) AS latest
         FROM waitlist
        GROUP BY society_slug
        ORDER BY pending DESC, total DESC, latest DESC`,
    )
    .all<WaitlistGroup>();
  return results ?? [];
}

export async function countWaitlist(db: D1Database): Promise<number> {
  const r = await db.prepare(`SELECT count(*) AS n FROM waitlist`).first<{ n: number }>();
  return r?.n ?? 0;
}

// emailsToNotify — un-notified subscriber emails for a society.
export async function emailsToNotify(db: D1Database, societySlug: string): Promise<string[]> {
  const { results } = await db
    .prepare(`SELECT email FROM waitlist WHERE society_slug = ? AND notified_at IS NULL`)
    .bind(societySlug)
    .all<{ email: string }>();
  return (results ?? []).map((r) => r.email);
}

// markNotified — stamp every un-notified row for a society as notified now.
// Returns how many rows were stamped.
export async function markNotified(db: D1Database, societySlug: string): Promise<number> {
  const res = await db
    .prepare(`UPDATE waitlist SET notified_at = datetime('now') WHERE society_slug = ? AND notified_at IS NULL`)
    .bind(societySlug)
    .run();
  return res.meta?.changes ?? 0;
}
