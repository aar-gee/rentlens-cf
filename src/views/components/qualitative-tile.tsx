import type { FC } from "hono/jsx";
import type { QualitativeRating } from "../../data/society-detail";
import { ConfidenceDot } from "./confidence-dot";

const footer = (n: number) => (n === 1 ? "1 rating · last 12 months" : `${n} ratings · last 12 months`);

// QualitativeTile — one tile of the 3-tile "Beyond the rent" row.
export const QualitativeTile: FC<{ eyebrow: string; r: QualitativeRating }> = ({ eyebrow, r }) => (
  <article class="bg-white border border-hairline p-6">
    <div class="eyebrow mb-3">{eyebrow}</div>
    <div class="display text-2xl font-medium mb-3">{r.label}</div>
    <p class="text-sm text-ink-mute leading-relaxed mb-4">{r.descriptor}</p>
    <div class="flex items-center gap-1.5 text-xs text-ink-mute">
      <ConfidenceDot color={r.dotColor} />
      <span class="num">{footer(r.sampleSize)}</span>
    </div>
  </article>
);
