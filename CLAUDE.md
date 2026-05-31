@FP_CLAUDE.md

# RentLens CF — Engineering Practices

This file is the contract for future agents and humans working on this repo. **Read it once at the start of every session.** Project-specific rules in this file override generic defaults. fp issue-tracking rules live in `FP_CLAUDE.md` (pulled in above) — both apply.

If you change how the project is built, deployed, or organized, update this file in the same commit. Stale practice docs are worse than no practice docs.

### Read your role's charter too

This repo is worked by several specialized agents. `CLAUDE.md` (this file) + `FP_CLAUDE.md` are the **shared** contract for everyone. In addition, **if your task maps to a role below, read that agent's charter at the repo root before starting** — it scopes what you own, what to hand off, and the spirit of the work:

- **Marketing / SEO / content / growth / brand copy** → [`marketing-agent.md`](marketing-agent.md)
- **Data: aggregation, provenance promotion, submissions→display pipeline** → `data-agent.md` *(planned)*
- **Core engineering: submit flow, admin, schema/migrations, auth, anti-spam** → `engineering-agent.md` *(planned)*

A planned charter may not exist yet — skip it if absent. When a charter and this file conflict on *how to build/deploy*, this file wins; the charter governs *what you work on*.

---

## 1. What this project is

- **Live product:** https://rentlens.fyi — a directory of housing societies in Pune with verified resident-reported rent ranges.
- **Stack:** Cloudflare Workers + Hono + `hono/jsx` (server-rendered, no client React) + D1 + Tailwind CDN-free build + Turnstile. TypeScript strict.
- **No SPA, no client framework, no build step beyond Tailwind + Wrangler.** Every page is server-rendered HTML. Sprinkle minimal vanilla JS inline only when needed (e.g. Turnstile widget callback).
- **Routes live in `src/routes/*`**, views in `src/views/*` as JSX components returning `c.html(...)`. Admin is mounted under a hidden prefix in `src/admin/*`.
- **Data layer:** D1 only. No KV, no R2, no Durable Objects unless explicitly added. Migrations in `migrations/`. Seed in `seed/`.

If a request asks for React, a client bundler, or a different DB, **stop and confirm** — that is an architecture change, not a feature.

---

## 2. Environments

There are exactly two deploy targets. Local dev is a third workspace.

| Env | URL | Worker name | D1 | Secrets file | Wrangler invocation |
|---|---|---|---|---|---|
| local | `http://localhost:8787` | `rentlens` (dev) | `--local` | `.dev.vars` | `npm run dev` |
| staging | `https://rentlens-staging.<account>.workers.dev` (real subdomain redacted; see `wrangler.toml`) | `rentlens-staging` | `rentlens-staging` (id `0df82f6f-...`) | `.secrets.staging.local` | `npm run deploy:staging` |
| prod | `https://rentlens.fyi` | `rentlens` | `rentlens` (id `9e77654d-...`) | `.secrets.local` | `npm run deploy` |

### Rules
- **Never deploy straight to prod for a non-trivial change.** Ladder is `local → staging → verify → prod`. Trivial = copy/typo/single-line CSS that you can revert in 30s.
- **Custom domain `rentlens.fyi` is wired via `[[routes]]` in `wrangler.toml` at the top level.** The `[env.staging]` block **MUST** keep `routes = []`. Without that, the staging Worker inherits the top-level routes and silently hijacks the production domain. This happened once on 2026-05-30; do not regress.
- `workers.dev` is **disabled** on the prod Worker (rentlens.fyi is canonical). Staging keeps its `workers.dev` subdomain on because that *is* its address.
- **Indexing is host-gated in code, not per-env config.** `src/lib/seo.ts` (`isIndexableHost`) treats only the canonical host `rentlens.fyi` as crawlable: `/robots.txt` serves `Allow: /` + the sitemap there, and `Disallow: /` on every other origin (staging `workers.dev`, `wrangler dev`, previews). So **prod is live/indexed** (decision 2026-05-31 — we launch presenting the seeded catalog as the live dataset and retire seed rows as real reports arrive) and **staging is `noindex` forever** automatically. `/sitemap.xml` is generated from published societies. To pull prod back to noindex, change `isIndexableHost` — it's a one-function flip.
- Don't read prod D1 from a staging Worker or vice versa. Each env's D1 binding is wired to its own database in `wrangler.toml` — keep it that way.

---

## 3. Secrets

- All secret *values* live in `.secrets.local` (prod) and `.secrets.staging.local` (staging). Both are gitignored. **Never commit either, never echo either into chat, never paste either into a commit message.**
- `scripts/set-secrets.sh` is the only sanctioned way to push secrets:
  - `./scripts/set-secrets.sh` → prod
  - `./scripts/set-secrets.sh staging` → staging
  The script reads the matching file and runs `wrangler secret put` for each key. It is fine to commit changes to this script — it contains variable *names*, not values.
- Local dev reads secrets from `.dev.vars` (also gitignored). Mirror the same key names as prod.
- Turnstile is wired but **gated to no-op when keys are absent**. That is intentional — local dev and tests work without keys. Do not remove the gate.
- If you rotate a secret, rotate it in *both* the file *and* the Worker (via the script). Drift between the two is the most common cause of mysterious 500s on submit/contact.

---

## 4. Git, GitHub, releases

### Repo
- **`github.com/aar-gee/rentlens-cf` — private.** `gh` is authed as `aar-gee`. Don't push under a different account.
- Single long-lived branch: `main`. Branch only when you genuinely need a PR review cycle (rare on this repo today; revisit when a second person joins).

### Commits
- **Conventional Commits** (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `style:`, `test:`, `ci:`). Scope in parens when it helps: `feat(admin): …`.
- **One logical change per commit.** If you touched five unrelated things, that's five commits. Reviewers (and `git bisect`) thank you.
- Body should answer *why*, not restate the diff. Include a short **Verification** section when the change is non-trivial:
  > Verification: ran `npm run typecheck`, deployed to staging, opened /society/koregaon-park, confirmed rent range renders.
- End every commit with the Claude co-author trailer:
  ```
  Co-Authored-By: Claude <noreply@anthropic.com>
  ```
- **Never** `git push --force` to `main`. **Never** `--no-verify`. **Never** amend a commit that's already pushed.
- Don't `git add -A` / `git add .` — stage by name. The repo has gitignored secret files; an accidental `-A` is how they leak.

### Releases
- **`CHANGELOG.md`** at the repo root, [Keep a Changelog](https://keepachangelog.com/) format. Every user-visible change goes under `## [Unreleased]` as it lands.
- When cutting a release:
  1. Move `## [Unreleased]` items under a new `## [vX.Y.Z] — YYYY-MM-DD` heading.
  2. Commit (`chore: release vX.Y.Z`).
  3. `git tag vX.Y.Z` and `git push --tags`.
  4. `gh release create vX.Y.Z --title "…" --notes "…"` — notes can quote the changelog entry.
- **SemVer-ish:** major = breaking schema/URL change, minor = new user-facing feature, patch = bug fix or copy tweak. We're pre-1.0 so be loose, but be consistent.

---

## 5. fp issue tracking

(Most of this is in `FP_CLAUDE.md`; the points below are project-specific reinforcement.)

- **Before** non-trivial work: `fp context <id>` to load the issue, then `fp issue update --status in-progress <id>`.
- At meaningful checkpoints: `fp comment <id> "<what changed, what's next>"`. "Meaningful" = a deploy, a decision, a blocker, a verification — not every commit.
- **When done and verified in the env where it ships** (usually prod, occasionally staging-only): `fp issue update --status done <id>`. Don't close on "merged to main" — close on "I saw it work in the destination env."
- Check `fp tree` and `fp issue list` before filing a new issue — this codebase has overlapping epics (discovery, builders, anti-spam) and duplicates are easy.

---

## 6. Deploy + verify workflow

The canonical loop for any change that touches code:

1. **Plan in the issue.** If it's not in fp, file it first (small ones are fine, but file them).
2. **Local first.** `npm run dev`, exercise the change in the browser at `localhost:8787`. For DB changes, run migrations against `--local` first (`npm run db:migrate:local`).
3. **Typecheck.** `npm run typecheck` must pass before any deploy. There is no CI gate yet — you are the CI gate.
4. **Staging deploy.** `npm run deploy:staging`. If schema changed, `npm run db:migrate:staging` first.
5. **Verify on staging.** Real browser, real click-through, real form submit (Turnstile test keys are wired so submit works). Check logs with `wrangler tail --env staging` if anything looks off.
6. **Prod deploy.** `npm run deploy`. Schema changes: `npm run db:migrate` first.
7. **Verify on prod.** Same drill, but on rentlens.fyi.
8. **Close the fp issue.** Comment with the deployed commit SHA + a one-line "verified by …".

Skipping step 4–5 is allowed only for the trivial-revert class of changes listed in §2. If you're not sure whether a change is trivial, it isn't.

### When something breaks
- `wrangler tail` (prod) / `wrangler tail --env staging` shows live logs.
- **Rollback is a redeploy of the previous commit**, not a CF dashboard click. `git checkout <prev-sha> -- .` is dangerous; prefer `git revert <bad-sha> && npm run deploy`.
- If prod is actively down, revert first, diagnose second.

---

## 7. Database / migrations

- Schema lives in `migrations/NNNN_*.sql`. Numbered, append-only, never edited after they've been applied anywhere.
- New migration:
  1. Write the `.sql` file with the next number.
  2. `npm run db:migrate:local`, smoke-test.
  3. `npm run db:migrate:staging`, smoke-test.
  4. `npm run db:migrate` (prod), smoke-test.
- The same migration runs against all three DBs. Don't write env-specific SQL.
- Seed data lives in `seed/`. Prod has been seeded once with 36 societies; do **not** re-run seed against prod casually — it can dupe rows. Staging can be re-seeded freely.
- The `provenance` field on rent ranges is part of the trust contract. Allowed values: `seed` (estimated by us at launch), `estimated` (single resident report), `resident` (multiple verified resident reports). UI **must** show the corresponding label honestly. Don't add a fourth tier without thinking through what it claims.

---

## 8. Code style + conventions

- **TypeScript strict.** `any` is a code smell; if you reach for it, leave a `// TODO:` and an fp issue.
- **Server-rendered JSX via `hono/jsx`.** No `useState`, no hooks, no client hydration. Components are pure functions returning JSX.
- **No emojis in user-facing copy or code** unless the user explicitly asks. (RentLens copy is deliberately plain.)
- **Tailwind utility classes inline in JSX.** Don't introduce a CSS-in-JS lib or component library.
- **Routes are thin.** Heavy logic goes in `src/lib/*` (queries, validation, helpers). Routes orchestrate; libs do work.
- **Validation at the edge.** Every form handler validates on the server with Zod (or hand-rolled checks) before touching D1. Don't trust client-side validation alone.
- **Email sending must go through a single `sendEmail()` interface** in `src/lib/` (Resend-backed when wired). Do not call `fetch('https://api.resend.com/…')` from a route directly — provider-swap should be a one-file change.
- **Admin actions are real and audited.** Every admin mutation writes an `admin_audit_log` row. Don't add an admin action that bypasses the audit log.

---

## 9. Security + abuse

- **Turnstile** gates `/submit` and `/contact`. Server verification happens in `src/lib/turnstile.ts`. When keys are absent (local dev) it no-ops. Don't bypass it any other way.
- **Admin** lives under a hidden URL prefix (`/x-a9c2d27eab89/`) plus basic-auth. Treat the prefix as semi-public (it'll show up in logs) — the basic-auth password is the real gate. Rotate it via `scripts/set-secrets.sh` if it's ever printed in a transcript or screenshot.
- **No PII in logs.** `console.log`-ing an entire request body is how you leak emails. Log IDs and statuses, not payloads.
- **CSP / headers:** if you add inline `<script>`, also update the CSP. Don't widen the policy to `unsafe-inline` to make a one-off work.

---

## 10. What "done" means

A change is done when **all** of these are true:

- [ ] Code committed with a conventional message + verification line + co-author trailer.
- [ ] `npm run typecheck` passes.
- [ ] Migrations (if any) have been applied to local, staging, **and** prod.
- [ ] Staging deploy was verified in a real browser.
- [ ] Prod deploy was verified in a real browser.
- [ ] `CHANGELOG.md` updated under `## [Unreleased]` if the change is user-visible.
- [ ] The fp issue is `done` with a closing comment that names the deployed SHA.

If you can't tick all of these, the change isn't done — leave the fp issue `in-progress` and say so.

---

## 11. Things to never do without asking

- Change the architecture (SPA, different DB, different host).
- Add a paid third-party service.
- Touch DNS / Cloudflare account settings outside what `wrangler` does for you.
- Re-seed prod D1.
- Force-push, amend pushed commits, or rewrite `main` history.
- Commit anything from `.secrets*.local` or `.dev.vars`.
- Disable Turnstile, basic-auth, or the audit log "just for testing."
- Mark an fp issue `done` without verifying in the destination env.
