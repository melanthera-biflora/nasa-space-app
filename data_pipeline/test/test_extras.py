"""Point series from the A3 data files (sources/extras.py), on tiny fake grids: no real data files needed."""
import numpy as np
import pandas as pd
import pytest
import xarray as xr

from sources import extras


@pytest.fixture
def files(tmp_path, monkeypatch):
    t = pd.date_range("2001-01-01", "2025-12-01", freq="MS")
    lat, lon = np.array([45.0, 45.5]), np.array([-123.125, -122.5])
    grid = lambda v: (("time", "lat", "lon"), np.broadcast_to(np.asarray(v, float)[:, None, None], (len(t), 2, 2)).copy())
    month = t.month.to_numpy()
    mh = np.where(month == 8, 4.0, 0.0)
    mh[t < "2010-06-01"] = np.nan                                                                       # no density tags yet
    xr.Dataset({"smoke_days": grid(np.where(month == 8, 10, 1)), "smoke_days_mh": grid(mh), "smoke_days_year": (("year",), np.ones(25))},
               coords={"time": t, "lat": lat, "lon": lon, "year": np.arange(2001, 2026)}).to_netcdf(tmp_path / "hms_smoke_days.nc")
    xr.Dataset({"lst_day": grid(np.where(np.isin(month, [6, 7, 8]), 40.0, 10.0))},
               coords={"time": t, "lat": lat[::-1], "lon": lon}).to_netcdf(tmp_path / "modis_lst_monthly_us.nc")   # north to south
    lwe = np.arange(len(t), dtype=float)
    lwe[(t.year == 2018) & (month <= 5)] = np.nan                                                             # GRACE gap
    xr.Dataset({"lwe_thickness": grid(lwe)}, coords={"time": t, "lat": lat, "lon": lon}).to_netcdf(tmp_path / "grace_lwe_us.nc")
    rain = t[t < "2025-10-01"]
    xr.Dataset({"rain": (("time", "lat", "lon"), np.full((len(rain), 2, 2), 50.0))},
               coords={"time": rain, "lat": lat, "lon": lon}).to_netcdf(tmp_path / "imerg_monthly_us.nc")
    monkeypatch.setattr(extras, "DATA_DIR", tmp_path)
    extras._open.cache_clear()
    yield
    extras._open.cache_clear()


def test_smoke_days_count_medium_and_heavy_smoke_from_2011(files):
    # D37: light smoke is left out (often aloft; its outlining changed in 2022), so the record starts with full density tags
    s = extras.smoke_days_series(45.1, -123.0)["smoke_days"]
    assert s["monthly"].index.min() == pd.Timestamp("2011-01-01")
    assert s["annual"].loc[2012] == 4 and s["annual"].index.min() == 2011


def test_ground_heat_is_the_summer_mean_and_stops_at_2022(files):
    s = extras.surface_heat_5km_series(45.4, -122.6)["surface_heat_5km"]
    assert s["annual"].loc[2010] == pytest.approx(40.0)
    assert s["annual"].index.max() == 2022 and s["monthly"].index.max().year == 2022


def test_water_storage_needs_nine_months_and_rain_complete_years(files):
    w = extras.water_storage_series(45.0, -123.1)["water_storage"]["annual"]
    assert 2018 not in w.index and 2019 in w.index              # 2018 keeps only 7 months: fewer than 9, left out
    r = extras.rain_sat_series(45.0, -123.1)["rain_sat"]["annual"]
    assert r.loc[2024] == pytest.approx(600) and 2025 not in r.index


def test_a_point_outside_the_grid_gets_no_value(files):
    with pytest.raises(KeyError):                       # Anchorage must not borrow the grid's edge square
        extras.smoke_days_series(61.2, -149.9)
