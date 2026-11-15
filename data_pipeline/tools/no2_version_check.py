"""
Which OMI version built the team's NO2 files (D10, T34)? One month, three ways: the team's monthly mean from
data/no2_years/, and the same month rebuilt from OMNO2d v003 and from v004 the way the team's first script built it
(ColumnAmountNO2TropCloudScreened, plain mean of the valid days, no minimum). The right version should match the team's
file almost exactly. That script searched OMNO2d without a version and kept whichever granule came last for each day,
so a month can also mix versions: `mix_v003` is the least-squares share of v003 in team = mix·v003 + (1 − mix)·v004.

Needs an Earthdata login in YOUR terminal (EARTHDATA_TOKEN, or earthaccess prompts). Nothing is saved; about 25 MB is
fetched (2 versions x ~31 days x 0.4 MB of US block). No token or URL is ever printed.

Run:  python -m tools.no2_version_check            (July 2015, from the data_pipeline folder)
      python -m tools.no2_version_check 2022 7     (any month in 2005-2025; v003 ends in March 2026)
"""
import sys
import warnings
from concurrent.futures import ThreadPoolExecutor

import numpy as np
import pandas as pd
import xarray as xr

from sources.no2_omi import LAT, LON, YEARS_DIR, fetch_block, file_date, opendap_url, var_path

EXACT = 1e-3   # 1e15 molecules/cm2: float32 rounding is far below this, a version difference far above it


def team_month(year, month, years_dir=YEARS_DIR):
    """The team's monthly mean for the US block (the same rows and columns we fetch)."""
    with xr.open_dataarray(years_dir / f"no2_{year}.nc") as da:
        m = da.sel(time=da.time.dt.month == month, lat=slice(LAT[0] - 0.01, LAT[-1] + 0.01),
                   lon=slice(LON[0] - 0.01, LON[-1] + 0.01))
        return m.isel(time=0).values.astype(float)


def version_month(earthaccess, session, version, year, month):
    """One version's month, averaged like the team's script: mean of the valid days per cell."""
    end = (pd.Timestamp(year, month, 1) + pd.offsets.MonthEnd(0)).strftime("%Y-%m-%d")
    results = earthaccess.search_data(short_name="OMNO2d", version=version, temporal=(f"{year}-{month:02d}-01", end))
    by_day = {d: r for r in results if (d := file_date(r["umm"]["GranuleUR"])) is not None and d.month == month}
    if not by_day:
        raise RuntimeError(f"no OMNO2d v{version} files for {year}-{month:02d}")
    try:
        urls = [opendap_url(by_day[d]) for d in sorted(by_day)]
    except StopIteration:
        raise RuntimeError(f"OMNO2d v{version} granules have no OPeNDAP link") from None
    path = var_path(session.get(urls[0] + ".dmr.xml", timeout=120).content)

    def one(url):
        try:
            return fetch_block(session, url, path)
        except Exception as e:  # noqa: BLE001 - a missing day is skipped, as in the team's script
            print(f"  v{version}: skipped a day ({type(e).__name__})")
            return None

    with ThreadPoolExecutor(max_workers=8) as ex:
        days = [a for a in ex.map(one, urls) if a is not None]
    print(f"  v{version}: {len(days)} of {len(urls)} days")
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", RuntimeWarning)          # cells with no valid day stay NaN
        return np.nanmean(np.stack(days), axis=0).astype(float)


def compare(team, v3, v4):
    """Pure: how close the team's month is to each version, on cells where all three have a value."""
    ok = np.isfinite(team) & np.isfinite(v3) & np.isfinite(v4)
    t, a, b = team[ok], v3[ok], v4[ok]

    def stats(x):
        d = np.abs(t - x)
        return {"r": round(float(np.corrcoef(t, x)[0, 1]), 5), "median_abs_diff": round(float(np.median(d)), 4),
                "exact_share": round(float((d < EXACT).mean()), 4)}

    den = float(((a - b) ** 2).sum())
    mix = float(((t - b) * (a - b)).sum() / den) if den > 0 else float("nan")
    return {"cells": int(ok.sum()), "v003": stats(a), "v004": stats(b), "mix_v003": round(mix, 3),
            "median": {"team": round(float(np.median(t)), 3), "v003": round(float(np.median(a)), 3),
                       "v004": round(float(np.median(b)), 3)}}


def main(year=2015, month=7):
    import earthaccess
    earthaccess.login()   # no persist=True: leaves no password in ~/.netrc
    session = earthaccess.get_requests_https_session()
    team = team_month(year, month)
    res = compare(team, version_month(earthaccess, session, "003", year, month),
                  version_month(earthaccess, session, "004", year, month))
    print(f"{year}-{month:02d}, {res['cells']} US cells, medians (1e15 molecules/cm2) {res['median']}")
    for v in ("v003", "v004"):
        s = res[v]
        print(f"  team vs {v}: r {s['r']}, median |diff| {s['median_abs_diff']}, identical cells {s['exact_share']:.1%}")
    print(f"  best mix: {res['mix_v003']:.2f} v003 + {1 - res['mix_v003']:.2f} v004")
    best = min(("v003", "v004"), key=lambda v: res[v]["median_abs_diff"])
    print(f"Verdict: {'matches' if res[best]['exact_share'] > 0.99 else 'closest to'} {best}"
          + ("" if res[best]["exact_share"] > 0.99 else " (not identical: mixed versions, or another processing)"))
    return res


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main(*map(int, sys.argv[1:3])) if len(sys.argv) >= 3 else main()
