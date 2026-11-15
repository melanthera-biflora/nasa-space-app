"""Humid-heat day counts from POWER daily-mean wet-bulb (sources/power.py: wet_bulb_days)."""
import numpy as np
import pandas as pd

from sources.power import wet_bulb_days


def year_of(wet, year=2020):
    d = pd.date_range(f"{year}-01-01", f"{year}-12-31")
    return pd.DataFrame({"T2MWET": wet}, index=d)


def test_counts_days_at_or_above_the_cutoff():
    df = year_of(20.0)
    df.iloc[:10, 0] = 27.0
    df.iloc[10:13, 0] = 26.0                     # exactly at the cutoff counts
    df.iloc[13:15, 0] = 25.9
    assert wet_bulb_days(df, 26).loc[2020] == 13


def test_missing_days_scale_up_and_fills_are_ignored():
    df = year_of(28.0, 2021)
    df.iloc[:5, 0] = -999                        # 5 unknown days, every known day is humid-hot
    assert wet_bulb_days(df, 26).loc[2021] == 365


def test_incomplete_year_is_empty():
    df = year_of(28.0, 2022)
    df.iloc[:60, 0] = np.nan                     # under 330 valid days
    assert np.isnan(wet_bulb_days(df, 26).loc[2022])
