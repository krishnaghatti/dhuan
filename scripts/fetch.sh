#!/usr/bin/env bash
# Fetches one snapshot of the data.gov.in real-time AQI feed into json_data/,
# named by local time (YYYY-MM-DD_HH-MM-SS.json) like the rest of the archive.
# Replaces query.sh, reading the key from the environment instead of the script.
#
# A response with no records (an API-side outage, common in the archive) is
# skipped (exit 0, nothing printed) so it costs one missed reading rather
# than a failed run. Not reaching the API at all exits 1, so a blocked or
# down endpoint shows up as a failed run instead of a silent green one.
# On success, prints the saved file's path.
set -euo pipefail

: "${DATA_GOV_API_KEY:?DATA_GOV_API_KEY is not set}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/json_data/$(date '+%Y-%m-%d_%H-%M-%S').json"
URL="https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69?api-key=${DATA_GOV_API_KEY}&format=json&offset=0&limit=5000"

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

# -sS keeps curl's error line but never echoes the URL (which holds the key).
# --retry-all-errors also retries refused connections, which --retry alone skips.
if ! curl -sS --fail --retry 3 --retry-delay 20 --retry-all-errors --max-time 120 \
    -H "accept: application/json" -o "$tmp" "$URL"; then
  echo "fetch: could not get a response from api.data.gov.in" >&2
  exit 1
fi

count="$(python3 -c 'import json, sys; print(len(json.load(open(sys.argv[1])).get("records") or []))' "$tmp" 2>/dev/null || echo 0)"
if [[ "$count" -eq 0 ]]; then
  echo "fetch: response had no records; skipping this slot" >&2
  exit 0
fi

mkdir -p "$(dirname "$OUT")"
mv "$tmp" "$OUT"
echo "fetch: saved $count records to $(basename "$OUT")" >&2
echo "$OUT"
