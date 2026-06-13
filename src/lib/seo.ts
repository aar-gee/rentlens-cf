// SEO surface: robots.txt + sitemap.xml builders. Pure string functions so the
// routes stay thin (CLAUDE.md §8) and the logic is unit-testable.
//
// Host-awareness is deliberate: only the canonical production host
// (rentlens.fyi) is allowed to be indexed. Every other origin — the staging
// workers.dev subdomain, ad-hoc `wrangler dev` tunnels, preview deploys —
// gets a blanket Disallow so we never leak a duplicate, noindex-forever copy
// into a search index (CLAUDE.md §2: staging is noindex forever).

export const CANONICAL_HOST = "rentlens.fyi";

// localitySlug — kebab-case a locality display name for /societies/area/{slug}
// URLs ("Sarjapur Road" -> "sarjapur-road", "HSR Layout" -> "hsr-layout").
// Stable and collision-free across our canonical areas; the route reverses it
// by slugifying each DB locality and matching, so there's no separate map to
// keep in sync.
export function localitySlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// isIndexableOrigin — true only for https://rentlens.fyi (with or without a
// trailing slash already stripped by the caller). Everything else is staging,
// local, or a preview and must not be indexed.
export function isIndexableHost(host: string): boolean {
  return host === CANONICAL_HOST;
}

// robotsTxt — body for GET /robots.txt. On the canonical host: allow crawling,
// keep transient / non-content endpoints out of the index, and advertise the
// sitemap. On any other host: disallow everything.
//
// We intentionally do NOT list the admin prefix here — robots.txt is public,
// and naming the prefix would advertise it. Admin is gated by basic-auth and
// 404s without it; obscurity of the path is a minor secondary layer we don't
// undermine by printing it (CLAUDE.md §9).
export function robotsTxt(origin: string): string {
  const host = new URL(origin).host;
  if (!isIndexableHost(host)) {
    return ["User-agent: *", "Disallow: /", ""].join("\n");
  }
  return [
    "User-agent: *",
    "Allow: /",
    // Thin / transient / interactive endpoints — no SEO value, and we don't
    // want code-entry or success pages competing with real content.
    "Disallow: /verify",
    "Disallow: /search",
    "Disallow: /featured",
    "Disallow: /submit/success",
    "",
    `Sitemap: ${origin}/sitemap.xml`,
    "",
  ].join("\n");
}

// Static, indexable content routes and their sitemap hints. Order is the order
// they appear in the sitemap. The homepage leads at priority 1.0.
const STATIC_ROUTES: ReadonlyArray<{ path: string; changefreq: string; priority: string }> = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/societies", changefreq: "daily", priority: "0.9" },
  { path: "/about", changefreq: "monthly", priority: "0.6" },
  { path: "/notes", changefreq: "weekly", priority: "0.6" },
  { path: "/how-it-works", changefreq: "monthly", priority: "0.6" },
  { path: "/submit", changefreq: "monthly", priority: "0.7" },
  { path: "/contact", changefreq: "yearly", priority: "0.3" },
  { path: "/privacy", changefreq: "yearly", priority: "0.2" },
  { path: "/terms", changefreq: "yearly", priority: "0.2" },
];

// A society entry for the sitemap: its slug plus the ISO date of its last
// update (for <lastmod>), if known.
export type SitemapSociety = { slug: string; lastUpdated: string | null };

// xmlEscape — minimal escaping for the few chars that can appear in a URL/loc.
// Slugs are kebab-case so this is belt-and-suspenders, but the origin could in
// principle carry an `&` and lastmod is bounded; cheap to be correct.
function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// toLastmod — normalize a D1 ISO-ish timestamp to a sitemap <lastmod> date
// (YYYY-MM-DD). Returns undefined when unparseable so we just omit the tag.
function toLastmod(raw: string | null): string | undefined {
  if (!raw) return undefined;
  const t = Date.parse(raw.includes("T") ? raw : raw.replace(" ", "T") + "Z");
  if (Number.isNaN(t)) return undefined;
  return new Date(t).toISOString().slice(0, 10);
}

// A dated content entry (e.g. a notes article): path + ISO date for <lastmod>.
export type SitemapEntry = { path: string; lastUpdated: string | null };

// buildSitemap — full urlset XML. Static routes first, then dated content
// entries (notes), then one <url> per published society. `origin` is the
// request origin (so staging emits staging URLs); callers should only serve
// this on the canonical host anyway, but it stays correct either way.
export function buildSitemap(
  origin: string,
  societies: SitemapSociety[],
  entries: SitemapEntry[] = [],
  localitySlugs: string[] = [],
): string {
  const urls: string[] = [];
  for (const r of STATIC_ROUTES) {
    urls.push(
      `  <url>\n` +
        `    <loc>${xmlEscape(origin + r.path)}</loc>\n` +
        `    <changefreq>${r.changefreq}</changefreq>\n` +
        `    <priority>${r.priority}</priority>\n` +
        `  </url>`,
    );
  }
  // Locality landing pages (/societies/area/{slug}) — real, keyworded index
  // pages, so they rank alongside society pages (priority 0.8, weekly).
  for (const slug of localitySlugs) {
    urls.push(
      `  <url>\n` +
        `    <loc>${xmlEscape(`${origin}/societies/area/${slug}`)}</loc>\n` +
        `    <changefreq>weekly</changefreq>\n` +
        `    <priority>0.8</priority>\n` +
        `  </url>`,
    );
  }
  for (const e of entries) {
    const lastmod = toLastmod(e.lastUpdated);
    urls.push(
      `  <url>\n` +
        `    <loc>${xmlEscape(origin + e.path)}</loc>\n` +
        (lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : "") +
        `    <changefreq>monthly</changefreq>\n` +
        `    <priority>0.6</priority>\n` +
        `  </url>`,
    );
  }
  for (const s of societies) {
    const loc = xmlEscape(`${origin}/societies/${s.slug}`);
    const lastmod = toLastmod(s.lastUpdated);
    urls.push(
      `  <url>\n` +
        `    <loc>${loc}</loc>\n` +
        (lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : "") +
        `    <changefreq>weekly</changefreq>\n` +
        `    <priority>0.8</priority>\n` +
        `  </url>`,
    );
  }
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.join("\n") +
    `\n</urlset>\n`
  );
}
