"""Pass 1: stream the full history of json_data/*.json into daily
station/city/state AQI aggregates.

Memory is bounded by distinct (station, date, pollutant) combinations, not
raw reading count, so this can run over the full 11GB source corpus without
pandas. A SQLite DB (db.py) persists that accumulator plus the roster of
already-processed filenames, so a full run only has to parse files it
hasn't seen before -- see `run()` for the incremental/sample split.
"""

import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from statistics import mean
from typing import Dict, List, Optional

import db as pipeline_db
from aqi_calc import composite_aqi, get_level
from config import CACHE_DIR, DAILY_DIR, MIN_READINGS_PER_DAY
from io_utils import SkipLogger, iter_records, list_source_files
from normalize import normalize_record

ROSTER_CACHE_PATH = CACHE_DIR / "roster.json"


def _round_dict(d: Dict[str, float], digits: int = 1) -> Dict[str, float]:
    return {k: round(v, digits) for k, v in d.items()}


def _compute_station_daily(accum: Dict) -> Dict[str, List[dict]]:
    """accum: (station_id, date_iso, pollutant) -> [sum, count]"""
    grouped: Dict = defaultdict(dict)
    for (station_id, date_iso, pollutant), (total, count) in accum.items():
        grouped[(station_id, date_iso)][pollutant] = (total, count)

    station_series: Dict[str, List[dict]] = defaultdict(list)
    for (station_id, date_iso), pollutant_data in grouped.items():
        concentrations = {}
        n_readings = {}
        for pollutant, (total, count) in pollutant_data.items():
            n_readings[pollutant] = count
            if count >= MIN_READINGS_PER_DAY:
                concentrations[pollutant] = total / count

        aqi, level, dominant, sub_indices = composite_aqi(concentrations)
        station_series[station_id].append({
            "date": date_iso,
            "aqi": aqi,
            "level": level,
            "dominant_pollutant": dominant,
            "sub_indices": _round_dict(sub_indices),
            "n_readings": n_readings,
        })

    for series in station_series.values():
        series.sort(key=lambda e: e["date"])
    return station_series


def _aggregate_day(date_iso: str, entries: List[dict]) -> dict:
    """Roll up one level of daily entries (station->city or city->state):
    AQI is the mean of the non-null AQIs one level down, per the plan's
    'mean of AQI values' rule (not a second breakpoint pass)."""
    aqis = [e["aqi"] for e in entries if e["aqi"] is not None]
    aqi = round(mean(aqis)) if aqis else None
    level = get_level(aqi) if aqi is not None else None

    dominant_counts = Counter(e["dominant_pollutant"] for e in entries if e["dominant_pollutant"])
    dominant = dominant_counts.most_common(1)[0][0] if dominant_counts else None

    sub_index_values: Dict[str, List[float]] = defaultdict(list)
    n_readings_sum: Dict[str, int] = defaultdict(int)
    for e in entries:
        for pollutant, value in e["sub_indices"].items():
            sub_index_values[pollutant].append(value)
        for pollutant, count in e["n_readings"].items():
            n_readings_sum[pollutant] += count

    sub_indices = {p: round(mean(vs), 1) for p, vs in sub_index_values.items()}
    return {
        "date": date_iso,
        "aqi": aqi,
        "level": level,
        "dominant_pollutant": dominant,
        "sub_indices": sub_indices,
        "n_readings": dict(n_readings_sum),
    }


def _rollup(child_series: Dict[str, List[dict]], child_to_parent: Dict[str, str]) -> Dict[str, List[dict]]:
    grouped: Dict = defaultdict(lambda: defaultdict(list))
    for child_id, days in child_series.items():
        parent_id = child_to_parent.get(child_id)
        if parent_id is None:
            continue
        for entry in days:
            grouped[parent_id][entry["date"]].append(entry)

    parent_series: Dict[str, List[dict]] = defaultdict(list)
    for parent_id, by_date in grouped.items():
        for date_iso, entries in by_date.items():
            parent_series[parent_id].append(_aggregate_day(date_iso, entries))
    for series in parent_series.values():
        series.sort(key=lambda e: e["date"])
    return parent_series


def _write_series(series_by_id: Dict[str, List[dict]], out_dir: Path, extra_fields_by_id: Dict[str, dict]) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    for entity_id, series in series_by_id.items():
        payload = {"id": entity_id, **extra_fields_by_id.get(entity_id, {}), "series": series}
        (out_dir / f"{entity_id}.json").write_text(json.dumps(payload))


def _scan_files(files: List[Path], skip_logger: SkipLogger, verbose: bool) -> tuple:
    """One pass over `files`, folding records into a fresh (not persisted)
    accumulator + station roster. Shared by both the incremental full-run
    path (scans only new files, then merges into the DB) and the
    --sample-n path (scans the sample directly, no DB involved)."""
    accum: Dict = defaultdict(lambda: [0.0, 0])
    station_meta: Dict[str, dict] = {}

    for i, path in enumerate(files):
        for raw in iter_records(path, skip_logger):
            rec = normalize_record(raw, source_path=path, skip_logger=skip_logger)
            if rec is None:
                continue

            existing = station_meta.get(rec.station_id)
            if existing is None or rec.timestamp > existing["_last_seen"]:
                station_meta[rec.station_id] = {
                    "station_id": rec.station_id,
                    "station": rec.station,
                    "city_id": rec.city_id,
                    "city": rec.city,
                    "state_id": rec.state_id,
                    "state": rec.state,
                    "lat": rec.lat,
                    "lon": rec.lon,
                    "_last_seen": rec.timestamp,
                }

            if rec.avg_value is None:
                continue
            key = (rec.station_id, rec.record_date.isoformat(), rec.pollutant_id)
            entry = accum[key]
            entry[0] += rec.avg_value
            entry[1] += 1

        if verbose and (i + 1) % 500 == 0:
            print(f"  ...{i + 1}/{len(files)} files processed")

    return accum, station_meta


def run(source_files=None, verbose: bool = True) -> SkipLogger:
    skip_logger = SkipLogger()

    if source_files is None:
        # Full run: skip any source file whose (name, size) is already in
        # the DB -- json_data/ is an append-only capture, so an unchanged
        # file can't have new data. Only new/changed files get re-parsed;
        # everything else's contribution is already in daily_accum.
        all_files = list_source_files()
        conn = pipeline_db.connect()
        seen_sizes = pipeline_db.processed_file_sizes(conn)
        new_files = [f for f in all_files if seen_sizes.get(f.name) != f.stat().st_size]

        delta_accum, delta_station_meta = _scan_files(new_files, skip_logger, verbose)

        pipeline_db.apply_accum_deltas(conn, {k: tuple(v) for k, v in delta_accum.items()})
        pipeline_db.upsert_station_meta(conn, delta_station_meta)
        pipeline_db.mark_processed(
            conn,
            [(f.name, f.stat().st_size) for f in new_files],
            datetime.now(timezone.utc).isoformat(),
        )
        conn.commit()

        accum = pipeline_db.load_accum(conn)
        station_meta = {sid: {"station_id": sid, **m} for sid, m in pipeline_db.load_station_meta(conn).items()}
        conn.close()

        if verbose:
            print(f"  {len(new_files)} new/changed files parsed, {len(all_files) - len(new_files)} "
                  f"already folded in from pipeline/.cache/pipeline.db.")
    else:
        # --sample-n verification runs stay fully in-memory and never touch
        # the persisted DB, so a sampled run can't corrupt the real
        # accumulator or get skipped as "already processed" later.
        accum_raw, station_meta_raw = _scan_files(source_files, skip_logger, verbose)
        accum = {k: tuple(v) for k, v in accum_raw.items()}
        station_meta = {
            sid: {**{k: v for k, v in m.items() if k != "_last_seen"}, "last_seen": m["_last_seen"].isoformat()}
            for sid, m in station_meta_raw.items()
        }

    skip_logger.write()

    station_series = _compute_station_daily(accum)

    station_to_city = {sid: m["city_id"] for sid, m in station_meta.items()}
    city_series = _rollup(station_series, station_to_city)

    city_to_state = {m["city_id"]: m["state_id"] for m in station_meta.values()}
    state_series = _rollup(city_series, city_to_state)

    station_extra = {sid: {"city_id": m["city_id"], "state_id": m["state_id"]} for sid, m in station_meta.items()}
    city_extra = {cid: {"state_id": city_to_state[cid]} for cid in city_series}

    _write_series(station_series, DAILY_DIR / "station", station_extra)
    _write_series(city_series, DAILY_DIR / "city", city_extra)
    _write_series(state_series, DAILY_DIR / "state", {})

    _write_roster_cache(station_meta)

    if verbose:
        print(f"Wrote {len(station_series)} station, {len(city_series)} city, "
              f"{len(state_series)} state daily files. Skipped {skip_logger.count()} files/records.")

    return skip_logger


def _write_roster_cache(station_meta: Dict[str, dict]) -> None:
    """station_meta here is already JSON-safe (last_seen as an ISO string,
    no leftover datetime) -- both the incremental and sampled branches of
    run() normalize it to this shape before calling this."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    ROSTER_CACHE_PATH.write_text(json.dumps(station_meta))


if __name__ == "__main__":
    run()
