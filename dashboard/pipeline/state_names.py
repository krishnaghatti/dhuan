"""Canonical Indian state/UT name normalization.

Source data has at least three separator variants for the same state
(confirmed in json_data/: 'Andhra_Pradesh', 'Andhra Pradesh', 'TamilNadu').
Rather than special-case each variant, every raw name is reduced to a
separator-free lowercase key and matched against the official roster below.
"""

import re
from typing import Optional

OFFICIAL_STATES_AND_UTS = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
    "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
    "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim",
    "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
    "West Bengal",
    # Union Territories
    "Andaman and Nicobar Islands", "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu", "Delhi",
    "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
]

_NON_ALNUM = re.compile(r"[^a-z0-9]")


def _key(name: str) -> str:
    return _NON_ALNUM.sub("", name.lower())


_ALIAS_TO_CANONICAL = {_key(name): name for name in OFFICIAL_STATES_AND_UTS}

# A few extra known aliases beyond the plain-name variants (e.g. old/other names).
_EXTRA_ALIASES = {
    "pondicherry": "Puducherry",
    "orissa": "Odisha",
    "uttaranchal": "Uttarakhand",
    "andamanandnicobar": "Andaman and Nicobar Islands",
}
for _alias, _canonical in _EXTRA_ALIASES.items():
    _ALIAS_TO_CANONICAL[_key(_alias)] = _canonical

_unknown_seen: set = set()


def normalize_state_name(raw: str) -> str:
    """Return the canonical state/UT name for a raw source value.

    Falls back to a title-cased, space-joined form (with a logged warning
    via unknown_state_names()) if the name isn't in the known roster --
    this keeps the pipeline from crashing on a state/UT not yet seen.
    """
    raw = raw.strip()
    canonical = _ALIAS_TO_CANONICAL.get(_key(raw))
    if canonical:
        return canonical
    _unknown_seen.add(raw)
    return " ".join(word.capitalize() for word in re.split(r"[_\s]+", raw) if word)


def unknown_state_names() -> set:
    """State names encountered that weren't in the known roster (for QA)."""
    return set(_unknown_seen)
