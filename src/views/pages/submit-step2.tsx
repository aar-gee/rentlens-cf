import type { FC } from "hono/jsx";
import { Layout } from "../layout";
import { Header } from "../components/header";
import { Footer } from "../components/footer";
import { PreviewBanner, SubmitIntro, submitInputClass } from "./submit";
import {
  FormLabel,
  RadioGroup,
  NumberInput,
  TextInput,
  Textarea,
  Select,
  Rating,
  Checkbox,
  CounterScript,
  type RadioOption,
  type SelectOption,
} from "../components/form";
import { Turnstile } from "../components/turnstile";
import type { Step1Data, Step2Data } from "../../lib/submit";

type Errors = Record<string, string>;

const fiveScaleOptions: RadioOption[] = [
  { value: "1", label: "Poor" },
  { value: "2", label: "Mixed" },
  { value: "3", label: "Good" },
  { value: "4", label: "Very good" },
  { value: "5", label: "Excellent" },
];

const sourceChannelOptions: RadioOption[] = [
  { value: "whatsapp", label: "Society WhatsApp group" },
  { value: "friends", label: "Through friends or family" },
  { value: "broker", label: "Broker" },
  { value: "app", label: "App (NoBroker, MagicBricks, etc.)" },
  { value: "other", label: "Other" },
];

const monthOptions: SelectOption[] = [
  { value: "01", label: "Jan" }, { value: "02", label: "Feb" }, { value: "03", label: "Mar" },
  { value: "04", label: "Apr" }, { value: "05", label: "May" }, { value: "06", label: "Jun" },
  { value: "07", label: "Jul" }, { value: "08", label: "Aug" }, { value: "09", label: "Sep" },
  { value: "10", label: "Oct" }, { value: "11", label: "Nov" }, { value: "12", label: "Dec" },
];

// Rolling list of plausible move years (2027 → 2018, newest first).
const yearOptions: SelectOption[] = Array.from({ length: 2027 - 2018 + 1 }, (_, i) => {
  const y = String(2027 - i);
  return { value: y, label: y };
});

const parseRating = (s: string): number => {
  const n = parseInt(s, 10);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : 0;
};

const Arrow: FC = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M3 7h8m-3-3l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" />
  </svg>
);

const Step1Hidden: FC<{ s1: Step1Data }> = ({ s1 }) => (
  <>
    <input type="hidden" name="society_name" value={s1.societyName} />
    <input type="hidden" name="society_slug" value={s1.societySlug} />
    <input type="hidden" name="locality" value={s1.locality} />
    <input type="hidden" name="bhk" value={s1.bhk} />
    <input type="hidden" name="monthly_rent" value={s1.monthlyRent} />
    <input type="hidden" name="monthly_maint" value={s1.monthlyMaint} />
    <input type="hidden" name="floor_band" value={s1.floorBand} />
    <input type="hidden" name="furnishing" value={s1.furnishing} />
  </>
);

// Step2AHidden — carries Sections A + B answers (filled on Step 2) forward
// into Step 3 so the final /submit/step2b POST has all of step2 to persist.
// Includes everything parseStep2 reads that's "owned" by A + B; the C + D + E
// inputs are emitted as visible form fields on Step 3 itself.
const Step2AHidden: FC<{ s2: Step2Data }> = ({ s2 }) => (
  <>
    <input type="hidden" name="sqft" value={s2.sqft} />
    <input type="hidden" name="deposit" value={s2.deposit} />
    <input type="hidden" name="block" value={s2.block} />
    <input type="hidden" name="move_in_month" value={s2.moveInMonth} />
    <input type="hidden" name="move_in_year" value={s2.moveInYear} />
    <input type="hidden" name="move_out_month" value={s2.moveOutMonth} />
    <input type="hidden" name="move_out_year" value={s2.moveOutYear} />
    <input type="hidden" name="rating_value" value={s2.ratingValue} />
    <input type="hidden" name="rating_quality" value={s2.ratingQuality} />
    <input type="hidden" name="rating_owner" value={s2.ratingOwner} />
    <input type="hidden" name="note" value={s2.note} />
  </>
);

const SectionHeader: FC<{ label: string; title: string; blurb?: string }> = ({ label, title, blurb }) => (
  <div class="border-l-2 border-marigold pl-5">
    <div class="eyebrow mb-2">{label}</div>
    <h2 class="display text-xl sm:text-2xl font-medium tracking-tighter">{title}</h2>
    {blurb ? <p class="text-sm text-ink-mute mt-2 leading-relaxed max-w-[520px]">{blurb}</p> : null}
  </div>
);

const SectionA: FC<{ s2: Step2Data; errors: Errors }> = ({ s2, errors }) => (
  <section class="grid gap-6">
    <SectionHeader
      label="/ Section A · Unit detail"
      title="Your specific flat."
      blurb="Helps the median get sharper. None of this is shown attached to your identity."
    />
    <div class="grid sm:grid-cols-2 gap-6">
      <div>
        <FormLabel forId="submit-sqft" text="Square feet" optional />
        <NumberInput id="submit-sqft" name="sqft" value={s2.sqft} placeholder="e.g. 1180" min={100} max={10000} error={errors.sqft} />
      </div>
      <div>
        <FormLabel forId="submit-deposit" text="Deposit (₹)" optional />
        <NumberInput
          id="submit-deposit"
          name="deposit"
          value={s2.deposit}
          placeholder="e.g. 600000"
          min={0}
          max={5000000}
          helper="Total deposit, not months."
          error={errors.deposit}
        />
      </div>
      <div>
        <FormLabel forId="submit-block" text="Block / Tower" optional />
        <TextInput id="submit-block" name="block" value={s2.block} placeholder="e.g. Tower 4 / A-Block" />
      </div>
      <div>
        <div class="text-xs text-ink-mute mb-1.5">
          Move-in date <span class="text-ink-faint ml-1">(optional)</span>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <Select name="move_in_month" value={s2.moveInMonth} options={monthOptions} hasEmpty emptyLbl="Month" />
          <Select name="move_in_year" value={s2.moveInYear} options={yearOptions} hasEmpty emptyLbl="Year" />
        </div>
      </div>
      <div>
        <div class="text-xs text-ink-mute mb-1.5">
          Move-out date <span class="text-ink-faint ml-1">(optional)</span>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <Select name="move_out_month" value={s2.moveOutMonth} options={monthOptions} hasEmpty emptyLbl="Month" />
          <Select name="move_out_year" value={s2.moveOutYear} options={yearOptions} hasEmpty emptyLbl="Year" />
        </div>
      </div>
    </div>
  </section>
);

const SectionB: FC<{ s2: Step2Data }> = ({ s2 }) => (
  <section class="grid gap-6">
    <SectionHeader
      label="/ Section B · Society experience"
      title="What's it actually like to live there?"
      blurb="Three quick scales plus an open note."
    />
    <div class="grid gap-7">
      <div>
        <FormLabel text="Value for money" optional />
        <RadioGroup name="rating_value" options={fiveScaleOptions} selected={s2.ratingValue} layout="pills" />
      </div>
      <div>
        <FormLabel text="Society quality (build, amenities, staff)" optional />
        <RadioGroup name="rating_quality" options={fiveScaleOptions} selected={s2.ratingQuality} layout="pills" />
      </div>
      <div>
        <FormLabel text="Owner / landlord experience" optional />
        <RadioGroup name="rating_owner" options={fiveScaleOptions} selected={s2.ratingOwner} layout="pills" />
      </div>
      <div>
        <FormLabel forId="submit-note" text="Optional note" optional />
        <Textarea
          id="submit-note"
          name="note"
          value={s2.note}
          placeholder="Water cuts in summer, parking situation, society politics — whatever helps."
          rows={4}
          maxChars={500}
        />
      </div>
    </div>
  </section>
);

const SectionC: FC<{ s2: Step2Data }> = ({ s2 }) => (
  <section class="grid gap-6">
    <SectionHeader
      label="/ Section C · How you found it"
      title="Source channel."
      blurb="Helps us understand how renters actually discover places — and shapes who we partner with later."
    />
    <div class="grid sm:grid-cols-2 gap-6 items-start">
      <div>
        <FormLabel text="Source channel" optional />
        <RadioGroup name="source_channel" options={sourceChannelOptions} selected={s2.sourceChannel} layout="list" />
      </div>
      <div>
        <FormLabel forId="submit-source-detail" text="Source detail" optional />
        <TextInput
          id="submit-source-detail"
          name="source_detail"
          value={s2.sourceDetail}
          placeholder="Broker name, app name, or other"
          helper="Optional — name of broker / app / etc."
        />
      </div>
    </div>
  </section>
);

const SectionD: FC<{ s2: Step2Data; errors: Errors }> = ({ s2, errors }) => (
  <section class="grid gap-6">
    <SectionHeader
      label="/ Section D · Movers"
      title="Who moved your stuff?"
      blurb="If you used a packer-mover, name them so we can build a small trusted list."
    />
    <div class="grid sm:grid-cols-2 gap-6 items-start">
      <div>
        <FormLabel forId="submit-mover-name" text="Mover company" optional />
        <div class="relative">
          <input
            id="submit-mover-name"
            type="text"
            name="mover_name"
            value={s2.moverName}
            placeholder="e.g. Agarwal Packers"
            class={submitInputClass(errors.mover_name)}
            hx-get="/movers/search"
            hx-trigger="keyup changed delay:300ms"
            hx-target="#submit-mover-results"
            hx-swap="innerHTML"
            autocomplete="off"
          />
          <input type="hidden" name="mover_canonical" id="submit-mover-canonical" value={s2.moverCanonical} />
          <div
            id="submit-mover-results"
            data-picker-input="submit-mover-name"
            class="absolute left-0 right-0 top-full mt-1 z-50 text-left"
          />
        </div>
        <p class="text-xs text-ink-faint leading-relaxed mt-1.5">
          Pick from the list — or type a new name and select "Add new". We'll review duplicates later.
        </p>
      </div>
      <div>
        <FormLabel text="Mover rating" optional />
        <Rating name="mover_rating" selected={parseRating(s2.moverRating)} />
        <p class="text-xs text-ink-faint mt-2">Rate the packer-mover's service — 1 (poor) to 5 (excellent).</p>
      </div>
    </div>
  </section>
);

const SectionE: FC<{ s2: Step2Data; errors: Errors }> = ({ s2, errors }) => (
  <section class="grid gap-6">
    <SectionHeader
      label="/ Section E · Help future renters"
      title="Willing to be reached, occasionally?"
      blurb="Only if you opt in — and only with your explicit consent each time."
    />
    <div class="bg-parchment-deep/40 border border-hairline p-6 grid gap-5">
      <Checkbox
        name="willing_to_help"
        value="yes"
        checked={s2.willingToHelp}
        label="I'd be willing to help future renters of this society find a flat."
        description="We'll never share your contact. You can opt out anytime."
      />
      <div>
        <FormLabel forId="submit-help-contact" text="Contact email" optional />
        <TextInput
          id="submit-help-contact"
          name="help_contact"
          value={s2.helpContact}
          placeholder="you@example.com"
          type="email"
          helper="We'll only contact you about future renter intros if you check the box above. Skip if you'd rather not."
          error={errors.help_contact}
        />
      </div>
    </div>
  </section>
);

// SubmitStep2A — sections A (unit detail) + B (society experience). All
// optional. Continue button POSTs to /submit/step2a which validates the A/B
// fields and renders Step 3. No Turnstile here: this step doesn't persist
// or mutate anything — Step 1 already gated bots into the flow and Step 3
// re-gates at the final persist boundary.
export const SubmitStep2A: FC<{ step1: Step1Data; step2: Step2Data; errors: Errors }> = ({
  step1,
  step2,
  errors,
}) => (
  <Layout
    meta={{
      title: "Add more detail — RentLens",
      description: "Optional: your specific flat + what living there was like.",
      path: "/submit",
      ogType: "website",
    }}
  >
    <Header />
    <PreviewBanner />
    <main class="px-5 sm:px-8 py-10 sm:py-16">
      <div class="max-w-narrow mx-auto">
        <SubmitIntro step={2} />
        <form action="/submit/step2a" method="post" class="mt-10 sm:mt-12 grid gap-12 sm:gap-14" novalidate>
          <Step1Hidden s1={step1} />
          <SectionA s2={step2} errors={errors} />
          <SectionB s2={step2} />
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 pt-2 border-t border-hairline">
            <a href="/submit" class="text-ink-mute hover:text-ink text-sm font-medium link-u">
              ← Start over
            </a>
            <button
              type="submit"
              class="inline-flex items-center justify-center gap-2 bg-ink hover:bg-ink/90 transition-colors text-parchment px-7 py-4 text-base font-medium tracking-tight"
            >
              Continue
              <Arrow />
            </button>
          </div>
        </form>
      </div>
    </main>
    <Footer figLabel="Fig. 04 — Submit step 2" />
    <CounterScript />
  </Layout>
);

// SubmitStep2B — sections C (source) + D (movers) + E (help future renters).
// All optional. Carries Step 1 + Step 2A state via hidden fields. Two submit
// buttons share one form via HTML5 formaction: "Back" reposts to
// /submit/back-step2a (re-renders Step 2A with all current state preserved),
// "Submit" posts to /submit/step2b (final persist + verify trigger). Turnstile
// gates the final POST since this is the only step that mutates DB.
export const SubmitStep2B: FC<{ step1: Step1Data; step2: Step2Data; errors: Errors; siteKey?: string }> = ({
  step1,
  step2,
  errors,
  siteKey,
}) => (
  <Layout
    meta={{
      title: "A bit more context — RentLens",
      description: "Optional: how you found the place, who moved you, and an opt-in to help future renters.",
      path: "/submit",
      ogType: "website",
    }}
  >
    <Header />
    <PreviewBanner />
    <main class="px-5 sm:px-8 py-10 sm:py-16">
      <div class="max-w-narrow mx-auto">
        <SubmitIntro step={3} />
        <form action="/submit/step2b" method="post" class="mt-10 sm:mt-12 grid gap-12 sm:gap-14" novalidate>
          <Step1Hidden s1={step1} />
          <Step2AHidden s2={step2} />
          <SectionC s2={step2} />
          <SectionD s2={step2} errors={errors} />
          <SectionE s2={step2} errors={errors} />
          <Turnstile siteKey={siteKey} error={errors.turnstile} />
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 pt-2 border-t border-hairline">
            <div class="flex items-center gap-5">
              <a href="/submit" class="text-ink-mute hover:text-ink text-sm font-medium link-u">
                ← Start over
              </a>
              <button
                type="submit"
                formaction="/submit/back-step2a"
                formnovalidate
                class="text-ink-mute hover:text-ink text-sm font-medium link-u bg-transparent border-0 cursor-pointer p-0"
              >
                ← Back
              </button>
            </div>
            <button
              type="submit"
              class="inline-flex items-center justify-center gap-2 bg-marigold hover:bg-marigold-deep transition-colors text-parchment px-7 py-4 text-base font-medium tracking-tight"
            >
              Submit
              <Arrow />
            </button>
          </div>
        </form>
      </div>
    </main>
    <Footer figLabel="Fig. 05 — Submit step 3" />
    <CounterScript />
  </Layout>
);
