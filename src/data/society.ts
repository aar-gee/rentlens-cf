// Society catalog data layer — D1 port of the Go repo's society_store.go +
// society.go. The catalog is small, so (matching the Go Store) we load all
// published societies and filter/search/sort in TS rather than in SQL.

import { normalize, scoreTier, MatchTier } from "../lib/fuzzy";

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
  // "seed" (indicative bootstrap) | "estimated" (listings) | "resident" (real reports).
  provenance: string;
};

// Provenance ⇒ honest label + explainer. Used by views; see how-it-works.
export const PROVENANCE_LABEL: Record<string, string> = {
  seed: "Indicative",
  estimated: "Estimated",
  resident: "Resident-reported",
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
  provenance: string;
  aliases_json: string | null;
};

const SELECT_COLS = `
  s.id, s.slug, s.name, s.locality, s.builder, s.year_built_from, s.year_built_to,
  s.total_units, s.description, s.median_rent_2bhk, s.range_2bhk_low, s.range_2bhk_high,
  s.median_rent_3bhk, s.range_3bhk_low, s.range_3bhk_high, s.report_count, s.last_updated,
  s.confidence_label, s.featured_bhk, s.provenance,
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
    provenance: r.provenance,
  };
}

// loadPublished returns published societies (oldest first). categoryAOnly
// restricts to societies whose builder is tier 'A' (homepage featured strip);
// search + full catalog pass false so every builder stays discoverable.
async function loadPublished(db: D1Database, categoryAOnly: boolean): Promise<Society[]> {
  const filter = categoryAOnly
    ? ` AND EXISTS (SELECT 1 FROM builders b WHERE b.id = s.builder_id AND b.tier = 'A')`
    : "";
  const { results } = await db
    .prepare(`SELECT ${SELECT_COLS} FROM societies s WHERE s.status = 'published'${filter} ORDER BY s.rowid`)
    .all<SocietyRow>();
  return results.map(rowToSociety);
}

// listAll returns every published society, oldest first (insertion order).
export function listAll(db: D1Database): Promise<Society[]> {
  return loadPublished(db, false);
}

// countPublished returns the number of published societies (dashboard stat).
export async function countPublished(db: D1Database): Promise<number> {
  const r = await db.prepare(`SELECT count(*) AS n FROM societies WHERE status='published'`).first<{ n: number }>();
  return r?.n ?? 0;
}

// publishedSlugs returns every published society slug (merge-target dropdown).
export async function publishedSlugs(db: D1Database): Promise<string[]> {
  const { results } = await db
    .prepare(`SELECT slug FROM societies WHERE status='published' ORDER BY slug`)
    .all<{ slug: string }>();
  return results.map((r) => r.slug);
}

// getBySlug returns the published society for slug, or null if none.
export async function getBySlug(db: D1Database, slug: string): Promise<Society | null> {
  const row = await db
    .prepare(`SELECT ${SELECT_COLS} FROM societies s WHERE s.slug = ? AND s.status = 'published'`)
    .bind(slug)
    .first<SocietyRow>();
  return row ? rowToSociety(row) : null;
}

// societyScore returns the best MatchTier for a normalized query against all
// searchable fields of a society: name, aliases, locality, and builder.
// Fields are weighted by priority: name/aliases > locality > builder.
// Returns MatchTier.None when nothing matches.
function societyScore(soc: Society, normQuery: string): MatchTier {
  // Candidates: name, each alias, locality, builder — all pre-normalized.
  const candidates: string[] = [
    normalize(soc.name),
    ...soc.aliases.map(normalize),
    normalize(soc.locality),
    normalize(soc.builder),
  ];

  let best: MatchTier = MatchTier.None;
  for (const candidate of candidates) {
    const tier = scoreTier(normQuery, candidate);
    if (tier > best) best = tier;
    if (best === MatchTier.Exact) break; // can't do better
  }
  return best;
}

// search returns up to 10 published societies matching the query,
// ranked by match quality (exact/prefix > substring > fuzzy). Extends match
// surface to name, aliases, locality, and builder. Spelling-tolerant via
// trigram Dice coefficient and Levenshtein edit distance. Empty query → [].
export async function search(db: D1Database, query: string): Promise<Society[]> {
  const normQuery = normalize(query);
  if (normQuery === "") return [];

  const all = await listAll(db);

  type Scored = { soc: Society; tier: MatchTier };
  const scored: Scored[] = [];

  for (const soc of all) {
    const tier = societyScore(soc, normQuery);
    if (tier > MatchTier.None) {
      scored.push({ soc, tier });
    }
  }

  // Sort descending by tier (higher = better match), preserve input order on ties.
  scored.sort((a, b) => b.tier - a.tier);

  return scored.slice(0, 10).map((s) => s.soc);
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
// constraints. Empty area or bhk means no filter on that dimension. The
// featured strip only shows Category-A-builder societies (others stay
// searchable via /search, just not featured on the homepage).
export async function filterFeatured(
  db: D1Database,
  area: string,
  bhk: string,
  limit: number,
): Promise<Society[]> {
  if (limit <= 0) return [];
  const all = await loadPublished(db, true);
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
