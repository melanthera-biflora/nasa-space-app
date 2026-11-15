"""
El Niño and La Niña winters (round 4): did a place's records sit differently in El Niño or La Niña winters than in the
other winters, 2001–2025? Pure functions on monthly series (no I/O); the index comes from sources/indices.py.

- A winter is December to February, named by its January (winter 2016 = Dec 2015 to Feb 2016). It counts as El Niño
  when NOAA CPC's Relative Oceanic Niño Index (RONI) for Dec–Feb is +0.5 or more, La Niña at −0.5 or less (CPC's own
  thresholds; RONI is relative to the tropical mean, so warming alone doesn't make winters look like El Niño).
- Each record's winter means have their straight-line trend taken out first: La Niña winters cluster in some decades,
  so a trend alone would otherwise look like a La Niña effect.
- Each phase's winters are compared with the other winters: the words count how many sat above or below the others'
  middle (median); the test is Mann-Whitney U (two groups, no bell curve assumed), which also weighs how far apart they
  sit, then Benjamini-Hochberg across every record and phase tested, as in patterns.relations. (A test on the count
  alone was tried and dropped: it missed the well-known wet El Niño and dry La Niña winters in Texas and Florida.)
  So a lopsided count can still be "not clear" when other winters were often as low or as high; the sentence says so.

It describes the past 24 winters. It is not a seasonal outlook: NOAA's Climate Prediction Center makes those.
"""
import numpy as np
import pandas as pd
from scipy import stats
from scipy.stats import false_discovery_control

EL_NINO, LA_NINA, NEUTRAL = "el_nino", "la_nina", "neutral"
PHASE_WORDS = {EL_NINO: "El Niño", LA_NINA: "La Niña", NEUTRAL: "Neither"}
EDGE = 0.5               # CPC's threshold on the index
MIN_WINTERS = 5          # per group, or the test is left out
# Records that mean something in winter. Left out: summer counts (very hot days, warm nights, muggy days), summer
# ground heat, the wettest day of the year (a yearly record), fires and NO₂ (no plain winter reading).
WINTER_KEYS = ("t2m", "t2m_max", "precip", "gwetroot", "water_storage", "rain_sat", "heavy_rain_days", "dry_days",
               "cold_days", "frost_days", "pm25", "aod", "smoke_days")


def parse_roni(text):
    """{winter year: Dec–Feb RONI} from CPC's RONI.ascii.txt (rows "DJF 2016 2.14"; DJF is named by its January)."""
    out = {}
    for line in text.splitlines():
        parts = line.split()
        if len(parts) == 3 and parts[0] == "DJF":
            out[int(parts[1])] = float(parts[2])
    return out


def phase_of(value):
    return EL_NINO if value >= EDGE else LA_NINA if value <= -EDGE else NEUTRAL


def winter_means(monthly, first_year=None):
    """Mean of Dec, Jan and Feb per winter (named by its January), only for winters with all three months."""
    m = monthly.dropna()
    m = m.groupby(m.index.to_period("M")).mean()
    m = m[m.index.month.isin([12, 1, 2])]
    winter = pd.Series(m.index.year + (m.index.month == 12), index=m.index)
    grouped = m.groupby(winter.to_numpy())
    means = grouped.mean()[grouped.count() == 3]
    if first_year:
        means = means[means.index > first_year]       # the first winter fully after first_year begins
    return means


def _flat(means):
    """Winter means with the straight-line trend taken out (in the record's own unit)."""
    t = means.index.to_numpy(float)
    return means - np.polyval(np.polyfit(t, means.to_numpy(float), 1), t)


def _mostly_one_value(means):
    """Counts that are the same in most winters (no very hot days in winter): nothing to compare."""
    return means.round(6).value_counts().iloc[0] > len(means) / 2


def winters(series, labels, units, roni, first_years=None, alpha=0.05):
    """For each record with enough winters: its detrended winter values and, per phase, how its winters compare with
    the other winters. Records with a clear difference come first."""
    first_years = first_years or {}
    records, tests = [], []
    for key, monthly in series.items():
        if key not in WINTER_KEYS:
            continue
        means = winter_means(monthly, first_years.get(key))
        means = means[means.index.isin(list(roni))]
        if len(means) < 2 * MIN_WINTERS or np.ptp(means.to_numpy()) == 0 or _mostly_one_value(means):
            continue
        flat = _flat(means)
        phases = pd.Series([phase_of(roni[y]) for y in flat.index], index=flat.index)
        rec = {"key": key, "label": labels.get(key, key), "unit": units.get(key),
               "values": [{"year": int(y), "phase": phases[y], "value": round(float(v), 3)} for y, v in flat.items()],
               "phases": []}
        for ph in (EL_NINO, LA_NINA):
            group, other = flat[phases == ph], flat[phases != ph]
            if len(group) < MIN_WINTERS or len(other) < MIN_WINTERS:
                continue
            mid = float(other.median())
            p = float(stats.mannwhitneyu(group, other, alternative="two-sided").pvalue)
            row = {"phase": ph, "n": int(len(group)), "above": int((group > mid).sum()), "below": int((group < mid).sum()),
                   "diff": round(float(group.median() - mid), 3), "p": round(p, 4)}
            rec["phases"].append(row)
            tests.append(row)
        if rec["phases"]:
            records.append(rec)
    if tests:
        for row, q in zip(tests, false_discovery_control([t["p"] for t in tests], method="bh")):
            row["q"] = round(float(q), 4)
            row["clear"] = bool(q < alpha)
    for rec in records:
        for row in rec["phases"]:
            row["sentence"] = _sentence(rec["label"], row)
    records.sort(key=lambda r: (not any(x["clear"] for x in r["phases"]), min(x["q"] for x in r["phases"])))
    years = sorted({v["year"] for r in records for v in r["values"]})
    return {"index": "RONI (NOAA CPC), December to February", "edge": EDGE,
            "first": years[0] if years else None, "last": years[-1] if years else None,
            "winters": [{"year": y, "phase": phase_of(roni[y]), "index": roni[y]} for y in years],
            "records": records, "tested": len(tests)}


def _sentence(label, row):
    higher = row["above"] >= row["below"]
    k = row["above"] if higher else row["below"]
    lead = f"{label}: {'above' if higher else 'below'} the middle of the other winters in {k} of {row['n']} " \
           f"{PHASE_WORDS[row['phase']]} winters"
    if row["clear"]:
        return f"{lead}."
    # not clear: other winters were often as low (or high) too, or the count could be chance among every record tested
    return f"{lead}, but other winters were often as {'high' if higher else 'low'}, so it isn't a clear difference."
