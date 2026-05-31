// Rich detail data for /societies/{slug}. Direct port of the Go repo's
// society_detail.go — hand-curated MVP placeholder data (NOT DB-backed; real
// aggregation comes later). societyDetailBySlug returns the curated bundle or
// null; the route falls back to a sparse page (slug in catalog, no detail) or
// 404 (unknown slug).
//
// Base/headline fields (medians, ranges, provenance, locality, recency, counts)
// are overlaid from the live DB row via mergeSocietyIntoDetail — the curated
// bundle now only supplies the rich sections (breakdown, ratings, movers,
// nearby), which the view gates to resident-provenance societies.

import type { Society } from "./society";

export type TrendDelta = { pct?: number; stable?: boolean; window: string };
export type BHKMaint = { label: string; value: number };
export type RentBreakdownRow = {
  bhk: string;
  floorBand: string;
  median: number | null;
  rangeLow?: number | null;
  rangeHigh?: number | null;
  reports: number;
};
export type FurnishingPremium = {
  unfurnishedBase: number;
  semiFurnished: number;
  fullyFurnished: number;
  pairedReports: number;
};
export type LabeledValue = { label: string; value: string };
export type QualitativeRating = {
  label: string;
  descriptor: string;
  sampleSize: number;
  dotColor: string; // "success" | "marigold" | "ink-faint"
};
export type SourceChannelRow = {
  label: string;
  hint?: string;
  percent: number;
  count: number;
  barShade: string; // "marigold" | "marigold/70" | "marigold/50" | "marigold/30"
};
export type MoverRating = { name: string; rating: number; residents: number; recency: string };
export type NearbySociety = {
  slug: string;
  name: string;
  locality: string;
  medianRent2BHK: number | null;
  medianRent3BHK: number | null;
  reportCount: number | null;
  confidenceLabel: string;
  featuredBHK: string;
  distance: string;
  deltaPercent: number | null;
  deltaDirection: "" | "up" | "down";
  isLimitedData: boolean;
  hereRent: number;
};

export type SocietyDetail = {
  // Embedded base-society fields used by the detail page.
  id: string;
  slug: string;
  name: string;
  locality: string;
  builder: string;
  yearBuiltFrom: number | null;
  yearBuiltTo: number | null;
  totalUnits: number | null;
  description: string;
  medianRent2BHK: number | null;
  range2BHKLow: number | null;
  range2BHKHigh: number | null;
  medianRent3BHK: number | null;
  range3BHKLow: number | null;
  range3BHKHigh: number | null;
  reportCount: number | null;
  lastUpdated: string | null;
  confidenceLabel: string;
  featuredBHK: string;
  // Provenance — curated bundles are indicative seed data; omitted ⇒ "seed".
  provenance?: string;
  // Detail-specific fields.
  nearbyCount: number;
  trend2BHK: TrendDelta | null;
  trend3BHK: TrendDelta | null;
  trendMaint: TrendDelta | null;
  depositMonths: string;
  depositSub: string;
  totalOutflowEstimate: number;
  totalOutflowBHK: string;
  maintenanceTypical: number;
  maintenanceLow: number;
  maintenanceHigh: number;
  maintenanceByBHK: BHKMaint[];
  rentBreakdown: RentBreakdownRow[];
  furnishingPremium: FurnishingPremium;
  leaseNorms: LabeledValue[];
  valueForMoney: QualitativeRating;
  societyQuality: QualitativeRating;
  ownerExperience: QualitativeRating;
  notesSummary: string;
  notesSampleSize: number;
  sourceChannels: SourceChannelRow[];
  sourceTotal: number;
  sourceInsight: string;
  movers: MoverRating[];
  moversTotal: number;
  othersMentioned: number;
  nearbySocieties: NearbySociety[];
  oldestReport: string;
  latestReport: string;
  selfCount: number;
  partialCount: number;
  verifiedCount: number;
  summaryTotal: number;
};

// nb builds a NearbySociety with the common defaults (no embedded ID needed).
const nb = (n: Omit<NearbySociety, "isLimitedData" | "deltaDirection" | "deltaPercent"> &
  Partial<Pick<NearbySociety, "isLimitedData" | "deltaDirection" | "deltaPercent">>): NearbySociety => ({
  deltaPercent: null,
  deltaDirection: "",
  isLimitedData: false,
  ...n,
});

const prestigeShantiniketan = (): SocietyDetail => ({
  id: "prestige-shantiniketan",
  slug: "prestige-shantiniketan",
  name: "Prestige Shantiniketan",
  locality: "Whitefield",
  builder: "Prestige Group",
  yearBuiltFrom: 2009,
  yearBuiltTo: 2013,
  totalUnits: 3000,
  description:
    "Premium gated community on Whitefield Main Road. Mix of 2 / 3 / 4 BHK and villas across multiple towers. Strong professional tenant mix.",
  medianRent2BHK: 62000,
  range2BHKLow: 55000,
  range2BHKHigh: 72000,
  medianRent3BHK: 85000,
  range3BHKLow: 72000,
  range3BHKHigh: 105000,
  reportCount: 47,
  lastUpdated: null,
  confidenceLabel: "partially verified",
  featuredBHK: "2BHK",
  nearbyCount: 47,
  trend2BHK: { pct: 6, window: "vs prior 6 months" },
  trend3BHK: { pct: 4, window: "vs prior 6 months" },
  trendMaint: { stable: true, window: "vs prior 6 months" },
  depositMonths: "3–6",
  depositSub: "5-month modal, 10-month outliers",
  totalOutflowEstimate: 67200,
  totalOutflowBHK: "2 BHK",
  maintenanceTypical: 5200,
  maintenanceLow: 4800,
  maintenanceHigh: 6500,
  maintenanceByBHK: [
    { label: "2 BHK typical", value: 4800 },
    { label: "3 BHK typical", value: 5600 },
    { label: "3.5 / 4 BHK typical", value: 6500 },
  ],
  rentBreakdown: [
    { bhk: "2 BHK", floorBand: "1–3", median: 58000, rangeLow: 52000, rangeHigh: 68000, reports: 7 },
    { bhk: "2 BHK", floorBand: "4–7", median: 62000, rangeLow: 55000, rangeHigh: 72000, reports: 8 },
    { bhk: "2 BHK", floorBand: "8–12", median: 67000, rangeLow: 60000, rangeHigh: 78000, reports: 3 },
    { bhk: "2 BHK", floorBand: "21+", median: null, reports: 1 },
    { bhk: "3 BHK", floorBand: "1–3", median: 78000, rangeLow: 68000, rangeHigh: 88000, reports: 9 },
    { bhk: "3 BHK", floorBand: "4–7", median: 85000, rangeLow: 74000, rangeHigh: 98000, reports: 11 },
    { bhk: "3 BHK", floorBand: "8–12", median: 95000, rangeLow: 82000, rangeHigh: 105000, reports: 7 },
  ],
  furnishingPremium: { unfurnishedBase: 62000, semiFurnished: 3500, fullyFurnished: 7200, pairedReports: 7 },
  leaseNorms: [
    { label: "Deposit (most common)", value: "5 months" },
    { label: "Notice period", value: "2 months" },
    { label: "Annual rent hike", value: "5–10%" },
    { label: "Broker fee (when used)", value: "1 month rent" },
  ],
  valueForMoney: {
    label: "Mostly good",
    descriptor: "14 of 18 residents say the rent matches the value. The 4 dissenters call out maintenance creep.",
    sampleSize: 18,
    dotColor: "success",
  },
  societyQuality: {
    label: "Mixed",
    descriptor:
      "Common areas and gym praised consistently. Water management during summer and parking allocation are recurring complaints.",
    sampleSize: 22,
    dotColor: "marigold",
  },
  ownerExperience: {
    label: "Mostly fair",
    descriptor:
      "Deposit returns generally handled within a month. A few isolated reports of unilateral rent hikes mid-lease.",
    sampleSize: 16,
    dotColor: "marigold",
  },
  notesSummary:
    "Residents commonly mention <emph>water cuts</emph> during March–May (12 reports), tight <emph>parking allocation</emph> for second cars (8 reports), and well-maintained <emph>common areas + gym</emph> (15 reports).",
  notesSampleSize: 28,
  sourceChannels: [
    { label: "Society WhatsApp group", hint: "(internal transfer)", percent: 38, count: 14, barShade: "marigold" },
    { label: "Through friends / family", percent: 24, count: 9, barShade: "marigold/70" },
    { label: "Broker", percent: 22, count: 8, barShade: "marigold/50" },
    { label: "App", hint: "(NoBroker, MagicBricks, 99acres)", percent: 16, count: 6, barShade: "marigold/30" },
  ],
  sourceTotal: 38,
  sourceInsight:
    "<accent>62%</accent> of leases close through internal networks — listings move through residents before they ever reach a portal. Society residents' WhatsApp groups don't admit outsiders, so the next-best move is asking a verified resident here to flag a listing when one comes up.",
  movers: [
    { name: "Agarwal Packers", rating: 4.2, residents: 8, recency: "last 12 mo" },
    { name: "Leo Packers & Movers", rating: 4.8, residents: 5, recency: "last 12 mo" },
    { name: "Pikkol", rating: 3.4, residents: 4, recency: "last 12 mo" },
    { name: "ShiftKaro", rating: 4.1, residents: 3, recency: "last 12 mo" },
  ],
  moversTotal: 22,
  othersMentioned: 6,
  nearbySocieties: [
    nb({ slug: "brigade-cosmopolis", name: "Brigade Cosmopolis", locality: "Whitefield", medianRent2BHK: null, medianRent3BHK: 85000, reportCount: 27, confidenceLabel: "partially verified", featuredBHK: "3BHK", distance: "1.2 km", deltaPercent: 0, deltaDirection: "", hereRent: 85000 }),
    nb({ slug: "sobha-dream-acres", name: "Sobha Dream Acres", locality: "Panathur", medianRent2BHK: null, medianRent3BHK: 72000, reportCount: 31, confidenceLabel: "verified source", featuredBHK: "3BHK", distance: "2.8 km", deltaPercent: -15, deltaDirection: "down", hereRent: 85000 }),
    nb({ slug: "adarsh-palm-retreat", name: "Adarsh Palm Retreat", locality: "Bellandur", medianRent2BHK: null, medianRent3BHK: 95000, reportCount: 31, confidenceLabel: "partially verified", featuredBHK: "3BHK", distance: "4.5 km", deltaPercent: 12, deltaDirection: "up", hereRent: 85000 }),
    nb({ slug: "mantri-espana", name: "Mantri Espana", locality: "Bellandur", medianRent2BHK: null, medianRent3BHK: 78000, reportCount: 4, confidenceLabel: "limited data", featuredBHK: "3BHK", distance: "3.2 km", isLimitedData: true, hereRent: 85000 }),
  ],
  oldestReport: "Mar 2025",
  latestReport: "May 2026",
  selfCount: 32,
  partialCount: 12,
  verifiedCount: 3,
  summaryTotal: 47,
});

const sobhaDreamAcres = (): SocietyDetail => ({
  id: "sobha-dream-acres",
  slug: "sobha-dream-acres",
  name: "Sobha Dream Acres",
  locality: "Panathur",
  builder: "Sobha",
  yearBuiltFrom: 2017,
  yearBuiltTo: 2019,
  totalUnits: 3500,
  description:
    "Large gated development in the Panathur belt with rolling green spaces, multiple clubhouses, and a younger resident mix.",
  medianRent2BHK: 38000,
  range2BHKLow: 32000,
  range2BHKHigh: 45000,
  medianRent3BHK: 55000,
  range3BHKLow: 48000,
  range3BHKHigh: 65000,
  reportCount: 42,
  lastUpdated: null,
  confidenceLabel: "verified source",
  featuredBHK: "2BHK",
  nearbyCount: 42,
  trend2BHK: { pct: 3, window: "vs prior 6 months" },
  trend3BHK: { pct: 5, window: "vs prior 6 months" },
  trendMaint: { stable: true, window: "vs prior 6 months" },
  depositMonths: "3–5",
  depositSub: "4-month modal, 6-month outliers",
  totalOutflowEstimate: 42000,
  totalOutflowBHK: "2 BHK",
  maintenanceTypical: 4000,
  maintenanceLow: 3500,
  maintenanceHigh: 4800,
  maintenanceByBHK: [
    { label: "2 BHK typical", value: 3500 },
    { label: "3 BHK typical", value: 4200 },
    { label: "3.5 BHK typical", value: 4800 },
  ],
  rentBreakdown: [
    { bhk: "2 BHK", floorBand: "1–3", median: 35000, rangeLow: 30000, rangeHigh: 40000, reports: 6 },
    { bhk: "2 BHK", floorBand: "4–7", median: 38000, rangeLow: 32000, rangeHigh: 44000, reports: 9 },
    { bhk: "2 BHK", floorBand: "8–12", median: 42000, rangeLow: 36000, rangeHigh: 48000, reports: 5 },
    { bhk: "2 BHK", floorBand: "21+", median: null, reports: 0 },
    { bhk: "3 BHK", floorBand: "1–3", median: 52000, rangeLow: 46000, rangeHigh: 58000, reports: 8 },
    { bhk: "3 BHK", floorBand: "4–7", median: 55000, rangeLow: 48000, rangeHigh: 62000, reports: 10 },
    { bhk: "3 BHK", floorBand: "8–12", median: 60000, rangeLow: 54000, rangeHigh: 68000, reports: 4 },
  ],
  furnishingPremium: { unfurnishedBase: 38000, semiFurnished: 2500, fullyFurnished: 5500, pairedReports: 9 },
  leaseNorms: [
    { label: "Deposit (most common)", value: "4 months" },
    { label: "Notice period", value: "2 months" },
    { label: "Annual rent hike", value: "5–8%" },
    { label: "Broker fee (when used)", value: "1 month rent" },
  ],
  valueForMoney: {
    label: "Mostly good",
    descriptor:
      "21 of 24 residents call out strong value relative to rent. Newer construction and active management cited frequently.",
    sampleSize: 24,
    dotColor: "success",
  },
  societyQuality: {
    label: "Mostly good",
    descriptor: "Clubhouses and pools are popular. Some complaints about peak-hour lift waits in taller towers.",
    sampleSize: 26,
    dotColor: "success",
  },
  ownerExperience: {
    label: "Mixed",
    descriptor: "Most owners are responsive. A handful of residents flagged delays on minor-repair reimbursements.",
    sampleSize: 19,
    dotColor: "marigold",
  },
  notesSummary:
    "Residents commonly mention <emph>active clubhouses</emph> (18 reports), occasional <emph>lift congestion</emph> at peak hours (9 reports), and a strong <emph>young-family mix</emph> (14 reports).",
  notesSampleSize: 31,
  sourceChannels: [
    { label: "Society WhatsApp group", hint: "(internal transfer)", percent: 30, count: 11, barShade: "marigold" },
    { label: "Broker", percent: 28, count: 10, barShade: "marigold/70" },
    { label: "App", hint: "(NoBroker, MagicBricks, 99acres)", percent: 24, count: 9, barShade: "marigold/50" },
    { label: "Through friends / family", percent: 18, count: 6, barShade: "marigold/30" },
  ],
  sourceTotal: 36,
  sourceInsight:
    "<accent>48%</accent> of leases close through internal networks or word-of-mouth. The broker share here is higher than at older premium societies — newer construction means more turnover and more agent-listed inventory.",
  movers: [
    { name: "Writer Relocations", rating: 4.6, residents: 7, recency: "last 12 mo" },
    { name: "Agarwal Packers", rating: 4.0, residents: 6, recency: "last 12 mo" },
    { name: "Pikkol", rating: 4.4, residents: 4, recency: "last 12 mo" },
    { name: "PackUp", rating: 3.7, residents: 3, recency: "last 12 mo" },
  ],
  moversTotal: 20,
  othersMentioned: 5,
  nearbySocieties: [
    nb({ slug: "prestige-shantiniketan", name: "Prestige Shantiniketan", locality: "Whitefield", medianRent2BHK: null, medianRent3BHK: 85000, reportCount: 47, confidenceLabel: "partially verified", featuredBHK: "3BHK", distance: "2.8 km", deltaPercent: 55, deltaDirection: "up", hereRent: 55000 }),
    nb({ slug: "adarsh-palm-retreat", name: "Adarsh Palm Retreat", locality: "Bellandur", medianRent2BHK: null, medianRent3BHK: 95000, reportCount: 31, confidenceLabel: "partially verified", featuredBHK: "3BHK", distance: "3.6 km", deltaPercent: 73, deltaDirection: "up", hereRent: 55000 }),
    nb({ slug: "embassy-pristine", name: "Embassy Pristine", locality: "Sarjapur Road", medianRent2BHK: null, medianRent3BHK: 75000, reportCount: 22, confidenceLabel: "partially verified", featuredBHK: "2BHK", distance: "5.0 km", deltaPercent: 36, deltaDirection: "up", hereRent: 55000 }),
  ],
  oldestReport: "Apr 2025",
  latestReport: "May 2026",
  selfCount: 21,
  partialCount: 14,
  verifiedCount: 7,
  summaryTotal: 42,
});

const brigadeCosmopolis = (): SocietyDetail => ({
  id: "brigade-cosmopolis",
  slug: "brigade-cosmopolis",
  name: "Brigade Cosmopolis",
  locality: "Whitefield",
  builder: "Brigade Group",
  yearBuiltFrom: 2014,
  yearBuiltTo: 2014,
  totalUnits: 600,
  description:
    "Mixed-use community with residential towers stacked above retail and office blocks. Compact footprint, strong walkability.",
  medianRent2BHK: 58000,
  range2BHKLow: 50000,
  range2BHKHigh: 68000,
  medianRent3BHK: 85000,
  range3BHKLow: 72000,
  range3BHKHigh: 105000,
  reportCount: 27,
  lastUpdated: null,
  confidenceLabel: "partially verified",
  featuredBHK: "3BHK",
  nearbyCount: 27,
  trend2BHK: { pct: 4, window: "vs prior 6 months" },
  trend3BHK: { pct: -2, window: "vs prior 6 months" },
  trendMaint: { stable: true, window: "vs prior 6 months" },
  depositMonths: "4–6",
  depositSub: "5-month modal, occasional 8-month",
  totalOutflowEstimate: 91500,
  totalOutflowBHK: "3 BHK",
  maintenanceTypical: 6500,
  maintenanceLow: 5800,
  maintenanceHigh: 7800,
  maintenanceByBHK: [
    { label: "2 BHK typical", value: 5800 },
    { label: "3 BHK typical", value: 6500 },
    { label: "3.5 BHK typical", value: 7800 },
  ],
  rentBreakdown: [
    { bhk: "2 BHK", floorBand: "1–3", median: 54000, rangeLow: 48000, rangeHigh: 62000, reports: 4 },
    { bhk: "2 BHK", floorBand: "4–7", median: 58000, rangeLow: 50000, rangeHigh: 68000, reports: 5 },
    { bhk: "2 BHK", floorBand: "8–12", median: 62000, rangeLow: 54000, rangeHigh: 72000, reports: 3 },
    { bhk: "2 BHK", floorBand: "21+", median: null, reports: 0 },
    { bhk: "3 BHK", floorBand: "1–3", median: 78000, rangeLow: 70000, rangeHigh: 86000, reports: 5 },
    { bhk: "3 BHK", floorBand: "4–7", median: 85000, rangeLow: 74000, rangeHigh: 98000, reports: 6 },
    { bhk: "3 BHK", floorBand: "8–12", median: 96000, rangeLow: 84000, rangeHigh: 105000, reports: 4 },
  ],
  furnishingPremium: { unfurnishedBase: 85000, semiFurnished: 4200, fullyFurnished: 8500, pairedReports: 5 },
  leaseNorms: [
    { label: "Deposit (most common)", value: "5 months" },
    { label: "Notice period", value: "3 months" },
    { label: "Annual rent hike", value: "6–10%" },
    { label: "Broker fee (when used)", value: "1 month rent" },
  ],
  valueForMoney: {
    label: "Mixed",
    descriptor:
      "9 of 14 residents flag the live-work-eat footprint as worth the premium. 5 call out higher-than-expected maintenance.",
    sampleSize: 14,
    dotColor: "marigold",
  },
  societyQuality: {
    label: "Mostly good",
    descriptor:
      "Strong retail mix and gym praised. Some traffic-congestion complaints during office hours due to the mixed-use entrance.",
    sampleSize: 16,
    dotColor: "success",
  },
  ownerExperience: {
    label: "Mostly fair",
    descriptor: "Larger institutional owners here — paperwork tends to be cleaner than at older comparables.",
    sampleSize: 11,
    dotColor: "marigold",
  },
  notesSummary:
    "Residents commonly mention <emph>walkable retail</emph> on-site (11 reports), <emph>peak-hour traffic</emph> at the shared entrance (7 reports), and <emph>institutional owners</emph> making leases predictable (6 reports).",
  notesSampleSize: 19,
  sourceChannels: [
    { label: "Broker", percent: 36, count: 8, barShade: "marigold" },
    { label: "Society WhatsApp group", hint: "(internal transfer)", percent: 27, count: 6, barShade: "marigold/70" },
    { label: "App", hint: "(NoBroker, MagicBricks)", percent: 23, count: 5, barShade: "marigold/50" },
    { label: "Through friends / family", percent: 14, count: 3, barShade: "marigold/30" },
  ],
  sourceTotal: 22,
  sourceInsight:
    "<accent>41%</accent> of leases close through internal or social networks — lower than older premium clusters because the smaller unit count means less internal turnover.",
  movers: [
    { name: "Leo Packers & Movers", rating: 4.5, residents: 5, recency: "last 12 mo" },
    { name: "Agarwal Packers", rating: 4.0, residents: 4, recency: "last 12 mo" },
    { name: "Writer Relocations", rating: 4.3, residents: 3, recency: "last 12 mo" },
  ],
  moversTotal: 14,
  othersMentioned: 4,
  nearbySocieties: [
    nb({ slug: "prestige-shantiniketan", name: "Prestige Shantiniketan", locality: "Whitefield", medianRent2BHK: null, medianRent3BHK: 85000, reportCount: 47, confidenceLabel: "partially verified", featuredBHK: "3BHK", distance: "1.2 km", deltaPercent: 0, deltaDirection: "", hereRent: 85000 }),
    nb({ slug: "adarsh-palm-retreat", name: "Adarsh Palm Retreat", locality: "Bellandur", medianRent2BHK: null, medianRent3BHK: 95000, reportCount: 31, confidenceLabel: "partially verified", featuredBHK: "3BHK", distance: "5.4 km", deltaPercent: 12, deltaDirection: "up", hereRent: 85000 }),
    nb({ slug: "sobha-dream-acres", name: "Sobha Dream Acres", locality: "Panathur", medianRent2BHK: null, medianRent3BHK: 55000, reportCount: 42, confidenceLabel: "verified source", featuredBHK: "3BHK", distance: "3.6 km", deltaPercent: -35, deltaDirection: "down", hereRent: 85000 }),
  ],
  oldestReport: "Jun 2025",
  latestReport: "May 2026",
  selfCount: 17,
  partialCount: 8,
  verifiedCount: 2,
  summaryTotal: 27,
});

const adarshPalmRetreat = (): SocietyDetail => ({
  id: "adarsh-palm-retreat",
  slug: "adarsh-palm-retreat",
  name: "Adarsh Palm Retreat",
  locality: "Bellandur",
  builder: "Adarsh Developers",
  yearBuiltFrom: 2010,
  yearBuiltTo: 2010,
  totalUnits: 1200,
  description:
    "Sprawling low-rise community wrapped around landscaped greens off Outer Ring Road. Long-tenure resident mix and a strong walking-trail culture.",
  medianRent2BHK: 65000,
  range2BHKLow: 55000,
  range2BHKHigh: 78000,
  medianRent3BHK: 95000,
  range3BHKLow: 80000,
  range3BHKHigh: 120000,
  reportCount: 31,
  lastUpdated: null,
  confidenceLabel: "partially verified",
  featuredBHK: "3BHK",
  nearbyCount: 31,
  trend2BHK: { pct: 7, window: "vs prior 6 months" },
  trend3BHK: { pct: 5, window: "vs prior 6 months" },
  trendMaint: { pct: 3, window: "vs prior 6 months" },
  depositMonths: "5–10",
  depositSub: "6-month modal, 10-month outliers on villas",
  totalOutflowEstimate: 102000,
  totalOutflowBHK: "3 BHK",
  maintenanceTypical: 7000,
  maintenanceLow: 6000,
  maintenanceHigh: 8500,
  maintenanceByBHK: [
    { label: "2 BHK typical", value: 6000 },
    { label: "3 BHK typical", value: 7000 },
    { label: "3.5 / 4 BHK typical", value: 8500 },
  ],
  rentBreakdown: [
    { bhk: "2 BHK", floorBand: "1–3", median: 62000, rangeLow: 55000, rangeHigh: 72000, reports: 5 },
    { bhk: "2 BHK", floorBand: "4–7", median: 66000, rangeLow: 58000, rangeHigh: 78000, reports: 4 },
    { bhk: "3 BHK", floorBand: "1–3", median: 88000, rangeLow: 78000, rangeHigh: 98000, reports: 7 },
    { bhk: "3 BHK", floorBand: "4–7", median: 95000, rangeLow: 82000, rangeHigh: 110000, reports: 9 },
    { bhk: "3 BHK", floorBand: "8–12", median: 108000, rangeLow: 92000, rangeHigh: 120000, reports: 4 },
    { bhk: "3.5 BHK", floorBand: "1–3", median: 115000, rangeLow: 98000, rangeHigh: 135000, reports: 2 },
  ],
  furnishingPremium: { unfurnishedBase: 95000, semiFurnished: 3800, fullyFurnished: 8500, pairedReports: 6 },
  leaseNorms: [
    { label: "Deposit (most common)", value: "6 months" },
    { label: "Notice period", value: "2 months" },
    { label: "Annual rent hike", value: "5–10%" },
    { label: "Broker fee (when used)", value: "1 month rent" },
  ],
  valueForMoney: {
    label: "Mixed",
    descriptor:
      "10 of 17 residents feel the rent is fair for the scale of greens and amenities. The others call out maintenance creeping past ₹8k for larger units.",
    sampleSize: 17,
    dotColor: "marigold",
  },
  societyQuality: {
    label: "Mostly good",
    descriptor:
      "Mature landscaping, jogging trails and the clubhouse pool are consistently praised. Some recent complaints about gym equipment ageing.",
    sampleSize: 21,
    dotColor: "success",
  },
  ownerExperience: {
    label: "Mostly fair",
    descriptor:
      "Long-tenure owners; many handle renewals informally. Deposit returns generally clean. A few isolated reports of high mid-lease hike asks.",
    sampleSize: 14,
    dotColor: "marigold",
  },
  notesSummary:
    "Residents commonly mention <emph>mature greens and walking trails</emph> (13 reports), <emph>maintenance creep</emph> on larger units (8 reports), and a strong <emph>long-tenure community</emph> with low resident churn (10 reports).",
  notesSampleSize: 24,
  sourceChannels: [
    { label: "Society WhatsApp group", hint: "(internal transfer)", percent: 42, count: 11, barShade: "marigold" },
    { label: "Through friends / family", percent: 27, count: 7, barShade: "marigold/70" },
    { label: "Broker", percent: 19, count: 5, barShade: "marigold/50" },
    { label: "App", hint: "(NoBroker, MagicBricks)", percent: 12, count: 3, barShade: "marigold/30" },
  ],
  sourceTotal: 26,
  sourceInsight:
    "<accent>69%</accent> of leases close through internal networks or word-of-mouth. The low-rise layout and tight-knit community mean most listings never reach portals — residents place them with friends or colleagues first.",
  movers: [
    { name: "Agarwal Packers", rating: 4.3, residents: 6, recency: "last 12 mo" },
    { name: "Writer Relocations", rating: 4.6, residents: 4, recency: "last 12 mo" },
    { name: "Leo Packers & Movers", rating: 4.1, residents: 4, recency: "last 12 mo" },
    { name: "Maruti Packers", rating: 3.6, residents: 2, recency: "last 12 mo" },
  ],
  moversTotal: 16,
  othersMentioned: 5,
  nearbySocieties: [
    nb({ slug: "prestige-shantiniketan", name: "Prestige Shantiniketan", locality: "Whitefield", medianRent2BHK: null, medianRent3BHK: 85000, reportCount: 47, confidenceLabel: "partially verified", featuredBHK: "3BHK", distance: "4.5 km", deltaPercent: -11, deltaDirection: "down", hereRent: 95000 }),
    nb({ slug: "brigade-cosmopolis", name: "Brigade Cosmopolis", locality: "Whitefield", medianRent2BHK: null, medianRent3BHK: 85000, reportCount: 27, confidenceLabel: "partially verified", featuredBHK: "3BHK", distance: "5.4 km", deltaPercent: -11, deltaDirection: "down", hereRent: 95000 }),
    nb({ slug: "sobha-dream-acres", name: "Sobha Dream Acres", locality: "Panathur", medianRent2BHK: null, medianRent3BHK: 55000, reportCount: 42, confidenceLabel: "verified source", featuredBHK: "3BHK", distance: "3.6 km", deltaPercent: -42, deltaDirection: "down", hereRent: 95000 }),
    nb({ slug: "mantri-espana", name: "Mantri Espana", locality: "Bellandur", medianRent2BHK: null, medianRent3BHK: 78000, reportCount: 4, confidenceLabel: "limited data", featuredBHK: "3BHK", distance: "1.4 km", isLimitedData: true, hereRent: 95000 }),
  ],
  oldestReport: "Feb 2025",
  latestReport: "May 2026",
  selfCount: 19,
  partialCount: 10,
  verifiedCount: 2,
  summaryTotal: 31,
});

const prestigeLakesideHabitat = (): SocietyDetail => ({
  id: "prestige-lakeside-habitat",
  slug: "prestige-lakeside-habitat",
  name: "Prestige Lakeside Habitat",
  locality: "Varthur",
  builder: "Prestige Group",
  yearBuiltFrom: 2014,
  yearBuiltTo: 2018,
  totalUnits: 3426,
  description:
    "Disney-themed Prestige township along Varthur Lake with 2 / 3 / 4 BHK apartments and villas. One of the largest premium gated communities on the eastern belt.",
  medianRent2BHK: 55000,
  range2BHKLow: 48000,
  range2BHKHigh: 65000,
  medianRent3BHK: 82000,
  range3BHKLow: 70000,
  range3BHKHigh: 98000,
  reportCount: 38,
  lastUpdated: null,
  confidenceLabel: "verified source",
  featuredBHK: "3BHK",
  nearbyCount: 38,
  trend2BHK: { pct: 5, window: "vs prior 6 months" },
  trend3BHK: { pct: 4, window: "vs prior 6 months" },
  trendMaint: { stable: true, window: "vs prior 6 months" },
  depositMonths: "4–6",
  depositSub: "5-month modal, 8-month outliers",
  totalOutflowEstimate: 87800,
  totalOutflowBHK: "3 BHK",
  maintenanceTypical: 5800,
  maintenanceLow: 5000,
  maintenanceHigh: 7200,
  maintenanceByBHK: [
    { label: "2 BHK typical", value: 5000 },
    { label: "3 BHK typical", value: 5800 },
    { label: "3.5 / 4 BHK typical", value: 7200 },
  ],
  rentBreakdown: [
    { bhk: "2 BHK", floorBand: "1–3", median: 52000, rangeLow: 46000, rangeHigh: 58000, reports: 5 },
    { bhk: "2 BHK", floorBand: "4–7", median: 55000, rangeLow: 48000, rangeHigh: 62000, reports: 7 },
    { bhk: "2 BHK", floorBand: "8–12", median: 60000, rangeLow: 52000, rangeHigh: 68000, reports: 4 },
    { bhk: "3 BHK", floorBand: "1–3", median: 76000, rangeLow: 68000, rangeHigh: 86000, reports: 6 },
    { bhk: "3 BHK", floorBand: "4–7", median: 82000, rangeLow: 72000, rangeHigh: 94000, reports: 8 },
    { bhk: "3 BHK", floorBand: "8–12", median: 90000, rangeLow: 80000, rangeHigh: 100000, reports: 5 },
    { bhk: "3 BHK", floorBand: "21+", median: 95000, rangeLow: 85000, rangeHigh: 105000, reports: 3 },
  ],
  furnishingPremium: { unfurnishedBase: 82000, semiFurnished: 3200, fullyFurnished: 7500, pairedReports: 9 },
  leaseNorms: [
    { label: "Deposit (most common)", value: "5 months" },
    { label: "Notice period", value: "2 months" },
    { label: "Annual rent hike", value: "5–8%" },
    { label: "Broker fee (when used)", value: "1 month rent" },
  ],
  valueForMoney: {
    label: "Mostly good",
    descriptor:
      "19 of 23 residents say the lake-facing premium and amenity depth justify the rent. The dissent is mostly about traffic on Varthur Main Road, not the society itself.",
    sampleSize: 23,
    dotColor: "success",
  },
  societyQuality: {
    label: "Mostly good",
    descriptor:
      "Multiple clubhouses, large pool, and themed gardens are repeat highlights. Lake-facing towers occasionally report mosquito issues post-monsoon.",
    sampleSize: 27,
    dotColor: "success",
  },
  ownerExperience: {
    label: "Mostly fair",
    descriptor:
      "Mix of investor and self-occupied owners. Investor units sometimes change hands mid-lease; deposit returns mostly clean.",
    sampleSize: 18,
    dotColor: "success",
  },
  notesSummary:
    "Residents commonly mention <emph>lake-facing views</emph> from the eastern towers (15 reports), <emph>traffic exits onto Varthur Road</emph> at peak hours (11 reports), and <emph>multiple clubhouses</emph> reducing booking congestion (12 reports).",
  notesSampleSize: 33,
  sourceChannels: [
    { label: "Society WhatsApp group", hint: "(internal transfer)", percent: 34, count: 11, barShade: "marigold" },
    { label: "Broker", percent: 27, count: 9, barShade: "marigold/70" },
    { label: "Through friends / family", percent: 22, count: 7, barShade: "marigold/50" },
    { label: "App", hint: "(NoBroker, MagicBricks, 99acres)", percent: 17, count: 5, barShade: "marigold/30" },
  ],
  sourceTotal: 32,
  sourceInsight:
    "<accent>56%</accent> of leases close through internal networks or word-of-mouth. The large unit count creates steady turnover — there's more broker-listed inventory here than at smaller premium communities, but tower-specific WhatsApp groups still move the best units first.",
  movers: [
    { name: "Agarwal Packers", rating: 4.3, residents: 7, recency: "last 12 mo" },
    { name: "Writer Relocations", rating: 4.7, residents: 5, recency: "last 12 mo" },
    { name: "Leo Packers & Movers", rating: 4.4, residents: 4, recency: "last 12 mo" },
    { name: "Pikkol", rating: 4.0, residents: 3, recency: "last 12 mo" },
  ],
  moversTotal: 19,
  othersMentioned: 6,
  nearbySocieties: [
    nb({ slug: "prestige-shantiniketan", name: "Prestige Shantiniketan", locality: "Whitefield", medianRent2BHK: null, medianRent3BHK: 85000, reportCount: 47, confidenceLabel: "partially verified", featuredBHK: "3BHK", distance: "3.4 km", deltaPercent: 4, deltaDirection: "up", hereRent: 82000 }),
    nb({ slug: "sobha-dream-acres", name: "Sobha Dream Acres", locality: "Panathur", medianRent2BHK: null, medianRent3BHK: 55000, reportCount: 42, confidenceLabel: "verified source", featuredBHK: "3BHK", distance: "4.2 km", deltaPercent: -33, deltaDirection: "down", hereRent: 82000 }),
    nb({ slug: "adarsh-palm-retreat", name: "Adarsh Palm Retreat", locality: "Bellandur", medianRent2BHK: null, medianRent3BHK: 95000, reportCount: 31, confidenceLabel: "partially verified", featuredBHK: "3BHK", distance: "4.0 km", deltaPercent: 16, deltaDirection: "up", hereRent: 82000 }),
  ],
  oldestReport: "Jan 2025",
  latestReport: "May 2026",
  selfCount: 18,
  partialCount: 12,
  verifiedCount: 8,
  summaryTotal: 38,
});

const sobhaCity = (): SocietyDetail => ({
  id: "sobha-city",
  slug: "sobha-city",
  name: "Sobha City",
  locality: "Thanisandra",
  builder: "Sobha",
  yearBuiltFrom: 2014,
  yearBuiltTo: 2017,
  totalUnits: 1500,
  description:
    "Large Sobha township off Thanisandra Main Road with multiple high-rise towers, themed gardens, and a central clubhouse complex.",
  medianRent2BHK: 55000,
  range2BHKLow: 48000,
  range2BHKHigh: 66000,
  medianRent3BHK: 82000,
  range3BHKLow: 70000,
  range3BHKHigh: 98000,
  reportCount: 26,
  lastUpdated: null,
  confidenceLabel: "partially verified",
  featuredBHK: "3BHK",
  nearbyCount: 26,
  trend2BHK: { pct: 6, window: "vs prior 6 months" },
  trend3BHK: { pct: 5, window: "vs prior 6 months" },
  trendMaint: { pct: 2, window: "vs prior 6 months" },
  depositMonths: "4–6",
  depositSub: "5-month modal, occasional 6-month",
  totalOutflowEstimate: 87800,
  totalOutflowBHK: "3 BHK",
  maintenanceTypical: 5800,
  maintenanceLow: 5000,
  maintenanceHigh: 7000,
  maintenanceByBHK: [
    { label: "2 BHK typical", value: 5000 },
    { label: "3 BHK typical", value: 5800 },
    { label: "3.5 BHK typical", value: 7000 },
  ],
  rentBreakdown: [
    { bhk: "2 BHK", floorBand: "1–3", median: 52000, rangeLow: 46000, rangeHigh: 58000, reports: 3 },
    { bhk: "2 BHK", floorBand: "4–7", median: 55000, rangeLow: 48000, rangeHigh: 64000, reports: 5 },
    { bhk: "2 BHK", floorBand: "8–12", median: 60000, rangeLow: 52000, rangeHigh: 68000, reports: 3 },
    { bhk: "3 BHK", floorBand: "1–3", median: 76000, rangeLow: 68000, rangeHigh: 85000, reports: 4 },
    { bhk: "3 BHK", floorBand: "4–7", median: 82000, rangeLow: 72000, rangeHigh: 92000, reports: 6 },
    { bhk: "3 BHK", floorBand: "8–12", median: 90000, rangeLow: 80000, rangeHigh: 100000, reports: 4 },
    { bhk: "3 BHK", floorBand: "21+", median: null, reports: 1 },
  ],
  furnishingPremium: { unfurnishedBase: 82000, semiFurnished: 3000, fullyFurnished: 6800, pairedReports: 6 },
  leaseNorms: [
    { label: "Deposit (most common)", value: "5 months" },
    { label: "Notice period", value: "2 months" },
    { label: "Annual rent hike", value: "5–9%" },
    { label: "Broker fee (when used)", value: "1 month rent" },
  ],
  valueForMoney: {
    label: "Mostly good",
    descriptor:
      "13 of 17 residents call out solid value for a North-Bengaluru premium address. Airport-side commuters especially happy.",
    sampleSize: 17,
    dotColor: "success",
  },
  societyQuality: {
    label: "Mostly good",
    descriptor:
      "Themed gardens and clubhouse popular. A few residents flag construction noise from the still-completing later phases.",
    sampleSize: 19,
    dotColor: "success",
  },
  ownerExperience: {
    label: "Mixed",
    descriptor:
      "Mostly first-generation owners renting out. Renewal hike requests sometimes aggressive — a few residents reported double-digit asks.",
    sampleSize: 13,
    dotColor: "marigold",
  },
  notesSummary:
    "Residents commonly mention <emph>airport-side accessibility</emph> (10 reports), <emph>themed gardens and clubhouse</emph> (12 reports), and <emph>occasional construction noise</emph> from neighbouring phases (6 reports).",
  notesSampleSize: 22,
  sourceChannels: [
    { label: "Broker", percent: 34, count: 7, barShade: "marigold" },
    { label: "Society WhatsApp group", hint: "(internal transfer)", percent: 28, count: 6, barShade: "marigold/70" },
    { label: "App", hint: "(NoBroker, MagicBricks)", percent: 24, count: 5, barShade: "marigold/50" },
    { label: "Through friends / family", percent: 14, count: 3, barShade: "marigold/30" },
  ],
  sourceTotal: 21,
  sourceInsight:
    "<accent>42%</accent> of leases close through internal or social networks. The broker and app share is higher than at older established societies because the township is still adding inventory — fewer long-tenure residents seeding referrals.",
  movers: [
    { name: "Agarwal Packers", rating: 4.2, residents: 5, recency: "last 12 mo" },
    { name: "Pikkol", rating: 4.3, residents: 4, recency: "last 12 mo" },
    { name: "ShiftKaro", rating: 3.9, residents: 3, recency: "last 12 mo" },
    { name: "Hari Packers", rating: 3.6, residents: 2, recency: "last 12 mo" },
  ],
  moversTotal: 14,
  othersMentioned: 4,
  nearbySocieties: [
    nb({ slug: "prestige-misty-waters", name: "Prestige Misty Waters", locality: "Thanisandra", medianRent2BHK: null, medianRent3BHK: 85000, reportCount: 20, confidenceLabel: "verified source", featuredBHK: "2BHK", distance: "1.8 km", deltaPercent: 4, deltaDirection: "up", hereRent: 82000 }),
    nb({ slug: "mantri-lithos", name: "Mantri Lithos", locality: "Thanisandra", medianRent2BHK: null, medianRent3BHK: null, reportCount: 3, confidenceLabel: "limited data", featuredBHK: "3BHK", distance: "2.4 km", isLimitedData: true, hereRent: 82000 }),
    nb({ slug: "brigade-northridge", name: "Brigade Northridge", locality: "Thanisandra", medianRent2BHK: null, medianRent3BHK: null, reportCount: 2, confidenceLabel: "limited data", featuredBHK: "2BHK", distance: "3.1 km", isLimitedData: true, hereRent: 82000 }),
  ],
  oldestReport: "Apr 2025",
  latestReport: "May 2026",
  selfCount: 14,
  partialCount: 9,
  verifiedCount: 3,
  summaryTotal: 26,
});

const embassyPristine = (): SocietyDetail => ({
  id: "embassy-pristine",
  slug: "embassy-pristine",
  name: "Embassy Pristine",
  locality: "Sarjapur Road",
  builder: "Embassy Group",
  yearBuiltFrom: 2014,
  yearBuiltTo: 2014,
  totalUnits: 800,
  description:
    "Mid-rise community along Sarjapur Road with mature landscaping and a tight resident community. Popular with the IT-corridor working crowd.",
  medianRent2BHK: 55000,
  range2BHKLow: 48000,
  range2BHKHigh: 64000,
  medianRent3BHK: 75000,
  range3BHKLow: 65000,
  range3BHKHigh: 90000,
  reportCount: 22,
  lastUpdated: null,
  confidenceLabel: "partially verified",
  featuredBHK: "2BHK",
  nearbyCount: 22,
  trend2BHK: { pct: 5, window: "vs prior 6 months" },
  trend3BHK: { pct: 3, window: "vs prior 6 months" },
  trendMaint: { stable: true, window: "vs prior 6 months" },
  depositMonths: "4–6",
  depositSub: "5-month modal, occasional 7-month",
  totalOutflowEstimate: 59800,
  totalOutflowBHK: "2 BHK",
  maintenanceTypical: 4800,
  maintenanceLow: 4200,
  maintenanceHigh: 5800,
  maintenanceByBHK: [
    { label: "2 BHK typical", value: 4200 },
    { label: "3 BHK typical", value: 4800 },
    { label: "3.5 BHK typical", value: 5800 },
  ],
  rentBreakdown: [
    { bhk: "2 BHK", floorBand: "1–3", median: 52000, rangeLow: 46000, rangeHigh: 58000, reports: 4 },
    { bhk: "2 BHK", floorBand: "4–7", median: 55000, rangeLow: 48000, rangeHigh: 62000, reports: 6 },
    { bhk: "2 BHK", floorBand: "8–12", median: 60000, rangeLow: 52000, rangeHigh: 66000, reports: 3 },
    { bhk: "3 BHK", floorBand: "1–3", median: 70000, rangeLow: 62000, rangeHigh: 80000, reports: 3 },
    { bhk: "3 BHK", floorBand: "4–7", median: 75000, rangeLow: 65000, rangeHigh: 86000, reports: 4 },
    { bhk: "3 BHK", floorBand: "8–12", median: 82000, rangeLow: 72000, rangeHigh: 90000, reports: 2 },
  ],
  furnishingPremium: { unfurnishedBase: 55000, semiFurnished: 2800, fullyFurnished: 6200, pairedReports: 5 },
  leaseNorms: [
    { label: "Deposit (most common)", value: "5 months" },
    { label: "Notice period", value: "2 months" },
    { label: "Annual rent hike", value: "5–8%" },
    { label: "Broker fee (when used)", value: "1 month rent" },
  ],
  valueForMoney: {
    label: "Mostly good",
    descriptor:
      "11 of 14 residents feel the rent is well-priced relative to the Sarjapur Road belt. The few dissenters cite peak-hour exit traffic eating commute time.",
    sampleSize: 14,
    dotColor: "success",
  },
  societyQuality: {
    label: "Mixed",
    descriptor:
      "Clubhouse and gym praised. Recurring complaints about water-pressure on higher floors during summer and slow lift servicing.",
    sampleSize: 16,
    dotColor: "marigold",
  },
  ownerExperience: {
    label: "Mostly fair",
    descriptor:
      "Most owners responsive; deposit returns generally clean within 4–6 weeks. A couple of mid-lease hike asks flagged.",
    sampleSize: 12,
    dotColor: "marigold",
  },
  notesSummary:
    "Residents commonly mention <emph>walkable to Sarjapur Road retail</emph> (9 reports), <emph>summer water pressure</emph> issues on higher floors (7 reports), and a <emph>quiet IT-professional crowd</emph> (8 reports).",
  notesSampleSize: 19,
  sourceChannels: [
    { label: "Society WhatsApp group", hint: "(internal transfer)", percent: 32, count: 6, barShade: "marigold" },
    { label: "Broker", percent: 29, count: 5, barShade: "marigold/70" },
    { label: "App", hint: "(NoBroker, MagicBricks)", percent: 22, count: 4, barShade: "marigold/50" },
    { label: "Through friends / family", percent: 17, count: 3, barShade: "marigold/30" },
  ],
  sourceTotal: 18,
  sourceInsight:
    "<accent>49%</accent> of leases close through internal or social networks. The smaller community size means listings move quickly inside the WhatsApp group — outsiders typically need a resident to forward a flyer.",
  movers: [
    { name: "Leo Packers & Movers", rating: 4.4, residents: 4, recency: "last 12 mo" },
    { name: "Pikkol", rating: 4.1, residents: 3, recency: "last 12 mo" },
    { name: "Agarwal Packers", rating: 3.8, residents: 3, recency: "last 12 mo" },
  ],
  moversTotal: 11,
  othersMentioned: 3,
  nearbySocieties: [
    nb({ slug: "prestige-ferns-residency", name: "Prestige Ferns Residency", locality: "Sarjapur Road", medianRent2BHK: 52000, medianRent3BHK: null, reportCount: 24, confidenceLabel: "partially verified", featuredBHK: "2BHK", distance: "1.6 km", deltaPercent: -5, deltaDirection: "down", hereRent: 55000 }),
    nb({ slug: "sobha-silicon-oasis", name: "Sobha Silicon Oasis", locality: "Sarjapur Road", medianRent2BHK: 50000, medianRent3BHK: null, reportCount: 16, confidenceLabel: "partially verified", featuredBHK: "2BHK", distance: "2.3 km", deltaPercent: -9, deltaDirection: "down", hereRent: 55000 }),
    nb({ slug: "purva-skywood", name: "Purva Skywood", locality: "Sarjapur Road", medianRent2BHK: 48000, medianRent3BHK: null, reportCount: 18, confidenceLabel: "partially verified", featuredBHK: "2BHK", distance: "3.0 km", deltaPercent: -13, deltaDirection: "down", hereRent: 55000 }),
    nb({ slug: "sobha-dream-acres", name: "Sobha Dream Acres", locality: "Panathur", medianRent2BHK: 38000, medianRent3BHK: null, reportCount: 42, confidenceLabel: "verified source", featuredBHK: "2BHK", distance: "5.0 km", deltaPercent: -31, deltaDirection: "down", hereRent: 55000 }),
  ],
  oldestReport: "May 2025",
  latestReport: "May 2026",
  selfCount: 12,
  partialCount: 8,
  verifiedCount: 2,
  summaryTotal: 22,
});

const brigadeMetropolis = (): SocietyDetail => ({
  id: "brigade-metropolis",
  slug: "brigade-metropolis",
  name: "Brigade Metropolis",
  locality: "Mahadevapura",
  builder: "Brigade Group",
  yearBuiltFrom: 2008,
  yearBuiltTo: 2010,
  totalUnits: 1500,
  description:
    "Mature Mahadevapura township with multiple towers, retail blocks, and a school inside the gates. Long-standing established community.",
  medianRent2BHK: 52000,
  range2BHKLow: 45000,
  range2BHKHigh: 62000,
  medianRent3BHK: 75000,
  range3BHKLow: 65000,
  range3BHKHigh: 92000,
  reportCount: 29,
  lastUpdated: null,
  confidenceLabel: "partially verified",
  featuredBHK: "3BHK",
  nearbyCount: 29,
  trend2BHK: { pct: 4, window: "vs prior 6 months" },
  trend3BHK: { pct: 6, window: "vs prior 6 months" },
  trendMaint: { pct: 4, window: "vs prior 6 months" },
  depositMonths: "4–6",
  depositSub: "5-month modal, 8-month outliers",
  totalOutflowEstimate: 80500,
  totalOutflowBHK: "3 BHK",
  maintenanceTypical: 5500,
  maintenanceLow: 4800,
  maintenanceHigh: 6800,
  maintenanceByBHK: [
    { label: "2 BHK typical", value: 4800 },
    { label: "3 BHK typical", value: 5500 },
    { label: "3.5 BHK typical", value: 6800 },
  ],
  rentBreakdown: [
    { bhk: "2 BHK", floorBand: "1–3", median: 48000, rangeLow: 42000, rangeHigh: 55000, reports: 4 },
    { bhk: "2 BHK", floorBand: "4–7", median: 52000, rangeLow: 45000, rangeHigh: 60000, reports: 6 },
    { bhk: "2 BHK", floorBand: "8–12", median: 58000, rangeLow: 50000, rangeHigh: 64000, reports: 3 },
    { bhk: "3 BHK", floorBand: "1–3", median: 70000, rangeLow: 62000, rangeHigh: 80000, reports: 5 },
    { bhk: "3 BHK", floorBand: "4–7", median: 75000, rangeLow: 65000, rangeHigh: 88000, reports: 7 },
    { bhk: "3 BHK", floorBand: "8–12", median: 85000, rangeLow: 74000, rangeHigh: 92000, reports: 3 },
  ],
  furnishingPremium: { unfurnishedBase: 75000, semiFurnished: 2800, fullyFurnished: 6500, pairedReports: 6 },
  leaseNorms: [
    { label: "Deposit (most common)", value: "5 months" },
    { label: "Notice period", value: "2 months" },
    { label: "Annual rent hike", value: "6–10%" },
    { label: "Broker fee (when used)", value: "1 month rent" },
  ],
  valueForMoney: {
    label: "Mostly good",
    descriptor:
      "14 of 18 residents call out strong value for an established Mahadevapura address with retail on-site. The 4 dissenters mention ageing finishes in older blocks.",
    sampleSize: 18,
    dotColor: "success",
  },
  societyQuality: {
    label: "Mixed",
    descriptor:
      "Retail and school on-campus praised. Some lift breakdowns and patchy gym upkeep in the older towers reported.",
    sampleSize: 20,
    dotColor: "marigold",
  },
  ownerExperience: {
    label: "Mostly fair",
    descriptor:
      "Long-tenure owners; many handle renewals informally. Deposit returns mostly clean within 4–6 weeks.",
    sampleSize: 15,
    dotColor: "success",
  },
  notesSummary:
    "Residents commonly mention <emph>school and retail on-campus</emph> (11 reports), <emph>lift breakdowns</emph> in the older towers (8 reports), and proximity to <emph>ITPL / EPIP commute</emph> (9 reports).",
  notesSampleSize: 23,
  sourceChannels: [
    { label: "Society WhatsApp group", hint: "(internal transfer)", percent: 36, count: 9, barShade: "marigold" },
    { label: "Through friends / family", percent: 28, count: 7, barShade: "marigold/70" },
    { label: "Broker", percent: 22, count: 5, barShade: "marigold/50" },
    { label: "App", hint: "(NoBroker, MagicBricks)", percent: 14, count: 3, barShade: "marigold/30" },
  ],
  sourceTotal: 24,
  sourceInsight:
    "<accent>64%</accent> of leases close through internal networks or word-of-mouth. The community is mature — many residents have been here 8+ years and units pass through colleague and family networks before listing.",
  movers: [
    { name: "Agarwal Packers", rating: 4.3, residents: 6, recency: "last 12 mo" },
    { name: "Leo Packers & Movers", rating: 4.2, residents: 4, recency: "last 12 mo" },
    { name: "Writer Relocations", rating: 4.5, residents: 3, recency: "last 12 mo" },
    { name: "ShiftKaro", rating: 3.7, residents: 2, recency: "last 12 mo" },
  ],
  moversTotal: 15,
  othersMentioned: 4,
  nearbySocieties: [
    nb({ slug: "prestige-shantiniketan", name: "Prestige Shantiniketan", locality: "Whitefield", medianRent2BHK: null, medianRent3BHK: 85000, reportCount: 47, confidenceLabel: "partially verified", featuredBHK: "3BHK", distance: "3.5 km", deltaPercent: 13, deltaDirection: "up", hereRent: 75000 }),
    nb({ slug: "brigade-cosmopolis", name: "Brigade Cosmopolis", locality: "Whitefield", medianRent2BHK: null, medianRent3BHK: 85000, reportCount: 27, confidenceLabel: "partially verified", featuredBHK: "3BHK", distance: "2.8 km", deltaPercent: 13, deltaDirection: "up", hereRent: 75000 }),
    nb({ slug: "salarpuria-sattva-magnus", name: "Salarpuria Sattva Magnus", locality: "Hoodi", medianRent2BHK: null, medianRent3BHK: 80000, reportCount: 21, confidenceLabel: "partially verified", featuredBHK: "2BHK", distance: "2.1 km", deltaPercent: 7, deltaDirection: "up", hereRent: 75000 }),
  ],
  oldestReport: "Mar 2025",
  latestReport: "May 2026",
  selfCount: 18,
  partialCount: 9,
  verifiedCount: 2,
  summaryTotal: 29,
});

const mantriEspana = (): SocietyDetail => ({
  // Limited-data society. Only median_rent_3bhk known; trend strips disabled.
  id: "mantri-espana",
  slug: "mantri-espana",
  name: "Mantri Espana",
  locality: "Bellandur",
  builder: "Mantri Developers",
  yearBuiltFrom: 2014,
  yearBuiltTo: 2014,
  totalUnits: 700,
  description:
    "High-rise towers off Outer Ring Road. Compact campus with city-skyline views on upper floors.",
  medianRent2BHK: null,
  range2BHKLow: null,
  range2BHKHigh: null,
  medianRent3BHK: 78000,
  range3BHKLow: null,
  range3BHKHigh: null,
  reportCount: 4,
  lastUpdated: null,
  confidenceLabel: "limited data",
  featuredBHK: "3BHK",
  nearbyCount: 4,
  trend2BHK: null,
  trend3BHK: null,
  trendMaint: null,
  depositMonths: "4–6",
  depositSub: "limited reports — modal not established",
  totalOutflowEstimate: 83000,
  totalOutflowBHK: "3 BHK",
  maintenanceTypical: 5000,
  maintenanceLow: 4200,
  maintenanceHigh: 6500,
  maintenanceByBHK: [
    { label: "2 BHK typical", value: 4200 },
    { label: "3 BHK typical", value: 5000 },
    { label: "3.5 BHK typical", value: 6500 },
  ],
  rentBreakdown: [
    { bhk: "2 BHK", floorBand: "1–3", median: null, reports: 0 },
    { bhk: "2 BHK", floorBand: "4–7", median: null, reports: 1 },
    { bhk: "3 BHK", floorBand: "1–3", median: null, reports: 1 },
    { bhk: "3 BHK", floorBand: "4–7", median: 78000, rangeLow: 70000, rangeHigh: 88000, reports: 2 },
    { bhk: "3 BHK", floorBand: "8–12", median: null, reports: 0 },
  ],
  furnishingPremium: { unfurnishedBase: 78000, semiFurnished: 3000, fullyFurnished: 7000, pairedReports: 2 },
  leaseNorms: [
    { label: "Deposit (most common)", value: "5 months" },
    { label: "Notice period", value: "2 months" },
    { label: "Annual rent hike", value: "limited data" },
    { label: "Broker fee (when used)", value: "Negotiable" },
  ],
  valueForMoney: {
    label: "Limited data",
    descriptor: "Only 3 residents shared a view here. We'll surface a confident read once we have 8+ reports.",
    sampleSize: 3,
    dotColor: "ink-faint",
  },
  societyQuality: {
    label: "Limited data",
    descriptor:
      "Early reports mention quiet upper floors and city views. Not enough volume to call a clear pattern yet.",
    sampleSize: 3,
    dotColor: "ink-faint",
  },
  ownerExperience: {
    label: "Limited data",
    descriptor: "Not enough resident reports to summarize landlord behaviour here.",
    sampleSize: 2,
    dotColor: "ink-faint",
  },
  notesSummary:
    "Early reports mention <emph>skyline views</emph> from the upper floors (2 reports) and a <emph>quieter resident mix</emph> compared to neighbouring high-rises (2 reports). We need more reports before drawing wider patterns.",
  notesSampleSize: 4,
  sourceChannels: [
    { label: "Broker", percent: 50, count: 2, barShade: "marigold" },
    { label: "App", hint: "(NoBroker, MagicBricks)", percent: 25, count: 1, barShade: "marigold/70" },
    { label: "Society WhatsApp group", hint: "(internal transfer)", percent: 25, count: 1, barShade: "marigold/50" },
    { label: "Through friends / family", percent: 0, count: 0, barShade: "marigold/30" },
  ],
  sourceTotal: 4,
  sourceInsight:
    "Most early reports here come via <accent>broker or app</accent> — the internal network signal is still thin. As more residents contribute, we expect the internal-transfer share to rise (this is the pattern at every premium society in Bellandur).",
  movers: [
    { name: "Agarwal Packers", rating: 4.0, residents: 2, recency: "last 12 mo" },
    { name: "Pikkol", rating: 4.2, residents: 1, recency: "last 12 mo" },
  ],
  moversTotal: 3,
  othersMentioned: 2,
  nearbySocieties: [
    nb({ slug: "adarsh-palm-retreat", name: "Adarsh Palm Retreat", locality: "Bellandur", medianRent2BHK: null, medianRent3BHK: 95000, reportCount: 31, confidenceLabel: "partially verified", featuredBHK: "3BHK", distance: "1.4 km", deltaPercent: 22, deltaDirection: "up", hereRent: 78000 }),
    nb({ slug: "sobha-quartz", name: "Sobha Quartz", locality: "Bellandur", medianRent2BHK: null, medianRent3BHK: 75000, reportCount: 17, confidenceLabel: "partially verified", featuredBHK: "2BHK", distance: "1.7 km", deltaPercent: -4, deltaDirection: "down", hereRent: 78000 }),
    nb({ slug: "rohan-iksha", name: "Rohan Iksha", locality: "Bellandur", medianRent2BHK: null, medianRent3BHK: 85000, reportCount: 13, confidenceLabel: "partially verified", featuredBHK: "2BHK", distance: "2.0 km", deltaPercent: 9, deltaDirection: "up", hereRent: 78000 }),
  ],
  oldestReport: "Sep 2025",
  latestReport: "May 2026",
  selfCount: 3,
  partialCount: 1,
  verifiedCount: 0,
  summaryTotal: 4,
});

const adarshPalmMeadows = (): SocietyDetail => ({
  id: "adarsh-palm-meadows",
  slug: "adarsh-palm-meadows",
  name: "Adarsh Palm Meadows",
  locality: "Whitefield",
  builder: "Adarsh Developers",
  yearBuiltFrom: 2002,
  yearBuiltTo: 2004,
  totalUnits: 300,
  description:
    "Established low-rise villa-style community in the heart of Whitefield with mature landscaping and a strong long-tenure resident base. One of the older premium addresses on this side.",
  medianRent2BHK: 75000,
  range2BHKLow: 62000,
  range2BHKHigh: 92000,
  medianRent3BHK: 115000,
  range3BHKLow: 95000,
  range3BHKHigh: 150000,
  reportCount: 15,
  lastUpdated: null,
  confidenceLabel: "verified source",
  featuredBHK: "3BHK",
  nearbyCount: 15,
  trend2BHK: { pct: 8, window: "vs prior 6 months" },
  trend3BHK: { pct: 7, window: "vs prior 6 months" },
  trendMaint: { pct: 4, window: "vs prior 6 months" },
  depositMonths: "6–10",
  depositSub: "8-month modal, 10-month for larger villas",
  totalOutflowEstimate: 124000,
  totalOutflowBHK: "3 BHK",
  maintenanceTypical: 9000,
  maintenanceLow: 7500,
  maintenanceHigh: 12000,
  maintenanceByBHK: [
    { label: "2 BHK typical", value: 7500 },
    { label: "3 BHK typical", value: 9000 },
    { label: "4 BHK villa typical", value: 12000 },
  ],
  rentBreakdown: [
    { bhk: "2 BHK", floorBand: "1–3", median: 75000, rangeLow: 62000, rangeHigh: 92000, reports: 3 },
    { bhk: "3 BHK", floorBand: "1–3", median: 115000, rangeLow: 95000, rangeHigh: 140000, reports: 8 },
    { bhk: "4 BHK villa", floorBand: "1–3", median: 150000, rangeLow: 130000, rangeHigh: 180000, reports: 3 },
  ],
  furnishingPremium: { unfurnishedBase: 115000, semiFurnished: 4500, fullyFurnished: 9000, pairedReports: 4 },
  leaseNorms: [
    { label: "Deposit (most common)", value: "8 months" },
    { label: "Notice period", value: "3 months" },
    { label: "Annual rent hike", value: "7–10%" },
    { label: "Broker fee (when used)", value: "Negotiable" },
  ],
  valueForMoney: {
    label: "Mostly fair",
    descriptor:
      "8 of 11 residents say the rent is fair for the scale of a Whitefield villa community. The 3 dissenters call out steep maintenance ratios on larger units.",
    sampleSize: 11,
    dotColor: "marigold",
  },
  societyQuality: {
    label: "Mostly good",
    descriptor:
      "Mature trees, private club and tennis court praised consistently. Some complaints about ageing villa interiors needing landlord refurbishment.",
    sampleSize: 12,
    dotColor: "success",
  },
  ownerExperience: {
    label: "Mostly fair",
    descriptor:
      "Mostly second-home owners renting through long-term arrangements. Renewals tend to be informal but high-deposit asks are common.",
    sampleSize: 9,
    dotColor: "marigold",
  },
  notesSummary:
    "Residents commonly mention <emph>mature trees and quiet villa streets</emph> (8 reports), <emph>high deposit asks</emph> from second-home owners (6 reports), and a <emph>tight long-tenure community</emph> with very low turnover (7 reports).",
  notesSampleSize: 17,
  sourceChannels: [
    { label: "Through friends / family", percent: 45, count: 5, barShade: "marigold" },
    { label: "Society WhatsApp group", hint: "(internal transfer)", percent: 36, count: 4, barShade: "marigold/70" },
    { label: "Broker", percent: 18, count: 2, barShade: "marigold/50" },
    { label: "App", hint: "(NoBroker, MagicBricks)", percent: 0, count: 0, barShade: "marigold/30" },
  ],
  sourceTotal: 11,
  sourceInsight:
    "<accent>81%</accent> of leases close through personal networks here — the highest internal-share of any society we track. Almost nothing reaches a portal. Renting in usually means knowing someone or having a colleague flag a listing.",
  movers: [
    { name: "Writer Relocations", rating: 4.7, residents: 4, recency: "last 12 mo" },
    { name: "Agarwal Packers", rating: 4.4, residents: 3, recency: "last 12 mo" },
    { name: "Leo Packers & Movers", rating: 4.5, residents: 2, recency: "last 12 mo" },
  ],
  moversTotal: 9,
  othersMentioned: 3,
  nearbySocieties: [
    nb({ slug: "prestige-shantiniketan", name: "Prestige Shantiniketan", locality: "Whitefield", medianRent2BHK: null, medianRent3BHK: 85000, reportCount: 47, confidenceLabel: "partially verified", featuredBHK: "3BHK", distance: "2.3 km", deltaPercent: -26, deltaDirection: "down", hereRent: 115000 }),
    nb({ slug: "brigade-cosmopolis", name: "Brigade Cosmopolis", locality: "Whitefield", medianRent2BHK: null, medianRent3BHK: 85000, reportCount: 27, confidenceLabel: "partially verified", featuredBHK: "3BHK", distance: "1.9 km", deltaPercent: -26, deltaDirection: "down", hereRent: 115000 }),
    nb({ slug: "prestige-ozone", name: "Prestige Ozone", locality: "Whitefield", medianRent2BHK: null, medianRent3BHK: 105000, reportCount: 11, confidenceLabel: "", featuredBHK: "3BHK", distance: "1.4 km", deltaPercent: -9, deltaDirection: "down", hereRent: 115000 }),
  ],
  oldestReport: "Dec 2024",
  latestReport: "May 2026",
  selfCount: 5,
  partialCount: 4,
  verifiedCount: 6,
  summaryTotal: 15,
});

// societyDetailBySlug returns the curated detail bundle, or null if the slug
// has no curated detail (the route then tries the sparse page).
const REGISTRY: Record<string, () => SocietyDetail> = {
  "adarsh-palm-meadows": adarshPalmMeadows,
  "adarsh-palm-retreat": adarshPalmRetreat,
  "brigade-cosmopolis": brigadeCosmopolis,
  "brigade-metropolis": brigadeMetropolis,
  "embassy-pristine": embassyPristine,
  "mantri-espana": mantriEspana,
  "prestige-lakeside-habitat": prestigeLakesideHabitat,
  "prestige-shantiniketan": prestigeShantiniketan,
  "sobha-city": sobhaCity,
  "sobha-dream-acres": sobhaDreamAcres,
};

export function societyDetailBySlug(slug: string): SocietyDetail | null {
  const build = REGISTRY[slug];
  return build ? build() : null;
}

// mergeSocietyIntoDetail overlays the authoritative live DB base fields onto a
// curated detail bundle, so the page reflects the catalog (grounded asking
// rents, honest provenance, corrected locality) instead of the hand-curated
// placeholders. Rich sections from the bundle are kept; the view shows them
// only for resident-provenance societies. NULL medians (e.g. villa/3BHK-only
// societies whose fabricated 2BHK was removed) flow through honestly.
export function mergeSocietyIntoDetail(detail: SocietyDetail, soc: Society): SocietyDetail {
  return {
    ...detail,
    id: soc.id,
    slug: soc.slug,
    name: soc.name,
    locality: soc.locality,
    builder: soc.builder,
    yearBuiltFrom: soc.yearBuiltFrom,
    yearBuiltTo: soc.yearBuiltTo,
    totalUnits: soc.totalUnits,
    description: soc.description,
    medianRent2BHK: soc.medianRent2BHK,
    range2BHKLow: soc.range2BHKLow,
    range2BHKHigh: soc.range2BHKHigh,
    medianRent3BHK: soc.medianRent3BHK,
    range3BHKLow: soc.range3BHKLow,
    range3BHKHigh: soc.range3BHKHigh,
    reportCount: soc.reportCount,
    lastUpdated: soc.lastUpdated,
    confidenceLabel: soc.confidenceLabel,
    featuredBHK: soc.featuredBHK,
    provenance: soc.provenance,
  };
}
