# Reddit intro post (draft)

First public post introducing RentLens. Primary target: **r/bangalore**
(the launch push is Bangalore-first per `HANDOFF.md`). Possible later:
r/india once coverage widens.

Grounded in the live product (`src/views/pages/home.tsx`, brand voice in
`HANDOFF.md`) and the current catalog (`seed/societies.csv`): **36 seeded
societies** across the east-Bangalore / ORR / Whitefield IT belt — Whitefield,
Marathahalli, Bellandur, Sarjapur Road, Hoodi, Mahadevapura, Varthur, Panathur,
Thanisandra. The post is honest that this is an early, mostly-bootstrapped
dataset and frames that as the reason to contribute, not something to hide.

## Before posting — read HANDOFF.md, then this

1. **Subreddit self-promo rules.** r/bangalore (like most city subs) limits
   "launch your app" posts. Read the sidebar + recent mod posts. If unsure,
   message the mods first — a mod-blessed, correctly-flaired post lands far
   better than one that gets removed and burns the domain's reputation.
2. **Claim discipline (from HANDOFF.md "what you can / can't claim"):**
   - Do **not** say "every number is verified" — most ranges are still `seed`
     (indicative bootstrap). The honest line is "every number is stamped with
     how many reports back it and how recent they are."
   - No user counts, testimonials, or "thousands of contributors" — there's no
     real public traffic yet.
   - It's **intelligence-only**: not a broker, not a flat-finding service, no
     marketplace. Don't imply otherwise.
   - Email verification is **optional**, proof upload is **optional**, reports
     are **anonymous by default**. Don't write copy that implies email is
     required to contribute.
3. **The site is `noindex` (preview).** Fine for a Reddit link; just don't say
   "search your society on Google" yet.
4. **Brand mark is `RentLens.`** (with the period). Link the apex:
   https://rentlens.fyi — not the www variant.

> Note for the maintainer: `CLAUDE.md` §1 still describes the product as a
> "directory of housing societies in **Pune**," which contradicts HANDOFF.md
> and the actual Bangalore catalog. Worth reconciling §1 in a separate commit.

---

## Title options

Pick one. A is the safest / most on-voice (mirrors the homepage hero,
"Asking prices lie.").

- **A.** Asking prices lie — so I built a free, non-profit directory of what Bangalore residents *actually* pay in rent
- **B.** What are people really paying in your society? Trying to build a neutral rent reference for Bangalore — no brokers, no ads, not for profit
- **C.** A small non-profit project: real resident-reported rent ranges for Bangalore societies, and I need your help making them accurate

---

## Body

Property portals show you what owners *ask*. Almost nobody can tell you what
people in a society actually *pay*.

I ran into this helping a friend look for a flat on the ORR. The broker quotes
one number. The listing shows another that evaporates the moment you call. Ask
three people what a 2BHK in Whitefield "should" cost and you get three
confident, completely different answers. There's no neutral place to
sanity-check a quote before you're standing in the flat being told to decide in
ten minutes.

So I built one. It's called RentLens — a directory of housing societies with
rent ranges that come from residents, not brokers and not listings. Right now
it covers about 36 societies across the east-Bangalore / ORR belt: Whitefield,
Marathahalli, Bellandur, Sarjapur Road, Hoodi and nearby.

The thing I care about most: it doesn't pretend to know more than it does.
Every number is stamped with how many reports back it and how recent they are,
so you can see at a glance whether a range is solid or just an early estimate.
A lot of the data right now is still my own bootstrap estimate, clearly marked
as such — I'd rather show you "we don't actually know this one yet" than dress
up a guess as a fact.

A few things up front:

- **It's not a business.** No ads, no broker partnerships, no lead generation,
  and your data is never sold. It's a public reference, not a funnel. The only
  way a wrong number gets fixed is more residents reporting the real one.
- **No login, no paywall.** Just look things up.
- **Reporting is anonymous by default** and takes about a minute — seven quick
  fields. Optional email only if you want a follow-up; it's never shown publicly
  or shared.
- **It's intelligence only.** RentLens doesn't broker flats or replace the
  portals — it's just the missing reference layer for what rent actually is.

This only works if the numbers come from people who live in these societies,
which is where I'm hoping this sub can help. Two ways:

1. **Look up your society and add what you pay.** Every report turns an estimate
   into something real and makes the next person's search less blind. If your
   society isn't listed yet, you can add it.
2. **Tell me where I'm wrong.** This is an early, rough version. If a range is
   off, if I've covered the wrong areas, if the whole approach is flawed — I
   genuinely want to hear it. Correction is the point.

Full disclosure: I built this, so this is me sharing my own project, not posing
as a happy user. Happy to answer anything in the comments.

Link: https://rentlens.fyi

---

## Posting notes

- **Be present in the comments early.** The first hour sets the tone. Thank
  correctors, fix obvious errors fast, don't get defensive.
- **One link, near the end** (already done). Don't lead with it or repeat it —
  reads as spam.
- **If asked "what's the catch":** solo, non-profit, no monetisation, built to
  scratch my own itch. All true — just say it plainly.
- **No emojis, no hype words, no exclamation marks.** RentLens copy is
  deliberately plain and declarative; keep the post the same.
- **Verify the society count before posting** — it's 36 today but may move;
  or just say "a few dozen to start."
- **Save the data post for later:** once enough societies have real
  multi-resident ranges, a "here's what N reports say about Bangalore rents"
  follow-up usually outperforms a second launch post.
