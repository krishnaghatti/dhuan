#!/usr/bin/env bash
# Keeps everything the pipeline needs between runs in one GitHub Release
# (tag "data"), so the scheduled workflow can start from a fresh machine:
#
#   pipeline.db.gz       dashboard/pipeline/.cache/pipeline.db -- the daily
#                        aggregates for all history, so old raw files are
#                        never re-read
#   aqi-YYYY-MM.tar.xz   every raw json_data/ snapshot for that month (the
#                        permanent archive; download + `tar -xJf` to restore)
#
# Usage:
#   scripts/state.sh restore              pipeline.db + the raw files a run needs
#   scripts/state.sh save-db              upload the current pipeline.db
#   scripts/state.sh save-month YYYY-MM   re-pack that month from json_data/ and upload
#   scripts/state.sh upload FILE...       upload pre-built assets (initial seeding)
#
# Needs an authenticated `gh` (GH_TOKEN in Actions). restore uses GNU date.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
JSON_DIR="$ROOT/json_data"
DB="$ROOT/dashboard/pipeline/.cache/pipeline.db"
TAG="${STATE_RELEASE_TAG:-data}"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

asset_names() {
  gh release view "$TAG" --json assets --jq '.assets[].name'
}

has_asset() {  # NAME
  asset_names | grep -qxF "$1"
}

# Downloads NAME into $WORK and prints its path (nothing if absent). Falls
# back to tmp-NAME, which only survives if put_asset died between deleting
# the old NAME and renaming its replacement.
fetch_asset() {  # NAME
  local candidate
  for candidate in "$1" "tmp-$1"; do
    if has_asset "$candidate"; then
      gh release download "$TAG" --pattern "$candidate" --dir "$WORK" --clobber >&2
      echo "$WORK/$candidate"
      return
    fi
  done
}

# Replaces an asset without a window where neither copy exists: `gh release
# upload --clobber` deletes before uploading, so a failed upload would lose
# the only copy of pipeline.db or a month's archive. Instead upload as
# tmp-NAME, then delete NAME, then rename tmp-NAME -> NAME.
put_asset() {  # FILE (stored under its basename)
  local file="$1" name url
  name="$(basename "$file")"
  if has_asset "tmp-$name"; then
    gh release delete-asset "$TAG" "tmp-$name" -y
  fi
  ln -sf "$(cd "$(dirname "$file")" && pwd)/$name" "$WORK/tmp-$name"
  gh release upload "$TAG" "$WORK/tmp-$name"
  if has_asset "$name"; then
    gh release delete-asset "$TAG" "$name" -y
  fi
  url="$(gh release view "$TAG" --json assets --jq ".assets[] | select(.name == \"tmp-$name\") | .apiUrl")"
  gh api -X PATCH "${url#https://api.github.com/}" -f name="$name" >/dev/null
  echo "state: uploaded $name" >&2
}

ensure_release() {
  if ! gh release view "$TAG" >/dev/null 2>&1; then
    gh release create "$TAG" --title "Pipeline state and raw archive" \
      --notes "Managed by scripts/state.sh. aqi-YYYY-MM.tar.xz holds every raw snapshot for that month; pipeline.db.gz is the pipeline's incremental state."
  fi
}

restore() {
  mkdir -p "$JSON_DIR" "$(dirname "$DB")"

  local db
  db="$(fetch_asset pipeline.db.gz)"
  if [[ -z "$db" ]]; then
    echo "state: pipeline.db.gz is missing from release '$TAG'" >&2
    exit 1
  fi
  gunzip -c "$db" > "$DB"

  # Previous + current month always cover ingest_recent's 30-day window.
  # Older files aren't needed: ingest_daily skips anything already in the DB.
  local this_month prev_month month archive
  this_month="$(date +%Y-%m)"
  prev_month="$(date -d "$this_month-01 -1 month" +%Y-%m)"
  for month in "$prev_month" "$this_month"; do
    archive="$(fetch_asset "aqi-$month.tar.xz")"
    if [[ -n "$archive" ]]; then
      tar -xJf "$archive" -C "$JSON_DIR"
    fi
  done

  # Keep the very first snapshot too: run_pipeline.py takes last_build.json's
  # date_range_start (shown in the UI) from the oldest file present.
  local first_month first_file
  first_month="$(asset_names | grep -E '^aqi-[0-9]{4}-[0-9]{2}\.tar\.xz$' | sort | sed -n 1p)"
  if [[ -n "$first_month" && "$first_month" != "aqi-$prev_month.tar.xz" && "$first_month" != "aqi-$this_month.tar.xz" ]]; then
    archive="$(fetch_asset "$first_month")"
    first_file="$(tar -tJf "$archive" | sort | sed -n 1p)"
    tar -xJf "$archive" -C "$JSON_DIR" "$first_file"
  fi

  echo "state: restored pipeline.db and $(find "$JSON_DIR" -name '*.json' | wc -l | tr -d ' ') raw files" >&2
}

save_db() {
  gzip -c "$DB" > "$WORK/pipeline.db.gz"
  put_asset "$WORK/pipeline.db.gz"
}

save_month() {  # YYYY-MM
  local month="$1" out files
  out="$WORK/aqi-$month.tar.xz"
  files="$(cd "$JSON_DIR" && ls -- "$month"-*.json)"
  # shellcheck disable=SC2086  # filenames are YYYY-MM-DD_HH-MM-SS.json, no spaces
  tar -C "$JSON_DIR" -cf - $files | xz -6 -T0 > "$out"
  put_asset "$out"
}

cmd="${1:-}"
shift || true
case "$cmd" in
  restore) restore ;;
  save-db) ensure_release; save_db ;;
  save-month) ensure_release; save_month "${1:?usage: state.sh save-month YYYY-MM}" ;;
  upload)
    ensure_release
    for f in "$@"; do put_asset "$f"; done
    ;;
  *)
    sed -n '2,19p' "$0" >&2
    exit 1
    ;;
esac
