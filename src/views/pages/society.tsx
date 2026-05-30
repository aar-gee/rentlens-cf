import type { FC } from "hono/jsx";
import type { SocietyDetail, RentBreakdownRow } from "../../data/society-detail";
import type { Society as SocietyRecord } from "../../data/society";
import { Layout, type Meta } from "../layout";
import { Header } from "../components/header";
import { Footer } from "../components/footer";
import { Breadcrumb, type BreadcrumbItem } from "../components/breadcrumb";
import { ContributeCTA } from "../components/contribute-cta";
import { SummaryMetricCard, type SummaryMetricProps } from "../components/summary-metric-card";
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
import { relativeTime } from "../../lib/relative-time";

const HOST = "https://rentlens.fyi";

// schema.org Place payload — JSON.stringify gives correct escaping.
function societyJSONLD(d: SocietyDetail): string {
  return JSON.stringify({
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
  });
}

function societyMeta(d: SocietyDetail): Meta {
  return {
    title: `${d.name} — RentLens`,
    description: `Real rent, maintenance, and deposit data for ${d.name}, ${d.locality}. Reported by ${d.summaryTotal} residents.`,
    path: `/societies/${d.slug}`,
    ogType: "article",
    jsonLd: societyJSONLD(d),
  };
}

function societySparseMeta(soc: SocietyRecord): Meta {
  return {
    title: `${soc.name} — RentLens`,
    description: `Reporting in progress for ${soc.name}, ${soc.locality}. Contribute your rent to unlock the breakdown.`,
    path: `/societies/${soc.slug}`,
    ogType: "article",
  };
}

// ---- hero label helpers ----
function heroEyebrow(d: SocietyDetail): string {
  const id = d.id || d.slug;
  const when = d.lastUpdated ? relativeTime(d.lastUpdated) : "2h ago";
  return `Society · ${id} · last updated ${when}`;
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

const summaryStatsLine = (d: SocietyDetail) =>
  `${d.summaryTotal} reports · ${d.selfCount} self · ${d.partialCount} partial · ${d.verifiedCount} verified`;

function summary2BHK(d: SocietyDetail): SummaryMetricProps {
  const p: SummaryMetricProps = {
    eyebrow: "2 BHK · median",
    big: d.medianRent2BHK != null ? formatINR(d.medianRent2BHK) : "—",
    bigSuffix: "/mo",
    trend: d.trend2BHK,
    confidenceDot: "marigold",
    confidenceLabel: "Partially verified",
  };
  if (d.range2BHKLow != null && d.range2BHKHigh != null) {
    p.sub = `${formatINRRange(d.range2BHKLow, d.range2BHKHigh)} · ${reportsCountLabel(d.rentBreakdown, "2 BHK")}`;
  }
  return p;
}

function summary3BHK(d: SocietyDetail): SummaryMetricProps {
  const p: SummaryMetricProps = {
    eyebrow: "3 BHK · median",
    big: d.medianRent3BHK != null ? formatINR(d.medianRent3BHK) : "—",
    bigSuffix: "/mo",
    trend: d.trend3BHK,
    confidenceDot: "success",
    confidenceLabel: "Verified source",
  };
  if (d.range3BHKLow != null && d.range3BHKHigh != null) {
    p.sub = `${formatINRRange(d.range3BHKLow, d.range3BHKHigh)} · ${reportsCountLabel(d.rentBreakdown, "3 BHK")}`;
  }
  return p;
}

const summaryMaintenance = (d: SocietyDetail): SummaryMetricProps => ({
  eyebrow: "Maintenance · typical",
  big: formatINR(d.maintenanceTypical),
  bigSuffix: "/mo",
  sub: `${formatINR(d.maintenanceLow)} – ${formatINR(d.maintenanceHigh)} range`,
  trend: d.trendMaint,
  confidenceDot: "marigold",
  confidenceLabel: "Across all BHK",
});

const summaryDeposit = (d: SocietyDetail): SummaryMetricProps => ({
  eyebrow: "Deposit · typical",
  big: d.depositMonths,
  bigSuffix: " months",
  sub: d.depositSub,
  trend: null,
  confidenceDot: "ink-faint",
  confidenceLabel: "Self-reported",
});

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
          <div class="eyebrow mb-2">/ At a glance · last 12 months</div>
          <h2 class="display text-2xl sm:text-3xl font-medium tracking-tighter">What residents pay.</h2>
        </div>
        <span class="text-xs text-ink-faint num hidden sm:inline">{summaryStatsLine(d)}</span>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryMetricCard p={summary2BHK(d)} />
        <SummaryMetricCard p={summary3BHK(d)} />
        <SummaryMetricCard p={summaryMaintenance(d)} />
        <SummaryMetricCard p={summaryDeposit(d)} />
      </div>
      <div class="mt-5 flex flex-col sm:flex-row sm:items-center gap-3 bg-parchment-deep/40 border border-hairline p-5">
        <div class="flex items-center gap-3">
          <span class="num text-[10px] text-marigold-deep tracking-[0.14em] uppercase">Fig. 01</span>
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
        <MaintenanceCard d={d} />
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

const breadcrumbItems = (d: SocietyDetail): BreadcrumbItem[] => [
  { label: "All societies", href: "/" },
  { label: d.locality, href: "#" },
  { label: d.name },
];

export const Society: FC<{ detail: SocietyDetail }> = ({ detail }) => (
  <Layout meta={societyMeta(detail)}>
    <Header />
    <Breadcrumb items={breadcrumbItems(detail)} />
    <main>
      <HeroSection d={detail} />
      <SummarySection d={detail} />
      <FilterBar />
      <MainInsights d={detail} />
      <Qualitative d={detail} />
      <MovingIn d={detail} />
      <ConfidenceStrip d={detail} />
      <Nearby d={detail} />
      <ContributeCTA societyName={detail.name} />
    </main>
    <Footer figLabel="Fig. 02 — Society page" />
  </Layout>
);

export const SocietySparse: FC<{ soc: SocietyRecord }> = ({ soc }) => (
  <Layout meta={societySparseMeta(soc)}>
    <Header />
    <Breadcrumb
      items={[{ label: "All societies", href: "/" }, { label: soc.locality, href: "#" }, { label: soc.name }]}
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
          </div>
        </div>
      </section>
      <ContributeCTA societyName={soc.name} />
    </main>
    <Footer figLabel="Fig. 02 — Society page · sparse" />
  </Layout>
);
