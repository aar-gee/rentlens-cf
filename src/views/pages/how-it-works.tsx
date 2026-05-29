import type { FC, PropsWithChildren } from "hono/jsx";
import { Layout } from "../layout";
import { Header } from "../components/header";
import { Footer } from "../components/footer";
import { ContributeCTA } from "../components/contribute-cta";

// Numbered methodology section: [180px_1fr] grid with number + eyebrow.
const Section: FC<PropsWithChildren<{ num: string; eyebrow: string; tint?: boolean }>> = ({
  num,
  eyebrow,
  tint,
  children,
}) => (
  <section class={`px-5 sm:px-8 py-14 sm:py-20${tint ? " border-y border-hairline bg-parchment-deep/30" : ""}`}>
    <div class="max-w-base mx-auto grid grid-cols-1 md:grid-cols-[180px_1fr] gap-6 md:gap-12">
      <div>
        <div class="num text-marigold-deep text-xs tracking-[0.14em] uppercase">{num}</div>
        <div class="eyebrow mt-2">{eyebrow}</div>
      </div>
      <div>{children}</div>
    </div>
  </section>
);

const HomeLink: FC = () => (
  <div class="mb-6">
    <a href="/" class="text-sm text-ink-mute hover:text-ink link-u inline-flex items-center gap-1.5">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M11 7H3m3 3l-3-3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" />
      </svg>
      Home
    </a>
  </div>
);

const FaqItem: FC<{ q: string; a: string }> = ({ q, a }) => (
  <details class="group py-5 sm:py-6">
    <summary class="flex items-start justify-between gap-6 cursor-pointer list-none">
      <span class="display text-lg sm:text-xl font-medium text-ink leading-snug">{q}</span>
      <span class="num text-ink-faint text-xs tracking-[0.14em] uppercase mt-1.5 flex-shrink-0 group-open:rotate-45 transition-transform">
        +
      </span>
    </summary>
    <p class="mt-3 text-base text-ink-mute leading-relaxed max-w-[640px]">{a}</p>
  </details>
);

export const HowItWorks: FC = () => (
  <Layout
    meta={{
      title: "How it works — RentLens",
      description:
        "How RentLens turns resident-reported rent into a trustworthy median. Methodology, confidence labels, sample-size thresholds, and FAQ.",
      path: "/how-it-works",
      ogType: "article",
    }}
  >
    <Header />
    <main>
      <section class="px-5 sm:px-8 pt-14 sm:pt-20 lg:pt-24 pb-12 sm:pb-16 border-b border-hairline">
        <div class="max-w-base mx-auto">
          <HomeLink />
          <div class="flex items-center gap-2.5 mb-7 sm:mb-9">
            <span class="w-1.5 h-1.5 rounded-full bg-marigold accent-dot" />
            <span class="eyebrow">/ How it works</span>
          </div>
          <h1 class="display text-[clamp(36px,6.5vw,84px)] leading-[1.02] font-normal max-w-[14ch]">
            What you're looking at, and <span class="emph-accent">why to trust it</span>.
          </h1>
          <p class="mt-6 sm:mt-8 text-base sm:text-lg text-ink-mute max-w-[640px] leading-relaxed">
            RentLens turns short, anonymous resident reports into a median + range you can actually use. Here's how the
            data gets in, how we label its trustworthiness, and what we refuse to show.
          </p>
        </div>
      </section>

      <Section num="01" eyebrow="The data">
        <h2 class="display text-2xl sm:text-3xl md:text-4xl font-medium tracking-tighter mb-4">
          Resident-reported. Not portal-scraped.
        </h2>
        <div class="space-y-4 text-base text-ink-mute leading-relaxed max-w-[640px]">
          <p>
            Every rent, maintenance, and deposit number on RentLens came from someone who actually lives — or recently
            lived — in that society. We don't ingest portal listings, we don't scrape brokers, and we don't accept
            owner submissions.
          </p>
          <p>
            Each report is aggregated server-side. We publish the <span class="num text-ink font-medium">median</span>{" "}
            and the <span class="num text-ink font-medium">range</span> for the bucket — never the raw point estimate
            from any one resident. That's how a single high or low outlier can't move the headline, and how no
            individual flat can be reverse-engineered from the page.
          </p>
        </div>
      </Section>

      <Section num="02" eyebrow="Confidence labels" tint>
        <h2 class="display text-2xl sm:text-3xl md:text-4xl font-medium tracking-tighter mb-4">
          Four tiers. One small dot.
        </h2>
        <p class="text-base text-ink-mute leading-relaxed max-w-[640px] mb-8">
          Every aggregate carries a colored dot that tells you how much to trust it. Verification is{" "}
          <span class="emph">progressive</span> — we never hide a number behind a "verify or nothing" gate, but we
          always tell you what's underneath.
        </p>
        <ul class="space-y-5">
          <li class="flex items-start gap-4">
            <span class="w-2.5 h-2.5 rounded-full bg-ink-faint mt-1.5 flex-shrink-0" />
            <div>
              <div class="text-sm font-medium text-ink">Self-reported</div>
              <p class="text-sm text-ink-mute leading-relaxed mt-1">
                The resident filled in numbers. We accepted them after a basic sanity check (range, locality match, no
                obvious broker tells). Shown for the bulk of fresh contributions.
              </p>
            </div>
          </li>
          <li class="flex items-start gap-4">
            <span class="w-2.5 h-2.5 rounded-full bg-marigold mt-1.5 flex-shrink-0" />
            <div>
              <div class="text-sm font-medium text-ink">Partially verified</div>
              <p class="text-sm text-ink-mute leading-relaxed mt-1">
                At least one signal lines up — e.g. corroborating reports for the same flat type, a contributor we've
                spoken with, or an email handle we recognize. Stronger than self-reported, lighter than verified.
              </p>
            </div>
          </li>
          <li class="flex items-start gap-4">
            <span class="w-2.5 h-2.5 rounded-full bg-success mt-1.5 flex-shrink-0" />
            <div>
              <div class="text-sm font-medium text-ink">Verified source</div>
              <p class="text-sm text-ink-mute leading-relaxed mt-1">
                The contributor sent in a redacted rent agreement, society maintenance bill, or similar. We keep the
                document private; only the verified label is public.
              </p>
            </div>
          </li>
          <li class="flex items-start gap-4">
            <span class="w-2.5 h-2.5 rounded-full bg-ink-faint/40 mt-1.5 flex-shrink-0" />
            <div>
              <div class="text-sm font-medium text-ink">Limited data</div>
              <p class="text-sm text-ink-mute leading-relaxed mt-1">
                Not enough reports yet to publish a headline median. You'll see this where a society or filter bucket
                has fewer than the threshold — see section 03.
              </p>
            </div>
          </li>
        </ul>
      </Section>

      <Section num="03" eyebrow="Sample-size thresholds">
        <h2 class="display text-2xl sm:text-3xl md:text-4xl font-medium tracking-tighter mb-4">
          What we'll show — and what we won't.
        </h2>
        <p class="text-base text-ink-mute leading-relaxed max-w-[640px] mb-8">
          Small samples lie loudly. RentLens stays quiet until the data earns the right to be loud.
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-px bg-hairline border border-hairline">
          <div class="bg-parchment p-5 sm:p-6">
            <div class="num text-2xl font-medium text-ink mb-1">&lt; 3</div>
            <div class="eyebrow mb-3">Reports in bucket</div>
            <p class="text-sm text-ink-mute leading-relaxed">
              No number. We show a "Limited data — contribute to unlock" placeholder instead of a misleading median.
            </p>
          </div>
          <div class="bg-parchment p-5 sm:p-6">
            <div class="num text-2xl font-medium text-ink mb-1">3 – 5</div>
            <div class="eyebrow mb-3">Early signal</div>
            <p class="text-sm text-ink-mute leading-relaxed">
              Median only, no range. Labelled as early signal so you can tell it's directional, not definitive.
            </p>
          </div>
          <div class="bg-parchment p-5 sm:p-6">
            <div class="num text-2xl font-medium text-ink mb-1">6+</div>
            <div class="eyebrow mb-3">Full breakdown</div>
            <p class="text-sm text-ink-mute leading-relaxed">
              Median + range. Floor-band breakdowns appear only for bands that themselves clear the 3-report floor.
            </p>
          </div>
        </div>
        <p class="mt-6 text-sm text-ink-faint leading-relaxed max-w-[640px]">
          This applies per-filter, not per-society. A society with 40 reports might still show "limited data" on the
          4+ BHK row simply because no one in that bucket has reported yet.
        </p>
      </Section>

      <Section num="04" eyebrow="Recency" tint>
        <h2 class="display text-2xl sm:text-3xl md:text-4xl font-medium tracking-tighter mb-4">How "as of" works.</h2>
        <div class="space-y-4 text-base text-ink-mute leading-relaxed max-w-[640px]">
          <p>
            Each report is tagged with the month it describes. By default the headline median is the rolling{" "}
            <span class="num text-ink font-medium">last 12 months</span>, and every card stamps the period explicitly
            so you're never guessing.
          </p>
          <p>
            Reports older than 18 months get a <span class="num text-ink font-medium">Historical</span> tag and stop
            counting toward the headline. They still show in deep-history views, but they can't drag a 2026 median back
            to 2023 pricing.
          </p>
          <p>
            When a society has too few <em>recent</em> reports to clear the threshold, we don't backfill with old data
            to fake confidence — we show "limited data" and ask for fresh contributions.
          </p>
        </div>
      </Section>

      <Section num="05" eyebrow="Privacy">
        <h2 class="display text-2xl sm:text-3xl md:text-4xl font-medium tracking-tighter mb-4">What we refuse to show.</h2>
        <p class="text-base text-ink-mute leading-relaxed max-w-[640px] mb-6">
          Aggregation is the point. The public surface of RentLens is built so a contributor can never be
          reverse-engineered from what's published.
        </p>
        <ul class="space-y-3 text-sm">
          <li class="flex items-start gap-3">
            <span class="text-ink-faint num mt-0.5">×</span>
            <span class="text-ink-mute">
              <span class="text-ink font-medium">Exact flat numbers</span> — we only ever show the floor band (1–3,
              4–7, 8–12, 13+).
            </span>
          </li>
          <li class="flex items-start gap-3">
            <span class="text-ink-faint num mt-0.5">×</span>
            <span class="text-ink-mute">
              <span class="text-ink font-medium">Contributor identity</span> — names, emails, and any personal handles
              stay server-side. Public display is always anonymous.
            </span>
          </li>
          <li class="flex items-start gap-3">
            <span class="text-ink-faint num mt-0.5">×</span>
            <span class="text-ink-mute">
              <span class="text-ink font-medium">Raw verification documents</span> — agreements and bills sent for
              verification are never published, only the resulting label.
            </span>
          </li>
          <li class="flex items-start gap-3">
            <span class="text-ink-faint num mt-0.5">×</span>
            <span class="text-ink-mute">
              <span class="text-ink font-medium">Owner contact information</span> — RentLens is not a listings site and
              will never broker an introduction without explicit two-sided consent.
            </span>
          </li>
          <li class="flex items-start gap-3">
            <span class="text-ink-faint num mt-0.5">×</span>
            <span class="text-ink-mute">
              <span class="text-ink font-medium">Deanonymizing agreement details</span> — specific lease start/end
              dates, contract clauses, or anything that could narrow a report down to a single unit.
            </span>
          </li>
        </ul>
        <p class="mt-7 text-sm text-ink-mute">
          Full data-handling specifics live on the{" "}
          <a href="/privacy" class="link-u text-ink hover:text-marigold-deep">
            Privacy page
          </a>
          .
        </p>
      </Section>

      <section id="faq" class="px-5 sm:px-8 py-16 sm:py-24 border-t border-hairline">
        <div class="max-w-base mx-auto">
          <div class="mb-10 sm:mb-14">
            <div class="eyebrow mb-3">/ FAQ</div>
            <h2 class="display text-2xl sm:text-4xl md:text-5xl font-medium tracking-tighter leading-[1.05] max-w-[720px]">
              Common questions, plain answers.
            </h2>
          </div>
          <div class="divide-y divide-hairline border-y border-hairline">
            <FaqItem
              q="Is this owner or broker data?"
              a="No. Every number comes from a current or recent resident. We actively filter out anyone identifying as an owner, broker, or property manager — and a future watcher signup will require LinkedIn + employer verification to keep that side clean."
            />
            <FaqItem
              q="Do you verify every submission?"
              a="No, and we don't pretend to. Verification is progressive — see the four-tier label above. Most reports start as self-reported and earn higher labels over time as we corroborate or as the contributor opts in to send a redacted agreement."
            />
            <FaqItem
              q="Can I contribute anonymously?"
              a={'Yes. Anonymous is the default. Email is optional and only used if you ticked "help future renters" or want a reply on your submission. We never publish any contributor identifier.'}
            />
            <FaqItem
              q="Will my exact flat be shown?"
              a="No. Floor is bucketed into bands (1–3, 4–7, 8–12, 13+) and we never publish a unit number or wing. Even on a small society, two reports in the same band stay indistinguishable."
            />
            <FaqItem
              q="What if a society isn't listed?"
              a="Submit anyway with the society name typed in. We'll add it during the review pass and your submission will attach to the new entry. No need to wait for us."
            />
            <FaqItem
              q="What about brokers using this for leads?"
              a="We filter aggressively on submission, and watcher signup in v1.1 will require LinkedIn + employer verification before access. If you spot misuse, email us and we'll act."
            />
            <FaqItem
              q="Why don't I see numbers for my society?"
              a="Almost always the sample-size threshold (section 03). Three reports unlocks a median, six unlocks the range. Contribute yours and the page lights up for the next renter."
            />
          </div>
        </div>
      </section>

      <ContributeCTA />
    </main>
    <Footer figLabel="Fig. 03 — How it works" />
  </Layout>
);
