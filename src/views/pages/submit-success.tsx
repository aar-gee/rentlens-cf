import type { FC } from "hono/jsx";
import { Layout } from "../layout";
import { Header } from "../components/header";
import { Footer } from "../components/footer";
import { PreviewBanner } from "./submit";
import { ShareButtons } from "../components/share-row";
import type { Submission } from "../../data/submission";

const HOST = "https://rentlens.fyi";

const browseHref = (sub: Submission) => (sub.societySlug !== "" ? `/societies/${sub.societySlug}` : "/");

// Share-after-submit: absolute URL + message for the centered share block.
// Points at the society page when we have one (a neighbour lands on real
// numbers + an obvious "add yours"); otherwise the submit form.
const shareUrl = (sub: Submission) =>
  sub.societySlug !== "" ? `${HOST}/societies/${sub.societySlug}` : `${HOST}/submit`;
const shareText = (sub: Submission) => {
  const name = sub.societyName || "my society";
  return `I just added my rent to RentLens for ${name} — real resident-reported numbers, not asking prices. Add yours:`;
};

const SuccessAction: FC<{ title: string; blurb: string; href: string }> = ({ title, blurb, href }) => (
  <a href={href} class="block bg-white border border-hairline p-5 hover:border-ink transition-colors group">
    <div class="text-sm font-medium text-ink mb-1.5 flex items-center justify-between gap-2">
      <span>{title}</span>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" class="text-ink-faint group-hover:text-ink transition-colors">
        <path d="M3 7h8m-3-3l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" />
      </svg>
    </div>
    <div class="text-xs text-ink-mute leading-relaxed">{blurb}</div>
  </a>
);

// formatINR — "₹62,000" style. Indian grouping (last three, then groups of two).
const formatINR = (n: number): string => {
  if (n <= 0) return "₹0";
  const s = String(n);
  const lastThree = s.slice(-3);
  const head = s.slice(0, -3);
  if (head === "") return "₹" + lastThree;
  return "₹" + head.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
};

// FURNISHING_LABEL + FLOOR_LABEL — short display strings for the form's
// canonical values. Match the radio labels on Step 1 (lib/submit.ts).
const FURNISHING_LABEL: Record<string, string> = {
  unfurnished: "Unfurnished",
  semi: "Semi-furnished",
  fully: "Fully furnished",
};
const FLOOR_LABEL: Record<string, string> = {
  G: "Ground floor",
  "1-3": "Floors 1–3",
  "4-7": "Floors 4–7",
  "8-15": "Floors 8–15",
  "15-21": "Floors 15–21",
  "21+": "Floor 21+",
};

// SummaryRow — one (label, value) pair. Always renders the label; falls back
// to a dim em-dash when value is empty so the grid stays even.
const SummaryRow: FC<{ label: string; value: string | number | null }> = ({ label, value }) => (
  <div class="grid grid-cols-[110px_1fr] gap-3 items-baseline py-2 border-b border-hairline/60 last:border-b-0">
    <div class="num text-[10px] tracking-[0.14em] uppercase text-ink-faint">{label}</div>
    <div class="text-sm text-ink leading-relaxed">{value === "" || value === null || value === 0 ? <span class="text-ink-faint">—</span> : value}</div>
  </div>
);

// SubmissionAck — concise "here's what we got" panel below the headline.
// Renders only when sub carries the unit data we need (bhk + rent — both
// required on Step 1). Skipped on the placeholder render (no id from URL).
const SubmissionAck: FC<{ sub: Submission }> = ({ sub }) => {
  if (sub.id === "" || sub.bhk === "" || sub.monthlyRent === 0) return null;
  const society = sub.societyName !== "" ? sub.societyName : "—";
  const locality = sub.locality !== "" ? sub.locality : "—";
  const unitBits: string[] = [`${sub.bhk}BHK`];
  if (sub.sqft !== null && sub.sqft > 0) unitBits.push(`${sub.sqft} sqft`);
  if (sub.furnishing !== "" && FURNISHING_LABEL[sub.furnishing]) unitBits.push(FURNISHING_LABEL[sub.furnishing].toLowerCase());
  return (
    <div class="mt-10 bg-white border border-hairline p-5 sm:p-6 text-left max-w-[560px] mx-auto">
      <div class="eyebrow mb-4">/ What we got</div>
      <SummaryRow label="Society" value={`${society} · ${locality}`} />
      <SummaryRow label="Unit" value={unitBits.join(" · ")} />
      <SummaryRow label="Rent" value={`${formatINR(sub.monthlyRent)} / mo`} />
      <SummaryRow label="Maintenance" value={sub.monthlyMaint > 0 ? `${formatINR(sub.monthlyMaint)} / mo` : ""} />
      {sub.deposit !== null && sub.deposit > 0 ? <SummaryRow label="Deposit" value={formatINR(sub.deposit)} /> : null}
      {sub.floorBand !== "" && FLOOR_LABEL[sub.floorBand] ? (
        <SummaryRow label="Floor" value={FLOOR_LABEL[sub.floorBand]} />
      ) : null}
    </div>
  );
};

// PendingQueueCopy — one of three variants based on which pending records the
// submission carries (society+area / area only / society only).
const PendingQueueCopy: FC<{ sub: Submission }> = ({ sub }) => {
  if (sub.pendingSocietyId !== "" && sub.pendingAreaId !== "") {
    return (
      <>
        We'll review and add <span class="text-ink font-medium">{sub.societyName}</span> in{" "}
        <span class="text-ink font-medium">{sub.locality}</span> to the catalog — your rental data is in the queue.
      </>
    );
  }
  if (sub.pendingAreaId !== "") {
    return (
      <>
        We'll review and add <span class="text-ink font-medium">{sub.locality}</span> as a new area — your rental data
        is in the queue.
      </>
    );
  }
  return (
    <>
      We'll review and add <span class="text-ink font-medium">{sub.societyName}</span> to the catalog — your rental
      data is in the queue.
    </>
  );
};

export const SubmitSuccess: FC<{ sub: Submission }> = ({ sub }) => (
  <Layout
    meta={{
      title: "Submitted — RentLens",
      description: "Thanks for contributing to RentLens.",
      path: "/submit/success",
      ogType: "website",
    }}
  >
    <Header />
    <PreviewBanner />
    {/* Marker read by FORM_PERSIST_SCRIPT to clear the saved-form localStorage
        entry once a submission has actually landed — so a fresh visit to
        /submit afterwards starts blank, not pre-filled with the just-sent
        report. */}
    <div id="submit-success-marker" hidden />
    <main class="px-5 sm:px-8 py-14 sm:py-24">
      <div class="max-w-narrow mx-auto text-center">
        <div class="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-marigold/15 mb-7">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" class="text-marigold">
            <path d="M8 16l5 5 11-11" stroke="currentColor" stroke-width="2.25" stroke-linecap="square" stroke-linejoin="miter" />
          </svg>
        </div>
        <div class="eyebrow mb-3">/ Report received</div>
        <h1 class="display text-4xl sm:text-6xl md:text-7xl font-normal tracking-tightest leading-[1] mb-6">
          Submitted.
        </h1>
        <p class="text-base sm:text-xl text-ink-mute max-w-[560px] mx-auto leading-relaxed">
          Thanks — your report makes the picture sharper for the next renter of{" "}
          <span class="text-ink font-medium">{sub.societyName}</span>.
        </p>
        {sub.pendingSocietyId !== "" || sub.pendingAreaId !== "" ? (
          <div class="mt-6 flex items-start gap-2 text-sm text-ink-mute max-w-[560px] mx-auto text-left">
            <span class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-marigold/15 text-marigold-deep flex-shrink-0 mt-0.5 text-[10px] leading-none">
              !
            </span>
            <span class="leading-relaxed">
              <PendingQueueCopy sub={sub} />
            </span>
          </div>
        ) : null}
        {sub.id !== "" ? (
          <div class="mt-6 inline-flex items-center gap-2 text-xs text-ink-faint">
            <span class="eyebrow">Reference</span>
            <span class="num tracking-tight">{sub.id}</span>
          </div>
        ) : null}
        <SubmissionAck sub={sub} />
        {sub.id !== "" && sub.helpContact !== "" && sub.proofUploadKey === "" && sub.proofUploadToken !== "" ? (
          <div class="mt-6 text-center">
            <a
              href={`/proof/${sub.proofUploadToken}`}
              class="inline-flex items-center gap-2 text-sm font-medium text-marigold-deep hover:text-marigold underline"
            >
              Add a rental agreement →
            </a>
            <div class="text-xs text-ink-faint mt-1">
              Optional. Verified reports are weighted more heavily.
            </div>
          </div>
        ) : null}
        <div class="mt-10 bg-parchment-deep/30 border-l-2 border-marigold p-4 text-left max-w-[560px] mx-auto">
          <div class="flex items-start gap-3">
            <span class="num text-[10px] text-marigold-deep tracking-[0.14em] uppercase mt-0.5 flex-shrink-0">
              Preview
            </span>
            <p class="text-sm text-ink-mute leading-relaxed">
              RentLens is in preview. Your report is saved and will appear on the site after a quick moderation pass.
            </p>
          </div>
        </div>
        <div class="mt-12 sm:mt-14 grid sm:grid-cols-2 gap-3 sm:gap-4 max-w-[560px] mx-auto text-left">
          {sub.pendingSocietyId !== "" ? (
            <SuccessAction
              title="Browse other societies"
              blurb="See rents from places already in the catalog while we add yours."
              href="/societies"
            />
          ) : (
            <SuccessAction title="Browse your society" blurb="See the page you just contributed to." href={browseHref(sub)} />
          )}
          <SuccessAction title="Submit another report" blurb="Got a friend's place to add? Or a previous lease?" href="/submit" />
        </div>
        {/* Share-after-submit (RENT-swwqpyth): the moment they're most engaged.
            One report is an anecdote; a neighbour's report makes it a median. */}
        <div class="mt-10 pt-8 border-t border-hairline max-w-[560px] mx-auto">
          <div class="eyebrow mb-1.5">/ Pass it on</div>
          <p class="text-sm text-ink-mute leading-relaxed mb-4">
            Know a neighbour at {sub.societyName || "your society"}? One more report turns your number into a median.
          </p>
          <div class="flex justify-center sm:justify-start">
            <ShareButtons url={shareUrl(sub)} text={shareText(sub)} subject={`Real rents for ${sub.societyName || "your society"}`} />
          </div>
        </div>
        <p class="mt-12 text-xs text-ink-faint max-w-[480px] mx-auto leading-relaxed">
          We'll review submissions before publishing them. Your identity is never shown publicly.
        </p>
      </div>
    </main>
    <Footer figLabel="Fig. 03 — Submit success" />
  </Layout>
);
