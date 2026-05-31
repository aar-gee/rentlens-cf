// Resident-report aggregation + provenance promotion (RENT-tbhkjjfy part B).
// When real resident submissions are published, a society's headline numbers
// should reflect them and its provenance should advance to 'resident' once
// there's enough signal. Below the threshold we leave the society on its
// listings-derived 'estimated' (or 'seed') data — a stray report or two
// shouldn't override a grounded estimate or let us claim "resident-reported".

// RESIDENT_THRESHOLD — minimum published, non-spam reports for a society before
// its numbers come from residents and provenance flips to 'resident'. The trust
// contract (CLAUDE.md §7) defines 'resident' as "multiple verified resident
// reports"; 3 is a deliberate, tunable floor. Raise it if early data is noisy.
export const RESIDENT_THRESHOLD = 3;

export type RecomputeResult = { count: number; promoted: boolean };

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

// bhkDigit extracts the leading config digit so "2", "2BHK", "2 BHK" all key to "2".
const bhkDigit = (b: string): string => b.match(/[0-9]/)?.[0] ?? "";

// recomputeSocietyFromSubmissions rebuilds a society's per-BHK medians/ranges
// and report_count from its PUBLISHED, non-spam submissions, and promotes
// provenance to 'resident' — but only once count >= RESIDENT_THRESHOLD. Below
// that it is a no-op (the report stays published + stored, just not yet enough
// to override the listings estimate). Idempotent: recompute always reflects the
// current published set. Only BHKs that actually have reports are overwritten;
// a config with no resident reports keeps its existing estimate.
export async function recomputeSocietyFromSubmissions(db: D1Database, slug: string): Promise<RecomputeResult> {
  if (!slug) return { count: 0, promoted: false };
  const { results } = await db
    .prepare(
      `SELECT bhk, monthly_rent FROM submissions
        WHERE society_slug = ? AND status = 'published' AND spam_flag = 0 AND monthly_rent > 0`,
    )
    .bind(slug)
    .all<{ bhk: string; monthly_rent: number }>();

  const count = results.length;
  if (count < RESIDENT_THRESHOLD) return { count, promoted: false };

  const byBhk: Record<string, number[]> = {};
  for (const r of results) {
    const k = bhkDigit(r.bhk);
    if (k === "2" || k === "3") (byBhk[k] ??= []).push(r.monthly_rent);
  }

  const sets: string[] = [];
  const binds: unknown[] = [];
  for (const k of ["2", "3"]) {
    const arr = byBhk[k];
    if (arr && arr.length > 0) {
      sets.push(`median_rent_${k}bhk = ?`, `range_${k}bhk_low = ?`, `range_${k}bhk_high = ?`);
      binds.push(median(arr), Math.min(...arr), Math.max(...arr));
    }
  }
  sets.push("report_count = ?", "provenance = 'resident'", "last_updated = ?");
  binds.push(count, new Date().toISOString(), slug);

  await db.prepare(`UPDATE societies SET ${sets.join(", ")} WHERE slug = ?`).bind(...binds).run();
  return { count, promoted: true };
}
