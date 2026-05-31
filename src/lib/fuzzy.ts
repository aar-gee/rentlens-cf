// Fuzzy string matching helpers for spelling-tolerant search.
// No external dependencies — implemented inline.

// normalize strips punctuation, collapses whitespace, and lowercases. This
// gives "sobha dream  acres" and "Sobha Dream-Acres" the same canonical form.
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// levenshtein returns the edit distance between two strings.
// O(m*n) with two-row rolling array to keep memory small.
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  // prev[j] = distance between a[0..i-1] and b[0..j-1]
  let prev = new Uint16Array(n + 1);
  let curr = new Uint16Array(n + 1);

  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        curr[j] = prev[j - 1];
      } else {
        curr[j] = 1 + Math.min(prev[j - 1], prev[j], curr[j - 1]);
      }
    }
    // swap
    const tmp = prev;
    prev = curr;
    curr = tmp;
  }
  return prev[n];
}

// buildTrigrams returns the set of character 3-grams (padded with spaces) for
// a string. Padding gives boundary trigrams so "abc" includes " ab", "abc",
// "bc ". Returns a plain object acting as a set for fast intersection.
function buildTrigrams(s: string): Record<string, true> {
  const padded = ` ${s} `;
  const out: Record<string, true> = {};
  for (let i = 0; i <= padded.length - 3; i++) {
    out[padded.slice(i, i + 3)] = true;
  }
  return out;
}

// trigramSimilarity returns the Dice coefficient of two strings using
// character trigrams. Range [0,1]; 1 = identical.
export function trigramSimilarity(a: string, b: string): number {
  if (a.length === 0 && b.length === 0) return 1;
  if (a.length < 2 || b.length < 2) return a === b ? 1 : 0;

  const tA = buildTrigrams(a);
  const tB = buildTrigrams(b);

  const keysA = Object.keys(tA);
  const keysB = Object.keys(tB);

  let intersection = 0;
  for (const k of keysA) {
    if (tB[k]) intersection++;
  }

  // Dice = 2 * |A ∩ B| / (|A| + |B|)
  return (2 * intersection) / (keysA.length + keysB.length);
}

// MatchTier ranks how well a query matched a candidate field.
// Higher = better. Returned per-field; the best tier across all fields is used.
export const enum MatchTier {
  None = 0,
  Fuzzy = 1, // fuzzy / trigram match above threshold
  Substring = 2, // normalized substring match
  Prefix = 3, // normalized prefix match
  Exact = 4, // exact normalized equality
}

// FUZZY_THRESHOLD is the minimum trigram Dice coefficient to consider a
// token-level fuzzy match. Tuned to catch 1-2 char typos on 5+ char tokens
// while avoiding false positives on short words.
const FUZZY_THRESHOLD = 0.4;

// MAX_EDIT_DISTANCE_RATIO: if edit distance / token_length <= this, it's fuzzy.
// 0.35 allows ~1 typo in 3 chars, ~2 typos in 6 chars.
const MAX_EDIT_DISTANCE_RATIO = 0.35;

// tokenize splits a normalized string into words.
function tokenize(s: string): string[] {
  return s.split(" ").filter((t) => t.length > 0);
}

// tokenFuzzyMatch returns true if every query token is matched by at least
// one candidate token via substring, trigram, or Levenshtein.
function tokenFuzzyMatch(queryTokens: string[], candidateTokens: string[]): boolean {
  outer: for (const qt of queryTokens) {
    // short tokens (<=2 chars): only substring match to avoid false positives
    if (qt.length <= 2) {
      for (const ct of candidateTokens) {
        if (ct.includes(qt)) continue outer;
      }
      return false;
    }
    for (const ct of candidateTokens) {
      if (ct.includes(qt) || qt.includes(ct)) continue outer;
      const sim = trigramSimilarity(qt, ct);
      if (sim >= FUZZY_THRESHOLD) continue outer;
      const maxDist = Math.ceil(Math.max(qt.length, ct.length) * MAX_EDIT_DISTANCE_RATIO);
      if (maxDist > 0 && levenshtein(qt, ct) <= maxDist) continue outer;
    }
    return false;
  }
  return true;
}

// scoreTier returns the MatchTier for a query against a single candidate string.
// Both inputs should already be normalized.
export function scoreTier(normQuery: string, normCandidate: string): MatchTier {
  if (normCandidate === "") return MatchTier.None;

  // Exact
  if (normQuery === normCandidate) return MatchTier.Exact;

  // Prefix
  if (normCandidate.startsWith(normQuery)) return MatchTier.Prefix;

  // Substring (full query in candidate or full candidate in query)
  if (normCandidate.includes(normQuery) || normQuery.includes(normCandidate)) return MatchTier.Substring;

  // Token-level fuzzy: every query token must hit at least one candidate token
  const qTokens = tokenize(normQuery);
  const cTokens = tokenize(normCandidate);
  if (qTokens.length > 0 && cTokens.length > 0 && tokenFuzzyMatch(qTokens, cTokens)) {
    return MatchTier.Fuzzy;
  }

  return MatchTier.None;
}
