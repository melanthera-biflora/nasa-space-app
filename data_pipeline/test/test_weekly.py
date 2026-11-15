"""Week-by-week view (analysis/weekly.py): fixed 7-day blocks from 1 January and their normal range."""
import numpy as np
import pandas as pd
import pytest

from analysis import weekly


def daily(years=(2001, 2025), bump=None):
    d = pd.date_range(f"{years[0]}-01-01", f"{years[1]}-12-31")
    v = 20 + 10 * np.sin(2 * np.pi * (d.dayofyear - 100) / 365) + (d.year - years[0]) * 0.0
    s = pd.Series(v, index=d)
    if bump:
        s[bump[0]:bump[1]] += 15
    return s


def test_blocks_are_52_fixed_weeks_from_january_first():
    b = weekly.block_of(pd.DatetimeIndex(["2021-01-01", "2021-01-07", "2021-01-08", "2021-12-24", "2021-12-31", "2024-12-31"]))
    assert b.tolist() == [1, 1, 2, 52, 52, 52]          # days 358-366 join the last week


def test_one_year_against_its_normal_range():
    out = weekly.weekly_blocks(daily(bump=("2021-06-26", "2021-06-30")), 2021, 2001, 2025, "mean")
    assert len(out["blocks"]) == 52
    w = next(b for b in out["blocks"] if b["start"] <= "06-28" <= b["end"])
    assert w["value"] > w["p90"] and w["unusual"] == "high"
    calm = out["blocks"][10]
    assert calm["p10"] <= calm["p50"] <= calm["p90"] and calm["unusual"] is None


def test_sum_for_rain_and_missing_year_is_none():
    s = daily()
    out = weekly.weekly_blocks(s, 2010, 2001, 2025, "sum")
    assert out["blocks"][0]["value"] == pytest.approx(s["2010-01-01":"2010-01-07"].sum(), abs=0.05)
    assert weekly.weekly_blocks(s, 1990, 2001, 2025, "sum") is None
