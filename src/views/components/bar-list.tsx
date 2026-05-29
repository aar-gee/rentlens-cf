import type { FC } from "hono/jsx";
import type { SourceChannelRow } from "../../data/society-detail";

// BarList — ranked source-channel breakdown. Bar opacity graduates from
// dominant (marigold) to minor (marigold/30) to encode rank visually.

// barFillClass — selected from a closed enum so the class is a literal the
// Tailwind content-scan picks up (and never embeds user input).
function barFillClass(shade: string): string {
  switch (shade) {
    case "marigold/70":
      return "h-full bg-marigold/70";
    case "marigold/50":
      return "h-full bg-marigold/50";
    case "marigold/30":
      return "h-full bg-marigold/30";
    default:
      return "h-full bg-marigold";
  }
}

export const BarList: FC<{ rows: SourceChannelRow[] }> = ({ rows }) => (
  <ul class="space-y-3.5">
    {rows.map((r) => (
      <li>
        <div class="flex items-baseline justify-between text-sm mb-1.5">
          <span class="font-medium">
            {r.label}
            {r.hint ? <span class="text-xs text-ink-faint font-normal num"> {r.hint}</span> : null}
          </span>
          <span class="num text-ink-mute text-xs">
            {r.percent}% · {r.count}
          </span>
        </div>
        <div class="h-1.5 bg-parchment-deep w-full overflow-hidden">
          <div class={barFillClass(r.barShade)} style={`width: ${r.percent}%`} />
        </div>
      </li>
    ))}
  </ul>
);
