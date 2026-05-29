import type { FC } from "hono/jsx";
import type { TrendDelta } from "../../data/society-detail";
import { signedPercent } from "../../lib/format";

// TrendBadge — "↑ +6% …" / "↓ −15% …" / "Stable" / "Flat" line.
// Up = danger, down = success, stable/flat = ink-mute. null → nothing.
export const TrendBadge: FC<{ trend: TrendDelta | null }> = ({ trend }) => {
  if (!trend) return <></>;
  const win = trend.window ? <span class="text-ink-mute font-normal">{trend.window}</span> : null;
  const winPlain = trend.window ? <span class="font-normal">{trend.window}</span> : null;
  if (trend.stable) {
    return (
      <div class="mt-2.5 inline-flex items-center gap-1.5 text-xs text-ink-mute">
        <span class="w-2.5 h-px bg-ink-faint" />
        <span class="num font-medium">Stable</span>
        {winPlain}
      </div>
    );
  }
  const pct = trend.pct ?? 0;
  if (pct > 0) {
    return (
      <div class="mt-2.5 inline-flex items-center gap-1.5 text-xs text-danger">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" class="flex-shrink-0">
          <path d="M5 1.5l3.5 6H1.5z" fill="currentColor" />
        </svg>
        <span class="num font-medium">{signedPercent(pct)}</span>
        {win}
      </div>
    );
  }
  if (pct < 0) {
    return (
      <div class="mt-2.5 inline-flex items-center gap-1.5 text-xs text-success">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" class="flex-shrink-0">
          <path d="M5 8.5l3.5-6H1.5z" fill="currentColor" />
        </svg>
        <span class="num font-medium">{signedPercent(pct)}</span>
        {win}
      </div>
    );
  }
  return (
    <div class="mt-2.5 inline-flex items-center gap-1.5 text-xs text-ink-mute">
      <span class="w-2.5 h-px bg-ink-faint" />
      <span class="num font-medium">Flat</span>
      {winPlain}
    </div>
  );
};
