"""Cleaning and counting the NASA POWER daily data (sources/power.py)."""
import numpy as np
import pandas as pd

from paths import load_thresholds
from sources.power import annual_counts, clean_daily, daily_flags, wettest_day


def test_minus_999_becomes_empty(daily):
    daily.iloc[10:13] = -999
    df, _, _ = clean_daily(daily)
    assert df.iloc[10:13].isna().all().all()
    assert not (df == -999).any().any()


def test_impossible_values_are_removed(daily):
    daily.iloc[0, daily.columns.get_loc("RH2M")] = 150       # humidity can't be 150%
    daily.iloc[1, daily.columns.get_loc("T2M_MAX")] = 90     # 90 C is impossible
    df, _, _ = clean_daily(daily)
    assert np.isnan(df.iloc[0]["RH2M"]) and np.isnan(df.iloc[1]["T2M_MAX"])


def test_incomplete_year_is_flagged(daily):
    daily.loc["2010-01-01":"2010-03-31"] = -999              # 3 months missing
    _, _, bad_years = clean_daily(daily)
    assert 2010 in bad_years


def test_hot_day_threshold_counts_correctly():
    d = pd.date_range("2020-01-01", "2020-12-31")
    df = pd.DataFrame({"T2M_MAX": 30.0, "T2M_MIN": 10.0, "RH2M": 50.0, "T2MDEW": 5.0,
                       "PRECTOTCORR": 0.0}, index=d)
    df.iloc[:40, 0] = 36.0                                    # exactly 40 days >= 35 C
    df.iloc[40:45, 0] = 35.0                                  # 5 days at exactly 35 C (counts)
    counts = annual_counts(daily_flags(df, load_thresholds()))
    assert counts.loc[2020, "hot_days"] == 45


def test_missing_days_are_scaled_to_a_full_year():
    d = pd.date_range("2021-01-01", "2021-12-31")
    df = pd.DataFrame({"T2M_MAX": 40.0, "T2M_MIN": 25.0, "RH2M": 10.0, "T2MDEW": 0.0,
                       "PRECTOTCORR": 0.0}, index=d)
    df.iloc[:5] = np.nan                                      # 5 unknown days
    counts = annual_counts(daily_flags(df, load_thresholds()))
    assert counts.loc[2021, "hot_days"] == 365                # every known day was hot


def test_wettest_day_is_the_maximum_not_the_sum():
    d = pd.date_range("2022-01-01", "2022-12-31")
    rain = pd.Series(1.0, index=d)
    rain.iloc[100] = 80.0
    df = pd.DataFrame({"PRECTOTCORR": rain})
    annual, _ = wettest_day(df)
    assert annual.loc[2022] == 80.0
