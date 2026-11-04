"""Pass 3: 'latest' AQI per station, city, and state.

'Latest' means today's daily-so-far aggregate (the most recent entry in each
station's daily series, written by ingest_daily.py) rather than a single raw
2-hourly snapshot -- a lone reading is noisy; CPCB's own methodology is
built around daily averages.
"""

import json
from collections import Counter, defaultdict
from statistics import mean
from typing import Dict, List, Optional

from aqi_calc import get_level
from config import DAILY_DIR, LATEST_DIR
from ingest_daily import ROSTER_CACHE_PATH


def _load_roster() -> Dict[str, dict]:
    if not ROSTER_CACHE_PATH.exists():
        return {}
    return json.loads(ROSTER_CACHE_PATH.read_text())


def _latest_station_entry(station_id: str) -> Optional[dict]:
    path = DAILY_DIR / "station" / f"{station_id}.json"
    if not path.exists():
        return None
    data = json.loads(path.read_text())
    series = data.get("series") or []
    return series[-1] if series else None


def _aggregate(entries: List[dict]) -> dict:
    aqis = [e["aqi"] for e in entries if e and e.get("aqi") is not None]
    aqi = round(mean(aqis)) if aqis else None
    level = get_level(aqi) if aqi is not None else None
    dominant_counts = Counter(e["dominant_pollutant"] for e in entries if e and e.get("dominant_pollutant"))
    dominant = dominant_counts.most_common(1)[0][0] if dominant_counts else None
    return {"aqi": aqi, "level": level, "dominant_pollutant": dominant}


def run(generated_at: str, verbose: bool = True) -> None:
    roster = _load_roster()

    station_entries: Dict[str, dict] = {}
    for station_id in roster:
        entry = _latest_station_entry(station_id)
        if entry is not None:
            station_entries[station_id] = entry

    cities: Dict[str, dict] = {}
    for station_id, meta in roster.items():
        city = cities.setdefault(meta["city_id"], {
            "city_id": meta["city_id"], "city": meta["city"], "state_id": meta["state_id"],
            "stations": [],
        })
        entry = station_entries.get(station_id)
        city["stations"].append({
            "station_id": station_id,
            "station": meta["station"],
            "lat": meta["lat"],
            "lon": meta["lon"],
            "date": entry["date"] if entry else None,
            "aqi": entry["aqi"] if entry else None,
            "level": entry["level"] if entry else None,
            "dominant_pollutant": entry["dominant_pollutant"] if entry else None,
        })

    states: Dict[str, dict] = {}
    for city in cities.values():
        agg = _aggregate(city["stations"])
        city.update(agg)
        city["station_count"] = len(city["stations"])

        state_id = city["state_id"]
        state = states.setdefault(state_id, {"state_id": state_id, "state": None, "cities": []})
        state["cities"].append(city)

    # state names: derive from any station in that state
    state_names = {m["state_id"]: m["state"] for m in roster.values()}
    for state_id, state in states.items():
        state["state"] = state_names.get(state_id)
        agg = _aggregate(state["cities"])
        state.update(agg)

    payload = {
        "generated_at": generated_at,
        "states": sorted(states.values(), key=lambda s: s["state"] or ""),
    }

    LATEST_DIR.mkdir(parents=True, exist_ok=True)
    (LATEST_DIR / "latest.json").write_text(json.dumps(payload))

    if verbose:
        print(f"Wrote latest.json: {len(states)} states, {len(cities)} cities, {len(station_entries)} stations with data.")


if __name__ == "__main__":
    from datetime import datetime, timezone
    run(datetime.now(timezone.utc).isoformat())
