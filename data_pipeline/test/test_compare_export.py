"""The place-comparison table (tools/compare_export.py)."""
import pytest

from tools import compare_export as ce


def fake_report(now, p, slope=1.0, available=True):
    pts = [{"year": y, "value": float(y - 2000)} for y in range(2001, 2026)]
    return {"factors": {"hot_days": {"available": available, "now": now, "then": now - 5, "slope_per_decade": slope,
                                     "mk_p": p, "level": "caution", "trend_direction": "worsening", "points": pts}}}


def test_city_row_keeps_level_trend_and_the_last_five_years():
    row = ce.city_row("Phoenix", 33.45, -112.07, fake_report(141.4, 0.18), factors=("hot_days", "pm25"))
    f = row["factors"]["hot_days"]
    assert row["state"] == "AZ" and "pm25" not in row["factors"]
    assert f["now"] == 141.4 and f["p"] == 0.18
    assert [x["year"] for x in f["last5"]] == [2021, 2022, 2023, 2024, 2025]


def test_a_missing_factor_is_left_out():
    row = ce.city_row("X", 1, 2, fake_report(1, 0.5, available=False), factors=("hot_days",))
    assert row["factors"] == {}


def test_bh_across_cities_is_stricter_than_each_city_alone():
    rows = [ce.city_row(f"C{i}", 0, 0, fake_report(10, p), factors=("hot_days",)) for i, p in enumerate([0.001, 0.04, 0.3, 0.6, 0.9])]
    ce.add_bh(rows)
    cells = [r["factors"]["hot_days"] for r in rows]
    assert all(c["q"] >= c["p"] for c in cells)
    assert cells[0]["clear"] and not cells[1]["clear"]          # p = 0.04 alone, but not after testing 5 cities
