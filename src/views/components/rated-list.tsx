import type { FC } from "hono/jsx";
import type { MoverRating } from "../../data/society-detail";

// RatedList — movers list with unicode-star ratings (rounded to whole stars).

function roundStars(rating: number): number {
  const r = Math.floor(rating + 0.5);
  if (r < 0) return 0;
  if (r > 5) return 5;
  return r;
}

const StarRow: FC<{ rating: number }> = ({ rating }) => {
  const filled = roundStars(rating);
  if (filled >= 5) return <span class="text-marigold tracking-[1px]">★★★★★</span>;
  if (filled <= 0) return <span class="text-hairline-strong tracking-[1px]">★★★★★</span>;
  return (
    <>
      <span class="text-marigold tracking-[1px]">{"★".repeat(filled)}</span>
      <span class="text-hairline-strong tracking-[1px]">{"★".repeat(5 - filled)}</span>
    </>
  );
};

const moverFooter = (m: MoverRating) =>
  m.residents === 1 ? `1 resident · ${m.recency}` : `${m.residents} residents · ${m.recency}`;

export const RatedList: FC<{ movers: MoverRating[] }> = ({ movers }) => (
  <ul class="space-y-4">
    {movers.map((m) => (
      <li class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="text-sm font-medium truncate">{m.name}</div>
          <div class="num text-xs text-ink-faint mt-0.5">{moverFooter(m)}</div>
        </div>
        <div class="flex flex-col items-end gap-0.5 flex-shrink-0">
          <div class="flex text-base" aria-label={`${m.rating.toFixed(1)} out of 5`}>
            <StarRow rating={m.rating} />
          </div>
          <span class="num text-xs font-medium">{m.rating.toFixed(1)}</span>
        </div>
      </li>
    ))}
  </ul>
);
