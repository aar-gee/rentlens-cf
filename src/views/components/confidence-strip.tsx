import type { FC } from "hono/jsx";
import type { SocietyDetail } from "../../data/society-detail";

// ConfidenceStrip — "Data behind this page": 4-stat row + dates line.
export const ConfidenceStrip: FC<{ d: SocietyDetail }> = ({ d }) => (
  <section class="px-5 sm:px-8 py-10 border-t border-hairline">
    <div class="max-w-wide mx-auto">
      <div class="eyebrow mb-3">/ Data behind this page</div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-10">
        <div>
          <div class="num text-2xl font-medium">{d.summaryTotal}</div>
          <div class="eyebrow mt-1">Reports total</div>
        </div>
        <div>
          <div class="num text-2xl font-medium">{d.selfCount}</div>
          <div class="eyebrow mt-1 flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-ink-faint" />
            Self-reported
          </div>
        </div>
        <div>
          <div class="num text-2xl font-medium">{d.partialCount}</div>
          <div class="eyebrow mt-1 flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-marigold" />
            Partially verified
          </div>
        </div>
        <div>
          <div class="num text-2xl font-medium">{d.verifiedCount}</div>
          <div class="eyebrow mt-1 flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-success" />
            Verified source
          </div>
        </div>
      </div>
      <div class="mt-6 flex flex-col sm:flex-row sm:items-center gap-3 text-xs text-ink-mute">
        <span>
          Oldest report: <span class="num">{d.oldestReport}</span> · Most recent:{" "}
          <span class="num">{d.latestReport}</span>
        </span>
        <span class="hidden sm:inline text-ink-faint">·</span>
        <a href="#" class="link-u text-ink-mute hover:text-ink">
          How confidence labels work →
        </a>
      </div>
    </div>
  </section>
);
