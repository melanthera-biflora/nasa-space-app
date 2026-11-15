"""
Explore relations and signs of change across places (SPEC A4 experiment). Run from data_pipeline/:

    python -m tools.patterns_scan            # ~2 min with cached data; prints a summary, writes output/patterns_scan.json

Uses the same analysis as /api/v1/patterns (analysis/patterns.py) on household-neutral reports for cities and on state
averages, and keeps only what passes its tests: relations with q < 0.05 and |r| >= 0.2, trends in exceedance and
compound extremes with Mann-Kendall p < 0.05, and warning signs where the indicator rises clearly (tau > 0.5).
"""
import json
import sys

import pandas as pd

import pipeline as p
from analysis import patterns as pt
from paths import OUTPUT_DIR

CITIES = {"Phoenix": (33.45, -112.07), "Houston": (29.76, -95.37), "Spokane": (47.66, -117.43), "Portland": (45.52, -122.68),
          "Milwaukee": (43.04, -87.91), "Sacramento": (38.58, -121.49), "Denver": (39.74, -104.99), "Miami": (25.76, -80.19)}
STATES = ("CA", "TX", "WI", "WA", "AZ")
STATE_VARS = ("t2m", "precip", "gwetroot", "smoke_days", "aod", "water_storage", "pm25")


def series_of(factor):
    rows = [(m["month"], m["value"]) for m in factor.get("monthly") or [] if m.get("value") is not None]
    s = pd.Series([v for _, v in rows], index=pd.to_datetime([m for m, _ in rows])) if rows else None
    return s if s is not None and s.std() > 0 else None


def summarize(name, factors):
    series = {k: s for k, f in factors.items() if f.get("available") and not f.get("constant") and (s := series_of(f)) is not None}
    labels = {k: f["label"] for k, f in factors.items()}
    rel = [r for r in pt.relations(series, labels, pt.FAMILIES) if r["clear"] and not r["same_source"]]
    for r in rel:
        if r["lag"] > 0:
            r["lead_hits"] = pt.lead_hits(series[r["a"]], series[r["b"]], r["lag"], r["r"])
    signs, exceed = [], []
    for k, s in series.items():
        w = pt.warning_signs(s)
        if w and (w["variance"]["rising"] or w["memory"]["rising"]):
            signs.append({"key": k, "variance": w["variance"]["rising"], "memory": w["memory"]["rising"],
                          "var_first": w["variance"]["first"], "var_last": w["variance"]["last"], "tau": w["variance"]["tau"]})
        e = pt.exceedance(s)
        if e and e["clear"]:
            exceed.append({"key": k, "first": e["first"], "last": e["last"], "p": e["p"]})
    return {"place": name, "relations": rel[:6], "signs": signs, "exceedance": exceed}


def main():
    out = []
    for name, (lat, lon) in CITIES.items():
        rep = p.build_neutral_report(lat, lon, period_years=25, sources=("pm25", "no2", "fires") + p.ADDED_SOURCES)
        out.append(summarize(name, rep["factors"]))
    for code in STATES:
        factors = {}
        for v in STATE_VARS:
            try:
                factors[v] = p.build_region(code, v, 25)["factor"]
            except Exception as e:  # noqa: BLE001 - a variable missing for a state must not stop the scan
                print(f"skip {code} {v}: {e!r}")
        out.append(summarize(code, factors))
    for o in out:
        print(f"\n== {o['place']}")
        for r in o["relations"]:
            print(f"  link   {r['sentence']}  q={r['q']}")
            if h := r.get("lead_hits"):
                print(f"         early clue: {h['hits']} of {h['cases']} (chance ~{h['chance'] * h['cases']:.1f}, p={h['p']})")
        for e in o["exceedance"]:
            print(f"  more   {e['key']}: top-10% months {e['first'] * 10:.1f} -> {e['last'] * 10:.1f} in 10 (p={e['p']})")
        for s in o["signs"]:
            print(f"  signs  {s['key']}: variance {'rising' if s['variance'] else '-'}, memory {'rising' if s['memory'] else '-'} (var {s['var_first']} -> {s['var_last']})")
    OUTPUT_DIR.mkdir(exist_ok=True)
    (OUTPUT_DIR / "patterns_scan.json").write_text(json.dumps(out, indent=1, default=str), encoding="utf-8")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
