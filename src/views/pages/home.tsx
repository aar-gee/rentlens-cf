import type { FC } from "hono/jsx";
import type { Society } from "../../data/society";
import type { HomeStats } from "../../data/stats";
import { Layout } from "../layout";
import { Header } from "../components/header";
import { Footer } from "../components/footer";
import { PillRow, type PillItem } from "../components/pill-row";
import { SocietyCard } from "../components/society-card";
import { AddSocietyCard } from "../components/add-society-card";
import { ContributeCTA } from "../components/contribute-cta";

// Hero Area filter pills. Value is the locality /featured filters on; "*" resets.
const areaPills: PillItem[] = [
  { label: "All", active: true, value: "*" },
  { label: "Whitefield", value: "Whitefield" },
  { label: "Hoodi", value: "Hoodi" },
  { label: "Brookefield", value: "Brookefield" },
  { label: "Nallurhalli", value: "Nallurhalli" },
  { label: "Marathahalli", value: "Marathahalli" },
  { label: "Bellandur", value: "Bellandur" },
];

// Hero BHK filter pills. Value maps to a society's FeaturedBHK server-side.
const bhkPills: PillItem[] = [
  { label: "Any", active: true, value: "*" },
  { label: "1 BHK", value: "1BHK" },
  { label: "2 BHK", value: "2BHK" },
  { label: "2.5 BHK", value: "2.5BHK" },
  { label: "3 BHK", value: "3BHK" },
  { label: "3.5 BHK", value: "3.5BHK" },
  { label: "4+ BHK", value: "4+BHK" },
];

// WebSite + SearchAction schema.org payload (static — no user input).
const homeJSONLD =
  '{"@context":"https://schema.org","@type":"WebSite","name":"RentLens","url":"https://rentlens.fyi/","potentialAction":{"@type":"SearchAction","target":"https://rentlens.fyi/search?q={search_term_string}","query-input":"required name=search_term_string"}}';

const Arrow: FC = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M3 7h8m-3-3l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" />
  </svg>
);

// FeaturedCardsInner — swappable inner of #featured-cards. Rendered directly
// by the /featured handler as an HTMX fragment when filters change.
export const FeaturedCardsInner: FC<{ featured: Society[] }> = ({ featured }) => (
  <>
    <AddSocietyCard />
    {featured.map((soc) => (
      <SocietyCard soc={soc} />
    ))}
    {featured.length === 0 ? (
      <div class="flex-shrink-0 w-[280px] sm:w-[300px] flex flex-col items-center justify-center px-6 py-10 text-center border border-dashed border-hairline">
        <div class="num text-xs text-ink-faint tracking-[0.14em] uppercase mb-2">No matches</div>
        <p class="text-sm text-ink-mute leading-relaxed mb-4">
          No societies match these filters yet. Submit a report to put yours on the map.
        </p>
        <a href="/submit" class="text-sm font-medium text-marigold-deep hover:text-marigold link-u">
          Submit rent →
        </a>
      </div>
    ) : null}
  </>
);

const HeroSection: FC = () => (
  <section class="relative pt-14 sm:pt-20 lg:pt-24 pb-12 sm:pb-16 px-5 sm:px-8 overflow-hidden">
    <div aria-hidden="true" class="hidden lg:block absolute inset-0 opacity-[0.05] pointer-events-none">
      <div class="absolute top-0 left-[14%] w-px h-full bg-ink" />
      <div class="absolute top-0 right-[14%] w-px h-full bg-ink" />
    </div>
    <div class="max-w-base mx-auto text-center relative">
      <div class="rise rise-1 inline-flex items-center gap-2.5 mb-7 sm:mb-9">
        <span class="w-1.5 h-1.5 rounded-full bg-marigold accent-dot" />
        <span class="eyebrow">Rental Intelligence · Bengaluru</span>
      </div>
      <h1 class="rise rise-2 display text-[clamp(44px,8.5vw,108px)] leading-[0.98] font-normal">
        Asking prices lie.
        <br />
        <span class="emph">Residents don't.</span>
      </h1>
      <p class="rise rise-3 mt-6 sm:mt-8 text-base sm:text-lg lg:text-xl text-ink-mute max-w-[620px] mx-auto leading-relaxed px-4 sm:px-0">
        Real rent, maintenance, and deposit data from people who actually live in Bengaluru's premium apartment
        societies.
      </p>
      {/* relative z-30 is load-bearing: see base.templ note — reorders the
          .rise sibling stacking contexts so the dropdown surface wins. */}
      <form class="rise rise-4 relative z-30 mt-10 sm:mt-12 max-w-[640px] mx-auto" onsubmit="return false;">
        <div class="relative max-w-[640px] mx-auto">
          <div class="search-shell bg-white border border-hairline flex items-center pl-4 sm:pl-6 pr-2 py-2 sm:py-2.5 gap-2 sm:gap-3">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" class="text-ink-faint flex-shrink-0">
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
              hx-target="#search-results"
              hx-swap="innerHTML"
              autocomplete="off"
            />
            <button class="bg-ink text-parchment hover:bg-ink/85 transition-colors px-4 sm:px-5 py-2.5 text-sm font-medium tracking-tight whitespace-nowrap">
              Search
            </button>
          </div>
          <div id="search-results" class="absolute left-0 right-0 top-full mt-1 z-50 text-left" />
        </div>
      </form>
      <div class="rise rise-5 mt-7 sm:mt-9 space-y-2 sm:space-y-3">
        <div data-filter="area">
          <PillRow label="Area" items={areaPills} />
        </div>
        <div data-filter="bhk">
          <PillRow label="BHK" items={bhkPills} />
        </div>
      </div>
    </div>
  </section>
);

const FeaturedSection: FC<{ featured: Society[] }> = ({ featured }) => (
  <section class="px-5 sm:px-8 py-12 sm:py-16">
    <div class="max-w-wide mx-auto">
      <div class="flex items-end justify-between gap-4 mb-7">
        <div>
          <div class="eyebrow mb-2">/ Featured · last 12 months</div>
          <h2 class="display text-2xl sm:text-3xl md:text-4xl font-medium tracking-tighter">
            Real numbers from real residents.
          </h2>
        </div>
        <a
          href="/societies"
          class="hidden sm:inline-flex items-center gap-1.5 text-sm text-ink-mute hover:text-ink link-u whitespace-nowrap"
        >
          Browse all societies
          <Arrow />
        </a>
      </div>
      <div class="cards-scroll overflow-x-auto -mx-5 sm:-mx-8 px-5 sm:px-8 pb-3">
        <div id="featured-cards" class="flex gap-4 min-w-min">
          <FeaturedCardsInner featured={featured} />
        </div>
      </div>
      <a href="/societies" class="sm:hidden mt-4 inline-flex items-center gap-1.5 text-sm text-ink-mute link-u">
        Browse all societies
        <Arrow />
      </a>
    </div>
  </section>
);

const HowItWorksSection: FC = () => (
  <section class="px-5 sm:px-8 py-16 sm:py-20 border-y border-hairline bg-parchment-deep/30">
    <div class="max-w-base mx-auto">
      <div class="mb-12 sm:mb-14">
        <div class="eyebrow mb-3">/ How it works</div>
        <h2 class="display text-2xl sm:text-3xl md:text-4xl font-medium tracking-tighter max-w-[700px]">
          The data is only useful if it's <span class="emph-accent">real</span>.
        </h2>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8 relative">
        <div class="hidden md:block absolute top-[34px] left-[12%] right-[12%] h-px bg-hairline-strong" />
        <div class="relative">
          <div class="num text-marigold text-2xl mb-3 inline-block bg-parchment-deep px-2 relative z-10">01</div>
          <h3 class="display text-xl font-medium mb-2">Find your society</h3>
          <p class="text-sm text-ink-mute leading-relaxed">
            Search by name or browse by area. We cover the premium clusters around Whitefield, Hoodi, Brookefield and
            Nallurhalli first — then expand.
          </p>
        </div>
        <div class="relative">
          <div class="num text-marigold text-2xl mb-3 inline-block bg-parchment-deep px-2 relative z-10">02</div>
          <h3 class="display text-xl font-medium mb-2">See the real rents</h3>
          <p class="text-sm text-ink-mute leading-relaxed">
            Median rent, maintenance, deposit norms, and floor-band differences — every number stamped with sample
            size and recency.
          </p>
        </div>
        <div class="relative">
          <div class="num text-marigold text-2xl mb-3 inline-block bg-parchment-deep px-2 relative z-10">03</div>
          <h3 class="display text-xl font-medium mb-2">Help the next renter</h3>
          <p class="text-sm text-ink-mute leading-relaxed">
            60-second submission. Anonymous by default. Every report sharpens the picture for whoever searches your
            society next.
          </p>
        </div>
      </div>
    </div>
  </section>
);

const WhyThisExistsSection: FC = () => (
  <section class="px-5 sm:px-8 py-16 sm:py-24">
    <div class="max-w-base mx-auto">
      <div class="mb-10 sm:mb-14">
        <div class="eyebrow mb-3">/ Why this exists</div>
        <h2 class="display text-2xl sm:text-4xl md:text-5xl font-medium tracking-tighter leading-[1.05] max-w-[860px]">
          Portals show you what owners <span class="emph">ask</span>.
          <br class="hidden sm:block" />
          We show you what residents <span class="emph-accent">pay</span>.
        </h2>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-0 border border-hairline">
        <div class="p-7 sm:p-10 bg-parchment-deep/40 md:border-r border-hairline border-b md:border-b-0">
          <div class="eyebrow mb-4">Public listing portal</div>
          <div class="num text-[40px] sm:text-[44px] font-medium leading-none mb-2 text-ink-mute tracking-tighter">
            ₹95,000<span class="text-base text-ink-faint">/mo</span>
          </div>
          <div class="text-sm text-ink-mute mb-6">
            3 BHK · Prestige Shantiniketan · <span class="italic">asking</span>
          </div>
          <ul class="space-y-2.5 text-sm text-ink-mute">
            <li class="flex items-start gap-2.5">
              <span class="text-ink-faint mt-0.5 num">×</span> Stale and inflated
            </li>
            <li class="flex items-start gap-2.5">
              <span class="text-ink-faint mt-0.5 num">×</span> Optimized for broker leads
            </li>
            <li class="flex items-start gap-2.5">
              <span class="text-ink-faint mt-0.5 num">×</span> Maintenance hidden until you call
            </li>
            <li class="flex items-start gap-2.5">
              <span class="text-ink-faint mt-0.5 num">×</span> Deposit norms undisclosed
            </li>
          </ul>
        </div>
        <div class="p-7 sm:p-10 bg-white relative">
          <div class="absolute top-0 right-0 bg-marigold text-parchment text-[9px] px-2 py-0.5 tracking-[0.14em] uppercase font-mono">
            RentLens
          </div>
          <div class="eyebrow mb-4 !text-marigold-deep">Resident-reported · 27 reports</div>
          <div class="num text-[40px] sm:text-[44px] font-medium leading-none mb-2 tracking-tighter">
            ₹82,000<span class="text-base text-ink-faint">/mo</span>
          </div>
          <div class="text-sm text-ink-mute mb-6">3 BHK · Prestige Shantiniketan · last 12 months</div>
          <ul class="space-y-2.5 text-sm text-ink">
            <li class="flex items-start gap-2.5">
              <span class="text-marigold mt-0.5 num">✓</span> Crowdsourced from residents
            </li>
            <li class="flex items-start gap-2.5">
              <span class="text-marigold mt-0.5 num">✓</span> Median + range, with sample size
            </li>
            <li class="flex items-start gap-2.5">
              <span class="text-marigold mt-0.5 num">✓</span> Maintenance and deposit visible
            </li>
            <li class="flex items-start gap-2.5">
              <span class="text-marigold mt-0.5 num">✓</span> Floor-band, furnishing breakdowns
            </li>
          </ul>
        </div>
      </div>
      <div class="mt-6 flex items-start gap-3 text-sm text-ink-mute">
        <span class="num text-[10px] text-marigold-deep tracking-[0.14em] uppercase mt-1.5 hidden sm:inline">
          Fig. 02
        </span>
        <p>
          <span class="num text-ink font-medium">₹1,56,000</span> a year — the gap between the asking price and what
          residents actually pay, on a single 3 BHK lease. Seeing it before you sign is why this exists.
        </p>
      </div>
    </div>
  </section>
);

export const Home: FC<{ featured: Society[]; stats: HomeStats }> = ({ featured, stats }) => (
  <Layout
    meta={{
      title: "RentLens — real rents from real residents",
      description:
        "Real rent, maintenance, and deposit data from people who actually live in Bengaluru's premium apartment societies. Not asking prices.",
      path: "/",
      ogType: "website",
      jsonLd: homeJSONLD,
    }}
  >
    <Header />
    <main>
      <HeroSection />
      <FeaturedSection featured={featured} />
      <HowItWorksSection />
      <WhyThisExistsSection />
      <ContributeCTA stats={stats} />
    </main>
    <Footer />
  </Layout>
);
