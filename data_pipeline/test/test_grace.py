"""GRACE mascons: US crop and the record's gaps (sources/grace.py). No network."""
import numpy as np
import pandas as pd
import xarray as xr

from sources.grace import crop_us, gaps


def test_crop_turns_0_360_longitudes_into_the_us_box():
    lon = np.arange(0.125, 360, 0.25)
    lat = np.arange(-89.875, 90, 0.25)
    time = pd.to_datetime(["2012-01-16"])
    v = np.zeros((1, len(lat), len(lon)), "float32")
    v[0, np.searchsorted(lat, 36.125), np.searchsorted(lon, 240.125)] = 5.0          # 240.125 E = 119.875 W
    ds = xr.Dataset({"lwe_thickness": (("time", "lat", "lon"), v), "uncertainty": (("time", "lat", "lon"), v)},
                    coords={"time": time, "lat": lat, "lon": lon})
    us = crop_us(ds)
    assert float(us.lon.min()) > -180 and float(us.lon.max()) <= -65 and 18 <= float(us.lat.min())
    assert float(us.lwe_thickness.isel(time=0).sel(lat=36.125, lon=-119.875)) == 5.0


def test_gaps_finds_runs_of_missing_months():
    times = pd.to_datetime(["2017-05-16", "2017-06-10", "2018-06-16", "2018-07-16", "2018-09-16"])
    assert gaps(times) == [("2017-07", "2018-05", 11), ("2018-08", "2018-08", 1)]
