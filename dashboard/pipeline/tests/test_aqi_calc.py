import pytest

from aqi_calc import composite_aqi, get_level
from cpcb_breakpoints import sub_index
from config import SEVERE_CAP


def test_pm25_cpcb_published_example():
    # CPCB's own published worked example: PM2.5 45 ug/m3 -> sub-index 75.
    assert sub_index("PM2.5", 45) == pytest.approx(74.655, abs=0.01)
    assert round(sub_index("PM2.5", 45)) == 75


def test_band_boundary_is_continuous():
    assert sub_index("PM2.5", 30) == pytest.approx(50.0)


def test_gap_between_bands_does_not_crash():
    # 30.5 falls in the gap between CPCB's published 0-30 and 31-60 bands.
    # Membership snaps to the next band; result should stay just above 50,
    # not raise and not jump discontinuously.
    value = sub_index("PM2.5", 30.5)
    assert 50.0 <= value < 51.0


def test_severe_band_is_capped():
    assert sub_index("PM2.5", 999) == SEVERE_CAP
    assert sub_index("CO", 100) == SEVERE_CAP  # 100 mg/m3, absurdly high


def test_co_unit_conversion_boundary():
    # Raw 2000 ug/m3 -> 2.0 mg/m3 -> exactly the 51-100 band's upper edge.
    assert sub_index("CO", 2.0) == pytest.approx(100.0)


def test_composite_aqi_picks_max_as_dominant():
    concentrations = {"PM2.5": 45, "PM10": 20, "NO2": 10}
    aqi, level, dominant, sub_indices = composite_aqi(concentrations)
    assert dominant == "PM2.5"
    assert aqi == 75
    assert level == "satisfactory"
    assert sub_indices["PM2.5"] > sub_indices["PM10"] > sub_indices["NO2"]


def test_composite_aqi_requires_min_pollutants():
    # Only 2 pollutants -- below MIN_POLLUTANTS_FOR_AQI (3).
    aqi, level, dominant, _ = composite_aqi({"PM2.5": 45, "PM10": 20})
    assert aqi is None
    assert level is None
    assert dominant is None


def test_composite_aqi_requires_pm25_or_pm10():
    # 3 pollutants, but none of them PM2.5/PM10.
    aqi, level, dominant, _ = composite_aqi({"NO2": 10, "SO2": 10, "NH3": 10})
    assert aqi is None


def test_get_level_boundaries():
    assert get_level(0) == "good"
    assert get_level(50) == "good"
    assert get_level(51) == "satisfactory"
    assert get_level(500) == "severe"
    assert get_level(1000) == "severe"
