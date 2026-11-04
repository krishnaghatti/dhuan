from pathlib import Path

PIPELINE_DIR = Path(__file__).resolve().parent
DASHBOARD_DIR = PIPELINE_DIR.parent
PROJECT_ROOT = DASHBOARD_DIR.parent

JSON_DATA_DIR = PROJECT_ROOT / "json_data"
PUBLIC_DATA_DIR = DASHBOARD_DIR / "public" / "data"

META_DIR = PUBLIC_DATA_DIR / "meta"
LATEST_DIR = PUBLIC_DATA_DIR / "latest"
DAILY_DIR = PUBLIC_DATA_DIR / "timeseries" / "daily"
RECENT_DIR = PUBLIC_DATA_DIR / "timeseries" / "recent30d"

CACHE_DIR = PIPELINE_DIR / ".cache"
# Persisted accumulator + processed-file roster for ingest_daily.py's
# incremental full runs -- lets a re-run skip source files it already folded
# in, instead of re-parsing all of json_data/ every time.
PIPELINE_DB_PATH = CACHE_DIR / "pipeline.db"

LOGS_DIR = PIPELINE_DIR / "logs"
# Separate per-pass log files -- ingest_daily and ingest_recent each write
# their own SkipLogger; sharing one path meant whichever pass ran last
# silently clobbered the other's diagnostics.
SKIPPED_FILES_LOG_DAILY = LOGS_DIR / "skipped_files_daily.log"
SKIPPED_FILES_LOG_RECENT = LOGS_DIR / "skipped_files_recent.log"
WARNINGS_LOG = LOGS_DIR / "warnings.log"

# Filename pattern: YYYY-MM-DD_HH-MM-SS.json
FILENAME_DATE_FORMAT = "%Y-%m-%d_%H-%M-%S"

RECENT_WINDOW_DAYS = 30

# A pollutant's daily sub-index is only computed if at least this many
# readings were captured that day. Source cadence is ~2h (~12 possible
# readings/day) but real uploads have gaps, so this is a deliberate
# relaxation of CPCB's stricter same-day completeness rule.
MIN_READINGS_PER_DAY = 4

# CPCB rule: composite AQI needs >=3 pollutants with a valid sub-index,
# at least one of which is PM2.5 or PM10.
MIN_POLLUTANTS_FOR_AQI = 3
REQUIRED_ANY_OF = {"PM2.5", "PM10"}

# CPCB's Severe band (401-500) has no published upper concentration bound.
# Any concentration at/above the Severe breakpoint is capped at this AQI.
SEVERE_CAP = 500

POLLUTANTS = ["PM2.5", "PM10", "NO2", "SO2", "CO", "OZONE", "NH3"]
