// Currency / number formatting — port of the Go repo's components/format.go.

// formatINR renders a rupee amount in Indian-style grouping with a leading
// rupee glyph (105000 → "₹1,05,000"). Callers handle null before calling.
export function formatINR(n: number): string {
  let neg = false;
  if (n < 0) {
    neg = true;
    n = -n;
  }
  const s = String(Math.trunc(n));
  let prefix = "";
  let last = "";
  if (s.length <= 3) {
    last = s;
  } else {
    last = s.slice(-3);
    let left = s.slice(0, -3);
    const groups: string[] = [];
    while (left.length > 2) {
      groups.unshift(left.slice(-2));
      left = left.slice(0, -2);
    }
    if (left !== "") groups.unshift(left);
    prefix = groups.join(",");
  }
  const sign = neg ? "-" : "";
  return prefix === "" ? `₹${sign}${last}` : `₹${sign}${prefix},${last}`;
}

// formatRange formats a low/high pair as "₹L – ₹H". Returns "" if either null.
export function formatRange(low: number | null, high: number | null): string {
  if (low == null || high == null) return "";
  return `${formatINR(low)} – ${formatINR(high)}`;
}

// formatCompactINR returns "₹55k" for amounts < 1,00,000, else full grouping.
export function formatCompactINR(n: number): string {
  if (n < 100000) return `₹${Math.trunc(n / 1000)}k`;
  return formatINR(n);
}

// formatINRRange renders a low/high pair in compact "₹55k – ₹72k" style.
// Returns "" if both sides are zero.
export function formatINRRange(low: number, high: number): string {
  if (low === 0 && high === 0) return "";
  return `${formatCompactINR(low)} – ${formatCompactINR(high)}`;
}

// formatINRPlus renders a positive premium like "+₹3,500".
export function formatINRPlus(n: number): string {
  if (n < 0) return formatINR(n);
  return `+${formatINR(n)}`;
}

// reportsLabel renders the report-count text ("N reports" / "1 report" / "— reports").
export function reportsLabel(rc: number | null): string {
  if (rc == null) return "— reports";
  if (rc === 1) return "1 report";
  return `${rc} reports`;
}

// signedPercent renders an int as "+6%" / "−15%" with a proper minus glyph.
export function signedPercent(p: number): string {
  if (p > 0) return `+${p}%`;
  if (p < 0) return `−${-p}%`;
  return "0%";
}
