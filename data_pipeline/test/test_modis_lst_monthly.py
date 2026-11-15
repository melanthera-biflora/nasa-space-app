"""MODIS monthly LST: raw counts to °C and the 0.1° average (sources/modis_lst_monthly.py). No network."""
import numpy as np
import pytest

from sources.modis_lst_monthly import LAT, LON, coarsen2, to_celsius


def test_raw_counts_become_celsius_and_zero_is_no_data():
    c = to_celsius(np.array([0, 15000, 16000], "uint16"))
    assert np.isnan(c[0]) and c[1] == pytest.approx(26.85) and c[2] == pytest.approx(46.85)


def test_coarsen_averages_only_squares_with_data():
    a = np.array([[10, 20, np.nan, np.nan],
                  [np.nan, 30, np.nan, np.nan]], "float32")
    out = coarsen2(a)
    assert out.shape == (1, 2) and out[0, 0] == pytest.approx(20) and np.isnan(out[0, 1])


def test_box_is_18_to_72_north_and_180_to_65_west():
    assert LAT.max() < 72 < LAT.max() + 0.05 and LAT.min() - 0.05 < 18 < LAT.min()
    assert LON.min() - 0.05 < -180 < LON.min() and LON.max() < -65 < LON.max() + 0.05
    assert len(LAT) % 2 == 0 and len(LON) % 2 == 0
