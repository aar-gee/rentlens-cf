// Email body for the waitlist "your society now has data" notification
// (RENT-swwqpyth). Same inline-styled, dual HTML+text shape as verify-email.ts.

export type WaitlistEmailParams = {
  societyName: string;
  societyUrl: string; // full URL to the society page
};

const escapeHTML = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export function waitlistReadyEmail(p: WaitlistEmailParams): { subject: string; html: string; text: string } {
  const safeSociety = escapeHTML(p.societyName);
  const safeUrl = escapeHTML(p.societyUrl);

  const subject = `${p.societyName} now has resident-reported rents on RentLens`;

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
                <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#9a8e74;margin-bottom:18px;">RentLens · Your waitlist</div>
                <h1 style="font-size:24px;line-height:1.2;font-weight:500;margin:0 0 14px 0;color:#1a1a1a;">${safeSociety} is ready.</h1>
                <p style="font-size:15px;line-height:1.55;color:#4a4a4a;margin:0 0 22px 0;">
                  A while back you asked us to let you know when
                  <strong style="color:#1a1a1a;">${safeSociety}</strong> had real resident-reported rent data. It does
                  now — rent, maintenance, and deposit numbers from people who actually live there.
                </p>
                <p style="margin:0 0 24px 0;">
                  <a href="${safeUrl}" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:12px 18px;font-size:14px;font-weight:500;letter-spacing:0.01em;">See the numbers</a>
                </p>
                <hr style="border:none;border-top:1px solid #e6dfd0;margin:8px 0 18px 0;" />
                <p style="font-size:12px;line-height:1.55;color:#9a8e74;margin:0;">
                  You're getting this once because you joined the waitlist for this society. We won't email you again
                  unless you ask. We never share your email with society pages, builders, or brokers.
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

  const text = `RentLens — ${p.societyName} is ready

A while back you asked us to let you know when ${p.societyName} had real resident-reported rent data. It does now — rent, maintenance, and deposit numbers from people who actually live there.

See the numbers:
${p.societyUrl}

You're getting this once because you joined the waitlist for this society. We won't email you again unless you ask.

RentLens · https://rentlens.fyi
`;

  return { subject, html, text };
}
