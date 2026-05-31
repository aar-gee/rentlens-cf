// Silent per-email spam control (RENT-okskjmao).
//
// Threshold rule applied at submission-time: if the contributor's
// help_contact has already produced more than SPAM_MAX_PER_WINDOW reports
// in the last SPAM_WINDOW_DAYS, the new submission lands with
// submissions.spam_flag=1. No UI signal — the contributor sees the same
// success / verify flow. Downstream aggregate readers (median rent, range,
// report counts) filter on the flag via effectiveSubmissionFilter() below
// so a spammer's data doesn't poison published numbers, but a society that
// has ONLY spam-flagged data still surfaces something (degrade gracefully —
// don't blank a society that only has flagged reports).
//
// Defaults are conservative and tunable here. Real-world tuning post-launch
// will need actual data; moving these to env vars or a DB config table is a
// follow-on (RENT-okskjmao notes "tunable").

export const SPAM_WINDOW_DAYS = 7;
export const SPAM_MAX_PER_WINDOW = 5;

// Per-IP threshold is intentionally more lenient than per-email — shared
// IPs are legitimate (family WiFi, office NAT, carrier-grade NAT in India).
// 10/7d catches obvious abuse without blocking households.
export const SPAM_IP_WINDOW_DAYS = 7;
export const SPAM_IP_MAX_PER_WINDOW = 10;

// isProbableSpam — true when EITHER:
//   - this submission's help_contact has posted >= SPAM_MAX_PER_WINDOW
//     reports in the last SPAM_WINDOW_DAYS, OR
//   - this submission's ip_address has posted >= SPAM_IP_MAX_PER_WINDOW
//     reports in the last SPAM_IP_WINDOW_DAYS.
//
// Empty signals skip their rule (anonymous submissions can't be email-rated;
// IP can be missing if CF-Connecting-IP isn't set, e.g. local dev). Counts
// include ALL prior submissions regardless of moderation status / verify
// state — a spammer's rejected or unverified attempts are still spam signal.
export async function isProbableSpam(
  db: D1Database,
  helpContact: string,
  ipAddress: string,
): Promise<boolean> {
  if (helpContact !== "") {
    const cutoff = isoCutoff(SPAM_WINDOW_DAYS);
    const row = await db
      .prepare(`SELECT count(*) AS n FROM submissions WHERE help_contact = ? AND created_at > ?`)
      .bind(helpContact, cutoff)
      .first<{ n: number }>();
    if ((row?.n ?? 0) >= SPAM_MAX_PER_WINDOW) return true;
  }
  if (ipAddress !== "") {
    const cutoff = isoCutoff(SPAM_IP_WINDOW_DAYS);
    const row = await db
      .prepare(`SELECT count(*) AS n FROM submissions WHERE ip_address = ? AND created_at > ?`)
      .bind(ipAddress, cutoff)
      .first<{ n: number }>();
    if ((row?.n ?? 0) >= SPAM_IP_MAX_PER_WINDOW) return true;
  }
  return false;
}

// getClientIp — extract the trustworthy client IP from request headers.
// On Cloudflare Workers, CF-Connecting-IP is set by the edge and can't be
// spoofed by the client; that's the production path. X-Forwarded-For leftmost
// is the fallback (local dev, non-CF). The XFF fallback is lower-trust
// because clients can prepend arbitrary entries — accept that for the dev
// path; CF is the production path and is authoritative.
export function getClientIp(getHeader: (name: string) => string | undefined): string {
  const cfIp = getHeader("CF-Connecting-IP");
  if (cfIp && cfIp.trim() !== "") return cfIp.trim();
  const xff = getHeader("X-Forwarded-For");
  if (xff && xff.trim() !== "") {
    // XFF is "client, proxy1, proxy2" — leftmost is the originating client.
    const first = xff.split(",")[0];
    if (first) return first.trim();
  }
  return "";
}

// effectiveSubmissionFilter — SQL WHERE-clause snippet for aggregate readers
// to use against the submissions table. Two-pass design:
//
//   "Use non-spam rows when a society has any; fall back to all rows
//    (incl. spam-flagged) when a society has only spam data."
//
// Implementation uses a window function (`OVER (PARTITION BY society_slug)`)
// to count non-spam rows per society in a single query — D1/SQLite supports
// window functions since v3.25. Caller chains this onto whatever extra
// predicates they need (`status='published'`, BHK match, etc).
//
// Usage:
//   const sql = `SELECT ... FROM (
//     SELECT *, SUM(1 - spam_flag) OVER (PARTITION BY society_slug) AS nonspam_count
//       FROM submissions WHERE society_slug = ?
//   ) WHERE ${effectiveSubmissionFilter()}`;
//
// The bracketed inner query carries nonspam_count; the outer filter keeps a
// row when EITHER spam_flag=0 OR the partition has zero non-spam rows.
export function effectiveSubmissionFilter(): string {
  return "(spam_flag = 0 OR nonspam_count = 0)";
}

// ---- internals ----

// SQLite datetime() format: 'YYYY-MM-DD HH:MM:SS' (no TZ). Match the
// pre/email_verifications convention so timestamps compare lexicographically.
function isoCutoff(daysAgo: number): string {
  const d = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  return d.toISOString().replace("T", " ").slice(0, 19);
}
