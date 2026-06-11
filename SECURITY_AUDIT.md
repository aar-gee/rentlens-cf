# RentLens — Security Audit

- **Date:** 2026-06-11
- **Auditor:** Security Agent (per `security-agent.md`)
- **Trigger:** pre-publish gate — making `aar-gee/rentlens-cf` open-source/public.
- **Scope:** all of `src/` (routes, data, lib, views, admin), `wrangler.toml`,
  `scripts/`, config, and the full git history.

## Verdict

**Safe to make public.** No secret or key is present in the working tree or in any
historical commit. Auth, the admin dispatcher, SQL access, output rendering, and
upload handling were reviewed and are sound. One Medium finding (missing security
headers) was fixed; the remaining items are Low/Info, accepted or recommended.

### Gates

| Gate | Result |
|---|---|
| `tsc --noEmit` | ✅ exit 0 |
| Full-history secret scan (all commits) | ✅ no secret literals or key-shaped tokens; only `scripts/set-secrets.sh` (tooling, no values) is tracked |
| `npm audit --omit=dev` | ✅ 0 vulnerabilities |
| Local routing/headers verification (curl) | ✅ old admin path 404, new prefix 401+challenge, authed 200, security headers present |

## Findings

| ID | Severity | Status | Finding |
|---|---|---|---|
| F1 | Info | Validated | Admin Basic Auth sound: constant-time compare, 404-when-unset, 401 + `WWW-Authenticate` challenge, `X-Robots-Tag: noindex`. Prefix is env-only, never hardcoded. |
| F2 | Info | Validated | Per-request admin dispatcher (`index.tsx`) is safe: exact prefix match, prefix stripped via `URL.pathname`, forwarded with method/headers/body preserved. No path-confusion or open-redirect. |
| F3 | Info | Validated | D1 fully parameterized; the few interpolated SQL fragments inject only in-code column/predicate constants, never user values (all via `.bind()`). No SQLi. |
| F4 | Info | Validated | No stored/reflected XSS. `hono/jsx` auto-escapes; raw-HTML sinks render in-repo constants or server-built JSON-LD only. SVG/HTML excluded from the upload MIME allowlist, so admin inline preview can't execute. |
| F5 | Info | Validated | Uploads hardened: Content-Length pre-check, 500 KB cap, MIME allowlist + magic-byte sniff, per-IP daily caps, Turnstile on submit. Server-side validation on all write paths. |
| **F6** | **Medium** | **✅ Fixed** | Public responses lacked security headers. Added an additive Hono middleware setting `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN`. Verified via curl; `tsc` green. CSP deferred (see follow-ups). |
| F7 | Low | Recommended | htmx loaded from `unpkg.com` and third-party scripts without Subresource Integrity. Pin a version + add SRI, or self-host htmx under `public/static`. |
| F8 | Low | Accepted | Admin POST forms have no CSRF token. Mitigated by the secret URL prefix + Basic Auth with no ambient cookie session (browsers won't auto-attach Basic creds to an unknown URL). Acceptable for the threat model. |
| F9 | Low | Recommended | `rl_preverify` cookie is unsigned (flags correct: `HttpOnly; Secure; SameSite=Lax`). Low-authority by design; move to a signed/HMAC value if its scope grows. |
| F10 | Info | Accepted | `scripts/recent-subs.sh` interpolates operator CLI args into SQL. Local tooling requiring a Cloudflare API token; not web-reachable. |

## Changes applied in this pass

- **Admin path → `ADMIN_PREFIX` secret.** Removed the hardcoded prefix from
  `src/admin/auth.ts`; admin now mounts via a per-request dispatcher in
  `src/index.tsx` reading `c.env.ADMIN_PREFIX`, with the prefix resolved per
  request for `adminHref`. Old prefix retired. Verified locally.
- **Security headers (F6).** Additive middleware in `src/index.tsx`.

## Recommended follow-ups

1. **Content-Security-Policy**, introduced **report-only** first — needs
   nonces/hashes for inline scripts and an allowlist for htmx (unpkg), Turnstile,
   and the Cloudflare challenge frame; tighten once the report endpoint is clean.
2. **Pin + SRI (or self-host) the htmx CDN tag** (F7).
3. **Sign the `rl_preverify` cookie** (F9) if its authority ever increases.
