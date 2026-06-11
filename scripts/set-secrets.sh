#!/usr/bin/env bash
# Push secret values to the deployed Worker as Cloudflare secrets.
#
#   ./scripts/set-secrets.sh            # prod    → .secrets.local
#   ./scripts/set-secrets.sh staging    # staging → .secrets.staging.local
#
# Edit the matching .secrets[.<env>].local file, then re-run to rotate. Empty
# values are skipped (so unset secrets stay unset).
set -euo pipefail
cd "$(dirname "$0")/.."

ENV_ARG="${1:-}"
if [ -n "$ENV_ARG" ]; then
  FILE=".secrets.${ENV_ARG}.local"
  WFLAGS=(--env "$ENV_ARG")
  LABEL="rentlens-${ENV_ARG}"
else
  FILE=".secrets.local"
  # Wrangler 4 warns when wrangler.toml has multiple [env.*] blocks and
  # `secret put` is run without --env — to avoid accidentally hitting the
  # wrong worker. Explicit `--env=""` targets the top-level (prod) env.
  WFLAGS=(--env "")
  LABEL="rentlens (prod)"
fi

if [ ! -f "$FILE" ]; then
  echo "✘ $FILE not found. Copy the template values in and re-run." >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a; . "./$FILE"; set +a

put() {
  local name="$1" val="${2:-}"
  if [ -n "$val" ]; then
    # `${WFLAGS[@]+"${WFLAGS[@]}"}` expands to nothing for an empty array
    # without tripping `set -u` — needed on macOS's bash 3.2 where bare
    # `"${empty[@]}"` is treated as an unbound reference. (bash 4.4+ handles
    # this; the workaround is harmless on newer bash.)
    printf '%s' "$val" | npx wrangler secret put "$name" ${WFLAGS[@]+"${WFLAGS[@]}"} >/dev/null
    echo "  ✓ set $name"
  else
    echo "  · skip $name (empty)"
  fi
}

echo "Pushing secrets to the '${LABEL}' Worker…"
put ADMIN_PREFIX     "${ADMIN_PREFIX:-}"
put ADMIN_USER         "${ADMIN_USER:-}"
put ADMIN_PASS         "${ADMIN_PASS:-}"
put NTFY_TOPIC         "${NTFY_TOPIC:-}"
put NTFY_SERVER        "${NTFY_SERVER:-}"
put ADMIN_BASE_URL     "${ADMIN_BASE_URL:-}"
put RESEND_API_KEY     "${RESEND_API_KEY:-}"
put EMAIL_FROM         "${EMAIL_FROM:-}"
put TURNSTILE_SITE_KEY "${TURNSTILE_SITE_KEY:-}"
put TURNSTILE_SECRET   "${TURNSTILE_SECRET:-}"
echo "Done. (Re-run after editing $FILE to rotate.)"
