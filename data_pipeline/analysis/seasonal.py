"""
Monthly and seasonal trend statistics (pure, no I/O). The yearly numbers in trends.py stay the headline; this adds
"which part of the year is changing" and "how many years would show it". Methods and the simulations behind them:
reports/Climatch monthly trends and redesign.md.

- overall: Seasonal Kendall corrected for month-to-month memory (correlated_seasonal_test) + seasonal Sen's slope.
- seasons (4) and months (12): Mann-Kendall + Sen's slope per season or calendar month, Benjamini-Hochberg q per family.
- anomaly_test: Hamed-Rao modified MK on monthly anomalies (lag 3), pre-whitening when Hamed-Rao gives NaN.
- years_needed: Weatherhead et al. (1998), with 2 (even odds) and 3.3 (90% likely) for detection at the 95% level.
"""
import numpy as np
import pandas as pd
import pymannkendall as mk
from scipy.stats import false_discovery_control, theilslopes

from analysis.trends import p_label

SEASONS = (("winter", (12, 1, 2)), ("spring", (3, 4, 5)), ("summer", (6, 7, 8)), ("autumn", (9, 10, 11)))
MONTHS = ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")


def month_table(monthly):
    """Monthly series -> years x 12 table (columns 1..12); months without data are NaN."""
    s = monthly.dropna()
    t = s.groupby([s.index.year, s.index.month]).mean().unstack()
    return t.reindex(index=range(s.index.year.min(), s.index.year.max() + 1), columns=range(1, 13))


def season_table(table, agg):
    """years x 4 seasons. Winter is the December before plus January and February, so the first winter is NaN."""
    frames = {"winter": pd.concat([table[12].shift(1), table[1], table[2]], axis=1)}
    frames.update({name: table[list(months)] for name, months in SEASONS[1:]})
    return pd.DataFrame({name: getattr(f, agg)(axis=1, skipna=False) for name, f in frames.items()})


def normals(table, decimals=2):
    """Each calendar month's usual range over the period (10th, 25th, 50th, 75th, 90th percentiles): the grey bands
    behind "this year vs normal"."""
    q = table.quantile([0.1, 0.25, 0.5, 0.75, 0.9])
    return [{"month": int(m), **{f"p{int(k * 100)}": (None if np.isnan(q.at[k, m]) else round(float(q.at[k, m]), decimals))
                                 for k in q.index}} for m in table.columns]


def monthly_z(monthly):
    """How unusual each month is for its calendar month: (value - that month's mean) / its SD. Calendar months that are
    0 in over 3 of 4 years (frost in June, fires in winter) get none: one event there is rare, not "4 SD unusual"."""
    g = monthly.groupby(monthly.index.month)
    sd = g.transform("std")
    usual = g.transform(lambda v: (v != 0).mean()) >= 0.25
    return (monthly - g.transform("mean")) / sd.where((sd > 0) & usual)


def _trend(col, min_years):
    """Mann-Kendall p and Sen's slope (per year) of one season or month across years; None if too few years."""
    v = col.dropna()
    if len(v) < min_years:
        return None
    if np.ptp(v.to_numpy()) == 0:
        return {"slope_per_year": 0.0, "p": 1.0, "n_years": len(v)}
    return {"slope_per_year": float(theilslopes(v.to_numpy(), v.index.to_numpy())[0]),
            "p": float(mk.original_test(v.to_numpy()).p), "n_years": len(v)}


def _family(table, names, alpha, min_years, d):
    rows = [(name, _trend(table[c], min_years)) for name, c in zip(names, table.columns)]
    p = [r["p"] for _, r in rows if r]
    q = iter(false_discovery_control(p) if p else [])
    out = []
    for name, r in rows:
        if not r:
            out.append({"name": name, "available": False})
            continue
        qv = float(next(q))
        out.append({"name": name, "available": True, "slope_per_decade": round(r["slope_per_year"] * 10, d),
                    "p": round(r["p"], 4), "q": round(qv, 4), "clear": qv < alpha, "n_years": r["n_years"]})
    return out


def _seasonal_sen(table):
    """Seasonal Sen's slope (per year): median of all same-month pairwise slopes. Uses real years, so gaps are fine."""
    slopes = []
    for c in table.columns:
        v = table[c].dropna()
        x, y = v.index.to_numpy(float), v.to_numpy(float)
        i, j = np.triu_indices(len(v), 1)
        slopes.append((y[j] - y[i]) / (x[j] - x[i]))
    slopes = np.concatenate(slopes)
    return float(np.median(slopes)) if len(slopes) else 0.0


def _anomaly_test(table):
    x = (table - table.mean()).to_numpy().ravel()
    x = x[np.isfinite(x)]
    r, method = mk.hamed_rao_modification_test(x, lag=3), "Hamed-Rao"
    if not np.isfinite(r.p):    # its corrected variance can go negative
        r, method = mk.pre_whitening_modification_test(x), "pre-whitening"
    return {"p": round(float(r.p), 4), "p_label": p_label(r.p), "slope_per_decade": float(r.slope) * 120, "method": method}


def years_needed(table, slope_per_year):
    """Weatherhead (1998): years of monthly data needed to detect this rate, from the detrended anomalies' SD and
    lag-1 autocorrelation. None when the rate is zero (nothing to detect)."""
    if slope_per_year == 0:
        return None
    a = (table - table.mean()).to_numpy().ravel()
    t = np.arange(len(a)) / 12
    ok = np.isfinite(a)
    resid = a[ok] - np.polyval(np.polyfit(t[ok], a[ok], 1), t[ok])
    sigma = float(np.std(resid, ddof=2))
    phi = float(np.clip(np.corrcoef(resid[:-1], resid[1:])[0, 1], -0.9, 0.95))
    k = np.sqrt((1 + phi) / (1 - phi))
    n = lambda c: min(999, round((c * sigma / abs(slope_per_year) * k) ** (2 / 3)))
    return {"even_odds": n(2), "likely": n(3.3), "sigma": round(sigma, 4), "phi": round(phi, 3)}


def seasonal_block(monthly, agg="mean", alpha=0.05, min_years=8, decimals=2):
    """Everything the seasons and test pages show for one monthly series; None with fewer than min_years years.
    agg is how three months make a season: "sum" for counts (days), "mean" for levels, "max" for wettest day."""
    if pd.Series(monthly).dropna().empty:                # a yearly-only record (the frost-free season)
        return None
    table = month_table(monthly)
    complete = table.dropna()
    if len(complete) < min_years:
        return None
    d = decimals + 1
    flat = np.ptp((table - table.mean()).stack().to_numpy()) == 0   # every month equals its usual (e.g. 0 cold nights)
    p = 1.0 if flat else float(mk.correlated_seasonal_test(complete.to_numpy().ravel(), period=12).p)
    if agg == "sum":
        # Counts are 0 in most off-season months, which pins the pooled same-month slope at 0; use yearly totals,
        # the same unit as the yearly headline (days per year).
        totals = complete.sum(axis=1)
        slope = float(theilslopes(totals.to_numpy(), totals.index.to_numpy())[0])
        per_month = slope / 12
    else:
        slope = per_month = _seasonal_sen(table)
    clear = bool(p < alpha and slope != 0)
    anomaly = ({"p": 1.0, "p_label": p_label(1.0), "slope_per_decade": 0.0, "method": "no change"} if flat
               else _anomaly_test(table))
    return {
        "overall": {"slope_per_year": slope, "slope_per_decade": round(slope * 10, d), "p": round(p, 4),
                    "p_label": p_label(p), "clear": clear, "n_years": len(complete),
                    "method": "Seasonal Kendall, corrected for month-to-month memory"},
        "seasons": _family(season_table(table, agg), [n for n, _ in SEASONS], alpha, min_years, d),
        "months": _family(table, MONTHS, alpha, min_years, d),
        "anomaly_test": {**anomaly, "slope_per_decade": round(anomaly["slope_per_decade"], d)},
        "years_needed": years_needed(table, per_month),
        "normals": normals(table, d),
        "season_agg": agg,
    }



def leave_one_out(points, alpha=0.05, decimals=2, base=None):
    """The yearly test again with each year left out, so a page can show "without 2023 the trend is ..." for an
    event year, and flag a trend that hangs on one year (`flips`: years whose removal changes the verdict).
    points: [{"year", "value"}] as in the report. `alpha`: the record's line after the report's correction;
    `base`: the record's own verdict, so the check never disagrees with it about the full series."""
    from analysis.trends import mk_test
    pts = [(p["year"], p["value"]) for p in points if p.get("value") is not None]
    if len(pts) < 9:
        return None
    x, y = np.array([a for a, _ in pts], float), np.array([b for _, b in pts], float)
    def mk_p(v, xs):
        if np.ptp(v) == 0:
            return 1.0
        slope, intercept = theilslopes(v, xs)[:2]
        return mk_test(v, xs, slope, intercept)[0]          # the same test as the verdict
    base = (mk_p(y, x) < alpha) if base is None else bool(base)
    rows = []
    for i in range(len(x)):
        xi, yi = np.delete(x, i), np.delete(y, i)
        p = mk_p(yi, xi)
        rows.append({"year": int(x[i]), "p": round(p, 4), "clear": p < alpha,
                     "slope_per_decade": round(float(theilslopes(yi, xi)[0]) * 10, decimals + 1)})
    return {"clear": base, "years": rows, "flips": [r["year"] for r in rows if r["clear"] != base]}
