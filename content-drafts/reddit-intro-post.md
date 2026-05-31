# Reddit intro post (draft)

First public post introducing RentLens. Primary target: **r/bangalore**
(the launch push is Bangalore-first per `HANDOFF.md`). Possible later:
r/india once coverage widens.

Voice: first-person founder story, plain and direct, light Indian-English
register without caricature. Inspiration is the levels.fyi origin-story tone —
"I kept getting burned by missing information, so I built the reference I
wished existed."

## Verified against production (rentlens.fyi) on 2026-05-31

- **Society count = 24, NOT 36.** The live autocomplete API (`/api/societies`),
  enumerated across a-z + every builder + every locality, returns exactly **24**
  published societies. The 36 figure is the repo seed CSV (`seed/societies.csv`);
  only 24 are actually live on prod. The body below uses "about two dozen" / 24.
  > Maintainer note: HANDOFF.md still says "36 seeded societies." That's the
  > seed file, not production. Worth reconciling — only 24 are published live.
- **Provenance labels are live = claim holds.** The prod homepage shows the
  labels verbatim: `seed`, `estimated`, `partially verified`, `verified source`.
  So "every number is clearly marked" is honest and verified.

## Before posting

1. **Subreddit self-promo rules.** r/bangalore limits "launch your app" posts.
   Read the sidebar + recent mod posts; message the mods first if unsure.
2. **Claim discipline (HANDOFF.md):** don't say "every number is verified" (most
   are still `seed`/`estimated`); no user counts or testimonials; it's
   intelligence-only (not a broker/marketplace); reporting is anonymous, email
   and proof are optional.
3. **Site is `noindex` (preview).** The Reddit link works; just don't say
   "search your society on Google" yet.
4. **Link the apex:** https://rentlens.fyi — not the www variant.

---

## Title options

Pick one. A leans hardest into the story.

- **A.** Rented 4 flats in 10 years and overpaid almost every time. So I'm building a levels.fyi for Bangalore rents.
- **B.** Asking prices lie. I kept finding out my neighbours paid less than me for the same flat, so I built a free rent reference for Bangalore.
- **C.** A non-profit project: what Bangalore residents actually pay in rent, reported by residents. Looking for feedback and contributors.

---

## Body

In the last 10 years I have rented 4 different flats in Bangalore. Almost every
single time, I found out later that I had overpaid.

The problem was always the same. I never knew anyone living in the society. So
when the broker or owner quoted a number, I had nothing to compare it against. I
would negotiate a little, feel good about saving one or two thousand, and move
in. Then a couple of months later I would meet a neighbour in the lift and
casually find out they were paying 5-6k less than me for the exact same 2BHK,
same floor, same everything. Every time this happened it genuinely irritated me.

That is the whole problem. There is no neutral place to check what people in a
society are actually paying before you sign. Portals only show you what owners
are *asking*, which is a fantasy number. Brokers obviously will not tell you.
And the one real source, the residents themselves, you have no way to reach
before you have already moved in.

So I started building one. It is called RentLens. Think of it like levels.fyi
but for rent. People who actually live in a society report what they pay, rent,
maintenance, deposit, and the next person can simply look it up instead of going
in blind like I did 4 times.

Right now it covers about two dozen societies on the east Bangalore / ORR side,
Whitefield, Marathahalli, Bellandur, Sarjapur Road, Hoodi and nearby. I will be
honest, it is early. A lot of the numbers right now are still my own rough
estimates, and they are clearly marked as such on each society. I did not want
to fake confidence and show you a guess as if it were a verified fact. Every
number tells you how many people reported it and how recent it is, so you know
whether to trust it or take it with a pinch of salt.

A few things I want to be upfront about:

- This is **not a business.** No ads, no broker tie-ups, no lead selling,
  nothing. I am not making money from this. Your data is never sold. It is just
  a public reference, the thing I wish existed when I was renting.
- **No login, no paywall.** Just open and check.
- **Reporting is anonymous.** Takes about a minute, seven small fields. Email is
  optional, and even if you give it, it is never shown anywhere or shared.

It only works if enough residents add their real numbers, so this is where I
could use help from this sub:

1. **Look up your society and add what you pay.** Even one entry helps the next
   person avoid getting fooled the way I did.
2. **Tell me where I am wrong.** It is rough and early. If a range looks off, if
   I have covered the wrong areas, if you think the whole idea is pointless,
   please tell me. I genuinely want the feedback.

Full disclosure, I built this, so this is me sharing my own thing, not
pretending to be some random happy user. I will be in the comments, ask me
anything.

Link: https://rentlens.fyi

---

## Posting notes

- **Be present in the comments early.** First hour sets the tone. Thank
  correctors, fix obvious errors fast, don't get defensive.
- **One link, near the end** (already done). Don't lead with it or repeat it.
- **If asked "what's the catch":** solo, non-profit, no monetisation, built to
  scratch my own itch. All true, just say it plainly.
- **No emojis, no hype words, no exclamation marks.**
- **Re-check the live society count before posting** (24 as of 2026-05-31, may
  move); or keep the soft "about two dozen" already in the body.
- **Save the data post for later:** once enough societies have real
  multi-resident ranges, a "here's what N reports say about Bangalore rents"
  follow-up usually outperforms a second launch post.
