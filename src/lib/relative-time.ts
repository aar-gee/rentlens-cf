// relativeTime formats an ISO-8601 timestamp as a coarse distance from now.
// Port of the Go repo's components/relative_time.go.
//   < 1m    → "just now"
//   1m–1h   → "Xm ago"
//   1h–24h  → "Xh ago"
//   24h–48h → "yesterday"
//   > 48h   → "X days ago"
// Future timestamps are treated as "just now" (clock drift on preview data).
export function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const d = Date.now() - t;
  const MIN = 60_000;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;
  if (d < MIN) return "just now";
  if (d < HOUR) return `${Math.floor(d / MIN)}m ago`;
  if (d < DAY) return `${Math.floor(d / HOUR)}h ago`;
  if (d < 2 * DAY) return "yesterday";
  return `${Math.floor(d / DAY)} days ago`;
}
