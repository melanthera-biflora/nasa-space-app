"""
Neighborhood surface heat from NASA MODIS (1 km) — per location, no account needed.

Data:   MOD11A2 v061 (MODIS/Terra Land Surface Temperature, 8-day composite, 1 km), band LST_Day_1km
Where:  ORNL DAAC "MODIS/VIIRS Land Product Subsets" web service (free, no login)
        https://modis.ornl.gov/data/modis_webservice.html
How:    1. ask the service which 8-day dates exist for this point
        2. download an 11 x 11 km box around the point, 10 dates per request (service limit)
        3. value 0 = no data (clouds); otherwise Kelvin = value x 0.02  -> minus 273.15 = °C
        4. "neighborhood" = 3 x 3 km around the address; "surroundings" = the whole 11 x 11 km box
        5. per year: summer daytime average (Jun-Aug north of the equator, Dec-Feb south)

Speed:  ~115 requests for 2001-2025, roughly 2-6 minutes for a NEW location; then cached in cache/.
        For the demo, run it once for each demo city beforehand.

Test:   python -m sources.modis_lst 33.45 -112.07      (run from the data_pipeline folder)
"""
import sys
import time

import numpy as np
import pandas as pd
import requests

from paths import CACHE_DIR
API = "https://modis.ornl.gov/rst/api/v1"
PRODUCT, BAND = "MOD11A2", "LST_Day_1km"
KM = 5                       # 5 km each side -> 11 x 11 pixels
HEADERS = {"Accept": "application/json"}


def _get(url, params, tries=4):
    for i in range(tries):
        try:
            r = requests.get(url, params=params, headers=HEADERS, timeout=120)
            r.raise_for_status()
            return r.json()
        except Exception:
            if i == tries - 1:
                raise
            time.sleep(2 ** (i + 1))          # wait 2, 4, 8 s and try again


def fetch_lst(lat, lon, start_year=2001, end_year=2025, cache_dir=CACHE_DIR):
    """8-day series: center (3x3 km) and area (11x11 km) daytime surface temperature, °C."""
    cache_dir.mkdir(exist_ok=True)
    cache = cache_dir / f"modis_lst_{lat:.3f}_{lon:.3f}_{start_year}_{end_year}.csv"
    if cache.exists():
        return pd.read_csv(cache, index_col="date", parse_dates=True)

    dates = _get(f"{API}/{PRODUCT}/dates", {"latitude": lat, "longitude": lon})["dates"]
    dates = [d for d in dates if start_year <= int(d["calendar_date"][:4]) <= end_year]
    rows = []
    for i in range(0, len(dates), 10):
        chunk = dates[i:i + 10]
        j = _get(f"{API}/{PRODUCT}/subset", {
            "latitude": lat, "longitude": lon, "band": BAND,
            "startDate": chunk[0]["modis_date"], "endDate": chunk[-1]["modis_date"],
            "kmAboveBelow": KM, "kmLeftRight": KM})
        nrows, ncols = int(j["nrows"]), int(j["ncols"])
        scale = float(j.get("scale", 0.02) or 0.02)
        for item in j["subset"]:
            if item.get("band", BAND) != BAND:
                continue
            a = np.array(item["data"], dtype=float).reshape(nrows, ncols)
            a[a <= 0] = np.nan                       # 0 = fill (clouds / no data)
            a = a * scale - 273.15
            r0, c0 = nrows // 2, ncols // 2
            center = np.nanmean(a[r0 - 1:r0 + 2, c0 - 1:c0 + 2]) if np.isfinite(
                a[r0 - 1:r0 + 2, c0 - 1:c0 + 2]).any() else np.nan
            area = np.nanmean(a) if np.isfinite(a).any() else np.nan
            rows.append({"date": item["calendar_date"], "center_c": center, "area_c": area})
        print(f"  MODIS {min(i + 10, len(dates))}/{len(dates)} dates", end="\r")
    print()
    df = pd.DataFrame(rows).drop_duplicates("date")
    df["date"] = pd.to_datetime(df["date"])
    df = df.set_index("date").sort_index()
    df.to_csv(cache)
    return df


def summer_mean(s, lat, min_obs=3):
    """Average of the summer months per year (Dec counts toward the next year in the south)."""
    months = [6, 7, 8] if lat >= 0 else [12, 1, 2]
    s = s[s.index.month.isin(months)].dropna()
    year = s.index.year + ((s.index.month == 12) & (lat < 0)).astype(int)
    g = s.groupby(year)
    out = g.mean()
    return out[g.count() >= min_obs]


def surface_heat_series(lat, lon):
    """What pipeline.build_report() calls."""
    df = fetch_lst(lat, lon)
    island = df["center_c"] - df["area_c"]
    return {
        "surface_heat": {"annual": summer_mean(df["center_c"], lat),
                         "monthly": df["center_c"].resample("MS").mean()},
        "heat_island": {"annual": summer_mean(island, lat),
                        "monthly": island.resample("MS").mean()},
    }


if __name__ == "__main__":
    lat, lon = (float(sys.argv[1]), float(sys.argv[2])) if len(sys.argv) > 2 else (33.45, -112.07)
    s = surface_heat_series(lat, lon)
    print("Summer daytime surface temperature (°C), 3x3 km around the point:")
    print(s["surface_heat"]["annual"].round(1).to_string())
    print("\nHotter than the 11x11 km area by (°C):")
    print(s["heat_island"]["annual"].round(1).to_string())
