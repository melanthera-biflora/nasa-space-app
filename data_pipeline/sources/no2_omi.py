"""
NO2 (traffic & industry pollution) from NASA OMI — ONE-TIME global build, like PM2.5.

Data:   OMNO2d (OMI/Aura NO2 Cloud-Screened Total and Tropospheric Column, daily L3, 0.25° ≈ 25 km)
        variable ColumnAmountNO2TropCloudScreened, units molecules/cm²  (we store ×10¹⁵)
Where:  NASA GES DISC (same Earthdata login as PM2.5; same "NASA GESDISC DATA ARCHIVE" approval)
        https://disc.gsfc.nasa.gov/datasets?keywords=OMNO2d
Period: OMI starts Oct 2004 -> we use 2005-2025.

How it works, ONE YEAR AT A TIME (stop with Ctrl+C any time, rerun to continue):
  1. find that year's ~365 daily files
  2. read ONLY the NO2 variable from each file (streamed, no full download)
  3. average the days of each month -> 12 monthly global maps
  4. save data/no2_years/no2_<year>.nc, skip years already done
  5. at the end join everything into data/no2_monthly_global.nc

Time:   reads ~7,700 daily files -> SLOW (several hours). Do the 1-year test first.
Test:   python -m sources.no2_omi 2024 2024        (run from the data_pipeline folder)
Run:    python -m sources.no2_omi                 (2005-2025, resumable)
Lookup: from sources.no2_omi import no2_series; no2_series(33.45, -112.07)
"""
import re
import sys
import time

import numpy as np
import pandas as pd
import xarray as xr

from paths import DATA_DIR as DATA
YEARS_DIR = DATA / "no2_years"
OUT = DATA / "no2_monthly_global.nc"
GROUP = "HDFEOS/GRIDS/ColumnAmountNO2/Data Fields"
VAR = "ColumnAmountNO2TropCloudScreened"
DATE_RE = re.compile(r"(\d{4})m(\d{2})(\d{2})")


def grid_coords(nlat, nlon):
    """OMNO2d is a regular grid from -90..90 and -180..180 (cell centers)."""
    dlat, dlon = 180 / nlat, 360 / nlon
    return (-90 + dlat / 2 + dlat * np.arange(nlat)), (-180 + dlon / 2 + dlon * np.arange(nlon))


def read_day(f):
    with xr.open_dataset(f, engine="h5netcdf", group=GROUP, phony_dims="sort") as ds:
        a = ds[VAR].values.astype("float32")
    a[(a < -1e20) | ~np.isfinite(a)] = np.nan     # fill value is about -1.27e30
    return a / 1e15


def file_date(name):
    m = DATE_RE.search(str(name))
    return pd.Timestamp(int(m[1]), int(m[2]), int(m[3])) if m else None


def build_year(year, earthaccess):
    out = YEARS_DIR / f"no2_{year}.nc"
    if out.exists():
        print(f"{year}: already done, skipping")
        return
    t0 = time.time()
    results = earthaccess.search_data(short_name="OMNO2d",
                                      temporal=(f"{year}-01-01", f"{year}-12-31"))
    # keep one file per day (if two versions exist, the later name wins)
    by_day = {}
    for r in results:
        links = r.data_links() if hasattr(r, "data_links") else [str(r)]
        d = file_date(links[0] if links else r)
        if d is not None:
            by_day[d] = r
    days = sorted(by_day)
    print(f"{year}: {len(days)} daily files")
    files = earthaccess.open([by_day[d] for d in days])

    sums, counts = {}, {}
    for i, (d, f) in enumerate(zip(days, files)):
        try:
            a = read_day(f)
        except Exception as e:
            print(f"  skip {d.date()}: {e}")
            continue
        k = d.month
        if k not in sums:
            sums[k], counts[k] = np.zeros_like(a), np.zeros_like(a)
        ok = np.isfinite(a)
        sums[k][ok] += a[ok]
        counts[k][ok] += 1
        if i % 30 == 0:
            print(f"  {i + 1}/{len(days)}  {d.date()}", end="\r")
    print()
    if not sums:
        print(f"{year}: no data")
        return
    nlat, nlon = next(iter(sums.values())).shape
    lat, lon = grid_coords(nlat, nlon)
    months = sorted(sums)
    with np.errstate(invalid="ignore", divide="ignore"):
        cube = np.stack([np.where(counts[m] > 0, sums[m] / counts[m], np.nan) for m in months])
    da = xr.DataArray(cube.astype("float32"), name="no2",
                      coords={"time": [pd.Timestamp(year, m, 1) for m in months], "lat": lat, "lon": lon},
                      dims=("time", "lat", "lon"))
    # sanity check: NO2 is much higher in the northern half (industry). If not, flip.
    north, south = np.nanmean(da.sel(lat=slice(20, 60))), np.nanmean(da.sel(lat=slice(-60, -20)))
    if north < south:
        print("  latitude looked upside-down -> flipped")
        da = da.assign_coords(lat=lat[::-1]).sortby("lat")
    YEARS_DIR.mkdir(parents=True, exist_ok=True)
    da.to_netcdf(out, encoding={"no2": {"zlib": True, "complevel": 4}})
    print(f"{year}: done in {time.time() - t0:.0f}s")


def combine_years():
    files = sorted(YEARS_DIR.glob("no2_*.nc"))
    da = xr.concat([xr.open_dataarray(f) for f in files], dim="time").sortby("time")
    da.attrs = {"units": "1e15 molecules cm-2", "source": "NASA OMI OMNO2d ColumnAmountNO2TropCloudScreened"}
    nlat, nlon = da.sizes["lat"], da.sizes["lon"]
    da.to_netcdf(OUT, encoding={"no2": {"zlib": True, "complevel": 4,
                                        "chunksizes": (12, min(90, nlat), min(180, nlon))}})
    print(f"Saved {OUT}: {da.sizes['time']} months")


def build_global_no2(start_year=2005, end_year=2025):
    import earthaccess
    earthaccess.login(strategy="interactive", persist=True)
    for y in range(start_year, end_year + 1):
        build_year(y, earthaccess)
    combine_years()


def no2_series(lat, lon, path=OUT):
    """What pipeline.build_report() calls."""
    with xr.open_dataarray(path) as da:
        m = da.sel(lat=lat, lon=lon, method="nearest").to_series().astype(float)
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
