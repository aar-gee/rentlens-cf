# Changelog

All notable changes to RentLens are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/); versions follow
[SemVer](https://semver.org/). Each release is git-tagged (`vX.Y.Z`).

## [Unreleased]

### Changed

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
