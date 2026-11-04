#!/usr/bin/env bash
# One-time: packs the local json_data/ into one aqi-YYYY-MM.tar.xz per month
# in OUT_DIR and checks each archive holds exactly that month's files.
# Upload the result with:  scripts/state.sh upload OUT_DIR/*.tar.xz
#
# Usage: scripts/seed_archive.sh OUT_DIR
set -euo pipefail

OUT_DIR="${1:?usage: seed_archive.sh OUT_DIR}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
JSON_DIR="$ROOT/json_data"
mkdir -p "$OUT_DIR"

# macOS tar otherwise embeds xattrs/AppleDouble entries that GNU tar on the
# Actions runner warns about.
export COPYFILE_DISABLE=1
tar_flags=()
if tar --version 2>/dev/null | grep -q bsdtar; then
  tar_flags=(--no-xattrs --no-mac-metadata)
fi

months="$(cd "$JSON_DIR" && ls -- *.json | cut -c1-7 | sort -u)"
for month in $months; do
  out="$OUT_DIR/aqi-$month.tar.xz"
  files="$(cd "$JSON_DIR" && ls -- "$month"-*.json)"
  expected="$(wc -l <<<"$files" | tr -d ' ')"
  if [[ -f "$out" ]] && [[ "$(tar -tJf "$out" | wc -l | tr -d ' ')" == "$expected" ]]; then
    echo "$month: already packed ($expected files), skipping"
    continue
  fi
  # shellcheck disable=SC2086  # filenames are YYYY-MM-DD_HH-MM-SS.json, no spaces
  tar ${tar_flags[@]+"${tar_flags[@]}"} -C "$JSON_DIR" -cf - $files | xz -6 -T0 > "$out.part"
  got="$(tar -tJf "$out.part" | wc -l | tr -d ' ')"
  if [[ "$got" != "$expected" ]]; then
    echo "$month: archive has $got files, expected $expected" >&2
    exit 1
  fi
  mv "$out.part" "$out"
  echo "$month: $expected files -> $(du -h "$out" | cut -f1)"
done
