import type { FC } from "hono/jsx";

// Header renders the dark top navigation that appears on every public page.
// Ported from the Go repo's components/header.templ — keep visual parity.
export const Header: FC = () => (
  <header class="bg-ink text-parchment">
    <div class="max-w-wide mx-auto px-5 sm:px-8 py-4 sm:py-5 flex items-center justify-between gap-4">
      <div class="flex items-center gap-6 sm:gap-12">
        <a href="/" class="display text-2xl font-medium tracking-tightest leading-none">
          RentLens<span class="text-marigold">.</span>
        </a>
        <nav class="hidden lg:flex items-center gap-7 text-sm text-parchment/75">
          <a href="/societies" class="link-u hover:text-parchment">Browse</a>
          <a href="/how-it-works" class="link-u hover:text-parchment">How it works</a>
          <a href="/privacy" class="link-u hover:text-parchment">Privacy</a>
        </nav>
      </div>
      <div class="flex items-center gap-4 sm:gap-6">
        <span class="eyebrow !text-parchment/55 hidden md:inline">Bengaluru · v0.1</span>
        <a
          href="/submit"
          class="inline-flex items-center gap-2 bg-marigold hover:bg-marigold-deep transition-colors text-parchment px-4 py-2.5 text-sm font-medium tracking-tight whitespace-nowrap"
        >
          Submit rent
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" class="hidden sm:block">
            <path d="M3 7h8m-3-3l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" />
          </svg>
        </a>
      </div>
    </div>
  </header>
);
