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
  WFLAGS=()
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
    printf '%s' "$val" | npx wrangler secret put "$name" "${WFLAGS[@]}" >/dev/null
    echo "  ✓ set $name"
  else
    echo "  · skip $name (empty)"
  fi
}

echo "Pushing secrets to the '${LABEL}' Worker…"
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
