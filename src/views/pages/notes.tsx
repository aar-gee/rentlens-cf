import type { FC } from "hono/jsx";
import type { Note } from "../../data/notes";
import { Layout } from "../layout";
import { Header } from "../components/header";
import { Footer } from "../components/footer";

const HOST = "https://rentlens.fyi";

// Human date: "31 May 2026". Built from the ISO string without Date locale
// surprises in the Workers runtime.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function humanDate(iso: string): string {
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

const HomeLink: FC<{ href: string; label: string }> = ({ href, label }) => (
  <div class="mb-6">
    <a href={href} class="text-sm text-ink-mute hover:text-ink link-u inline-flex items-center gap-1.5">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M11 7H3m3 3l-3-3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" />
      </svg>
      {label}
    </a>
  </div>
);

// ---- Index ----
export const NotesIndex: FC<{ notes: Note[] }> = ({ notes }) => (
  <Layout
    meta={{
      title: "Notes — RentLens",
      description:
        "Field notes on renting in Bengaluru: asking vs. actual rent, how to read a quote, maintenance and deposit norms, and what resident-reported data reveals.",
      path: "/notes",
      ogType: "website",
    }}
  >
    <Header />
    <main>
      <section class="px-5 sm:px-8 pt-14 sm:pt-20 lg:pt-24 pb-10 sm:pb-12 border-b border-hairline">
        <div class="max-w-base mx-auto">
          <HomeLink href="/" label="Home" />
          <div class="flex items-center gap-2.5 mb-7 sm:mb-9">
            <span class="w-1.5 h-1.5 rounded-full bg-marigold accent-dot" />
            <span class="eyebrow">/ Notes</span>
          </div>
          <h1 class="display text-[clamp(36px,6.5vw,84px)] leading-[1.02] font-normal max-w-[16ch]">
            Field notes on <span class="emph-accent">renting in Bengaluru</span>.
          </h1>
          <p class="mt-6 sm:mt-8 text-base sm:text-lg text-ink-mute max-w-[640px] leading-relaxed">
            What the listings don't tell you — written plainly, backed by what residents actually report.
          </p>
        </div>
      </section>
      <section class="px-5 sm:px-8 py-12 sm:py-16">
        <div class="max-w-base mx-auto divide-y divide-hairline">
          {notes.map((n) => (
            <a href={`/notes/${n.slug}`} class="group block py-7 sm:py-8 no-underline">
              <div class="num text-[11px] text-ink-faint tracking-[0.14em] uppercase mb-3">
                {humanDate(n.date)} · {n.readMins} min read
              </div>
              <h2 class="display text-xl sm:text-2xl font-medium tracking-tighter text-ink group-hover:text-marigold-deep transition-colors max-w-[760px]">
                {n.title}
              </h2>
              <p class="mt-3 text-base text-ink-mute leading-relaxed max-w-[680px]">{n.description}</p>
              <span class="mt-4 inline-flex items-center gap-1.5 text-sm text-marigold-deep font-medium">
                Read
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 7h8m-3-3l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" />
                </svg>
              </span>
            </a>
          ))}
        </div>
      </section>
    </main>
    <Footer figLabel="Fig. 07 — Notes" />
  </Layout>
);

// ---- Single article ----
function articleJSONLD(n: Note): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: n.title,
    description: n.description,
    datePublished: n.date,
    dateModified: n.date,
    url: `${HOST}/notes/${n.slug}`,
    publisher: { "@type": "Organization", name: "RentLens", url: HOST },
    mainEntityOfPage: `${HOST}/notes/${n.slug}`,
  });
}

export const NoteArticle: FC<{ note: Note }> = ({ note }) => {
  const Body = note.Body;
  return (
    <Layout
      meta={{
        title: `${note.title} — RentLens`,
        description: note.description,
        path: `/notes/${note.slug}`,
        ogType: "article",
        jsonLd: articleJSONLD(note),
      }}
    >
      <Header />
      <main>
        <article class="px-5 sm:px-8 pt-14 sm:pt-20 pb-16 sm:pb-20">
          <div class="max-w-[720px] mx-auto">
            <HomeLink href="/notes" label="All notes" />
            <div class="num text-[11px] text-ink-faint tracking-[0.14em] uppercase mb-4">
              {humanDate(note.date)} · {note.readMins} min read
            </div>
            <h1 class="display text-[clamp(30px,5vw,56px)] leading-[1.05] font-normal tracking-tighter mb-8">
              {note.title}
            </h1>
            <div class="h-px bg-hairline mb-8" />
            <Body />
          </div>
        </article>
      </main>
      <Footer figLabel="Fig. 07 — Notes" />
    </Layout>
  );
};
