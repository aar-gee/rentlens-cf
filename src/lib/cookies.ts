// Minimal cookie helpers used by the pre-submit email-verification flow
// (RENT-ahstlnjb continued). Single cookie: rl_preverify=<pre_verification_id>.
//
// Not signed. The cookie's only superpower is "let the next submit attach
// this pre-verification to its submission" — and the attach logic re-checks
// that the cookie's pre-verification row's email matches the submitted
// helpContact, so an attacker with a stolen cookie ID can at most attach
// their own previously-verified email to a fresh submission. No PII or
// authority is conveyed.
//
// Attributes: HttpOnly (no XSS read), Secure (HTTPS only — also fine on
// localhost in dev because Workers serve http://localhost as Secure-eligible),
// SameSite=Lax (CSRF-safe defaults; allows top-level navigations from email
// clients), Path=/, Max-Age=1800 (30 min — same as the pre-verification TTL).

export const PREVERIFY_COOKIE = "rl_preverify";
export const PREVERIFY_TTL_S = 30 * 60;

// readCookie — fetch a single cookie value from a Hono context. Returns ""
// when the cookie is absent or empty.
export function readCookie(cookieHeader: string | undefined, name: string): string {
  if (!cookieHeader) return "";
  // Cookie header format: "k1=v1; k2=v2". Split + trim + match name=.
  const parts = cookieHeader.split(";");
  for (const p of parts) {
    const trimmed = p.trim();
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const k = trimmed.slice(0, eq);
    if (k === name) return decodeURIComponent(trimmed.slice(eq + 1));
  }
  return "";
}

// preverifyCookieHeader — Set-Cookie value to install the pre-verification ID.
// Hono's c.header('Set-Cookie', ...) accepts the raw string.
export function preverifyCookieHeader(preVerificationId: string): string {
  const v = encodeURIComponent(preVerificationId);
  return `${PREVERIFY_COOKIE}=${v}; Max-Age=${PREVERIFY_TTL_S}; HttpOnly; Secure; SameSite=Lax; Path=/`;
}

// clearPreverifyCookieHeader — Set-Cookie value to delete the cookie. Used
// after the pre-verification is attached to a submission (no longer useful).
export function clearPreverifyCookieHeader(): string {
  return `${PREVERIFY_COOKIE}=; Max-Age=0; HttpOnly; Secure; SameSite=Lax; Path=/`;
}
