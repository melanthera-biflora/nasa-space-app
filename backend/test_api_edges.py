"""Tampered input on every /api/v1 route that takes any, and the household's privacy at the edges. Like test_api.py,
nothing here touches NASA, Photon, Nominatim or a database: every build and lookup is faked and records its calls.
    .venv/Scripts/python -m pytest -q backend/test_api_edges.py
"""
import json
import logging

import pytest
from fastapi.testclient import TestClient

from backend.app import RedactHousehold, create_app
from backend.services import (EventService, MapService, PatternsService, PlaceService, RegionService, ReportService,
                              Services, WeeklyService)
from backend.store.files import FileStore
from backend.test_api import EVENTS, FakeHttp, minimal_report, personalize

STATES = {"WI": {"name": "Wisconsin", "bbox": [-92.9, 42.5, -86.8, 47.1], "rings": [[[-92.9, 42.5], [-86.8, 42.5], [-86.8, 47.1], [-92.9, 42.5]]]},
          "TX": {"name": "Texas", "bbox": [-106.6, 25.8, -93.5, 36.5], "rings": [[[-106.6, 31.8], [-93.5, 30.0], [-97.0, 25.8], [-106.6, 31.8]]]}}
HOUSEHOLD = {"conditions": "kidney_disease,asthma_copd", "age_groups": "under_5,65_plus"}
SECRETS = ("kidney", "asthma", "under_5", "65_plus")
INTERNALS = ("Traceback", 'File "', ".py", "C:\\", "site-packages", "secret")


class RecordingStore(FileStore):
    """The file store, plus a list of everything written as a report."""
    def __init__(self):
        super().__init__()
        self.writes = []

    def put_report(self, key, params, report):
        self.writes.append((key, params, report))
        super().put_report(key, params, report)


def make_client(crash=False):
    """Every service at once, with fakes that record whether tampered input ever got past the edge."""
    store, calls = RecordingStore(), []

    def build(lat, lon, period_years, sources, end_year=None):
        calls.append(("report", lat, lon))
        if crash:
            raise KeyError("C:\\secret\\pipeline.py")
        return minimal_report(lat, lon)

    def build_region(code, variable, period, end=None):
        calls.append(("region", code, variable))
        if crash:
            raise KeyError("C:\\secret\\power_region.py")
        return {"region": {"code": code, "name": STATES[code]["name"], "kind": "state", "bbox": STATES[code]["bbox"]},
                "variable": variable, "period_years": period, "first_year_available": 1981,
                "factor": {"key": variable, "label": "x", "available": True}}

    def build_weekly(lat, lon, variable, year, period):
        calls.append(("weekly", lat, lon))
        if crash:
            raise KeyError("C:\\secret\\weekly.py")
        return None

    http = FakeHttp({"features": []})
    reports = ReportService(store, build, lambda la, lo: False, personalize)
    regions = RegionService(store, build_region, STATES)
    svc = Services(store, reports, PlaceService(store, http), MapService(store, []), regions=regions,
                   events=EventService(EVENTS, lambda lat, lon: "TX", STATES), weekly=WeeklyService(build_weekly, ["t2m_max"]),
                   patterns=PatternsService(reports, regions))
    client = TestClient(create_app(svc), raise_server_exceptions=False)
    return client, calls, http, store


def assert_plain_error(r, status, code):
    assert r.status_code == status, r.text
    body = r.json()
    assert set(body) == {"error"} and set(body["error"]) == {"code", "message"}
    assert body["error"]["code"] == code
    message = body["error"]["message"]
    assert isinstance(message, str) and message.strip()
    assert not any(bit in r.text for bit in INTERNALS), r.text


P = {"lat": 43.07, "lon": -89.4}      # a valid US point to tamper around
HOUSEHOLD_BODY = {"conditions": ["kidney_disease", "asthma_copd"], "age_groups": ["under_5", "65_plus"]}   # POST /reports (D38)

TAMPERED = [
    # /reports: the point
    ("/api/v1/reports", {"lon": -89.4}, 422),
    ("/api/v1/reports", {"lat": "abc", "lon": -89.4}, 422),
    ("/api/v1/reports", {"lat": "nan", "lon": -89.4}, 422),
    ("/api/v1/reports", {"lat": 43.07, "lon": "inf"}, 422),
    ("/api/v1/reports", {"lat": 17.99, "lon": -89.4}, 422),
    ("/api/v1/reports", {"lat": 72.01, "lon": -150.0}, 422),
    ("/api/v1/reports", {"lat": 43.07, "lon": -64.99}, 422),
    ("/api/v1/reports", {"lat": 43.07, "lon": -180.01}, 422),
    ("/api/v1/reports", {"lat": 51.5, "lon": 0.12}, 422),                              # London
    # /reports: the period
    ("/api/v1/reports", {**P, "period": 30}, 400),
    ("/api/v1/reports", {**P, "period": 45}, 400),                                     # 45 years is for states only
    ("/api/v1/reports", {**P, "period": "25.5"}, 422),
    ("/api/v1/reports", {**P, "start": 2015, "end": 2006}, 400),                       # reversed
    ("/api/v1/reports", {**P, "start": 2006, "end": 2026}, 400),                       # beyond the data
    ("/api/v1/reports", {**P, "start": 1995, "end": 2010}, 400),                       # before the data
    ("/api/v1/reports", {**P, "end": 2015}, 400),                                      # end without start
    # /places
    ("/api/v1/places/search", {"q": "a"}, 422),
    ("/api/v1/places/search", {"q": "x" * 201}, 422),
    ("/api/v1/places/suggest", {}, 422),
    ("/api/v1/places/suggest", {"q": "x" * 201}, 422),
    ("/api/v1/places/reverse", {"lat": 10.0, "lon": -100.0}, 422),
    ("/api/v1/places/reverse", {"lat": 48.85, "lon": 2.35}, 422),                       # Paris
    ("/api/v1/places/reverse", {"lat": 40.0}, 422),
    # /maps: factors are an allowlist, per route
    ("/api/v1/maps/secrets/frames", {}, 422),
    ("/api/v1/maps/PM25/frames", {}, 422),
    ("/api/v1/maps/rain_sat", {}, 422),                                                # a report factor, not a map
    ("/api/v1/maps/..%2F..%2Fsettings", {}, 404),                                     # traversal never matches a route
    # /regions
    ("/api/v1/regions/ZZ/outline", {}, 404),
    ("/api/v1/regions/wisconsin/outline", {}, 404),
    ("/api/v1/regions/zz/series", {"variable": "t2m"}, 404),
    ("/api/v1/regions/WI/series", {"variable": "t2m", "start": 2010, "end": 2005}, 400),
    ("/api/v1/regions/WI/series", {"variable": "t2m", "start": 2006, "end": 2026}, 400),
    ("/api/v1/regions/WI/series", {"variable": "t2m", "end": 2020}, 400),
    ("/api/v1/regions/WI/series", {"variable": "no2", "period": 45}, 400),
    ("/api/v1/regions/WI/series", {"variable": "no2", "start": 2001, "end": 2015}, 400),   # NO₂ starts in 2005
    # /events
    ("/api/v1/events", {"region": "WIS"}, 422),
    ("/api/v1/events", {"lat": 10.0, "lon": -100.0}, 422),
    ("/api/v1/events", {"start": 1900}, 422),
    ("/api/v1/events", {"end": 2101}, 422),
    # /weekly
    ("/api/v1/weekly", {**P, "year": 2026}, 400),
    ("/api/v1/weekly", {**P, "year": 2000}, 400),
    ("/api/v1/weekly", {**P, "period": 45}, 400),
    ("/api/v1/weekly", {**P, "year": "last"}, 422),
    ("/api/v1/weekly", {"lat": 10.0, "lon": -100.0}, 422),
    # /patterns
    ("/api/v1/patterns", {}, 400),
    ("/api/v1/patterns", {"lat": 43.07}, 400),
    ("/api/v1/patterns", {**P, "period": 7}, 400),
    ("/api/v1/patterns", {"region": "W"}, 422),
    ("/api/v1/patterns", {"region": "ZZ"}, 404),
    ("/api/v1/patterns", {"lat": 10.0, "lon": -100.0}, 422),
    ("/api/v1/patterns/pair", {**P, "b": "rain_sat"}, 422),                             # a missing
    ("/api/v1/patterns/pair", {**P, "a": "HOT_DAYS", "b": "rain_sat"}, 422),
    ("/api/v1/patterns/pair", {**P, "a": "hot_days;drop", "b": "rain_sat"}, 422),
    ("/api/v1/patterns/pair", {**P, "a": "x" * 41, "b": "rain_sat"}, 422),
    ("/api/v1/patterns/pair", {"a": "t2m", "b": "precip"}, 400),                        # no place
    ("/api/v1/patterns/pair", {"region": "ZZ", "a": "t2m", "b": "precip"}, 404),
    ("/api/v1/patterns/pair", {"region": "WI", "a": "hot_days", "b": "precip"}, 400),   # not a state record
]
CODES = {400: "invalid_input", 422: "invalid_input", 404: "not_found"}


@pytest.mark.parametrize("body", [{**P, "conditions": ["ASTHMA_COPD"]}, {**P, "age_groups": ["seniors"]},
                                  {**P, "conditions": ["asthma_copd"] * 11}, {**P, "conditions": "asthma_copd"}])
def test_the_household_keys_are_an_allowlist_case_and_all(body):
    client, calls, _, _ = make_client()
    r = client.post("/api/v1/reports", json=body)
    assert r.status_code in (400, 422) and set(r.json()["error"]) == {"code", "message"} and not calls


@pytest.mark.parametrize("path, params, status", TAMPERED)
def test_tampered_input_gets_one_plain_error_and_never_reaches_nasa_or_the_geocoder(path, params, status):
    client, calls, http, store = make_client()
    r = client.get(path, params=params)
    assert_plain_error(r, status, CODES[status])
    assert calls == [] and http.calls == [] and store.writes == []


@pytest.mark.parametrize("params", [
    {"lat": 18.0, "lon": -155.0}, {"lat": 72.0, "lon": -156.8}, {"lat": 40.0, "lon": -65.0}, {"lat": 52.0, "lon": -180.0},
    {"lat": 21.31, "lon": -157.86},          # Honolulu
    {"lat": 61.22, "lon": -149.9},           # Anchorage
    {"lat": 43.07, "lon": -89.4, "start": 2018, "end": 2025},     # exactly 8 years
])
def test_the_edges_of_the_us_box_and_the_shortest_period_are_accepted(params):
    client, calls, _, _ = make_client()
    assert client.get("/api/v1/reports", params=params).status_code == 200
    assert len(calls) == 1


def test_a_lower_case_state_code_is_read_as_upper_case():
    client, calls, _, _ = make_client()
    assert client.get("/api/v1/regions/wi/outline").json()["code"] == "WI"
    client.get("/api/v1/patterns/pair", params={"region": "wi", "a": "t2m", "b": "precip"})
    assert ("region", "WI", "t2m") in calls


@pytest.mark.parametrize("path, params", [
    ("/api/v1/reports", P),
    ("/api/v1/regions/WI/series", {"variable": "t2m"}),
    ("/api/v1/weekly", P),
])
def test_a_crash_inside_any_service_is_a_plain_500(path, params):
    client, _, _, _ = make_client(crash=True)
    assert_plain_error(client.get(path, params=params), 500, "internal")


def test_a_wrong_method_and_an_unknown_v1_path_keep_the_error_shape():
    client, _, _, _ = make_client()
    r = client.put("/api/v1/reports", params=P)
    assert r.status_code == 405 and set(r.json()["error"]) == {"code", "message"}
    assert_plain_error(client.get("/api/v1/reports/../../.env"), 404, "not_found")


# --- privacy: the household ---------------------------------------------------------------------------------------

def test_nothing_written_to_the_store_holds_the_household_not_even_the_key():
    client, _, _, store = make_client()
    r = client.post("/api/v1/reports", json={**P, **HOUSEHOLD_BODY})
    assert r.status_code == 200 and r.json()["user"]["conditions"] == ["kidney_disease", "asthma_copd"]
    assert len(store.writes) == 1
    written = json.dumps(store.writes[0], default=str)
    assert not any(s in written for s in SECRETS)


@pytest.mark.parametrize("params, status", [
    ({**P, **HOUSEHOLD_BODY}, 200),
    ({**P, **HOUSEHOLD_BODY, "period": 7}, 400),
    ({"lat": 99.0, "lon": -89.4, **HOUSEHOLD_BODY}, 422),
])
def test_response_headers_never_carry_the_household(params, status):
    client, _, _, _ = make_client()
    r = client.post("/api/v1/reports", json=params)
    assert r.status_code == status
    headers = " ".join(f"{k}: {v}" for k, v in r.headers.items())
    assert not any(s in headers for s in SECRETS)


@pytest.mark.parametrize("params, crash, status", [
    ({**P, **HOUSEHOLD_BODY, "period": 7}, False, 400),
    ({**P, **HOUSEHOLD_BODY, "start": 2015, "end": 2006}, False, 400),
    ({"lat": 99.0, "lon": -89.4, **HOUSEHOLD_BODY}, False, 422),
    ({**P, **HOUSEHOLD_BODY}, True, 500),
])
def test_an_error_about_something_else_never_echoes_the_household(params, crash, status):
    client, _, _, _ = make_client(crash=crash)
    r = client.post("/api/v1/reports", json=params)
    assert r.status_code == status
    assert not any(s in r.text for s in SECRETS)


def access_line(path):
    rec = logging.LogRecord("uvicorn.access", logging.INFO, "", 0, '%s - "%s %s HTTP/%s" %d', ("127.0.0.1:5", "GET", path, "1.1", 200), None)
    assert RedactHousehold().filter(rec) is True
    return rec.getMessage()


@pytest.mark.parametrize("path", [
    "/api/v1/reports?conditions=asthma_copd&lat=1&conditions=heart_disease&age_groups=under_5&age_groups=65_plus",   # repeated keys
    "/api/v1/reports?lat=1&conditions=asthma_copd%2Cheart_disease&age_groups=under_5%2C65_plus",                   # encoded commas
    "/api/v1/reports?age_groups=65_plus&conditions=asthma_copd",                                                   # first in the query
    "/api/v1/reports?lat=1&lon=-100&%63onditions=asthma_copd&age%5Fgroups=under_5,65_plus",                       # percent-encoded keys
])
def test_the_access_log_hides_every_household_value(path):
    line = access_line(path)
    assert "asthma" not in line and "heart" not in line and "under_5" not in line and "65_plus" not in line
    assert "conditions=[hidden]" in line and "age_groups=[hidden]" in line


def test_the_access_log_keeps_the_rest_of_the_line_and_leaves_lookalike_keys_alone():
    line = access_line("/api/v1/reports?lat=43.07&lon=-89.4&preconditions=x&conditions=&period=25")
    assert "lat=43.07&lon=-89.4" in line and "period=25" in line and "preconditions=x" in line
    assert "conditions=[hidden]" in line


def test_the_access_log_filter_lets_other_log_records_through_untouched():
    rec = logging.LogRecord("uvicorn.access", logging.INFO, "", 0, "started %s", ("conditions=asthma_copd",), None)
    assert RedactHousehold().filter(rec) is True and rec.args == ("conditions=asthma_copd",)
    plain = logging.LogRecord("uvicorn.access", logging.INFO, "", 0, "no args", None, None)
    assert RedactHousehold().filter(plain) is True


@pytest.mark.parametrize("path, params, words", [
    ("/api/v1/reports", {"lat": 99.0, "lon": -89.4}, "Pick a place in the United States."),
    ("/api/v1/reports", {**P, "period": "25.5"}, "Pick a period"),
    ("/api/v1/maps/secrets/frames", {}, "isn't one we have"),
])
def test_input_errors_are_plain_sentences_not_validator_text(path, params, words):
    client, _, _, _ = make_client()
    message = client.get(path, params=params).json()["error"]["message"]
    assert words in message and "Input should" not in message and ":" not in message


def test_an_unknown_state_on_events_is_not_found_like_everywhere_else():
    client, _, _, _ = make_client()
    assert_plain_error(client.get("/api/v1/events", params={"region": "ZZ"}), 404, "not_found")


def test_two_visitors_asking_for_the_same_new_place_build_it_once():
    """Builds run one at a time (BUILD_SLOT, for a 512 MB server); the visitor who waited gets the stored copy."""
    import threading
    import time
    from backend.services import ReportService
    from backend.store.files import FileStore
    builds = []

    def build(lat, lon, period_years=None, sources=(), **kw):
        builds.append((lat, lon))
        time.sleep(0.2)
        return {"data_status": {"power": "ok"}, "factors": {}}

    svc = ReportService(FileStore(), build, lambda la, lo: False)
    out = []
    threads = [threading.Thread(target=lambda: out.append(svc.neutral(40.0, -100.0))) for _ in range(2)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert builds == [(40.0, -100.0)] and len(out) == 2
