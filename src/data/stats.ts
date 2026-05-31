// Aggregate counters for marketing surfaces (homepage CTA stat band, /about
// and /societies prose).
//
// Honesty model (2026-05-31): the catalog is currently all our own estimates
// (societies.source='seed'), so we split the count into "estimated" vs "actual"
// data points and label them as such — never present a guess as a real report.
//   estimatedPoints — SUM(report_count): the seeded estimate weight.
//   actualPoints    — COUNT of real, non-spam resident submissions. This is the
//                     number that moves the instant someone submits, so a
//                     contributor sees the counter tick and feels the win.
// As real submissions replace seed rows, estimatedPoints fades and actualPoints
// grows; the UI drops the "estimated" stat once actualPoints overtakes the
// society count (see ContributeCTA).

export type HomeStats = {
  societies: number; // published society count (XX)
  areas: number; // distinct localities covered
  estimatedPoints: number; // ZZ — SUM(report_count), our seeded estimates
  actualPoints: number; // YY — real non-spam resident submissions
};

export async function homeStats(db: D1Database): Promise<HomeStats> {
  const soc = await db
    .prepare(
      `SELECT COUNT(*)                       AS societies,
              COALESCE(SUM(report_count), 0) AS estimatedPoints,
              COUNT(DISTINCT locality)       AS areas
         FROM societies
        WHERE status = 'published'`,
    )
    .first<{ societies: number; estimatedPoints: number; areas: number }>();
  // Real resident reports — counted live from the submissions table (not the
  // seeded report_count), excluding spam so the number is trustworthy.
  const sub = await db
    .prepare(`SELECT COUNT(*) AS actualPoints FROM submissions WHERE spam_flag = 0`)
    .first<{ actualPoints: number }>();
  return {
    societies: soc?.societies ?? 0,
    areas: soc?.areas ?? 0,
    estimatedPoints: soc?.estimatedPoints ?? 0,
    actualPoints: sub?.actualPoints ?? 0,
  };
}
