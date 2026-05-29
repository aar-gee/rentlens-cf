// newShortID returns an 8-char base32 ID (lowercased RFC-4648 alphabet,
// no padding) from 5 bytes of crypto entropy. Direct port of the Go repo's
// newShortID (submission_store.go) — used for submissions, pending
// society/area, contacts, admin actions, and seeded society/alias rows.
const BASE32 = "abcdefghijklmnopqrstuvwxyz234567"; // RFC 4648, lowercased

export function newShortID(): string {
  const b = new Uint8Array(5);
  crypto.getRandomValues(b);
  // 5 bytes = 40 bits = 8 × 5-bit groups → 8 base32 chars, no padding.
  let bits = 0;
  let value = 0;
  let out = "";
  for (let i = 0; i < b.length; i++) {
    value = (value << 8) | b[i];
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    out += BASE32[(value << (5 - bits)) & 31];
  }
  return out;
}
