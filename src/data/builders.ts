// Builders catalog. The tier flag ('A') drives homepage featuring; the table
// also powers the admin create-society builder select (RENT-ighyhmgc).
import { newShortID } from "../lib/id";

export type Builder = {
  id: string;
  name: string;
  slug: string;
  tier: string;
  // Enrichment from migration 0011 (faithful display + trust signal). website_url
  // / logo_url drive the builder's display; delivery_risk flags builders kept
  // searchable but not trusted enough to feature (risk_note explains why).
  website_url: string;
  logo_url: string;
  delivery_risk: number;
  risk_note: string;
};

const BUILDER_COLS = "id, name, slug, tier, website_url, logo_url, delivery_risk, risk_note";

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// listBuilders returns all builders, Category-A first then alphabetical.
export async function listBuilders(db: D1Database): Promise<Builder[]> {
  const { results } = await db
    .prepare(`SELECT ${BUILDER_COLS} FROM builders ORDER BY (tier = 'A') DESC, name`)
    .all<Builder>();
  return results;
}

// createBuilder inserts a builder (idempotent on the unique name). tier must be
// '', 'A', or 'B'. Returns the row (existing or new).
export async function createBuilder(db: D1Database, name: string, tier: string): Promise<Builder | null> {
  name = name.trim();
  if (name === "") return null;
  const t = tier === "A" || tier === "B" ? tier : "";
  await db
    .prepare(`INSERT INTO builders (id, name, slug, tier) VALUES (?, ?, ?, ?) ON CONFLICT(name) DO NOTHING`)
    .bind(newShortID(), name, slugify(name), t)
    .run();
  return db.prepare(`SELECT ${BUILDER_COLS} FROM builders WHERE name = ?`).bind(name).first<Builder>();
}
