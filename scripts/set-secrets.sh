#!/usr/bin/env bash
# Push the values in .secrets.local to the deployed Worker as Cloudflare
# secrets (wrangler secret put). Edit .secrets.local, then re-run this any time
# to rotate. Empty values are skipped (so unset secrets stay unset).
#
#   ./scripts/set-secrets.sh
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .secrets.local ]; then
  echo "✘ .secrets.local not found. Copy the template values in and re-run." >&2
  exit 1
fi

# shellcheck disable=SC1091
set -a; . ./.secrets.local; set +a

put() {
  local name="$1" val="${2:-}"
  if [ -n "$val" ]; then
    printf '%s' "$val" | npx wrangler secret put "$name" >/dev/null
    echo "  ✓ set $name"
  else
    echo "  · skip $name (empty)"
  fi
}

echo "Pushing secrets to the 'rentlens' Worker…"
put ADMIN_USER       "${ADMIN_USER:-}"
put ADMIN_PASS       "${ADMIN_PASS:-}"
put NTFY_TOPIC       "${NTFY_TOPIC:-}"
put NTFY_SERVER      "${NTFY_SERVER:-}"
put ADMIN_BASE_URL   "${ADMIN_BASE_URL:-}"
put RESEND_API_KEY   "${RESEND_API_KEY:-}"
put TURNSTILE_SECRET "${TURNSTILE_SECRET:-}"
echo "Done. (Re-run after editing .secrets.local to rotate.)"
