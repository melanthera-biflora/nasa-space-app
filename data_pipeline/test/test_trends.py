"""Trend, significance and edge cases (analysis/trends.py)."""
import math

import numpy as np
import pandas as pd

from analysis.trends import monthly_anomaly, p_label, trend_stats

YEARS = range(2001, 2026)


def test_clear_rising_trend_is_significant():
    s = pd.Series([10 + 0.8 * i for i in range(25)], index=YEARS)
    tr = trend_stats(s, 2001, 2025)
    assert tr["significant"] and tr["slope_per_decade"] > 7.9
    assert tr["significance_label"] == "Significant"


def test_random_noise_is_not_significant():
    rng = np.random.default_rng(42)
    s = pd.Series(50 + rng.normal(0, 5, 25), index=YEARS)
    tr = trend_stats(s, 2001, 2025)
    assert not tr["significant"]
    assert tr["significance_label"] == "Not significant yet"


def test_then_and_now_are_first_and_last_five_years():
    s = pd.Series(range(25), index=YEARS, dtype=float)
    tr = trend_stats(s, 2001, 2025)
    assert tr["then_years"] == [2001, 2005] and tr["then"] == 2.0
    assert tr["now_years"] == [2021, 2025] and tr["now"] == 22.0


def test_same_value_every_year_gives_no_nan():
    s = pd.Series(0.0, index=YEARS)                          # e.g. 0 frost days in Miami
    tr = trend_stats(s, 2001, 2025)
    numbers = [tr["slope_per_decade"], *tr["slope_ci95_per_decade"], tr["mk_p"], tr["then"], tr["now"]]
    assert all(not math.isnan(x) for x in numbers)
    assert tr["significance_label"] == "No change"


def test_too_few_years_returns_none():
    s = pd.Series([1.0, 2.0, 3.0], index=[2023, 2024, 2025])
    assert trend_stats(s, 2001, 2025) is None


def test_period_limits_the_years_used():
    s = pd.Series(range(25), index=YEARS, dtype=float)
    tr = trend_stats(s, 2016, 2025)
    assert tr["period"] == [2016, 2025] and tr["n_years"] == 10


def test_p_label_wording():
    assert p_label(0.0001) == "p < 0.001"
    assert p_label(0.046) == "p = 0.046"        # 3 decimals near 0.05
    assert p_label(0.38) == "p = 0.38"


def test_anomaly_removes_the_seasons():
    idx = pd.date_range("2001-01-01", "2010-12-01", freq="MS")
    monthly = pd.Series([10 * (t.month in (6, 7, 8)) for t in idx], index=idx, dtype=float)
    assert np.allclose(monthly_anomaly(monthly), 0)          # pure season -> zero anomaly
