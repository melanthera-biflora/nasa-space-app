"""
Monthly land surface temperature (LST), day and night, from MODIS Terra: MOD11C3 v061 (0.05° climate-modelling grid).
How hot the ground and roofs get, not the air. A ONE-TIME build for the US.

Variables: LST_Day_CMG (~10:30 local) and LST_Night_CMG (~22:30), raw x 0.02 = kelvin, saved in °C. 0 = no data
           (water, or no clear day all month).
Where:     LP DAAC through the cloud OPeNDAP service (Earthdata login); only the US block of the two variables is
           fetched (~10 MB a month instead of a 70 MB HDF4 file, and no HDF4 reader is needed).
Grid:      saved at 0.1° (2 x 2 mean of the 0.05° squares; 0.05° over the US box would be ~6 GB). Box: 18-72 N, 180-65 W.
Why Terra: it matches our 1 km surface-heat card (MOD11A2) and starts in 2000; Aqua (MYD11C3, 13:30) starts mid-2002
           and has drifted too since 2022. Terra's overpass drifted >1 h earlier after 2020, so daytime values read cool
           from about 2023: trends should stop at 2022 like sources/modis_lst.py (LAST_CLEAN_YEAR).

How it works, ONE YEAR AT A TIME (stop with Ctrl+C any time, rerun to continue):
  1. find the year's 12 monthly files    2. fetch the US block of day and night LST (4 at a time)
  3. save data/modis_lst_years/lst_<year>.nc, skip years already done    4. join into data/modis_lst_monthly_us.nc

Test:   python -m sources.modis_lst_monthly 2020 2020      (run from the data_pipeline folder)
Run:    python -m sources.modis_lst_monthly                (2001-2025, resumable)
"""
import sys
import time
from concurrent.futures import ThreadPoolExecutor

import numpy as np
import pandas as pd
import xarray as xr

from paths import DATA_DIR as DATA
from sources.merra2_aod import dap_arrays, one_per_month
from sources.modis_lst import LAST_CLEAN_YEAR
from sources.no2_omi import opendap_url

YEARS_DIR = DATA / "modis_lst_years"
OUT = DATA / "modis_lst_monthly_us.nc"
GROUP = "/MODIS_MONTHLY_0_05DEG_CMG_LST/Data_Fields"
VARS = {"LST_Day_CMG": "lst_day", "LST_Night_CMG": "lst_night"}
# CMG grid: 3600 rows x 7200 columns of 0.05°, row 0 at 90 N, column 0 at 180 W.
ROWS = (360, 1439)      # 72 N .. 18 N
COLS = (0, 2299)        # 180 W .. 65 W
LAT = np.round(90 - 0.025 - 0.05 * np.arange(ROWS[0], ROWS[1] + 1), 3)
LON = np.round(-180 + 0.025 + 0.05 * np.arange(COLS[0], COLS[1] + 1), 3)
ENCODING = {v: {"zlib": True, "complevel": 4, "least_significant_digit": 1} for v in VARS.values()}  # ~0.1 °C


def to_celsius(raw):
    """MOD11C3 raw counts -> °C; 0 (no data) -> NaN."""
    a = np.asarray(raw, "float32")
    return np.where(a == 0, np.nan, a * 0.02 - 273.15).astype("float32")


def coarsen2(a):
    """2 x 2 mean of the squares that have data; NaN where all four are empty."""
    b = a.reshape(a.shape[0] // 2, 2, a.shape[1] // 2, 2)
    n = np.isfinite(b).sum(axis=(1, 3))
    return np.where(n > 0, np.nansum(b, axis=(1, 3)) / np.maximum(n, 1), np.nan).astype("float32")


def month_maps(arrays):
    """Day and night reply -> {name: (lat, lon) °C map at 0.1°}."""
    return {name: coarsen2(to_celsius(arrays[src][0]).reshape(len(LAT), len(LON))) for src, name in VARS.items()}


def build_year(year, earthaccess):
    out = YEARS_DIR / f"lst_{year}.nc"
    if out.exists():
        print(f"{year}: already done, skipping")
        return
    t0 = time.time()
    found = one_per_month(earthaccess.search_data(short_name="MOD11C3", version="061",
                                                  temporal=(f"{year}-01-01", f"{year}-12-31")), year)
    if len(found) != 12:
        print(f"{year}: WARNING found {len(found)} months, expected 12")
    session = earthaccess.get_requests_https_session()
    ce = ";".join(f"{GROUP}/{v}[{ROWS[0]}:1:{ROWS[1]}][{COLS[0]}:1:{COLS[1]}]" for v in VARS)
    with ThreadPoolExecutor(max_workers=4) as ex:
        maps = list(ex.map(lambda g: month_maps(dap_arrays(session, opendap_url(g), ce)), found.values()))
    lat2, lon2 = LAT.reshape(-1, 2).mean(1).round(3), LON.reshape(-1, 2).mean(1).round(3)
    ds = xr.Dataset({k: (("time", "lat", "lon"), np.stack([m[k] for m in maps])) for k in VARS.values()},
                    coords={"time": list(found), "lat": lat2, "lon": lon2}).sortby("lat")
    check_orientation(ds)
    YEARS_DIR.mkdir(parents=True, exist_ok=True)
    ds.to_netcdf(out, encoding=ENCODING)
    print(f"{year}: {len(found)} months in {time.time() - t0:.0f}s, {out.stat().st_size / 1e6:.0f} MB")


def check_orientation(ds):
    """Phoenix has land data and the middle of the Gulf of Mexico has none (MODIS skips water). If not, the rows are
    upside-down or shifted: stop instead of saving a wrong map."""
    land = ds.lst_day.sel(lat=33.45, lon=-112.07, method="nearest")
    sea = ds.lst_day.sel(lat=25.5, lon=-90.0, method="nearest")
    if not (land.notnull().any() and sea.isnull().all()):
        raise RuntimeError("MOD11C3 block looks misplaced (Phoenix empty or Gulf of Mexico filled); check ROWS/COLS")


def combine_years():
    files = sorted(YEARS_DIR.glob("lst_*.nc"))
    ds = xr.concat([xr.open_dataset(f) for f in files], dim="time").sortby("time")
    ds.attrs = {"source": "MODIS Terra MOD11C3 v061 monthly LST (LP DAAC OPeNDAP), 2x2 mean to 0.1 degree, "
                          "US box 18-72 N 180-65 W",
                "caveat": f"Terra orbit drift: daytime LST reads cool after {LAST_CLEAN_YEAR}; stop trends at {LAST_CLEAN_YEAR}"}
    ds.lst_day.attrs = {"units": "degC", "long_name": "daytime land surface temperature (~10:30 local)"}
    ds.lst_night.attrs = {"units": "degC", "long_name": "night-time land surface temperature (~22:30 local)"}
    ds.to_netcdf(OUT, encoding=ENCODING)
    print(f"Saved {OUT} ({OUT.stat().st_size / 1e6:.0f} MB): {ds.sizes['time']} months, "
          f"{str(ds.time.values[0])[:7]} to {str(ds.time.values[-1])[:7]}")


def build(start_year=2001, end_year=2025):
    import earthaccess
    earthaccess.login()
    for year in range(start_year, end_year + 1):
        build_year(year, earthaccess)
    combine_years()


def sanity_check(path=OUT):
    """Phoenix summers: the ground by day should be far hotter than by night."""
    with xr.open_dataset(path) as ds:
        p = ds.sel(lat=33.45, lon=-112.07, method="nearest").to_dataframe()
    summer = p[pd.DatetimeIndex(p.index).month.isin([6, 7, 8])]
    print(f"Phoenix Jun-Aug mean surface temperature: day {summer.lst_day.mean():.1f} °C, "
          f"night {summer.lst_night.mean():.1f} °C")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    if len(sys.argv) == 3:
        build(int(sys.argv[1]), int(sys.argv[2]))
    else:
        build()
    sanity_check()
