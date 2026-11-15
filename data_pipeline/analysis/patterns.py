"""
Patterns across variables and signs of change (SPEC A4): pure functions on monthly series (no I/O).

- relations: do two variables' unusual months line up, at once or with one leading by up to 3 months? Spearman r on
  calendar-month z-scores; significance with an effective sample size for month-to-month memory (Bretherton et al.
  1999), then Benjamini-Hochberg across every pair and lag tested.
- warning_signs: are the ups and downs getting bigger (variance) or slower to fade (lag-1 memory)? Rolling windows of
  detrended anomalies and Kendall's tau over time, the standard "early-warning" indicators for systems near a tipping
  point (Scheffer et al. 2009; Dakos et al. 2012). They describe the past; they are not a forecast of a disaster.
- exceedance: how many months a year pass the record's own top-10% line for their time of year, early years against
  recent ones. One line for every year, so both ends are judged alike (Zhang et al. 2005: a line set on the early years
  alone makes later years look more extreme even when nothing changed).
- compound: months where two things are extreme together (hot and dry, hot and smoky), counted per year, with a trend.
- lead_hits: for a link where one leads, how often its most unusual months were followed by the other's (the honest
  form of "could this warn us?": a hit rate against chance, in the past record, tested by shifting one record in time).

All of them work on a full monthly calendar: a record with gaps (GRACE, smoke, summer-only counts) keeps its gaps as
missing months, so "2 months later" always means two calendar months.
"""
from itertools import combinations

import numpy as np
import pandas as pd
import pymannkendall as mk
from scipy import stats

from analysis.seasonal import monthly_z

# Which dataset each variable comes from: links inside one dataset are partly built in (same model, same days).
FAMILIES = {**{k: "NASA POWER (MERRA-2 weather)" for k in ("hot_days", "warm_nights", "cold_days", "heavy_rain_days", "wettest_day",
                                                                "dry_days", "muggy_days", "humid_heat_days", "t2m", "t2m_max", "precip",
                                                                "gwetroot", "frost_days")},
            "pm25": "MERRA-2 aerosols", "aod": "MERRA-2 aerosols", "no2": "OMI", "fires": "FIRMS", "smoke_days": "NOAA HMS",
            "rain_sat": "GPM IMERG", "surface_heat_5km": "MODIS", "surface_heat": "MODIS", "heat_island": "MODIS",
            "water_storage": "GRACE"}


def _z(s):
    s = s.dropna()
    return monthly_z(s.groupby(level=0).mean()).dropna()      # one value per month


def _anomalies(s):
    """Calendar-month z-scores with the straight-line trend taken out, on a full monthly calendar (gaps stay NaN, so a
    shift of k is k calendar months). Two records that both drift for unrelated reasons would otherwise look linked."""
    z = _z(s)
    z.index = z.index.to_period("M").to_timestamp()
    if len(z) < 3:
        return z
    t = (z.index.year * 12 + z.index.month).to_numpy(float)          # time in months, so gaps keep their length
    flat = z.to_numpy() - np.polyval(np.polyfit(t, z.to_numpy(), 1), t)
    return pd.Series(flat, index=z.index).asfreq("MS")


def _lag1(s):
    """Lag-1 autocorrelation over months that really follow each other (pairs across a gap are skipped)."""
    s = pd.Series(np.asarray(s, float)) if not isinstance(s, pd.Series) else s
    pair = pd.concat([s, s.shift(-1)], axis=1).dropna()
    if len(pair) < 4 or pair.iloc[:, 0].std() == 0 or pair.iloc[:, 1].std() == 0:
        return 0.0
    return float(np.corrcoef(pair.iloc[:, 0], pair.iloc[:, 1])[0, 1])


def n_effective(n, r1a, r1b):
    """Bretherton et al. (1999): fewer independent months when both series remember the month before."""
    return n * (1 - r1a * r1b) / (1 + r1a * r1b)


def _words(label):
    """Lower-case a label for the middle of a sentence, but keep acronyms (PM2.5, IMERG, NO₂)."""
    return label[0].lower() + label[1:] if len(label) > 1 and label[1].islower() else label


def _is(label):
    """'are' for plural labels (smoke days, rain and snow, fire detections), else 'is' (soil wetness, haze)."""
    words = label.split(" (")[0].strip().lower().split()
    plural = any(w.endswith("s") and not w.endswith("ss") for w in words[-2:])     # "fire detections nearby"
    return "are" if "and" in words or plural else "is"


def relations(series, labels=None, families=None, max_lag=3, min_months=60, alpha=0.05, min_r=0.2):
    """series: {key: monthly Series}. Every pair, both directions for lags 1..max_lag, on detrended calendar-month
    z-scores. families: {key: dataset}; pairs from the same dataset are marked `same_source` (partly built in)."""
    labels, families = labels or {}, families or {}
    z = {k: v for k, s in series.items() if (v := _anomalies(s)).count() >= min_months and v.std() > 0}
    memory = {k: _lag1(v) for k, v in z.items()}
    tests = []
    for a, b in combinations(sorted(z), 2):
        for lead, follow in ((a, b), (b, a)):
            for lag in range(0, max_lag + 1):
                if lag == 0 and lead == b:
                    continue                      # lag 0 is the same both ways
                x, y = z[lead], z[follow].shift(-lag)
                both = pd.concat([x, y], axis=1, join="inner").dropna()
                if len(both) < min_months:
                    continue
                r = float(stats.spearmanr(both.iloc[:, 0], both.iloc[:, 1])[0])
                ne = max(3.0, n_effective(len(both), memory[lead], memory[follow]))
                t = r * np.sqrt((ne - 2) / max(1e-9, 1 - r * r))
                p = float(2 * stats.t.sf(abs(t), ne - 2))
                tests.append({"a": lead, "b": follow, "lag": lag, "r": round(r, 3), "p": p, "n": len(both)})
    if not tests:
        return []
    q = stats.false_discovery_control([t["p"] for t in tests])
    for t, qv in zip(tests, q):
        t["m"] = len(tests)                       # how many tests the correction covered
        t["q"] = round(float(qv), 4)
        t["p"] = round(t["p"], 4)
        t["clear"] = bool(qv < alpha and abs(t["r"]) >= min_r)
    # one row per pair: its strongest lag
    best = {}
    for t in tests:
        key = tuple(sorted((t["a"], t["b"])))
        if key not in best or abs(t["r"]) > abs(best[key]["r"]):
            best[key] = t
    out = sorted(best.values(), key=lambda t: -abs(t["r"]))
    for t in out:
        la, lb = labels.get(t["a"], t["a"]), labels.get(t["b"], t["b"])
        t["same_source"] = bool(families.get(t["a"]) and families.get(t["a"]) == families.get(t["b"]))
        when = "in the same month" if t["lag"] == 0 else f"{t['lag']} month{'s' if t['lag'] > 1 else ''} later"
        way = "above" if t["r"] > 0 else "below"
        r = f"{t['r']:+.2f}".replace("-", "−")
        t["sentence"] = (f"When {_words(la)} {_is(la)} above usual, {_words(lb)} {'tend' if _is(lb) == 'are' else 'tends'} to be {way} usual {when} (r = {r})."
                         if t["clear"] else f"{la} and {_words(lb)}: no clear link (r = {r}).")
    return out


def pair_lines(series_a, series_b, smooth=3):
    """The two records of a link as the test sees them (detrended calendar-month z on one calendar), averaged over
    `smooth` months so the drawing is readable: [{month: 'YYYY-MM', a, b}] with None in gaps."""
    za, zb = _anomalies(series_a), _anomalies(series_b)
    idx = za.index.union(zb.index)
    soft = lambda z: z.reindex(idx).rolling(smooth, center=True, min_periods=min(2, smooth)).mean()
    a, b = soft(za), soft(zb)
    num = lambda v: None if np.isnan(v) else round(float(v), 2)
    return [{"month": d.strftime("%Y-%m"), "a": num(x), "b": num(y)} for d, x, y in zip(idx, a.to_numpy(), b.to_numpy())]


def warning_signs(monthly, window_years=10, step=6, min_share=0.6):
    """Rolling variance and lag-1 memory of detrended monthly anomalies, and whether each rises over time. Windows are
    `window_years` of calendar time; a window with under `min_share` of its months present is skipped."""
    z = _anomalies(monthly)
    if z.count() < window_years * 12 + 24:
        return None
    w = window_years * 12
    var, mem, dates = [], [], []
    for e in range(w, len(z) + 1, step):
        win = z.iloc[e - w:e]
        if win.count() < min_share * w:
            continue
        var.append(float(np.nanvar(win.to_numpy())))
        mem.append(_lag1(win))
        dates.append(z.index[e - 1].strftime("%Y-%m"))
    if len(var) < 4:
        return None

    def trend(vals):
        tau = float(stats.kendalltau(np.arange(len(vals)), vals)[0])
        return {"first": round(vals[0], 3), "last": round(vals[-1], 3), "tau": round(tau, 3),
                "rising": bool(tau > 0.5 and vals[-1] > vals[0] * 1.2 if vals[0] > 0 else tau > 0.5)}

    return {"window_years": window_years, "ends": dates, "variance": {**trend(var), "values": [round(v, 3) for v in var]},
            "memory": {**trend(mem), "values": [round(v, 3) for v in mem]}}


def exceedance(monthly, base_years=10, q=0.9, alpha=0.05):
    """Share of each complete year's months above the record's own 90th percentile for that calendar month (strictly
    above, so a count that is usually 0 doesn't pass on a tie), the first `base_years` complete years against the last."""
    m = monthly.dropna()
    if m.empty:
        return None
    m = m.groupby(level=0).mean()
    edge = m.groupby(m.index.month).quantile(q)
    above = (m > edge.reindex(m.index.month).to_numpy()).astype(float)
    share = above.groupby(m.index.year).mean()
    share = share[m.groupby(m.index.year).count() == 12]
    if len(share) < 12:
        return None
    n = min(base_years, len(share) // 2)                  # the two ends never overlap
    p = float(mk.original_test(share.to_numpy()).p) if np.ptp(share.to_numpy()) > 0 else 1.0
    early, late = share.iloc[:n], share.iloc[-n:]
    span = lambda part: [int(part.index[0]), int(part.index[-1])]
    a, b = span(early), span(late)
    return {"early_years": a, "late_years": b, "years": {int(y): round(float(v), 3) for y, v in share.items()},
            "first": round(float(early.mean()), 3), "last": round(float(late.mean()), 3), "p": round(p, 4), "clear": p < alpha,
            "sentence": f"Months above the record's top-10% line for their time of year: {early.mean() * 10:.1f} in 10 in "
                        f"{a[0]}–{a[1]}, {late.mean() * 10:.1f} in 10 in {b[0]}–{b[1]}."}


def compound(monthly_a, monthly_b, b_low=False, q=0.9, alpha=0.05):
    """Months per year where A is in its calendar month's top 10% and B in its top (or, with b_low, bottom) 10%."""
    za, zb = _z(monthly_a), _z(monthly_b)
    both = pd.concat([za, zb], axis=1, join="inner").dropna()
    if len(both) < 60:                                  # summer-only records (very hot days) have ~4 months a year
        return None
    a, b = both.iloc[:, 0], both.iloc[:, 1]
    # strictly beyond the line: with counts, ties at the line would flag far more than 10% of months
    hit_a = a > a.groupby(a.index.month).transform(lambda v: v.quantile(q))
    hit_b = (b < b.groupby(b.index.month).transform(lambda v: v.quantile(1 - q))) if b_low \
        else (b > b.groupby(b.index.month).transform(lambda v: v.quantile(q)))
    counts = (hit_a & hit_b).groupby(both.index.year).sum()
    years = counts.index.to_numpy(float)
    slope = float(stats.theilslopes(counts.to_numpy(float), years)[0]) if len(counts) > 2 else 0.0
    p = float(mk.original_test(counts.to_numpy(float)).p) if np.ptp(counts.to_numpy()) > 0 else 1.0
    return {"counts": {int(y): int(c) for y, c in counts.items()}, "total": int(counts.sum()),
            "slope_per_decade": round(slope * 10, 2), "p": round(p, 4), "clear": bool(p < alpha and slope != 0)}


def lead_hits(lead, follow, lag, r, q=0.9, alpha=0.05, min_gap=12):
    """After the months where `lead` was in its top 10% (detrended calendar-month z), how often was `follow` in the tail
    the link points to (top 10% if r > 0, bottom if r < 0) `lag` calendar months later?

    Chance is not simply 1 in 10: unusual months come in runs (water storage remembers last month), so the test shifts
    `follow` around the calendar by `min_gap` months or more and counts how often a shifted copy does as well. That keeps
    each record's own runs. It does not undo the fact that the link was chosen on these same months, so the hit rate
    flatters the link a little; the page says so."""
    za, zb = _anomalies(lead), _anomalies(follow)
    idx = za.index.union(zb.index)
    a = za.reindex(idx).to_numpy()
    b = zb.reindex(idx).shift(-lag).to_numpy()
    if np.sum(~np.isnan(a) & ~np.isnan(b)) < 60:
        return None
    case = a > np.nanquantile(a, q)
    line = np.nanquantile(b, q if r > 0 else 1 - q)

    def score(bb):
        seen = case & ~np.isnan(bb)
        hit = seen & ((bb > line) if r > 0 else (bb < line))
        return int(seen.sum()), int(hit.sum())

    n, k = score(b)
    if n < 10:
        return None
    rate = k / n
    rates = [(h / m) if m else 0.0 for m, h in (score(np.roll(b, s)) for s in range(min_gap, len(b) - min_gap + 1))]
    p = (1 + sum(x >= rate for x in rates)) / (1 + len(rates))
    chance = float(np.mean(rates)) if rates else 1 - q
    return {"cases": n, "hits": k, "rate": round(rate, 3), "chance": round(chance, 3),
            "lift": round(rate / chance, 2) if chance else None, "p": round(p, 4), "clear": bool(p < alpha)}
