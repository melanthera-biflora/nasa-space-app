"""State averages (sources/power_region.py): outlines, tiles, parsing, weighting. No network."""
import numpy as np
import pandas as pd
import pytest
import xarray as xr

from sources import power_region as pr


def test_inside_handles_holes():
    square = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
    hole = [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]]
    got = pr.inside([square, hole], np.array([1, 5, 11]), np.array([1, 5, 5]))
    assert got.tolist() == [True, False, False]


def test_tiles_respect_the_api_limits():
    big = pr.tiles((-106.6, 25.8, -93.5, 36.5))            # Texas: 13° wide, 10.7° tall
    assert len(big) == 4
    assert all(2 <= e - w <= 10 and 2 <= n - s <= 10 for w, s, e, n in big)
    (w, s, e, n), = pr.tiles((-77.1, 38.8, -76.9, 39.0))   # DC: tiny, padded to 2°
    assert e - w == pytest.approx(2) and n - s == pytest.approx(2)


def test_wisconsin_outline_keeps_madison_and_drops_chicago():
    lats, lons = np.array([41.5, 43.0]), np.array([-89.375, -87.5])
    w = pr.state_weights("WI", lats, lons)
    assert w[1, 0] > 0           # 43.0, -89.375: Madison
    assert w[0, 1] == 0          # 41.5, -87.5: Chicago, Illinois


def test_a_state_smaller_than_one_square_gets_the_nearest_square():
    w = pr.state_weights("DC", np.array([38.5, 39.0]), np.array([-77.5, -76.875]))
    assert (w > 0).sum() == 1


def fake_payload(cells, param="T2M"):
    """cells: {(lon, lat): {"200101": v, ...}}"""
    return {"header": {"fill_value": -999.0},
            "features": [{"geometry": {"coordinates": [lon, lat, 100]}, "properties": {"parameter": {param: vals}}}
                         for (lon, lat), vals in cells.items()]}


def test_parse_drops_fills_and_the_yearly_column_and_converts_rain():
    p = fake_payload({(-89.375, 43.0): {"202302": 2.0, "202303": -999.0, "202313": 9.0}}, "PRECTOTCORR")
    df = pr.parse_regional(p, "PRECTOTCORR", per_day=True)
    assert len(df) == 1 and df.value.iloc[0] == pytest.approx(56.0)   # 2 mm a day x 28 days


def test_state_mean_is_cos_latitude_weighted_inside_the_outline():
    cells = {(-89.375, 43.0): {"202301": 10.0}, (-89.375, 45.0): {"202301": 20.0},
             (-87.5, 41.5): {"202301": 99.0}}                  # the last one is in Illinois
    s = pr.weighted_state_mean(pr.parse_regional(fake_payload(cells), "T2M"), "WI")
    w43, w45 = np.cos(np.deg2rad(43)), np.cos(np.deg2rad(45))
    assert s.iloc[0] == pytest.approx((10 * w43 + 20 * w45) / (w43 + w45))


class FakeHttp:
    def __init__(self):
        self.calls = []

    def get(self, url, timeout, params):
        self.calls.append(params)
        lat = (params["latitude-min"] + params["latitude-max"]) / 2
        lon = (params["longitude-min"] + params["longitude-max"]) / 2
        cell = (round(lon / 0.625) * 0.625, round(lat * 2) / 2)
        payload = fake_payload({cell: {"202001": 1.0, "202002": 3.0}})
        return type("R", (), {"raise_for_status": lambda self: None, "json": lambda self: payload})()


def test_fetch_tiles_big_states_and_caches(tmp_path):
    http = FakeHttp()
    cfg = {"power": "T2M"}
    s = pr.fetch_state_monthly("TX", cfg, 2020, 2020, http=http, cache_dir=tmp_path)
    assert len(http.calls) == 4 and len(s) == 2
    again = pr.fetch_state_monthly("TX", cfg, 2020, 2020, http=http, cache_dir=tmp_path)
    assert len(http.calls) == 4 and again.tolist() == pytest.approx(s.tolist())


def test_grid_state_monthly_averages_our_files():
    lats, lons = np.arange(40, 48, 0.5), np.arange(-93, -86, 0.625)
    t = pd.date_range("2023-05-01", periods=2, freq="MS")
    da = xr.DataArray(np.ones((2, len(lats), len(lons))) * np.array([5.0, 30.0])[:, None, None],
                      coords={"time": t, "lat": lats, "lon": lons}, dims=("time", "lat", "lon"))
    s = pr.grid_state_monthly(da, "WI")
    assert s.tolist() == pytest.approx([5.0, 30.0])


def test_state_at_finds_the_state_of_a_point():
    assert pr.state_at(43.07, -89.40) == "WI"          # Madison
    assert pr.state_at(29.76, -95.37) == "TX"          # Houston
    assert pr.state_at(30.0, -60.0) is None            # Atlantic Ocean


def test_an_all_ocean_tile_does_not_break_the_state_average():
    import pandas as pd
    from sources import power_region
    land = pd.DataFrame({"month": [pd.Timestamp(2001, 1, 1)], "lat": [61.0], "lon": [-150.0], "value": [0.5]})
    ocean = pd.DataFrame([], columns=["month", "lat", "lon", "value"])            # what parse_regional gives an all-fill tile
    out = power_region.weighted_state_mean(pd.concat([ocean, land]), "AK")
    assert out.dtype == float and len(out) <= 1
