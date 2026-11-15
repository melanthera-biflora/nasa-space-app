"""Ground check for MERRA-2 PM2.5 (tools/pm25_ground_check.py): the before/after step per site."""
import pandas as pd

from tools.pm25_ground_check import site_steps


def test_steps_compare_the_same_site_years_and_skip_short_records():
    rows = []
    for y in range(2003, 2017):
        rows.append(("A", y, 5.0, 4.0 if y < 2009 else 8.0))                 # MERRA-2 steps up, the ground doesn't
        if y in (2004, 2012):
            rows.append(("B", y, 9.0, 9.0))                                  # too few years on each side
    s = pd.DataFrame(rows, columns=["site", "year", "ground", "merra2"]).set_index(["site", "year"])
    out = site_steps(s)
    assert list(out.index) == ["A"]
    assert out.loc["A", "ground"] == 0 and out.loc["A", "merra2"] == 4.0
    assert out.loc["A", "before_merra2"] == 4.0
