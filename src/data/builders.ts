// Builders catalog. The tier flag ('A') drives homepage featuring; the table
// also powers the admin create-society builder select (RENT-ighyhmgc).
import { newShortID } from "../lib/id";

export type Builder = { id: string; name: string; slug: string; tier: string };

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// listBuilders returns all builders, Category-A first then alphabetical.
export async function listBuilders(db: D1Database): Promise<Builder[]> {
  const { results } = await db
    .prepare(`SELECT id, name, slug, tier FROM builders ORDER BY (tier = 'A') DESC, name`)
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
  return db.prepare(`SELECT id, name, slug, tier FROM builders WHERE name = ?`).bind(name).first<Builder>();
}
