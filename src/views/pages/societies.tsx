import type { FC } from "hono/jsx";
import type { Society } from "../../data/society";
import type { HomeStats } from "../../data/stats";
import { Layout } from "../layout";
import { Header } from "../components/header";
import { Footer } from "../components/footer";
import { SocietyCard } from "../components/society-card";
import { AddSocietyCard } from "../components/add-society-card";
import { ContributeCTA } from "../components/contribute-cta";

const fmt = (n: number) => n.toLocaleString("en-IN");

// ItemList JSON-LD so the index is legible to search engines as a browseable
// collection. Built server-side from the published catalog (no user input).
function societiesJSONLD(societies: Society[]): string {
  const items = societies.map((s, i) => ({
    "@type": "ListItem",
    position: i + 1,
    url: `https://rentlens.fyi/societies/${s.slug}`,
    name: s.name,
  }));
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "All societies on RentLens",
    url: "https://rentlens.fyi/societies",
    mainEntity: { "@type": "ItemList", numberOfItems: societies.length, itemListElement: items },
  });
}

const IntroSection: FC<{ stats: HomeStats }> = ({ stats }) => (
  <section class="px-5 sm:px-8 pt-14 sm:pt-20 pb-8 sm:pb-10">
    <div class="max-w-wide mx-auto">
      <div class="eyebrow mb-3">/ Directory · Bengaluru</div>
      <h1 class="display text-3xl sm:text-4xl md:text-5xl font-medium tracking-tighter max-w-[760px]">
        Every society we track, in one place.
      </h1>
      <p class="mt-5 text-base sm:text-lg text-ink-mute max-w-[620px] leading-relaxed">
        {fmt(stats.reports)} resident reports across {fmt(stats.societies)} societies in {fmt(stats.areas)} Bengaluru
        localities. Don't see yours? Add it in sixty seconds.
      </p>
    </div>
  </section>
);

const Grid: FC<{ societies: Society[] }> = ({ societies }) => (
  <section class="px-5 sm:px-8 pb-16 sm:pb-20">
    <div class="max-w-wide mx-auto">
      <div class="flex flex-wrap gap-4 justify-center sm:justify-start">
        <AddSocietyCard />
        {societies.map((soc) => (
          <SocietyCard soc={soc} />
        ))}
      </div>
    </div>
  </section>
);

export const SocietiesIndex: FC<{ societies: Society[]; stats: HomeStats }> = ({ societies, stats }) => (
  <Layout
    meta={{
      title: "All societies — RentLens",
      description: `Browse resident-reported rent, maintenance, and deposit data across ${fmt(
        stats.societies,
      )} apartment societies in Bengaluru. Real numbers from people who live there.`,
      path: "/societies",
      ogType: "website",
      jsonLd: societiesJSONLD(societies),
    }}
  >
    <Header />
    <main>
      <IntroSection stats={stats} />
      <Grid societies={societies} />
      <ContributeCTA stats={stats} />
    </main>
    <Footer />
  </Layout>
);
