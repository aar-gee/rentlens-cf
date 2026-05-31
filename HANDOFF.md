# RentLens — current-state handoff

**Last updated:** 2026-05-31
**Audience:** any agent (or human) picking the project up — especially marketing / content / growth work. Engineering practices live in [`CLAUDE.md`](./CLAUDE.md); the agent contract for non-Claude agents (Codex, Cursor, etc.) is in [`AGENTS.md`](./AGENTS.md); user-visible changes are tracked in [`CHANGELOG.md`](./CHANGELOG.md). This file is the **product + brand** context.

If you're here to write copy, a press note, social posts, blog drafts, email sequences, or any other outward-facing artifact — **read this first**, then verify the live product matches.

---

## What RentLens is (in one paragraph)

A directory of housing societies with verified resident-reported rent ranges. Live at **https://rentlens.fyi**. The premise is in the homepage headline: **"Asking prices lie."** Property portals advertise what owners *ask*; RentLens shows what residents actually *pay* — median rent, maintenance, deposit norms, floor-band differences — every number stamped with sample size and recency. Contributors submit anonymous 60-second reports; verified-email contributors get weighted more heavily; admins moderate before publishing. The product is **intelligence-only** — RentLens deliberately does NOT broker flats, list owners, or replace portals.

## Live URLs

| | URL | Notes |
|---|---|---|
| Production | https://rentlens.fyi | Custom domain. `noindex` for now (preview phase — no real resident traffic yet). |
| Staging | `https://rentlens-staging.<account>.workers.dev` | Real subdomain in `wrangler.toml`. `noindex` forever. |
| Repo | https://github.com/aar-gee/rentlens-cf | Private. |
| Admin | `https://rentlens.fyi/x-a9c2d27eab89/` | Basic-auth gated. The URL prefix is semi-public (logs); the basic-auth password is the real gate. Don't link it from marketing material. |

---

## Brand voice — verbatim from the live product

This is the actual copy on the site. Match this register when you write anything new.

### Hero (homepage)
> # Asking prices lie.
> *(followed by a tagline pulling the eye to "real residents.")*

### Section headers (homepage)
> **Real numbers from real residents.**
> *Featured · last 12 months*

> **The data is only useful if it's real.**
> *How it works*

> **Portals show you what owners *ask*.
> We show you what residents *pay*.**
> *Why this exists*

### Submit flow
> **Submit your rent.**
> *Seven quick fields. Helps future renters of your society see real numbers, not asking prices.*

### Empty state
> No societies match these filters yet. Submit a report to put yours on the map.

### Privacy / trust framing (in inline copy)
> Anonymous by default. Every report sharpens the picture for whoever searches your society next.
> We never show your email publicly or share it with anybody.
> 60-second submission.

### Ack/proof-prompt email (RENT-ngelwosv, levels.fyi-style)
> Hi, thanks for adding your rent data to RentLens. Submissions like yours are the only way to keep the picture accurate for the next renter.
> Here's what we got: *[society, BHK, rent, maintenance]*
> If it's something you're open to, sharing a quick proof point — rental agreement, lease screenshot, even a redacted utility bill — helps us verify your entry. It's entirely optional, but verified reports are weighted more heavily and make the dataset more accurate for everyone relying on it.

### Tone rules (extracted from the existing copy + `CLAUDE.md` §8)
- **No emojis** anywhere. Not in copy, not in code, not in commit messages, not in emails. The user is explicit about this.
- **Plain, deliberately unfancy.** No exclamation marks except the rare "Submitted." or "You're verified." in success states. No "🚀 launch", no "elevate", no "empower", no startup-speak.
- **Truth-claim heavy.** The product's whole pitch is "real over asking." Voice leans into that — declarative, slightly contrarian, never breathless.
- **Single italics for emphasis.** Words like *ask* and *pay* get rendered with a custom `<span class="emph">` / `<span class="emph-accent">`. Don't use ALL CAPS.
- **Numerals are first-class.** "60-second submission," "Seven quick fields." The site uses a monospace font for numbers (JetBrains Mono); copy treats specific numbers as the point.
- **No city in outward copy.** The site does NOT claim a city in its tagline, emails, or branding. Email signoffs are just "RentLens · rentlens.fyi" — no "Pune", no "Bengaluru". The homepage mentions the *neighborhoods we currently cover* (Whitefield, Hoodi, Brookefield, Nallurhalli — all Bengaluru clusters) because those are real catalog facts, but the brand is city-agnostic. Don't put a city in headlines, sign-offs, or meta tags. If you need to name where the catalog focuses today, mention the neighborhoods, not the city.

---

## Visual language

You probably don't need to design — but if you're commissioning a graphic, a screenshot, or a social card, match this:

### Palette (Tailwind tokens in `tailwind.config.js`)
| Token | Use |
|---|---|
| `parchment` `#F7F2EB` | Page background — warm cream, not white |
| `parchment-deep` `#EDE5D6` | Subtle panels, hovered rows |
| `ink` `#1A1F26` | Body text, headings, dark UI |
| `ink-mute` `#4A5260` | Secondary text |
| `ink-faint` `#8A8F99` | Tertiary text, eyebrows |
| `marigold` `#D4811F` | Brand accent — the period in "RentLens." is marigold |
| `marigold-deep` `#B36A14` | Active states, links on hover |
| `hairline` `#D4CDC0` | Borders, dividers |
| `danger` `#B8362B` | Errors, spam badges, area-mismatch flags |
| `success` `#3D7B5C` | Verified badges, success states |

### Type
- **Display + body:** **Geist** (sans, slightly geometric, modern but not "tech")
- **Numerals + monospace:** **JetBrains Mono**
- The brand mark is **`RentLens.`** — period in `marigold`. Don't drop the period.

### Layout sensibility
- A lot of negative space. Wide horizontal lines (`border-hairline`), generous padding, single-column reading. Reads like a small magazine, not a SaaS marketing page.
- The grid uses warm hairlines, not boxes. Cards are bordered, not shadowed.
- Tiny "eyebrow" labels on every section in `num text-[10px] tracking-[0.14em] uppercase` — "Featured · last 12 months", "How it works", "Why this exists".

---

## What you can honestly claim today (and what you can't)

### Shipped + live on rentlens.fyi
- **36 seeded societies** in the catalog (initial Bengaluru-cluster set — Whitefield, Hoodi, Brookefield, Nallurhalli area)
- **Contributor submission flow** — 3-step optional, skippable to "minimum data" after Step 1
- **Optional email verification** (magic link + 6-digit code, dual-path) — adds a "verified resident" weight signal on the contributor's report
- **Optional rental-agreement proof upload** (image / PDF, 500 KB cap, client-side downscale) — same trust-tier signal
- **Honest provenance labels** on every rent range: `seed` (indicative starter), `estimated` (single resident report), `resident` (multiple verified reports). The UI shows the actual label per society. **Marketing must not flatten this** — the trust pitch IS the honesty.
- **Silent spam control** — per-email + per-IP rate rules behind the scenes; aggregate queries filter spam-flagged but degrade gracefully (a society with only flagged data still surfaces).
- **Server-rendered, no SPA** — fast on mobile, no JS framework dependency.

### Constraints you must respect in copy
- **The site is in preview** (`noindex`). It's not searchable on Google by design. Don't claim "search for your society on Google" yet.
- **Most rent ranges are still `seed`** (indicative bootstrap). The "resident-verified" claim is true for *some* societies, not yet most. Marketing language like "every number verified" is **not honest yet** — the better phrasing is "every number stamped with sample size and recency" (already on the site).
- **No real public traffic yet.** Don't reference user counts, testimonials, or "thousands of contributors." Truthful framing: "we're building this for renters; here's where it lives; here's how to contribute."
- **No subscriptions, no broker functions, no flat-finding service.** This is the explicit positioning lock: RentLens is intelligence-only. A marketplace product is a *separate future thing* and out of scope for current marketing.
- **Verified email is OPTIONAL.** Don't write copy that implies email is required to submit — the form intentionally lets people contribute anonymously.

---

## Trust signals shipped (worth knowing for copy)

These are real defensible claims:

| Signal | What it means in copy |
|---|---|
| Provenance tier visible | "Every number says where it came from." |
| Optional email verification (magic link + 6-digit code) | "Verified contributors are weighted more heavily." |
| Optional rental-agreement upload (R2, 500 KB, 90-day retention) | "Share proof if you want — it's optional, and we never publish it." |
| Spam-flagged reports excluded from aggregates | "We don't blank a society over one bad-faith report — but we don't trust it either." |
| Admin moderation queue before publish | "Reports enter a queue. Real people review before anything goes live." |
| Sender domain verified (rentlens.fyi) | Emails come from `verify@rentlens.fyi`, properly SPF/DKIM/DMARC signed. |
| No PII in logs, no IP/email shown publicly | Privacy promise on `/privacy` is real. |

---

## Channels we have wired

| Channel | Status | Notes |
|---|---|---|
| **Transactional email** | Live (Resend via `src/lib/email.ts`) | Verify email + ack/proof-prompt email already sending from `verify@rentlens.fyi`. Same interface can send any future receipts / newsletters. Single-file provider swap if we move off Resend. |
| **Mobile push to admin** | Live (ntfy.sh via `src/lib/notify.ts`) | Used for new-submission + contact-form pings. Not user-facing. |
| `/contact` form | Live | Categories: bug / feature / message. Lands in admin queue + pings admin via ntfy. |
| **Social** | None yet | No Twitter / LinkedIn / Instagram presence. Marketing decides if/when. |
| **Blog** | None yet | No content surface on the site. If you want to add `/blog`, that's a new route + view (small engineering ask). |
| **Newsletter** | Possible | The `sendEmail()` interface is generic. We don't have a subscriber list table; that's a small migration if needed. |

---

## What's already in the public copy you can lift

Pages you can read directly to crib voice from:
- `/` (homepage) — hero, "Why this exists", "How it works", featured societies
- `/how-it-works` — the long-form explainer
- `/privacy` — privacy promise
- `/terms` — terms of use
- `/submit` — submission flow + the inline help text
- `/contact` — three-category contact form

All page sources are in `src/views/pages/`. Don't paraphrase — these are the canonical phrasings.

---

## What's NOT shipped (don't write about these as features)

- No society search by **map** (catalog list + name autocomplete only)
- No society **comparison view** (one society at a time)
- No saved searches, alerts, or email digests to renters
- No mobile app (responsive web only — works fine on phones)
- No public API
- No user accounts (contributors don't have logins — verification is per-submission)
- No payments / paid tier — the product is fully free
- No discovery scraping (a discovery epic exists but is blocked on Google CSE access; deferred)

---

## How to file marketing / content work

- Project uses **fp** (Foundry) for issue tracking. Prefix is `RENT`.
- For marketing-shaped work, file under the **`vuidxktszzejipnmzpsqwjpaglcdndds`** parent (the "Seed & trust" epic) OR create a new epic if it's a sustained content/growth program. Ask the user.
- Commands you'll use:
  - `fp issue create --title "..." --description "..." --parent <epic>` to file
  - `fp issue list` / `fp tree` to see backlog
  - `fp context <id>` to load an issue with full thread
  - `fp issue update --status in-progress <id>` when claiming work
  - `fp comment <id> "..."` at checkpoints
  - `fp issue update --status done <id>` when shipped + verified

---

## Quick checklist before any external publish

- [ ] Voice matches the existing copy (declarative, plain, no emojis, no marketing-speak)
- [ ] Numbers cited are accurate (check live site or `recent-subs.sh` for current submission counts)
- [ ] No claim of "every number is verified" — many are still `seed` provenance
- [ ] No reference to features not on the live site
- [ ] No city in headlines, sign-offs, or meta tags (neighborhood names are fine)
- [ ] Trust signals named correctly (verification is optional, proof is optional, anonymity is default)
- [ ] Admin URL not referenced
- [ ] Brand mark is `RentLens.` (with the marigold period)
- [ ] Linked: rentlens.fyi (apex). www→apex redirect is wired but don't link the www variant

---

## For future agents

This file is the marketing-side contract. If you change a feature in a way that affects what marketing can claim — close a flow, ship a new trust signal, change the city, retire a page — **update this file in the same commit**. Stale handoff docs are worse than no handoff docs.

The full agent contract (engineering practices, deploy ladder, fp rules) lives in [`CLAUDE.md`](./CLAUDE.md). The auto-pulled `@FP_CLAUDE.md` covers fp-specific rules. [`AGENTS.md`](./AGENTS.md) is the short-form pointer for non-Claude agents.
