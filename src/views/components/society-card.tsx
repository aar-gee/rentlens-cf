import type { FC } from "hono/jsx";
import type { Society } from "../../data/society";
import { formatINR, formatRange, reportsLabel } from "../../lib/format";
import { relativeTime } from "../../lib/relative-time";

// Port of components/society_card.templ — the four-variant featured card.
type CardVariant = "self-reported" | "partially-verified" | "verified" | "limited";

// classifyCard maps metadata to a variant. "limited data" (or <6 reports)
// wins over a low confidence label.
function classifyCard(s: Society): CardVariant {
  const label = s.confidenceLabel.trim().toLowerCase();
  if (label === "limited data") return "limited";
  if (s.reportCount != null && s.reportCount < 6) return "limited";
  switch (label) {
    case "verified source":
      return "verified";
    case "partially verified":
      return "partially-verified";
    default:
      return "self-reported";
  }
}

// resolveFeaturedBHK picks which BHK column surfaces ("2BHK" | "3BHK"). When
// FeaturedBHK is empty, prefers 2BHK if it has a median, else 3BHK.
function resolveFeaturedBHK(s: Society): "2BHK" | "3BHK" {
  const f = s.featuredBHK.trim().toUpperCase();
  if (f === "2BHK") return "2BHK";
  if (f === "3BHK") return "3BHK";
  return s.medianRent2BHK != null ? "2BHK" : "3BHK";
}

const featuredBHKLabel = (s: Society) => (resolveFeaturedBHK(s) === "3BHK" ? "3 BHK" : "2 BHK");
const featuredMedian = (s: Society) =>
  resolveFeaturedBHK(s) === "3BHK" ? s.medianRent3BHK : s.medianRent2BHK;
const featuredRange = (s: Society) =>
  resolveFeaturedBHK(s) === "3BHK"
    ? formatRange(s.range3BHKLow, s.range3BHKHigh)
    : formatRange(s.range2BHKLow, s.range2BHKHigh);

const cardHref = (s: Society) => `/societies/${s.slug}`;

const CardHeader: FC<{ soc: Society }> = ({ soc }) => (
  <header class="flex items-start justify-between gap-2">
    <div class="min-w-0">
      <div class="text-[15px] font-medium leading-tight truncate">{soc.name}</div>
      <div class="text-xs text-ink-faint mt-1.5 flex items-center gap-1.5">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" class="flex-shrink-0">
          <path d="M5 .5C3 .5 1.5 2 1.5 4S5 9.5 5 9.5 8.5 6 8.5 4 7 .5 5 .5z" stroke="currentColor" stroke-width="1" />
          <circle cx="5" cy="4" r="1.2" stroke="currentColor" stroke-width="1" />
        </svg>
        {soc.locality}
      </div>
    </div>
    <span class="num text-[10px] text-ink-faint flex-shrink-0">{soc.slug}</span>
  </header>
);

const CardMedian: FC<{ soc: Society; limited: boolean }> = ({ soc, limited }) => {
  const m = featuredMedian(soc);
  if (m != null) {
    return (
      <div
        class={`num text-[28px] font-medium tracking-tighter leading-none${limited ? " text-ink-mute" : ""}`}
      >
        {formatINR(m)}
        <span class="text-sm text-ink-faint">/mo</span>
      </div>
    );
  }
  return (
    <div class="num text-[28px] font-medium tracking-tighter leading-none text-ink-mute">
      —<span class="text-sm text-ink-faint">/mo</span>
    </div>
  );
};

const CardMetric: FC<{ soc: Society; limited: boolean }> = ({ soc, limited }) => {
  const range = featuredRange(soc);
  return (
    <div>
      <div class="eyebrow !text-ink-faint mb-1.5">
        {featuredBHKLabel(soc)} · {limited ? "early signal" : "median"}
      </div>
      <CardMedian soc={soc} limited={limited} />
      {limited ? (
        <div class="num text-xs text-ink-faint mt-2">limited data</div>
      ) : range !== "" ? (
        <div class="num text-xs text-ink-mute mt-2">{range}</div>
      ) : (
        <div class="num text-xs text-ink-faint mt-2">range pending</div>
      )}
    </div>
  );
};

const CardStandard: FC<{ soc: Society; variant: CardVariant }> = ({ soc, variant }) => {
  const ts = relativeTime(soc.lastUpdated);
  return (
    <a
      href={cardHref(soc)}
      class="card-elev flex-shrink-0 w-[280px] sm:w-[300px] bg-white border border-hairline p-5 sm:p-6 flex flex-col gap-4 relative no-underline"
    >
      {variant === "verified" ? (
        <div class="absolute top-0 right-0 bg-ink text-parchment text-[9px] px-2 py-0.5 tracking-[0.14em] uppercase font-mono">
          Verified
        </div>
      ) : null}
      <CardHeader soc={soc} />
      <CardMetric soc={soc} limited={false} />
      <div class="h-px bg-hairline" />
      <footer class="flex items-center justify-between text-xs">
        <div class="flex items-center gap-1.5 text-ink-mute">
          <span class={`w-1.5 h-1.5 rounded-full ${variant === "verified" ? "bg-success" : "bg-marigold"}`} />
          <span class="num">{reportsLabel(soc.reportCount)}</span>
        </div>
        {ts !== "" ? <span class="num text-ink-faint">{ts}</span> : null}
      </footer>
    </a>
  );
};

const CardLimited: FC<{ soc: Society }> = ({ soc }) => (
  <a
    href={cardHref(soc)}
    class="card-elev flex-shrink-0 w-[280px] sm:w-[300px] bg-parchment-deep/40 border border-hairline border-dashed p-5 sm:p-6 flex flex-col gap-4 no-underline"
  >
    <CardHeader soc={soc} />
    <CardMetric soc={soc} limited={true} />
    <div class="h-px bg-hairline" />
    <footer class="flex items-center justify-between text-xs">
      <div class="flex items-center gap-1.5 text-ink-mute">
        <span class="w-1.5 h-1.5 rounded-full bg-ink-faint" />
        <span class="num">{reportsLabel(soc.reportCount)}</span>
      </div>
      <span class="text-marigold hover:text-marigold-deep font-medium">Help fill in →</span>
    </footer>
  </a>
);

export const SocietyCard: FC<{ soc: Society }> = ({ soc }) => {
  const variant = classifyCard(soc);
  return variant === "limited" ? <CardLimited soc={soc} /> : <CardStandard soc={soc} variant={variant} />;
};
