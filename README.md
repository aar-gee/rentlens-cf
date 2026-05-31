# RentLens CF

A directory of housing societies with verified resident-reported rent ranges.
Live at **https://rentlens.fyi**. Property portals advertise what owners *ask*;
RentLens shows what residents actually *pay* — every number stamped with sample
size, recency, and provenance.

**Stack:** Cloudflare Workers + Hono + `hono/jsx` (server-rendered, no client
framework) + D1 + Turnstile. TypeScript strict. No SPA, no build step beyond
Tailwind + Wrangler.

## Documentation map

| Doc | What's in it |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Engineering contract: environments, deploy ladder, git/release rules, migration discipline, security. **Read first.** |
| [HANDOFF.md](HANDOFF.md) | Product + brand context: voice, what you can/can't claim, channels. For marketing/content work. |
| [AGENTS.md](AGENTS.md) | Short-form agent contract for non-Claude agents. |
| [CHANGELOG.md](CHANGELOG.md) | User-visible changes, [Keep a Changelog](https://keepachangelog.com/) format. |

## Local development

```bash
npm install
npm run db:migrate:local   # apply migrations to the local D1
npm run dev                # http://localhost:8787
npm run typecheck          # tsc --noEmit — must pass before any deploy
```

Secrets for local dev go in `.dev.vars` (gitignored). Turnstile no-ops when keys
are absent, so submit/contact work locally without them.

## Data, seeding & migrations

This is the part people get wrong, so it's spelled out here.

### You never load CSVs into staging or prod

The catalog's seed data lives in CSVs under `seed/`, but **those CSVs never
leave your machine**. They are *build-time inputs* to generator scripts that
emit **committed migration SQL**. The migration files carry the data as
`INSERT` / `ALTER` statements, and migrations are what populate a database.

```
seed/societies.csv ──node seed/gen-seed.ts──────────► migrations/0002_seed_societies.sql
seed/builders.csv  ──node seed/gen-builders-roster.ts► migrations/0011_builders_roster.sql
```

- `seed/builders.csv` is the **canonical source of truth for the builder
  roster** (tiers, website/logo, delivery-risk flags, aliases). Edit the CSV,
  re-run the generator, commit the regenerated SQL **as a new migration**.
- `seed/gen-builders.ts` is **historical** — it generated the original
  `0003_builders.sql` (already applied to prod). Don't regenerate it; the
  current roster authority is `builders.csv` + `gen-builders-roster.ts`.
- Some migrations are hand-written (e.g. `0012_society_city.sql`) — not every
  migration comes from a generator.

### How each environment gets populated

`wrangler d1 migrations apply` reads the `migrations/` directory, checks the
target DB's `d1_migrations` tracking table, and runs **only the migrations not
yet applied to that DB** — then records them. Every environment is brought up
the same way against its own D1 (bindings in `wrangler.toml`):

```bash
npm run db:migrate:local     # local  D1 (--local)
npm run db:migrate:staging   # rentlens-staging D1 (--remote --env staging)
npm run db:migrate           # rentlens (prod) D1 (--remote)
```

Because already-applied migrations are tracked, **prod is never re-seeded by
accident** — `0002` is already in prod's `d1_migrations` table, so it won't
re-run. That's the "don't re-seed prod casually" rule (CLAUDE.md §7) enforced
automatically.

### Rules that keep this safe

- **Migrations are append-only.** Numbered `NNNN_*.sql`, never edited after
  they've been applied anywhere. To change seeded data, write a *new* migration
  — don't regenerate an applied one. (`0002`, `0003` are frozen.)
- **Committed generator output is the source of truth.** Generators mint random
  short IDs, so re-running produces *different* IDs. Regenerate only when the
  CSV changes, and review the diff. The committed `.sql` is what ships, so the
  same rows land in every environment.
- **Make new seed migrations safe to re-apply.** Use `INSERT ... ON CONFLICT DO
  UPDATE` (upsert) or `INSERT OR IGNORE`, and `ALTER ... DEFAULT` for new
  columns, so applying against an already-populated prod DB refreshes in place
  rather than duplicating or failing. (`0011` upserts builders by name; `0012`
  adds `societies.city` with a default.)

### Adding a new city later

`societies.city` (migration `0012`, default `Bengaluru`) scopes the directory by
city. Builders stay city-agnostic with a single global tier for now — tier is a
city-specific judgment, so a second city will move tier to a
`builder_city_tiers` join table rather than adding a column to builders. A new
city's societies come in via a **new** seed CSV + a **new** migration numbered
above the current head — never by regenerating `0002`.

### Deploying these changes (DB + code)

Migrations and worker code deploy separately. For a schema change, **migrate
first, then ship code**, and walk the ladder `local → staging → verify → prod`
(full discipline in CLAUDE.md §6):

```bash
# staging
npm run db:migrate:staging && npm run deploy:staging   # → verify on staging
# prod (only after staging checks out)
npm run db:migrate && npm run deploy                    # → verify on rentlens.fyi
```

`wrangler` reads `migrations/` from the working directory, not from a git
branch — so fold migration work into `main` before running the ladder, so what
deploys matches the trunk.
