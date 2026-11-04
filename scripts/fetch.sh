#!/usr/bin/env bash
# Fetches one snapshot of the data.gov.in real-time AQI feed into json_data/,
# named by local time (YYYY-MM-DD_HH-MM-SS.json) like the rest of the archive.
# Replaces query.sh, reading the key from the environment instead of the script.
#
# A failed request or a response with no records is skipped (exit 0, nothing
# printed) so a flaky API costs one missed reading rather than a failed run.
# On success, prints the saved file's path.
set -euo pipefail

: "${DATA_GOV_API_KEY:?DATA_GOV_API_KEY is not set}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/json_data/$(date '+%Y-%m-%d_%H-%M-%S').json"
URL="https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69?api-key=${DATA_GOV_API_KEY}&format=json&offset=0&limit=5000"

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

# -sS keeps curl's error line but never echoes the URL (which holds the key).
if ! curl -sS --fail --retry 3 --retry-delay 20 --max-time 120 \
    -H "accept: application/json" -o "$tmp" "$URL"; then
  echo "fetch: request failed; skipping this slot" >&2
  exit 0
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
