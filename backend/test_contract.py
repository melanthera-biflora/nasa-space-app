"""The API contract: the OpenAPI document matches the reviewed copy, and real data fits the response models."""
import json
from pathlib import Path

import pytest

from backend.export_openapi import CONTRACT, current
from backend.schemas import Report, TrendField
from paths import DEMO_DIR


def test_openapi_matches_the_reviewed_contract():
    assert current() == json.loads(CONTRACT.read_text(encoding="utf-8")), \
        "The API changed. Run `python -m backend.export_openapi`, review the diff of backend/openapi.v1.json, commit both."


@pytest.mark.parametrize("path", sorted(Path(DEMO_DIR).glob("*_*y.json")), ids=lambda p: p.stem)
def test_saved_demo_reports_fit_the_report_model(path):
    Report.model_validate_json(path.read_text(encoding="utf-8"))


@pytest.mark.parametrize("path", sorted((Path(DEMO_DIR) / "trend_fields").glob("*.json")), ids=lambda p: p.stem)
def test_map_fields_fit_the_trend_field_model(path):
    TrendField.model_validate_json(path.read_text(encoding="utf-8"))


def test_the_event_list_fits_the_event_model():
    from backend.schemas import EventList
    from paths import load_json
    events = load_json("events.json")["events"]
    assert len(EventList.model_validate({"events": events}).events) == len(events)
    assert len({e["id"] for e in events}) == len(events)


def test_the_place_comparison_fits_its_model():
    from backend.schemas import CompareTable
    path = Path(DEMO_DIR) / "places_compare.json"
    table = CompareTable.model_validate(json.loads(path.read_text(encoding="utf-8")))
    assert len(table.cities) >= 50 and {f.key for f in table.factors} >= {"hot_days", "warm_nights", "pm25"}
