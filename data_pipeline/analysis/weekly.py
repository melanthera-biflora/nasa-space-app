"""
Week by week (SPEC A3 weekly-view, D22): one year as 52 fixed 7-day blocks from 1 January, against each block's normal
range over the period. A view for spotting heat waves, cold snaps and wet weeks; never a trend test (weekly values
add noise and autocorrelation, not trend power: reports/Climatch monthly trends and redesign.md).
"""
import numpy as np
import pandas as pd


def block_of(index):
    """Week number 1-52 for each date: fixed 7-day blocks from 1 January; the last 1-2 days join week 52."""
    return np.minimum((index.dayofyear - 1) // 7 + 1, 52)


def weekly_blocks(series, year, start_year, end_year, agg="mean", decimals=1):
    """series: one value per day. agg: "mean" (temperatures, humidity) or "sum" (rain). None if `year` has no data."""
    s = series.dropna()
    s = s[(s.index.year >= start_year) & (s.index.year <= end_year)]
    if not (s.index.year == year).any():
        return None
    table = s.groupby([s.index.year, block_of(s.index)]).agg(agg).unstack()
    q = table.quantile([0.1, 0.25, 0.5, 0.75, 0.9])
    blocks = []
    for w in range(1, 53):
        first = pd.Timestamp(year, 1, 1) + pd.Timedelta(days=7 * (w - 1))
        last = pd.Timestamp(year, 12, 31) if w == 52 else first + pd.Timedelta(days=6)
        v = table.at[year, w] if w in table.columns and year in table.index else np.nan
        p = {f"p{int(k * 100)}": round(float(q.at[k, w]), decimals) for k in q.index} if w in q.columns else {}
        value = round(float(v), decimals) if np.isfinite(v) else None
        unusual = None
        if value is not None and p:   # compared as shown, so a week equal to its usual edge is not "unusual"
            unusual = "high" if value > p["p90"] else "low" if value < p["p10"] else None
        blocks.append({"week": w, "start": first.strftime("%m-%d"), "end": last.strftime("%m-%d"),
                       "value": value, **p, "unusual": unusual})
    return {"year": year, "period": [start_year, end_year], "blocks": blocks}
