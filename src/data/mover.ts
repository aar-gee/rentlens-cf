// Canonical packer-mover brands the submit form's autocomplete surfaces.
// Port of mover.go. Off-list names persist with moverNeedsReview=true.
export const CANONICAL_MOVERS = [
  "Agarwal Packers and Movers",
  "Leo Packers and Movers",
  "Allied Packers and Movers",
  "Writer Relocations",
  "Pikkol",
  "VRL Packers and Movers",
  "DTDC",
  "Porter",
];

export function isCanonicalMover(s: string): boolean {
  const q = s.trim();
  if (q === "") return false;
  return CANONICAL_MOVERS.some((m) => m.toLowerCase() === q.toLowerCase());
}

// searchMovers returns up to maxN canonical movers containing q (case-insensitive).
export function searchMovers(q: string, maxN: number): string[] {
  q = q.trim();
  if (q === "" || maxN <= 0) return [];
  const needle = q.toLowerCase();
  const out: string[] = [];
  for (const m of CANONICAL_MOVERS) {
    if (m.toLowerCase().includes(needle)) {
      out.push(m);
      if (out.length >= maxN) break;
    }
  }
  return out;
}
