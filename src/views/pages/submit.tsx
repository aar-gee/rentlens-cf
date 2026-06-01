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
      <span class="num text-marigold-deep tracking-[0.14em] uppercase flex-shrink-0">Review</span>
      <span>
        Your report is reviewed before it appears on the site — usually within a day or two.
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

// PreStatus — pre-submit email verification state, threaded from the route
// via the loadPreStatus() helper in index.tsx. Mirrors the type there; kept
// inline so the views layer doesn't import from the route file.
export type PreStatus = { kind: "verified" | "pending"; email: string } | undefined;

// EmailVerifyBlock renders the email field in one of three states:
//   none      → email input + "Verify email" button (HTMX → /email/verify-now)
//   pending   → hidden email + "Sent — enter code" + inline code-entry form
//   verified  → hidden email + ✓ verified + "Use different" link
//
// State marker `<span id="email-verify-state" data-state="...">` lives INSIDE
// the #email-verify-status div so HTMX swaps update the marker together with
// the visible content. SUBMIT_NUDGE_SCRIPT reads data-state on Step 1
// Continue/Skip to decide whether to interrupt the submit.
const EmailVerifyBlock: FC<{ step1: Step1Data; errors: Errors; preStatus: PreStatus }> = ({
  step1,
  errors,
  preStatus,
}) => {
  if (preStatus?.kind === "verified") {
    return (
      <FieldRow label="Your email" optional>
        <input type="hidden" name="email" value={preStatus.email} />
        <div id="email-verify-status">
          <span id="email-verify-state" data-state="verified" hidden />
          <div class="flex items-center gap-3 bg-marigold/10 border border-marigold/30 px-4 py-3">
            <svg width="16" height="16" viewBox="0 0 16 16" class="text-marigold-deep flex-shrink-0">
              <path d="M4 8l3 3 5-6" stroke="currentColor" stroke-width="2" stroke-linecap="square" fill="none" />
            </svg>
            <div class="text-sm text-ink leading-relaxed flex-1">
              Verified <span class="font-medium">{preStatus.email}</span>
            </div>
            <button
              type="submit"
              form="x-rl-clear-verify"
              class="text-xs text-ink-mute hover:text-ink underline"
            >
              Use different
            </button>
          </div>
        </div>
      </FieldRow>
    );
  }
  if (preStatus?.kind === "pending") {
    return (
      <FieldRow label="Your email" optional>
        <input type="hidden" name="email" value={preStatus.email} />
        <div id="email-verify-status" class="grid gap-3">
          <span id="email-verify-state" data-state="pending" hidden />
          <div class="text-xs text-marigold-deep leading-relaxed">
            We sent a verification link + 6-digit code to{" "}
            <span class="font-medium">{preStatus.email}</span>. Click the link in your inbox, or paste the code below.
          </div>
          <div class="flex items-stretch gap-2">
            {/* The pre-verification id lives only in the cookie; the server
                resolves it on POST /verify when `id` is empty by reading the
                cookie. We post empty here. Inputs reference the sibling
                #x-rl-verify-code form (defined outside the step1 form) via the
                `form` attribute — see the comment on the helper forms above. */}
            <input type="hidden" name="id" value="" form="x-rl-verify-code" />
            <input
              type="text"
              name="code"
              form="x-rl-verify-code"
              inputmode="numeric"
              pattern="[0-9]{6}"
              maxlength={6}
              autocomplete="one-time-code"
              required
              placeholder="000000"
              class="num text-center text-base tracking-[0.22em] px-3 py-2 bg-white border border-hairline focus:border-ink focus:outline-none flex-1"
            />
            <button
              type="submit"
              form="x-rl-verify-code"
              class="bg-ink text-parchment px-4 py-2 text-xs font-medium tracking-tight hover:bg-ink/90 transition-colors"
            >
              Verify
            </button>
          </div>
        </div>
      </FieldRow>
    );
  }
  // none
  return (
    <FieldRow
      label="Your email"
      helper="We'll send a quick verification — adds credibility to your report."
      optional
    >
      <div class="grid gap-2">
        <input
          id="submit-email"
          type="email"
          name="email"
          value={step1.email}
          placeholder="you@example.com"
          class={submitInputClass(errors.email)}
          autocomplete="email"
          maxlength={254}
        />
        {/* Inline as-you-type error from EMAIL_VALIDATE_SCRIPT. Hidden by
            default (display:none via the [hidden] attr); the JS flips
            style.display directly to avoid any CSS specificity fights. Sized
            up + iconified so it doesn't get lost. */}
        <div
          id="email-format-error"
          hidden
          class="flex items-start gap-2 border-l-2 border-danger bg-danger/15 px-3 py-2 text-sm text-danger leading-relaxed"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="text-danger flex-shrink-0 mt-0.5">
            <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" />
            <path d="M8 4.5v4M8 11v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
          <span>That doesn't look like a valid email. Check for typos like a missing dot or a comma.</span>
        </div>
        <div id="email-verify-status">
          <span id="email-verify-state" data-state="none" hidden />
          <button
            type="button"
            hx-post="/email/verify-now"
            hx-include="#submit-email, [name='cf-turnstile-response']"
            hx-target="#email-verify-status"
            hx-swap="innerHTML"
            class="self-start text-xs font-medium text-marigold-deep hover:text-marigold underline"
          >
            Verify email →
          </button>
        </div>
        {errors.email ? (
          <div class="text-xs text-danger mt-0.5">{errors.email}</div>
        ) : (
          <div class="text-xs text-ink-faint leading-relaxed">
            Optional. Verified reports are weighted more heavily and surfaced as "verified resident" on the society
            page. We never show your email publicly or share it with anybody.
          </div>
        )}
      </div>
    </FieldRow>
  );
};

const Step1Fields: FC<{ step1: Step1Data; errors: Errors; preStatus: PreStatus }> = ({ step1, errors, preStatus }) => (
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

    <EmailVerifyBlock step1={step1} errors={errors} preStatus={preStatus} />
    <RentalProofBlock step1={step1} />
  </>
);

// RentalProofBlock — optional inline rental-agreement upload on Step 1.
// File goes to R2 immediately on pick via STAGE_PROOF_SCRIPT (which calls
// the existing client-side downscale logic + POSTs to /submit/stage-proof).
// The returned R2 key writes into the hidden #staged-proof-key input which
// Step1Hidden ferries through Steps 2 → 3. On final persist, buildSubmission
// promotes it to the submission's proof_upload_key.
//
// The visible status string + button reflect the staged state on re-render
// (so a 422 re-render of Step 1 doesn't lose the picked file).
const RentalProofBlock: FC<{ step1: Step1Data }> = ({ step1 }) => {
  const hasStaged = step1.stagedProofKey !== "";
  return (
    <FieldRow
      label="Rental agreement"
      helper="Optional photo / PDF — adds credibility, weighted more heavily."
      optional
    >
      <div class="grid gap-2" data-step1-proof>
        <input type="hidden" id="staged-proof-key" name="staged_proof_key" value={step1.stagedProofKey} />
        <div
          id="step1-proof-controls"
          class="flex items-center gap-3"
          data-hidden-when-staged={hasStaged ? "true" : "false"}
          hidden={hasStaged}
        >
          <input
            id="step1-proof-file"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
            class="block text-sm text-ink-mute file:mr-3 file:py-2 file:px-3 file:border file:border-hairline file:bg-white file:text-xs file:text-ink hover:file:border-ink file:cursor-pointer cursor-pointer"
          />
        </div>
        <div id="step1-proof-status" class="text-xs leading-relaxed" hidden={!hasStaged}>
          {hasStaged ? (
            <span class="text-marigold-deep">
              ✓ Proof attached.{" "}
              <button type="button" data-step1-proof-clear class="underline hover:text-ink-mute">
                Remove
              </button>
            </span>
          ) : null}
        </div>
        <div class="text-xs text-ink-faint leading-relaxed">
          Up to 500 KB. Photos auto-shrink in your browser. We never show proofs publicly — admins use them only to
          verify entries.
        </div>
      </div>
    </FieldRow>
  );
};

export const Submit: FC<{ step1: Step1Data; errors: Errors; siteKey?: string; preStatus?: PreStatus }> = ({
  step1,
  errors,
  siteKey,
  preStatus,
}) => (
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
        {/* Helper forms placed OUTSIDE the main step1 <form>. The inline
            "Verify" (pending) + "Use different" (verified) controls reference
            these via the `form` attribute instead of being wrapped in their
            own <form>. A nested <form> would be silently dropped by the HTML5
            parser, and its </form> would close the OUTER step1 form early —
            orphaning the Step 1 submit buttons so clicks would do nothing. */}
        <form
          id="x-rl-verify-code"
          hx-post="/verify"
          hx-target="#email-verify-status"
          hx-swap="innerHTML"
          hidden
        />
        <form id="x-rl-clear-verify" action="/email/clear-verify" method="post" hidden />
        <form action="/submit/step1" method="post" class="mt-10 sm:mt-12 grid gap-8 sm:gap-10" novalidate data-step1-form data-submit-form>
          <Step1Fields step1={step1} errors={errors} preStatus={preStatus} />
          <Turnstile siteKey={siteKey} error={errors.turnstile} />

          {/* Soft nudge: a real <dialog> modal opened by SUBMIT_NUDGE_SCRIPT
              when the user clicks Continue / Skip with state='none' AND an
              email typed. ESC + click-on-backdrop dismiss. The dialog's
              `[open]` state is what controls visibility — no Tailwind class
              on the dialog itself (because `display: …` classes fight the
              native `dialog:not([open]) { display: none }` rule). The inner
              wrapper carries the visible styling. */}
          <dialog
            id="email-nudge"
            class="p-0 bg-transparent backdrop:bg-ink/40"
          >
            <div class="bg-parchment max-w-md w-[calc(100vw-2rem)] border border-marigold/40 px-6 py-5 grid gap-4">
              <div class="eyebrow text-marigold-deep">/ Heads up</div>
              <div class="text-base text-ink leading-relaxed">
                You haven't verified your email yet. Verification gives your report more credibility.
              </div>
              <div class="flex flex-col sm:flex-row gap-3 sm:items-center">
                <button
                  type="button"
                  data-nudge-verify
                  class="bg-ink text-parchment px-5 py-2.5 text-sm font-medium tracking-tight hover:bg-ink/90 transition-colors"
                >
                  Verify first
                </button>
                <button
                  type="button"
                  data-nudge-continue
                  class="text-sm font-medium text-ink-mute hover:text-ink underline self-start sm:self-center"
                >
                  Continue without verifying
                </button>
              </div>
            </div>
          </dialog>

          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 pt-2 border-t border-hairline">
            <div class="text-xs text-ink-mute leading-relaxed max-w-[360px]">
              We review submissions before publishing. Your identity is never shown publicly.
            </div>
            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-5">
              <button
                name="skip_step2"
                value="true"
                type="submit"
                data-step1-submit
                class="text-ink-mute hover:text-ink transition-colors text-sm font-medium link-u order-2 sm:order-1"
              >
                Submit only minimum data
              </button>
              <button
                type="submit"
                data-step1-submit
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
    <Footer />
  </Layout>
);
