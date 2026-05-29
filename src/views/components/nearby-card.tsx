import type { FC } from "hono/jsx";
import type { NearbySociety } from "../../data/society-detail";
import { formatINR, reportsLabel, signedPercent } from "../../lib/format";

// NearbyCard — society-card variant for the Compare-nearby scroll row. Shows
// a "vs. ₹X here · ±N%" delta line; limited-data uses the dashed variant.

function resolveFeaturedBHK(n: NearbySociety): "2BHK" | "3BHK" {
  const f = n.featuredBHK.trim().toUpperCase();
  if (f === "2BHK") return "2BHK";
  if (f === "3BHK") return "3BHK";
  return n.medianRent2BHK != null ? "2BHK" : "3BHK";
}

const nearbyMedianValue = (n: NearbySociety): number | null =>
  resolveFeaturedBHK(n) === "3BHK" ? n.medianRent3BHK : n.medianRent2BHK;

const limitedReportsLine = (rc: number | null) =>
  rc == null ? "limited data" : `limited data — ${rc} reports`;

const Header: FC<{ near: NearbySociety }> = ({ near }) => (
  <header class="flex items-start justify-between gap-2">
    <div class="min-w-0">
      <div class="text-[15px] font-medium leading-tight truncate">{near.name}</div>
      <div class="text-xs text-ink-faint mt-1.5 flex items-center gap-1.5">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" class="flex-shrink-0">
          <path d="M5 .5C3 .5 1.5 2 1.5 4S5 9.5 5 9.5 8.5 6 8.5 4 7 .5 5 .5z" stroke="currentColor" stroke-width="1" />
          <circle cx="5" cy="4" r="1.2" stroke="currentColor" stroke-width="1" />
        </svg>
        {near.locality} · {near.distance}
      </div>
    </div>
    <span class="num text-[10px] text-ink-faint flex-shrink-0">{near.slug}</span>
  </header>
);

const Median: FC<{ near: NearbySociety; muted: boolean }> = ({ near, muted }) => {
  const m = nearbyMedianValue(near);
  const cls = `num text-[24px] font-medium tracking-tighter leading-none${muted ? " text-ink-mute" : ""}`;
  if (m != null) {
    return (
      <div class={cls}>
        {formatINR(m)}
        <span class="text-sm text-ink-faint">/mo</span>
      </div>
    );
  }
  return (
    <div class="num text-[24px] font-medium tracking-tighter leading-none text-ink-mute">
      —<span class="text-sm text-ink-faint">/mo</span>
    </div>
  );
};

const DeltaLine: FC<{ near: NearbySociety }> = ({ near }) => {
  if (near.deltaPercent == null) {
    return <div class="num text-xs text-ink-mute mt-1.5">vs. {formatINR(near.hereRent)} here</div>;
  }
  if (near.deltaPercent === 0) {
    return (
      <div class="num text-xs text-ink-mute mt-1.5">
        vs. <span class="text-ink">{formatINR(near.hereRent)}</span> here · same
      </div>
    );
  }
  if (near.deltaDirection === "up") {
    return (
      <div class="num text-xs text-ink-mute mt-1.5">
        vs. {formatINR(near.hereRent)} here ·{" "}
        <span class="text-danger font-medium">{signedPercent(near.deltaPercent)}</span>
      </div>
    );
  }
  if (near.deltaDirection === "down") {
    return (
      <div class="num text-xs text-ink-mute mt-1.5">
        vs. {formatINR(near.hereRent)} here ·{" "}
        <span class="text-success font-medium">{signedPercent(near.deltaPercent)}</span>
      </div>
    );
  }
  return <div class="num text-xs text-ink-mute mt-1.5">vs. {formatINR(near.hereRent)} here · same</div>;
};

export const NearbyCard: FC<{ near: NearbySociety }> = ({ near }) => {
  if (near.isLimitedData) {
    return (
      <a
        href={`/societies/${near.slug}`}
        class="card-elev flex-shrink-0 w-[280px] sm:w-[300px] bg-parchment-deep/40 border border-hairline border-dashed p-5 sm:p-6 flex flex-col gap-4 no-underline"
      >
        <Header near={near} />
        <div>
          <div class="eyebrow !text-ink-faint mb-1.5">3 BHK · early signal</div>
          <Median near={near} muted={true} />
          <div class="num text-xs text-ink-faint mt-1.5">{limitedReportsLine(near.reportCount)}</div>
        </div>
        <div class="hairline" />
        <footer class="flex items-center justify-between text-xs">
          <div class="flex items-center gap-1.5 text-ink-mute">
            <span class="w-1.5 h-1.5 rounded-full bg-ink-faint" />
            <span class="num">{reportsLabel(near.reportCount)}</span>
          </div>
          <span class="text-marigold hover:text-marigold-deep font-medium">Help fill in →</span>
        </footer>
      </a>
    );
  }
  return (
    <a
      href={`/societies/${near.slug}`}
      class="card-elev flex-shrink-0 w-[280px] sm:w-[300px] bg-white border border-hairline p-5 sm:p-6 flex flex-col gap-4 no-underline"
    >
      <Header near={near} />
      <div>
        <div class="eyebrow !text-ink-faint mb-1.5">3 BHK · median</div>
        <Median near={near} muted={false} />
        <DeltaLine near={near} />
      </div>
      <div class="hairline" />
      <footer class="flex items-center justify-between text-xs">
        <div class="flex items-center gap-1.5 text-ink-mute">
          <span class="w-1.5 h-1.5 rounded-full bg-marigold" />
          <span class="num">{reportsLabel(near.reportCount)}</span>
        </div>
        <span class="text-marigold-deep hover:text-marigold font-medium">View →</span>
      </footer>
    </a>
  );
};
