import re

_NON_SLUG = re.compile(r"[^a-z0-9]+")


def slugify(value: str) -> str:
    """Deterministic URL-safe id: lowercase, non-alnum runs collapsed to '-'."""
    slug = _NON_SLUG.sub("-", value.strip().lower()).strip("-")
    return slug or "unknown"


def station_id(state: str, city: str, station: str) -> str:
    return f"{slugify(state)}__{slugify(city)}__{slugify(station)}"


def city_id(state: str, city: str) -> str:
    return f"{slugify(state)}__{slugify(city)}"


def state_id(state: str) -> str:
    return slugify(state)
