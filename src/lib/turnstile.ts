// Cloudflare Turnstile server-side verification. Gated: when TURNSTILE_SECRET
// is unset (local dev / pre-config) verification is a no-op so the forms still
// work. The site key is public (rendered in the widget); the secret verifies
// the token Turnstile returns. See views/components/turnstile.tsx for the widget.
const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstile(
  secret: string | undefined,
  token: string,
  remoteIp?: string,
): Promise<boolean> {
  if (!secret) return true; // Turnstile disabled (no secret configured)
  if (!token) return false;
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  if (remoteIp) form.append("remoteip", remoteIp);
  try {
    const resp = await fetch(SITEVERIFY, { method: "POST", body: form });
    const data = (await resp.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

// The standard error message shown when verification fails.
export const TURNSTILE_ERROR = "Please complete the verification challenge and try again.";
