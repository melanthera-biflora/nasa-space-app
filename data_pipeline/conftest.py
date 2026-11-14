"""
Shared test setup: fake NASA data, so tests need no internet and no data files.
Run from the data_pipeline folder:   python -m pytest
JUnit-style results file:            python -m pytest --junitxml=test-results.xml
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))    # the data_pipeline folder


def make_daily(hot_trend=0.08, base=32.0, seed=0, start="2001-01-01", end="2025-12-31"):
    """Fake NASA POWER daily data: seasons + a warming trend + noise."""
    rng = np.random.default_rng(seed)
    d = pd.date_range(start, end)
    season = -np.cos(2 * np.pi * (d.dayofyear.values - 15) / 365)
    years = d.year.values - d.year.values[0]
    return pd.DataFrame({
        "T2M_MAX": base + 9 * season + hot_trend * years + rng.normal(0, 2.5, len(d)),
        "T2M_MIN": base - 12 + 9 * season + hot_trend * years + rng.normal(0, 2.5, len(d)),
        "RH2M": np.clip(30 - 8 * season + rng.normal(0, 8, len(d)), 1, 100),
        "T2MDEW": 5 + 6 * season + rng.normal(0, 3, len(d)),
        "PRECTOTCORR": np.where(rng.random(len(d)) < 0.2, rng.gamma(0.9, 10, len(d)), 0.0),
    }, index=d)


def make_monthly(values_by_year):
    """{year: value} -> monthly series with that value every month (for fake PM2.5 / NO2)."""
    idx, vals = [], []
    for y, v in values_by_year.items():
        for m in range(1, 13):
            idx.append(pd.Timestamp(y, m, 1))
            vals.append(v)
    s = pd.Series(vals, index=pd.DatetimeIndex(idx), dtype=float)
    return s


@pytest.fixture
def daily():
    return make_daily()


@pytest.fixture
def fake_extra():
    """Fake PM2.5 (flat, above the EPA limit) and NO2 (rising) series."""
    rng = np.random.default_rng(1)
    pm = make_monthly({y: 10 + rng.normal(0, 0.3) for y in range(2001, 2026)})
    no2 = make_monthly({y: 2 + 0.05 * (y - 2005) + rng.normal(0, 0.05) for y in range(2005, 2026)})
    return {
        "pm25": {"annual": pm.groupby(pm.index.year).mean(), "monthly": pm},
        "no2": {"annual": no2.groupby(no2.index.year).mean(), "monthly": no2},
    }
