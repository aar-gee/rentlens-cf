#!/usr/bin/env bash
# scripts/recent-subs.sh — AI / dev triage helper for browsing recent rent
# submissions without going through the admin HTTP path. Wraps
# `wrangler d1 execute` so neither HTTP credentials nor the admin URL prefix
# are needed; the only auth is the wrangler / Cloudflare API token already
# on the machine.
#
# Examples:
#   ./scripts/recent-subs.sh                       # prod, last 24h, all status
#   ./scripts/recent-subs.sh --hours 6             # prod, last 6h
#   ./scripts/recent-subs.sh --days 7              # prod, last 7d
#   ./scripts/recent-subs.sh --env staging         # staging D1
#   ./scripts/recent-subs.sh --status pending --spam 1
#   ./scripts/recent-subs.sh --since '2026-05-30 12:00:00'
#   ./scripts/recent-subs.sh --hours 24 --pretty   # human-readable summary
#   ./scripts/recent-subs.sh --hours 24 --raw      # full row JSON
#
# Without --pretty / --raw the default is --pretty (compact summary +
# one-line-per-row table). --raw is the AI path: full JSON for downstream
# parsing / pattern-finding.
set -euo pipefail
cd "$(dirname "$0")/.."

# Defaults.
ENV_ARG=""
SINCE_HOURS=24
SINCE_OVERRIDE=""
STATUS=""
SPAM=""
MODE="pretty"   # pretty | raw

while [ $# -gt 0 ]; do
  case "$1" in
    --env)     ENV_ARG="$2"; shift 2 ;;
    --hours)   SINCE_HOURS="$2"; SINCE_OVERRIDE=""; shift 2 ;;
    --days)    SINCE_HOURS=$(( $2 * 24 )); SINCE_OVERRIDE=""; shift 2 ;;
    --since)   SINCE_OVERRIDE="$2"; shift 2 ;;
    --status)  STATUS="$2"; shift 2 ;;
    --spam)    SPAM="$2"; shift 2 ;;
    --pretty)  MODE="pretty"; shift ;;
    --raw)     MODE="raw"; shift ;;
    -h|--help)
      sed -n '2,21p' "$0"; exit 0 ;;
    *) echo "unknown arg: $1" >&2; exit 1 ;;
  esac
done

# DB binding name depends on env.
if [ -n "$ENV_ARG" ]; then
  DB="rentlens-${ENV_ARG}"
  WFLAGS=(--env "$ENV_ARG")
else
  DB="rentlens"
  WFLAGS=(--env "")
fi

# Build the SINCE cutoff.
if [ -n "$SINCE_OVERRIDE" ]; then
  CUTOFF="$SINCE_OVERRIDE"
else
  # date -u on macOS doesn't support `-d "X hours ago"` (GNU); use -v.
  if date -v -1H +%Y-%m-%d >/dev/null 2>&1; then
    CUTOFF=$(date -u -v -"${SINCE_HOURS}"H +"%Y-%m-%d %H:%M:%S")
  else
    CUTOFF=$(date -u -d "${SINCE_HOURS} hours ago" +"%Y-%m-%d %H:%M:%S")
  fi
fi

# Compose the WHERE clause.
WHERE="created_at >= '${CUTOFF}'"
if [ -n "$STATUS" ]; then WHERE="${WHERE} AND status = '${STATUS}'"; fi
if [ -n "$SPAM"   ]; then WHERE="${WHERE} AND spam_flag = ${SPAM}"; fi

SQL_ROWS="SELECT id, created_at, society_name, society_slug, locality, bhk,
  monthly_rent, monthly_maint, floor_band, furnishing,
  pending_society_id, pending_area_id,
  help_contact, willing_to_help, verify_state,
  spam_flag, ip_address, status, substr(note, 1, 240) AS note_head
FROM submissions WHERE ${WHERE} ORDER BY created_at DESC LIMIT 500"

if [ "$MODE" = "raw" ]; then
  npx wrangler d1 execute "$DB" --remote ${WFLAGS[@]+"${WFLAGS[@]}"} --command "$SQL_ROWS" --json
  exit 0
fi

# Pretty mode: one summary then a compact table.
SQL_SUMMARY="SELECT
  count(*) AS total,
  SUM(CASE WHEN status='pending'   THEN 1 ELSE 0 END) AS pending,
  SUM(CASE WHEN status='published' THEN 1 ELSE 0 END) AS published,
  SUM(CASE WHEN status='rejected'  THEN 1 ELSE 0 END) AS rejected,
  SUM(CASE WHEN spam_flag=1 THEN 1 ELSE 0 END) AS spam,
  SUM(CASE WHEN verify_state='verified' THEN 1 ELSE 0 END) AS verified,
  SUM(CASE WHEN pending_society_id IS NOT NULL THEN 1 ELSE 0 END) AS new_society,
  SUM(CASE WHEN pending_area_id IS NOT NULL THEN 1 ELSE 0 END) AS new_area
FROM submissions WHERE ${WHERE}"

echo "env=${ENV_ARG:-prod}  db=${DB}  since='${CUTOFF}'  status='${STATUS}'  spam='${SPAM}'"
echo "-------------------- SUMMARY --------------------"
npx wrangler d1 execute "$DB" --remote ${WFLAGS[@]+"${WFLAGS[@]}"} --command "$SQL_SUMMARY" --json \
  | python3 -c "
import json, sys
data = json.load(sys.stdin)
row = data[0]['results'][0]
for k, v in row.items():
    print(f'  {k:13s} = {v}')
"
echo "-------------------- ROWS --------------------"
npx wrangler d1 execute "$DB" --remote ${WFLAGS[@]+"${WFLAGS[@]}"} --command "$SQL_ROWS" --json \
  | python3 -c "
import json, sys
data = json.load(sys.stdin)
rows = data[0]['results']
if not rows:
    print('  (none)')
else:
    for r in rows:
        ts = r['created_at']
        soc = (r['society_name'] or '?')[:32]
        loc = (r['locality'] or '?')[:18]
        rent = r['monthly_rent']
        bhk = r['bhk'] or '?'
        sp = 'SPAM' if r['spam_flag'] else '----'
        vr = 'VRFD' if r['verify_state'] == 'verified' else '----'
        st = (r['status'] or '?')[:8]
        em = r['help_contact'] or '(no email)'
        if len(em) > 28: em = em[:25] + '...'
        ip = (r['ip_address'] or '')[:20]
        print(f'  {ts}  {r[\"id\"]:9s}  {sp}  {vr}  {st:9s}  {bhk}BHK  ₹{rent:>6}  {soc:32s}  {loc:18s}  {em:28s}  {ip}')
"
