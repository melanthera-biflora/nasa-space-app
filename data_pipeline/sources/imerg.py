"""
Monthly rain from GPM IMERG Final Run V07 (GPM_3IMERGM, 0.1° ≈ 10 km): rain and snow water from satellites,
calibrated to rain gauges. A ONE-TIME build for the US.

Variable: precipitation, stored by NASA as a monthly mean rate in mm/hr; we save mm in the month
          (rate x 24 x days in the month).
Where:    NASA GES DISC through the cloud OPeNDAP service (Earthdata login); only the US block of the one variable
          is fetched (~2.5 MB a month instead of an 18 MB file).
Box:      18-72 N, 180-65 W (lower 48, Alaska, Hawaii). Period: Jan 2001 to the last Final month (Final runs about
          3-4 months behind; the last one is printed at the end).

How it works, ONE YEAR AT A TIME (stop with Ctrl+C any time, rerun to continue):
  1. find that year's monthly files    2. fetch the US block of each (4 at a time)
  3. save data/imerg_years/imerg_<year>.nc (a year that is not yet complete is redone on the next run)
  4. join everything into data/imerg_monthly_us.nc

Test:   python -m sources.imerg 2017 2017         (run from the data_pipeline folder)
Run:    python -m sources.imerg                   (2001-2025, resumable)
"""
import calendar
import sys
import time
from concurrent.futures import ThreadPoolExecutor

import numpy as np
import pandas as pd
import xarray as xr

from paths import DATA_DIR as DATA
from sources.merra2_aod import dap_arrays, one_per_month
from sources.no2_omi import opendap_url

YEARS_DIR = DATA / "imerg_years"
OUT = DATA / "imerg_monthly_us.nc"
# IMERG grid: cell centres lat -89.95..89.95 (1800), lon -179.95..179.95 (3600); precipitation is (time, lon, lat).
ROWS = (1080, 1619)     # lat 18.05 .. 71.95
COLS = (0, 1149)        # lon -179.95 .. -65.05
LAT = np.round(-89.95 + 0.1 * np.arange(ROWS[0], ROWS[1] + 1), 2)
LON = np.round(-179.95 + 0.1 * np.arange(COLS[0], COLS[1] + 1), 2)
ENCODING = {"rain": {"zlib": True, "complevel": 4, "least_significant_digit": 0}}   # whole mm: a third smaller


def to_mm_per_month(rate, units, month):
    """IMERG monthly mean rate -> mm in that month. Refuses units we haven't checked."""
    u = units.decode() if isinstance(units, bytes) else str(units)
    if u.strip() not in ("mm/hr", "mm/h", "mm hr-1"):
        raise RuntimeError(f"unexpected IMERG units {u!r}; check the file before converting")
    return rate * 24 * calendar.monthrange(month.year, month.month)[1]


def rain_block(arrays, month):
    """precipitation reply (1, lon, lat) -> (lat, lon) mm in the month, fill values as NaN."""
    p, attrs = arrays["precipitation"]
    if not (np.allclose(arrays["lat"][0], LAT, atol=1e-3) and np.allclose(arrays["lon"][0], LON, atol=1e-3)):
        raise RuntimeError("IMERG grid is not where we expected; stop and check ROWS/COLS")
    a = np.asarray(p, "float32").reshape(len(LON), len(LAT)).T.copy()
    a[(a < 0) | ~np.isfinite(a)] = np.nan                              # fill is -9999.9
    return to_mm_per_month(a, attrs.get("units", b""), month).astype("float32")


def build_year(year, earthaccess):
    out = YEARS_DIR / f"imerg_{year}.nc"
    if out.exists():
        print(f"{year}: already done, skipping")
        return
    t0 = time.time()
    found = one_per_month(earthaccess.search_data(short_name="GPM_3IMERGM", version="07",
                                                  temporal=(f"{year}-01-01", f"{year}-12-31")), year)
    if not found:
        print(f"{year}: no Final files yet")
        return
    session = earthaccess.get_requests_https_session()
    ce = f"/Grid/precipitation[0:1:0][{COLS[0]}:1:{COLS[1]}][{ROWS[0]}:1:{ROWS[1]}];" \
         f"/Grid/lat[{ROWS[0]}:1:{ROWS[1]}];/Grid/lon[{COLS[0]}:1:{COLS[1]}]"
    with ThreadPoolExecutor(max_workers=4) as ex:
        maps = list(ex.map(lambda mg: rain_block(dap_arrays(session, opendap_url(mg[1]), ce), mg[0]), found.items()))
    months = list(found)
    da = xr.DataArray(np.stack(maps), name="rain", dims=("time", "lat", "lon"),
                      coords={"time": months, "lat": LAT, "lon": LON})
    YEARS_DIR.mkdir(parents=True, exist_ok=True)
    part = out.with_suffix(".part.nc")                  # a year still missing months is redone on the next run
    da.to_netcdf(part if len(months) < 12 else out, encoding=ENCODING)
    if len(months) == 12:
        part.unlink(missing_ok=True)
    print(f"{year}: {len(months)} months in {time.time() - t0:.0f}s, US-box mean {float(da.mean()):.0f} mm/month")


def combine_years():
    files = sorted(YEARS_DIR.glob("imerg_*.nc"))
    da = xr.concat([xr.open_dataarray(f) for f in files], dim="time").sortby("time")
    da.attrs = {"units": "mm per month", "long_name": "precipitation (IMERG Final V07 monthly mean rate x hours in month)",
                "source": "GPM IMERG Final Run V07 GPM_3IMERGM, GES DISC OPeNDAP, US box 18-72 N 180-65 W"}
    da.to_netcdf(OUT, encoding=ENCODING)
    print(f"Saved {OUT} ({OUT.stat().st_size / 1e6:.0f} MB): {da.sizes['time']} months, "
          f"{str(da.time.values[0])[:7]} to {str(da.time.values[-1])[:7]}")


def build(start_year=2001, end_year=2025):
    import earthaccess
    earthaccess.login()
    for year in range(start_year, end_year + 1):
        build_year(year, earthaccess)
    combine_years()


def sanity_check(path=OUT):
    """Houston in August 2017 (Hurricane Harvey) should dwarf its other Augusts."""
    with xr.open_dataarray(path) as da:
        s = da.sel(lat=29.76, lon=-95.37, method="nearest").to_series()
    aug, d = s[s.index.month == 8], pd.Timestamp("2017-08-01")
    if d in aug:
        print(f"Houston August rain: 2017 = {aug[d]:.0f} mm, median of the other Augusts = {aug.drop(d).median():.0f} mm")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    if len(sys.argv) == 3:
        build(int(sys.argv[1]), int(sys.argv[2]))
    else:
        build()
    sanity_check()
