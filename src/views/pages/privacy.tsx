import type { FC, PropsWithChildren } from "hono/jsx";
import { Layout } from "../layout";
import { Header } from "../components/header";
import { Footer } from "../components/footer";
import { ContributeCTA } from "../components/contribute-cta";

type Bullet = { mark: string; markClass: string; title?: string; body: string };

const collectBullets: Bullet[] = [
  { mark: "·", markClass: "text-marigold", title: "What you submit", body: "rent, maintenance, deposit, BHK, floor band, furnishing, and the optional Section B fields if you chose to fill them." },
  { mark: "·", markClass: "text-marigold", title: "An optional email", body: "if you ticked 'help future renters' so we can ping you when there's a question or your society unlocks." },
  { mark: "·", markClass: "text-marigold", title: "Basic request logs", body: "IP address and user-agent, kept short-term for abuse and spam defense. Nothing else." },
];

const dontCollectBullets: Bullet[] = [
  { mark: "×", markClass: "text-ink-faint", body: "Exact unit numbers, wing identifiers, or anything that pins a report to a specific flat." },
  { mark: "×", markClass: "text-ink-faint", body: "Owner or landlord contact information." },
  { mark: "×", markClass: "text-ink-faint", body: "Rent agreement documents on the public site — sent for verification stay private." },
  { mark: "×", markClass: "text-ink-faint", body: "Identifying personal information beyond the optional email. No phone, no Aadhaar, no PAN." },
  { mark: "×", markClass: "text-ink-faint", body: "Payment information. RentLens doesn't transact, charge, or hold money." },
];

const BulletList: FC<{ bullets: Bullet[] }> = ({ bullets }) => (
  <ul class="space-y-3 text-base text-ink-mute leading-relaxed list-none">
    {bullets.map((b) => (
      <li class="flex items-start gap-3">
        <span class={`num mt-1.5 flex-shrink-0 ${b.markClass}`}>{b.mark}</span>
        <span>
          {b.title ? (
            <>
              <span class="text-ink font-medium">{b.title}</span>
              {" — "}
            </>
          ) : null}
          {b.body}
        </span>
      </li>
    ))}
  </ul>
);

// PolicySection — numbered eyebrow + display heading + children. Shared shape
// across /privacy and /terms (exported for reuse).
export const PolicySection: FC<PropsWithChildren<{ num: string; title: string }>> = ({ num, title, children }) => (
  <div class="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-4 md:gap-12">
    <div>
      <div class="num text-marigold-deep text-xs tracking-[0.14em] uppercase">{num}</div>
    </div>
    <div>
      <h2 class="display text-xl sm:text-2xl md:text-3xl font-medium tracking-tighter mb-4">{title}</h2>
      {children}
    </div>
  </div>
);

// PolicyHero — the back-to-home + eyebrow + title + intro shared by both pages.
export const PolicyHero: FC<{ eyebrow: string; intro: string; children: unknown }> = ({ eyebrow, intro, children }) => (
  <section class="px-5 sm:px-8 pt-14 sm:pt-20 lg:pt-24 pb-12 sm:pb-16 border-b border-hairline">
    <div class="max-w-base mx-auto">
      <div class="mb-6">
        <a href="/" class="text-sm text-ink-mute hover:text-ink link-u inline-flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M11 7H3m3 3l-3-3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" />
          </svg>
          Home
        </a>
      </div>
      <div class="flex items-center gap-2.5 mb-7 sm:mb-9">
        <span class="w-1.5 h-1.5 rounded-full bg-marigold accent-dot" />
        <span class="eyebrow">{eyebrow}</span>
      </div>
      <h1 class="display text-[clamp(36px,6.5vw,84px)] leading-[1.02] font-normal max-w-[16ch]">{children}</h1>
      <p class="mt-6 sm:mt-8 text-base sm:text-lg text-ink-mute max-w-[640px] leading-relaxed">{intro}</p>
    </div>
  </section>
);

export const Privacy: FC = () => (
  <Layout
    meta={{
      title: "Privacy — RentLens",
      description: "Plain-language privacy policy for RentLens. What we collect, what we don't, and how to request removal.",
      path: "/privacy",
      ogType: "article",
    }}
  >
    <Header />
    <main>
      <PolicyHero
        eyebrow="/ Privacy"
        intro="No legalese. If something here isn't clear, email us and we'll fix the wording. The goal is for you to actually know what's going on."
      >
        Plain answers about your <span class="emph-accent">data</span>.
      </PolicyHero>
      <section class="px-5 sm:px-8 py-14 sm:py-20">
        <div class="max-w-base mx-auto space-y-12 sm:space-y-16">
          <PolicySection num="01" title="What we collect">
            <BulletList bullets={collectBullets} />
          </PolicySection>
          <PolicySection num="02" title="What we don't collect">
            <BulletList bullets={dontCollectBullets} />
          </PolicySection>
          <PolicySection num="03" title="Where the data lives">
            <div class="space-y-4 text-base text-ink-mute leading-relaxed">
              <p>
                <span class="text-ink font-medium">Preview (right now):</span> submissions are stored in Cloudflare D1
                (SQLite) and persist across deploys. The founder also gets an email per submission so nothing is lost.
              </p>
              <p>
                <span class="text-ink font-medium">Production:</span> resident-reported data lives in D1, with any
                verification attachments in encrypted object storage (Cloudflare R2). Aggregates are public; raw
                contributor records are not.
              </p>
            </div>
          </PolicySection>
          <PolicySection num="04" title="Cookies and analytics">
            <div class="space-y-4 text-base text-ink-mute leading-relaxed">
              <p>Preview has no analytics wired up at all. No cookies are set beyond what your browser does on its own.</p>
              <p>
                When analytics is added it will be a privacy-safe, aggregate-only setup. Page-level counts, no per-user
                tracking, no third-party trackers, no behavioural profiles.
              </p>
            </div>
          </PolicySection>
          <PolicySection num="05" title="Email">
            <div class="space-y-4 text-base text-ink-mute leading-relaxed">
              <p>
                The preview emails the founder a copy of each submission via Resend so nothing is lost. Those emails
                contain only the submitted fields, not your IP, not anything we didn't explicitly ask for.
              </p>
              <p>
                Contributor email addresses are never shared with third parties, never sold, never bundled into a list.
                They exist so we can answer questions about a submission or notify you when your society's page gets
                unlocked.
              </p>
            </div>
          </PolicySection>
          <PolicySection num="06" title="Request removal">
            <div class="space-y-4 text-base text-ink-mute leading-relaxed">
              <p>
                If you've submitted and want any of it gone, partial or full, email{" "}
                <a href="mailto:rahul@teamohana.com" class="link-u text-ink hover:text-marigold-deep">
                  rahul@teamohana.com
                </a>{" "}
                with anything that helps us find your submission (rough date, society, the email you used if any). We'll
                confirm deletion in writing.
              </p>
              <p>You don't need to explain why. "Please remove" is enough.</p>
            </div>
          </PolicySection>
          <PolicySection num="07" title="Updates to this page">
            <div class="space-y-4 text-base text-ink-mute leading-relaxed">
              <p>
                If policies change we'll update this page and update the date stamp below. We'll never quietly broaden
                what we collect. Anything new gets called out in the next site update.
              </p>
              <p class="num text-xs text-ink-faint tracking-[0.14em] uppercase pt-6 border-t border-hairline mt-8">
                Last updated: 14 May 2026
              </p>
            </div>
          </PolicySection>
        </div>
      </section>
      <ContributeCTA />
    </main>
    <Footer figLabel="Fig. 04 — Privacy" />
  </Layout>
);
