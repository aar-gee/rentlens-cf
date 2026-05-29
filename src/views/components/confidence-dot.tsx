import type { FC } from "hono/jsx";

// confidenceDot — the small coloured dot used in confidence footers.
// color: "success" | "ink-faint" | (anything else → marigold).
export const ConfidenceDot: FC<{ color: string }> = ({ color }) => {
  if (color === "success") return <span class="w-1.5 h-1.5 rounded-full bg-success" />;
  if (color === "ink-faint") return <span class="w-1.5 h-1.5 rounded-full bg-ink-faint" />;
  return <span class="w-1.5 h-1.5 rounded-full bg-marigold" />;
};
