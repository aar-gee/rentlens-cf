import type { FC } from "hono/jsx";

// Notes = RentLens's lightweight on-site blog. Posts are TS modules (mirroring
// the society-detail.ts pattern) rather than markdown files — no parser
// dependency, content and brand markup live together, and the body is just a
// hono/jsx component. The point is SEO long-tail ("rent in Bengaluru",
// "asking vs actual rent") + a place to link from Reddit/socials back into the
// directory.

export type Note = {
  slug: string;
  title: string;
  date: string; // ISO date, used for <lastmod>, display, and ordering
  description: string; // meta description + index excerpt
  readMins: number;
  Body: FC;
};

// Shared prose primitives so every post reads consistently on-brand.
const P: FC<{ children?: unknown }> = ({ children }) => (
  <p class="text-base text-ink-mute leading-relaxed mb-5">{children}</p>
);
const H2: FC<{ children?: unknown }> = ({ children }) => (
  <h2 class="display text-xl sm:text-2xl font-medium tracking-tighter text-ink mt-10 mb-4">{children}</h2>
);
const A: FC<{ href: string; children?: unknown }> = ({ href, children }) => (
  <a href={href} class="text-marigold-deep hover:text-marigold link-u font-medium">
    {children}
  </a>
);

const AskingVsActualBody: FC = () => (
  <>
    <P>
      If you've rented in Bengaluru recently, you already know the frustrating part: the price on the listing is almost
      never the price anyone pays. A 3 BHK in a Whitefield society shows ₹85,000 "asking." You tour it, you negotiate
      blind, and only later — usually from a neighbour — do you learn that three other tenants in the same tower are
      paying ₹65,000 to ₹70,000 for an identical unit. That gap isn't the market. It's the listing's optimism.
    </P>
    <H2>Why asking prices run high</H2>
    <P>
      Public listing portals are optimized for broker leads, not accuracy. A higher number gets more calls, and a stale
      number costs the portal nothing. So asking prices drift up and rarely come down, even when the actual signed rents
      in a building have flattened. The listing is a starting bid — treat it like one.
    </P>
    <H2>The three numbers brokers blur</H2>
    <P>
      Rent is only one of three costs, and it's the one everyone focuses on. The surprises live in the other two:
    </P>
    <P>
      <strong class="text-ink font-medium">Maintenance</strong> is quoted vaguely and varies a lot between societies for
      similar amenities — it can quietly add ₹4,000–₹10,000 a month. <strong class="text-ink font-medium">Deposit</strong>{" "}
      "norms" are softer than brokers claim once you know a building's going rate. Always separate the three before you
      compare two options, or you're comparing fiction.
    </P>
    <H2>How to sanity-check a quote</H2>
    <P>
      The method that actually works: ignore the portal number, then find two or three people who currently live in the
      building — same BHK, ideally same floor band — and ask what they pay, all-in. Check recency, because a number from
      eighteen months ago in a hot micro-market is already wrong. The hard part is step one: finding residents.
    </P>
    <P>
      That's the whole reason RentLens exists. We aggregate anonymous resident reports for Bengaluru's premium societies
      into a median and range, each stamped with how many people reported it and how recently — so you can do the
      resident check in thirty seconds instead of over WhatsApp. You can{" "}
      <A href="/societies">browse what we've got</A>, read the{" "}
      <A href="/how-it-works">methodology and confidence labels</A>, or — if you rent here —{" "}
      <A href="/submit">add what you pay in sixty seconds</A> so the next person isn't guessing in the dark.
    </P>
  </>
);

export const NOTES: Note[] = [
  {
    slug: "asking-vs-actual-rent-bengaluru",
    title: "Asking vs. actual: what renters really pay in Bengaluru's premium societies",
    date: "2026-05-31",
    description:
      "Listing prices in Bengaluru are a starting bid, not a number. Here's why asking rents run high, the costs brokers blur, and how to sanity-check a quote against what residents actually pay.",
    readMins: 4,
    Body: AskingVsActualBody,
  },
];

export function noteBySlug(slug: string): Note | undefined {
  return NOTES.find((n) => n.slug === slug);
}

// Newest first, for the index.
export function notesByDate(): Note[] {
  return [...NOTES].sort((a, b) => (a.date < b.date ? 1 : -1));
}
