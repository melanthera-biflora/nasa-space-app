"""
Trend for every NASA grid cell over the lower 48 states, for the "Where else is it changing?" map.
Each cell gets the same statistics as a report card (tools reuse analysis.trend_stats: Theil-Sen rate per decade,
Mann-Kendall p, first vs last 5-year means), plus a Benjamini-Hochberg false-discovery check across the map,
because testing thousands of cells at p < 0.05 marks some cells by chance (Wilks 2016).

Fields:  pm25  MERRA-2 0.5° x 0.625°, 2010-2025 (D41)  no2  OMI 0.25°, 2005-2025
         fires MODIS detections counted per 1° cell, 2003-2025 (cells with fewer than 30 detections are left blank)
         smoke_days  NOAA HMS days with medium or heavy smoke, 0.5° x 0.625°, 2011-2025 (D37)
         aod   MERRA-2 haze (aerosol optical depth), 0.5° x 0.625°, 2001-2025
Where:   cells that touch the lower 48's Census outline (us_mask); the rest stay blank
Output:  demo_reports/trend_fields/<field>.json   (small; committed so the demo map works without the data files)

Run:  python -m tools.trend_field            (from the data_pipeline folder; ~2 min)
      python -m tools.trend_field pm25       (one field)
"""
import json
import math
import sys
import time

import numpy as np
import pandas as pd
import xarray as xr
from scipy.stats import false_discovery_control

from analysis.timeline import class_edges
from analysis.trends import trend_stats
from paths import DATA_DIR, DEMO_DIR, load_thresholds
from tools.us_scan import CITIES

BOX = {"lat": (24.0, 50.0), "lon": (-125.0, -66.0)}   # lower 48 states
NOT_CONTIGUOUS = {"AK", "HI", "PR", "VI", "GU", "AS", "MP"}   # as backend/services/regions.py: left out of the outline
OUT_DIR = DEMO_DIR / "trend_fields"
ALPHA, ALPHA_FDR = 0.05, 0.10   # Wilks (2016) suggests alpha_FDR = 2 x alpha for spatially correlated fields
MIN_FIRES = 30


def bh_qvalues(p):
    """Benjamini-Hochberg adjusted p-values (q) over the cells that have one. NaN stays NaN."""
    p = np.asarray(p, float)
    q = np.full_like(p, np.nan)
    ok = ~np.isnan(p)
    if ok.any():
        q[ok] = false_discovery_control(p[ok], method="bh")
    return q


def nice_breaks(slopes):
    """Four symmetric class edges (top/8, top/4, top/2, top) with top a 1-2-5 number near the 95th percentile of |rate|."""
    a = np.abs(np.asarray(slopes, float))
    a = a[np.isfinite(a)]
    p95 = float(np.percentile(a, 95)) if len(a) else 1.0
    if p95 <= 0:
        p95 = 1.0
    k = 10 ** math.floor(math.log10(p95))
    top = next(m * k for m in (1, 2, 5, 10) if m * k >= p95)
    return [top / 8, top / 4, top / 2, top]


def _annual_grid(key):
    """(years, lats, lons, cube[year, lat, lon]) of yearly values, cropped to the lower 48."""
    if key in ("pm25", "no2"):
        with xr.open_dataarray(DATA_DIR / f"{key}_monthly_global.nc") as da:
            da = da.sel(lat=slice(*BOX["lat"]), lon=slice(*BOX["lon"])).load()
        if key == "pm25":                                  # D41: the 2009-10 step is MERRA-2's, not the air's
            from sources.pm25_merra2 import FIRST_TREND_YEAR
            da = da.sel(time=da.time.dt.year >= FIRST_TREND_YEAR)
        g = da.groupby("time.year")
        annual = g.mean("time")
        if key == "no2":   # same rule as sources.no2_omi.no2_series: a year needs 9+ months
            annual = annual.where(g.count("time") >= 9)
        return annual.year.values, da.lat.values, da.lon.values, annual.values
    if key == "fires":
        from sources.fires_firms import _load_all
        return fire_counts(*_load_all(), BOX)
    if key in ("smoke_days", "aod"):
        name, var, agg, first = {"smoke_days": ("hms_smoke_days.nc", "smoke_days_mh", "sum", 2011),     # D37
                                 "aod": ("aod_monthly_us.nc", "aod", "mean", 2001)}[key]
        with xr.open_dataset(DATA_DIR / name) as ds:
            da = _crop(ds[var]).load()
        da = da.sel(time=da.time.dt.year >= first)
        g = da.groupby("time.year")
        yearly = getattr(g, agg)("time", skipna=True).where(g.count("time") >= 12)     # complete years only
        yearly = yearly.where(yearly.year >= first, drop=True)
        return yearly.year.values, yearly.lat.values, yearly.lon.values, yearly.values
    raise ValueError(f"unknown field {key!r}")


def fire_counts(df, metas, box):
    """FIRMS detections per 1° cell and year inside box, for the years every country file covers (from 2003). Cells
    with fewer than MIN_FIRES detections in all are blank: too few fires for a trend."""
    from sources.fires_firms import FIRST_TREND_YEAR
    years = sorted(set.intersection(*[set(m["years"]) for m in metas]))
    years = np.array([y for y in years if y >= FIRST_TREND_YEAR])
    lats = np.arange(box["lat"][0] + 0.5, box["lat"][1], 1.0)
    lons = np.arange(box["lon"][0] + 0.5, box["lon"][1], 1.0)
    df = df[df.lat.between(*box["lat"], inclusive="left") & df.lon.between(*box["lon"], inclusive="left")]
    df = df.assign(y=df.date.dt.year, i=((df.lat - box["lat"][0]) // 1).astype(int),
                   j=((df.lon - box["lon"][0]) // 1).astype(int))
    df = df[df.y.isin(years)]
    counts = df.groupby(["y", "i", "j"]).size()
    cube = np.zeros((len(years), len(lats), len(lons)))      # 0 means "no fire seen", not "no data"
    yi = {y: n for n, y in enumerate(years)}
    for (y, i, j), c in counts.items():
        cube[yi[y], i, j] = c
    cube[:, cube.sum(axis=0) < MIN_FIRES] = np.nan
    return years, lats, lons, cube


def _crop(da):
    lat_rows = slice(*BOX["lat"]) if da.lat.values[0] < da.lat.values[-1] else slice(*BOX["lat"][::-1])
    return da.sel(lat=lat_rows, lon=slice(*BOX["lon"])).sortby("lat")


def us_mask(lats, lons, n=5):
    """True for grid cells that touch the lower 48: any of n x n sample points in the square falls inside the Census
    state outlines (config/us_states.json, the same rings as the maps' land mask, D39). Fixed outline, so fire files
    for other countries in data/fires/ can't grow it."""
    from sources.power_region import inside, load_states
    lats, lons = np.asarray(lats, float), np.asarray(lons, float)
    dlat, dlon = abs(lats[1] - lats[0]), abs(lons[1] - lons[0])
    off = (np.arange(n) + 0.5) / n - 0.5                              # sample points spread evenly over the square
    m = np.zeros((len(lats), len(lons)), bool)
    for code, st in load_states().items():
        if code in NOT_CONTIGUOUS:
            continue
        w, s, e, north = st["bbox"]
        cols = np.flatnonzero((lons + dlon / 2 >= w) & (lons - dlon / 2 <= e))
        plon = (lons[cols, None] + off * dlon)[:, :, None]              # (cell, n, 1)
        for i in np.flatnonzero((lats + dlat / 2 >= s) & (lats - dlat / 2 <= north)):   # a row at a time: small arrays
            hit = inside(st["rings"], np.broadcast_to(plon, (len(cols), n, n)),
                         np.broadcast_to((lats[i] + off * dlat)[None, None, :], (len(cols), n, n)))
            m[i, cols] |= hit.any(axis=(1, 2))
    return m


def where_words(lat, lon):
    """'near Boise' within 100 km of a scan city, else '290 km northwest of Sacramento'."""
    def km(c):
        dy, dx = (lat - c[0]) * 111.2, (lon - c[1]) * 111.2 * math.cos(math.radians((lat + c[0]) / 2))
        return math.hypot(dx, dy), dx, dy
    name = min((n for n, c in CITIES.items() if c[0] < 50), key=lambda n: km(CITIES[n])[0])
    d, dx, dy = km(CITIES[name])
    if d <= 100:
        return f"near {name}"
    compass = ["east", "northeast", "north", "northwest", "west", "southwest", "south", "southeast"]
    return f"{round(d, -1):.0f} km {compass[round(math.degrees(math.atan2(dy, dx)) / 45) % 8]} of {name}"


def build_field(key):
    cfg = load_thresholds()[key]
    years, lats, lons, cube = _annual_grid(key)
    cube[:, ~us_mask(lats, lons)] = np.nan   # ocean, Canada and Mexico stay blank: the story is US places
    start, end = int(years[0]), int(years[-1])
    shape = (len(lats), len(lons))
    out = {name: np.full(shape, np.nan) for name in ("slope", "p", "then", "now")}
    windows = None   # first and last 5-year windows, as on the cards
    for i in range(shape[0]):
        for j in range(shape[1]):
            col = cube[:, i, j]
            if np.isnan(col).all():
                continue
            tr = trend_stats(pd.Series(col, index=years), start, end)
            if tr is None or tr.get("constant"):
                continue
            out["slope"][i, j], out["p"][i, j] = tr["slope_per_decade"], tr["mk_p"]
            out["then"][i, j], out["now"][i, j] = tr["then"], tr["now"]
            windows = windows or (tr["then_years"], tr["now_years"])
    q = bh_qvalues(out["p"].ravel()).reshape(shape)
    valid = ~np.isnan(out["slope"])
    sig = valid & (out["p"] < ALPHA)
    fdr = sig & (q < ALPHA_FDR)
    area = np.cos(np.radians(lats))[:, None] * np.ones(shape)   # cells shrink toward the pole
    share = lambda m: round(100 * float(area[m].sum() / area[valid].sum()), 1)  # noqa: E731

    def strongest(mask, pick):
        if not mask.any():
            return None
        s = np.where(mask, out["slope"], np.nan)
        i, j = np.unravel_index(pick(s), shape)
        return {"lat": float(lats[i]), "lon": float(lons[j]), "slope_per_decade": round(float(s[i, j]), 3),
                "where": where_words(float(lats[i]), float(lons[j]))}

    rnd = lambda a, d: [None if np.isnan(v) else round(float(v), d) for v in a.ravel()]  # noqa: E731
    dv = max(2, cfg.get("decimals", 2))                     # AOD needs 3: 0.13 vs 0.14 is a real difference
    then_years, now_years = windows or ([start, start + 4], [end - 4, end])
    unit = cfg["unit"].replace(" within 50 km", " per 1° cell") if key == "fires" else cfg["unit"]
    return {
        "factor": key, "label": cfg["label"], "unit": unit.split(" (")[0],
        "higher_is_worse": cfg.get("higher_is_worse", True),
        "period": [start, end], "then_years": then_years, "now_years": now_years,
        "grid": {"lats": [round(float(v), 4) for v in lats], "lons": [round(float(v), 4) for v in lons],
                 "dlat": round(float(lats[1] - lats[0]), 4), "dlon": round(float(lons[1] - lons[0]), 4)},
        "breaks": nice_breaks(out["slope"][valid]),
        "level_breaks": class_edges(np.r_[out["then"][valid], out["now"][valid]]),   # shared by Then and Now
        "alpha": ALPHA, "alpha_fdr": ALPHA_FDR,
        "slope": rnd(out["slope"], dv + 1), "p": rnd(out["p"], 4), "then": rnd(out["then"], dv), "now": rnd(out["now"], dv),
        "sig": [int(v) for v in sig.ravel()], "fdr": [int(v) for v in fdr.ravel()],
        "summary": {
            "cells": int(valid.sum()),
            "rising_pct": share(sig & (out["slope"] > 0)), "falling_pct": share(sig & (out["slope"] < 0)),
            "rising_fdr_pct": share(fdr & (out["slope"] > 0)), "falling_fdr_pct": share(fdr & (out["slope"] < 0)),
            "strongest_rise": strongest(fdr & (out["slope"] > 0), np.nanargmax),
            "strongest_fall": strongest(fdr & (out["slope"] < 0), np.nanargmin),
        },
        "source": {"pm25": "NASA MERRA-2 M2TMNXAER (0.5° × 0.625°)", "no2": "NASA OMI OMNO2d, version not yet confirmed (0.25°)",
                   "fires": "NASA FIRMS MODIS C6.1 vegetation fire detections, counted per 1° cell",
                   "smoke_days": "NOAA Hazard Mapping System smoke outlines, medium and heavy only (0.5° × 0.625°)",
                   "aod": "NASA MERRA-2 M2TMNXAER aerosol optical depth (0.5° × 0.625°)"}[key],
    }


def main(keys):
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for key in keys:
        t0 = time.time()
        field = build_field(key)
        path = OUT_DIR / f"{key}.json"
        path.write_text(json.dumps(field, separators=(",", ":")), encoding="utf-8")
        s = field["summary"]
        print(f"{key}: {s['cells']} cells, {field['period'][0]}-{field['period'][1]}, "
              f"rising {s['rising_pct']}% / falling {s['falling_pct']}% of area (p<0.05); "
              f"after FDR {s['rising_fdr_pct']}% / {s['falling_fdr_pct']}% -> {path.name} "
              f"({path.stat().st_size // 1024} KB, {time.time() - t0:.0f}s)")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main(sys.argv[1:] or ["pm25", "no2", "fires", "smoke_days", "aod"])
