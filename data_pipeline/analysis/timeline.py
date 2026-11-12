"""
Extras for the timeline charts: 5-year smooth line, decade averages, record years,
unusual years, and "notable years" when several factors were bad together.
"""
import numpy as np
import pandas as pd


def timeline_extras(points, cfg):
    """Pre-computed things for the timeline chart, so the website doesn't have to calculate them:
    - rolling_5yr: smooth line (average of each year and the 4 before it)
    - decades:     average per decade (2000s / 2010s / 2020s) for a simple bar chart
    - highlights:  record worst / best year, top 3 worst years
    - unusual_years: years worse than 9 out of 10 years in the period (the 90th percentile)"""
    d = cfg.get("decimals", 1)
    s = pd.Series({p["year"]: p["value"] for p in points}).sort_index()
    worse_high = cfg.get("higher_is_worse", True)
    roll = s.rolling(5, min_periods=3).mean()
    dec = s.groupby((s.index // 10) * 10)
    decades = [{"decade": f"{k}s", "years": [int(g.index.min()), int(g.index.max())],
                "average": round(float(g.mean()), d + 1), "n_years": int(len(g))}
               for k, g in dec]
    order = s.sort_values(ascending=not worse_high)          # worst first
    cut = np.percentile(s.values, 90 if worse_high else 10)
    med = s.median()
    unusual = s[(s >= cut) & (s > med)] if worse_high else s[(s <= cut) & (s < med)]

    def pt(y):
        return {"year": int(y), "value": round(float(s[y]), d + 1)}
    return {
        "rolling_5yr": [{"year": int(y), "value": round(float(v), d + 1)}
                        for y, v in roll.dropna().items()],
        "decades": decades,
        "highlights": {"worst_year": pt(order.index[0]), "best_year": pt(order.index[-1]),
                       "top3_worst": [pt(y) for y in order.index[:3]]},
        "unusual_years": [pt(y) for y in unusual.index],
    }


def notable_years(factors, min_factors=2):
    """Years when several factors were unusually bad at the same time,
    e.g. "2023: Very hot days, Warm nights and Wildfire activity were all unusually high"."""
    by_year = {}
    for f in factors.values():
        if not f.get("available") or f.get("parent"):
            continue
        for u in f["timeline"]["unusual_years"]:
            by_year.setdefault(u["year"], []).append(f["label"])
    out = []
    for y in sorted(by_year):
        labels = by_year[y]
        if len(labels) >= min_factors:
            names = ", ".join(labels[:-1]) + " and " + labels[-1]
            word = "both" if len(labels) == 2 else "all"
            out.append({"year": y, "factors": labels,
                        "text": f"{y}: {names} were {word} unusually bad that year."})
    return out
