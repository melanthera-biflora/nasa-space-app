"""
Smoke days from NOAA's Hazard Mapping System (HMS) smoke polygons. No login. A ONE-TIME build, not run per click.

Each day NOAA analysts outline the smoke plumes they see on GOES and polar-orbiter images and tag each outline
Light, Medium or Heavy. For every grid square we count the days on which an outline covers the square's centre
("smoke day"), and separately the days with a Medium or Heavy outline. A day is the UTC date of the outline's start.

Coverage (checked in the files, 2026-11-15): the archive starts on 5 Aug 2005, so 2005 and Aug 2005 are left empty.
Density tags are patchy before June 2010 (most of 2008 tagged, 2009 almost none, 2010 from June), so Medium+Heavy
starts in June 2010 and its first full year is 2011.

Source:  NOAA NESDIS/OSPO, one zip a year:
         https://satepsanone.nesdis.noaa.gov/pub/FIRE/web/HMS/Smoke_Polygons/Shapefile/Annual_Bundles/
Grid:    the MERRA-2 / POWER grid (0.5° lat x 0.625° lon) over the lower 48, the same squares as
         data/pm25_monthly_global.nc
Output:  data/hms_smoke_days.nc: smoke_days and smoke_days_mh, per month (time) and per year (year)

Test:    python -m sources.hms_smoke 2020 2020      (run from the data_pipeline folder)
Run:     python -m sources.hms_smoke                (2005-2025; zips stay in cache/hms/, so a rerun downloads nothing)

What it can't see: smoke under cloud (no outline drawn), and whether the smoke is aloft or at the ground.
"""
import sys
import tempfile
import time
import zipfile
from pathlib import Path

import numpy as np
import pandas as pd
import requests
import xarray as xr

from paths import CACHE_DIR, DATA_DIR
from sources.power_region import inside
from tools.state_shapes import read_dbf, read_shp

BUNDLE_URL = "https://satepsanone.nesdis.noaa.gov/pub/FIRE/web/HMS/Smoke_Polygons/Shapefile/Annual_Bundles/hms_smoke{year}.zip"
RAW_DIR = CACHE_DIR / "hms"
OUT = DATA_DIR / "hms_smoke_days.nc"
LAT = np.round(np.arange(24.0, 50.0 + 1e-9, 0.5), 3)                 # lower 48, on the MERRA-2 grid
LON = np.round(-180 + 0.625 * np.arange(88, 183), 3)                 # -125.0 .. -66.25
ARCHIVE_START = pd.Timestamp("2005-08-05")
DENSITY_START = pd.Timestamp("2010-06-01")
MEDIUM_PLUS = {"Medium", "Heavy"}                                    # untagged outlines say "NA"


def download_year(year, http=requests, raw_dir=RAW_DIR):
    """One yearly zip into cache/hms/; skipped if already there. Writes .part first so a stop never leaves half a zip."""
    raw_dir.mkdir(parents=True, exist_ok=True)
    path = raw_dir / f"hms_smoke{year}.zip"
    if path.exists():
        return path
    r = http.get(BUNDLE_URL.format(year=year), timeout=300)
    r.raise_for_status()
    part = path.with_suffix(".part")
    part.write_bytes(r.content)
    part.replace(path)
    time.sleep(2)                                                   # be polite to NOAA's server
    return path


def read_bundle(path):
    """Yearly zip -> (attribute rows, polygon rings), read from a temporary folder."""
    with tempfile.TemporaryDirectory() as d:
        with zipfile.ZipFile(path) as z:
            z.extractall(d)
        stem = next(Path(d).glob("*.shp")).with_suffix("")
        return read_dbf(f"{stem}.dbf"), read_shp(f"{stem}.shp")


def outline_day(start):
    """'2020245 1840' (year, day of year, UTC time) -> Timestamp of that UTC day."""
    s = start.strip()
    return pd.Timestamp(int(s[:4]), 1, 1) + pd.Timedelta(days=int(s[4:7]) - 1)


def year_grid(rows, shapes, year, lat=LAT, lon=LON):
    """Outlines of one year -> two (day, lat, lon) cubes of 1/0: any smoke, Medium or Heavy smoke.
    Days before the archive (or, for Medium+Heavy, before density tags) are NaN."""
    days = pd.date_range(f"{year}-01-01", f"{year}-12-31")
    any_ = np.zeros((len(days), len(lat), len(lon)), "float32")
    mh = np.zeros_like(any_)
    for row, rings in zip(rows, shapes):
        day = outline_day(row["Start"])
        if day.year != year:                                        # outlines that start on 1 Jan of the next year
            continue
        pts = np.concatenate([np.asarray(r, float) for r in rings])
        iy = np.flatnonzero((lat >= pts[:, 1].min()) & (lat <= pts[:, 1].max()))
        ix = np.flatnonzero((lon >= pts[:, 0].min()) & (lon <= pts[:, 0].max()))
        if not len(iy) or not len(ix):
            continue
        glon, glat = np.meshgrid(lon[ix], lat[iy])
        hit = inside(rings, glon, glat)
        sel = (day.day_of_year - 1, iy[:, None], ix)
        any_[sel] = np.maximum(any_[sel], hit)
        if row.get("Density", "").strip() in MEDIUM_PLUS:
            mh[sel] = np.maximum(mh[sel], hit)
    any_[days < ARCHIVE_START] = np.nan
    mh[days < max(ARCHIVE_START, DENSITY_START)] = np.nan
    return days, any_, mh


def build(start_year=2005, end_year=2025, http=requests):
    monthly, yearly = [], []
    for year in range(start_year, end_year + 1):
        t0 = time.time()
        rows, shapes = read_bundle(download_year(year, http))
        days, any_, mh = year_grid(rows, shapes, year)
        cube = xr.Dataset({"smoke_days": (("time", "lat", "lon"), any_), "smoke_days_mh": (("time", "lat", "lon"), mh)},
                          coords={"time": days, "lat": LAT, "lon": LON})
        cube["days_with_smoke_anywhere"] = ("time", (any_.max(axis=(1, 2))))
        monthly.append(cube.resample(time="MS").sum(skipna=False))      # a month with an unknown day stays empty
        yearly.append(cube[["smoke_days", "smoke_days_mh"]].sum("time", skipna=False).expand_dims(year=[year]))
        print(f"{year}: {len(rows)} outlines, {int(np.nansum(cube.days_with_smoke_anywhere))} days with smoke "
              f"over the lower-48 box, {time.time() - t0:.0f}s", flush=True)
    ds = xr.merge([xr.concat(monthly, "time"),
                   xr.concat(yearly, "year").rename(smoke_days="smoke_days_year", smoke_days_mh="smoke_days_mh_year")])
    ds.attrs = {"source": "NOAA NESDIS/OSPO Hazard Mapping System smoke polygons (annual bundles)",
                "method": "a day counts when an outline covers the grid-square centre; day = UTC date of outline start",
                "grid": "MERRA-2 0.5 x 0.625 degree, lower 48 box"}
    for v in ("smoke_days", "smoke_days_year"):
        ds[v].attrs = {"units": "days", "long_name": "days with any HMS smoke outline"}
    for v in ("smoke_days_mh", "smoke_days_mh_year"):
        ds[v].attrs = {"units": "days", "long_name": "days with a Medium or Heavy outline (empty before June 2010)"}
    ds["days_with_smoke_anywhere"].attrs = {"units": "days", "long_name": "days with any outline over the lower-48 box"}
    enc = {v: {"zlib": True, "complevel": 4, "dtype": "float32"} for v in ds.data_vars}   # float: NaN marks unknown
    OUT.parent.mkdir(exist_ok=True)
    ds.to_netcdf(OUT, encoding=enc)
    print(f"Saved {OUT} ({OUT.stat().st_size / 1e6:.1f} MB)")
    return ds


def smoke_days_for_point(lat, lon, path=OUT):
    """Monthly and yearly smoke days (any, Medium+Heavy) for the nearest grid square."""
    with xr.open_dataset(path) as ds:
        p = ds.sel(lat=lat, lon=lon, method="nearest").load()
    return p[["smoke_days", "smoke_days_mh"]].to_dataframe(), p[["smoke_days_year", "smoke_days_mh_year"]].to_dataframe()


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    years = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) == 3 else (2005, 2025)
    build(*years)
    for name, lat, lon, month in [("Portland OR", 45.52, -122.68, "2020-09"), ("Milwaukee WI", 43.04, -87.91, "2023-06")]:
        if years[0] <= int(month[:4]) <= years[1]:
            m, _ = smoke_days_for_point(lat, lon)
            print(f"{name} {month}: {int(m.loc[month, 'smoke_days'].iloc[0])} smoke days, "
                  f"{m.loc[month, 'smoke_days_mh'].iloc[0]:.0f} medium/heavy")
