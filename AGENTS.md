# AGENTS.md

This file exists so agents that look for `AGENTS.md` (Codex, Cursor, others) find the same contract that Claude Code agents follow.

**The canonical engineering practices live in [`CLAUDE.md`](./CLAUDE.md).** Read it before touching this repo. fp issue-tracking rules live in [`FP_CLAUDE.md`](./FP_CLAUDE.md) and are pulled into `CLAUDE.md` via `@FP_CLAUDE.md`. **Product / brand / marketing context lives in [`HANDOFF.md`](./HANDOFF.md)** — read that if you're writing outward-facing copy, emails, social posts, or any other publish-facing artifact.

Short version of the non-negotiables (the full reasoning is in `CLAUDE.md`):

- **Stack:** Cloudflare Workers + Hono + `hono/jsx` + D1. Server-rendered, no SPA. TypeScript strict.
- **Two deploy targets:** `staging` (`rentlens-staging.<account>.workers.dev` — real subdomain in `wrangler.toml`, kept out of docs) and `prod` (`rentlens.fyi`). Ladder is always `local → staging → verify → prod`.
- **`wrangler.toml`:** the `[env.staging]` block **must** keep `routes = []`, otherwise staging hijacks the prod custom domain. Do not regress this.
- **Secrets** in `.secrets.local` / `.secrets.staging.local` / `.dev.vars` — all gitignored, never committed, pushed only via `scripts/set-secrets.sh`.
- **Commits:** Conventional Commits, one logical change each, body explains *why*, include a Verification line for non-trivial changes, end with the Claude co-author trailer. Never force-push or amend pushed commits. Never `--no-verify`.
- **Releases:** `CHANGELOG.md` (Keep a Changelog) + `git tag vX.Y.Z` + `gh release create`.
- **fp issues:** `fp context <id>` before work, `in-progress` while working, comments at real checkpoints, `done` only after verifying in the destination env.
- **Done means:** typecheck passes, migrations applied to local+staging+prod, staging+prod both verified in a real browser, changelog updated, fp issue closed with the deployed SHA.

If you're about to do anything in the "never do without asking" list at the bottom of `CLAUDE.md`, stop and ask.
