"""Trend, significance and edge cases (analysis/trends.py)."""
import math

import numpy as np
import pandas as pd

from analysis.trends import correct_across, monthly_anomaly, p_label, trend_stats

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


# ---- Items 14-16 of the research review: one method for the rate and the verdict, memory, many records ------------

def test_the_rate_is_the_sen_slope_and_its_range_brackets_the_line():
    rng = np.random.default_rng(3)
    s = pd.Series([10 + 0.5 * i + rng.normal(0, 1) for i in range(25)], index=YEARS)
    s.iloc[3] += 30                                          # one wild year barely moves a Sen slope
    tr = trend_stats(s, 2001, 2025)
    lo, hi = tr["slope_ci95_per_decade"]
    assert 4 < tr["slope_per_decade"] < 6 and lo < tr["slope_per_decade"] < hi
    mid = tr["line"][12]
    assert mid["lo95"] <= mid["trend"] <= mid["hi95"]


def test_years_that_remember_the_year_before_get_a_memory_aware_p_beside_the_verdict():
    rng = np.random.default_rng(7)
    e = np.zeros(25)
    for i in range(1, 25):                                   # no trend, strong year-to-year memory (AR1, 0.85)
        e[i] = 0.85 * e[i - 1] + rng.normal(0, 1)
    tr = trend_stats(pd.Series(50 + e, index=YEARS), 2001, 2025)
    import pymannkendall as mk
    assert tr["lag1"] > 0.39 and tr["mk_p"] == mk.original_test(50 + e).p     # the verdict keeps the plain test
    assert tr["mk_p_memory"] > tr["mk_p"]                                       # the memory check is less sure
    assert tr["memory_sensitive"] == (tr["significant"] and tr["mk_p_memory"] >= 0.05)
    clean = trend_stats(pd.Series([10 + 0.8 * i for i in range(25)], index=YEARS), 2001, 2025)
    assert clean["lag1"] == 0 and clean["significant"] and not clean["memory_sensitive"]


def test_one_report_is_corrected_across_its_records():
    def tr(p, memory=None):
        return {"mk_p": p, "mk_p_memory": p if memory is None else memory, "significant": p < 0.05, "significance_label": "x",
                "slope_per_decade": 1.0}
    trends = {"a": tr(0.001, memory=0.02), "b": tr(0.03), "c": tr(0.04), "d": tr(0.5),
              "flat": {"constant": True, "mk_p": 1.0, "significant": False}, "short": None}
    correct_across(trends, 0.05)
    assert trends["a"]["significant"] and trends["a"]["q"] == 0.004
    assert not trends["b"]["significant"] and abs(trends["b"]["q"] - 0.0533) < 0.001   # 0.04 x 4/3
    assert trends["b"]["significance_label"] == "Not significant yet" and trends["b"]["records_tested"] == 4
    assert "q" not in trends["flat"] and trends["short"] is None                       # nothing tested, nothing counted
    assert trends["a"]["alpha_line"] == 0.0125 and trends["d"]["alpha_line"] == 0.05     # the step-up line by rank
    assert trends["a"]["memory_sensitive"]           # clear, but its memory-aware p (0.02) misses its line (0.0125)


def test_a_rate_of_zero_is_never_a_clear_change():
    # mostly-zero counts that start in the last years: Mann-Kendall sees a rise but the median slope is 0, and a "clear
    # change of 0 days per decade" would read as improving
    years = np.arange(2001, 2026)
    counts = pd.Series([0.0] * 18 + [2, 3, 2, 5, 8, 6, 9], index=years)
    tr = trend_stats(counts, 2001, 2025)
    assert tr["slope_per_decade"] == 0 and tr["mk_p"] < 0.05
    assert not tr["significant"]
    other = trend_stats(pd.Series(np.arange(25.0), index=years), 2001, 2025)
    trends = correct_across({"counts": tr, "rising": other})
    assert not trends["counts"]["significant"] and trends["rising"]["significant"]
