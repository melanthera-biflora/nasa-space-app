"""
The statistics: removing the seasons, the trend line, its 95% band, and the significance test. Uses only real data,
never extends the line.

One method for the number and the verdict (research review items 14-16, D47):
- the rate is the Theil-Sen slope with its 95% range (robust to one wild year), and the line and band are drawn
  from that same slope range, so the chart, the rate and the verdict agree;
- the verdict's test is Mann-Kendall. A memory check runs beside it: years that remember the year before carry less
  independent evidence, so a second p shrinks the test statistic by the effective sample size, n (1 - r) / (1 + r),
  with the lag-1 autocorrelation r of the detrended years corrected for its small-sample bias (+ (1 + 4r) / n). In 500
  simulated 25-year series per case it kept false alarms at 3-7% for memory up to 0.6, where the plain test gave
  9-49%. (The library's trend-free pre-whitening, Yue et al. 2002, and the Hamed-Rao and Yue-Wang corrections did no
  better than the plain test at n = 25.) Used in the verdict it took the 7 demo cities from 37 clear records to 15,
  NO2's decline included, so the owner chose to show it as a note instead (D47): a clear record whose memory-aware p
  misses its line is `memory_sensitive`, and /test says so;
- a report tests about 16 records at once, so `correct_across` applies a Benjamini-Hochberg correction over them:
  "clearly" means q < 0.05, not p < 0.05.
"""
import numpy as np
import pandas as pd
import pymannkendall as mk
from scipy import stats
from scipy.stats import false_discovery_control


def monthly_anomaly(monthly):
    """Each month minus the average of that calendar month (removes the seasons)."""
    return monthly - monthly.groupby(monthly.index.month).transform("mean")


def p_label(p):
    if p < 0.001:
        return "p < 0.001"
    return f"p = {p:.3f}" if p < 0.1 else f"p = {p:.2f}"


def lag1(y, x, slope, intercept):
    """Lag-1 autocorrelation of the years around the trend line (how much a year remembers the one before)."""
    y = np.asarray(y, float)
    resid = y - (intercept + slope * np.asarray(x, float))
    tiny = 1e-9 * (np.std(y) + 1e-12)                  # a line that fits exactly leaves only rounding noise
    if len(resid) < 4 or np.std(resid[:-1]) <= tiny or np.std(resid[1:]) <= tiny:
        return 0.0
    r1 = float(np.corrcoef(resid[:-1], resid[1:])[0, 1])
    return 0.0 if np.isnan(r1) else r1


def mk_test(y, x, slope, intercept):
    """(p, memory-aware p, lag-1): the plain Mann-Kendall p, and the same test with its z shrunk by the effective
    sample size (see the module notes)."""
    y = np.asarray(y, float)
    res = mk.original_test(y)
    r1 = lag1(y, x, slope, intercept)
    r = min(max(r1 + (1 + 4 * r1) / len(y), 0.0), 0.9)          # bias-corrected, kept in [0, 0.9]
    z = res.z / np.sqrt((1 + r) / (1 - r))
    return float(res.p), float(2 * (1 - stats.norm.cdf(abs(z)))), r1


def correct_across(trends, alpha=0.05):
    """Benjamini-Hochberg across one report's records, in place: each tested record gets `q`, and `significant`
    becomes q < alpha. `alpha_line` is the record's step-up line (alpha x rank / m): the single-year check judges
    against it, so it can't disagree with the verdict. Records with nothing to test (None, constant) are skipped."""
    keys = [k for k, t in trends.items() if t and not t.get("constant")]
    if not keys:
        return trends
    q = false_discovery_control([trends[k]["mk_p"] for k in keys], method="bh")
    m = len(keys)
    for rank, k in enumerate(sorted(keys, key=lambda k: trends[k]["mk_p"]), 1):
        trends[k]["alpha_line"] = alpha * rank / m
    for k, qq in zip(keys, q):
        t = trends[k]
        t["q"], t["records_tested"] = round(float(qq), 4), m
        t["significant"] = bool(qq < alpha and t["slope_per_decade"] != 0)
        t["significance_label"] = "Significant" if t["significant"] else "Not significant yet"
        t["memory_sensitive"] = bool(t["significant"] and t.get("mk_p_memory", 0) >= t["alpha_line"])
    return trends


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
    slope, intercept, lo_s, hi_s = stats.theilslopes(y, x, alpha=1 - alpha)
    fit = intercept + slope * x
    # the band: lines through the median point with the slope range's two ends (the line passes through the medians)
    xm, ym = float(np.median(x)), float(np.median(y))
    ends = np.stack([ym + lo_s * (x - xm), ym + hi_s * (x - xm)])
    band_lo, band_hi = ends.min(axis=0), ends.max(axis=0)
    p, p_memory, r1 = mk_test(y, x, slope, intercept)
    # a Sen rate of 0 (mostly-zero counts) can't be a clear change, whatever the test says: same rule as the seasons
    clear = bool(p < alpha and slope != 0)
    w = min(window, n)
    return {
        "period": [int(x[0]), int(x[-1])],
        "n_years": n,
        "then_years": [int(x[0]), int(x[w - 1])],
        "now_years": [int(x[-w]), int(x[-1])],
        "then": float(s.iloc[:w].mean()),
        "now": float(s.iloc[-w:].mean()),
        "slope_per_decade": float(slope * 10) + 0.0,           # + 0.0 turns -0.0 into 0.0
        "slope_ci95_per_decade": [float(lo_s * 10), float(hi_s * 10)],
        "mk_p": p,
        "mk_p_memory": round(p_memory, 4),
        "lag1": round(r1, 3),
        "significant": clear,
        "memory_sensitive": bool(clear and alpha <= p_memory),  # recomputed against the corrected line in a report
        "significance_label": "Significant" if clear else "Not significant yet",
        "p_label": p_label(p),
        "usual_range": [float(np.percentile(y, 10)), float(np.percentile(y, 90))],
        "points": [{"year": int(a), "value": round(float(b), 3)} for a, b in zip(x, y)],
        "line": [{"year": int(a), "trend": round(float(f), 3),
                  "lo95": round(float(lo), 3), "hi95": round(float(hi), 3)}
                 for a, f, lo, hi in zip(x, fit, band_lo, band_hi)],
    }


def _constant_trend(s, x, y, window):
    """No variation at all -> nothing to fit or test. Return clean zeros, never NaN."""
    w, v = min(window, len(x)), float(y[0])
    return {
        "constant": True,
        "period": [int(x[0]), int(x[-1])], "n_years": len(x),
        "then_years": [int(x[0]), int(x[w - 1])], "now_years": [int(x[-w]), int(x[-1])],
        "then": v, "now": v, "slope_per_decade": 0.0, "slope_ci95_per_decade": [0.0, 0.0],
        "mk_p": 1.0, "mk_p_memory": 1.0, "lag1": 0.0, "significant": False, "memory_sensitive": False,
        "significance_label": "No change",
        "p_label": "no variation", "usual_range": [v, v],
        "points": [{"year": int(a), "value": round(v, 3)} for a in x],
        "line": [{"year": int(a), "trend": round(v, 3), "lo95": round(v, 3), "hi95": round(v, 3)} for a in x],
    }
