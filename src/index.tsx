import { Hono } from "hono";
import { Home, FeaturedCardsInner } from "./views/pages/home";
import { Society, SocietySparse } from "./views/pages/society";
import { Submit } from "./views/pages/submit";
import { SubmitStep2 } from "./views/pages/submit-step2";
import { SubmitSuccess } from "./views/pages/submit-success";
import { SearchResults } from "./views/components/search-results";
import { AreaResults } from "./views/components/area-results";
import { MoverResults } from "./views/components/mover-results";
import { listFeatured, filterFeatured, search, getBySlug } from "./data/society";
import { societyDetailBySlug } from "./data/society-detail";
import { searchAreas } from "./data/area";
import { searchMovers } from "./data/mover";
import { newSubmission, getSubmissionById } from "./data/submission";
import {
  emptyStep1,
  emptyStep2,
  parseStep1,
  parseStep2,
  validateStep1,
  validateStep2,
  hasStep1Errors,
  buildSubmission,
  persistSubmission,
} from "./lib/submit";

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

// /societies/:slug — curated detail first; slug-in-catalog-without-detail
// falls back to the sparse page; unknown slug 404s.
app.get("/societies/:slug", async (c) => {
  const slug = c.req.param("slug");
  const detail = societyDetailBySlug(slug);
  if (detail) return c.html(<Society detail={detail} />);
  const soc = await getBySlug(c.env.DB, slug);
  if (soc) return c.html(<SocietySparse soc={soc} />);
  return c.notFound();
});

// ---- Submit flow ----

// Step 1 form.
app.get("/submit", (c) => c.html(<Submit step1={emptyStep1()} errors={{}} />));

// /areas/search + /movers/search — picker dropdowns for the submit form.
app.get("/areas/search", (c) => {
  let q = (c.req.query("q") ?? "").trim();
  if (q === "") q = (c.req.query("locality") ?? "").trim();
  const matches = searchAreas(q, 10);
  const exact = matches.some((a) => a.toLowerCase() === q.toLowerCase());
  return c.html(<AreaResults query={q} matches={matches} exact={exact} />);
});
app.get("/movers/search", (c) => {
  let q = (c.req.query("q") ?? "").trim();
  if (q === "") q = (c.req.query("mover_name") ?? "").trim();
  const matches = searchMovers(q, 8);
  const exact = matches.some((m) => m.toLowerCase() === q.toLowerCase());
  return c.html(<MoverResults query={q} matches={matches} exact={exact} />);
});

// Step 1 POST: validate; on success either skip to success (skip_step2) or
// render Step 2. On error re-render Step 1 (422) with values intact.
app.post("/submit/step1", async (c) => {
  const body = await c.req.parseBody();
  const step1 = parseStep1(body);
  const errs = validateStep1(step1);
  if (Object.keys(errs).length > 0) {
    c.status(422);
    return c.html(<Submit step1={step1} errors={errs} />);
  }
  if (body["skip_step2"] === "true") {
    const sub = buildSubmission(step1, emptyStep2());
    await persistSubmission(c.env.DB, sub);
    return c.html(<SubmitSuccess sub={sub} />);
  }
  return c.html(<SubmitStep2 step1={step1} step2={emptyStep2()} errors={{}} />);
});

// Step 2 POST: validate step1+step2; bounce to whichever step failed; on
// success persist + render success (HX-Redirect for HTMX callers).
app.post("/submit/step2", async (c) => {
  const body = await c.req.parseBody();
  const step1 = parseStep1(body);
  const step2 = parseStep2(body);
  const errs = { ...validateStep1(step1), ...validateStep2(step2) };
  if (hasStep1Errors(errs)) {
    c.status(422);
    return c.html(<Submit step1={step1} errors={errs} />);
  }
  if (Object.keys(errs).length > 0) {
    c.status(422);
    return c.html(<SubmitStep2 step1={step1} step2={step2} errors={errs} />);
  }
  const sub = buildSubmission(step1, step2);
  await persistSubmission(c.env.DB, sub);
  if (c.req.header("HX-Request") === "true") {
    c.header("HX-Redirect", `/submit/success?id=${sub.id}`);
    return c.body(null);
  }
  return c.html(<SubmitSuccess sub={sub} />);
});

// Success page — ?id lookup falls back to a generic page so refreshes render.
app.get("/submit/success", async (c) => {
  const id = c.req.query("id") ?? "";
  let sub = id !== "" ? await getSubmissionById(c.env.DB, id) : null;
  if (!sub) {
    sub = newSubmission();
    sub.societyName = "your society";
  }
  return c.html(<SubmitSuccess sub={sub} />);
});

// Liveness probe — also confirms the D1 binding answers a trivial query.
app.get("/healthz", async (c) => {
  const row = await c.env.DB.prepare("SELECT 1 AS ok").first<{ ok: number }>();
  return c.json({ status: "ok", db: row?.ok === 1 });
});

export default app;
