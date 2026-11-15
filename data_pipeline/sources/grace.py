"""
Water stored on and under the land (groundwater, soil water, snow, lakes) from GRACE and GRACE-FO, as a monthly
anomaly in cm of water. A falling line means a place is drying out (drought, groundwater pumping).

Data:   JPL GRACE/GRACE-FO mascon RL06.3 v04 with Coastline Resolution Improvement
        (TELLUS_GRAC-GRFO_MASCON_CRI_GRID_RL06.3_V4, PO.DAAC, Earthdata login). One ~44 MB file for the whole record.
Grid:   0.25° on file, but the real resolution is the 3° mascon (~300 km): neighbouring squares share a value.
Value:  lwe_thickness, cm of liquid water equivalent, anomaly against the 2004.0-2009.999 mean; plus its uncertainty.
Gap:    GRACE ended in Jun/Oct 2017 and GRACE-FO started in Jun 2018: about a year is missing, and single months are
        missing elsewhere too (batteries, instrument issues). Times are each solution's mid-point.
Output: data/grace_lwe_us.nc, cropped to 18-72 N, 180-65 W.

Run:    python -m sources.grace       (run from the data_pipeline folder; the raw file stays in cache/grace/)
"""
import sys

import pandas as pd
import xarray as xr

from paths import CACHE_DIR, DATA_DIR

SHORT_NAME = "TELLUS_GRAC-GRFO_MASCON_CRI_GRID_RL06.3_V4"
RAW_DIR = CACHE_DIR / "grace"
OUT = DATA_DIR / "grace_lwe_us.nc"
BOX = dict(lat=slice(18, 72), lon=slice(-180, -65))


def crop_us(ds):
    """Mascon grid (lon 0-360) -> US box with lon -180..180, lwe_thickness and uncertainty only."""
    ds = ds[["lwe_thickness", "uncertainty"]]
    ds = ds.assign_coords(lon=((ds.lon + 180) % 360) - 180).sortby("lon")
    return ds.sel(**BOX)


def gaps(times):
    """Missing months between the first and last solution, as (first missing, last missing, length) runs."""
    have = set(pd.DatetimeIndex(times).to_period("M"))
    everything = pd.period_range(min(have), max(have), freq="M")
    runs, start = [], None
    for p in everything:
        if p not in have and start is None:
            start = p
        if p in have and start is not None:
            runs.append((str(start), str(p - 1), (p - start).n))
            start = None
    return runs


def build():
    import earthaccess
    earthaccess.login()
    results = earthaccess.search_data(short_name=SHORT_NAME)
    if len(results) != 1:
        print(f"WARNING: found {len(results)} files, expected 1")
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    path = earthaccess.download(results[:1], local_path=str(RAW_DIR))[0]
    with xr.open_dataset(path) as ds:
        us = crop_us(ds).load()
    us.attrs = {"source": f"JPL GRACE/GRACE-FO mascon {SHORT_NAME} (PO.DAAC)",
                "note": "anomaly vs 2004.0-2009.999 mean; 3-degree mascons on a 0.25-degree grid; no gain factors applied"}
    us.to_netcdf(OUT, encoding={v: {"zlib": True, "complevel": 4} for v in ("lwe_thickness", "uncertainty")})
    print(f"Saved {OUT} ({OUT.stat().st_size / 1e6:.1f} MB): {us.sizes['time']} solutions, "
          f"{str(us.time.values[0])[:10]} to {str(us.time.values[-1])[:10]}, units {us.lwe_thickness.attrs.get('units')}")
    print("Missing months (2 or more in a row):", [g for g in gaps(us.time.values) if g[2] >= 2])


def sanity_check(path=OUT):
    """California should lose water through the 2012-2016 drought."""
    from sources.power_region import grid_state_monthly
    with xr.open_dataset(path) as ds:
        ca = grid_state_monthly(ds.lwe_thickness.load(), "CA")
    yearly = ca.groupby(ca.index.year).mean().round(1)
    print("California yearly mean water anomaly (cm):", yearly.loc[2010:2018].to_dict())


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    build()
    sanity_check()
