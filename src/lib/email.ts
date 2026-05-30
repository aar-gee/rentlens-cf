// Single email-send interface, per CLAUDE.md §8: "Email sending must go
// through a single sendEmail() interface in src/lib/ (Resend-backed when
// wired). Do not call fetch('https://api.resend.com/…') from a route directly
// — provider-swap should be a one-file change."
//
// Backend today: Resend (POST https://api.resend.com/emails). When CF Email
// Service exits beta, swap the if-RESEND-key branch for a binding call — the
// route surface stays identical (cf. RENT-ahstlnjb comment thread).
//
// No-op gate: when RESEND_API_KEY is unset (local dev, tests, staging before
// the secret is loaded), we log the would-be send to console and return a
// synthetic id. This mirrors the Turnstile no-op gate and lets the verify
// flow be exercised end-to-end without a key.

export type EmailEnv = {
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string; // override; defaults to verify@rentlens.fyi
};

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string; // plain-text fallback — required by good-citizen mail clients
  // Optional: override sender per-message (e.g. receipts vs verifications).
  from?: string;
  // Optional: Reply-To (e.g. point support replies to hello@).
  replyTo?: string;
};

export type EmailResult = { ok: true; id: string } | { ok: false; error: string; status?: number };

const DEFAULT_FROM = "RentLens <verify@rentlens.fyi>";

export async function sendEmail(env: EmailEnv, msg: EmailMessage): Promise<EmailResult> {
  const key = env.RESEND_API_KEY?.trim();
  const from = msg.from ?? env.EMAIL_FROM ?? DEFAULT_FROM;

  // No-op gate. Mirrors the Turnstile no-op so local dev / pre-secret staging
  // don't crash. Subject + a hint of the body go to console so devs can
  // copy-paste the magic link / code without a real mailbox.
  if (!key) {
    console.log(
      `[email:noop] would send to=${msg.to} from=${from} subject=${JSON.stringify(msg.subject)} text-preview=${JSON.stringify(msg.text.slice(0, 240))}`,
    );
    return { ok: true, id: `noop-${crypto.randomUUID()}` };
  }

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
      }),
    });
    if (!resp.ok) {
      // Resend returns { name, message, statusCode } on errors. Log status
      // and a short body slice — never the full request body (that contains
      // the recipient address; CLAUDE.md §9 "No PII in logs" applies).
      let bodyPreview = "";
      try {
        bodyPreview = (await resp.text()).slice(0, 240);
      } catch {
        // ignore
      }
      console.log(`[email:err] resend status=${resp.status} body=${JSON.stringify(bodyPreview)}`);
      return { ok: false, error: `resend ${resp.status}`, status: resp.status };
    }
    const data = (await resp.json()) as { id?: string };
    return { ok: true, id: data.id ?? "" };
  } catch (e) {
    const msgStr = e instanceof Error ? e.message : String(e);
    console.log(`[email:err] resend fetch failed: ${msgStr}`);
    return { ok: false, error: msgStr };
  }
}
