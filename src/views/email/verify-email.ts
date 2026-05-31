// Email body for the verification mail (RENT-ahstlnjb). Returns both an HTML
// and a plain-text version — Resend (and well-behaved mail clients) prefer
// having both.
//
// Inline-styled HTML, no <style> tag, no external assets — that's the
// recommended shape for transactional mail because every mail client mangles
// stylesheets differently. Plain text mirrors the link + code so Plaintext-
// only clients (Apple Mail "Plain Text", some terminal MUAs) still work.
//
// We escape the society name + code before interpolating since those can
// theoretically contain HTML-significant characters (society name yes, the
// 6-digit numeric code can't, but defense-in-depth costs nothing).

export type VerifyEmailParams = {
  societyName: string;
  code: string;
  magicLink: string; // full URL incl. host
  ttlMinutes: number; // typically 30
};

const escapeHTML = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export function verifyEmail(p: VerifyEmailParams): { subject: string; html: string; text: string } {
  const safeSociety = escapeHTML(p.societyName);
  const safeCode = escapeHTML(p.code);
  const safeLink = escapeHTML(p.magicLink);
  const ttl = String(p.ttlMinutes);

  const subject = `Verify your RentLens report for ${p.societyName}`;

  // Inline-styled HTML. Colors picked to mirror the site's ink/marigold palette
  // but in raw hex (mail clients strip Tailwind). Single column, max-width
  // ~520px (Gmail's clip width is ~600px).
  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHTML(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f7f3eb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1a1a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f7f3eb;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#ffffff;border:1px solid #e6dfd0;">
            <tr>
              <td style="padding:32px 32px 16px 32px;">
                <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#9a8e74;margin-bottom:18px;">RentLens · Verify your report</div>
                <h1 style="font-size:24px;line-height:1.2;font-weight:500;margin:0 0 14px 0;color:#1a1a1a;">Confirm it's really you.</h1>
                <p style="font-size:15px;line-height:1.55;color:#4a4a4a;margin:0 0 22px 0;">
                  You (or someone using this email) just submitted a rent report for
                  <strong style="color:#1a1a1a;">${safeSociety}</strong>. To make sure the report came from a real
                  resident, confirm your email in one of two ways below. The link and code both expire in ${ttl} minutes.
                </p>

                <div style="margin:0 0 8px 0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#9a8e74;">Option A — click the link</div>
                <p style="margin:0 0 22px 0;">
                  <a href="${safeLink}" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:12px 18px;font-size:14px;font-weight:500;letter-spacing:0.01em;">Verify my report</a>
                </p>

                <div style="margin:0 0 8px 0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#9a8e74;">Option B — enter the code</div>
                <p style="margin:0 0 4px 0;font-size:14px;color:#4a4a4a;">Paste this 6-digit code on the verify page:</p>
                <div style="font-family:'SF Mono',ui-monospace,Menlo,Consolas,monospace;font-size:30px;letter-spacing:0.18em;color:#1a1a1a;padding:14px 0 22px 0;">
                  ${safeCode}
                </div>

                <hr style="border:none;border-top:1px solid #e6dfd0;margin:8px 0 18px 0;" />
                <p style="font-size:12px;line-height:1.55;color:#9a8e74;margin:0;">
                  If you didn't submit anything on RentLens, ignore this email — nothing was added on your behalf
                  and the code will expire on its own. We never share your email with society pages, builders, or
                  brokers.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 24px 32px;font-size:11px;color:#bdb29a;">
                RentLens · rentlens.fyi
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `RentLens — verify your rent report

You (or someone using this email) just submitted a rent report for ${p.societyName} on RentLens.
Confirm your email in one of two ways. Both expire in ${ttl} minutes.

Option A — click this link:
${p.magicLink}

Option B — enter this 6-digit code on the verify page:
${p.code}

If you didn't submit anything, ignore this email. Nothing was added on your behalf and the code will expire on its own.

RentLens · https://rentlens.fyi
`;

  return { subject, html, text };
}
