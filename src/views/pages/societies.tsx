import type { FC } from "hono/jsx";
import type { Society } from "../../data/society";
import type { HomeStats } from "../../data/stats";
import { Layout } from "../layout";
import { Header } from "../components/header";
import { Footer } from "../components/footer";
import { SocietyCard } from "../components/society-card";
import { AddSocietyCard } from "../components/add-society-card";
import { ContributeCTA } from "../components/contribute-cta";

const fmt = (n: number) => n.toLocaleString("en-IN");

// JSONLD_CAP limits the ItemList entries emitted in the page's JSON-LD blob.
// The full catalog is already covered by /sitemap.xml, which is the canonical
// SEO surface for all society slugs. Emitting thousands of ItemList entries
// here would bloat the HTML for no additional crawl value.
const JSONLD_CAP = 50;

// societiesJSONLD emits an ItemList for the first JSONLD_CAP societies so
// search engines see the collection as a browseable index. /sitemap.xml
// remains the complete coverage surface for individual society pages.
function societiesJSONLD(societies: Society[]): string {
  const capped = societies.slice(0, JSONLD_CAP);
  const items = capped.map((s, i) => ({
    "@type": "ListItem",
    position: i + 1,
    url: `https://rentlens.fyi/societies/${s.slug}`,
    name: s.name,
  }));
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "All societies on RentLens",
    url: "https://rentlens.fyi/societies",
    mainEntity: { "@type": "ItemList", numberOfItems: societies.length, itemListElement: items },
  });
}

const IntroSection: FC<{ stats: HomeStats }> = ({ stats }) => (
  <section class="px-5 sm:px-8 pt-14 sm:pt-20 pb-8 sm:pb-10">
    <div class="max-w-wide mx-auto">
      <div class="eyebrow mb-3">/ Directory · Bengaluru</div>
      <h1 class="display text-3xl sm:text-4xl md:text-5xl font-medium tracking-tighter max-w-[760px]">
        Every society we track, in one place.
      </h1>
      <p class="mt-5 text-base sm:text-lg text-ink-mute max-w-[620px] leading-relaxed">
        Estimates across {fmt(stats.societies)} societies in {fmt(stats.areas)} Bengaluru localities, with{" "}
        {fmt(stats.actualPoints)} real resident reports in so far. Don't see yours? Add it in sixty seconds.
      </p>
    </div>
  </section>
);

// BrowseSearch — spelling-tolerant search box on the directory page. Same
// HTMX autocomplete as the homepage hero (GET /search -> SearchResults dropdown,
// fuzzy-matched on name/alias/locality/builder). The <section> carries
// `relative z-30` so its absolute results dropdown stacks ABOVE the cards below
// (without it the dropdown rendered behind the grid).
const BrowseSearch: FC = () => (
  <section class="relative z-30 px-5 sm:px-8 pb-5 sm:pb-6">
    <div class="max-w-wide mx-auto">
      <form class="relative max-w-[560px]" onsubmit="return false;">
        <div class="search-shell bg-white border border-hairline flex items-center pl-4 pr-2 py-2 sm:py-2.5 gap-2 sm:gap-3">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" class="text-ink-faint flex-shrink-0">
            <circle cx="9" cy="9" r="6.5" stroke="currentColor" stroke-width="1.5" />
            <path d="M14 14l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" />
          </svg>
          <input
            type="search"
            name="q"
            placeholder="Search a society or locality"
            class="flex-1 min-w-0 bg-transparent outline-none text-sm sm:text-base placeholder:text-ink-faint"
            hx-get="/search"
            hx-trigger="keyup changed delay:300ms, search"
            hx-target="#browse-search-results"
            hx-swap="innerHTML"
            autocomplete="off"
          />
        </div>
        <div id="browse-search-results" class="absolute left-0 right-0 top-full mt-1 z-50 text-left" />
      </form>
    </div>
  </section>
);

// AreaFilter — locality filter chips. "All" + each area (most-populated first),
// each a link to ?area=… (which resets to page 1). Active chip is highlighted.
const chipClass = (active: boolean) =>
  "num text-xs tracking-[0.04em] px-3 py-1.5 border transition-colors no-underline " +
  (active ? "border-ink bg-ink text-parchment" : "border-hairline text-ink-mute hover:border-ink-mute");
const AreaFilter: FC<{ areas: { locality: string; count: number }[]; active: string }> = ({ areas, active }) => (
  <section class="px-5 sm:px-8 pb-6">
    <div class="max-w-wide mx-auto flex flex-wrap gap-2">
      <a href="/societies" class={chipClass(active === "")}>
        All
      </a>
      {areas.map((a) => (
        <a href={`/societies?area=${encodeURIComponent(a.locality)}`} class={chipClass(active === a.locality)}>
          {a.locality} <span class={active === a.locality ? "text-parchment/70" : "text-ink-faint"}>{a.count}</span>
        </a>
      ))}
    </div>
  </section>
);

// Grid — the current page's society cards. AddSocietyCard leads only on the
// unfiltered first page so it isn't repeated on every page / filter view.
const Grid: FC<{ societies: Society[]; showAdd: boolean }> = ({ societies, showAdd }) => (
  <section class="px-5 sm:px-8 pb-10 sm:pb-12">
    <div class="max-w-wide mx-auto">
      {societies.length === 0 ? (
        <p class="text-ink-mute">No societies in this area yet. Try another area, or add yours.</p>
      ) : (
        <div class="flex flex-wrap gap-4 justify-center sm:justify-start">
          {showAdd ? <AddSocietyCard /> : null}
          {societies.map((soc) => (
            <SocietyCard soc={soc} />
          ))}
        </div>
      )}
    </div>
  </section>
);

// Pagination — classic Prev / page-indicator / Next, preserving the active area
// filter. Plain server-rendered links (full page nav): robust, no JS, no scroll
// jank. Hidden when there's only one page.
const pageHref = (page: number, area: string) =>
  `/societies?page=${page}${area ? `&area=${encodeURIComponent(area)}` : ""}`;
const PAGER_ON = "num text-xs tracking-[0.08em] uppercase px-4 py-2 border border-hairline hover:border-ink transition-colors no-underline text-ink";
const PAGER_OFF = "num text-xs tracking-[0.08em] uppercase px-4 py-2 border border-hairline text-ink-faint/40 cursor-default select-none";
const Pagination: FC<{ page: number; totalPages: number; area: string }> = ({ page, totalPages, area }) => {
  if (totalPages <= 1) return <></>;
  return (
    <section class="px-5 sm:px-8 pb-16 sm:pb-20">
      <div class="max-w-wide mx-auto flex items-center justify-between gap-4">
        {page > 1 ? (
          <a href={pageHref(page - 1, area)} class={PAGER_ON}>
            ← Prev
          </a>
        ) : (
          <span class={PAGER_OFF}>← Prev</span>
        )}
        <span class="num text-xs text-ink-mute tracking-[0.08em] uppercase">
          Page {page} of {totalPages}
        </span>
        {page < totalPages ? (
          <a href={pageHref(page + 1, area)} class={PAGER_ON}>
            Next →
          </a>
        ) : (
          <span class={PAGER_OFF}>Next →</span>
        )}
      </div>
    </section>
  );
};

export const SocietiesIndex: FC<{
  societies: Society[];
  page: number;
  totalPages: number;
  area: string;
  areas: { locality: string; count: number }[];
  stats: HomeStats;
}> = ({ societies, page, totalPages, area, areas, stats }) => (
  <Layout
    meta={{
      title: area ? `Societies in ${area} — RentLens` : "All societies — RentLens",
      description: `Browse resident-reported rent, maintenance, and deposit data across ${fmt(
        stats.societies,
      )} apartment societies in Bengaluru. Real numbers from people who live there.`,
      path: "/societies",
      ogType: "website",
      jsonLd: societiesJSONLD(societies),
    }}
  >
    <Header />
    <main>
      <IntroSection stats={stats} />
      <BrowseSearch />
      <AreaFilter areas={areas} active={area} />
      <Grid societies={societies} showAdd={page === 1 && area === ""} />
      <Pagination page={page} totalPages={totalPages} area={area} />
      <ContributeCTA stats={stats} />
    </main>
    <Footer />
  </Layout>
);
