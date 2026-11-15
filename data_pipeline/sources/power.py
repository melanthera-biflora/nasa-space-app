"""
NASA POWER: daily temperature, rain and humidity for one address.
Downloaded automatically per address (10-60 s the first time, then cached in cache/).

Gives the daily-count cards: very hot days, warm nights, frost days,
heavy rain days (+ wettest day), very dry days (+ muggy days).

  fetch_power()     download daily T2M_MAX, T2M_MIN, RH2M, T2MDEW, PRECTOTCORR
  clean_daily()     -999 -> empty, impossible values, incomplete years
  daily_flags()     each day -> yes/no for every threshold
  annual_counts()   days per year       monthly_counts()  days per month
  wettest_day()     biggest single-day rain per year
  power_series()    all of the above, in the shape pipeline.py expects
"""
import numpy as np
import pandas as pd
import requests

from paths import CACHE_DIR

POWER_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
# T2MWET is the daily MEAN wet-bulb temperature (°C); POWER has no daily max (only hourly T2MWET).
POWER_PARAMS = ["T2M_MAX", "T2M_MIN", "RH2M", "T2MDEW", "PRECTOTCORR", "T2MWET"]
POWER_START_YEAR = 2001
DAILY_FACTORS = ["hot_days", "warm_nights", "cold_days", "heavy_rain_days", "dry_days", "muggy_days", "humid_heat_days"]


def fetch_power(lat, lon, start_year=POWER_START_YEAR, end_year=2025, cache_dir=CACHE_DIR):
    """Download daily NASA POWER data for one point; cached as CSV."""
    cache_dir.mkdir(exist_ok=True)
    cache_file = cache_dir / f"power_{lat:.2f}_{lon:.2f}_{start_year}_{end_year}.csv"
    if cache_file.exists():
        cached = pd.read_csv(cache_file, index_col="date", parse_dates=True)
        if all(col in cached for col in POWER_PARAMS):
            return cached
    params = {"parameters": ",".join(POWER_PARAMS), "community": "RE",
              "latitude": lat, "longitude": lon,
              "start": f"{start_year}0101", "end": f"{end_year}1231", "format": "JSON"}
    r = requests.get(POWER_URL, params=params, timeout=180)
    r.raise_for_status()
    df = pd.DataFrame(r.json()["properties"]["parameter"])
    df.index = pd.to_datetime(df.index, format="%Y%m%d")
    df.index.name = "date"
    df.to_csv(cache_file)
    return df


def clean_daily(df, min_valid_days=330):
    df = df.replace(-999, np.nan).replace(-999.0, np.nan)
    limits = {"T2M_MAX": (-60, 60), "T2M_MIN": (-70, 50), "RH2M": (0, 100),
              "T2MDEW": (-70, 40), "PRECTOTCORR": (0, 1000)}
    for col, (lo, hi) in limits.items():
        if col in df:
            df.loc[(df[col] < lo) | (df[col] > hi), col] = np.nan
    full = pd.date_range(df.index.min(), df.index.max(), freq="D")
    df = df.reindex(full)
    df.index.name = "date"
    valid_per_year = df.notna().groupby(df.index.year).sum()
    bad_years = valid_per_year[(valid_per_year < min_valid_days).any(axis=1)].index.tolist()
    return df, valid_per_year, bad_years


def daily_flags(df, th):
    def flag(series, cond):
        out = cond.astype(float)
        out[series.isna()] = np.nan
        return out
    return pd.DataFrame({
        "hot_days":    flag(df["T2M_MAX"], df["T2M_MAX"] >= th["hot_days"]["day_temp_c"]),
        "warm_nights": flag(df["T2M_MIN"], df["T2M_MIN"] >= th["warm_nights"]["night_temp_c"]),
        "cold_days":   flag(df["T2M_MIN"], df["T2M_MIN"] < th["cold_days"]["frost_temp_c"]),
        "heavy_rain_days": flag(df["PRECTOTCORR"],
                                df["PRECTOTCORR"] >= th["heavy_rain_days"]["rain_mm_per_day"]),
        "dry_days":    flag(df["RH2M"], df["RH2M"] < th["dry_days"]["rh_below_pct"]),
        "muggy_days":  flag(df["T2MDEW"], df["T2MDEW"] >= th["muggy_days"]["dew_point_c"]),
        # humid heat (A3, D27): daily-mean wet-bulb; an old cache without T2MWET gives an empty card, not an error
        "humid_heat_days": (flag(df["T2MWET"], df["T2MWET"] >= th["humid_heat_days"]["wet_bulb_c"])
                            if "T2MWET" in df and "humid_heat_days" in th else pd.Series(np.nan, index=df.index)),
    }, index=df.index)


def annual_counts(flags, bad_years=()):
    """Days per year; a few missing days are scaled up so years stay comparable."""
    by_year = flags.groupby(flags.index.year)
    counts, valid = by_year.sum(min_count=1), by_year.count()
    days_in_year = pd.Series([pd.Timestamp(y, 12, 31).dayofyear for y in counts.index],
                             index=counts.index)
    scaled = counts.div(valid).mul(days_in_year, axis=0)
    scaled.loc[scaled.index.isin(bad_years)] = np.nan
    return scaled.round(1)


def monthly_counts(flags):
    return flags.resample("MS").sum(min_count=1)


def wettest_day(df, bad_years=()):
    rain = df["PRECTOTCORR"]
    annual = rain.groupby(rain.index.year).max()
    annual.loc[annual.index.isin(bad_years)] = np.nan
    return annual.round(1), rain.resample("MS").max()


def power_series(daily, th, min_valid_days=330):
    """Daily data -> {factor: {"annual": ..., "monthly": ...}} for every POWER card."""
    df, _, bad_years = clean_daily(daily, min_valid_days)
    flags = daily_flags(df, th)
    annual, monthly = annual_counts(flags, bad_years), monthly_counts(flags)
    series = {k: {"annual": annual[k], "monthly": monthly[k]} for k in DAILY_FACTORS}
    wet_a, wet_m = wettest_day(df, bad_years)
    series["wettest_day"] = {"annual": wet_a, "monthly": wet_m}
    return series, bad_years


def wet_bulb_days(daily, threshold_c, min_valid_days=330):
    """Days per year with daily-mean wet-bulb (T2MWET) at or above threshold_c, scaled and masked like annual_counts."""
    df, _, bad_years = clean_daily(daily, min_valid_days)
    wet = df["T2MWET"]
    flags = (wet >= threshold_c).astype(float).where(wet.notna()).to_frame("wet_bulb_days")
    return annual_counts(flags, bad_years)["wet_bulb_days"]


def compare_heat_cutoffs(lat, lon, temps=(35, 38, 40, 43), daily=None):
    """Team decision helper: very hot days per year at several temperatures."""
    if daily is None:
        daily = fetch_power(lat, lon)
    df, _, _ = clean_daily(daily)
    out = {}
    for t in temps:
        per_year = (df["T2M_MAX"] >= t).groupby(df.index.year).sum()
        out[f">= {t} C"] = {"2001-2005 avg": per_year.loc[2001:2005].mean(),
                           "2021-2025 avg": per_year.loc[2021:2025].mean()}
    return pd.DataFrame(out).T.round(1)
