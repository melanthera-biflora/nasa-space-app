"""Yearly frames for the animated US map (tools/map_frames.py), on a fake grid: no data files needed."""
import numpy as np

from tools.map_frames import frames


def test_frames_keep_us_cells_share_one_scale_and_weight_the_us_mean_by_area():
    years = np.array([2001, 2002, 2003])
    lats, lons = np.array([30.0, 60.0]), np.array([-100.0, -99.0])
    cube = np.array([[[1.0, 2.0], [9.0, np.nan]],
                     [[3.0, 4.0], [9.0, np.nan]],
                     [[5.0, 6.0], [9.0, np.nan]]])
    inside = np.array([[True, True], [True, False]])
    out = frames(years, lats, lons, cube, inside, decimals=1)
    assert out["years"] == [2001, 2002, 2003]
    assert len(out["values"]) == 3 and len(out["values"][0]) == 4
    assert out["values"][0][3] is None                                 # outside the US: no value
    assert out["level_breaks"] == sorted(out["level_breaks"]) and out["level_breaks"]
    w30, w60 = np.cos(np.radians(30)), np.cos(np.radians(60))         # the 60 deg cell weighs half as much
    expect = (1 * w30 + 2 * w30 + 9 * w60) / (2 * w30 + w60)
    assert abs(out["us_mean"][0] - expect) < 0.01


def test_counts_are_whole_numbers_and_empty_years_have_no_mean():
    cube = np.array([[[3.4]], [[np.nan]]])
    out = frames(np.array([2006, 2007]), np.array([40.0]), np.array([-100.0]), cube, np.array([[True]]), decimals=0)
    assert out["values"] == [[3], [None]] and out["us_mean"] == [3.4, None]


def test_smoothing_uses_whole_windows_and_change_is_against_the_first_years():
    cube = np.array([1.0, 2.0, 3.0, 10.0, np.nan])[:, None, None]
    out = frames(np.arange(2001, 2006), np.array([40.0]), np.array([-100.0]), cube, np.array([[True]]),
                 decimals=1, smooth=3, base=2)
    assert out["years"] == [2003, 2004, 2005] and out["span"] == 3 and out["base_years"] == [2001, 2002]
    assert out["values"] == [[2.0], [5.0], [None]]                     # a window with a missing year has no value
    assert out["change"] == [[0.5], [3.5], [None]]                     # against mean(2001, 2002) = 1.5
    assert out["us_change"] == [0.5, 3.5, None]
    assert len(out["change_breaks"]) == 4 and out["change_breaks"] == sorted(out["change_breaks"])


def test_a_square_with_too_few_early_years_has_no_change():
    cube = np.array([np.nan, np.nan, np.nan, 5.0, 6.0, 7.0])[:, None, None]
    out = frames(np.arange(2001, 2007), np.array([40.0]), np.array([-100.0]), cube, np.array([[True]]), decimals=0)
    assert out["values"][-1] == [7] and out["change"][-1] == [None]   # 2 of the first 5 years: no baseline


def test_change_edges_follow_the_spread_of_changes_not_the_extremes():
    from tools.map_frames import change_edges
    heavy = np.r_[np.arange(0, 100), [3000.0]]                         # one huge fire square must not set the scale
    e = change_edges(-heavy)
    assert e == sorted(e) and len(e) == 4 and e[-1] < 200
    assert change_edges(np.array([0.0012, 0.0031, 0.0047, 0.0088])) == sorted(set(change_edges(np.array([0.0012, 0.0031, 0.0047, 0.0088]))))
    assert all(len(f"{v:.2g}") <= 6 for v in change_edges(np.linspace(0, 0.05, 50)))   # 2 significant digits
