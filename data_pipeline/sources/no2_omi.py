"""
NO2 (traffic & industry pollution) from NASA OMI — ONE-TIME build for the US, like PM2.5.

Data:   OMNO2d version 004 (OMI/Aura NO2 Cloud-Screened Total and Tropospheric Column, daily L3, 0.25° ≈ 25 km)
        variable ColumnAmountNO2TropCloudScreened, units molecules/cm²  (we store ×10¹⁵)
Where:  NASA GES DISC through its cloud OPeNDAP service (needs an Earthdata login; see README)
Period: OMI starts Oct 2004 -> we use 2005-2025.

How it works, ONE YEAR AT A TIME (stop with Ctrl+C any time, rerun to continue):
  1. find that year's ~365 daily files (version 004 only)
  2. ask OPeNDAP for just the US block of the one NO2 variable (~0.4 MB a day instead of an 11 MB file),
     8 days at a time
  3. average the days of each month (a cell needs at least 5 valid days) -> 12 monthly US maps
  4. save data/no2_years/no2_<year>.nc, skip years already done
  5. at the end join everything into data/no2_monthly_global.nc (US only, despite the name)

Time:   untested estimate 1-3 min per year. Do the 1-year test first and note its time.
Test:   python -m sources.no2_omi 2024 2024        (run from the data_pipeline folder)
Run:    python -m sources.no2_omi                 (2005-2025, resumable)
Lookup: from sources.no2_omi import no2_series; no2_series(33.45, -112.07)
"""
import io
import re
import sys
import time
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor

import h5py
import numpy as np
import pandas as pd
import xarray as xr

from paths import DATA_DIR as DATA
YEARS_DIR = DATA / "no2_years"
OUT = DATA / "no2_monthly_global.nc"
VAR = "ColumnAmountNO2TropCloudScreened"
DATE_RE = re.compile(r"(\d{4})m(\d{2})(\d{2})")
# The global grid is 720 x 1440 cells of 0.25°, row 0 at 90 S (OMNO2 README). US + Alaska + Hawaii:
US_ROWS = (432, 647)    # 18.125 .. 71.875 N
US_COLS = (0, 459)      # 179.875 W .. 65.125 W
LAT = -90 + 0.125 + 0.25 * np.arange(US_ROWS[0], US_ROWS[1] + 1)
LON = -180 + 0.125 + 0.25 * np.arange(US_COLS[0], US_COLS[1] + 1)
MIN_DAYS = 5            # valid days a cell needs for a monthly mean


def file_date(name):
    m = DATE_RE.search(str(name))
    return pd.Timestamp(int(m[1]), int(m[2]), int(m[3])) if m else None


def opendap_url(granule):
    return next(u["URL"] for u in granule["umm"]["RelatedUrls"] if u.get("Subtype") == "OPENDAP DATA")


def var_path(dmr_xml):
    """Full DAP4 path of the NO2 variable from a granule's metadata (group names differ from the HDF file's)."""
    def walk(node, path):
        for child in node:
            name = child.get("name")
            if child.tag.split("}")[-1] == "Group":
                found = walk(child, path + [name])
                if found:
                    return found
            elif name == VAR:
                return "/" + "/".join(path + [name])
        return None
    found = walk(ET.fromstring(dmr_xml), [])
    if not found:
        raise RuntimeError(f"{VAR} not found in the OPeNDAP metadata")
    return found


def read_block(nc4_bytes):
    """The NO2 array from one OPeNDAP response (a small NetCDF-4 file), in ×10¹⁵ with fill values as NaN."""
    found = []
    with h5py.File(io.BytesIO(nc4_bytes), "r") as f:
        f.visititems(lambda name, obj: found.append(obj[()]) if isinstance(obj, h5py.Dataset) and name.endswith(VAR) else None)
    if not found:
        raise RuntimeError(f"{VAR} missing from the OPeNDAP response")
    a = np.asarray(found[0], dtype="float32")
    a[(a < -1e20) | ~np.isfinite(a)] = np.nan          # fill value is -2**100
    return a / 1e15


def fetch_block(session, url, path, rows=US_ROWS, cols=US_COLS):
    r = session.get(url + ".dap.nc4", params={"dap4.ce": f"{path}[{rows[0]}:1:{rows[1]}][{cols[0]}:1:{cols[1]}]"},
                    timeout=300)
    r.raise_for_status()
    return read_block(r.content)


def check_orientation(session, url, path):
    """The README says row 0 is 90 S. If that were wrong, the 'US' block would be the southern ocean,
    which has much less NO2 than its mirror in the north. Stop instead of saving a flipped map."""
    us = np.nanmean(fetch_block(session, url, path))
    mirror = np.nanmean(fetch_block(session, url, path, rows=(719 - US_ROWS[1], 719 - US_ROWS[0])))
    if not us > mirror:
        raise RuntimeError(f"The US block ({us:.2f}) has less NO2 than its southern mirror ({mirror:.2f}): "
                           "the grid looks upside-down. Stop and check the OMNO2d README.")


def build_year(year, earthaccess):
    out = YEARS_DIR / f"no2_{year}.nc"
    if out.exists():
        print(f"{year}: already done, skipping")
        return
    t0 = time.time()
    # pin v004: v003 stops in March 2026 and its values differ, so mixing versions fakes jumps in the trend
    results = earthaccess.search_data(short_name="OMNO2d", version="004",
                                      temporal=(f"{year}-01-01", f"{year}-12-31"))
    by_day = {d: r for r in results if (d := file_date(r["umm"]["GranuleUR"])) is not None}
    days = sorted(by_day)
    print(f"{year}: {len(days)} daily files")
    if not days:
        return
    session = earthaccess.get_requests_https_session()
    urls = {d: opendap_url(by_day[d]) for d in days}
    path = var_path(session.get(urls[days[0]] + ".dmr.xml", timeout=120).content)
    check_orientation(session, urls[days[0]], path)

    def one_day(d):
        try:
            return fetch_block(session, urls[d], path)
        except Exception as e:  # noqa: BLE001 - one bad day is skipped, like a cloudy day
            print(f"  skip {d.date()}: {type(e).__name__}")
            return None

    sums, counts = {}, {}
    with ThreadPoolExecutor(max_workers=8) as ex:
        for i, (d, a) in enumerate(zip(days, ex.map(one_day, days)), 1):
            if a is None:
                continue
            k = d.month
            if k not in sums:
                sums[k], counts[k] = np.zeros_like(a), np.zeros_like(a)
            ok = np.isfinite(a)
            sums[k][ok] += a[ok]
            counts[k][ok] += 1
            if i % 30 == 0:
                print(f"  {i}/{len(days)}  {d.date()}", end="\r")
    print()
    if not sums:
        print(f"{year}: no data")
        return
    months = sorted(sums)
    with np.errstate(invalid="ignore", divide="ignore"):
        cube = np.stack([np.where(counts[m] >= MIN_DAYS, sums[m] / counts[m], np.nan) for m in months])
    da = xr.DataArray(cube.astype("float32"), name="no2",
                      coords={"time": [pd.Timestamp(year, m, 1) for m in months], "lat": LAT, "lon": LON},
                      dims=("time", "lat", "lon"))
    YEARS_DIR.mkdir(parents=True, exist_ok=True)
    da.to_netcdf(out, encoding={"no2": {"zlib": True, "complevel": 4}})
    print(f"{year}: done in {time.time() - t0:.0f}s")


def combine_years():
    files = sorted(YEARS_DIR.glob("no2_*.nc"))
    # crop to the US box: year files from the older global build are 30x bigger than needed
    crop = dict(lat=slice(LAT[0] - 0.1, LAT[-1] + 0.1), lon=slice(LON[0] - 0.1, LON[-1] + 0.1))
    da = xr.concat([xr.open_dataarray(f).sel(**crop) for f in files], dim="time").sortby("time")
    da.attrs = {"units": "1e15 molecules cm-2", "source": "NASA OMI OMNO2d v004 ColumnAmountNO2TropCloudScreened, US crop"}
    nlat, nlon = da.sizes["lat"], da.sizes["lon"]
    da.to_netcdf(OUT, encoding={"no2": {"zlib": True, "complevel": 4,
                                        "chunksizes": (12, min(90, nlat), min(180, nlon))}})
    print(f"Saved {OUT}: {da.sizes['time']} months")


def build_global_no2(start_year=2005, end_year=2025):
    import earthaccess
    earthaccess.login(persist=True)   # EARTHDATA_USERNAME/PASSWORD or EARTHDATA_TOKEN env vars or .netrc first, prompt last
    for y in range(start_year, end_year + 1):
        build_year(y, earthaccess)
    combine_years()


def no2_series(lat, lon, path=OUT):
    """What pipeline.build_report() calls. Outside the US crop it raises, so the card says 'not available'."""
    with xr.open_dataarray(path) as da:
        m = da.sel(lat=lat, lon=lon, method="nearest", tolerance=0.25).to_series().astype(float)
    m.index = pd.to_datetime(m.index)
    g = m.groupby(m.index.year)
    annual = g.mean()[g.count() >= 9]          # need at least 9 months for a fair yearly average
    return {"no2": {"annual": annual, "monthly": m}}


if __name__ == "__main__":
    if len(sys.argv) == 3:
        build_global_no2(int(sys.argv[1]), int(sys.argv[2]))
    else:
        build_global_no2()
    print(no2_series(33.45, -112.07)["no2"]["annual"].round(2))
