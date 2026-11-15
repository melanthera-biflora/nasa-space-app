"""PM2.5 for a place (sources/pm25_merra2.py), with a fake grid file."""
import numpy as np
import pandas as pd
import xarray as xr

from sources.pm25_merra2 import FIRST_TREND_YEAR, pm25_series


def test_series_start_in_2010_because_the_model_steps_up_in_2009_10(tmp_path):
    t = pd.date_range("2001-01-01", "2025-12-01", freq="MS")
    da = xr.DataArray(np.full((len(t), 2, 2), 7.0), coords={"time": t, "lat": [47.5, 48.0], "lon": [-117.5, -116.875]},
                      dims=("time", "lat", "lon"), name="pm25")
    da.to_netcdf(tmp_path / "pm25.nc")
    s = pm25_series(47.66, -117.43, path=tmp_path / "pm25.nc")["pm25"]
    assert FIRST_TREND_YEAR == 2010
    assert s["annual"].index[0] == 2010 and s["annual"].index[-1] == 2025
    assert s["monthly"].index[0] == pd.Timestamp("2010-01-01")
