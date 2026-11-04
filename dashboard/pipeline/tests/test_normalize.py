from pathlib import Path

import pytest

from io_utils import SkipLogger, iter_records, safe_load_json
from normalize import normalize_record

FIXTURES = Path(__file__).parent / "fixtures"


def test_old_schema_field_names_and_state_alias():
    data = safe_load_json(FIXTURES / "old_schema_sample.json")
    records = data["records"]

    co_record = normalize_record(records[0])
    assert co_record.state == "Andhra Pradesh"  # from 'Andhra_Pradesh'
    assert co_record.pollutant_id == "CO"
    # 38 ug/m3 -> 0.038 mg/m3
    assert co_record.avg_value == pytest.approx(0.038)
    assert co_record.min_value == pytest.approx(0.023)
    assert co_record.max_value == pytest.approx(0.1)


def test_na_values_become_none_not_zero():
    data = safe_load_json(FIXTURES / "old_schema_sample.json")
    nh3_record = normalize_record(data["records"][1])
    assert nh3_record.avg_value is None
    assert nh3_record.min_value is None
    assert nh3_record.max_value is None


def test_no_separator_state_variant():
    data = safe_load_json(FIXTURES / "old_schema_sample.json")
    tn_record = normalize_record(data["records"][2])
    assert tn_record.state == "Tamil Nadu"  # from 'TamilNadu'
    assert tn_record.avg_value == pytest.approx(32.0)  # PM2.5, no unit change


def test_new_schema_field_names():
    data = safe_load_json(FIXTURES / "new_schema_sample.json")
    so2_record = normalize_record(data["records"][0])
    assert so2_record.state == "Bihar"
    assert so2_record.pollutant_id == "SO2"
    assert so2_record.avg_value == pytest.approx(3.0)


def test_new_schema_co_conversion_and_spaced_state_name():
    data = safe_load_json(FIXTURES / "new_schema_sample.json")
    co_record = normalize_record(data["records"][1])
    assert co_record.state == "Tamil Nadu"
    # 2000 ug/m3 -> 2.0 mg/m3
    assert co_record.avg_value == pytest.approx(2.0)


def test_new_schema_na_values():
    data = safe_load_json(FIXTURES / "new_schema_sample.json")
    pm10_record = normalize_record(data["records"][2])
    assert pm10_record.avg_value is None


def test_station_and_city_ids_are_stable_and_state_prefixed():
    data = safe_load_json(FIXTURES / "new_schema_sample.json")
    r1 = normalize_record(data["records"][1])  # Tamil Nadu / Chennai
    assert r1.city_id == "tamil-nadu__chennai"
    assert r1.station_id.startswith("tamil-nadu__chennai__")


def test_zero_byte_file_is_skipped_not_crashed():
    assert safe_load_json(FIXTURES / "corrupt_empty.json") is None

    logger = SkipLogger()
    records = list(iter_records(FIXTURES / "corrupt_empty.json", logger))
    assert records == []
    assert logger.count() == 1


def test_truncated_json_file_is_skipped_not_crashed():
    assert safe_load_json(FIXTURES / "corrupt_truncated.json") is None

    logger = SkipLogger()
    records = list(iter_records(FIXTURES / "corrupt_truncated.json", logger))
    assert records == []
    assert logger.count() == 1
