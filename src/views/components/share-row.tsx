import type { FC } from "hono/jsx";

// Zero-JS share row. Pure anchor links (WhatsApp / X / email) — no clipboard
// script, so nothing to add to scripts.ts and no CSP surface. WhatsApp leads
// because it's how rental intel actually spreads in Bengaluru.
//
// `url` must be absolute (share targets reject relative). `text` is the
// pre-composed message; we append the URL where each channel expects it.

const wa = (text: string, url: string) => `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`;
const x = (text: string, url: string) =>
  `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
const mail = (subject: string, text: string, url: string) =>
  `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text + "\n\n" + url)}`;

const ChipBase =
  "inline-flex items-center gap-2 border border-hairline hover:border-ink hover:bg-parchment-deep/50 transition-colors px-3.5 py-2 text-sm text-ink no-underline";

export const ShareRow: FC<{ url: string; text: string; subject?: string; label?: string }> = ({
  url,
  text,
  subject,
  label,
}) => (
  <section class="px-5 sm:px-8 py-10 sm:py-12 border-t border-hairline">
    <div class="max-w-wide mx-auto flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
      <div class="eyebrow flex-shrink-0">{label && label !== "" ? label : "/ Share these numbers"}</div>
      <div class="flex flex-wrap items-center gap-3">
        <a href={wa(text, url)} target="_blank" rel="noopener" class={ChipBase} aria-label="Share on WhatsApp">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" class="text-marigold-deep">
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.8 14.01c-.24.68-1.2 1.26-1.97 1.42-.53.11-1.22.2-3.56-.76-2.99-1.24-4.91-4.27-5.06-4.47-.15-.2-1.21-1.61-1.21-3.07 0-1.46.77-2.18 1.04-2.48.27-.3.59-.37.79-.37.2 0 .39.01.56.01.18 0 .42-.07.66.5.24.58.82 2.01.89 2.16.07.15.12.32.02.52-.1.2-.15.32-.3.49-.15.17-.31.38-.45.51-.15.15-.3.31-.13.6.17.29.76 1.25 1.63 2.03 1.12 1 2.07 1.31 2.36 1.46.29.15.46.12.63-.07.17-.2.73-.85.93-1.14.2-.29.39-.24.66-.15.27.1 1.7.8 1.99.95.29.15.48.22.55.34.07.12.07.71-.17 1.39z" />
          </svg>
          WhatsApp
        </a>
        <a href={x(text, url)} target="_blank" rel="noopener" class={ChipBase} aria-label="Share on X">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          X
        </a>
        <a href={mail(subject ?? "Real rent numbers from RentLens", text, url)} class={ChipBase} aria-label="Share by email">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <rect x="3" y="5" width="18" height="14" rx="1" />
            <path d="M3 6l9 7 9-7" />
          </svg>
          Email
        </a>
      </div>
    </div>
  </section>
);
