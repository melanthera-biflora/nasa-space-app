"""
US state averages: NASA POWER's regional monthly API (no login) and our gridded PM2.5 / NO2 files, averaged over a
state's outline (config/us_states.json, from tools/state_shapes.py) with cos(latitude) weights.

POWER regional limits (from its own error messages, 2026-11-14): each side of the box 2°-10°, one parameter a call.
Bigger states are tiled; smaller ones get a padded box, and the outline picks the grid squares.
"""
import json
import math
from functools import lru_cache

import numpy as np
import pandas as pd
import requests

from paths import CACHE_DIR, CONFIG_DIR

REGIONAL_URL = "https://power.larc.nasa.gov/api/temporal/monthly/regional"
MIN_SIDE, MAX_SIDE = 2.0, 10.0


@lru_cache(maxsize=1)
def load_states():
    return json.loads((CONFIG_DIR / "us_states.json").read_text(encoding="utf-8"))


def inside(rings, lon, lat):
    """Even-odd point-in-polygon over all rings (islands and holes alike). lon, lat: arrays of the same shape."""
    lon, lat = np.asarray(lon, float), np.asarray(lat, float)
    hit = np.zeros(lon.shape, bool)
    for ring in rings:
        r = np.asarray(ring, float)
        x1, y1, x2, y2 = r[:-1, 0], r[:-1, 1], r[1:, 0], r[1:, 1]
        y, x = lat[..., None], lon[..., None]
        with np.errstate(divide="ignore", invalid="ignore"):
            cross = ((y1 > y) != (y2 > y)) & (x < (x2 - x1) * (y - y1) / (y2 - y1) + x1)
        hit ^= (cross.sum(-1) % 2).astype(bool)
    return hit


def tiles(bbox):
    """Split [west, south, east, north] into boxes the regional API accepts (each side 2°-10°)."""
    w, s, e, n = bbox
    out = []
    for lo, hi in _spans(w, e):
        for la, ha in _spans(s, n):
            out.append((lo, la, hi, ha))
    return out


def _spans(a, b):
    if b - a < MIN_SIDE:
        mid = (a + b) / 2
        return [(mid - MIN_SIDE / 2, mid + MIN_SIDE / 2)]
    k = math.ceil((b - a) / MAX_SIDE)
    step = (b - a) / k
    return [(a + i * step, a + (i + 1) * step) for i in range(k)]


def state_weights(code, lats, lons):
    """cos(lat) weights on a lat x lon grid, zero outside the state. A state smaller than one square gets the
    square nearest its middle."""
    st = load_states()[code]
    glon, glat = np.meshgrid(lons, lats)
    mask = inside(st["rings"], glon, glat)
    if not mask.any():
        w, s, e, n = st["bbox"]
        mask = (np.abs(glat - (s + n) / 2) + np.abs(glon - (w + e) / 2)) == \
               (np.abs(glat - (s + n) / 2) + np.abs(glon - (w + e) / 2)).min()
    return np.where(mask, np.cos(np.deg2rad(glat)), 0.0)


def parse_regional(payload, param, per_day=False):
    """POWER regional JSON -> DataFrame (month, lat, lon, value). Drops the yearly "13" column and -999 fills."""
    fill = payload.get("header", {}).get("fill_value", -999)
    rows = []
    for f in payload["features"]:
        lon, lat = f["geometry"]["coordinates"][:2]
        for k, v in f["properties"]["parameter"][param].items():
            if k.endswith("13") or v is None or v == fill:
                continue
            rows.append((pd.Timestamp(int(k[:4]), int(k[4:]), 1), lat, lon, float(v)))
    df = pd.DataFrame(rows, columns=["month", "lat", "lon", "value"]).drop_duplicates(["month", "lat", "lon"])
    if per_day and len(df):
        df["value"] *= df["month"].dt.days_in_month          # mm a day -> mm in the month
    return df


def weighted_state_mean(df, code):
    """Cell values (month, lat, lon, value) -> one weighted state value per month (empty when POWER sent no values)."""
    if df.empty:
        return pd.Series(dtype=float, name=code)
    # an all-ocean tile parses to an empty frame with untyped columns; joined to the rest it makes "value" an object
    df = df.astype({"lat": float, "lon": float, "value": float})
    cube = df.pivot_table(index="month", columns=["lat", "lon"], values="value")
    lats, lons = np.array(sorted(df.lat.unique())), np.array(sorted(df.lon.unique()))
    w = pd.Series(state_weights(code, lats, lons).ravel(), index=pd.MultiIndex.from_product([lats, lons]))
    w = w.reindex(cube.columns).fillna(0)
    vals = cube.to_numpy()
    ww = np.where(np.isfinite(vals), w.to_numpy(), 0.0)
    out = np.nansum(np.nan_to_num(vals) * ww, axis=1) / np.where(ww.sum(1) > 0, ww.sum(1), np.nan)
    return pd.Series(out, index=cube.index, name=code).dropna()


def fetch_state_monthly(code, var_cfg, start_year, end_year, http=requests, cache_dir=CACHE_DIR):
    """Monthly state average for one POWER variable; the averaged series is cached as CSV."""
    param = var_cfg["power"]
    cache = cache_dir / f"power_state_{code}_{param}_{start_year}_{end_year}.csv"
    if cache.exists():
        return pd.read_csv(cache, index_col=0, parse_dates=True).iloc[:, 0]
    parts = []
    for w, s, e, n in tiles(load_states()[code]["bbox"]):
        r = http.get(REGIONAL_URL, timeout=120, params={
            "parameters": param, "community": "RE", "start": start_year, "end": end_year, "format": "JSON",
            "latitude-min": round(s, 3), "latitude-max": round(n, 3),
            "longitude-min": round(w, 3), "longitude-max": round(e, 3)})
        r.raise_for_status()
        parts.append(parse_regional(r.json(), param, var_cfg.get("per_day", False)))
    series = weighted_state_mean(pd.concat(parts).drop_duplicates(["month", "lat", "lon"]), code)
    cache_dir.mkdir(exist_ok=True)
    series.to_csv(cache)
    return series


def grid_state_monthly(da, code):
    """A (time, lat, lon) DataArray (our PM2.5 or NO2 file) -> monthly state average."""
    w, s, e, n = load_states()[code]["bbox"]
    lat_rows = slice(n + 1, s - 1) if da.lat.values[0] > da.lat.values[-1] else slice(s - 1, n + 1)   # some files run north to south
    sub = da.sel(lat=lat_rows, lon=slice(w - 1, e + 1))
    if not sub.sizes["lat"] or not sub.sizes["lon"]:      # the grid doesn't reach this state (Alaska, Hawaii, PR)
        return pd.Series(dtype=float, name=code)
    wts = state_weights(code, sub.lat.values, sub.lon.values)
    vals = sub.values.reshape(sub.sizes["time"], -1)
    ww = np.where(np.isfinite(vals), wts.ravel(), 0.0)
    out = np.nansum(np.nan_to_num(vals) * ww, axis=1) / np.where(ww.sum(1) > 0, ww.sum(1), np.nan)
    idx = pd.to_datetime(sub.time.values).to_period("M").to_timestamp()
    return pd.Series(out, index=idx, name=code).dropna()


def state_at(lat, lon):
    """Postal code of the state containing a point, or None (offshore, outside the US)."""
    for code, st in load_states().items():
        w, s, e, n = st["bbox"]
        if s <= lat <= n and w <= lon <= e and inside(st["rings"], np.array([lon]), np.array([lat]))[0]:
            return code
    return None
