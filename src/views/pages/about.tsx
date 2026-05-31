import type { FC, PropsWithChildren } from "hono/jsx";
import type { HomeStats } from "../../data/stats";
import { Layout } from "../layout";
import { Header } from "../components/header";
import { Footer } from "../components/footer";
import { ContributeCTA } from "../components/contribute-cta";

const fmt = (n: number) => n.toLocaleString("en-IN");

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

// A labelled prose block: mono eyebrow on the left rail, content on the right.
const Block: FC<PropsWithChildren<{ eyebrow: string; tint?: boolean }>> = ({ eyebrow, tint, children }) => (
  <section class={`px-5 sm:px-8 py-14 sm:py-18${tint ? " border-y border-hairline bg-parchment-deep/30" : ""}`}>
    <div class="max-w-base mx-auto grid grid-cols-1 md:grid-cols-[180px_1fr] gap-6 md:gap-12">
      <div class="eyebrow md:pt-1.5">{eyebrow}</div>
      <div class="max-w-[640px]">{children}</div>
    </div>
  </section>
);

// One provenance tier row — name + plain-language meaning. Mirrors the honest
// labels in src/data/society.ts (PROVENANCE_LABEL) and how-it-works.
const Tier: FC<{ name: string; label: string; body: string }> = ({ name, label, body }) => (
  <div class="py-5 border-b border-hairline last:border-0">
    <div class="flex items-baseline gap-3 mb-1.5">
      <span class="display text-lg font-medium text-ink">{label}</span>
      <span class="num text-[10px] text-ink-faint tracking-[0.14em] uppercase">{name}</span>
    </div>
    <p class="text-sm text-ink-mute leading-relaxed">{body}</p>
  </div>
);

const HeroSection: FC<{ stats: HomeStats }> = ({ stats }) => (
  <section class="px-5 sm:px-8 pt-14 sm:pt-20 lg:pt-24 pb-12 sm:pb-16 border-b border-hairline">
    <div class="max-w-base mx-auto">
      <HomeLink />
      <div class="flex items-center gap-2.5 mb-7 sm:mb-9">
        <span class="w-1.5 h-1.5 rounded-full bg-marigold accent-dot" />
        <span class="eyebrow">/ About</span>
      </div>
      <h1 class="display text-[clamp(36px,6.5vw,84px)] leading-[1.02] font-normal max-w-[16ch]">
        Renting here meant <span class="emph-accent">guessing in the dark</span>.
      </h1>
      <p class="mt-6 sm:mt-8 text-base sm:text-lg text-ink-mute max-w-[640px] leading-relaxed">
        Every listing portal shows you what owners <span class="emph">ask</span>. None of them show you what people
        actually <span class="emph">pay</span> once the lease is signed. RentLens exists to close that gap — one honest,
        anonymous resident report at a time.
      </p>
    </div>
  </section>
);

export const About: FC<{ stats: HomeStats }> = ({ stats }) => (
  <Layout
    meta={{
      title: "About — RentLens",
      description:
        "Why RentLens exists: listing portals show asking prices, not what residents pay. We aggregate anonymous resident reports into honest rent ranges for Bengaluru's apartment societies.",
      path: "/about",
      ogType: "article",
    }}
  >
    <Header />
    <main>
      <HeroSection stats={stats} />

      <Block eyebrow="The problem">
        <h2 class="display text-2xl sm:text-3xl font-medium tracking-tighter mb-5">
          Asking prices are a starting bid, not a number.
        </h2>
        <p class="text-base text-ink-mute leading-relaxed mb-4">
          A listing says a 3 BHK goes for ₹85,000. You tour it, you negotiate blind, you have no idea whether ₹70,000
          is a steal or a stretch — because the only people who know are the residents already living there, and nobody
          ever asks them.
        </p>
        <p class="text-base text-ink-mute leading-relaxed">
          Maintenance gets hidden until you call. Deposit norms are folklore. Floor-band and furnishing premiums are
          whatever the broker can get away with. The information exists — it's just locked inside the building.
        </p>
      </Block>

      <Block eyebrow="The idea" tint>
        <h2 class="display text-2xl sm:text-3xl font-medium tracking-tighter mb-5">
          Residents already know. We just collect it.
        </h2>
        <p class="text-base text-ink-mute leading-relaxed mb-4">
          One resident's rent is an anecdote. A few hundred, gathered carefully, become a median you can plan around.
          So we built the lightest possible way to contribute — a sixty-second, anonymous-by-default report — and turn
          those reports into a rent, maintenance, and deposit picture for each society, stamped with how many people
          said it and how recently.
        </p>
        <p class="text-base text-ink-mute leading-relaxed">
          Today that's {fmt(stats.reports)} reports across {fmt(stats.societies)} societies in {fmt(stats.areas)}{" "}
          Bengaluru localities — and growing every week.
        </p>
      </Block>

      <Block eyebrow="Keeping it honest">
        <h2 class="display text-2xl sm:text-3xl font-medium tracking-tighter mb-5">
          We label exactly how much to trust every number.
        </h2>
        <p class="text-base text-ink-mute leading-relaxed mb-7">
          The fastest way to lose your trust would be to dress up a guess as a fact. So every rent range carries its
          provenance, out in the open:
        </p>
        <div>
          <Tier
            name="seed"
            label="Indicative"
            body="Our launch estimate for a society, before residents weigh in. A reasonable starting point — clearly marked as not-yet-confirmed."
          />
          <Tier
            name="estimated"
            label="Estimated"
            body="Backed by an early resident signal or two. Directionally right, still firming up as more reports arrive."
          />
          <Tier
            name="resident"
            label="Resident-verified"
            body="Enough independent resident reports to stand on its own — a real median with a real range and sample size."
          />
        </div>
        <p class="text-base text-ink-mute leading-relaxed mt-7">
          As real reports come in, indicative numbers get retired in favour of what residents actually report.{" "}
          <a href="/how-it-works" class="text-marigold-deep hover:text-marigold link-u font-medium">
            See the full methodology →
          </a>
        </p>
      </Block>

      <Block eyebrow="Who's behind it" tint>
        <h2 class="display text-2xl sm:text-3xl font-medium tracking-tighter mb-5">
          Small, independent, and on the renter's side.
        </h2>
        <p class="text-base text-ink-mute leading-relaxed mb-4">
          RentLens is an independent project built in Bengaluru — no brokerage, no listing fees, no lead-selling. We
          don't make money when you move; we have no reason to inflate a number. The only incentive is to be the place
          you check before you sign.
        </p>
        <p class="text-base text-ink-mute leading-relaxed">
          Reports are anonymous by default and we keep next to nothing about you.{" "}
          <a href="/privacy" class="text-marigold-deep hover:text-marigold link-u font-medium">
            Read the privacy policy →
          </a>
        </p>
      </Block>

      <ContributeCTA stats={stats} />
    </main>
    <Footer />
  </Layout>
);
