// Society catalog data layer — D1 port of the Go repo's society_store.go +
// society.go. The catalog is small, so (matching the Go Store) we load all
// published societies and filter/search/sort in TS rather than in SQL.

export type Society = {
  id: string;
  slug: string;
  name: string;
  locality: string;
  builder: string;
  yearBuiltFrom: number | null;
  yearBuiltTo: number | null;
  totalUnits: number | null;
  description: string;
  aliases: string[];
  // Rental signals — optional; null-tolerant for "limited data" societies.
  medianRent2BHK: number | null;
  range2BHKLow: number | null;
  range2BHKHigh: number | null;
  medianRent3BHK: number | null;
  range3BHKLow: number | null;
  range3BHKHigh: number | null;
  reportCount: number | null;
  lastUpdated: string | null; // ISO-8601 text from D1
  // "self-reported" | "partially verified" | "verified source" | "limited data" | ""
  confidenceLabel: string;
  // "2BHK" | "3BHK" | "" — which BHK surfaces on the home-page card.
  featuredBHK: string;
};

type SocietyRow = {
  id: string;
  slug: string;
  name: string;
  locality: string;
  builder: string;
  year_built_from: number | null;
  year_built_to: number | null;
  total_units: number | null;
  description: string;
  median_rent_2bhk: number | null;
  range_2bhk_low: number | null;
  range_2bhk_high: number | null;
  median_rent_3bhk: number | null;
  range_3bhk_low: number | null;
  range_3bhk_high: number | null;
  report_count: number | null;
  last_updated: string | null;
  confidence_label: string;
  featured_bhk: string;
  aliases_json: string | null;
};

const SELECT_COLS = `
  s.id, s.slug, s.name, s.locality, s.builder, s.year_built_from, s.year_built_to,
  s.total_units, s.description, s.median_rent_2bhk, s.range_2bhk_low, s.range_2bhk_high,
  s.median_rent_3bhk, s.range_3bhk_low, s.range_3bhk_high, s.report_count, s.last_updated,
  s.confidence_label, s.featured_bhk,
  (SELECT json_group_array(alias) FROM society_aliases WHERE society_id = s.id) AS aliases_json
`;

function rowToSociety(r: SocietyRow): Society {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    locality: r.locality,
    builder: r.builder,
    yearBuiltFrom: r.year_built_from,
    yearBuiltTo: r.year_built_to,
    totalUnits: r.total_units,
    description: r.description,
    aliases: r.aliases_json ? (JSON.parse(r.aliases_json) as string[]) : [],
    medianRent2BHK: r.median_rent_2bhk,
    range2BHKLow: r.range_2bhk_low,
    range2BHKHigh: r.range_2bhk_high,
    medianRent3BHK: r.median_rent_3bhk,
    range3BHKLow: r.range_3bhk_low,
    range3BHKHigh: r.range_3bhk_high,
    reportCount: r.report_count,
    lastUpdated: r.last_updated,
    confidenceLabel: r.confidence_label,
    featuredBHK: r.featured_bhk,
  };
}

// listAll returns every published society, oldest first (insertion order).
export async function listAll(db: D1Database): Promise<Society[]> {
  const { results } = await db
    .prepare(`SELECT ${SELECT_COLS} FROM societies s WHERE s.status = 'published' ORDER BY s.rowid`)
    .all<SocietyRow>();
  return results.map(rowToSociety);
}

// getBySlug returns the published society for slug, or null if none.
export async function getBySlug(db: D1Database, slug: string): Promise<Society | null> {
  const row = await db
    .prepare(`SELECT ${SELECT_COLS} FROM societies s WHERE s.slug = ? AND s.status = 'published'`)
    .bind(slug)
    .first<SocietyRow>();
  return row ? rowToSociety(row) : null;
}

function matchesQuery(soc: Society, q: string): boolean {
  if (soc.name.toLowerCase().includes(q)) return true;
  return soc.aliases.some((a) => a.toLowerCase().includes(q));
}

// search returns up to 10 published societies whose name or an alias contains
// the query (case-insensitive substring). Empty query → [].
export async function search(db: D1Database, query: string): Promise<Society[]> {
  const q = query.trim().toLowerCase();
  if (q === "") return [];
  const all = await listAll(db);
  const out: Society[] = [];
  for (const soc of all) {
    if (matchesQuery(soc, q)) {
      out.push(soc);
      if (out.length >= 10) break;
    }
  }
  return out;
}

// sortByReportCountDesc — nulls last; stable so equal counts keep input order.
function sortByReportCountDesc(list: Society[]): void {
  list.sort((a, b) => {
    const x = a.reportCount;
    const y = b.reportCount;
    if (x == null && y == null) return 0;
    if (x == null) return 1;
    if (y == null) return -1;
    return y - x;
  });
}

// filterFeatured is listFeatured with optional locality + featured-BHK
// constraints. Empty area or bhk means no filter on that dimension.
export async function filterFeatured(
  db: D1Database,
  area: string,
  bhk: string,
  limit: number,
): Promise<Society[]> {
  if (limit <= 0) return [];
  const all = await listAll(db);
  const areaNeedle = area.trim().toLowerCase();
  const bhkNeedle = bhk.trim();
  const out = all.filter((soc) => {
    if (areaNeedle !== "" && soc.locality.toLowerCase() !== areaNeedle) return false;
    if (bhkNeedle !== "" && soc.featuredBHK !== bhkNeedle) return false;
    return true;
  });
  sortByReportCountDesc(out);
  return out.slice(0, limit);
}

// listFeatured returns up to limit published societies, most-reported first.
export function listFeatured(db: D1Database, limit: number): Promise<Society[]> {
  return filterFeatured(db, "", "", limit);
}
