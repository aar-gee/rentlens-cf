import type { FC } from "hono/jsx";
import type { TrendDelta } from "../../data/society-detail";
import { TrendBadge } from "./trend-badge";
import { ConfidenceDot } from "./confidence-dot";

// One card in the society page's "At a glance" 4-card grid.
export type SummaryMetricProps = {
  eyebrow: string;
  big: string; // "₹62,000" or "3–6"
  bigSuffix?: string; // "/mo" or " months"
  sub?: string;
  trend?: TrendDelta | null;
  confidenceDot: string;
  confidenceLabel: string;
};

export const SummaryMetricCard: FC<{ p: SummaryMetricProps }> = ({ p }) => (
  <article class="bg-white border border-hairline p-6">
    <div class="eyebrow mb-2">{p.eyebrow}</div>
    <div class="num text-[36px] font-medium tracking-tighter leading-none">
      {p.big}
      {p.bigSuffix ? <span class="text-base text-ink-faint">{p.bigSuffix}</span> : null}
    </div>
    {p.sub ? <div class="num text-xs text-ink-mute mt-2">{p.sub}</div> : null}
    <TrendBadge trend={p.trend ?? null} />
    <div class="hairline my-4" />
    <div class="flex items-center gap-1.5 text-xs text-ink-mute">
      <ConfidenceDot color={p.confidenceDot} />
      <span class="num">{p.confidenceLabel}</span>
    </div>
  </article>
);
