"""CLI orchestrator for the AQI data pipeline.

Usage:
    python run_pipeline.py                  # full run over all json_data/*.json
    python run_pipeline.py --sample-n 50    # quick verification run over a
                                             # chronologically-spread sample
"""

import argparse
import time
from datetime import datetime, timezone

import build_latest
import build_meta
import ingest_daily
import ingest_recent
from config import PUBLIC_DATA_DIR
from io_utils import file_datetime, list_source_files


def _sample_files(all_files, n):
    if n >= len(all_files):
        return all_files
    step = len(all_files) / n
    return [all_files[int(i * step)] for i in range(n)]


def _date_range(files):
    dates = [d for d in (file_datetime(f) for f in files) if d is not None]
    if not dates:
        return None, None
    return min(dates).date().isoformat(), max(dates).date().isoformat()


def _largest_output_file():
    max_bytes, max_path = 0, None
    for path in PUBLIC_DATA_DIR.rglob("*.json"):
        size = path.stat().st_size
        if size > max_bytes:
            max_bytes, max_path = size, path
    return max_path, max_bytes


def main():
    parser = argparse.ArgumentParser(description="AQI dashboard data pipeline")
    parser.add_argument(
        "--sample-n", type=int, default=None,
        help="Only process a chronologically-spread sample of N source files (for verification runs)",
    )
    args = parser.parse_args()

    all_files = list_source_files()
    is_sample = args.sample_n is not None
    # None (not a concrete file list) is what tells ingest_daily.run() to use
    # its SQLite-backed incremental path -- passing the full file list here
    # would look identical to a --sample-n run and skip that path entirely.
    sample_files = _sample_files(all_files, args.sample_n) if is_sample else None
    report_files = sample_files if is_sample else all_files

    started = time.time()
    print(f"Running pipeline over {len(report_files)} of {len(all_files)} available source files...")

    print("\n[1/4] ingest_daily (full-history daily aggregates)...")
    daily_skip = ingest_daily.run(source_files=sample_files)

    print("\n[2/4] build_meta (states/cities/stations/pollutants index)...")
    date_start, date_end = _date_range(report_files)
    last_build_stats = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "files_processed": len(report_files),
        "files_total_available": len(all_files),
        "files_skipped": daily_skip.count(),
        "date_range_start": date_start,
        "date_range_end": date_end,
        "sampled": is_sample,
    }
    build_meta.run(last_build_stats)

    print("\n[3/4] build_latest (today's AQI per station/city/state)...")
    build_latest.run(last_build_stats["generated_at"])

    print(f"\n[4/4] ingest_recent (last-30-day native-resolution timeseries)...")
    recent_skip = ingest_recent.run(source_files=sample_files)

    elapsed = time.time() - started
    print(f"\nDone in {elapsed:.1f}s.")
    print(f"  daily pass skipped: {daily_skip.count()}")
    print(f"  recent pass skipped: {recent_skip.count()}")

    max_path, max_bytes = _largest_output_file()
    if max_path:
        print(f"  largest output file: {max_path.relative_to(PUBLIC_DATA_DIR)} ({max_bytes / 1024:.1f} KB)")


if __name__ == "__main__":
    main()
