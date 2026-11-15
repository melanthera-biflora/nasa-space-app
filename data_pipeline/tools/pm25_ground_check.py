"""
Ground check for MERRA-2 PM2.5 (T105). MERRA-2 PM2.5 steps up in 2009-10 in Northwest autumns and the Southeast and
stays up (docs/DATA_CHECKS.md §2). Do EPA ground monitors show the same step at the same places and months?

Data:    EPA AirData daily files, no login: daily_88101_<year>.zip (regulatory FRM/FEM) and daily_88502_<year>.zip
         (other PM2.5 monitors), https://aqs.epa.gov/aqsweb/airdata/download_files.html, 2003-2016, kept in
         cache/epa_aqs/ (81 MB).
Method:  24-hour means only (rows "24 HOUR" or "24-HR BLK AVG"), one value per site and day (mean of its monitors).
         A site-month needs 10 days; a site-season needs both of its months. A site counts when it has the season in
         at least 4 years before (2003-2008) and 4 after (2011-2016). Its step = mean after - mean before, for the
         ground and for MERRA-2's square in the same site-years, so both see the same months.
Run:     python -m tools.pm25_ground_check        (from the data_pipeline folder; ~1 min)
"""
import sys
import zipfile

import numpy as np
import pandas as pd
import xarray as xr

from paths import CACHE_DIR, DATA_DIR

RAW_DIR = CACHE_DIR / "epa_aqs"
YEARS = range(2003, 2017)
BEFORE, AFTER = range(2003, 2009), range(2011, 2017)
REGIONS = {"Inland Northwest": ((42, 49), (-124, -110)), "Southeast": ((30, 36), (-90, -80)),
           "Northeast": ((40, 45), (-80, -70))}
SEASONS = {"Oct-Nov": (10, 11), "Jan-Feb": (1, 2)}
SPOKANE_SITE = "53-063-0047"                      # Spokane Monroe St: one monitor (88502, POC 4) from 2004 to 2016
COLS = ["State Code", "County Code", "Site Num", "Latitude", "Longitude", "Sample Duration", "Date Local", "Arithmetic Mean"]


def site_steps(seasons, min_years=4):
    """Pure: seasons has index (site, year) and columns ground, merra2. Per site with enough years on both sides,
    the mean after minus the mean before for each column, and the number of years used."""
    s = seasons.dropna()
    yr = s.index.get_level_values("year")
    b, a = s[yr.isin(BEFORE)].groupby(level="site"), s[yr.isin(AFTER)].groupby(level="site")
    ok = (b.size() >= min_years) & (a.size() >= min_years)
    ok = ok.reindex(s.index.unique("site"), fill_value=False)
    sites = ok[ok].index
    out = a.mean().loc[sites] - b.mean().loc[sites]
    return out.assign(before_ground=b.mean().loc[sites, "ground"], before_merra2=b.mean().loc[sites, "merra2"])


def load_daily():
    parts = []
    for y in YEARS:
        for code in ("88101", "88502"):
            with zipfile.ZipFile(RAW_DIR / f"daily_{code}_{y}.zip") as z:
                df = pd.read_csv(z.open(z.namelist()[0]), usecols=COLS, low_memory=False)
            df = df[df["Sample Duration"].isin(["24 HOUR", "24-HR BLK AVG"])]
            inside = np.zeros(len(df), bool)
            for (la, lo) in REGIONS.values():
                inside |= df.Latitude.between(*la).values & df.Longitude.between(*lo).values
            parts.append(df[inside])
    df = pd.concat(parts, ignore_index=True)
    df["site"] = (df["State Code"].astype(str).str.zfill(2) + "-" + df["County Code"].astype(str).str.zfill(3)
                  + "-" + df["Site Num"].astype(str).str.zfill(4))
    df["date"] = pd.to_datetime(df["Date Local"])
    return df.groupby(["site", "date"]).agg(lat=("Latitude", "first"), lon=("Longitude", "first"),
                                            pm=("Arithmetic Mean", "mean")).reset_index()


def monthly_pairs(daily):
    """(site, year, month) -> ground monthly mean (10+ days) and MERRA-2 at the site's square."""
    daily = daily.assign(year=daily.date.dt.year, month=daily.date.dt.month)
    g = daily.groupby(["site", "year", "month"]).agg(ground=("pm", "mean"), days=("pm", "size"))
    g = g[g.days >= 10].drop(columns="days")
    where = daily.groupby("site")[["lat", "lon"]].first()
    with xr.open_dataarray(DATA_DIR / "pm25_monthly_global.nc") as da:
        m = da.sel(lat=xr.DataArray(where.lat.values, dims="site"), lon=xr.DataArray(where.lon.values, dims="site"),
                   method="nearest").sel(time=slice(str(YEARS[0]), str(YEARS[-1]))).load()
    t = pd.DatetimeIndex(m.time.values)
    merra = pd.DataFrame(m.values, index=pd.MultiIndex.from_arrays([t.year, t.month], names=["year", "month"]),
                         columns=pd.Index(where.index, name="site")).stack().rename("merra2")
    return g.join(merra.reorder_levels(["site", "year", "month"]), how="inner"), where


def season_values(pairs, months):
    s = pairs[pairs.index.get_level_values("month").isin(months)].groupby(level=["site", "year"])
    return s.mean()[s.size() == len(months)]


def main():
    pairs, where = monthly_pairs(load_daily())
    print(f"{pairs.index.unique('site').size} sites with 10+ days in a month, {YEARS[0]}-{YEARS[-1]}\n")

    sp = pairs.xs(SPOKANE_SITE, level="site")
    print(f"Spokane Monroe St ({SPOKANE_SITE}) vs MERRA-2's square, µg/m³ (ground / MERRA-2):")
    for name, months in {"Sep": (9,), **SEASONS}.items():
        s = sp[sp.index.get_level_values("month").isin(months)].groupby(level="year")
        v = s.mean()[s.size() == len(months)]
        print(f"  {name:8}" + " ".join(f"{y % 100:02d}:{r.ground:.1f}/{r.merra2:.1f}" for y, r in v.iterrows()))

    print("\nStep from 2003-08 to 2011-16 at the same sites and site-years (mean over sites, µg/m³):")
    for region, (la, lo) in REGIONS.items():
        sites = where[where.lat.between(*la) & where.lon.between(*lo)].index
        for season, months in SEASONS.items():
            st = site_steps(season_values(pairs[pairs.index.get_level_values("site").isin(sites)], months))
            if st.empty:
                continue
            print(f"  {region:16} {season}: {len(st):3} sites | ground {st.before_ground.mean():5.1f} "
                  f"{st.ground.mean():+5.1f} | MERRA-2 {st.before_merra2.mean():5.1f} {st.merra2.mean():+5.1f}")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
