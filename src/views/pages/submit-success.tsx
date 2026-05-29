import type { FC } from "hono/jsx";
import { Layout } from "../layout";
import { Header } from "../components/header";
import { Footer } from "../components/footer";
import { PreviewBanner } from "./submit";
import type { Submission } from "../../data/submission";

const browseHref = (sub: Submission) => (sub.societySlug !== "" ? `/societies/${sub.societySlug}` : "/");

function shareMailto(sub: Submission): string {
  const name = sub.societyName || "your society";
  const subject = `RentLens — see real rents for ${name}`;
  const body = `I just shared my rent on RentLens — it helps future renters of ${name}. Add yours: https://rentlens.fyi/submit`;
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

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
        <div class="mt-12 sm:mt-14 grid sm:grid-cols-3 gap-3 sm:gap-4 max-w-[680px] mx-auto text-left">
          {sub.pendingSocietyId !== "" ? (
            <SuccessAction
              title="Browse other societies"
              blurb="See rents from places already in the catalog while we add yours."
              href="/"
            />
          ) : (
            <SuccessAction title="Browse your society" blurb="See the page you just contributed to." href={browseHref(sub)} />
          )}
          <SuccessAction title="Submit another report" blurb="Got a friend's place to add? Or a previous lease?" href="/submit" />
          <SuccessAction
            title="Share with a neighbour"
            blurb={`Email someone else from ${sub.societyName} so they can contribute too.`}
            href={shareMailto(sub)}
          />
        </div>
        <p class="mt-12 text-xs text-ink-faint max-w-[480px] mx-auto leading-relaxed">
          We'll review submissions before publishing them. Your identity is never shown publicly.
        </p>
      </div>
    </main>
    <Footer figLabel="Fig. 03 — Submit success" />
  </Layout>
);
