# Security

RentLens is a public, open-source Cloudflare Workers app. This document describes
what protects what, and how to report an issue. The security posture is owned by
the **security agent** (`security-agent.md`); findings live in `SECURITY_AUDIT.md`.

## Reporting a vulnerability

Email **rahulgupta1690@gmail.com** with steps to reproduce. Please do not open a
public issue for anything exploitable. Expect an acknowledgement within a few days.

## Threat model

RentLens holds resident-submitted rent data and an admin moderation surface. The
realistic threats are **opportunistic abuse** (spam, scraping, injection) and
**accidental disclosure** (a secret or the admin path leaking through the public
repo). Controls are sized to that — not to a targeted, resourced adversary.

## What protects what

- **Secrets** never live in the repo or its git history. They sit in gitignored
  files (`.dev.vars`, `.secrets.local`, `.secrets.*.local`) and reach the deployed
  Worker only as Cloudflare secrets via `scripts/set-secrets.sh`
  (`wrangler secret put`). The full history has been scanned to confirm nothing
  sensitive was ever committed.
- **Admin** is gated by HTTP Basic Auth with a constant-time credential compare.
  It **404s entirely when credentials are unset** (disabled and undiscoverable)
  and returns `noindex`. The admin URL prefix is an *obscurity layer only* — not
  the security boundary — and is supplied per-deployment via the `ADMIN_PREFIX`
  secret, so it is never disclosed in the public source.
- **Untrusted input.** Every public write path (`/submit`, `/contact`, waitlist,
  proof uploads) is validated server-side: required-field and format checks, a
  500 KB upload cap with a MIME allowlist and magic-byte sniff (executable/SVG/HTML
  types are rejected), per-IP daily caps, and Cloudflare Turnstile on the submit
  path. Client-side checks are never trusted.
- **Injection.** All D1 (SQLite) access is parameterized via `.bind()`; no user
  value is concatenated into SQL. Output is server-rendered with `hono/jsx`, which
  escapes by default; user-controlled text is never rendered as raw HTML.
- **Transport & headers.** Responses carry `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, and `X-Frame-Options:
  SAMEORIGIN`. A Content-Security-Policy is planned (report-only first).

## Secrets model (for contributors)

Never commit a real value. Copy the key names from the documented templates into
your gitignored `.secrets*.local` / `.dev.vars`, then `./scripts/set-secrets.sh`
to push them. When credentials are unset, the dependent feature no-ops or the
protected surface disappears — the app fails **closed** on security, **open** on
availability.
