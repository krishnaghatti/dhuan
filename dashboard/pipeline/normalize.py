"""Per-record cleaning: schema-drift field mapping, NA handling, unit
conversion, state-name canonicalization, and identity slugging.
"""

from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Optional

from config import POLLUTANTS
from io_utils import SkipLogger
from slugify import city_id, station_id, state_id
from state_names import normalize_state_name

LAST_UPDATE_FORMAT = "%d-%m-%Y %H:%M:%S"

# CO is reported by the source API in ug/m3, but CPCB's official CO
# breakpoint table (cpcb_breakpoints.py) is in mg/m3. Verified against real
# data: sampled CO avg_value has median ~30, max ~195 -- plausible ug/m3,
# absurd as mg/m3 (would read permanently Severe). This conversion is the
# single most important correctness fix in the pipeline.
CO_UNIT_DIVISOR = 1000.0


@dataclass
class NormalizedRecord:
    state: str
    city: str
    station: str
    state_id: str
    city_id: str
    station_id: str
    lat: Optional[float]
    lon: Optional[float]
    pollutant_id: str
    min_value: Optional[float]
    max_value: Optional[float]
    avg_value: Optional[float]
    record_date: date
    timestamp: datetime


def _parse_float(value) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip()
    if not text or text.upper() == "NA":
        return None
    try:
        return float(text)
    except ValueError:
        return None


def normalize_record(
    raw: dict,
    source_path: Optional[Path] = None,
    skip_logger: Optional[SkipLogger] = None,
) -> Optional[NormalizedRecord]:
    pollutant = raw.get("pollutant_id")
    if pollutant not in POLLUTANTS:
        if skip_logger and source_path:
            skip_logger.log(source_path, f"unknown pollutant_id: {pollutant!r}")
        return None

    # Schema drift: new schema uses min_value/max_value/avg_value,
    # older files use pollutant_min/pollutant_max/pollutant_avg.
    if "min_value" in raw:
        min_v, max_v, avg_v = raw.get("min_value"), raw.get("max_value"), raw.get("avg_value")
    else:
        min_v, max_v, avg_v = raw.get("pollutant_min"), raw.get("pollutant_max"), raw.get("pollutant_avg")

    min_value, max_value, avg_value = _parse_float(min_v), _parse_float(max_v), _parse_float(avg_v)

    if pollutant == "CO":
        if min_value is not None:
            min_value /= CO_UNIT_DIVISOR
        if max_value is not None:
            max_value /= CO_UNIT_DIVISOR
        if avg_value is not None:
            avg_value /= CO_UNIT_DIVISOR

    last_update = raw.get("last_update")
    try:
        timestamp = datetime.strptime(last_update, LAST_UPDATE_FORMAT)
    except (TypeError, ValueError):
        if skip_logger and source_path:
            skip_logger.log(source_path, f"unparseable last_update: {last_update!r}")
        return None

    state_raw = raw.get("state") or ""
    city = (raw.get("city") or "").strip()
    station = (raw.get("station") or "").strip()
    if not state_raw or not city or not station:
        if skip_logger and source_path:
            skip_logger.log(source_path, "missing state/city/station")
        return None

    state = normalize_state_name(state_raw)

    return NormalizedRecord(
        state=state,
        city=city,
        station=station,
        state_id=state_id(state),
        city_id=city_id(state, city),
        station_id=station_id(state, city, station),
        lat=_parse_float(raw.get("latitude")),
        lon=_parse_float(raw.get("longitude")),
        pollutant_id=pollutant,
        min_value=min_value,
        max_value=max_value,
        avg_value=avg_value,
        record_date=timestamp.date(),
        timestamp=timestamp,
    )
