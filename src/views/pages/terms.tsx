import type { FC } from "hono/jsx";
import type { HomeStats } from "../../data/stats";
import { Layout } from "../layout";
import { Header } from "../components/header";
import { Footer } from "../components/footer";
import { ContributeCTA } from "../components/contribute-cta";
import { PolicyHero, PolicySection } from "./privacy";

export const Terms: FC<{ stats: HomeStats }> = ({ stats }) => (
  <Layout
    meta={{
      title: "Terms of use — RentLens",
      description:
        "Plain-language terms of use for RentLens. Acceptable use, availability, and how contributor data is handled.",
      path: "/terms",
      ogType: "article",
    }}
  >
    <Header />
    <main>
      <PolicyHero
        eyebrow="/ Terms of use"
        intro="The terms are short and the spirit is collaborative. If you read something here that feels unfair, email us and we'll fix the wording."
      >
        The <span class="emph-accent">rules</span> for using RentLens.
      </PolicyHero>
      <section class="px-5 sm:px-8 py-14 sm:py-20">
        <div class="max-w-base mx-auto space-y-12 sm:space-y-16">
          <PolicySection num="01" title="Using RentLens">
            <div class="space-y-4 text-base text-ink-mute leading-relaxed">
              <p>
                By visiting RentLens or submitting data through the site, you agree to these terms. If you don't agree
                with any of them, please don't use the service. There is no signup; agreement is implicit by using the
                pages.
              </p>
              <p>
                You must be at least 18 and submitting in good faith. Don't submit rental data for a society you have no
                first-hand knowledge of.
              </p>
            </div>
          </PolicySection>
          <PolicySection num="02" title="Availability">
            <div class="space-y-4 text-base text-ink-mute leading-relaxed">
              <p>
                RentLens is a young, independent product. The site is functional and submissions are stored securely,
                but we make no uptime, availability, or data-retention guarantees, and features may change as the
                product evolves.
              </p>
              <p>As the product matures, this section will be updated.</p>
            </div>
          </PolicySection>
          <PolicySection num="03" title="Your contributions">
            <div class="space-y-4 text-base text-ink-mute leading-relaxed">
              <p>
                You retain ownership of anything you submit. By submitting, you grant RentLens a non-exclusive,
                royalty-free license to display your contribution in aggregated, anonymized form — that's the whole
                product.
              </p>
              <p>
                We may edit or reject submissions during moderation if they're incomplete, implausible, or violate the
                acceptable-use rules below. You can request deletion of your submission at any time per the{" "}
                <a href="/privacy" class="link-u text-ink hover:text-marigold-deep">
                  privacy policy
                </a>
                .
              </p>
            </div>
          </PolicySection>
          <PolicySection num="04" title="Acceptable use">
            <ul class="space-y-3 text-base text-ink-mute leading-relaxed list-none">
              <li class="flex items-start gap-3">
                <span class="num mt-1.5 flex-shrink-0 text-ink-faint">×</span>
                <span>No scraping. The API contract is for the human-facing site, not for bulk extraction.</span>
              </li>
              <li class="flex items-start gap-3">
                <span class="num mt-1.5 flex-shrink-0 text-ink-faint">×</span>
                <span>No fake submissions — including broker-seeded listings, inflated rents, or fabricated reviews.</span>
              </li>
              <li class="flex items-start gap-3">
                <span class="num mt-1.5 flex-shrink-0 text-ink-faint">×</span>
                <span>
                  No personally identifying or deanonymizing content in the optional note field. Don't name specific
                  neighbors, owners, or unit numbers.
                </span>
              </li>
              <li class="flex items-start gap-3">
                <span class="num mt-1.5 flex-shrink-0 text-ink-faint">×</span>
                <span>No harassment, defamation, or content targeting individuals.</span>
              </li>
              <li class="flex items-start gap-3">
                <span class="num mt-1.5 flex-shrink-0 text-marigold">·</span>
                <span>
                  Do contribute one report per society per BHK you've actually rented. More than that and we'll dedupe.
                </span>
              </li>
            </ul>
          </PolicySection>
          <PolicySection num="05" title="No warranty on the numbers">
            <div class="space-y-4 text-base text-ink-mute leading-relaxed">
              <p>
                Rents shown on RentLens are aggregated from resident-submitted reports and are useful as a directional
                signal, not as a guaranteed market rate. We don't warrant accuracy, completeness, or fitness for any
                specific decision.
              </p>
              <p>Don't sue your landlord based on a RentLens median. Do walk into a negotiation more informed.</p>
            </div>
          </PolicySection>
          <PolicySection num="06" title="Limitation of liability">
            <div class="space-y-4 text-base text-ink-mute leading-relaxed">
              <p>
                To the extent allowed by law, RentLens, its operators, and contributors are not liable for indirect or
                consequential damages arising from your use of the site or reliance on data shown here. The service is
                provided as-is, with no warranty.
              </p>
            </div>
          </PolicySection>
          <PolicySection num="07" title="Privacy">
            <div class="space-y-4 text-base text-ink-mute leading-relaxed">
              <p>
                How we handle personal data — including what we collect, what we don't, and how to request removal — is
                covered separately in the{" "}
                <a href="/privacy" class="link-u text-ink hover:text-marigold-deep">
                  privacy policy
                </a>
                . The privacy policy is incorporated by reference into these terms.
              </p>
            </div>
          </PolicySection>
          <PolicySection num="08" title="Governing law">
            <div class="space-y-4 text-base text-ink-mute leading-relaxed">
              <p>These terms are governed by the laws of India. Any disputes will be subject to the courts at Bengaluru.</p>
            </div>
          </PolicySection>
          <PolicySection num="09" title="Changes">
            <div class="space-y-4 text-base text-ink-mute leading-relaxed">
              <p>
                If terms change we'll update this page and revise the date stamp below. Material changes will be called
                out in the next site update so you don't have to diff legal pages to know what's new.
              </p>
              <p class="num text-xs text-ink-faint tracking-[0.14em] uppercase pt-6 border-t border-hairline mt-8">
                Last updated: 14 May 2026
              </p>
            </div>
          </PolicySection>
        </div>
      </section>
      <ContributeCTA stats={stats} />
    </main>
    <Footer />
  </Layout>
);
