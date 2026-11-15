"""
Point series from the A3 data additions (docs/DATA_ADDITIONS.md): the nearest grid square of each built NetCDF file,
as {factor: {"annual": Series(index=year), "monthly": Series(index=month start)}} like every other source.

    smoke_days       NOAA HMS smoke polygons: days with medium or heavy smoke overhead, from 2011 (D37: light smoke is
                     often aloft and its outlining changed in 2022; Liu et al. 2024, Int. J. Wildland Fire 33, WF23148)
    aod              MERRA-2 total aerosol optical depth (550 nm), the challenge video's variable
    rain_sat         GPM IMERG Final: satellite rain, a second opinion beside NASA POWER (to Sep 2025)
    surface_heat_5km MODIS MOD11C3 day land-surface temperature, ~5 km; trend stops at 2022 (Terra drift)
    water_storage    GRACE/GRACE-FO water storage anomaly (regional, ~300 km), from 2002
"""

import pandas as pd
import xarray as xr

from paths import DATA_DIR

LAST_CLEAN_LST_YEAR = 2022      # same Terra drift cut as sources/modis_lst.py


def _open(name):
    """Opened for one read and closed after (with), not kept open: an open file holds its decompressed blocks, tens
    of MB each for the 5 km grids, which kept the API near 500 MB on a 512 MB server. Opening again costs milliseconds."""
    return xr.open_dataset(DATA_DIR / name)


def _point(name, var, lat, lon):
    """The nearest grid square, but only within one square of the point: the grids cover the lower 48 states, and a
    point outside them (Alaska, Hawaii) must not borrow the edge square, so sel raises and the card is 'not available'."""
    with _open(name) as ds:
        da = ds[var]
        step = max(abs(float(da.lat[1] - da.lat[0])), abs(float(da.lon[1] - da.lon[0])))
        s = da.sel(lat=lat, lon=lon, method="nearest", tolerance=step).load().to_series().astype(float)
    s.index = pd.to_datetime(s.index).to_period("M").to_timestamp()
    return s.groupby(level=0).mean()          # GRACE can have two solutions in one calendar month


def _yearly(monthly, agg="mean", months=None, min_months=12):
    """Yearly values from years with enough months (all 12 by default); `months` limits to a season (JJA)."""
    m = monthly.dropna()
    if months:
        m = m[m.index.month.isin(months)]
    g = m.groupby(m.index.year)
    return getattr(g, agg)()[g.count() >= (len(months) if months else min_months)]


SMOKE_FROM = "2011-01-01"        # density tags are patchy before June 2010, so medium + heavy starts with the first full year


def smoke_days_series(lat, lon):
    with _open("hms_smoke_days.nc"):                # fail early if the file isn't built
        pass
    m = _point("hms_smoke_days.nc", "smoke_days_mh", lat, lon)
    m = m[m.index >= SMOKE_FROM]
    return {"smoke_days": {"annual": _yearly(m, "sum"), "monthly": m}}


def aod_series(lat, lon):
    m = _point("aod_monthly_us.nc", "aod", lat, lon)
    return {"aod": {"annual": _yearly(m), "monthly": m}}


def rain_sat_series(lat, lon):
    m = _point("imerg_monthly_us.nc", "rain", lat, lon)
    return {"rain_sat": {"annual": _yearly(m, "sum"), "monthly": m}}


def surface_heat_5km_series(lat, lon):
    m = _point("modis_lst_monthly_us.nc", "lst_day", lat, lon)
    m = m[m.index.year <= LAST_CLEAN_LST_YEAR]
    return {"surface_heat_5km": {"annual": _yearly(m, "mean", months=(6, 7, 8)), "monthly": m}}


def water_storage_series(lat, lon):
    m = _point("grace_lwe_us.nc", "lwe_thickness", lat, lon)
    return {"water_storage": {"annual": _yearly(m, "mean", min_months=9), "monthly": m}}


# The same series for a whole US state (sources/power_region.py outlines, cos-latitude weights).
GRID = {   # key: (file, variable, how a year is made, season months, minimum months)
    "smoke_days": ("hms_smoke_days.nc", "smoke_days_mh", "sum", None, 12),
    "aod": ("aod_monthly_us.nc", "aod", "mean", None, 12),
    "rain_sat": ("imerg_monthly_us.nc", "rain", "sum", None, 12),
    "surface_heat_5km": ("modis_lst_monthly_us.nc", "lst_day", "mean", (6, 7, 8), 12),
    "water_storage": ("grace_lwe_us.nc", "lwe_thickness", "mean", None, 9),
}
FIRST_YEAR = {"smoke_days": 2011, "aod": 2001, "rain_sat": 2001, "surface_heat_5km": 2001, "water_storage": 2002}


def state_series(code, key):
    from sources.power_region import grid_state_monthly
    name, var, agg, months, min_months = GRID[key]
    with _open(name) as ds:
        m = grid_state_monthly(ds[var], code).astype(float)
    m.index = pd.to_datetime(m.index).to_period("M").to_timestamp()
    m = m.groupby(level=0).mean()
    if key == "smoke_days":
        m = m[m.index >= SMOKE_FROM]
    if key == "surface_heat_5km":
        m = m[m.index.year <= LAST_CLEAN_LST_YEAR]
    return {"annual": _yearly(m, agg, months, min_months), "monthly": m}
