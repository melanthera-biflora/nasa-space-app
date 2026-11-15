"""
Aerosol optical depth (AOD) from MERRA-2: how hazy the whole air column is (smoke, dust, pollution haze).
A ONE-TIME build for the US, from the same collection as our PM2.5 (M2TMNXAER v5.12.4, monthly means, 0.5° x 0.625°).
data/pm25_monthly_global.nc is not touched.

Variable: TOTEXTTAU, "Total Aerosol Extinction AOT [550 nm]", no unit (about 0.1 is clear air, 0.5 and up very hazy).
Where:    NASA GES DISC through the cloud OPeNDAP service (Earthdata login). We ask for only the US block of the one
          variable (~80 kB a month) instead of the 80 MB file, so the build moves ~25 MB instead of ~24 GB.
Box:      18-72 N, 180-65 W (lower 48, Alaska, Hawaii).

How it works, ONE YEAR AT A TIME (stop with Ctrl+C any time, rerun to continue):
  1. find that year's 12 monthly files
  2. fetch the US block of TOTEXTTAU for each month (4 at a time)
  3. save data/aod_years/aod_<year>.nc, skip years already done
  4. at the end join everything into data/aod_monthly_us.nc

Test:   python -m sources.merra2_aod 2023 2023        (run from the data_pipeline folder)
Run:    python -m sources.merra2_aod                  (2001-2025, resumable)
Lookup: from sources.merra2_aod import aod_monthly_for_point; aod_monthly_for_point(43.04, -87.91)

What it can't see: AOD is the whole column, so a smoke layer high overhead counts the same as smoke at the ground.
"""
import io
import sys
import time
from concurrent.futures import ThreadPoolExecutor

import h5py
import numpy as np
import pandas as pd
import xarray as xr

from paths import DATA_DIR as DATA
from sources.no2_omi import opendap_url

YEARS_DIR = DATA / "aod_years"
OUT = DATA / "aod_monthly_us.nc"
# MERRA-2 grid: lat -90..90 by 0.5 (361 rows), lon -180..179.375 by 0.625 (576 columns). US box:
ROWS = (216, 324)       # 18 N .. 72 N
COLS = (0, 184)         # 180 W .. 65 W
LAT = -90 + 0.5 * np.arange(ROWS[0], ROWS[1] + 1)
LON = -180 + 0.625 * np.arange(COLS[0], COLS[1] + 1)


def dap_arrays(session, url, ce):
    """One OPeNDAP DAP4 request for the slices in `ce` -> {variable name: (array, attributes)}.
    The reply is a small NetCDF-4 file; group names in it can differ from the source file, so match by name."""
    r = session.get(url + ".dap.nc4", params={"dap4.ce": ce}, timeout=300)
    r.raise_for_status()
    out = {}
    with h5py.File(io.BytesIO(r.content), "r") as f:
        f.visititems(lambda n, o: out.__setitem__(n.rsplit("/", 1)[-1], (o[()], dict(o.attrs)))
                     if isinstance(o, h5py.Dataset) else None)
    return out


def granule_month(granule):
    t = granule["umm"]["TemporalExtent"]["RangeDateTime"]["BeginningDateTime"]
    return pd.Timestamp(t[:7] + "-01")


def one_per_month(results, year):
    """Granules of `year`, one per month. A reprocessed month (MERRA2_401, a later V07 letter) sorts last and wins."""
    by_month = {granule_month(g): g for g in sorted(results, key=lambda g: g["umm"]["GranuleUR"])}
    return {m: g for m, g in sorted(by_month.items()) if m.year == year}


def aod_block(arrays):
    """TOTEXTTAU reply -> (lat, lon) float32 map, fill values as NaN, after checking the box is the one we asked for."""
    tau, attrs = arrays["TOTEXTTAU"]
    if not (np.allclose(arrays["lat"][0], LAT) and np.allclose(arrays["lon"][0], LON)):
        raise RuntimeError("MERRA-2 grid is not where we expected; stop and check ROWS/COLS")
    a = np.asarray(tau, "float32").reshape(len(LAT), len(LON))
    fill = np.asarray(attrs.get("_FillValue", 1e15)).ravel()[0]
    a[(a == fill) | (a > 1e10) | ~np.isfinite(a)] = np.nan
    return a


def build_year(year, earthaccess):
    out = YEARS_DIR / f"aod_{year}.nc"
    if out.exists():
        print(f"{year}: already done, skipping")
        return
    t0 = time.time()
    found = one_per_month(earthaccess.search_data(short_name="M2TMNXAER", version="5.12.4",
                                                  temporal=(f"{year}-01", f"{year}-12")), year)
    if len(found) != 12:
        print(f"{year}: WARNING found {len(found)} months, expected 12")
    session = earthaccess.get_requests_https_session()
    ce = (f"/TOTEXTTAU[0:1:0][{ROWS[0]}:1:{ROWS[1]}][{COLS[0]}:1:{COLS[1]}];"
          f"/lat[{ROWS[0]}:1:{ROWS[1]}];/lon[{COLS[0]}:1:{COLS[1]}]")
    with ThreadPoolExecutor(max_workers=4) as ex:
        maps = list(ex.map(lambda g: aod_block(dap_arrays(session, opendap_url(g), ce)), found.values()))
    da = xr.DataArray(np.stack(maps), name="aod", dims=("time", "lat", "lon"),
                      coords={"time": list(found), "lat": LAT, "lon": LON})
    YEARS_DIR.mkdir(parents=True, exist_ok=True)
    da.to_netcdf(out, encoding={"aod": {"zlib": True, "complevel": 4}})
    print(f"{year}: done in {time.time() - t0:.0f}s, US-box mean AOD {float(da.mean()):.3f}")


def combine_years():
    da = xr.concat([xr.open_dataarray(f) for f in sorted(YEARS_DIR.glob("aod_*.nc"))], dim="time").sortby("time")
    da.attrs = {"units": "1", "long_name": "Total aerosol extinction AOT at 550 nm (TOTEXTTAU)",
                "source": "MERRA-2 M2TMNXAER v5.12.4 monthly means, GES DISC OPeNDAP, US box 18-72 N 180-65 W"}
    da.to_netcdf(OUT, encoding={"aod": {"zlib": True, "complevel": 4}})
    print(f"Saved {OUT} ({OUT.stat().st_size / 1e6:.1f} MB): {da.sizes['time']} months, "
          f"{str(da.time.values[0])[:7]} to {str(da.time.values[-1])[:7]}")


def build(start_year=2001, end_year=2025):
    import earthaccess
    earthaccess.login()     # EARTHDATA_TOKEN or EARTHDATA_USERNAME/PASSWORD env vars or .netrc first, prompt last
    for year in range(start_year, end_year + 1):
        build_year(year, earthaccess)
    combine_years()


def aod_monthly_for_point(lat, lon, path=OUT):
    with xr.open_dataarray(path) as da:
        s = da.sel(lat=lat, lon=lon, method="nearest").to_series()
    return s.astype(float).round(3)


def sanity_check(path=OUT):
    """Wisconsin's June 2023 (Canadian wildfire smoke) should stand out among its Junes."""
    from sources.power_region import grid_state_monthly
    with xr.open_dataarray(path) as da:
        wi = grid_state_monthly(da.load(), "WI")
    june, d = wi[wi.index.month == 6], pd.Timestamp("2023-06-01")
    if d in june:
        print(f"Wisconsin June AOD: 2023 = {june[d]:.3f}, median of the other Junes = {june.drop(d).median():.3f}, "
              f"2023 ranks {int(june.rank(ascending=False)[d])} of {len(june)}")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    if len(sys.argv) == 3:
        build(int(sys.argv[1]), int(sys.argv[2]))
    else:
        build()
    sanity_check()
