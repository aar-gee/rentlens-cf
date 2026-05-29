import type { FC } from "hono/jsx";

// Port of components/contribute_cta.templ. Empty societyName → homepage copy;
// set → society-specific variant.
const Arrow: FC = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M3 7h8m-3-3l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" />
  </svg>
);

const ContributeCTAHome: FC = () => (
  <section id="contribute" class="px-5 sm:px-8 py-20 sm:py-28 bg-ink text-parchment relative overflow-hidden">
    <div aria-hidden="true" class="absolute inset-0 opacity-[0.07] pointer-events-none">
      <div class="absolute top-0 left-0 sm:left-[10%] w-px h-full bg-parchment" />
      <div class="absolute top-0 right-0 sm:right-[10%] w-px h-full bg-parchment" />
      <div class="absolute bottom-12 left-0 right-0 sm:left-[10%] sm:right-[10%] h-px bg-parchment" />
    </div>
    <div class="max-w-[900px] mx-auto text-center relative">
      <div class="eyebrow !text-parchment/50 mb-5">/ Contribute</div>
      <h2 class="display text-3xl sm:text-5xl md:text-6xl font-normal leading-[1] mb-7">
        Know what you pay?
        <br />
        <span class="emph-accent">Pay it forward.</span>
      </h2>
      <p class="text-base sm:text-lg text-parchment/70 max-w-[540px] mx-auto mb-10 leading-relaxed">
        Sixty seconds. Anonymous by default. Every report makes the next renter's search a little less blind.
      </p>
      <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
        <a
          href="/submit"
          class="inline-flex items-center gap-2 bg-marigold hover:bg-marigold-deep transition-colors text-parchment px-7 py-4 text-base font-medium tracking-tight"
        >
          Submit your rent data
          <Arrow />
        </a>
        <a href="/how-it-works" class="text-parchment/75 hover:text-parchment text-sm link-u">
          or see how the data works
        </a>
      </div>
      <div class="mt-16 sm:mt-20 pt-10 border-t border-parchment/10 grid grid-cols-2 md:grid-cols-4 gap-8 text-left">
        <div>
          <div class="num text-2xl font-medium">412</div>
          <div class="eyebrow !text-parchment/50 mt-1">Reports</div>
        </div>
        <div>
          <div class="num text-2xl font-medium">30</div>
          <div class="eyebrow !text-parchment/50 mt-1">Societies</div>
        </div>
        <div>
          <div class="num text-2xl font-medium">4</div>
          <div class="eyebrow !text-parchment/50 mt-1">Areas covered</div>
        </div>
        <div>
          <div class="num text-2xl font-medium">100%</div>
          <div class="eyebrow !text-parchment/50 mt-1">Anonymous</div>
        </div>
      </div>
    </div>
  </section>
);

const ContributeCTASociety: FC<{ name: string }> = ({ name }) => (
  <section id="contribute" class="px-5 sm:px-8 py-20 sm:py-24 bg-ink text-parchment relative overflow-hidden">
    <div aria-hidden="true" class="absolute inset-0 opacity-[0.07] pointer-events-none">
      <div class="absolute top-0 left-0 sm:left-[10%] w-px h-full bg-parchment" />
      <div class="absolute top-0 right-0 sm:right-[10%] w-px h-full bg-parchment" />
    </div>
    <div class="max-w-narrow mx-auto text-center relative">
      <div class="eyebrow !text-parchment/50 mb-5">/ Contribute</div>
      <h2 class="display text-3xl sm:text-5xl font-normal leading-[1] mb-6">
        Know what you pay at {name}?
        <br />
        <span class="emph-accent">Help the next renter.</span>
      </h2>
      <p class="text-base sm:text-lg text-parchment/70 max-w-[540px] mx-auto mb-9 leading-relaxed">
        Sixty seconds. Anonymous by default. Reports auto-show on this page after a quick moderation pass.
      </p>
      <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
        <a
          href="/submit"
          class="inline-flex items-center gap-2 bg-marigold hover:bg-marigold-deep transition-colors text-parchment px-7 py-4 text-base font-medium tracking-tight"
        >
          Submit rent for {name}
          <Arrow />
        </a>
        <a href="/how-it-works" class="text-parchment/75 hover:text-parchment text-sm link-u">
          or see how the data works
        </a>
      </div>
    </div>
  </section>
);

export const ContributeCTA: FC<{ societyName?: string }> = ({ societyName }) =>
  societyName && societyName !== "" ? <ContributeCTASociety name={societyName} /> : <ContributeCTAHome />;
