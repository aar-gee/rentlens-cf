// /verify pages (RENT-ahstlnjb). Three states:
//   - Verify: the contributor lands here after submit (or via the email's
//             "enter the code" path). Shows the masked email + a 6-digit
//             code input, plus a re-send button if the code expired.
//   - Success: the contributor clicked the magic link OR entered the code.
//   - Error: token unknown / expired / locked / submission unknown.
//
// All three share the Layout/Header/Footer/PreviewBanner shell from the rest
// of the site so it doesn't feel like a different app.

import type { FC } from "hono/jsx";
import { Layout } from "../layout";
import { Header } from "../components/header";
import { Footer } from "../components/footer";
import { PreviewBanner } from "./submit";

// maskEmail — show enough to confirm "yes that's mine" without echoing the
// full address into HTML (which is then in browser history, CDN logs, etc.).
// "rahul@teamohana.com" → "r***l@teamohana.com".
export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at < 1) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at);
  if (local.length <= 2) return `${local[0]}***${domain}`;
  return `${local[0]}${"*".repeat(Math.min(3, local.length - 2))}${local[local.length - 1]}${domain}`;
}

export type VerifyState =
  | { kind: "ask"; submissionId: string; maskedEmail: string; error?: string; attemptsRemaining?: number; cooldownSeconds?: number; pre?: boolean }
  | { kind: "success"; societyName: string; societySlug: string }
  | { kind: "pre_success"; maskedEmail: string }
  | { kind: "already_verified"; societyName: string; societySlug: string }
  | { kind: "expired"; submissionId: string; maskedEmail: string }
  | { kind: "locked"; submissionId: string; maskedEmail: string }
  | { kind: "not_found" };

const META = {
  title: "Verify your report — RentLens",
  description: "Confirm your email to finish submitting your rent report.",
  path: "/verify",
  ogType: "website",
};

export const Verify: FC<{ state: VerifyState }> = ({ state }) => (
  <Layout meta={META}>
    <Header />
    <PreviewBanner />
    <main class="px-5 sm:px-8 py-14 sm:py-24">
      <div class="max-w-narrow mx-auto">{renderState(state)}</div>
    </main>
    <Footer figLabel="Fig. 04 — Verify email" />
  </Layout>
);

function renderState(state: VerifyState) {
  switch (state.kind) {
    case "ask":
      return <AskForm state={state} />;
    case "success":
      return <Success state={state} />;
    case "pre_success":
      return <PreSuccess state={state} />;
    case "already_verified":
      return <AlreadyVerified state={state} />;
    case "expired":
      return <Expired state={state} />;
    case "locked":
      return <Locked state={state} />;
    case "not_found":
      return <NotFound />;
  }
}

const Eyebrow: FC<{ children?: unknown }> = ({ children }) => (
  <div class="eyebrow mb-3">/ {children as any}</div>
);

const Heading: FC<{ children?: unknown }> = ({ children }) => (
  <h1 class="display text-4xl sm:text-6xl md:text-7xl font-normal tracking-tightest leading-[1] mb-6 text-center">
    {children as any}
  </h1>
);

// ---- ask: code-entry form ----

const AskForm: FC<{ state: Extract<VerifyState, { kind: "ask" }> }> = ({ state }) => (
  <div class="text-center">
    <Eyebrow>Verify your email</Eyebrow>
    <Heading>One last step.</Heading>
    <p class="text-base sm:text-lg text-ink-mute max-w-[520px] mx-auto leading-relaxed">
      We sent a 6-digit code to <span class="text-ink font-medium">{state.maskedEmail}</span>. Enter it below — or
      click the verify link in the email instead. Both expire in 30 minutes.
    </p>
    {state.error ? (
      <div class="mt-6 mx-auto max-w-[420px] border border-marigold-deep bg-marigold/10 px-4 py-3 text-sm text-ink leading-relaxed text-left">
        {state.error}
        {state.attemptsRemaining !== undefined && state.attemptsRemaining > 0 ? (
          <span class="block mt-1 text-xs text-ink-mute">
            {state.attemptsRemaining} {state.attemptsRemaining === 1 ? "try" : "tries"} left before you need a new code.
          </span>
        ) : null}
      </div>
    ) : null}
    <form
      method="post"
      action="/verify"
      class="mt-8 mx-auto max-w-[420px] flex flex-col items-stretch gap-4"
    >
      <input type="hidden" name="id" value={state.submissionId} />
      <input
        type="text"
        name="code"
        inputmode="numeric"
        pattern="[0-9]{6}"
        maxlength={6}
        autocomplete="one-time-code"
        required
        placeholder="000000"
        class="num text-center text-3xl sm:text-4xl tracking-[0.32em] px-4 py-5 bg-white border border-hairline focus:border-ink focus:outline-none"
      />
      <button
        type="submit"
        class="bg-ink text-parchment px-5 py-3.5 text-sm font-medium tracking-tight hover:bg-ink/90 transition-colors"
      >
        Verify report
      </button>
    </form>

    <div class="mt-8 text-xs text-ink-faint leading-relaxed">
      Didn't get it? Check spam, then{" "}
      <form
        method="post"
        action="/verify/resend"
        class="inline"
      >
        <input type="hidden" name="id" value={state.submissionId} />
        <button type="submit" class="underline hover:text-ink-mute">
          send a new code
        </button>
      </form>
      .
      {state.cooldownSeconds && state.cooldownSeconds > 0 ? (
        <span class="block mt-1">
          (You can resend in {state.cooldownSeconds}s.)
        </span>
      ) : null}
    </div>

    <p class="mt-10 text-xs text-ink-faint max-w-[420px] mx-auto leading-relaxed">
      Your report is saved either way. If you don't verify, it stays unverified — admins still review it, but it won't
      count toward the "verified resident" tier on the society page.
    </p>
  </div>
);

// ---- success ----

const checkBadge = (
  <div class="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-marigold/15 mb-7">
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" class="text-marigold">
      <path d="M8 16l5 5 11-11" stroke="currentColor" stroke-width="2.25" stroke-linecap="square" stroke-linejoin="miter" />
    </svg>
  </div>
);

// PreSuccess — verification done at Step 1 (no submission yet). Send the
// contributor back to /submit to finish their report; the rl_preverify cookie
// stays alive (30min) and gets attached at final-submit time.
const PreSuccess: FC<{ state: Extract<VerifyState, { kind: "pre_success" }> }> = ({ state }) => (
  <div class="text-center">
    {checkBadge}
    <Eyebrow>Email verified</Eyebrow>
    <Heading>You're verified.</Heading>
    <p class="text-base sm:text-lg text-ink-mute max-w-[520px] mx-auto leading-relaxed">
      Thanks — we'll mark any report you submit with{" "}
      <span class="text-ink font-medium">{state.maskedEmail}</span> as a verified resident contribution.
    </p>
    <div class="mt-10">
      <a
        href="/submit"
        class="inline-block bg-marigold hover:bg-marigold-deep transition-colors text-parchment px-7 py-4 text-base font-medium tracking-tight"
      >
        Continue your submission
      </a>
    </div>
  </div>
);

const Success: FC<{ state: Extract<VerifyState, { kind: "success" }> }> = ({ state }) => (
  <div class="text-center">
    {checkBadge}
    <Eyebrow>Verified</Eyebrow>
    <Heading>You're verified.</Heading>
    <p class="text-base sm:text-lg text-ink-mute max-w-[520px] mx-auto leading-relaxed">
      Thanks — your report for <span class="text-ink font-medium">{state.societyName}</span> is now flagged as a
      verified resident contribution. We'll publish it after a quick moderation pass.
    </p>
    <div class="mt-12 grid sm:grid-cols-2 gap-3 sm:gap-4 max-w-[520px] mx-auto text-left">
      <a
        href={state.societySlug !== "" ? `/societies/${state.societySlug}` : "/"}
        class="block bg-white border border-hairline p-5 hover:border-ink transition-colors"
      >
        <div class="text-sm font-medium text-ink mb-1.5">Browse your society</div>
        <div class="text-xs text-ink-mute leading-relaxed">See the page you just contributed to.</div>
      </a>
      <a href="/submit" class="block bg-white border border-hairline p-5 hover:border-ink transition-colors">
        <div class="text-sm font-medium text-ink mb-1.5">Submit another report</div>
        <div class="text-xs text-ink-mute leading-relaxed">Got a friend's place to add? Or a previous lease?</div>
      </a>
    </div>
  </div>
);

const AlreadyVerified: FC<{ state: Extract<VerifyState, { kind: "already_verified" }> }> = ({ state }) => (
  <div class="text-center">
    {checkBadge}
    <Eyebrow>Already verified</Eyebrow>
    <Heading>This one's done.</Heading>
    <p class="text-base sm:text-lg text-ink-mute max-w-[520px] mx-auto leading-relaxed">
      Your report for <span class="text-ink font-medium">{state.societyName}</span> was already verified — nothing
      more to do. If you clicked the email link twice, that's normal.
    </p>
    <div class="mt-10">
      <a
        href={state.societySlug !== "" ? `/societies/${state.societySlug}` : "/"}
        class="inline-block bg-ink text-parchment px-5 py-3 text-sm font-medium tracking-tight hover:bg-ink/90 transition-colors"
      >
        Browse the society
      </a>
    </div>
  </div>
);

// ---- error variants ----

const Expired: FC<{ state: Extract<VerifyState, { kind: "expired" }> }> = ({ state }) => (
  <div class="text-center">
    <Eyebrow>Code expired</Eyebrow>
    <Heading>This link's stale.</Heading>
    <p class="text-base sm:text-lg text-ink-mute max-w-[520px] mx-auto leading-relaxed">
      The verification code we sent to <span class="text-ink font-medium">{state.maskedEmail}</span> expired (codes
      last 30 minutes). Request a new one and we'll send a fresh code + link.
    </p>
    <form method="post" action="/verify/resend" class="mt-8">
      <input type="hidden" name="id" value={state.submissionId} />
      <button
        type="submit"
        class="bg-ink text-parchment px-5 py-3 text-sm font-medium tracking-tight hover:bg-ink/90 transition-colors"
      >
        Send a new code
      </button>
    </form>
  </div>
);

const Locked: FC<{ state: Extract<VerifyState, { kind: "locked" }> }> = ({ state }) => (
  <div class="text-center">
    <Eyebrow>Too many tries</Eyebrow>
    <Heading>Let's start over.</Heading>
    <p class="text-base sm:text-lg text-ink-mute max-w-[520px] mx-auto leading-relaxed">
      Five wrong codes in a row — this verification is locked. Request a new code (sent to{" "}
      <span class="text-ink font-medium">{state.maskedEmail}</span>) and try again.
    </p>
    <form method="post" action="/verify/resend" class="mt-8">
      <input type="hidden" name="id" value={state.submissionId} />
      <button
        type="submit"
        class="bg-ink text-parchment px-5 py-3 text-sm font-medium tracking-tight hover:bg-ink/90 transition-colors"
      >
        Send a new code
      </button>
    </form>
  </div>
);

const NotFound: FC = () => (
  <div class="text-center">
    <Eyebrow>Not found</Eyebrow>
    <Heading>We can't find that.</Heading>
    <p class="text-base sm:text-lg text-ink-mute max-w-[520px] mx-auto leading-relaxed">
      That verification link doesn't match anything in our system. It may have been mistyped, or the report it pointed
      to was deleted. If you just submitted a report and meant to verify it, please re-submit from{" "}
      <a class="underline hover:text-ink-mute" href="/submit">
        the submit page
      </a>
      .
    </p>
  </div>
);
