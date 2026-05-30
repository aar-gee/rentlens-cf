import type { FC, PropsWithChildren } from "hono/jsx";
import { Layout } from "../layout";
import { Header } from "../components/header";
import { Footer } from "../components/footer";
import { FormLabel, RadioGroup, NumberInput, type RadioOption } from "../components/form";
import { Turnstile } from "../components/turnstile";
import type { Step1Data } from "../../lib/submit";

type Errors = Record<string, string>;

const bhkOptions: RadioOption[] = [
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "2.5", label: "2.5" },
  { value: "3", label: "3" },
  { value: "3.5", label: "3.5" },
  { value: "4+", label: "4+" },
];

// "G" (ground) is its own band — keep in sync with lib/submit ALLOWED_FLOOR_BAND.
const floorBandOptions: RadioOption[] = [
  { value: "G", label: "Ground" },
  { value: "1-3", label: "1 – 3" },
  { value: "4-7", label: "4 – 7" },
  { value: "8-15", label: "8 – 15" },
  { value: "15-21", label: "15 – 21" },
  { value: "21+", label: "21+" },
];

const furnishingOptions: RadioOption[] = [
  { value: "unfurnished", label: "Unfurnished" },
  { value: "semi", label: "Semi-furnished" },
  { value: "fully", label: "Fully furnished" },
];

// Shared submit-page chrome (reused by step 2 + success).
export const PreviewBanner: FC = () => (
  <div class="bg-parchment-deep border-b border-hairline px-5 sm:px-8 py-3">
    <div class="max-w-base mx-auto text-xs text-ink-mute flex items-start sm:items-center gap-2 leading-relaxed">
      <span class="w-1.5 h-1.5 rounded-full bg-marigold mt-1.5 sm:mt-0 flex-shrink-0" />
      <span class="num text-marigold-deep tracking-[0.14em] uppercase flex-shrink-0">Preview</span>
      <span>
        RentLens is in preview. Your report is saved and enters a moderation queue before it appears on the site.
      </span>
    </div>
  </div>
);

// step: 1 (society/rent core), 2 (unit detail + experience), 3 (source +
// movers + help future renters). Step 2 was previously one giant 5-section
// page; per RENT-tpsfwybf we split it into 2+3 sections to reduce perceived
// length / drop-off. Total step count is now 3.
export const SubmitIntro: FC<{ step: 1 | 2 | 3 }> = ({ step }) => (
  <div>
    <div class="flex items-center gap-3 mb-4">
      <span class="eyebrow">/ Contribute</span>
      <span class="h-px w-8 bg-hairline-strong" />
      <span class="num text-[10px] tracking-[0.14em] uppercase text-ink-faint">
        Step {String(step).padStart(2, "0")} of 3
      </span>
    </div>
    {step === 1 ? (
      <>
        <h1 class="display text-3xl sm:text-5xl md:text-6xl font-normal tracking-tightest leading-[1.02]">
          Submit your rent.
        </h1>
        <p class="mt-5 text-base sm:text-lg text-ink-mute max-w-[560px] leading-relaxed">
          Seven quick fields. Helps future renters of your society see real numbers, not asking prices.
        </p>
      </>
    ) : step === 2 ? (
      <>
        <h1 class="display text-3xl sm:text-5xl md:text-6xl font-normal tracking-tightest leading-[1.02]">
          Your flat + experience. <span class="text-ink-faint">Optional.</span>
        </h1>
        <p class="mt-5 text-base sm:text-lg text-ink-mute max-w-[600px] leading-relaxed">
          Sharper details — square feet, deposit, what it's actually like to live there. Skip whatever you'd rather
          not share; the core report you just filled in is already useful.
        </p>
      </>
    ) : (
      <>
        <h1 class="display text-3xl sm:text-5xl md:text-6xl font-normal tracking-tightest leading-[1.02]">
          A bit more context. <span class="text-ink-faint">Optional.</span>
        </h1>
        <p class="mt-5 text-base sm:text-lg text-ink-mute max-w-[600px] leading-relaxed">
          How you found the place, who moved you, and an opt-in to help future renters. Still skippable — we just
          appreciate the extra context.
        </p>
      </>
    )}
  </div>
);

// fieldRow — the two-column label/helper + control pattern.
export const FieldRow: FC<PropsWithChildren<{ label: string; helper?: string; required?: boolean; optional?: boolean }>> = ({
  label,
  helper,
  required,
  optional,
  children,
}) => (
  <div class="grid sm:grid-cols-[200px_1fr] gap-3 sm:gap-10 items-start">
    <div>
      <div class="text-xs text-ink-mute mb-1.5">
        {label}
        {required ? (
          <span class="text-danger ml-0.5">*</span>
        ) : optional ? (
          <span class="text-ink-faint ml-1">(optional)</span>
        ) : null}
      </div>
      {helper ? <p class="text-xs text-ink-faint leading-relaxed mt-1 hidden sm:block">{helper}</p> : null}
    </div>
    <div>{children}</div>
  </div>
);

export function submitInputClass(err?: string): string {
  let base =
    "search-shell w-full bg-white border border-hairline px-4 py-3 text-sm outline-none placeholder:text-ink-faint focus:border-marigold";
  if (err) base += " border-danger";
  return base;
}

const Arrow: FC = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M3 7h8m-3-3l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" />
  </svg>
);

const Step1Fields: FC<{ step1: Step1Data; errors: Errors }> = ({ step1, errors }) => (
  <>
    {/* Society name with HTMX picker-mode autocomplete */}
    <div class="grid sm:grid-cols-[200px_1fr] gap-3 sm:gap-10 items-start">
      <div>
        <FormLabel forId="submit-society-name" text="Society name" required />
        <p class="text-xs text-ink-faint leading-relaxed mt-1 hidden sm:block">
          Start typing — we'll match against known societies.
        </p>
      </div>
      <div class="relative">
        <input
          id="submit-society-name"
          type="text"
          name="society_name"
          value={step1.societyName}
          placeholder="e.g. Prestige Shantiniketan"
          class={submitInputClass(errors.society_name)}
          hx-get="/search?mode=picker"
          hx-trigger="keyup changed delay:300ms"
          hx-target="#submit-society-results"
          hx-swap="innerHTML"
          autocomplete="off"
        />
        <input type="hidden" name="society_slug" id="submit-society-slug" value={step1.societySlug} />
        <div
          id="submit-society-results"
          data-picker-input="submit-society-name"
          class="absolute left-0 right-0 top-full mt-1 z-50 text-left"
        />
        {errors.society_name ? (
          <div class="text-xs text-danger mt-1.5">{errors.society_name}</div>
        ) : (
          <div class="text-xs text-ink-faint mt-1.5">
            Can't find yours? Just type the name — we'll add it during moderation.
          </div>
        )}
      </div>
    </div>

    <FieldRow label="Area / locality" helper="Start typing — pick from the list or add a new one." required>
      <div class="relative">
        <input
          id="submit-locality"
          type="text"
          name="locality"
          value={step1.locality}
          placeholder="e.g. Whitefield"
          class={submitInputClass(errors.locality)}
          hx-get="/areas/search"
          hx-trigger="keyup changed delay:300ms"
          hx-target="#submit-locality-results"
          hx-swap="innerHTML"
          autocomplete="off"
          maxlength={100}
        />
        <div
          id="submit-locality-results"
          data-picker-input="submit-locality"
          class="absolute left-0 right-0 top-full mt-1 z-50 text-left"
        />
        {errors.locality ? (
          <div class="text-xs text-danger mt-1.5">{errors.locality}</div>
        ) : (
          <div class="text-xs text-ink-faint mt-1.5">
            Can't find yours? Type the name — we'll add it during moderation.
          </div>
        )}
      </div>
    </FieldRow>

    <FieldRow label="BHK" helper="How many bedrooms." required>
      <RadioGroup name="bhk" options={bhkOptions} selected={step1.bhk} layout="pills" />
      {errors.bhk ? <div class="text-xs text-danger mt-2">{errors.bhk}</div> : null}
    </FieldRow>

    <FieldRow label="Monthly rent (₹)" helper="Just rent — maintenance is a separate field below." required>
      <NumberInput
        id="submit-monthly-rent"
        name="monthly_rent"
        value={step1.monthlyRent}
        placeholder="e.g. 62000"
        min={5000}
        max={500000}
        helper="Between ₹5,000 and ₹5,00,000."
        error={errors.monthly_rent}
      />
    </FieldRow>

    <FieldRow label="Monthly maintenance (₹)" helper="Society maintenance — not rent." required>
      <NumberInput
        id="submit-monthly-maint"
        name="monthly_maint"
        value={step1.monthlyMaint}
        placeholder="e.g. 5200"
        min={0}
        max={50000}
        helper="Use 0 if you don't pay any."
        error={errors.monthly_maint}
      />
    </FieldRow>

    <FieldRow label="Floor band" helper="Rough floor range — keeps things anonymous." required>
      <RadioGroup name="floor_band" options={floorBandOptions} selected={step1.floorBand} layout="pills" />
      {errors.floor_band ? <div class="text-xs text-danger mt-2">{errors.floor_band}</div> : null}
    </FieldRow>

    <FieldRow label="Furnishing" required>
      <RadioGroup name="furnishing" options={furnishingOptions} selected={step1.furnishing} layout="list" />
      {errors.furnishing ? <div class="text-xs text-danger mt-2">{errors.furnishing}</div> : null}
    </FieldRow>
  </>
);

export const Submit: FC<{ step1: Step1Data; errors: Errors; siteKey?: string }> = ({ step1, errors, siteKey }) => (
  <Layout
    meta={{
      title: "Submit your rent — RentLens",
      description: "Add your rent, maintenance, and deposit so the next renter sees real numbers.",
      path: "/submit",
      ogType: "website",
    }}
  >
    <Header />
    <PreviewBanner />
    <main class="px-5 sm:px-8 py-10 sm:py-16">
      <div class="max-w-narrow mx-auto">
        <SubmitIntro step={1} />
        <form action="/submit/step1" method="post" class="mt-10 sm:mt-12 grid gap-8 sm:gap-10" novalidate>
          <Step1Fields step1={step1} errors={errors} />
          <Turnstile siteKey={siteKey} error={errors.turnstile} />
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 pt-2 border-t border-hairline">
            <div class="text-xs text-ink-mute leading-relaxed max-w-[360px]">
              We review submissions before publishing. Your identity is never shown publicly.
            </div>
            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-5">
              <button
                name="skip_step2"
                value="true"
                type="submit"
                class="text-ink-mute hover:text-ink transition-colors text-sm font-medium link-u order-2 sm:order-1"
              >
                Submit only minimum data
              </button>
              <button
                type="submit"
                class="inline-flex items-center justify-center gap-2 bg-marigold hover:bg-marigold-deep transition-colors text-parchment px-7 py-4 text-base font-medium tracking-tight order-1 sm:order-2"
              >
                Continue
                <Arrow />
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
    <Footer figLabel="Fig. 03 — Submit step 1" />
  </Layout>
);
