import type { FC } from "hono/jsx";
import type { Society } from "../../data/society";
import { PAGE_SIZE } from "../../data/society";
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

// SocietyCardsFragment — the raw card rows returned by GET /societies/page.
// This is an HTMX fragment: no layout, no wrapper section — just the cards
// plus the next "Load more" trigger (or nothing when hasMore=false). The
// fragment is appended into #societies-grid by hx-swap="beforeend".
export const SocietyCardsFragment: FC<{ societies: Society[]; nextOffset: number; hasMore: boolean }> = ({
  societies,
  nextOffset,
  hasMore,
}) => (
  <>
    {societies.map((soc) => (
      <SocietyCard soc={soc} />
    ))}
    {hasMore ? (
      // The sentinel div carries the HTMX load-more trigger. hx-swap="outerHTML"
      // replaces this element entirely so each batch appends its own sentinel or
      // removes it when the last page lands. hx-trigger="revealed" fires when
      // the element scrolls into the viewport — automatic infinite scroll with
      // no click needed. Falls back gracefully: without JS the sentinel is
      // inert (no href CTA needed because the initial 24 cards already cover
      // the catalog at current scale; this can be revisited once we exceed ~200
      // societies and want a no-JS fallback paginated link).
      <div
        id="load-more-trigger"
        hx-get={`/societies/page?offset=${nextOffset}`}
        hx-trigger="revealed"
        hx-target="this"
        hx-swap="outerHTML"
        class="w-full flex justify-center py-6"
      >
        <span class="num text-xs text-ink-faint tracking-[0.12em] uppercase">Loading more...</span>
      </div>
    ) : null}
  </>
);

// BrowseSearch — spelling-tolerant search box on the directory page. Same
// HTMX autocomplete as the homepage hero (GET /search -> SearchResults dropdown,
// fuzzy-matched on name/alias/locality/builder), so people can jump straight to
// a society from the browse page instead of scrolling the whole grid.
const BrowseSearch: FC = () => (
  <section class="px-5 sm:px-8 pb-6 sm:pb-8">
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

// Grid — the wrapping section for the /societies page. Renders the first page
// of cards (page 1, offset 0) plus the HTMX load-more sentinel if there are
// more pages. The grid container id="societies-grid" is the hx-target for
// subsequent page fetches.
const Grid: FC<{ societies: Society[]; hasMore: boolean }> = ({ societies, hasMore }) => (
  <section class="px-5 sm:px-8 pb-16 sm:pb-20">
    <div class="max-w-wide mx-auto">
      <div id="societies-grid" class="flex flex-wrap gap-4 justify-center sm:justify-start">
        <AddSocietyCard />
        <SocietyCardsFragment societies={societies} nextOffset={PAGE_SIZE} hasMore={hasMore} />
      </div>
    </div>
  </section>
);

export const SocietiesIndex: FC<{ societies: Society[]; hasMore: boolean; allForJSONLD: Society[]; stats: HomeStats }> =
  ({ societies, hasMore, allForJSONLD, stats }) => (
    <Layout
      meta={{
        title: "All societies — RentLens",
        description: `Browse resident-reported rent, maintenance, and deposit data across ${fmt(
          stats.societies,
        )} apartment societies in Bengaluru. Real numbers from people who live there.`,
        path: "/societies",
        ogType: "website",
        jsonLd: societiesJSONLD(allForJSONLD),
      }}
    >
      <Header />
      <main>
        <IntroSection stats={stats} />
        <BrowseSearch />
        <Grid societies={societies} hasMore={hasMore} />
        <ContributeCTA stats={stats} />
      </main>
      <Footer />
    </Layout>
  );
