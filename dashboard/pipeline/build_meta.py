"""Pass 4: derive states/cities/stations/pollutants meta indexes from the
station roster written by ingest_daily.py, plus a last_build.json build
manifest."""

import json
from collections import defaultdict
from statistics import mean
from typing import Dict, Optional

from aqi_calc import LEVELS
from config import META_DIR, POLLUTANTS
from cpcb_breakpoints import BREAKPOINTS
from ingest_daily import ROSTER_CACHE_PATH

POLLUTANT_LABELS = {
    "PM2.5": "PM2.5", "PM10": "PM10", "NO2": "NO2", "SO2": "SO2",
    "CO": "CO", "OZONE": "Ozone (O3)", "NH3": "NH3",
}
POLLUTANT_UNITS = {p: ("mg/m3" if p == "CO" else "ug/m3") for p in POLLUTANTS}


def _load_roster() -> Dict[str, dict]:
    if not ROSTER_CACHE_PATH.exists():
        return {}
    return json.loads(ROSTER_CACHE_PATH.read_text())


def _mean_or_none(values):
    values = [v for v in values if v is not None]
    return round(mean(values), 5) if values else None


def build(roster: Dict[str, dict]) -> None:
    META_DIR.mkdir(parents=True, exist_ok=True)

    stations = []
    cities_map: Dict[str, dict] = {}
    states_map: Dict[str, dict] = {}

    for station_id, meta in roster.items():
        stations.append({
            "id": station_id,
            "name": meta["station"],
            "city_id": meta["city_id"],
            "state_id": meta["state_id"],
            "lat": meta["lat"],
            "lon": meta["lon"],
            "last_seen": meta["last_seen"],
        })

        city_entry = cities_map.setdefault(meta["city_id"], {
            "id": meta["city_id"], "name": meta["city"], "state_id": meta["state_id"],
            "lats": [], "lons": [], "station_count": 0,
        })
        city_entry["lats"].append(meta["lat"])
        city_entry["lons"].append(meta["lon"])
        city_entry["station_count"] += 1

        state_entry = states_map.setdefault(meta["state_id"], {
            "id": meta["state_id"], "name": meta["state"], "city_ids": set(), "station_count": 0,
        })
        state_entry["city_ids"].add(meta["city_id"])
        state_entry["station_count"] += 1

    cities = [{
        "id": c["id"], "name": c["name"], "state_id": c["state_id"],
        "lat": _mean_or_none(c["lats"]), "lon": _mean_or_none(c["lons"]),
        "station_count": c["station_count"],
    } for c in cities_map.values()]

    states = [{
        "id": s["id"], "name": s["name"],
        "city_count": len(s["city_ids"]), "station_count": s["station_count"],
    } for s in states_map.values()]

    pollutants = [{
        "id": p,
        "label": POLLUTANT_LABELS[p],
        "unit": POLLUTANT_UNITS[p],
        "breakpoints": [
            {"c_lo": lo, "c_hi": (None if hi == float("inf") else hi), "i_lo": i_lo, "i_hi": i_hi}
            for lo, hi, i_lo, i_hi in BREAKPOINTS[p]
        ],
    } for p in POLLUTANTS]

    levels = [{"key": key, "label": label, "max_aqi": max_aqi} for key, label, max_aqi in LEVELS]

    (META_DIR / "states.json").write_text(json.dumps(sorted(states, key=lambda s: s["name"])))
    (META_DIR / "cities.json").write_text(json.dumps(sorted(cities, key=lambda c: c["name"])))
    (META_DIR / "stations.json").write_text(json.dumps(sorted(stations, key=lambda s: s["name"])))
    (META_DIR / "pollutants.json").write_text(json.dumps({"pollutants": pollutants, "levels": levels}))


def write_last_build(stats: dict) -> None:
    META_DIR.mkdir(parents=True, exist_ok=True)
    (META_DIR / "last_build.json").write_text(json.dumps(stats))


def run(last_build_stats: Optional[dict] = None, verbose: bool = True) -> None:
    roster = _load_roster()
    build(roster)
    if last_build_stats is not None:
        write_last_build(last_build_stats)
    if verbose:
        print(f"Wrote meta files for {len(roster)} stations.")


if __name__ == "__main__":
    run()
