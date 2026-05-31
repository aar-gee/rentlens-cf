// Aggregate counters for marketing surfaces (homepage CTA stat band).
// Computed from the published catalog so the numbers on the homepage always
// match what a visitor sees clicking into society pages — no hand-maintained
// constants that drift (the old hardcoded 412/30/4 were all wrong vs. the
// actual catalog). As seed rows are retired and replaced by real resident
// reports, these counts move on their own.

export type HomeStats = {
  reports: number; // sum of per-society report_count across published societies
  societies: number; // published society count
  areas: number; // distinct localities covered
};

export async function homeStats(db: D1Database): Promise<HomeStats> {
  const row = await db
    .prepare(
      `SELECT COUNT(*)                       AS societies,
              COALESCE(SUM(report_count), 0) AS reports,
              COUNT(DISTINCT locality)       AS areas
         FROM societies
        WHERE status = 'published'`,
    )
    .first<{ societies: number; reports: number; areas: number }>();
  return {
    reports: row?.reports ?? 0,
    societies: row?.societies ?? 0,
    areas: row?.areas ?? 0,
  };
}
