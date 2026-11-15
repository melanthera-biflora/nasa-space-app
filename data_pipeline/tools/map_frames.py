"""
Yearly frames for the animated US map on /map (D36): every grid cell's value for each year on ONE colour scale per
record, so the map can play 2001 -> 2025 and a year's colours mean the same in every frame; and each frame's change
from the record's first five years, on one diverging scale. Fires and smoke days are 3-year trailing means. Display data only: the
trend tests stay in tools.trend_field and on the reports.

Fields:  pm25        MERRA-2 0.5 x 0.625 deg, 2010-2025, yearly mean (D41)
         no2         OMI 0.25 deg averaged to 0.5 deg (keeps the file small), 2005-2025, years with 9+ months
         fires       FIRMS detections per 1 deg cell, 2003-2025
         smoke_days  NOAA HMS days with medium or heavy smoke per year, 0.5 x 0.625 deg, 2011-2025 (D37)
         aod         MERRA-2 haze (aerosol optical depth), 0.5 x 0.625 deg, 2001-2025, yearly mean
Where:   lower 48 states (the same outline as the trend map)
Output:  demo_reports/map_frames/<field>.json

Run:  python -m tools.map_frames            (from the data_pipeline folder; ~1 min)
      python -m tools.map_frames smoke_days (one field)
"""
import json
import sys
import warnings

import numpy as np

from analysis.timeline import class_edges
from paths import DEMO_DIR, load_thresholds
from tools.trend_field import _annual_grid, us_mask

OUT_DIR = DEMO_DIR / "map_frames"
FIELDS = ("pm25", "no2", "fires", "smoke_days", "aod")
DECIMALS = {"pm25": 1, "no2": 2, "fires": 0, "smoke_days": 0, "aod": 3}
SMOOTH = {"fires": 3, "smoke_days": 3}       # 3-year trailing means: one big fire season would flicker the whole map (D36)
SOURCES = {"pm25": "NASA MERRA-2 aerosol diagnostics (0.5° × 0.625°)", "no2": "NASA OMI OMNO2d, version not yet confirmed (0.25°, shown at 0.5°)",
           "fires": "NASA FIRMS MODIS fire detections, counted per 1° cell", "smoke_days": "NOAA Hazard Mapping System smoke outlines, medium and heavy only",
           "aod": "NASA MERRA-2 aerosol optical depth (0.5° × 0.625°)"}


def change_edges(change):
    """Four symmetric edges for the change view at the 40th, 70th, 90th and 97th percentile of |change|, 2 significant
    digits: counts are heavy-tailed (one fire square changes by 3,000 while half change by 15 or less), so edges from
    the extremes would leave most of the map in the palest class."""
    a = np.abs(np.asarray(change, float))
    a = a[np.isfinite(a) & (a > 0)]
    if not len(a):
        return [1.0, 2.0, 5.0, 10.0]
    edges = sorted({float(f"{q:.2g}") for q in np.percentile(a, [40, 70, 90, 97]) if q > 0})
    while len(edges) < 4:                                   # repeated quantiles (many equal values): extend upward
        edges.append(float(f"{edges[-1] * 2:.2g}"))
    return edges


def _wmean(frame, weight, decimals):
    ok = np.isfinite(frame)
    return round(float((frame[ok] * weight[ok]).sum() / weight[ok].sum()), decimals + 1) if ok.any() else None


def frames(years, lats, lons, cube, inside, decimals, smooth=1, base=5):
    """Pure: the yearly values inside the US on one shared set of colour classes, the change from each cell's first
    `base` years (it needs 3 of them), and the area-weighted US mean of both per year. smooth > 1 makes each frame the
    trailing mean of `smooth` years (every year present), labelled by its last year. cube[year, lat, lon]; inside[lat,
    lon] is True for US cells. Returns lists ready for JSON (None for no value)."""
    cube = np.where(inside[None, :, :], cube, np.nan)
    weight = np.cos(np.radians(lats))[:, None] * np.ones((len(lats), len(lons)))
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", RuntimeWarning)                   # cells with no early years: NaN, dropped below
        baseline = np.nanmean(cube[:base], axis=0)
    baseline[np.isfinite(cube[:base]).sum(axis=0) < min(3, base)] = np.nan
    base_years = [int(years[0]), int(years[min(base, len(years)) - 1])]
    if smooth > 1:                                                        # NaN unless every year in the window has a value
        cube = np.stack([cube[k - smooth + 1:k + 1].mean(axis=0) for k in range(smooth - 1, len(years))])
        years = years[smooth - 1:]
    change = cube - baseline[None]
    keep = np.isfinite(cube).any(axis=0)                                  # cells that ever have a value
    rnd = lambda a: [None if not np.isfinite(v) else (int(round(v)) if decimals == 0 else round(float(v), decimals)) for v in a.ravel()]  # noqa: E731
    return {
        "years": [int(y) for y in years],
        "span": smooth,
        "base_years": base_years,
        "level_breaks": class_edges(cube[:, keep].ravel()),               # shared by every frame
        "change_breaks": change_edges(change[np.isfinite(change)]),
        "values": [rnd(frame) for frame in cube],
        "change": [rnd(frame) for frame in change],
        "us_mean": [_wmean(frame, weight, decimals) for frame in cube],
        "us_change": [_wmean(frame, weight, decimals) for frame in change],
    }


def annual(key):
    """(years, lats, lons, cube[year, lat, lon]) of yearly values for one field, cropped to the lower 48."""
    if key in ("pm25", "fires", "smoke_days", "aod"):
        return _annual_grid(key)
    if key == "no2":                                    # 0.25 deg -> 0.5 deg: average each 2 x 2 block
        years, lats, lons, cube = _annual_grid(key)
        nlat, nlon = len(lats) // 2 * 2, len(lons) // 2 * 2
        c = cube[:, :nlat, :nlon].reshape(len(years), nlat // 2, 2, nlon // 2, 2)
        with np.errstate(all="ignore"):
            block = np.nanmean(c, axis=(2, 4))
        return years, lats[:nlat].reshape(-1, 2).mean(axis=1), lons[:nlon].reshape(-1, 2).mean(axis=1), block
    raise ValueError(f"unknown field {key!r}")


def build(key):
    cfg = load_thresholds()[key]
    years, lats, lons, cube = annual(key)
    out = frames(years, lats, lons, cube, us_mask(lats, lons), DECIMALS[key], smooth=SMOOTH.get(key, 1))
    unit = cfg.get("unit_short") or cfg["unit"].split(" (")[0]          # short: it sits beside numbers on the map
    return {"factor": key, "label": cfg["label"], "unit": unit, "higher_is_worse": cfg.get("higher_is_worse", True),
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
              f"breaks {f['level_breaks']} / {f['change_breaks']}, US mean {f['us_mean'][0]} -> {f['us_mean'][-1]} ({path.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main(sys.argv[1:] or list(FIELDS))
