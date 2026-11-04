import json
from datetime import datetime
from pathlib import Path
from typing import Iterator, List, Optional

from config import FILENAME_DATE_FORMAT, JSON_DATA_DIR, SKIPPED_FILES_LOG_DAILY


def safe_load_json(path: Path) -> Optional[dict]:
    """Load a source dump, returning None (and letting the caller log it)
    for zero-byte files or malformed JSON -- both are confirmed to occur
    in json_data/ (~100 zero-byte files out of 9,844)."""
    try:
        if path.stat().st_size == 0:
            return None
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError, UnicodeDecodeError):
        return None


def file_datetime(path: Path) -> Optional[datetime]:
    try:
        return datetime.strptime(path.stem, FILENAME_DATE_FORMAT)
    except ValueError:
        return None


def list_source_files(data_dir: Path = JSON_DATA_DIR) -> List[Path]:
    """All source dumps, sorted chronologically by filename."""
    return sorted(data_dir.glob("*.json"))


def list_source_files_since(cutoff: datetime, data_dir: Path = JSON_DATA_DIR) -> List[Path]:
    """Source dumps from `cutoff` onward, filtered cheaply by filename before
    opening any file (avoids parsing 2+ years of data for a 30-day window)."""
    files = []
    for path in list_source_files(data_dir):
        dt = file_datetime(path)
        if dt is not None and dt >= cutoff:
            files.append(path)
    return files


class SkipLogger:
    """Collects skipped-file reasons and writes them out at the end of a run."""

    def __init__(self):
        self._entries: List[str] = []

    def log(self, path: Path, reason: str) -> None:
        self._entries.append(f"{path.name}\t{reason}")

    def count(self) -> int:
        return len(self._entries)

    def write(self, log_path: Path = SKIPPED_FILES_LOG_DAILY) -> None:
        log_path.parent.mkdir(parents=True, exist_ok=True)
        with open(log_path, "w", encoding="utf-8") as f:
            f.write("\n".join(self._entries))
            if self._entries:
                f.write("\n")


def iter_records(path: Path, skip_logger: Optional[SkipLogger] = None) -> Iterator[dict]:
    data = safe_load_json(path)
    if data is None:
        if skip_logger:
            skip_logger.log(path, "unreadable (zero-byte or malformed JSON)")
        return
    records = data.get("records")
    if not isinstance(records, list):
        if skip_logger:
            skip_logger.log(path, "no 'records' array")
        return
    yield from records
