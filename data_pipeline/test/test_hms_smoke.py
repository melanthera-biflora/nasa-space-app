"""HMS smoke outlines -> smoke days on the grid (sources/hms_smoke.py). No network: outlines are made up."""
import numpy as np
import pandas as pd

from sources.hms_smoke import outline_day, year_grid

LAT = np.array([40.0, 40.5, 41.0])
LON = np.array([-100.0, -99.375, -98.75])
SQUARE = [[(-100.2, 39.8), (-99.0, 39.8), (-99.0, 40.7), (-100.2, 40.7), (-100.2, 39.8)]]   # covers 4 centres


def test_start_text_is_utc_year_and_day_of_year():
    assert outline_day("2020245 1840") == pd.Timestamp("2020-09-01")
    assert outline_day("2020366 2350") == pd.Timestamp("2020-12-31")


def test_outline_marks_the_centres_it_covers_once_per_day():
    rows = [{"Start": "2020245 1840", "Density": "Light"}, {"Start": "2020245 2100", "Density": "Light"}]
    days, any_, mh = year_grid(rows, [SQUARE, SQUARE], 2020, LAT, LON)
    d = days.get_loc(pd.Timestamp("2020-09-01"))
    assert any_[d].tolist() == [[1, 1, 0], [1, 1, 0], [0, 0, 0]]        # two outlines, still one smoke day
    assert any_.sum() == 4 and mh.sum() == 0


def test_medium_and_heavy_count_separately():
    rows = [{"Start": "2021100 1500", "Density": "Heavy"}, {"Start": "2021101 1500", "Density": "NA"}]
    _, any_, mh = year_grid(rows, [SQUARE, SQUARE], 2021, LAT, LON)
    assert any_.sum() == 8 and mh.sum() == 4


def test_days_before_the_archive_and_before_density_tags_are_unknown():
    _, any_, mh = year_grid([], [], 2005, LAT, LON)
    assert np.isnan(any_[0]).all() and not np.isnan(any_[-1]).any()     # archive starts 5 Aug 2005
    _, any_, mh = year_grid([], [], 2010, LAT, LON)
    assert not np.isnan(any_).any()
    assert np.isnan(mh[0]).all() and not np.isnan(mh[-1]).any()         # density tags from June 2010
