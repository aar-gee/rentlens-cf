# RentLens — Cloudflare-native rewrite · kickoff handoff

**Date:** 2026-05-29
**Author:** previous session (context ran low mid-scaffold)
**Status:** Phases 0–5 SHIPPED + committed + verified locally (`npx wrangler dev`).
Only Phase 6 (Turnstile + deploy) remains — it needs an interactive
`wrangler login` + Cloudflare-dashboard steps. fp tracker prefix **RENT**
(issues RENT-fqtqrqac … RENT-zdlfgdet); only RENT-zdlfgdet (Phase 6) is open.

Progress notes for a fresh session:
- Stack live: Hono + hono/jsx + D1 + Tailwind v3 → `public/static/tailwind.css`.
- Routes done: `/`, `/search`, `/featured`, `/societies/:slug` (+ sparse + 404),
  `/submit` (step1/step2/success), `/areas/search`, `/movers/search`, `/contact`,
  `/how-it-works`, `/privacy`, `/terms`, admin under `/x-a9c2d27eab89` (basic-auth).
- D1: `migrations/0001_init.sql` + `0002_seed_societies.sql` (36 societies + 68
  aliases). Apply locally: `npm run db:migrate:local`.
- Two deliberate deviations from the Go MVP (confirmed with user): (1) admin
  pending-AREA actions are REAL persistence (Go left them dummy); (2) privacy/
  terms "where data lives" copy says D1 (not the Go "in-memory, resets on deploy").
- Curated `SocietyDetail` is a TS data module (`src/data/society-detail.ts`),
  not DB rows — mirrors the Go in-code approach.
- Email receipt (Resend) is NOT wired yet — deferred; needs RESEND_API_KEY.
- Local admin creds for dev live in `.dev.vars` (gitignored): ADMIN_USER/ADMIN_PASS.

---

## What this repo is

A **ground-up rewrite of RentLens** to run entirely on **Cloudflare's free tier**. The original product is a working Go + Templ + HTMX + Postgres app at `../society-rental-intelligence` (deployed on Render, then Railway). Railway's trial ended; the user chose to go fully Cloudflare-native for a permanent $0 host — knowingly accepting a full rewrite ("a bitter pill").

**This rewrite is a port, not a redesign.** The Go app is the spec. Behaviour, copy, design, and data model should match it unless noted. Don't reinvent — translate.

### Why the rewrite (don't re-litigate)

Cloudflare's free compute is Workers (V8/WASM), which **cannot run a Go `net/http` server or talk to Postgres over TCP**. So "free Cloudflare" forced the language + data-layer change. The user accepted this because:
- Truly $0 forever — no trials, no card-required compute.
- Makes RentLens the first **Cloudflare-native** app, which is the substrate the portfolio strategy wants for running 5–6 ideas free (see memory `project-strategy`). This rewrite doubles as the reusable Cloudflare starter.

The free-container alternative (Cloud Run / Koyeb + Neon, keeping the Go code) was explicitly considered and declined. Don't re-pitch it.

---

## Target stack

| Concern | Choice |
|---|---|
| Runtime | Cloudflare **Workers** (free tier) |
| Web framework | **Hono** |
| Templating | **hono/jsx** (server-side JSX — the Templ analogue) |
| Data | **Cloudflare D1** (SQLite) |
| Client interactivity | **HTMX** (unchanged — it's framework-agnostic HTML-over-the-wire) |
| Styling | **Tailwind v3** compiled to a static CSS asset (unchanged approach) |
| Static assets | Workers static-assets binding (compiled CSS, HTMX, icons) |
| Anti-spam | **Cloudflare Turnstile** (finally native) |
| Email receipts | **Resend** via `fetch()` (works in Workers — it's just HTTPS) |
| Mobile notify | **ntfy.sh** via `fetch()` (works in Workers — just an HTTPS POST) |
| CLI / deploy | **wrangler** (as a dev dependency; `npx wrangler`) |
| Lang | TypeScript |
| Domain | **rentlens.fyi** — already bought + on Cloudflare DNS |

---

## Source-of-truth: the Go app to port from

Path: `/Users/rahul/git/personal/ideation/society-rental-intelligence` (sibling of this repo).

It's a complete, working, Postgres-backed implementation. Read it as the spec. Key locations:

```
src/internal/
├── data/                      # stores + models (Postgres/pgx/sqlc)
│   ├── society.go             # Society + Store: Search/Filter/ListFeatured
│   ├── society_detail.go      # curated detail entries
│   ├── area.go                # CanonicalAreas list + IsCanonicalArea
│   ├── submission.go          # Submission model (+ PendingSocietyID, PendingAreaID)
│   ├── pending_society.go / _store.go   # pending-society model + D1-able queries
│   ├── pending_area.go / _store.go      # pending-area model
│   ├── contact.go / contact_store.go    # contact submissions + open/resolved status
│   └── seed/societies.csv     # 36-society seed catalog
├── db/                        # pgx pool + migration runner + sqlc
│   ├── migrations/*.sql       # canonical schema (port these to D1/SQLite)
│   └── sqlc/                  # generated queries — read the .sql query defs
├── handlers/                  # HTTP handlers (→ Hono routes)
│   ├── home.go                # Server struct (all deps wired here)
│   ├── society.go, search.go, featured.go
│   ├── submit.go              # 2-step submit + validation + persistSubmission
│   ├── contact.go             # contact form + notifyContact
│   └── static_pages.go        # how-it-works / privacy / terms
├── admin/                     # moderation UI (→ src/routes/admin + views/admin)
│   ├── server.go              # basic-auth middleware + obscure prefix + routes
│   ├── handlers.go            # queue reads + dummy + real (message resolve/reopen) actions
│   └── ui.templ               # dashboard + pending-society/area queues + messages
├── email/resend.go            # Mailer interface + Resend client + Noop
├── notify/notify.go           # Notifier interface + Ntfy client + Noop
└── ui/
    ├── layout/base.templ      # <html> shell, SEO meta, icons, script includes
    ├── components/*.templ     # header, footer, society_card, search_results, etc.
    ├── components/form/*.templ # label, text_input, number_input, textarea, radio, select
    └── pages/*.templ          # home, society, submit, submit_step2, submit_success,
                               #   contact, how_it_works, privacy, terms
```

Also read `../society-rental-intelligence/.claude/sessions/2026-05-14-mvp-preview-shipped.md` — the original MVP handoff with route map + design notes.

---

## Port mapping (Go → Cloudflare-native)

| Go / current | Target |
|---|---|
| `net/http` ServeMux | Hono router (`app.get/post`) |
| Templ component | hono/jsx function component |
| `internal/ui/layout/base.templ` | `src/views/layout.tsx` |
| `internal/ui/components/*.templ` | `src/views/components/*.tsx` |
| `internal/ui/pages/*.templ` | `src/views/pages/*.tsx` |
| `internal/handlers/*.go` | `src/routes/*.ts` |
| `internal/admin/*` | `src/routes/admin.ts` + `src/views/admin/*.tsx` |
| pgx + sqlc + Postgres | D1 (`c.env.DB.prepare(...).bind(...).all/first/run()`) |
| `internal/data/*_store.go` | `src/data/*.ts` query modules taking the D1 binding |
| `db/migrations/*.sql` (Postgres) | `migrations/*.sql` (SQLite dialect) |
| embedded static FS | `public/` via Workers assets binding |
| Tailwind compiled CSS | same — compile to `public/tailwind.css` |
| HTMX via CDN | same (`<script src="https://unpkg.com/htmx.org@2...">`) |
| Resend (`email/resend.go`) | `src/lib/email.ts` — `fetch()` to Resend API |
| ntfy (`notify/notify.go`) | `src/lib/notify.ts` — `fetch()` to `https://ntfy.sh/<topic>` |
| ADMIN_USER/PASS basic auth | Hono `basicAuth()` middleware + wrangler secrets |
| obscure admin prefix `/x-a9c2d27eab89` | keep the same constant |
| `stripWWW` middleware | now that DNS is proxied on Cloudflare, do www→apex with a **Cloudflare Redirect Rule** at the edge (no app code) — OR a Hono middleware. Prefer the edge rule. |
| canonical host const | `rentlens.fyi` (env var or constant) |

### Data model (the ~5 tables to port to D1/SQLite)

From `db/migrations/`: `societies`, `society_details` (or merged), `submissions`, `pending_societies`, `pending_areas`, `contacts`. SQLite notes:
- No Postgres types: `BOOLEAN` → `INTEGER` (0/1); timestamps → `TEXT` ISO-8601 or `INTEGER` epoch; use `DEFAULT (datetime('now'))`.
- `ON CONFLICT ... DO UPDATE` (upsert) works in SQLite — the `FindOrCreate` upserts port directly.
- IDs are app-generated 8-char base32 (`newShortID`) — keep that; generate in TS (crypto.getRandomValues).
- D1 free tier: 5GB storage, 5M row-reads/day. Ample for preview.

---

## Phased plan (these are the live task list)

**Phase 0 — Scaffold (START HERE).** package.json, wrangler.toml (D1 + assets bindings), tsconfig, tailwind config + input.css, a Hono hello-world `src/index.tsx`. Goal: `npm run dev` (= `wrangler dev`) serves a page locally with a local D1 binding. Get the toolchain green before porting anything (mirrors the original project's "first build should be green" lesson). Commit.

**Phase 1 — Design system + Base layout.** Port `tokens.css` + tailwind config from the Go repo's `design/system/`. Build `src/views/layout.tsx` (head/SEO/icons/script includes), header, footer as JSX. Homepage shell renders with correct fonts (Geist + JetBrains Mono), parchment/ink/marigold palette.

**Phase 2 — D1 schema + seed.** Port `db/migrations/*.sql` to SQLite in `migrations/`. Seed the 36 societies from `seed/societies.csv` (+ the 10 curated details from `society_detail.go`) via a seed migration or a `wrangler d1 execute` seed script.

**Phase 3 — Read pages.** home (featured + autocomplete search + filter pills), society detail (+ sparse fallback + 404), `/search` + `/featured` HTMX fragments. Port the read queries to D1.

**Phase 4 — Submit flow.** 2-step form, server-side validation, "+ Add new society" affordance (≥3 chars, zero matches), "Other" area free-text reveal, pending-society/area upserts, the 3 success-page copy variants (society-pending / area-pending / combined). Reference `submit.go` + `submit*.templ` + `persistSubmission`.

**Phase 5 — Contact + admin.** Contact form + ntfy notify (fire-and-forget). Admin moderation behind basic-auth + the obscure prefix: dashboard, pending-societies queue, pending-areas queue, messages queue (list/expand/mailto-reply/resolve-reopen). Reference `internal/admin/`.

**Phase 6 — Turnstile + deploy.** Add Turnstile to submit + contact (native now). `wrangler login` (user, browser), `wrangler d1 create`, run migrations on remote D1, `wrangler deploy`, wire `rentlens.fyi` custom domain + the www→apex edge Redirect Rule. Set secrets: ADMIN_USER, ADMIN_PASS, NTFY_TOPIC, RESEND_API_KEY, TURNSTILE_SECRET.

---

## Environment notes

- **Node 24, npm 11** installed. Wrangler goes in as a dev dependency (`npm i -D wrangler`), invoked via `npx wrangler` or an npm script.
- **`wrangler dev` runs fully local** (miniflare + local D1) — no Cloudflare login needed to build + test. Login is only needed for `wrangler deploy` + creating the real remote D1 (Phase 6).
- **`wrangler login` is browser-interactive** — the user must run it (`! wrangler login`). Same pattern as the railway/railway login earlier.
- **rentlens.fyi is already on Cloudflare** (bought from Cloudflare on 2026-05-29). DNS is there; for Workers the custom domain is added in the Workers dashboard or via wrangler routes.
- GitHub account is `aar-gee` (memory `user_github`). New repo not yet pushed; create `aar-gee/rentlens-cf` (or user's preferred name) when ready.
- This repo is NOT yet under fp issue tracking. The Go repo uses fp with prefix `SOCI`. Ask the user whether to `fp init` this repo or track the rewrite differently.

---

## Strategic context to carry (so you don't re-derive it)

All persistent memory lives at the **OLD repo's** memory dir (a new session opened in *this* repo gets a different, empty memory path — so read these explicitly):

`/Users/rahul/.claude/projects/-Users-rahul-git-personal-ideation-society-rental-intelligence/memory/`

Load these before making product calls:
- **`project_positioning_lock.md`** — RentLens = intelligence product ONLY. Marketplace mechanics (subscribe/match/relay/supply-loop) are a SEPARATE future product, not part of this rewrite. Homepage stays intelligence-only. Don't add "find a flat" surfaces.
- **`user_field_tester.md`** — user is an active landlord+tenant; society WhatsApp = highest-signal channel; floor-plan artifact > categorical Vaastu fields; informed rejections > ghosts; data doesn't end negotiation.
- **`project_brand.md`** — brand is `RentLens.` (marigold period); canonical domain rentlens.fyi; internal name was society-rental-intelligence.
- **`reference_design_system.md`** — Geist + JetBrains Mono on parchment + ink + marigold accent.
- **`project_mvp_scope.md`**, **`project_access_control.md`** — scope + the Turnstile/magic-link gate plan.
- `MEMORY.md` — the index.

The Go repo's fp tracker (prefix SOCI) holds the full backlog incl. the marketplace spin-out (SOCI-ijehsmph) + submission-verification (SOCI-xbkrqbqs) + areas (E3.6). Those are NOT in scope for the rewrite — the rewrite ports the *shipped* MVP surface, not the backlog.

---

## What's already done this session

- rentlens.fyi bought (Cloudflare); DNS there.
- (In the *old* Go repo, now being retired) committed a www→apex redirect + set canonical host to rentlens.fyi — informational only; that's the Go version.
- This repo created at `/Users/rahul/git/personal/ideation/rentlens-cf` with skeleton dirs (`src/{routes,views,data}`, `migrations`, `public`, `seed`) + `git init`. Nothing else.

## Immediate next step

Phase 0. Write `package.json` (hono, wrangler dev-dep, tailwindcss, typescript; scripts: dev/build/deploy/css), `wrangler.toml` (name, main=src/index.tsx, compatibility_date, D1 binding `DB`, assets binding for `public/`), `tsconfig.json`, `tailwind.config.js` + `src/styles/input.css`, and a minimal `src/index.tsx` Hono app that returns an HTML page. Confirm `npx wrangler dev` serves it locally with a local D1 bound. Commit as "Phase 0: Cloudflare-native scaffold". Then Phase 1.
