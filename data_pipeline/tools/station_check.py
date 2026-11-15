"""Ground-truth check: a NOAA weather station vs the NASA POWER grid cell, for the same cards and cutoffs.
Shows that trends agree in direction while levels differ (a ~50 km cell misses the city's heat island).

Run:  python -m tools.station_check            (demo stations below)
      python -m tools.station_check USW00023183 33.45 -112.07
Station data: NOAA NCEI Access Data Service, GHCN-Daily (free, no key).
"""
import io
import sys

import pandas as pd
import requests

import pipeline as p
from analysis.trends import trend_stats
from paths import CACHE_DIR, load_thresholds
from sources.power import POWER_START_YEAR, annual_counts, clean_daily, fetch_power, power_series

NCEI = "https://www.ncei.noaa.gov/access/services/data/v1"
STATIONS = {   # GHCN-Daily airport stations near the demo cities
    "Phoenix Sky Harbor": ("USW00023183", 33.45, -112.07),
    "Houston Bush Intercontinental": ("USW00012960", 29.76, -95.37),
    "Miami International": ("USW00012839", 25.76, -80.19),
    "Atlanta Hartsfield": ("USW00013874", 33.75, -84.39),
    "Minneapolis-St Paul": ("USW00014922", 44.98, -93.27),
}
CARDS = ["hot_days", "warm_nights", "cold_days"]


def station_daily(station, start, end):
    """Daily TMAX/TMIN (°C) for one station, cached as CSV."""
    cache = CACHE_DIR / f"ncei_{station}_{start}_{end}.csv"
    if not cache.exists():
        r = requests.get(NCEI, params={"dataset": "daily-summaries", "stations": station, "dataTypes": "TMAX,TMIN",
                                       "startDate": f"{start}-01-01", "endDate": f"{end}-12-31",
                                       "units": "metric", "format": "csv"}, timeout=120)
        r.raise_for_status()
        CACHE_DIR.mkdir(exist_ok=True)
        cache.write_text(r.text)
    df = pd.read_csv(cache, parse_dates=["DATE"]).set_index("DATE")
    return df.rename(columns={"TMAX": "T2M_MAX", "TMIN": "T2M_MIN"})[["T2M_MAX", "T2M_MIN"]]


def station_counts(daily, th, min_valid_days):
    """Yearly counts for the temperature cards, with the app's cleaning and missing-day scaling.
    The rules mirror sources/power.daily_flags (stations have no humidity, so the rest is skipped)."""
    df, _, bad_years = clean_daily(daily, min_valid_days)
    flags = pd.DataFrame({
        "hot_days": (df.T2M_MAX >= th["hot_days"]["day_temp_c"]).astype(float).where(df.T2M_MAX.notna()),
        "warm_nights": (df.T2M_MIN >= th["warm_nights"]["night_temp_c"]).astype(float).where(df.T2M_MIN.notna()),
        "cold_days": (df.T2M_MIN < th["cold_days"]["frost_temp_c"]).astype(float).where(df.T2M_MIN.notna()),
    })
    return annual_counts(flags, bad_years)


def compare(name, station, lat, lon):
    th, st = load_thresholds(), load_thresholds()["settings"]
    end = st["data_end_year"]
    grid = power_series(fetch_power(lat, lon, POWER_START_YEAR, end), th, st["min_valid_days_per_year"])[0]
    ground = station_counts(station_daily(station, POWER_START_YEAR, end), th, st["min_valid_days_per_year"])
    print(f"\n{name} ({station}) vs NASA POWER cell at {lat}, {lon}")
    for card in CARDS:
        rows = []
        for label, annual in (("station", ground[card]), ("NASA grid", grid[card]["annual"])):
            t = trend_stats(annual, POWER_START_YEAR, end)
            rows.append(f"{label} {t['then']:.0f} -> {t['now']:.0f}, {t['slope_per_decade']:+.1f}/dec, {t['p_label']}"
                        if t else f"{label} n/a")
        print(f"  {th[card]['label']:18s} " + "  |  ".join(rows))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    p.load_thresholds()   # fail early if config is broken
    if len(sys.argv) == 4:
        compare(sys.argv[1], sys.argv[1], float(sys.argv[2]), float(sys.argv[3]))
    else:
        for name, (sid, lat, lon) in STATIONS.items():
            try:
                compare(name, sid, lat, lon)
            except Exception as e:  # noqa: BLE001 - one station failing shouldn't stop the others
                print(f"\n{name} ({sid}): skipped ({type(e).__name__})")
