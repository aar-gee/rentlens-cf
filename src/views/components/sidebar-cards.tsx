import type { FC } from "hono/jsx";
import type { SocietyDetail, FurnishingPremium, LabeledValue } from "../../data/society-detail";
import { formatINR, formatINRPlus } from "../../lib/format";

// Right-rail cards on the society page's main-insights section.

export const MaintenanceCard: FC<{ d: SocietyDetail }> = ({ d }) => (
  <div>
    <div class="eyebrow mb-2">/ Maintenance · monthly</div>
    <div class="bg-white border border-hairline p-5">
      <div class="num text-3xl font-medium tracking-tighter leading-none">
        {formatINR(d.maintenanceLow)}
        <span class="text-base text-ink-faint">– {formatINR(d.maintenanceHigh)}</span>
      </div>
      <div class="text-xs text-ink-mute mt-2.5">
        Most pay around <span class="num text-ink">{formatINR(d.maintenanceTypical)}</span>. Higher floors typically
        pay more.
      </div>
      <div class="hairline my-4" />
      <ul class="space-y-2 text-xs">
        {d.maintenanceByBHK.map((m) => (
          <li class="flex justify-between">
            <span class="text-ink-mute">{m.label}</span>
            <span class="num">{formatINR(m.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  </div>
);

const pairedReportsLabel = (n: number) => (n === 1 ? "1 paired report" : `${n} paired reports`);

export const FurnishingPremiumCard: FC<{ f: FurnishingPremium }> = ({ f }) => (
  <div>
    <div class="eyebrow mb-2">/ Furnishing premium</div>
    <div class="bg-white border border-hairline p-5">
      <div class="space-y-2.5 text-sm">
        <div class="flex justify-between items-baseline">
          <span class="text-ink-mute">Unfurnished baseline</span>
          <span class="num text-ink">{formatINR(f.unfurnishedBase)}</span>
        </div>
        <div class="flex justify-between items-baseline">
          <span class="text-ink-mute">Semi-furnished</span>
          <span class="num text-ink">{formatINRPlus(f.semiFurnished)}</span>
        </div>
        <div class="flex justify-between items-baseline">
          <span class="text-ink-mute">Fully-furnished</span>
          <span class="num text-marigold-deep font-medium">{formatINRPlus(f.fullyFurnished)}</span>
        </div>
      </div>
      <div class="hairline my-4" />
      <div class="text-xs text-ink-faint">
        Based on <span class="num">{pairedReportsLabel(f.pairedReports)}</span> across furnishing levels. Small sample
        — directional only.
      </div>
    </div>
  </div>
);

export const LeaseNormsCard: FC<{ norms: LabeledValue[] }> = ({ norms }) => (
  <div>
    <div class="eyebrow mb-2">/ Lease norms</div>
    <div class="bg-white border border-hairline p-5">
      <ul class="space-y-2.5 text-sm">
        {norms.map((n) => (
          <li class="flex justify-between">
            <span class="text-ink-mute">{n.label}</span>
            <span class="num text-ink">{n.value}</span>
          </li>
        ))}
      </ul>
    </div>
  </div>
);
