// Canonical Bengaluru localities the submit form's picker offers. Port of
// area.go. "Other" is the picker's escape hatch (not in this list); typed
// off-list values route through the pending-area queue.
export const CANONICAL_AREAS = [
  "Whitefield",
  "Hoodi",
  "Brookefield",
  "Nallurhalli",
  "Marathahalli",
  "Bellandur",
  "Sarjapur Road",
  "Panathur",
  "HSR Layout",
  "ORR (Outer Ring Road)",
  "CV Raman Nagar",
  "Domlur",
  "Koramangala",
  "Indiranagar",
  "JP Nagar",
  "Banashankari",
  "Hebbal",
  "Thanisandra",
  "Yelahanka",
  "Kanakapura Road",
];

export const isCanonicalArea = (s: string): boolean => CANONICAL_AREAS.includes(s);

// searchAreas returns up to maxN canonical areas containing q (case-insensitive).
export function searchAreas(q: string, maxN: number): string[] {
  q = q.trim();
  if (q === "" || maxN <= 0) return [];
  const needle = q.toLowerCase();
  const out: string[] = [];
  for (const a of CANONICAL_AREAS) {
    if (a.toLowerCase().includes(needle)) {
      out.push(a);
      if (out.length >= maxN) break;
    }
  }
  return out;
}
