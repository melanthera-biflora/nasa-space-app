"""
Yearly frames for the North America map on /map: the animated map of tools.map_frames, over 10-72 N, 170-50 W, for
the records whose data reach past the US border (plan: research_notes/Data beyond US borders for maps/build_plan.md).

Fields:  sst            NOAA OISST v2.1 sea-surface temperature, 0.25° averaged to 0.75° (keeps the file under the
                        repo's 5 MB limit), 2001-2025, yearly mean; sea only
         pm25_na        NASA MERRA-2 fine particles, 0.5° x 0.625°, 2010-2025 (D41); land only, where people breathe it
         fires_na       NASA FIRMS detections per 1° cell in the US, Canada and Mexico country files, 2003-2025
         smoke_days_na  NOAA HMS days with medium or heavy smoke, 0.5° x 0.625°, 2011-2025, over land and sea
Line:    the lower-48 average for the land records (the same line as the US map, and their colours come from the
         lower 48 too, so the two maps read alike); the Gulf of Mexico average for sea temperature. Land and sea are
         never averaged together.
Output:  demo_reports/map_frames/<field>.json (served by GET /api/v1/maps/<field>/frames)

Needs:   data/oisst_monthly_na.nc (python -m sources.oisst), data/pm25_monthly_global.nc, data/fires/na/ (python -m
         sources.fires_firms --na Canada Mexico: a folder of their own, so the US reports and maps never count them)
         and the HMS zips in cache/hms/ (python -m sources.hms_smoke).
Run:     python -m tools.map_frames_na            (from the data_pipeline folder; smoke rasterises once, ~10 min)
         python -m tools.map_frames_na sst        (one field)
"""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import xarray as xr

from paths import DATA_DIR, load_thresholds
from tools.map_frames import OUT_DIR, frames
from tools.trend_field import fire_counts, us_mask

NA_BOX = {"lat": (10.0, 72.0), "lon": (-170.0, -50.0)}
LAT = np.round(np.arange(10.0, 72.0 + 1e-9, 0.5), 3)                   # the MERRA-2 grid, 125 rows
LON = np.round(-180 + 0.625 * np.arange(16, 209), 4)                    # -170.0 .. -50.0, 193 columns
SMOKE_NA = DATA_DIR / "hms_smoke_mh_na_yearly.nc"
FIELDS = ("sst", "pm25_na", "fires_na", "smoke_days_na")
SST_BLOCK = 3                                                           # 0.25 deg squares per side of a shown square
DECIMALS = {"sst": 1, "pm25_na": 1, "fires_na": 0, "smoke_days_na": 0}
SMOOTH = {"fires_na": 3, "smoke_days_na": 3}
BASE = {"pm25_na": "pm25", "fires_na": "fires", "smoke_days_na": "smoke_days"}
SOURCES = {
    "sst": "NOAA OISST v2.1 sea-surface temperature, from satellites, ships and buoys (NOAA PSL), averaged to 0.75°",
    "pm25_na": "NASA MERRA-2 aerosol diagnostics (0.5° × 0.625°), land only",
    "fires_na": "NASA FIRMS MODIS fire detections in the US, Canada and Mexico files, counted per 1° cell",
    "smoke_days_na": "NOAA Hazard Mapping System smoke outlines, medium and heavy only",
}
COVERAGE = {
    "sst": "Sea only: land is blank. Squares on the coast average only their sea part.",
    "pm25_na": "Land only. One model for every country, so there is no seam at the border.",
    "fires_na": "Fires in the US, Canada and Mexico only: Central America and the Caribbean were not downloaded. "
                "Squares with fewer than 30 detections in all the years are blank, and the 1° squares cover less "
                "ground the further north they are.",
    "smoke_days_na": "NOAA analysts outline smoke over North America, Hawaii and the Caribbean, over land and sea. Smoke "
                     "overhead is not always smoke at the ground.",
}
# The Gulf of Mexico, roughly: closed at the Yucatán Channel and the Florida Straits; the Caribbean corner is left out
GULF = {"lat": (18.0, 31.0), "lon": (-98.0, -80.5), "caribbean": (21.6, -87.0)}


def land_cells(lats, lons, o_lat, o_lon, ocean):
    """True for display squares where at most half of the sea-temperature squares whose centre falls in them are sea
    (OISST is blank on land, so its own grid is the land mask). ocean[o_lat, o_lon] is True for sea."""
    dlat, dlon = lats[1] - lats[0] if len(lats) > 1 else 0.5, lons[1] - lons[0]
    i = np.floor((np.asarray(o_lat) - (lats[0] - dlat / 2)) / dlat).astype(int)
    j = np.floor((np.asarray(o_lon) - (lons[0] - dlon / 2)) / dlon).astype(int)
    ii, jj = np.meshgrid(i, j, indexing="ij")
    ok = (ii >= 0) & (ii < len(lats)) & (jj >= 0) & (jj < len(lons))
    sea, total = np.zeros((len(lats), len(lons))), np.zeros((len(lats), len(lons)))
    np.add.at(sea, (ii[ok], jj[ok]), np.asarray(ocean)[ok])
    np.add.at(total, (ii[ok], jj[ok]), 1)
    return (total > 0) & (sea / np.maximum(total, 1) <= 0.5)


def _sst_years():
    with xr.open_dataarray(DATA_DIR / "oisst_monthly_na.nc") as da:
        da = da.load()
    g = da.groupby("time.year")
    return g.mean("time").where(g.count("time") == 12)                  # complete years only


def gulf_mask(lats, lons):
    la, lo = np.asarray(lats)[:, None], np.asarray(lons)[None, :]
    box = (la >= GULF["lat"][0]) & (la <= GULF["lat"][1]) & (lo >= GULF["lon"][0]) & (lo <= GULF["lon"][1])
    return box & ~((la < GULF["caribbean"][0]) & (lo > GULF["caribbean"][1]))


def smoke_years(start=2011, end=2025):
    """Days with medium or heavy smoke per year on the North America grid, rasterised once from the cached HMS zips."""
    if SMOKE_NA.exists():
        with xr.open_dataarray(SMOKE_NA) as da:
            return da.load()
    from sources.hms_smoke import download_year, read_bundle, year_grid
    out = []
    for year in range(start, end + 1):
        rows, shapes = read_bundle(download_year(year))
        _, _, mh = year_grid(rows, shapes, year, LAT, LON)
        out.append(np.nansum(mh, axis=0))
        print(f"smoke {year}: {len(rows)} outlines", flush=True)
    da = xr.DataArray(np.stack(out).astype("float32"), dims=("year", "lat", "lon"),
                      coords={"year": np.arange(start, end + 1), "lat": LAT, "lon": LON}, name="smoke_days_mh")
    da.to_netcdf(SMOKE_NA)
    return da


def annual(key):
    """(years, lats, lons, cube[year, lat, lon], shown[lat, lon], focus[lat, lon], what the line averages). The
    colours come from the focus cells for land (the lower 48's colours), from every sea square for sea temperature."""
    if key == "sst":
        yearly = _sst_years()
        b = SST_BLOCK
        nlat, nlon = yearly.sizes["lat"] // b * b, yearly.sizes["lon"] // b * b
        c = yearly.values[:, :nlat, :nlon].reshape(len(yearly.year), nlat // b, b, nlon // b, b)
        with np.errstate(all="ignore"):                                 # 0.25 -> 0.75 deg: the sea part of each block
            cube = np.nanmean(c, axis=(2, 4))
        lats = yearly.lat.values[:nlat].reshape(-1, b).mean(axis=1)
        lons = yearly.lon.values[:nlon].reshape(-1, b).mean(axis=1)
        shown = np.isfinite(cube).any(axis=0)
        return yearly.year.values, lats, lons, cube, shown, gulf_mask(lats, lons) & shown, "the Gulf of Mexico"
    lats, lons = LAT, LON
    if key == "pm25_na":
        from sources.pm25_merra2 import FIRST_TREND_YEAR
        with xr.open_dataarray(DATA_DIR / "pm25_monthly_global.nc") as da:
            da = da.sel(lat=slice(*NA_BOX["lat"]), lon=slice(*NA_BOX["lon"])).load()
        da = da.sel(time=da.time.dt.year >= FIRST_TREND_YEAR)
        yearly = da.groupby("time.year").mean("time")
        lats, lons, years, cube = da.lat.values, da.lon.values, yearly.year.values, yearly.values
        sst = _sst_years()
        ocean = np.isfinite(sst.values).any(axis=0)
        shown = land_cells(lats, lons, sst.lat.values, sst.lon.values, ocean)
    elif key == "fires_na":
        from sources.fires_firms import FIRE_DIR, NA_DIR
        files = sorted(FIRE_DIR.glob("modis_*.parquet")) + sorted(NA_DIR.glob("modis_*.parquet"))
        metas = [json.loads(Path(str(f).replace(".parquet", "_meta.json")).read_text()) for f in files]
        df = pd.concat([pd.read_parquet(f, columns=["lat", "lon", "date"]) for f in files], ignore_index=True)
        years, lats, lons, cube = fire_counts(df, metas, NA_BOX)
        shown = np.isfinite(cube).any(axis=0)
    elif key == "smoke_days_na":
        da = smoke_years()
        years, cube = da.year.values, da.values
        shown = np.ones((len(lats), len(lons)), bool)
    else:
        raise ValueError(f"unknown field {key!r}")
    us = us_mask(lats, lons)
    return years, lats, lons, cube, shown | (us & np.isfinite(cube).any(axis=0)), us, "the lower 48"


def build(key):
    th = load_thresholds()
    cfg = th.get(BASE.get(key, key), {})
    years, lats, lons, cube, shown, focus, mean_area = annual(key)
    out = frames(years, lats, lons, cube, shown, DECIMALS[key], smooth=SMOOTH.get(key, 1), focus=focus,
                 scale=shown if key == "sst" else None)
    label, unit = (("Sea temperature", "°C") if key == "sst"
                   else (cfg["label"], cfg.get("unit_short") or cfg["unit"].split(" (")[0]))
    return {"factor": key, "label": label, "unit": unit, "higher_is_worse": cfg.get("higher_is_worse", True),
            "area": "North America", "mean_area": mean_area, "coverage": COVERAGE[key],
            "grid": {"lats": [round(float(v), 4) for v in lats], "lons": [round(float(v), 4) for v in lons],
                     "dlat": round(float(lats[1] - lats[0]), 4), "dlon": round(float(lons[1] - lons[0]), 4)},
            "source": SOURCES[key], **out}


def main(keys):
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for key in keys:
        f = build(key)
        path = OUT_DIR / f"{key}.json"
        path.write_text(json.dumps(f, separators=(",", ":")), encoding="utf-8")
        print(f"{key}: {f['years'][0]}-{f['years'][-1]}, {len(f['grid']['lats'])} x {len(f['grid']['lons'])} cells, "
              f"breaks {f['level_breaks']} / {f['change_breaks']}, {f['mean_area']} {f['us_mean'][0]} -> "
              f"{f['us_mean'][-1]} ({path.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main(sys.argv[1:] or list(FIELDS))
