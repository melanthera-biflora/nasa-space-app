"""
PM2.5 from MERRA-2 (NASA). A ONE-TIME job: it builds a global PM2.5 file that the
backend then reads instantly for any location. Not run when a user clicks.

Why a separate script: PM2.5 is NOT in the NASA POWER API. It comes from the
MERRA-2 aerosol collection M2TMNXAER (monthly means, ~50 km grid), and you
need a free NASA Earthdata account.

How it works, ONE YEAR AT A TIME (so you can stop and restart safely):
  1. Download that year's 12 monthly files (8 at once, in parallel)
  2. For each month, rebuild surface PM2.5 from its parts (GES DISC formula):
        PM2.5 = DUSMASS25 + SSSMASS25 + BCSMASS + OCSMASS + SO4SMASS * (132.14 / 96.06)
     Units come in kg/m3 -> multiply by 1e9 to get ug/m3
  3. Save that year's 12 monthly maps -> data/pm25_years/pm25_<year>.nc (~5-10 MB)
  4. Delete the big downloaded files to save disk space
  5. Years that are already saved are SKIPPED. Stop with Ctrl+C any time;
     run the same command again and it continues where it left off.
  6. At the end, join all years into data/pm25_monthly_global.nc (~100-250 MB)
     -> monthly values feed the technical charts, yearly averages feed the trend

Setup:   pip install earthaccess xarray netCDF4 h5netcdf h5py
Test:    python -m sources.pm25_merra2 2025 2025      (run from the data_pipeline folder)     (1 year = 12 files)
Run:     python -m sources.pm25_merra2               (2001-2025, resumable)
Lookup:  from sources.pm25_merra2 import pm25_monthly_for_point; pm25_monthly_for_point(33.45, -112.07)

Known limitation (say it on the card / in Q&A): MERRA-2 PM2.5 has no nitrate and is
a ~50 km average, so it can read lower than a city air-quality monitor.
"""
import shutil
import sys
import time

import pandas as pd
import xarray as xr

from paths import DATA_DIR as DATA
YEARS_DIR = DATA / "pm25_years"
RAW_DIR = DATA / "raw_tmp"
OUT = DATA / "pm25_monthly_global.nc"
ENCODING = {"pm25": {"zlib": True, "complevel": 4, "chunksizes": (12, 91, 144)}}
VARS = ["DUSMASS25", "SSSMASS25", "BCSMASS", "OCSMASS", "SO4SMASS"]


def pm25_from_file(path):
    with xr.open_dataset(path) as ds:
        ds = ds[VARS]
        pm = (ds.DUSMASS25 + ds.SSSMASS25 + ds.BCSMASS + ds.OCSMASS
              + ds.SO4SMASS * (132.14 / 96.06)) * 1e9
        return pm.load()


def build_year(year, earthaccess):
    out = YEARS_DIR / f"pm25_{year}.nc"
    if out.exists():
        print(f"{year}: already done, skipping")
        return
    t0 = time.time()
    results = earthaccess.search_data(short_name="M2TMNXAER",
                                      temporal=(f"{year}-01", f"{year}-12"))
    if len(results) != 12:
        print(f"{year}: WARNING found {len(results)} files, expected 12")
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    files = earthaccess.download(results, local_path=str(RAW_DIR), threads=8)

    months = [pm25_from_file(f) for f in sorted(files)]
    monthly = xr.concat(months, dim="time").sortby("time").rename("pm25").astype("float32")
    YEARS_DIR.mkdir(parents=True, exist_ok=True)
    monthly.to_netcdf(out, encoding=ENCODING)

    shutil.rmtree(RAW_DIR)   # free disk space
    print(f"{year}: done in {time.time() - t0:.0f}s, global mean {float(monthly.mean()):.2f} ug/m3")


def combine_years():
    files = sorted(YEARS_DIR.glob("pm25_*.nc"))
    da = xr.concat([xr.open_dataarray(f) for f in files], dim="time").sortby("time")
    da.attrs = {"units": "ug m-3", "source": "MERRA-2 M2TMNXAER, GES DISC PM2.5 formula"}
    da.to_netcdf(OUT, encoding=ENCODING)
    print(f"Saved {OUT}: {da.sizes['time']} months, "
          f"{str(da.time.values[0])[:7]} to {str(da.time.values[-1])[:7]}")


def build_global_pm25(start_year=2001, end_year=2025):
    import earthaccess
    earthaccess.login(strategy="interactive", persist=True)  # asks once, then remembers
    for year in range(start_year, end_year + 1):
        build_year(year, earthaccess)
    combine_years()


def pm25_monthly_for_point(lat, lon, path=OUT):
    """Monthly PM2.5 (pd.Series, index = month dates) for the nearest grid cell.
    Pass this to pipeline.build_report(..., pm25_monthly=...)."""
    with xr.open_dataarray(path) as da:
        s = da.sel(lat=lat, lon=lon, method="nearest").to_series()
    return s.astype(float).round(2)


def pm25_series(lat, lon, path=OUT):
    """What pipeline.build_report() calls: annual mean + monthly values."""
    m = pm25_monthly_for_point(lat, lon, path)
    m.index = pd.to_datetime(m.index)
    return {"pm25": {"annual": m.groupby(m.index.year).mean(), "monthly": m}}


def pm25_for_point(lat, lon, path=OUT):
    """Yearly average PM2.5 (pd.Series, index = year), handy for a quick look."""
    s = pm25_monthly_for_point(lat, lon, path)
    return s.groupby(s.index.year).mean().round(2)


if __name__ == "__main__":
    if len(sys.argv) == 3:
        build_global_pm25(int(sys.argv[1]), int(sys.argv[2]))
    else:
        build_global_pm25()
    print(pm25_for_point(33.45, -112.07))
