import numpy as np
import pandas as pd

from analysis.enso import EL_NINO, LA_NINA, parse_roni, phase_of, winter_means, winters

# 24 winters, 2002-2025, with CPC's real Dec-Feb RONI phases (12 La Nina, 8 El Nino, 4 neither)
RONI = {2002: -0.16, 2003: 0.85, 2004: 0.23, 2005: 0.54, 2006: -0.9, 2007: 0.6, 2008: -1.73, 2009: -0.96, 2010: 1.44,
        2011: -1.42, 2012: -0.77, 2013: -0.55, 2014: -0.43, 2015: 0.54, 2016: 2.14, 2017: -0.6, 2018: -1.08, 2019: 0.68,
        2020: 0.14, 2021: -1.32, 2022: -1.18, 2023: -0.86, 2024: 1.13, 2025: -1.1}
MONTHS = pd.date_range("2001-01-01", "2025-12-01", freq="MS")


def monthly(winter_value, trend=0.0, noise=0.0, seed=1):
    """A record whose winters follow winter_value(year); other months are 0; plus an optional trend per year."""
    rng = np.random.default_rng(seed)
    vals = []
    for d in MONTHS:
        w = d.year + (d.month == 12)
        base = winter_value(w) if d.month in (12, 1, 2) else 0.0
        vals.append(base + trend * (d.year - 2001) + noise * rng.standard_normal())
    return pd.Series(vals, index=MONTHS)


def test_parses_cpc_rows_and_names_a_winter_by_its_january():
    text = "SEAS   YR  ANOM\nDJF  2016  2.14\nJFM  2016  1.90\nDJF  2017 -0.60\n"
    assert parse_roni(text) == {2016: 2.14, 2017: -0.6}
    assert [phase_of(v) for v in (0.5, -0.5, 0.49)] == ["el_nino", "la_nina", "neutral"]


def test_winter_means_need_all_three_months():
    s = pd.Series(1.0, index=pd.date_range("2015-12-01", "2017-01-01", freq="MS"))   # winter 2017 lacks February
    assert list(winter_means(s).index) == [2016]


def test_finds_drier_la_nina_winters_and_says_how_many():
    rec = monthly(lambda y: 2.0 - (1.5 if RONI[y] <= -0.5 else 0) if y in RONI else 2.0, noise=0.2)
    out = winters({"precip": rec}, {"precip": "Rain and snow"}, {"precip": "mm/day"}, RONI)
    r = out["records"][0]
    ln = next(p for p in r["phases"] if p["phase"] == LA_NINA)
    assert ln["n"] == 12 and ln["below"] >= 11 and ln["clear"]
    assert ln["sentence"].startswith("Rain and snow: below the middle of the other winters in")
    assert out["first"] == 2002 and out["last"] == 2025 and len(out["winters"]) == 24


def test_a_phase_below_every_other_winter_is_clear():
    rec = monthly(lambda y: (-0.05 if RONI[y] <= -0.5 else (0.0 if y % 2 else 1.0)) if y in RONI else 0.5, noise=0.001)
    ln = next(p for p in winters({"t2m": rec}, {"t2m": "Air temperature"}, {}, RONI)["records"][0]["phases"] if p["phase"] == LA_NINA)
    assert ln["below"] == 12 and ln["clear"]


def test_a_trend_alone_is_not_an_el_nino_effect():
    # rising winters, no ENSO signal: after the trend is taken out nothing is clear
    rec = monthly(lambda y: 0.0, trend=0.3, noise=0.3, seed=4)
    out = winters({"t2m": rec}, {"t2m": "Air temperature"}, {"t2m": "°C"}, RONI)
    assert not any(p["clear"] for r in out["records"] for p in r["phases"])
    assert "so it isn't a clear difference" in out["records"][0]["phases"][0]["sentence"]


def test_skips_records_that_are_the_same_most_winters_and_honours_a_first_year():
    zeros = monthly(lambda y: 0.0)                           # no frost days in a warm place's winters
    assert winters({"frost_days": zeros}, {}, {}, RONI)["records"] == []
    busy = monthly(lambda y: 1.0 if RONI.get(y, 0) >= 0.5 else 0.0, noise=0.1)
    assert winters({"hot_days": busy, "surface_heat_5km": busy}, {}, {}, RONI)["records"] == []   # not winter records
    rec = monthly(lambda y: 1.0 if RONI.get(y, 0) >= 0.5 else 0.0, noise=0.1)
    out = winters({"pm25": rec}, {}, {}, RONI, first_years={"pm25": 2010})
    assert out["records"][0]["values"][0]["year"] == 2011
    # from winter 2011 there are only 4 El Nino winters: under the 5-winter minimum, so that test is left out
    assert {p["phase"] for p in out["records"][0]["phases"]} == {LA_NINA}
    full = winters({"pm25": rec}, {}, {}, RONI)
    assert {p["phase"] for p in full["records"][0]["phases"]} == {EL_NINO, LA_NINA}
