#!/usr/bin/env bash
# Copies INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY from ~/rosa-data/rosa.env into the Coolify app env. Prints only key names and HTTP codes.
set -euo pipefail

DATA=${ROSA_DATA:-$HOME/rosa-data}
API=${COOLIFY_API:-http://localhost:8000/api/v1}
source "$DATA/rosa.env"
TOKEN=$(cat "$DATA/coolify.token")
APP=$(cat "$DATA/coolify.app")

set_env() {
  local key=$1 value=$2 code
  if [[ -z "$value" ]]; then echo "$key: missing in rosa.env"; return 1; fi
  if [[ ! "$value" =~ ^[A-Za-z0-9_-]+$ ]]; then echo "$key: unexpected characters"; return 1; fi
  for method in POST PATCH; do
    code=$(printf '{"key":"%s","value":"%s","is_preview":false}' "$key" "$value" |
      curl -sS -o /dev/null -w '%{http_code}' -X "$method" -H @<(printf 'Authorization: Bearer %s\n' "$TOKEN") \
        -H 'Content-Type: application/json' --data-binary @- "$API/applications/$APP/envs")
    echo "$key: $method $code"
    [[ "$code" =~ ^20 ]] && return 0
  done
  return 1
}

set_env INNGEST_EVENT_KEY "${INNGEST_EVENT_KEY:-}"
set_env INNGEST_SIGNING_KEY "${INNGEST_SIGNING_KEY:-}"
echo "Redeploy the app in Coolify (or push to main) to apply."
