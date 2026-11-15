"""
Wildfire activity from NASA FIRMS — ONE-TIME download per country, then instant lookups.

Data:   FIRMS MODIS active fire detections (Collection 6.1, Terra + Aqua, 1 km), 2001 onward
Where:  FIRMS "yearly country files" (free, no login)
        https://firms.modaps.eosdis.nasa.gov/country/
        file pattern: https://firms.modaps.eosdis.nasa.gov/data/country/modis/<YEAR>/modis_<YEAR>_<Country>.csv
Clean:  keep type == 0 (vegetation fire; drops volcanoes, factories, offshore gas flares)
        keep confidence >= 30 (drops low-confidence detections)
        keep only latitude, longitude, date  -> data/fires/modis_<Country>.parquet (small)
Lookup: count detections within 50 km of the address, per month and per year

Run:    python -m sources.fires_firms United_States Vietnam India      (country names as FIRMS spells them)
        python -m sources.fires_firms --na Canada Mexico                (into data/fires/na/: the North America maps
                                                                         only; reports never read that folder)
        Each year is saved in data/fires/years/ as soon as it downloads, so a crash or
        Ctrl+C never loses finished years: run the same command again to continue.
        If a year fails to download, see GUIDE.md part G (manual download).
"""
import io
import json
import sys

import numpy as np
import pandas as pd
import requests

from paths import DATA_DIR

FIRE_DIR = DATA_DIR / "fires"
NA_DIR = FIRE_DIR / "na"   # neighbours' files: _load_all() reads only FIRE_DIR itself, so reports stay US-only
URL = "https://firms.modaps.eosdis.nasa.gov/data/country/modis/{y}/modis_{y}_{c}.csv"
FIRST_TREND_YEAR = 2003   # only Terra flew before July 2002 (half the overpasses), so earlier counts are too low
_cache = {}


def clean_firms(df, min_conf=30):
    df = df.copy()
    if "type" in df:
        df = df[df["type"] == 0]
    df = df[pd.to_numeric(df["confidence"], errors="coerce") >= min_conf]
    return pd.DataFrame({"lat": df["latitude"].astype("float32"),
                         "lon": df["longitude"].astype("float32"),
                         "date": pd.to_datetime(df["acq_date"])})


def download_country(country, start_year=2001, end_year=2025, min_conf=30, fire_dir=None):
    fire_dir = fire_dir or FIRE_DIR
    fire_dir.mkdir(parents=True, exist_ok=True)
    parts, years_ok = [], []
    for y in range(start_year, end_year + 1):
        manual = fire_dir / "manual" / f"modis_{y}_{country}.csv"
        done = fire_dir / "years" / f"{country}_{y}.csv.gz"     # saved right after download
        try:
            if done.exists():
                parts.append(pd.read_csv(done, parse_dates=["date"]))
                years_ok.append(y)
                print(f"  {country} {y}: already downloaded ({len(parts[-1]):,} fires)")
                continue
            if manual.exists():
                raw = pd.read_csv(manual)
            else:
                r = requests.get(URL.format(y=y, c=country), timeout=300)
                r.raise_for_status()
                raw = pd.read_csv(io.StringIO(r.text))
            parts.append(clean_firms(raw, min_conf))
            done.parent.mkdir(parents=True, exist_ok=True)
            parts[-1].to_csv(done, index=False)
            years_ok.append(y)
            print(f"  {country} {y}: {len(parts[-1]):,} fires kept")
        except Exception as e:
            print(f"  {country} {y}: FAILED ({e}) -> download it by hand, see GUIDE.md")
    if not parts:
        return
    out = pd.concat(parts, ignore_index=True)
    out.to_parquet(fire_dir / f"modis_{country}.parquet", index=False)
    meta = {"country": country, "years": years_ok,
            "bbox": [float(out.lat.min()), float(out.lat.max()), float(out.lon.min()), float(out.lon.max())]}
    (fire_dir / f"modis_{country}_meta.json").write_text(json.dumps(meta))
    print(f"Saved {country}: {len(out):,} fires, years {years_ok[0]}-{years_ok[-1]}")


def _load_all():
    if "all" not in _cache:
        files = sorted(FIRE_DIR.glob("modis_*.parquet"))
        if not files:
            raise FileNotFoundError("no fire files yet - run: python -m sources.fires_firms <Country>")
        metas = [json.loads(f.read_text()) for f in FIRE_DIR.glob("modis_*_meta.json")]
        _cache["all"] = (pd.concat([pd.read_parquet(f) for f in files], ignore_index=True), metas)
        # the Parquet reader keeps its freed read buffers in its own pool (about 60 MB for the US file); hand them back,
        # since the API runs in 512 MB on Render
        import pyarrow as pa
        pa.default_memory_pool().release_unused()
    return _cache["all"]


def fires_series(lat, lon, radius_km=50):
    """What pipeline.build_report() calls: detections within radius, per month and per year."""
    df, metas = _load_all()
    covered = [m for m in metas
               if m["bbox"][0] - 1 <= lat <= m["bbox"][1] + 1 and m["bbox"][2] - 1 <= lon <= m["bbox"][3] + 1]
    if not covered:
        raise LookupError("no fire data downloaded for this region - add its country with: python -m sources.fires_firms <Country>")
    years = set.intersection(*[set(m["years"]) for m in covered])
    dlat = radius_km / 111.0
    dlon = radius_km / (111.0 * max(np.cos(np.radians(lat)), 0.05))
    box = df[(df.lat.between(lat - dlat, lat + dlat)) & (df.lon.between(lon - dlon, lon + dlon))]
    # exact distance (haversine)
    p1, p2 = np.radians(lat), np.radians(box.lat.values.astype(float))
    dl = np.radians(box.lon.values.astype(float) - lon)
    a = np.sin((p2 - p1) / 2) ** 2 + np.cos(p1) * np.cos(p2) * np.sin(dl / 2) ** 2
    near = box[6371 * 2 * np.arcsin(np.sqrt(a)) <= radius_km]

    years = sorted(y for y in years if y >= FIRST_TREND_YEAR)
    months = pd.date_range(f"{years[0]}-01-01", f"{years[-1]}-12-01", freq="MS")
    monthly = near.groupby(near.date.dt.to_period("M").dt.to_timestamp()).size()
    monthly = monthly.reindex(months, fill_value=0).astype(float)
    monthly = monthly[monthly.index.year.isin(years)]    # 0 means "no fire", not "no data"
    annual = monthly.groupby(monthly.index.year).sum()
    return {"fires": {"annual": annual, "monthly": monthly}}


if __name__ == "__main__":
    na = sys.argv[1:2] == ["--na"]
    countries = sys.argv[1 + na:] or ["United_States"]
    for c in countries:
        download_country(c, fire_dir=NA_DIR if na else None)
    print(fires_series(33.45, -112.07)["fires"]["annual"].to_string())
