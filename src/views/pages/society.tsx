import type { FC } from "hono/jsx";
import type { SocietyDetail, RentBreakdownRow } from "../../data/society-detail";
import type { Society as SocietyRecord } from "../../data/society";
import { Layout, type Meta } from "../layout";
import { Header } from "../components/header";
import { Footer } from "../components/footer";
import { Breadcrumb, type BreadcrumbItem } from "../components/breadcrumb";
import { ContributeCTA } from "../components/contribute-cta";
import { ShareRow } from "../components/share-row";
import { WaitlistBox } from "../components/waitlist-form";
import { RentBreakdownTable } from "../components/rent-breakdown-table";
import { MaintenanceCard, FurnishingPremiumCard, LeaseNormsCard } from "../components/sidebar-cards";
import { QualitativeTile } from "../components/qualitative-tile";
import { NotesSummary, RawEmphParagraph } from "../components/notes-summary";
import { BarList } from "../components/bar-list";
import { RatedList } from "../components/rated-list";
import { ConfidenceStrip } from "../components/confidence-strip";
import { NearbyCard } from "../components/nearby-card";
import { PillRowLeft, type PillItem } from "../components/pill-row";
import { ProvenanceBadge } from "../components/provenance-badge";
import { formatINR, formatINRRange } from "../../lib/format";
import { recentTime } from "../../lib/relative-time";

const HOST = "https://rentlens.fyi";

// bhkLabel — which BHK configs we carry headline rent for, as a compact label
// for titles/meta ("2 & 3 BHK"). Drives keyword-bearing <title>s that match the
// long-tails renters actually type ("{society} rent 2 bhk").
function bhkLabel(d: SocietyDetail): string {
  const has2 = d.medianRent2BHK != null;
  const has3 = d.medianRent3BHK != null;
  if (has2 && has3) return "2 & 3 BHK";
  if (has2) return "2 BHK";
  if (has3) return "3 BHK";
  return "";
}

// societyTitle — keyword-bearing <title>. Kept near ~60 chars so Google keeps
// the meaningful tail ("rent: 2 & 3 BHK, {locality}") instead of truncating it.
function societyTitle(d: SocietyDetail): string {
  const b = bhkLabel(d);
  const core = b ? `${d.name} rent: ${b}, ${d.locality}` : `${d.name} rent, ${d.locality}`;
  return `${core} — RentLens`;
}

// faqLD — honest FAQPage entries targeting confirmed long-tails: per-BHK rent,
// the 1 BHK *negative* answer (older premium societies were built around 2/3
// BHK, so 1 BHK stock is rare-to-nonexistent — a true answer the listing
// portals can't give), maintenance charges, and deposit. Wording reads off
// provenance so we never overstate (CLAUDE.md §2 / honesty contract): estimates
// say "our estimate"; resident data says "residents report".
function faqLD(d: SocietyDetail) {
  const est = (d.provenance ?? "seed") !== "resident";
  const src = est ? "Our estimate is" : "Residents report";
  const tail = est
    ? " These are early estimates, not asking prices — no resident reports yet, so the figure may move as real reports land."
    : "";
  const qa: { q: string; a: string }[] = [];

  if (d.medianRent2BHK != null) {
    const r = d.range2BHKLow != null && d.range2BHKHigh != null ? ` (typically ${formatINRRange(d.range2BHKLow, d.range2BHKHigh)})` : "";
    qa.push({
      q: `What is the rent for a 2 BHK in ${d.name}?`,
      a: `${src} around ${formatINR(d.medianRent2BHK)}/month for a 2 BHK at ${d.name}, ${d.locality}${r}.${tail}`,
    });
  }
  if (d.medianRent3BHK != null) {
    const r = d.range3BHKLow != null && d.range3BHKHigh != null ? ` (typically ${formatINRRange(d.range3BHKLow, d.range3BHKHigh)})` : "";
    qa.push({
      q: `What is the rent for a 3 BHK in ${d.name}?`,
      a: `${src} around ${formatINR(d.medianRent3BHK)}/month for a 3 BHK at ${d.name}, ${d.locality}${r}.${tail}`,
    });
  }

  // Honest negative — captures "1 BHK rent in {society}" by answering truthfully.
  qa.push({
    q: `Is there a 1 BHK for rent in ${d.name}?`,
    a: `${d.name} is built around 2 and 3 BHK family flats. 1 BHK units are rare to nonexistent in premium societies of this era, so you are unlikely to find a 1 BHK to rent here.`,
  });

  // Maintenance — confirmed query "{society} maintenance charges". Guard against
  // the inflated ₹/sq-ft some grounded-estimate societies derive from sparse
  // rent_observations (data bug owned by the data agent): Bengaluru maintenance
  // tops out ~₹7-8/sq ft, so anything above ₹12 is junk. We OMIT the question
  // rather than emit a wrong number into structured data (Google also requires
  // FAQ markup to match on-page content; omitting is safe, mismatching is not).
  const rate = maintPerSqft(d);
  if (rate > 0 && rate <= 12) {
    const ex = Object.keys(SQFT_BY_BHK).map((bhk) => {
      const monthly = Math.round((rate * SQFT_BY_BHK[bhk]) / 100) * 100;
      return `about ${formatINR(monthly)}/mo for a ${bhk} BHK${monthly > MAINT_GST_THRESHOLD ? " (+18% GST)" : ""}`;
    });
    qa.push({
      q: `What are the maintenance charges at ${d.name}?`,
      a: `Maintenance at ${d.name} is ${est ? "estimated at" : "about"} ₹${rate.toFixed(1)} per sq ft per month — ${ex.join(", ")}. 18% GST applies once a flat's maintenance crosses ₹7,500/month.`,
    });
  }

  // Deposit — confirmed query "{society} deposit".
  qa.push({
    q: `How much deposit is needed to rent at ${d.name}?`,
    a: `A deposit of ${d.depositMonths} months' rent is typical at ${d.name} (${d.depositSub}).`,
  });

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: qa.map((x) => ({
      "@type": "Question",
      name: x.q,
      acceptedAnswer: { "@type": "Answer", text: x.a },
    })),
  };
}

// schema.org payload: a Place describing the society + a FAQPage of honest,
// long-tail Q&A. Emitted as a JSON-LD array in one <script> (Google accepts
// multiple top-level objects this way). JSON.stringify gives correct escaping.
function societyJSONLD(d: SocietyDetail): string {
  const place = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: d.name,
    ...(d.description ? { description: d.description } : {}),
    address: {
      "@type": "PostalAddress",
      addressLocality: d.locality,
      addressRegion: "Karnataka",
      addressCountry: "IN",
    },
    url: `${HOST}/societies/${d.slug}`,
    isAccessibleForFree: true,
  };
  return JSON.stringify([place, faqLD(d)]);
}

function societyMeta(d: SocietyDetail): Meta {
  const isEst = (d.provenance ?? "seed") !== "resident";
  const b = bhkLabel(d);
  const cfg = b ? `${b} ` : "";
  return {
    title: societyTitle(d),
    description: isEst
      ? `Our resident-estimated rent for ${cfg}flats at ${d.name}, ${d.locality}, Bengaluru — plus maintenance and deposit. What people actually pay, not asking prices. Help make it real.`
      : `Real resident-reported rent for ${cfg}flats at ${d.name}, ${d.locality}, Bengaluru — plus maintenance and deposit. Reported by ${d.summaryTotal} residents.`,
    path: `/societies/${d.slug}`,
    ogType: "article",
    jsonLd: societyJSONLD(d),
  };
}

function societySparseMeta(soc: SocietyRecord): Meta {
  return {
    title: `${soc.name} rent, ${soc.locality} — RentLens`,
    description: `Resident-reported rent for ${soc.name}, ${soc.locality}, Bengaluru is in progress. Add what you pay to unlock the 2 & 3 BHK breakdown, maintenance, and deposit.`,
    path: `/societies/${soc.slug}`,
    ogType: "article",
  };
}

// ---- hero label helpers ----
function heroEyebrow(d: SocietyDetail): string {
  const id = d.id || d.slug;
  // Honest recency: only show "last updated …" when it's genuinely within the
  // last 7 days — no hardcoded "2h ago" fallback on seeded/stale rows.
  const when = recentTime(d.lastUpdated);
  return when ? `Society · ${id} · last updated ${when}` : `Society · ${id}`;
}

function yearRangeLabel(d: SocietyDetail): string {
  const { yearBuiltFrom: f, yearBuiltTo: t } = d;
  if (f == null && t == null) return "";
  if (f != null && t != null) return f === t ? `${f}` : `${f}–${t}`;
  return `${f ?? t}`;
}

const totalUnitsLabel = (d: SocietyDetail) => (d.totalUnits == null ? "" : `~${d.totalUnits} units`);

// reportsCountLabel sums reports for a BHK across breakdown rows.
function reportsCountLabel(rows: RentBreakdownRow[], bhk: string): string {
  let n = 0;
  for (const r of rows) if (r.bhk === bhk) n += r.reports;
  return n === 1 ? "1 report" : `${n} reports`;
}

// isEstimate — true until a society has genuine resident-reported data. Every
// curated society currently defaults to seed provenance, so they all render the
// honest estimate variant (no fabricated reports / notes / ratings).
const isEstimate = (d: SocietyDetail) => (d.provenance ?? "seed") !== "resident";

const summaryStatsLine = (d: SocietyDetail) =>
  isEstimate(d)
    ? "Our estimate · no resident reports yet"
    : `${d.summaryTotal} reports · ${d.selfCount} self · ${d.partialCount} partial · ${d.verifiedCount} verified`;

// ---- Per-BHK summary cards (rent + maintenance) ----
// Bengaluru societies bill maintenance at a single ₹/sq-ft rate applied
// uniformly across flat sizes — not a different rate per BHK. So we show one
// rate, plus the monthly figure it works out to for each BHK's typical size
// (the deposit-in-months equivalent, auto-scaling). 18% GST applies once a
// flat's maintenance crosses ₹7,500/mo (the RWA-GST threshold). Typical sizes
// are fixed norms for now; submissions capture sqft, so we infer per society
// later.
const SQFT_BY_BHK: Record<string, number> = { "2": 1150, "3": 1600 };
const MAINT_GST_THRESHOLD = 7500;

// maintPerSqft — the society's single uniform maintenance rate (₹/sq ft / mo),
// rounded to 0.1. Derived from the 2 BHK maintenance estimate over its typical
// size, then applied to every flat size. Falls back to the typical figure.
function maintPerSqft(d: SocietyDetail): number {
  const base = d.maintenanceByBHK.find((x) => x.label.includes("2 BHK"))?.value ?? d.maintenanceTypical;
  return Math.round((base / SQFT_BY_BHK["2"]) * 10) / 10;
}

const BHKRentCard: FC<{
  d: SocietyDetail;
  bhk: string;
  median: number | null;
  rangeLow: number | null;
  rangeHigh: number | null;
}> = ({ d, bhk, median, rangeLow, rangeHigh }) => {
  const est = isEstimate(d);
  return (
    <article class="bg-white border border-hairline p-6">
      <div class="eyebrow mb-2">
        {bhk} BHK · {est ? "estimate" : "median"}
      </div>
      <div class="num text-[36px] font-medium tracking-tighter leading-none">
        {median != null ? formatINR(median) : "—"}
        <span class="text-base text-ink-faint">/mo</span>
      </div>
      {rangeLow != null && rangeHigh != null ? (
        <div class="num text-xs text-ink-mute mt-2">{formatINRRange(rangeLow, rangeHigh)} rent</div>
      ) : null}
      <div class="hairline my-4" />
      <div class="flex items-center gap-1.5 text-xs text-ink-mute">
        <span class="w-1.5 h-1.5 rounded-full bg-ink-faint" />
        <span class="num">{est ? "Our estimate" : reportsCountLabel(d.rentBreakdown, `${bhk} BHK`)}</span>
      </div>
    </article>
  );
};

// MaintenanceCard — one uniform ₹/sq-ft rate, with the monthly it works out to
// for the society's BHK sizes (and a +GST tag past the ₹7,500 threshold).
const MaintenanceSummaryCard: FC<{ d: SocietyDetail }> = ({ d }) => {
  const est = isEstimate(d);
  const rate = maintPerSqft(d);
  const examples = Object.keys(SQFT_BY_BHK).map((bhk) => {
    const sqft = SQFT_BY_BHK[bhk];
    const monthly = Math.round((rate * sqft) / 100) * 100;
    return { bhk, sqft, monthly, gst: monthly > MAINT_GST_THRESHOLD };
  });
  return (
    <article class="bg-white border border-hairline p-6">
      <div class="eyebrow mb-2">Maintenance · {est ? "estimate" : "typical"}</div>
      <div class="num text-[36px] font-medium tracking-tighter leading-none">
        ₹{rate.toFixed(1)}
        <span class="text-base text-ink-faint"> /sq ft</span>
      </div>
      <div class={`num text-xs text-ink-mute mt-2${examples.length > 1 ? " cycle-line" : ""}`}>
        {examples.map((e) => (
          <span>
            {e.bhk} BHK (~{e.sqft.toLocaleString("en-IN")} sqft) ≈ {formatINR(e.monthly)}/mo
            {e.gst ? " +18% GST" : ""}
          </span>
        ))}
      </div>
      <div class="hairline my-4" />
      <div class="flex items-center gap-1.5 text-xs text-ink-mute">
        <span class="w-1.5 h-1.5 rounded-full bg-ink-faint" />
        <span class="num">{est ? "Our estimate" : "Across all BHK"}</span>
      </div>
    </article>
  );
};

const DepositCard: FC<{ d: SocietyDetail }> = ({ d }) => (
  <article class="bg-white border border-hairline p-6">
    <div class="eyebrow mb-2">Deposit · typical</div>
    <div class="num text-[36px] font-medium tracking-tighter leading-none">
      {d.depositMonths}
      <span class="text-base text-ink-faint"> months</span>
    </div>
    <div class="num text-xs text-ink-mute mt-2">{d.depositSub}</div>
    <div class="hairline my-4" />
    <div class="flex items-center gap-1.5 text-xs text-ink-mute">
      <span class="w-1.5 h-1.5 rounded-full bg-ink-faint" />
      <span class="num">{isEstimate(d) ? "Our estimate" : "Self-reported"}</span>
    </div>
  </article>
);

const Arrow: FC = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M3 7h8m-3-3l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" />
  </svg>
);

const HeroSection: FC<{ d: SocietyDetail }> = ({ d }) => {
  const yr = yearRangeLabel(d);
  const units = totalUnitsLabel(d);
  return (
    <section class="px-5 sm:px-8 py-10 sm:py-14 border-b border-hairline">
      <div class="max-w-wide mx-auto">
        <div class="rise rise-1 flex flex-wrap items-center gap-2.5 mb-5">
          <span class="w-1.5 h-1.5 rounded-full bg-marigold accent-dot" />
          <span class="eyebrow">{heroEyebrow(d)}</span>
          <ProvenanceBadge provenance={d.provenance ?? "seed"} />
        </div>
        <div class="rise rise-2 grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-8 lg:gap-12 items-end">
          <div>
            <h1 class="display text-[clamp(36px,6vw,72px)] leading-[1] font-normal mb-4">{d.name}</h1>
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-ink-mute">
              <span class="inline-flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 .5C3.5 .5 1.5 2.5 1.5 5S6 11.5 6 11.5 10.5 7.5 10.5 5 8.5 .5 6 .5z" stroke="currentColor" stroke-width="1" />
                  <circle cx="6" cy="5" r="1.5" stroke="currentColor" stroke-width="1" />
                </svg>
                {d.locality}, Bengaluru
              </span>
              {d.builder ? (
                <>
                  <span class="text-ink-faint">·</span>
                  <span>{d.builder}</span>
                </>
              ) : null}
              {yr ? (
                <>
                  <span class="text-ink-faint">·</span>
                  <span class="num">{yr}</span>
                </>
              ) : null}
              {units ? (
                <>
                  <span class="text-ink-faint">·</span>
                  <span class="num">{units}</span>
                </>
              ) : null}
            </div>
            {d.description ? (
              <p class="text-base text-ink-mute mt-4 max-w-[640px] leading-relaxed">{d.description}</p>
            ) : null}
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <a
              href="#contribute"
              class="inline-flex items-center gap-2 bg-marigold hover:bg-marigold-deep transition-colors text-parchment px-5 py-3 text-sm font-medium tracking-tight"
            >
              Submit rent for this society
              <Arrow />
            </a>
            <a
              href="#"
              class="inline-flex items-center gap-2 border border-ink text-ink hover:bg-ink hover:text-parchment transition-colors px-5 py-3 text-sm font-medium tracking-tight"
            >
              Compare nearby
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

const SummarySection: FC<{ d: SocietyDetail }> = ({ d }) => (
  <section class="px-5 sm:px-8 py-10 sm:py-14">
    <div class="max-w-wide mx-auto">
      <div class="flex items-end justify-between mb-7">
        <div>
          <div class="eyebrow mb-2">{isEstimate(d) ? "/ At a glance · our estimate" : "/ At a glance · last 12 months"}</div>
          <h2 class="display text-2xl sm:text-3xl font-medium tracking-tighter">
            {isEstimate(d)
              ? `What we estimate renters pay at ${d.name}, ${d.locality}.`
              : `What residents pay to rent at ${d.name}, ${d.locality}.`}
          </h2>
        </div>
        <span class="text-xs text-ink-faint num hidden sm:inline">{summaryStatsLine(d)}</span>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {d.medianRent2BHK != null ? (
          <BHKRentCard d={d} bhk="2" median={d.medianRent2BHK} rangeLow={d.range2BHKLow} rangeHigh={d.range2BHKHigh} />
        ) : null}
        {d.medianRent3BHK != null ? (
          <BHKRentCard d={d} bhk="3" median={d.medianRent3BHK} rangeLow={d.range3BHKLow} rangeHigh={d.range3BHKHigh} />
        ) : null}
        <MaintenanceSummaryCard d={d} />
        <DepositCard d={d} />
      </div>
      <p class="mt-4 text-xs text-ink-faint leading-relaxed max-w-[680px]">
        Maintenance is charged at one ₹/sq ft rate across all flats; the monthly amount just scales with your size. 18%
        GST applies once a flat's maintenance crosses ₹7,500/mo (the RWA threshold).
      </p>
      <div class="mt-5 flex flex-col sm:flex-row sm:items-center gap-3 bg-parchment-deep/40 border border-hairline p-5">
        <div class="flex items-center gap-3">
          <div class="text-sm">
            <span class="text-ink-mute">Total monthly outflow estimate for a typical {d.totalOutflowBHK}:</span>
            <span class="num font-medium text-ink ml-2">{formatINR(d.totalOutflowEstimate)}</span>
            <span class="text-ink-faint text-xs ml-1">(median rent + median maintenance)</span>
          </div>
        </div>
        <a href="#" class="sm:ml-auto text-sm text-ink-mute hover:text-ink link-u whitespace-nowrap">
          How we calculate this →
        </a>
      </div>
    </div>
  </section>
);

// Society-page filter bar — static pills (display-only; no live filtering yet).
const bhkBar: PillItem[] = [
  { label: "Any", active: true },
  { label: "2 BHK" },
  { label: "2.5 BHK" },
  { label: "3 BHK" },
  { label: "3.5 BHK" },
  { label: "4+ BHK", disabled: true, hint: "limited" },
];
const floorBar: PillItem[] = [
  { label: "Any", active: true },
  { label: "1–3" },
  { label: "4–7" },
  { label: "8–15" },
  { label: "15–21" },
  { label: "21+" },
];
const furnishingBar: PillItem[] = [
  { label: "Any", active: true },
  { label: "Unfurnished" },
  { label: "Semi" },
  { label: "Fully" },
];
const periodBar: PillItem[] = [
  { label: "All time" },
  { label: "Last 12 mo", active: true },
  { label: "Last 6 mo" },
  { label: "Last 3 mo" },
  { label: "Last 1 mo", disabled: true, hint: "limited" },
];

const FilterBar: FC = () => (
  <section class="px-5 sm:px-8 py-6 border-y border-hairline bg-parchment-deep/30">
    <div class="max-w-wide mx-auto">
      <div class="space-y-3">
        <PillRowLeft label="BHK" items={bhkBar} />
        <PillRowLeft label="Floor" items={floorBar} />
        <PillRowLeft label="Furnishing" items={furnishingBar} />
        <PillRowLeft label="Period" items={periodBar} />
      </div>
      <div class="mt-4 flex items-start gap-2 text-xs text-ink-faint max-w-[640px]">
        <span class="num text-[10px] text-marigold-deep tracking-[0.14em] uppercase mt-0.5">Note</span>
        <span>
          Period chips and trend windows adapt to this society's data. Windows with fewer than 3 reports are disabled.
        </span>
      </div>
    </div>
  </section>
);

const MainInsights: FC<{ d: SocietyDetail }> = ({ d }) => (
  <section class="px-5 sm:px-8 py-12 sm:py-16">
    <div class="max-w-wide mx-auto grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-10 lg:gap-14">
      <div>
        <div class="eyebrow mb-2">/ Rent breakdown · 2 BHK and 3 BHK</div>
        <h2 class="display text-xl sm:text-2xl font-medium tracking-tighter mb-5">Floor band moves the rent.</h2>
        <RentBreakdownTable rows={d.rentBreakdown} />
        <div class="mt-4 text-xs text-ink-faint flex items-start gap-2">
          <span class="num text-marigold-deep tracking-[0.14em] uppercase mt-0.5">Note</span>
          <span>
            Floor bands with fewer than 3 reports show "limited data". Furnishing-adjusted: fully-furnished commands
            roughly ₹6–8k/mo over unfurnished on 2 BHK.
          </span>
        </div>
      </div>
      <aside class="space-y-6">
        <MaintenanceSummaryCard d={d} />
        <FurnishingPremiumCard f={d.furnishingPremium} />
        <LeaseNormsCard norms={d.leaseNorms} />
      </aside>
    </div>
  </section>
);

const Qualitative: FC<{ d: SocietyDetail }> = ({ d }) => (
  <section class="px-5 sm:px-8 py-12 sm:py-16 border-t border-hairline bg-parchment-deep/20">
    <div class="max-w-wide mx-auto">
      <div class="mb-8">
        <div class="eyebrow mb-2">/ Beyond the rent</div>
        <h2 class="display text-2xl sm:text-3xl md:text-4xl font-medium tracking-tighter max-w-[620px]">
          What residents say about living here.
        </h2>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QualitativeTile eyebrow="Value for money" r={d.valueForMoney} />
        <QualitativeTile eyebrow="Society quality" r={d.societyQuality} />
        <QualitativeTile eyebrow="Owner / landlord experience" r={d.ownerExperience} />
      </div>
      <NotesSummary summary={d.notesSummary} sampleSize={d.notesSampleSize} />
    </div>
  </section>
);

const MovingIn: FC<{ d: SocietyDetail }> = ({ d }) => (
  <section class="px-5 sm:px-8 py-12 sm:py-16 border-t border-hairline">
    <div class="max-w-wide mx-auto">
      <div class="mb-8 max-w-[680px]">
        <div class="eyebrow mb-2">/ Moving in · the playbook</div>
        <h2 class="display text-2xl sm:text-3xl md:text-4xl font-medium tracking-tighter">
          How residents actually got the keys.
        </h2>
        <p class="text-sm text-ink-mute mt-3 leading-relaxed">
          Premium societies rarely list on portals. The real flow is private — and most renters lose weeks before
          figuring that out.
        </p>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-5 lg:gap-6">
        <div class="bg-white border border-hairline p-6 sm:p-7">
          <div class="flex items-baseline justify-between mb-5">
            <div class="eyebrow">/ How they found this flat</div>
            <span class="num text-xs text-ink-faint">{d.sourceTotal} reports answered · last 12 mo</span>
          </div>
          <BarList rows={d.sourceChannels} />
          <div class="hairline my-5" />
          <div class="text-sm text-ink-mute leading-relaxed">
            <RawEmphParagraph text={d.sourceInsight} />
          </div>
          <div class="mt-4 pt-4 border-t border-hairline/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
            <span class="text-ink-mute">
              Resident introductions <span class="text-ink-faint">· anonymous on both sides until accepted</span>
            </span>
            <a href="#" class="num text-marigold-deep hover:text-marigold link-u">
              request introduction →
            </a>
          </div>
        </div>
        <div class="bg-white border border-hairline p-6 sm:p-7">
          <div class="flex items-baseline justify-between mb-5">
            <div class="eyebrow">/ Movers residents used</div>
            <span class="num text-xs text-ink-faint">{d.moversTotal} reports rated</span>
          </div>
          <RatedList movers={d.movers} />
          <div class="hairline my-5" />
          <a href="#" class="text-sm text-ink-mute hover:text-ink link-u">
            + {d.othersMentioned} others mentioned by 1–2 residents →
          </a>
        </div>
      </div>
    </div>
  </section>
);

const Nearby: FC<{ d: SocietyDetail }> = ({ d }) => (
  <section class="px-5 sm:px-8 py-12 sm:py-16 border-t border-hairline">
    <div class="max-w-wide mx-auto">
      <div class="flex items-end justify-between gap-4 mb-7">
        <div>
          <div class="eyebrow mb-2">/ Compare nearby</div>
          <h2 class="display text-2xl sm:text-3xl font-medium tracking-tighter">
            Other premium societies within 5 km.
          </h2>
        </div>
        <a
          href="#"
          class="hidden sm:inline-flex items-center gap-1.5 text-sm text-ink-mute hover:text-ink link-u whitespace-nowrap"
        >
          Browse all
          <Arrow />
        </a>
      </div>
      <div class="cards-scroll overflow-x-auto -mx-5 sm:-mx-8 px-5 sm:px-8 pb-3">
        <div class="flex gap-4 min-w-min">
          {d.nearbySocieties.map((near) => (
            <NearbyCard near={near} />
          ))}
        </div>
      </div>
    </div>
  </section>
);

// EstimateNotice — shown on seed/estimate societies in place of the (currently
// fabricated) resident notes + ratings sections. States plainly that the
// numbers are our guess and turns the page into a call to contribute.
const EstimateNotice: FC<{ d: SocietyDetail }> = ({ d }) => (
  <section class="px-5 sm:px-8 py-12 sm:py-16 border-t border-hairline bg-parchment-deep/20">
    <div class="max-w-narrow mx-auto">
      <div class="bg-white border border-hairline p-7 sm:p-8">
        <div class="eyebrow mb-3">/ Help make this real</div>
        <h2 class="display text-xl sm:text-2xl font-medium tracking-tighter mb-3">
          These are our estimate — no residents have reported {d.name} yet.
        </h2>
        <p class="text-sm text-ink-mute leading-relaxed max-w-[560px]">
          We seeded a starting guess so the page isn't blank, but it's only that — a guess. If you live (or have lived)
          at {d.name}, your 60-second report replaces our estimate with the real thing, and the next renter stops
          guessing like you had to.
        </p>
        <a
          href="#contribute"
          class="mt-6 inline-flex items-center gap-2 bg-marigold hover:bg-marigold-deep transition-colors text-parchment px-5 py-3 text-sm font-medium tracking-tight"
        >
          Submit rent for {d.name}
          <Arrow />
        </a>
      </div>
      <WaitlistBox slug={d.slug} name={d.name} />
    </div>
  </section>
);

const breadcrumbItems = (d: SocietyDetail): BreadcrumbItem[] => [
  { label: "All societies", href: "/societies" },
  { label: d.locality, href: "#" },
  { label: d.name },
];

// Share message for a society page. Leads with a concrete number when we have
// one (most shareable), falls back to a clean generic otherwise.
function detailShareText(d: SocietyDetail): string {
  if (isEstimate(d)) {
    return `Renting at ${d.name}, ${d.locality}? RentLens has an early estimate — help make it real by adding what you actually pay.`;
  }
  const m = d.medianRent3BHK ?? d.medianRent2BHK;
  const bhk = d.medianRent3BHK ? "3 BHK" : "2 BHK";
  if (m != null) {
    return `${bhk} at ${d.name}, ${d.locality} rents around ${formatINR(m)}/mo — real resident-reported numbers on RentLens, not asking prices.`;
  }
  return `Real resident-reported rent for ${d.name}, ${d.locality} on RentLens — what people actually pay, not asking prices.`;
}

function sparseShareText(soc: SocietyRecord): string {
  return `Know the rent at ${soc.name}, ${soc.locality}? RentLens is collecting real resident-reported numbers — add yours in 60 seconds.`;
}

export const Society: FC<{ detail: SocietyDetail }> = ({ detail }) => {
  const est = isEstimate(detail);
  return (
    <Layout meta={societyMeta(detail)}>
      <Header />
      <Breadcrumb items={breadcrumbItems(detail)} />
      <main>
        <HeroSection d={detail} />
        <SummarySection d={detail} />
        {est ? (
          // Seed/estimate societies: honest "be the first" block instead of the
          // fabricated breakdown / resident notes / ratings / nearby sections
          // (the nearby comparison data carries seeded report counts too).
          <EstimateNotice d={detail} />
        ) : (
          <>
            <FilterBar />
            <MainInsights d={detail} />
            <Qualitative d={detail} />
            <MovingIn d={detail} />
            <ConfidenceStrip d={detail} />
            <Nearby d={detail} />
          </>
        )}
        <ShareRow url={`${HOST}/societies/${detail.slug}`} text={detailShareText(detail)} />
        <ContributeCTA societyName={detail.name} />
      </main>
      <Footer />
    </Layout>
  );
};

export const SocietySparse: FC<{ soc: SocietyRecord }> = ({ soc }) => (
  <Layout meta={societySparseMeta(soc)}>
    <Header />
    <Breadcrumb
      items={[{ label: "All societies", href: "/societies" }, { label: soc.locality, href: "#" }, { label: soc.name }]}
    />
    <main>
      <section class="px-5 sm:px-8 py-16 sm:py-24 border-b border-hairline">
        <div class="max-w-narrow mx-auto">
          <div class="rise rise-1 flex flex-wrap items-center gap-2.5 mb-5">
            <span class="w-1.5 h-1.5 rounded-full bg-ink-faint" />
            <span class="eyebrow">Limited data · early signal</span>
            <ProvenanceBadge provenance={soc.provenance} />
          </div>
          <h1 class="rise rise-2 display text-[clamp(36px,6vw,72px)] leading-[1] font-normal mb-4">{soc.name}</h1>
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-ink-mute mb-6">
            <span>{soc.locality}, Bengaluru</span>
            {soc.builder ? (
              <>
                <span class="text-ink-faint">·</span>
                <span>{soc.builder}</span>
              </>
            ) : null}
          </div>
          {soc.description ? (
            <p class="text-base text-ink-mute mt-4 max-w-[640px] leading-relaxed">{soc.description}</p>
          ) : null}
          <div class="mt-10 bg-parchment-deep/40 border border-hairline border-dashed p-8">
            <div class="eyebrow mb-3">/ Reporting in progress</div>
            <h2 class="display text-xl sm:text-2xl font-medium mb-3">Not enough resident reports yet.</h2>
            <p class="text-sm text-ink-mute leading-relaxed max-w-[560px]">
              We need a few more datapoints before {soc.name} gets a full breakdown. If you live (or have lived) here,
              your 60-second report is what unlocks this page for the next renter.
            </p>
            <a
              href="#contribute"
              class="mt-6 inline-flex items-center gap-2 bg-marigold hover:bg-marigold-deep transition-colors text-parchment px-5 py-3 text-sm font-medium tracking-tight"
            >
              Submit rent for {soc.name}
              <Arrow />
            </a>
            <WaitlistBox slug={soc.slug} name={soc.name} />
          </div>
        </div>
      </section>
      <ShareRow
        url={`${HOST}/societies/${soc.slug}`}
        text={sparseShareText(soc)}
        label="/ Help spread the word"
      />
      <ContributeCTA societyName={soc.name} />
    </main>
    <Footer />
  </Layout>
);
