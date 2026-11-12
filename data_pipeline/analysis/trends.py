"""
The statistics: removing the seasons, the straight-line trend, its 95% band,
and the Mann-Kendall significance test. Uses only real data, never extends the line.
"""
import numpy as np
import pandas as pd
import pymannkendall as mk
from scipy import stats


def monthly_anomaly(monthly):
    """Each month minus the average of that calendar month (removes the seasons)."""
    return monthly - monthly.groupby(monthly.index.month).transform("mean")


def p_label(p):
    if p < 0.001:
        return "p < 0.001"
    return f"p = {p:.3f}" if p < 0.1 else f"p = {p:.2f}"


def trend_stats(annual, start_year, end_year, window=5, alpha=0.05, min_years=8):
    """Trend over [start_year, end_year] using only real data (no extension)."""
    s = pd.Series(annual).dropna()
    s = s[(s.index >= start_year) & (s.index <= end_year)]
    if len(s) < min_years:
        return None
    x, y = s.index.values.astype(float), s.values.astype(float)
    n = len(x)
    if np.ptp(y) == 0:                       # same value every year (e.g. 0 frost days in Miami)
        return _constant_trend(s, x, y, window)
    lr = stats.linregress(x, y)
    t = stats.t.ppf(1 - alpha / 2, n - 2)
    resid = y - (lr.intercept + lr.slope * x)
    s_err = np.sqrt(np.sum(resid ** 2) / (n - 2))
    sxx = np.sum((x - x.mean()) ** 2)
    fit = lr.intercept + lr.slope * x
    half = t * s_err * np.sqrt(1 / n + (x - x.mean()) ** 2 / sxx)
    mk_res = mk.original_test(y)
    w = min(window, n)
    return {
        "period": [int(x[0]), int(x[-1])],
        "n_years": n,
        "then_years": [int(x[0]), int(x[w - 1])],
        "now_years": [int(x[-w]), int(x[-1])],
        "then": float(s.iloc[:w].mean()),
        "now": float(s.iloc[-w:].mean()),
        "slope_per_decade": float(lr.slope * 10),
        "slope_ci95_per_decade": [float((lr.slope - t * lr.stderr) * 10),
                                  float((lr.slope + t * lr.stderr) * 10)],
        "mk_p": float(mk_res.p),
        "significant": bool(mk_res.p < alpha),
        "significance_label": "Significant" if mk_res.p < alpha else "Not significant yet",
        "p_label": p_label(mk_res.p),
        "usual_range": [float(np.percentile(y, 10)), float(np.percentile(y, 90))],
        "points": [{"year": int(a), "value": round(float(b), 3)} for a, b in zip(x, y)],
        "line": [{"year": int(a), "trend": round(float(f), 3),
                  "lo95": round(float(f - h), 3), "hi95": round(float(f + h), 3)}
                 for a, f, h in zip(x, fit, half)],
    }


def _constant_trend(s, x, y, window):
    """No variation at all -> nothing to fit or test. Return clean zeros, never NaN."""
    w, v = min(window, len(x)), float(y[0])
    return {
        "constant": True,
        "period": [int(x[0]), int(x[-1])], "n_years": len(x),
        "then_years": [int(x[0]), int(x[w - 1])], "now_years": [int(x[-w]), int(x[-1])],
        "then": v, "now": v, "slope_per_decade": 0.0, "slope_ci95_per_decade": [0.0, 0.0],
        "mk_p": 1.0, "significant": False, "significance_label": "No change",
        "p_label": "no variation", "usual_range": [v, v],
        "points": [{"year": int(a), "value": round(v, 3)} for a in x],
        "line": [{"year": int(a), "trend": round(v, 3), "lo95": round(v, 3), "hi95": round(v, 3)} for a in x],
    }
