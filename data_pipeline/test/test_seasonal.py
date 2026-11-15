"""Seasonal statistics (analysis/seasonal.py): monthly trend tests, which seasons and months change, years needed."""
import numpy as np
import pandas as pd
import pytest

from analysis import seasonal


def monthly_series(trend_per_year=0.0, years=(2001, 2025), noise=0.3, phi=0.0, seed=0, july_only=False, start_month=1):
    """Seasonal cycle + a trend (per year) + AR(1) noise, one value per month."""
    rng = np.random.default_rng(seed)
    idx = pd.date_range(f"{years[0]}-{start_month:02d}-01", f"{years[1]}-12-01", freq="MS")
    t = (idx.year - years[0]) + (idx.month - 1) / 12
    e = np.zeros(len(idx))
    for i in range(len(idx)):
        e[i] = (phi * e[i - 1] if i else 0) + rng.normal(0, noise)
    trend = trend_per_year * t * ((idx.month == 7) if july_only else 1)
    return pd.Series(20 + 8 * np.sin(2 * np.pi * (idx.month - 4) / 12) + trend + e, index=idx)


def test_month_table_starts_in_january_and_pads_missing_months():
    t = seasonal.month_table(monthly_series(start_month=3))
    assert list(t.columns) == list(range(1, 13))
    assert t.index[0] == 2001 and t.index[-1] == 2025
    assert t.loc[2001, [1, 2]].isna().all() and t.loc[2001, 3:].notna().all()


def test_known_trend_is_clear_with_the_right_rate():
    out = seasonal.seasonal_block(monthly_series(trend_per_year=0.05, noise=0.1))
    o = out["overall"]
    assert o["clear"] and o["p"] < 0.001
    assert o["slope_per_decade"] == pytest.approx(0.5, abs=0.05)
    assert o["n_years"] == 25


def test_no_trend_with_month_to_month_memory_is_rarely_called_clear():
    # Correlated noise fooled the plain seasonal test 11-21% of the time in the research; this one should stay near 5%.
    clear = [seasonal.seasonal_block(monthly_series(noise=1.0, phi=0.5, seed=s))["overall"]["clear"] for s in range(60)]
    assert sum(clear) / len(clear) <= 0.12


def test_only_july_changes_and_the_12_tests_are_corrected():
    out = seasonal.seasonal_block(monthly_series(trend_per_year=0.15, july_only=True, noise=0.4))
    months = {m["name"]: m for m in out["months"]}
    assert len(out["months"]) == 12
    assert months["Jul"]["clear"] and not months["Jan"]["clear"]
    assert all(m["q"] >= m["p"] for m in out["months"])
    summer = next(s for s in out["seasons"] if s["name"] == "summer")
    winter = next(s for s in out["seasons"] if s["name"] == "winter")
    assert summer["slope_per_decade"] > 0 and winter["slope_per_decade"] == pytest.approx(0, abs=0.2)


def test_winter_uses_the_december_before_and_drops_the_first_winter():
    t = seasonal.month_table(monthly_series())
    s = seasonal.season_table(t, "mean")
    assert np.isnan(s.loc[2001, "winter"])
    assert s.loc[2002, "winter"] == pytest.approx(np.mean([t.loc[2001, 12], t.loc[2002, 1], t.loc[2002, 2]]))
    assert seasonal.season_table(t, "sum").loc[2002, "summer"] == pytest.approx(t.loc[2002, [6, 7, 8]].sum())


def test_a_missing_month_drops_only_its_year_from_the_overall_test():
    s = monthly_series(trend_per_year=0.05)
    s["2010-05-01"] = np.nan
    out = seasonal.seasonal_block(s)
    assert out["overall"]["n_years"] == 24 and out["overall"]["clear"]
    may = next(m for m in out["months"] if m["name"] == "May")
    assert may["n_years"] == 24


def test_anomaly_test_falls_back_when_hamed_rao_gives_nan(monkeypatch):
    real = seasonal.mk.hamed_rao_modification_test
    monkeypatch.setattr(seasonal.mk, "hamed_rao_modification_test",
                        lambda x, lag: real(x, lag=lag)._replace(p=float("nan")))
    out = seasonal.seasonal_block(monthly_series(trend_per_year=0.05))
    assert out["anomaly_test"]["method"] == "pre-whitening" and np.isfinite(out["anomaly_test"]["p"])


def test_years_needed_matches_weatherhead():
    out = seasonal.seasonal_block(monthly_series(trend_per_year=0.02, noise=1.0, seed=3))
    yn, slope = out["years_needed"], out["overall"]["slope_per_year"]
    k = np.sqrt((1 + yn["phi"]) / (1 - yn["phi"]))
    assert yn["even_odds"] == round((2 * yn["sigma"] / abs(slope) * k) ** (2 / 3))
    assert yn["likely"] == round((3.3 * yn["sigma"] / abs(slope) * k) ** (2 / 3))
    assert yn["likely"] > yn["even_odds"]


def test_no_change_needs_no_years_estimate():
    flat = pd.Series(5.0, index=pd.date_range("2001-01-01", "2025-12-01", freq="MS"))
    out = seasonal.seasonal_block(flat)
    assert out["overall"]["slope_per_decade"] == 0 and not out["overall"]["clear"]
    assert out["years_needed"] is None


def test_too_few_years_gives_nothing():
    assert seasonal.seasonal_block(monthly_series(years=(2019, 2025))) is None


def test_monthly_z_flags_the_unusual_month():
    s = monthly_series(noise=0.3)
    s["2023-06-01"] += 5
    z = seasonal.monthly_z(s)
    assert z["2023-06-01"] > 3
    assert z.abs().drop(pd.Timestamp("2023-06-01")).max() < 3.6   # 300 normal months rarely pass ~3.3


def test_counts_that_are_zero_most_months_still_get_a_rate():
    # Warm nights: 0 every month outside summer. Pooled same-month slopes are then mostly 0, so counts use yearly totals.
    rng = np.random.default_rng(1)
    idx = pd.date_range("2001-01-01", "2025-12-01", freq="MS")
    summer = idx.month.isin([6, 7, 8, 9])
    counts = np.where(summer, np.clip(np.round(8 + 0.25 * (idx.year - 2001) + rng.normal(0, 2, len(idx))), 0, 30), 0)
    out = seasonal.seasonal_block(pd.Series(counts, index=idx, dtype=float), agg="sum")
    o = out["overall"]
    assert o["clear"] and o["slope_per_decade"] == pytest.approx(10, abs=3)   # 4 months x 0.25 a year = 1 a year
    assert out["years_needed"] is not None


def test_months_that_are_almost_always_zero_get_no_z():
    # One frosty June in 25 years is rare, not "4.8 SD unusual"; only months that usually happen get a z.
    idx = pd.date_range("2001-01-01", "2025-12-01", freq="MS")
    counts = pd.Series(np.where(idx.month == 1, 20.0 + (idx.year % 5), 0.0), index=idx)
    counts["2015-06-01"] = 2
    z = seasonal.monthly_z(counts)
    assert np.isnan(z["2015-06-01"]) and np.isfinite(z["2015-01-01"])



def test_leave_one_out_reruns_the_yearly_test_without_each_year():
    rng = np.random.default_rng(4)
    years = list(range(2001, 2026))
    vals = 10 + 0.04 * np.arange(25) + rng.normal(0, 0.25, 25)
    points = [{"year": y, "value": float(v)} for y, v in zip(years, vals)]
    out = seasonal.leave_one_out(points)
    assert out["clear"] == (seasonal.mk.original_test(vals).p < 0.05)
    row = next(r for r in out["years"] if r["year"] == 2013)
    assert row["p"] == pytest.approx(seasonal.mk.original_test(np.delete(vals, 12)).p, abs=1e-4)
    assert out["flips"] == [r["year"] for r in out["years"] if r["clear"] != out["clear"]]
    assert seasonal.leave_one_out(points[:8]) is None


def test_normals_give_each_calendar_month_its_usual_range():
    s = monthly_series(noise=1.0)
    n = seasonal.seasonal_block(s)["normals"]
    assert [m["month"] for m in n] == list(range(1, 13))
    july = s[s.index.month == 7]
    assert n[6]["p50"] == pytest.approx(np.percentile(july, 50), abs=0.01)
    assert all(m["p10"] <= m["p25"] <= m["p50"] <= m["p75"] <= m["p90"] for m in n)
