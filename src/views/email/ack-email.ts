// Ack / soft proof-prompt email (RENT-ngelwosv).
//
// Sent after a successful submission when the contributor:
//   - provided an email (sub.helpContact !== ''), AND
//   - did NOT attach a proof inline (sub.proofUploadKey === '').
//
// Tone is plain and friendly — modelled on the levels.fyi note the user
// shared. It serves three purposes in one message: (1) confirms receipt
// ("thanks, here's what we got"), (2) explains why verified data matters,
// (3) offers a one-click link to upload a proof later — without nagging.
//
// Inline-styled HTML for client compatibility; plain-text mirror for
// alt-only readers. Pairs with verify-email.ts; both go through
// src/lib/email.ts → Resend.

export type AckEmailParams = {
  societyName: string;
  locality: string;
  bhk: string;
  monthlyRent: number;
  monthlyMaint: number;
  proofUploadURL: string; // full URL, incl. host + /proof/<token>
};

const escapeHTML = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

function formatINR(n: number): string {
  if (n <= 0) return "₹0";
  const s = String(n);
  const lastThree = s.slice(-3);
  const head = s.slice(0, -3);
  if (head === "") return "₹" + lastThree;
  return "₹" + head.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
}

export function ackEmail(p: AckEmailParams): { subject: string; html: string; text: string } {
  const safeSociety = escapeHTML(p.societyName || "your society");
  const safeLocality = escapeHTML(p.locality || "");
  const safeBhk = escapeHTML(p.bhk || "");
  const safeURL = escapeHTML(p.proofUploadURL);
  const rentStr = formatINR(p.monthlyRent);
  const maintStr = formatINR(p.monthlyMaint);

  const subject = `Thanks for your RentLens submission for ${p.societyName || "your society"}`;

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
                <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#9a8e74;margin-bottom:18px;">RentLens · Thanks for the data</div>
                <p style="font-size:15px;line-height:1.55;color:#1a1a1a;margin:0 0 16px 0;">
                  Hi, thanks for adding your rent data to RentLens. Submissions like yours are the only way to keep
                  the picture accurate for the next renter.
                </p>
                <p style="font-size:14px;line-height:1.55;color:#4a4a4a;margin:0 0 22px 0;">
                  Here's what we got:
                </p>
                <div style="font-size:14px;line-height:1.6;color:#1a1a1a;padding:12px 14px;background:#f7f3eb;border-left:2px solid #d4811f;margin:0 0 22px 0;">
                  <strong>${safeSociety}</strong>${safeLocality ? ` · ${safeLocality}` : ""}<br/>
                  ${safeBhk ? safeBhk + "BHK · " : ""}${rentStr}/mo rent${p.monthlyMaint > 0 ? ` · ${maintStr}/mo maintenance` : ""}
                </div>
                <p style="font-size:14px;line-height:1.55;color:#4a4a4a;margin:0 0 16px 0;">
                  If it's something you're open to, sharing a quick proof point — rental agreement, lease screenshot,
                  even a redacted utility bill — helps us verify your entry. It's entirely optional, but verified
                  reports are weighted more heavily and make the dataset more accurate for everyone relying on it.
                </p>
                <p style="margin:0 0 24px 0;">
                  <a href="${safeURL}" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:12px 18px;font-size:14px;font-weight:500;letter-spacing:0.01em;">Add a proof doc</a>
                </p>
                <hr style="border:none;border-top:1px solid #e6dfd0;margin:8px 0 18px 0;" />
                <p style="font-size:12px;line-height:1.55;color:#9a8e74;margin:0;">
                  We never show your email or your proof publicly. Admins use them only to verify entries.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 24px 32px;font-size:11px;color:#bdb29a;">
                RentLens · rentlens.fyi · Pune, India
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `Hi, thanks for adding your rent data to RentLens.

Here's what we got:
  ${p.societyName || "your society"}${p.locality ? " · " + p.locality : ""}
  ${p.bhk ? p.bhk + "BHK · " : ""}${rentStr}/mo rent${p.monthlyMaint > 0 ? " · " + maintStr + "/mo maintenance" : ""}

If it's something you're open to, sharing a quick proof point — rental agreement, lease screenshot, even a redacted utility bill — helps us verify your entry. It's entirely optional, but verified reports are weighted more heavily and make the dataset more accurate for everyone.

Add a proof: ${p.proofUploadURL}

We never show your email or your proof publicly. Admins use them only to verify entries.

RentLens · https://rentlens.fyi
`;

  return { subject, html, text };
}
