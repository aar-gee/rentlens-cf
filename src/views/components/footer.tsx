import type { FC } from "hono/jsx";

// Footer renders the light bottom footer that closes every page.
// figLabel overrides the bottom-strip fig marker; empty → "Fig. 01 — Homepage".
// Ported from the Go repo's components/footer.templ.
export const Footer: FC<{ figLabel?: string }> = ({ figLabel }) => (
  <footer class="px-5 sm:px-8 py-10 sm:py-12 border-t border-hairline">
    <div class="max-w-wide mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6">
      <div class="flex items-center gap-3 text-sm">
        <span class="display text-lg">RentLens<span class="text-marigold">.</span></span>
        <span class="text-ink-faint">Built in Bengaluru · 2026</span>
      </div>
      <div class="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-ink-mute">
        <a href="/how-it-works" class="link-u">Methodology</a>
        <a href="/how-it-works#faq" class="link-u">FAQ</a>
        <a href="/privacy" class="link-u">Privacy</a>
        <a href="/terms" class="link-u">Terms</a>
        <span class="text-hairline-strong">·</span>
        <a href="/contact" class="link-u">Contact</a>
      </div>
    </div>
    <div class="max-w-wide mx-auto mt-8 pt-6 border-t border-hairline/50 flex items-center gap-3">
      <span class="num text-[10px] text-ink-faint tracking-[0.14em] uppercase">
        {figLabel && figLabel !== "" ? figLabel : "Fig. 01 — Homepage"}
      </span>
      <span class="flex-1 h-px bg-hairline" />
      <span class="num text-[10px] text-ink-faint tracking-[0.14em] uppercase">v0.1 · MVP</span>
    </div>
  </footer>
);
