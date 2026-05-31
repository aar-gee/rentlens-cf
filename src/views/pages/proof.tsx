// /proof/<token> page — late-upload landing for the optional rental-agreement
// proof feature (RENT-tscofnqc / RENT-ngelwosv).
//
// Four states:
//   - ask:           single-page upload form (file picker + submit)
//   - already_done:  this submission already has a proof on file
//   - not_found:     token doesn't match any submission (typo or already-used)
//   - upload_error:  validation rejected the file (too large / wrong type)
//
// Client-side image downscale via canvas keeps photos under the 500 KB hard
// limit even when the source is a multi-MB phone photo. PDFs aren't
// downscaled (rejected with a clear "compress and try again" message if
// over-limit). Both happen INLINE via JS before the form submits — see
// PROOF_UPLOAD_SCRIPT in views/scripts.ts.

import type { FC } from "hono/jsx";
import { Layout } from "../layout";
import { Header } from "../components/header";
import { Footer } from "../components/footer";
import { PreviewBanner } from "./submit";
import { Turnstile } from "../components/turnstile";

export type ProofPageState =
  | { kind: "ask"; token: string; societyName: string; error?: string }
  | { kind: "already_done"; societyName: string; societySlug: string }
  | { kind: "not_found" };

const META = {
  title: "Add a rental agreement — RentLens",
  description: "Optionally share proof to strengthen your rent report.",
  path: "/proof",
  ogType: "website",
};

export const ProofPage: FC<{ state: ProofPageState; siteKey?: string }> = ({ state, siteKey }) => (
  <Layout meta={META}>
    <Header />
    <PreviewBanner />
    <main class="px-5 sm:px-8 py-14 sm:py-24">
      <div class="max-w-narrow mx-auto">{renderState(state, siteKey)}</div>
    </main>
    <Footer />
  </Layout>
);

function renderState(state: ProofPageState, siteKey?: string) {
  switch (state.kind) {
    case "ask":
      return <Ask state={state} siteKey={siteKey} />;
    case "already_done":
      return <AlreadyDone state={state} />;
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

const Ask: FC<{ state: Extract<ProofPageState, { kind: "ask" }>; siteKey?: string }> = ({ state, siteKey }) => (
  <div class="text-center">
    <Eyebrow>Add proof</Eyebrow>
    <Heading>Verify your report.</Heading>
    <p class="text-base sm:text-lg text-ink-mute max-w-[560px] mx-auto leading-relaxed">
      If you'd like, share a quick proof — rental agreement, lease screenshot, or even a redacted utility bill — for{" "}
      <span class="text-ink font-medium">{state.societyName}</span>. Entirely optional, but verified reports are
      weighted more heavily and make the picture sharper for everyone.
    </p>
    {state.error ? (
      <div class="mt-6 mx-auto max-w-[480px] border-l-2 border-danger bg-danger/15 px-4 py-3 text-sm text-danger text-left leading-relaxed">
        {state.error}
      </div>
    ) : null}

    <form
      action={`/proof/${state.token}`}
      method="post"
      enctype="multipart/form-data"
      class="mt-8 mx-auto max-w-[480px] grid gap-4"
      data-proof-form
    >
      <input
        id="proof-file"
        name="file"
        type="file"
        required
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
        class="block w-full text-sm text-ink-mute file:mr-4 file:py-2.5 file:px-4 file:border file:border-hairline file:bg-white file:text-sm file:text-ink hover:file:border-ink file:cursor-pointer cursor-pointer"
      />
      <div id="proof-status" class="text-xs text-ink-faint leading-relaxed text-left" hidden />
      <Turnstile siteKey={siteKey} />
      <button
        type="submit"
        class="bg-ink text-parchment px-5 py-3.5 text-sm font-medium tracking-tight hover:bg-ink/90 transition-colors"
      >
        Upload proof
      </button>
    </form>

    <p class="mt-8 text-xs text-ink-faint max-w-[480px] mx-auto leading-relaxed">
      Up to 500 KB. JPG / PNG / WebP / HEIC / PDF. Photos auto-shrink in your browser before upload — large PDFs
      need to be compressed first. We never show proofs publicly; admins use them only to verify entries.
    </p>
  </div>
);

const checkBadge = (
  <div class="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-marigold/15 mb-7">
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" class="text-marigold">
      <path d="M8 16l5 5 11-11" stroke="currentColor" stroke-width="2.25" stroke-linecap="square" stroke-linejoin="miter" />
    </svg>
  </div>
);

const AlreadyDone: FC<{ state: Extract<ProofPageState, { kind: "already_done" }> }> = ({ state }) => (
  <div class="text-center">
    {checkBadge}
    <Eyebrow>Proof received</Eyebrow>
    <Heading>You're set.</Heading>
    <p class="text-base sm:text-lg text-ink-mute max-w-[520px] mx-auto leading-relaxed">
      We already have a proof on file for your <span class="text-ink font-medium">{state.societyName}</span> report.
      Thanks for sharing — admins will weight your entry as verified.
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

const NotFound: FC = () => (
  <div class="text-center">
    <Eyebrow>Not found</Eyebrow>
    <Heading>We can't find that.</Heading>
    <p class="text-base sm:text-lg text-ink-mute max-w-[520px] mx-auto leading-relaxed">
      That proof-upload link doesn't match anything in our system. It may have been mistyped, or the report it
      pointed to was deleted. If you just submitted a report and meant to add proof, please re-submit from{" "}
      <a class="underline hover:text-ink-mute" href="/submit">
        the submit page
      </a>
      .
    </p>
  </div>
);
