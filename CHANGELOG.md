# Changelog

All notable changes to RentLens are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/); versions follow
[SemVer](https://semver.org/). Each release is git-tagged (`vX.Y.Z`).

## [Unreleased]

### Added

- "What we got" summary panel on /submit/success (user request
  2026-05-31). Closes RENT-eqqnvnce — the receipt is on-page instead of
  by email. Shows society/locality, BHK + sqft + furnishing, rent +
  maintenance + (when present) deposit + floor band. Indian-grouping
  rupee format (₹62,000). Renders on both the inline post-submit render
  AND the refresh-safe `/submit/success?id=` URL — `getSubmissionById`
  now returns the unit fields too.
- Submission visibility surfaces (user request 2026-05-31). Three new
  things: (1) ntfy push on every fresh submission via `notifySubmission()`
  — fire-and-forget through the existing NTFY_TOPIC; spam-flagged rows
  push at "low" priority so they don't crowd attention; (2) admin HTML
  browse at `<prefix>/submissions` with `?since=` (relative like `24h`
  / `7d` or an absolute SQLite-shaped datetime), `?status=`, `?spam=`
  filters; the page shows a stats bar + a compact one-row-per-submission
  table with verify/spam/pending-link badges; (3) AI / dev triage
  surfaces — admin JSON API at `<prefix>/api/submissions` (same filters)
  returning `{since, filters, count, summary{by_status,by_spam,by_verify,
  new_society,new_area}, rows[]}`, plus `scripts/recent-subs.sh` that
  wraps `wrangler d1 execute` so neither HTTP creds nor the admin URL
  prefix are needed (only the wrangler / CF API token already on the
  machine).
- Silent per-email + per-IP spam control (RENT-okskjmao). New `spam_flag`
  and `ip_address` columns on `submissions`. `spam_flag` flips to 1 when
  EITHER (a) the contributor's `help_contact` has already posted ≥ 5
  reports in the last 7 days, OR (b) the client IP (from CF-Connecting-IP,
  with X-Forwarded-For leftmost as fallback) has posted ≥ 10 reports in
  the last 7 days. The per-IP threshold is more lenient than per-email
  because shared IPs are legitimate (home WiFi, office NAT, CGNAT in
  India). Both thresholds tunable in `src/lib/spam.ts`. No UI signal —
  the contributor sees the standard success / verify flow. Aggregate
  readers (when the publish-time recompute lands) use
  `effectiveSubmissionFilter()` to exclude flagged rows EXCEPT when the
  society has only flagged data (degrade gracefully — don't blank a
  spammer-only society). Verified emails are NOT exempt: verification
  proves inbox ownership, not non-spamminess. Anonymous and IP-less
  submissions skip their respective rule.
- "Verify email" button on Step 1 of /submit (user feedback 2026-05-30,
  RENT-ahstlnjb continued). Clicking it sends the verification email
  immediately — no need to finish the form first. Cookie-backed
  (`rl_preverify`, HttpOnly Secure SameSite=Lax, 30min); the inline status
  block then renders the inbox prompt + 6-digit code input; both magic-link
  and code paths consume the same pre-verification row. At final submit
  time the cookie's pre row is attached to the new submission: if already
  consumed → submission immediately `verify_state='verified'`; if not yet
  consumed → linked anyway, so the SAME email's link verifies retroactively
  (no duplicate mail). A soft nudge fires when the user clicks
  Continue/Skip with an email typed but never clicked Verify email — they
  can still proceed. Picking a society from the dropdown now also
  auto-fills the area field (separate small fix shipped earlier as
  bcead4b).

### Changed

- Step 1 of /submit now has an optional **Your email** field framed as a
  credibility signal ("Verified reports are weighted more heavily and
  surfaced as 'verified resident' on the society page"). The email carries
  through Step 2 and pre-fills Step 3's contact field with a
  "Carried from Step 1 — edit or clear" hint. Verification fires at the
  final persist boundary (Step 1 skip OR Step 3 submit), not at Step 1
  continue (the submission row doesn't exist yet). When the contributor
  also opts in to "willing to help" on Step 3, intros are gated downstream
  on `verify_state='verified'` — the opt-in is dormant until verified.
  Single source of truth: new `isActiveOptIn()` helper in `data/submission`.
- Split the optional Step 2 of /submit into two shorter steps to reduce
  perceived form length and drop-off (RENT-tpsfwybf). Progress now reads
  "Step 0X of 3". Step 2 carries unit detail + society experience (sections A
  + B); Step 3 carries source channel + movers + the help-future-renters
  opt-in (sections C + D + E). Both still fully optional; existing Step 1
  "skip rest" shortcut unchanged. Step 3 has a Back button that preserves all
  filled state. Turnstile only gates the final persist (Step 3) — Step 2 is a
  pure navigation hop. Old `/submit/step2` POST endpoint replaced by
  `/submit/step2a` (validates section-A numeric ranges + renders Step 3) and
  `/submit/step2b` (final persist + verify trigger).

### Added

- Email verification for submissions (RENT-ahstlnjb). When a contributor opts
  in to "willing to help" + provides an email on Step 2, we send a single
  email containing **both** a magic link (`/verify/<token>`) and a 6-digit
  code; the contributor picks whichever they prefer. Both expire in 30 min;
  5 wrong codes locks the attempt and forces a resend (60s cooldown). Verified
  reports are flagged on the submission row (`verify_state` + `verified_at`)
  — orthogonal to moderation, so admins still review every report. Built
  behind a single `src/lib/email.ts` `sendEmail()` interface (Resend-backed
  today, gated to log-only no-op when `RESEND_API_KEY` is unset so local dev
  + pre-secret staging still work). New table `email_verifications` carries
  the token, code, expiry, and attempt counter.
- Staging environment (`wrangler deploy --env staging`) on a separate
  `workers.dev` subdomain (see `wrangler.toml`) — its own D1 (`rentlens-staging`),
  its own secrets (staging admin creds + Turnstile **test** keys), `noindex`.
  Promote to prod only after verifying here.
- `scripts/set-secrets.sh [env]` — per-environment secret push
  (`.secrets.local` for prod, `.secrets.<env>.local` for named envs).

### Fixed

- Staging deploy no longer steals the `rentlens.fyi` custom domain
  (`routes = []` override on `[env.staging]` stops the top-level route being
  inherited).

## [0.1.0] — 2026-05-30

Initial release — RentLens live on Cloudflare at **https://rentlens.fyi**. A
ground-up Cloudflare-native rewrite of the Go/Templ/Postgres original (Workers +
Hono + hono/jsx + D1 + Tailwind), free-tier hosted.

### Added

- **Catalog & read pages**: homepage (featured strip + autocomplete search +
  area/BHK filter pills, HTMX), society detail pages with rent breakdown /
  qualitative / moving-in / compare-nearby, sparse "reporting in progress"
  state, and 404s. 36-society Bengaluru seed + 68 aliases.
- **Submit flow**: 2-step contributor form with server-side validation,
  "+ add new society/area" affordances, pending-society/area moderation upserts,
  and a success page with pending-aware copy.
- **Contact** form with ntfy push notification (fire-and-forget).
- **Static pages**: how-it-works (methodology + FAQ + data-label explainer),
  privacy, terms.
- **Admin moderation** behind basic-auth + an obscure prefix: dashboard, pending
  societies/areas queues with real transactional actions (merge / create /
  promote / reject), messages queue (resolve / reopen / mailto reply), audit log.
- **Turnstile** anti-spam on the submit + contact forms (gated; no-op without keys).
- **Builders table** with a Category-A tier flag that drives the homepage
  featured strip (non-A builders stay searchable), plus an admin builder select
  + management page.
- **Provenance tier** (`seed` / `estimated` / `resident`) with an honest,
  explained label on society pages — so seeded data is never mistaken for
  resident-reported data, and real data is preferred as it arrives.
- **Infra**: D1 migrations, `rentlens.fyi` custom domain + edge cert, www→apex
  redirect, secrets tooling (`scripts/set-secrets.sh`).

[Unreleased]: https://github.com/aar-gee/rentlens-cf/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/aar-gee/rentlens-cf/releases/tag/v0.1.0
