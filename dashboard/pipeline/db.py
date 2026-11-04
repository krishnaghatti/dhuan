"""SQLite-backed persistence for ingest_daily.py's full-history pass.

Source dumps in json_data/ are an append-only, immutable capture (new
filenames land over time; existing ones aren't rewritten), so a full run
only needs to fold in files it hasn't seen before -- everything else's
contribution to the (station, date, pollutant) accumulator is already
sitting in this DB from a prior run. This is what turns "full run" from
"reparse all 9,844+ files" into "reparse whatever's new since last time".

Not used by --sample-n verification runs: those stay fully in-memory
(see ingest_daily.run) so a sampled run never mutates the persisted state.
"""

import sqlite3
from typing import Dict, Iterable, Tuple

from config import PIPELINE_DB_PATH

SCHEMA = """
CREATE TABLE IF NOT EXISTS processed_files (
    path TEXT PRIMARY KEY,
    size INTEGER NOT NULL,
    processed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_accum (
    station_id TEXT NOT NULL,
    date TEXT NOT NULL,
    pollutant TEXT NOT NULL,
    total REAL NOT NULL,
    count INTEGER NOT NULL,
    PRIMARY KEY (station_id, date, pollutant)
);

CREATE TABLE IF NOT EXISTS station_meta (
    station_id TEXT PRIMARY KEY,
    station TEXT NOT NULL,
    city_id TEXT NOT NULL,
    city TEXT NOT NULL,
    state_id TEXT NOT NULL,
    state TEXT NOT NULL,
    lat REAL,
    lon REAL,
    last_seen TEXT NOT NULL
);
"""

AccumKey = Tuple[str, str, str]  # (station_id, date_iso, pollutant)
AccumValue = Tuple[float, int]  # (sum, count)


def connect() -> sqlite3.Connection:
    PIPELINE_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(PIPELINE_DB_PATH)
    conn.executescript(SCHEMA)
    return conn


def processed_file_sizes(conn: sqlite3.Connection) -> Dict[str, int]:
    """Filename -> size, for every file already folded into daily_accum."""
    return dict(conn.execute("SELECT path, size FROM processed_files").fetchall())


def mark_processed(conn: sqlite3.Connection, entries: Iterable[Tuple[str, int]], processed_at: str) -> None:
    conn.executemany(
        "INSERT INTO processed_files (path, size, processed_at) VALUES (?, ?, ?) "
        "ON CONFLICT(path) DO UPDATE SET size = excluded.size, processed_at = excluded.processed_at",
        [(path, size, processed_at) for path, size in entries],
    )


def apply_accum_deltas(conn: sqlite3.Connection, deltas: Dict[AccumKey, AccumValue]) -> None:
    conn.executemany(
        "INSERT INTO daily_accum (station_id, date, pollutant, total, count) VALUES (?, ?, ?, ?, ?) "
        "ON CONFLICT(station_id, date, pollutant) DO UPDATE SET "
        "total = total + excluded.total, count = count + excluded.count",
        [(sid, date, pollutant, total, count) for (sid, date, pollutant), (total, count) in deltas.items()],
    )


def load_accum(conn: sqlite3.Connection) -> Dict[AccumKey, AccumValue]:
    rows = conn.execute("SELECT station_id, date, pollutant, total, count FROM daily_accum").fetchall()
    return {(sid, date, pollutant): (total, count) for sid, date, pollutant, total, count in rows}


def upsert_station_meta(conn: sqlite3.Connection, station_meta: Dict[str, dict]) -> None:
    """station_meta: station_id -> {station, city_id, city, state_id, state,
    lat, lon, _last_seen (datetime)}, as built by ingest_daily.run(). Only
    overwrites an existing row if this record is newer (a station's most
    recent snapshot wins the coordinate/name, per the plan's tie-break)."""
    conn.executemany(
        "INSERT INTO station_meta (station_id, station, city_id, city, state_id, state, lat, lon, last_seen) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) "
        "ON CONFLICT(station_id) DO UPDATE SET "
        "station=excluded.station, city_id=excluded.city_id, city=excluded.city, "
        "state_id=excluded.state_id, state=excluded.state, lat=excluded.lat, lon=excluded.lon, "
        "last_seen=excluded.last_seen "
        "WHERE excluded.last_seen > station_meta.last_seen",
        [
            (
                sid, m["station"], m["city_id"], m["city"], m["state_id"], m["state"],
                m["lat"], m["lon"], m["_last_seen"].isoformat(),
            )
            for sid, m in station_meta.items()
        ],
    )


def load_station_meta(conn: sqlite3.Connection) -> Dict[str, dict]:
    """Returns the same shape build_meta.py/build_latest.py previously read
    from .cache/roster.json: station_id -> {station, city_id, city,
    state_id, state, lat, lon, last_seen (iso string)}."""
    rows = conn.execute(
        "SELECT station_id, station, city_id, city, state_id, state, lat, lon, last_seen FROM station_meta"
    ).fetchall()
    return {
        r[0]: {
            "station": r[1], "city_id": r[2], "city": r[3],
            "state_id": r[4], "state": r[5], "lat": r[6], "lon": r[7], "last_seen": r[8],
        }
        for r in rows
    }
