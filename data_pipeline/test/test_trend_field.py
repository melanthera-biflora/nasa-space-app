"""The map's trend field (tools/trend_field.py): false-discovery check, colour classes, place words."""
import numpy as np

from tools.trend_field import bh_qvalues, nice_breaks, where_words


def test_bh_q_values_by_hand_and_missing_cells_stay_missing():
    p = np.array([0.001, 0.04, np.nan, 0.03, 0.2, 0.012])
    q = bh_qvalues(p)
    assert np.isnan(q[2])
    # sorted p 0.001, 0.012, 0.03, 0.04, 0.2 (m = 5): p * m / rank, then the running minimum from the top
    assert np.allclose(q[[0, 5, 3, 1, 4]], [0.005, 0.03, 0.05, 0.05, 0.2])


def test_breaks_are_symmetric_1_2_5_steps_near_the_95th_percentile():
    assert nice_breaks(-np.linspace(0, 0.9, 101)) == [0.125, 0.25, 0.5, 1]     # p95 = 0.855 -> top 1
    assert nice_breaks(np.r_[np.linspace(-1.6, 1.6, 100), np.nan]) == [0.25, 0.5, 1, 2]


def test_place_words_say_near_or_distance_and_direction():
    assert where_words(43.6, -116.2) == "near Boise"
    assert where_words(41.0, -123.75).endswith("northwest of Sacramento")



def test_us_mask_is_the_census_outline_touched_by_any_sample_point():
    from sources.hms_smoke import LAT, LON          # the MERRA-2 squares over the lower-48 box
    from tools.trend_field import us_mask
    m = us_mask(LAT, LON)

    def at(lat, lon):
        return bool(m[abs(LAT - lat).argmin(), abs(LON - lon).argmin()])

    assert m.sum() == 2817                          # measured in the map-motion review (step 3)
    assert at(38.5, -98.125) and at(47.5, -122.5) and at(24.5, -81.875)       # Kansas, Seattle, a Keys square
    assert not (at(26.0, -90.0) or at(49.5, -85.0) or at(30.0, -115.0) or at(47.75, -86.875))  # Gulf, Ontario, Baja, mid Lake Superior
