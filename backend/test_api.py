"""The /api/v1 routes with the pipeline and the internet faked out. Run from the repo root:
    .venv/Scripts/python -m pytest -q backend
"""
import json

import pytest
import requests
from fastapi.testclient import TestClient

from backend.app import create_app
from backend.services import MapService, PlaceService, ReportService, Services
from backend.store.files import FileStore


def minimal_report(lat, lon, status=None):
    return {"location": {"lat": lat, "lon": lon}, "period": [2001, 2025], "factors": {},
            "data_status": status or {"power": "ok", "fires": "ok"}}


class FakeHttp:
    def __init__(self, payload=None, fail=False):
        self.payload, self.fail, self.calls = payload or {}, fail, []

    def get(self, url, params=None, **kw):
        self.calls.append((url, params))
        if self.fail:
            raise requests.ConnectionError("boom")
        payload = self.payload

        class R:
            def raise_for_status(self):
                pass

            def json(self):
                return payload
        return R()


def personalize(report, conds, ages):
    """A stand-in for pipeline.apply_household: records the household on the response only."""
    return {**report, "user": {"conditions": conds, "age_groups": ages}}


def client_with(build=None, http=None, field_dir=None, demos=()):
    store = FileStore(field_dir) if field_dir else FileStore()
    calls = []

    def default_build(lat, lon, period_years, sources, end_year=None):
        calls.append((lat, lon, period_years, sources) + ((end_year,) if end_year else ()))
        return minimal_report(lat, lon)
    svc = Services(store, ReportService(store, build or default_build, lambda la, lo: False, personalize),
                   PlaceService(store, http or FakeHttp()), MapService(store, list(demos)))
    return TestClient(create_app(svc), raise_server_exceptions=False), calls


def test_health_names_the_store():
    client, _ = client_with()
    assert client.get("/api/v1/health").json() == {"ok": True, "store": "files"}


def test_report_applies_the_household_per_request_rounds_the_point_and_hides_error_text():
    seen = []

    def build(lat, lon, period_years, sources):
        seen.append((lat, lon, period_years, sources))
        return minimal_report(lat, lon, {"power": "ok", "pm25": "not available: FileNotFoundError: C:\secret\path"})
    client, _ = client_with(build)
    r = client.post("/api/v1/reports", json={"lat": 33.4512, "lon": -112.0713,      # the household goes in the body (D38)
                                             "conditions": ["asthma_copd", "heart_disease"], "age_groups": ["under_5", "65_plus"]})
    assert r.status_code == 200
    lat, lon, period, sources = seen[0]
    assert (lat, lon, period) == (33.45, -112.07, 25)                # the build never sees the household
    assert r.json()["user"] == {"conditions": ["asthma_copd", "heart_disease"], "age_groups": ["under_5", "65_plus"]}
    assert "surface_heat" not in sources
    status = r.json()["data_status"]
    assert status["pm25"] == "not available"                        # no paths or exception names leak
    assert status["surface_heat"].startswith("not available")


def test_the_store_keeps_one_neutral_report_for_every_household():
    client, calls = client_with()
    for household in ({"conditions": ["asthma_copd"], "age_groups": ["under_5"]}, {"conditions": ["none"], "age_groups": ["65_plus"]}):
        r = client.post("/api/v1/reports", json={"lat": 33.45, "lon": -112.07, **household})
        assert r.status_code == 200
    assert len(calls) == 1                                          # second household reused the stored report
    store = client.app.state.services.store
    stored = [v for v in store._reports.values()]
    assert len(stored) == 1 and "user" not in stored[0]             # nothing about the household was stored


def test_a_complete_report_is_reused_and_an_incomplete_one_is_not():
    client, calls = client_with()
    for _ in range(2):
        assert client.get("/api/v1/reports", params={"lat": 33.45, "lon": -112.07}).status_code == 200
    assert len(calls) == 1                                          # second answer came from the store

    n = []

    def flaky(lat, lon, *a, **k):
        n.append(1)
        return minimal_report(lat, lon, {"power": "ok", "no2": "not available: timeout"})
    client, _ = client_with(flaky)
    for _ in range(2):
        client.get("/api/v1/reports", params={"lat": 40.0, "lon": -100.0})
    assert len(n) == 2


@pytest.mark.parametrize("params, status", [
    ({"lat": 21.03, "lon": 105.85}, 422),                           # outside the US
    ({"lat": 33.45, "lon": -112.07, "conditions": ["flu"]}, 400),
    ({"lat": 33.45, "lon": -112.07, "period": 7}, 400),
    ({"lat": 33.45, "lon": -112.07, "nickname": "x"}, 422),         # unknown body keys are refused
])
def test_bad_input_gets_one_error_shape(params, status):
    client, _ = client_with()
    r = client.post("/api/v1/reports", json=params)
    assert r.status_code == status
    assert r.json()["error"]["code"] == "invalid_input" and r.json()["error"]["message"]


def test_the_report_address_never_takes_the_household():
    client, _ = client_with()
    r = client.get("/api/v1/reports", params={"lat": 33.45, "lon": -112.07, "conditions": "asthma_copd", "age_groups": "under_5"})
    assert r.status_code == 200 and r.json()["user"] == {"conditions": ["none"], "age_groups": ["18_64"]}   # ignored (D38)


def test_a_nasa_outage_is_a_plain_502():
    def down(*a, **k):
        raise requests.ConnectionError("boom")
    client, _ = client_with(down)
    r = client.get("/api/v1/reports", params={"lat": 33.45, "lon": -112.07})
    assert r.status_code == 502
    assert r.json()["error"] == {"code": "upstream_unavailable",
                                 "message": "NASA POWER didn't answer. Try again in a minute, or pick a demo city."}


def test_a_crash_says_nothing_about_internals():
    def broken(*a, **k):
        raise KeyError("C:\\secret\\path")
    client, _ = client_with(broken)
    r = client.get("/api/v1/reports", params={"lat": 33.45, "lon": -112.07})
    assert r.status_code == 500 and "secret" not in r.text and r.json()["error"]["code"] == "internal"


def test_unknown_routes_use_the_error_shape():
    client, _ = client_with()
    r = client.get("/api/report")                                   # the old unversioned path is gone
    assert r.status_code == 404 and r.json()["error"]["code"] == "not_found"


def test_trend_field_served_missing_and_invalid(tmp_path):
    field = json.loads((FileStore().field_dir / "fires.json").read_text(encoding="utf-8"))
    (tmp_path / "pm25.json").write_text(json.dumps({**field, "factor": "pm25"}), encoding="utf-8")
    client, _ = client_with(field_dir=tmp_path)
    assert client.get("/api/v1/maps/pm25").json()["summary"]["cells"] == field["summary"]["cells"]
    r = client.get("/api/v1/maps/no2")
    assert r.status_code == 404 and r.json()["error"]["code"] == "not_built" and "tools.trend_field" in r.json()["error"]["message"]
    assert client.get("/api/v1/maps/secrets").json()["error"]["code"] == "invalid_input"
    (tmp_path / "aod.json").write_text(json.dumps({**field, "factor": "aod"}), encoding="utf-8")
    assert client.get("/api/v1/maps/aod").json()["factor"] == "aod"                    # haze and smoke have trend maps too
    assert client.get("/api/v1/maps/smoke_days").json()["error"]["code"] == "not_built"


def test_suggest_keeps_us_places_formats_labels_skips_short_input_and_caches():
    feats = [
        {"geometry": {"coordinates": [-116.2, 43.6]}, "properties": {"name": "Boise", "type": "city", "state": "Idaho", "countrycode": "US"}},
        {"geometry": {"coordinates": [-116.2, 43.6]}, "properties": {"name": "Boise Co-op", "type": "house", "city": "Boise", "state": "Idaho", "countrycode": "US"}},
        {"geometry": {"coordinates": [-115.7, 43.9]}, "properties": {"name": "Boise", "type": "county", "state": "Idaho", "countrycode": "US"}},
        {"geometry": {"coordinates": [-77.03, 38.89]}, "properties": {"name": "White House", "type": "house", "housenumber": "1600",
         "street": "Pennsylvania Avenue Northwest", "city": "Washington", "state": "District of Columbia", "countrycode": "US"}},
        {"geometry": {"coordinates": [2.35, 48.85]}, "properties": {"name": "Paris", "type": "city", "countrycode": "FR"}},
    ]
    http = FakeHttp({"features": feats})
    client, _ = client_with(http=http)
    body = client.get("/api/v1/places/suggest", params={"q": "  Boise  "}).json()
    assert [(s["name"], s["kind"]) for s in body] == [
        ("Boise, Idaho", "City"), ("Boise County, Idaho", "County"),
        ("White House, 1600 Pennsylvania Avenue Northwest, Washington, DC", "Address")]
    assert body[0]["main"] == "Boise" and body[0]["secondary"] == "Idaho"
    assert client.get("/api/v1/places/suggest", params={"q": "bo"}).json() == []      # too short: no request
    client.get("/api/v1/places/suggest", params={"q": "BOISE"})                       # stored, case-insensitive
    assert [p["q"] for _, p in http.calls] == ["boise"]


def test_search_and_its_outage():
    http = FakeHttp([{"display_name": "Phoenix, Maricopa County, Arizona", "lat": "33.45", "lon": "-112.07"}])
    client, _ = client_with(http=http)
    assert client.get("/api/v1/places/search", params={"q": "Phoenix"}).json() == [
        {"name": "Phoenix, Maricopa County, Arizona", "lat": 33.45, "lon": -112.07}]
    client, _ = client_with(http=FakeHttp(fail=True))
    r = client.get("/api/v1/places/search", params={"q": "Phoenix"})
    assert r.status_code == 502 and r.json()["error"]["code"] == "upstream_unavailable"


def test_demos_list_us_cities_with_household_lists():
    client, _ = client_with(demos=[("phoenix", 33.45, -112.07, "heart_disease", "65_plus")])
    assert client.get("/api/v1/demos").json() == [
        {"name": "phoenix", "lat": 33.45, "lon": -112.07, "conditions": ["heart_disease"], "age_groups": ["65_plus"]}]


# --- A2: state series and events ---------------------------------------------------------------------------------

STATES = {"WI": {"name": "Wisconsin", "bbox": [-92.9, 42.5, -86.8, 47.1]}, "TX": {"name": "Texas", "bbox": [-106.6, 25.8, -93.5, 36.5]}}
EVENTS = [
    {"id": "smoke", "title": "Smoke", "type": "smoke", "start": "2023-06-01", "end": "2023-06-30", "precision": "month",
     "states": ["WI"], "variables": ["pm25"], "summary": "s", "source": {"name": "n", "url": "https://example.org"}},
    {"id": "freeze", "title": "Freeze", "type": "cold", "start": "2021-02-12", "end": "2021-02-17", "precision": "day",
     "states": ["TX"], "variables": ["t2m"], "summary": "s", "source": {"name": "n", "url": "https://example.org"}},
]


def region_client(build=None):
    from backend.services import EventService, RegionService
    store, calls = FileStore(), []

    def default_build(code, variable, period):
        calls.append((code, variable, period))
        return {"region": {"code": code, "name": STATES[code]["name"], "kind": "state", "bbox": STATES[code]["bbox"]},
                "variable": variable, "period_years": period, "first_year_available": 1981,
                "factor": {"key": variable, "label": "x", "available": True}}
    svc = Services(store, None, None, None, RegionService(store, build or default_build, STATES),
                   EventService(EVENTS, lambda lat, lon: "TX" if lat < 37 else "WI"))
    return TestClient(create_app(svc), raise_server_exceptions=False), calls


def test_regions_list_states_variables_and_the_longer_period():
    c, _ = region_client()
    body = c.get("/api/v1/regions").json()
    assert [r["code"] for r in body["regions"]] == ["TX", "WI"]
    assert {"t2m", "precip", "pm25", "no2"} <= {v["key"] for v in body["variables"]}
    assert 45 in body["periods"]


def test_region_series_is_built_once_then_reused():
    c, calls = region_client()
    a = c.get("/api/v1/regions/wi/series", params={"variable": "t2m", "period": 45})
    b = c.get("/api/v1/regions/WI/series", params={"variable": "t2m", "period": 45})
    assert a.status_code == b.status_code == 200 and a.json()["region"]["name"] == "Wisconsin"
    assert calls == [("WI", "t2m", 45)]


@pytest.mark.parametrize("path, params, status", [
    ("/api/v1/regions/ZZ/series", {"variable": "t2m"}, 404),
    ("/api/v1/regions/WI/series", {"variable": "lava"}, 400),
    ("/api/v1/regions/WI/series", {"variable": "t2m", "period": 7}, 400),
    ("/api/v1/regions/WI/series", {"variable": "pm25", "period": 45}, 400),
])
def test_region_series_bad_input(path, params, status):
    c, calls = region_client()
    r = c.get(path, params=params)
    assert r.status_code == status and set(r.json()["error"]) == {"code", "message"} and not calls


def test_region_series_nasa_outage_is_a_plain_502():
    def down(code, variable, period):
        raise requests.ConnectionError("secret path")
    c, _ = region_client(down)
    r = c.get("/api/v1/regions/WI/series")
    assert r.status_code == 502 and "secret" not in r.text


def test_events_filter_by_state_point_years_and_variable():
    c, _ = region_client()
    assert [e["id"] for e in c.get("/api/v1/events", params={"region": "wi"}).json()["events"]] == ["smoke"]
    by_point = c.get("/api/v1/events", params={"lat": 30.3, "lon": -97.7}).json()
    assert by_point["region"] == "TX" and [e["id"] for e in by_point["events"]] == ["freeze"]
    assert c.get("/api/v1/events", params={"start": 2022}).json()["events"][0]["id"] == "smoke"
    assert c.get("/api/v1/events", params={"variable": "t2m"}).json()["events"][0]["id"] == "freeze"
    assert len(c.get("/api/v1/events").json()["events"]) == 2


def test_access_logs_never_hold_household_keys():
    import logging
    from backend.app import RedactHousehold
    rec = logging.LogRecord("uvicorn.access", logging.INFO, "", 0, '%s - "%s %s HTTP/%s" %d',
                            ("127.0.0.1:5", "GET", "/api/v1/reports?lat=1&conditions=asthma_copd,heart_disease&age_groups=under_5&period=25", "1.1", 200), None)
    assert RedactHousehold().filter(rec)
    assert "asthma" not in rec.getMessage() and "under_5" not in rec.getMessage()
    assert "lat=1" in rec.getMessage() and "period=25" in rec.getMessage()


def test_place_comparison_is_served_or_says_how_to_build_it(tmp_path):
    from backend.store.files import FileStore as FS
    store = FS(compare_path=tmp_path / "places_compare.json")
    svc = Services(store, None, None, MapService(store, []))
    c = TestClient(create_app(svc), raise_server_exceptions=False)
    r = c.get("/api/v1/places/compare")
    assert r.status_code == 404 and r.json()["error"]["code"] == "not_built"
    assert "cache-control" not in r.headers                    # an error is never kept by the browser
    city = {"name": "A", "state": "XX", "lat": 1, "lon": 2, "factors": {}}
    (tmp_path / "places_compare.json").write_text(json.dumps({"period": [2001, 2025], "cities": [city] * 40, "factors": []}))
    r = c.get("/api/v1/places/compare", headers={"Accept-Encoding": "gzip"})
    assert r.json()["period"] == [2001, 2025]
    assert r.headers["content-encoding"] == "gzip"              # built files are big and repetitive: sent compressed
    assert r.headers["cache-control"].startswith("public, max-age=300")
    assert "cache-control" not in c.get("/api/v1/health").headers   # per-request answers aren't marked


def test_weekly_validates_and_passes_through():
    from backend.services import WeeklyService
    calls = []

    def build(lat, lon, variable, year, period):
        calls.append((lat, lon, variable, year, period))
        return None if year == 2003 else {"variable": variable, "label": "Daily high", "unit": "°C", "about": "x", "year": year,
                                          "period": [2001, 2025], "location": {"lat": lat, "lon": lon}, "source": "s", "blocks": []}
    svc = Services(FileStore(), None, None, None, weekly=WeeklyService(build, ["t2m_max", "precip"]))
    c = TestClient(create_app(svc), raise_server_exceptions=False)
    assert c.get("/api/v1/weekly", params={"lat": 45.511, "lon": -122.68, "year": 2021}).json()["year"] == 2021
    assert calls[0] == (45.51, -122.68, "t2m_max", 2021, 25)
    assert c.get("/api/v1/weekly", params={"lat": 45.5, "lon": -122.7, "variable": "pm25"}).status_code == 400
    assert c.get("/api/v1/weekly", params={"lat": 45.5, "lon": -122.7, "year": 1990}).status_code == 400
    assert c.get("/api/v1/weekly", params={"lat": 45.5, "lon": -122.7, "year": 2003}).status_code == 404


@pytest.mark.parametrize("params, status", [
    ({"start": 2006, "end": 2015}, 200), ({"start": 2010, "end": 2015}, 400), ({"start": 2006}, 400), ({"start": 1990, "end": 2015}, 400),
])
def test_a_custom_period_is_checked_and_passed_on(params, status):
    client, calls = client_with()
    r = client.get("/api/v1/reports", params={"lat": 33.45, "lon": -112.07, **params})
    assert r.status_code == status
    if status == 200:
        assert calls[0][2] == 10 and calls[0][-1] == 2015 and "smoke" in calls[0][3]
    else:
        assert "8 years" in r.text or "between" in r.text or "both" in r.text


def test_a_state_custom_period_respects_the_variable_start():
    c, calls = region_client(lambda code, variable, period, end=None: {"region": {"code": code, "name": "W", "kind": "state", "bbox": [0, 0, 1, 1]},
                                                                       "variable": variable, "period_years": period, "first_year_available": 1981,
                                                                       "factor": {"key": variable, "label": "x", "available": True}})
    assert c.get("/api/v1/regions/WI/series", params={"variable": "t2m", "start": 1985, "end": 2000}).status_code == 200
    assert c.get("/api/v1/regions/WI/series", params={"variable": "pm25", "start": 1990, "end": 2000}).status_code == 400


def test_patterns_need_a_place_and_use_the_neutral_report(monkeypatch):
    import numpy as np
    from backend.services import PatternsService
    from sources import indices
    # CPC's Dec-Feb RONI, 2002-2025 (the real file is downloaded data, git-ignored)
    roni = dict(zip(range(2002, 2026), [-0.16, 0.85, 0.23, 0.54, -0.9, 0.6, -1.73, -0.96, 1.44, -1.42, -0.77, -0.55, -0.43,
                                        0.54, 2.14, -0.6, -1.08, 0.68, 0.14, -1.32, -1.18, -0.86, 1.13, -1.1]))
    monkeypatch.setattr(indices, "roni", lambda: roni)
    months = [f"{y}-{m:02d}" for y in range(2001, 2026) for m in range(1, 13)]
    rng = np.random.default_rng(0)
    base = rng.normal(0, 1, len(months))
    factor = lambda k, v: {"key": k, "label": k.title(), "available": True, "unit_short": "x",
                           "monthly": [{"month": m, "value": float(x)} for m, x in zip(months, v)]}
    rep = {"period": [2001, 2025], "factors": {"hot_days": factor("hot_days", base), "rain_sat": factor("rain_sat", -base + rng.normal(0, 0.3, len(base)))}}

    class Reports:
        def neutral(self, lat, lon, period):
            return rep
    svc = Services(FileStore(), None, None, None, patterns=PatternsService(Reports(), None))
    c = TestClient(create_app(svc), raise_server_exceptions=False)
    assert c.get("/api/v1/patterns").status_code == 400
    assert c.get("/api/v1/patterns", params={"lat": 33.45, "lon": -112.07, "period": 7}).status_code == 400
    body = c.get("/api/v1/patterns", params={"lat": 33.45, "lon": -112.07}).json()
    assert body["relations"][0]["clear"] and body["relations"][0]["r"] < -0.5
    assert body["relations"][0]["same_source"] is False and body["labels"]["hot_days"] == "Hot_Days"
    assert body["relations_tested"] == 7          # 1 pair: lag 0 once, lags 1-3 both ways
    assert {w["key"] for w in body["warnings"]} == {"hot_days", "rain_sat"}
    assert body["compound"][0]["id"] == "hot_dry"
    assert body["complete"] is True                # no data_status gaps: complete (L9)
    # El Nino and La Nina winters (D42): rain is a winter record, very hot days are not
    assert [r["key"] for r in body["winters"]["records"]] == ["rain_sat"]
    assert body["winters"]["first"] == 2002 and {p["phase"] for p in body["winters"]["records"][0]["phases"]} == {"el_nino", "la_nina"}
    monkeypatch.setattr(indices, "roni", lambda: {})          # no index file: the section is left out, nothing breaks
    assert c.get("/api/v1/patterns", params={"lat": 40.5, "lon": -100.5}).json()["winters"] is None
    rep["data_status"] = {"power": "ok", "no2": "not available"}
    body = c.get("/api/v1/patterns", params={"lat": 40.0, "lon": -100.0}).json()
    assert body["complete"] is False               # a source that didn't answer: the page says counts may change
    pair = c.get("/api/v1/patterns/pair", params={"lat": 33.45, "lon": -112.07, "a": "hot_days", "b": "rain_sat"}).json()
    assert pair["a"] == "hot_days" and len(pair["months"]) == 300 and set(pair["months"][0]) == {"month", "a", "b"}
    assert c.get("/api/v1/patterns/pair", params={"lat": 33.45, "lon": -112.07, "a": "hot_days", "b": "nope"}).status_code == 404


def photon(name, osm_value, typ, lon, lat, osm_key="place", **props):
    return {"geometry": {"coordinates": [lon, lat]},
            "properties": {"name": name, "osm_key": osm_key, "osm_value": osm_value, "type": typ, "countrycode": "US", **props}}


def test_suggestions_put_states_and_cities_first_and_drop_hamlets_when_better_places_match():
    from backend.services.places import rank
    feats = [photon("Texas", "state", "state", -99.0, 31.0, extent=[-106.6, 36.5, -93.5, 25.8]),
             photon("Texas", "county", "county", -101.5, 36.7, state="Oklahoma"),
             photon("Texas", "county", "county", -91.96, 37.3, state="Missouri"),
             photon("Texas", "hamlet", "district", -76.2, 43.5, city="Mexico", state="New York"),
             photon("Texas", "residential", "street", -97.3, 37.7, osm_key="highway", city="Wichita", state="Kansas"),
             photon("Texas Roadhouse", "restaurant", "house", -97.0, 32.0, osm_key="amenity", city="Dallas", state="Texas")]
    out = rank(feats, "texas", {"Texas": "TX", "Kansas": "KS", "New York": "NY", "Oklahoma": "OK", "Missouri": "MO"})
    assert [(o["name"], o["kind"]) for o in out] == [("Texas", "State"), ("Texas County, Oklahoma", "County"),
                                                      ("Texas County, Missouri", "County"), ("Texas, Wichita, KS", "Street")]
    assert out[0]["region"] == "TX" and out[0]["extent"] == [-106.6, 25.8, -93.5, 36.5] and out[0]["secondary"] == "United States"
    alone = rank([feats[3]], "texas", {"New York": "NY"})                     # nothing better: the hamlet is shown
    assert alone[0]["kind"] == "Small place" and alone[0]["name"] == "Texas, Mexico, NY"
    homes = rank([photon("Penn Academy", "school", "house", -79.9, 40.8, osm_key="amenity", housenumber="199", street="Airport Road", state="Pennsylvania"),
                  photon("1600", "yes", "house", -76.98, 38.88, osm_key="building", housenumber="1600", street="Pennsylvania Avenue Southeast", city="Washington", state="District of Columbia")],
                 "1600 penn", {"District of Columbia": "DC", "Pennsylvania": "PA"})
    assert [(h["main"], h["kind"]) for h in homes] == [("1600 Pennsylvania Avenue Southeast", "Address")]     # the school is a landmark


def test_zip_codes_are_looked_up_as_postcodes():
    http = FakeHttp({"features": [photon("98101", "postcode", "other", -122.33, 47.61, city="Seattle", state="Washington")]})
    client, _ = client_with(http=http)
    body = client.get("/api/v1/places/suggest", params={"q": "98101"}).json()
    assert body[0]["kind"] == "ZIP code" and body[0]["name"] == "98101, Seattle, WA"
    assert http.calls[-1][1]["osm_tag"] == "place:postcode" and http.calls[-1][1]["q"] == "98101"
    client.get("/api/v1/places/suggest", params={"q": "98101-1234"})            # ZIP+4: the first five digits
    assert http.calls[-1][1]["q"] == "98101"


def test_a_spot_picked_on_the_map_gets_a_name_or_says_it_is_outside_the_us():
    http = FakeHttp({"features": [photon("Spokane", "city", "city", -117.43, 47.66, state="Washington")]})
    client, _ = client_with(http=http)
    spot = client.get("/api/v1/places/reverse", params={"lat": 47.6601, "lon": -117.4302}).json()
    assert spot["kind"] == "Picked spot" and spot["name"] == "Spokane, Washington" and spot["lat"] == 47.6601
    client, _ = client_with(http=FakeHttp({"features": [photon("Federal Courthouse", "courthouse", "house", -117.426, 47.659, osm_key="amenity",
                                                                housenumber="920", street="West Main Avenue", city="Spokane", state="Washington")]}))
    assert client.get("/api/v1/places/reverse", params={"lat": 47.659, "lon": -117.426}).json()["name"] == "920 West Main Avenue, Spokane, WA"
    client, _ = client_with(http=FakeHttp({"features": [{"geometry": {"coordinates": [-110, 50]},
                                                        "properties": {"name": "Alberta", "countrycode": "CA"}}]}))
    assert client.get("/api/v1/places/reverse", params={"lat": 49.5, "lon": -110}).status_code == 400
    client, _ = client_with(http=FakeHttp({"features": [photon("232nd Avenue", "residential", "street", -101.47, 44.14, osm_key="highway",
                                                                county="Haakon", state="South Dakota")]}))
    assert client.get("/api/v1/places/reverse", params={"lat": 44.138, "lon": -101.468}).json()["name"] == "232nd Avenue, Haakon County, SD"
    client, _ = client_with(http=FakeHttp(fail=True))                           # no name service: still a pin
    assert client.get("/api/v1/places/reverse", params={"lat": 40.0, "lon": -100.0}).json()["main"] == "Picked spot"


def test_a_state_outline_is_served_for_the_map():
    from backend.services import RegionService
    svc = Services(FileStore(), None, None, None, regions=RegionService(FileStore(), None, {"TX": {"name": "Texas", "bbox": [-106.6, 25.8, -93.5, 36.5], "rings": [[[-106.6, 31.8], [-93.5, 30.0], [-97.0, 25.8], [-106.6, 31.8]]]}}))
    c = TestClient(create_app(svc))
    body = c.get("/api/v1/regions/tx/outline").json()
    assert body["code"] == "TX" and body["rings"][0][0] == [-106.6, 31.8]
    assert c.get("/api/v1/regions/ZZ/outline").status_code == 404


def test_map_frames_are_served_from_their_files_or_say_how_to_build_them(tmp_path):
    import json as _json
    (tmp_path / "smoke_days.json").write_text(_json.dumps({
        "factor": "smoke_days", "label": "Smoke days", "unit": "days", "grid": {"lats": [40.0], "lons": [-100.0], "dlat": 0.5, "dlon": 0.625},
        "years": [2006, 2007], "span": 1, "base_years": [2006, 2007], "level_breaks": [10.0, 20.0], "change_breaks": [1.0, 2.0, 5.0, 10.0],
        "values": [[5], [None]], "change": [[0], [None]], "us_mean": [5.0, None], "us_change": [0.0, None]}), encoding="utf-8")
    store = FileStore()
    c = TestClient(create_app(Services(store, None, None, MapService(store, [], frames_dir=tmp_path))))
    body = c.get("/api/v1/maps/smoke_days/frames").json()
    assert body["years"] == [2006, 2007] and body["values"][1] == [None] and body["change"][0] == [0]
    r = c.get("/api/v1/maps/aod/frames")
    assert r.status_code == 404 and r.json()["error"]["code"] == "not_built"
    assert c.get("/api/v1/maps/secrets/frames").status_code in (400, 422)


def test_north_america_frames_carry_their_area_and_what_the_line_averages(tmp_path):
    import json as _json
    (tmp_path / "sst.json").write_text(_json.dumps({
        "factor": "sst", "label": "Sea temperature", "unit": "°C", "grid": {"lats": [25.0], "lons": [-90.0], "dlat": 0.5, "dlon": 0.5},
        "years": [2001], "span": 1, "base_years": [2001, 2001], "level_breaks": [20.0], "change_breaks": [0.1, 0.2, 0.5, 1.0],
        "values": [[26.0]], "change": [[0.0]], "us_mean": [26.0], "us_change": [0.0],
        "area": "North America", "mean_area": "the Gulf of Mexico", "coverage": "Sea only."}), encoding="utf-8")
    store = FileStore()
    c = TestClient(create_app(Services(store, None, None, MapService(store, [], frames_dir=tmp_path))))
    body = c.get("/api/v1/maps/sst/frames").json()
    assert body["area"] == "North America" and body["mean_area"] == "the Gulf of Mexico" and body["coverage"]
    assert c.get("/api/v1/maps/sst").status_code == 422          # no trend field for the North America records



def test_the_lower_48_outline_joins_every_contiguous_state_for_the_map_mask():
    from backend.services import RegionService
    ring = lambda w, s, e, n: [[[w, s], [e, s], [e, n], [w, s]]]
    states = {"TX": {"name": "Texas", "bbox": [-106.6, 25.8, -93.5, 36.5], "rings": ring(-106.6, 25.8, -93.5, 36.5)},
              "WI": {"name": "Wisconsin", "bbox": [-92.9, 42.5, -86.8, 47.1], "rings": ring(-92.9, 42.5, -86.8, 47.1)},
              "AK": {"name": "Alaska", "bbox": [-170, 52, -130, 71], "rings": ring(-170, 52, -130, 71)},
              "PR": {"name": "Puerto Rico", "bbox": [-67.3, 17.9, -65.6, 18.5], "rings": ring(-67.3, 17.9, -65.6, 18.5)}}
    c = TestClient(create_app(Services(FileStore(), None, None, None, regions=RegionService(FileStore(), None, states))))
    body = c.get("/api/v1/regions/L48/outline").json()
    assert body["code"] == "L48" and len(body["rings"]) == 2                     # Texas and Wisconsin, not Alaska or Puerto Rico
    assert body["bbox"] == [-106.6, 25.8, -86.8, 47.1]
