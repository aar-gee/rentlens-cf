import { Hono } from "hono";
import { Home, FeaturedCardsInner } from "./views/pages/home";
import { SearchResults } from "./views/components/search-results";
import { listFeatured, filterFeatured, search } from "./data/society";

// Worker bindings (see wrangler.toml). DB is the D1 (SQLite) database;
// ASSETS serves files from public/ (compiled tailwind.css, icons, manifest).
export type Bindings = {
  DB: D1Database;
  ASSETS: Fetcher;
};

const app = new Hono<{ Bindings: Bindings }>();

// Homepage — featured (most-reported) societies + autocomplete search + filters.
app.get("/", async (c) => {
  const featured = await listFeatured(c.env.DB, 6);
  return c.html(<Home featured={featured} />);
});

// /search — autocomplete dropdown HTML fragment. Accepts q or society_name
// (the submit form posts its raw input name). mode=picker renders fill-form
// buttons instead of navigate links.
app.get("/search", async (c) => {
  let q = (c.req.query("q") ?? "").trim();
  if (q === "") q = (c.req.query("society_name") ?? "").trim();
  const picker = c.req.query("mode") === "picker";
  const results = await search(c.env.DB, q);
  return c.html(<SearchResults query={q} results={results} picker={picker} />);
});

// /featured — inner of #featured-cards as an HTMX fragment. ?area + ?bhk
// filter (empty = no filter); up to 6 matches, most-reported first.
app.get("/featured", async (c) => {
  const area = (c.req.query("area") ?? "").trim();
  const bhk = (c.req.query("bhk") ?? "").trim();
  const results = await filterFeatured(c.env.DB, area, bhk, 6);
  return c.html(<FeaturedCardsInner featured={results} />);
});

// Liveness probe — also confirms the D1 binding answers a trivial query.
app.get("/healthz", async (c) => {
  const row = await c.env.DB.prepare("SELECT 1 AS ok").first<{ ok: number }>();
  return c.json({ status: "ok", db: row?.ok === 1 });
});

export default app;
