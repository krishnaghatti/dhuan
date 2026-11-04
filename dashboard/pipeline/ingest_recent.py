"""Pass 2: last-30-days native-resolution (~2h) timeseries, per station and
per city. Filtered by filename-encoded date before opening any file, so this
stays cheap regardless of how much full history accumulates."""

import json
from collections import Counter, defaultdict
from datetime import timedelta
from pathlib import Path
from statistics import mean
from typing import Dict, List, Optional

from aqi_calc import composite_aqi, get_level
from config import RECENT_DIR, RECENT_WINDOW_DAYS, SKIPPED_FILES_LOG_RECENT
from io_utils import SkipLogger, file_datetime, iter_records, list_source_files
from normalize import normalize_record


def _latest_file_datetime(source_files):
    for path in reversed(source_files):
        dt = file_datetime(path)
        if dt is not None:
            return dt
    return None


def run(source_files=None, verbose: bool = True) -> SkipLogger:
    all_files = source_files if source_files is not None else list_source_files()
    reference = _latest_file_datetime(all_files)
    skip_logger = SkipLogger()
    if reference is None:
        if verbose:
            print("No source files with parseable filenames found; nothing to do.")
        return skip_logger

    cutoff = reference - timedelta(days=RECENT_WINDOW_DAYS)
    recent_files = [f for f in all_files if (file_datetime(f) or cutoff) >= cutoff]

    # (station_id, ts_iso) -> {pollutant: value}
    station_readings: Dict = defaultdict(dict)
    station_meta: Dict[str, dict] = {}

    for path in recent_files:
        for raw in iter_records(path, skip_logger):
            rec = normalize_record(raw, source_path=path, skip_logger=skip_logger)
            if rec is None or rec.avg_value is None:
                continue

            station_meta[rec.station_id] = {
                "city_id": rec.city_id,
                "state_id": rec.state_id,
            }
            ts_iso = rec.timestamp.isoformat()
            station_readings[(rec.station_id, ts_iso)][rec.pollutant_id] = rec.avg_value

    skip_logger.write(SKIPPED_FILES_LOG_RECENT)

    station_series = _build_station_series(station_readings)
    city_series = _build_city_series(station_series, station_meta)

    _write_station_recent(station_series, station_meta)
    _write_city_recent(city_series, station_meta)

    if verbose:
        print(f"Recent-{RECENT_WINDOW_DAYS}d: wrote {len(station_series)} station files, "
              f"{len(city_series)} city files from {len(recent_files)} source files.")

    return skip_logger


def _build_station_series(station_readings: Dict) -> Dict[str, List[dict]]:
    series: Dict[str, List[dict]] = defaultdict(list)
    for (station_id, ts_iso), readings in station_readings.items():
        aqi, level, dominant, _sub_indices = composite_aqi(readings)
        series[station_id].append({
            "ts": ts_iso,
            "readings": readings,
            "aqi": aqi,
            "level": level,
            "dominant_pollutant": dominant,
        })
    for entries in series.values():
        entries.sort(key=lambda e: e["ts"])
    return series


def _build_city_series(station_series: Dict[str, List[dict]], station_meta: Dict[str, dict]) -> Dict[str, List[dict]]:
    grouped: Dict = defaultdict(lambda: defaultdict(list))
    for station_id, entries in station_series.items():
        city_id = station_meta[station_id]["city_id"]
        for entry in entries:
            grouped[city_id][entry["ts"]].append(entry)

    city_series: Dict[str, List[dict]] = defaultdict(list)
    for city_id, by_ts in grouped.items():
        for ts_iso, entries in by_ts.items():
            city_series[city_id].append(_aggregate_snapshot(ts_iso, entries))
    for entries in city_series.values():
        entries.sort(key=lambda e: e["ts"])
    return city_series


def _aggregate_snapshot(ts_iso: str, entries: List[dict]) -> dict:
    aqis = [e["aqi"] for e in entries if e["aqi"] is not None]
    aqi = round(mean(aqis)) if aqis else None
    level = get_level(aqi) if aqi is not None else None

    dominant_counts = Counter(e["dominant_pollutant"] for e in entries if e["dominant_pollutant"])
    dominant = dominant_counts.most_common(1)[0][0] if dominant_counts else None

    readings_values: Dict[str, List[float]] = defaultdict(list)
    for e in entries:
        for pollutant, value in e["readings"].items():
            readings_values[pollutant].append(value)
    readings = {p: round(mean(vs), 2) for p, vs in readings_values.items()}

    return {"ts": ts_iso, "readings": readings, "aqi": aqi, "level": level, "dominant_pollutant": dominant}


def _write_station_recent(station_series: Dict[str, List[dict]], station_meta: Dict[str, dict]) -> None:
    out_dir = RECENT_DIR / "station"
    out_dir.mkdir(parents=True, exist_ok=True)
    for station_id, series in station_series.items():
        meta = station_meta[station_id]
        payload = {"id": station_id, "city_id": meta["city_id"], "state_id": meta["state_id"], "series": series}
        (out_dir / f"{station_id}.json").write_text(json.dumps(payload))


def _write_city_recent(city_series: Dict[str, List[dict]], station_meta: Dict[str, dict]) -> None:
    city_to_state = {m["city_id"]: m["state_id"] for m in station_meta.values()}
    out_dir = RECENT_DIR / "city"
    out_dir.mkdir(parents=True, exist_ok=True)
    for city_id, series in city_series.items():
        payload = {"id": city_id, "state_id": city_to_state.get(city_id), "series": series}
        (out_dir / f"{city_id}.json").write_text(json.dumps(payload))


if __name__ == "__main__":
    run()
