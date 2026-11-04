"""Composite AQI calculation from per-pollutant sub-indices.

Mirrors src/components/common/Level.ts on the frontend -- the six category
boundaries here (LEVELS) must stay in lockstep with that file.
"""

from typing import Dict, Optional, Tuple

from config import MIN_POLLUTANTS_FOR_AQI, REQUIRED_ANY_OF
from cpcb_breakpoints import sub_index

# (key, label, max_aqi_inclusive) in ascending order
LEVELS = [
    ("good", "Good", 50),
    ("satisfactory", "Satisfactory", 100),
    ("moderate", "Moderate", 200),
    ("poor", "Poor", 300),
    ("very_poor", "Very Poor", 400),
    ("severe", "Severe", 500),
]


def get_level(aqi: float) -> str:
    for key, _label, max_aqi in LEVELS:
        if aqi <= max_aqi:
            return key
    return "severe"


def composite_aqi(
    concentrations: Dict[str, float],
) -> Tuple[Optional[int], Optional[str], Optional[str], Dict[str, float]]:
    """
    concentrations: pollutant -> daily-average concentration, already
    unit-converted and already restricted to pollutants that passed the
    MIN_READINGS_PER_DAY gate upstream.

    Returns (aqi, level, dominant_pollutant, sub_indices). All four are
    None/empty if the CPCB >=3-pollutants (incl. PM2.5 or PM10) rule isn't met.
    """
    sub_indices: Dict[str, float] = {}
    for pollutant, value in concentrations.items():
        if value is None:
            continue
        sub_indices[pollutant] = sub_index(pollutant, value)

    if len(sub_indices) < MIN_POLLUTANTS_FOR_AQI:
        return None, None, None, sub_indices
    if not (REQUIRED_ANY_OF & sub_indices.keys()):
        return None, None, None, sub_indices

    dominant_pollutant = max(sub_indices, key=sub_indices.get)
    aqi = sub_indices[dominant_pollutant]
    aqi_rounded = round(aqi)
    return aqi_rounded, get_level(aqi_rounded), dominant_pollutant, sub_indices
