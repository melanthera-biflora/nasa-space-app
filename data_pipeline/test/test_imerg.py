"""IMERG monthly rain: unit conversion and reply layout (sources/imerg.py). No network."""
import numpy as np
import pandas as pd
import pytest

from sources.imerg import LAT, LON, rain_block, to_mm_per_month


def test_rate_becomes_mm_in_the_month():
    assert to_mm_per_month(1.0, b"mm/hr", pd.Timestamp("2017-08-01")) == 24 * 31
    assert to_mm_per_month(1.0, "mm/hr", pd.Timestamp("2024-02-01")) == 24 * 29      # leap February


def test_unknown_units_are_refused():
    with pytest.raises(RuntimeError):
        to_mm_per_month(1.0, b"mm/month", pd.Timestamp("2017-08-01"))


def test_lon_lat_reply_is_turned_to_lat_lon_and_fills_dropped():
    p = np.zeros((1, len(LON), len(LAT)), "float32")
    p[0, 3, 7] = 0.5                                          # lon index 3, lat index 7
    p[0, 0, 0] = -9999.9
    a = rain_block({"precipitation": (p, {"units": b"mm/hr"}), "lat": (LAT, {}), "lon": (LON, {})},
                   pd.Timestamp("2017-08-01"))
    assert a.shape == (len(LAT), len(LON))
    assert a[7, 3] == pytest.approx(0.5 * 24 * 31) and np.isnan(a[0, 0])
