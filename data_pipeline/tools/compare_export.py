"""
The place-comparison table (SPEC A3, place-compare): every factor of the team's 51 scan cities, so the website can
compare places for a household in the browser (health choices never leave it). Run from data_pipeline/:

    python -m tools.compare_export          # ~2 min with cached NASA POWER points; writes demo_reports/places_compare.json

Per city and factor: the 2021-2025 level, then -> now, the rate per decade, the city's own Mann-Kendall p, the
Benjamini-Hochberg q across all cities for that factor (many places at once: some "clear" trends are chance), the
cutoff level and the last five yearly values ("m of the last 5 years were under your limit").
"""
import json

import numpy as np
from scipy.stats import false_discovery_control

import pipeline as p
from paths import DEMO_DIR, load_thresholds
from tools.us_scan import CITIES

FACTORS = ("hot_days", "warm_nights", "cold_days", "muggy_days", "humid_heat_days", "heavy_rain_days", "dry_days", "pm25", "no2",
           "fires", "smoke_days", "aod", "water_storage", "surface_heat_5km")
STATE = {"Phoenix": "AZ", "Tucson": "AZ", "Las Vegas": "NV", "El Paso": "TX", "Albuquerque": "NM", "Los Angeles": "CA",
         "San Diego": "CA", "San Francisco": "CA", "Sacramento": "CA", "Fresno": "CA", "Portland": "OR", "Seattle": "WA",
         "Spokane": "WA", "Boise": "ID", "Reno": "NV", "Salt Lake City": "UT", "Denver": "CO", "Missoula": "MT",
         "Dallas": "TX", "Houston": "TX", "San Antonio": "TX", "Austin": "TX", "Midland": "TX", "Oklahoma City": "OK",
         "Kansas City": "MO", "Omaha": "NE", "Minneapolis": "MN", "Des Moines": "IA", "Chicago": "IL", "Milwaukee": "WI",
         "St. Louis": "MO", "Indianapolis": "IN", "Detroit": "MI", "Cleveland": "OH", "Columbus": "OH", "Nashville": "TN",
         "Memphis": "TN", "New Orleans": "LA", "Atlanta": "GA", "Miami": "FL", "Tampa": "FL", "Orlando": "FL",
         "Charlotte": "NC", "Raleigh": "NC", "Washington DC": "DC", "Philadelphia": "PA", "New York": "NY", "Boston": "MA",
         "Pittsburgh": "PA", "Anchorage": "AK", "Honolulu": "HI"}


def city_row(name, lat, lon, report, factors=FACTORS):
    """One city's comparable numbers from its (household-neutral) report."""
    out = {}
    for k in factors:
        f = report["factors"].get(k)
        if not f or not f.get("available"):
            continue
        pts = [pt for pt in f.get("points", []) if pt.get("value") is not None]
        out[k] = {"now": f["now"], "then": f["then"], "slope_per_decade": f["slope_per_decade"], "p": f["mk_p"],
                  "level": f["level"], "direction": f["trend_direction"],
                  "last5": [{"year": pt["year"], "value": pt["value"]} for pt in pts[-5:]]}
    return {"name": name, "state": STATE.get(name, ""), "lat": lat, "lon": lon, "factors": out}


def add_bh(rows, alpha=0.05):
    """Benjamini-Hochberg across cities, per factor: q and `clear` (q < alpha). A city's own p stays as `p`."""
    keys = {k for r in rows for k in r["factors"]}
    for k in keys:
        cells = [r["factors"][k] for r in rows if k in r["factors"] and r["factors"][k]["p"] is not None]
        if not cells:
            continue
        q = false_discovery_control(np.array([c["p"] for c in cells], float))
        for c, qv in zip(cells, q):
            c["q"] = round(float(qv), 4)
            c["clear"] = bool(qv < alpha) and c["slope_per_decade"] != 0
    return rows


def factor_meta(th, factors=FACTORS):
    return [{"key": k, "label": th[k]["label"], "unit": th[k]["unit"], "unit_short": th[k]["unit_short"],
             "decimals": th[k].get("decimals", 1), "caution_from": th[k].get("caution_from"),
             "high_from": th[k].get("high_from"), "higher_is_worse": th[k].get("higher_is_worse", True)} for k in factors]


def main():
    th = load_thresholds()
    rows = []
    for name, (lat, lon) in CITIES.items():
        try:
            rep = p.build_neutral_report(lat, lon, period_years=25, sources=("pm25", "no2", "fires") + p.ADDED_SOURCES)
        except Exception as e:  # noqa: BLE001 - one city failing must not stop the table
            print(f"skip {name}: {e!r}")
            continue
        rows.append(city_row(name, lat, lon, rep))
        print(f"{name}: {len(rows[-1]['factors'])} factors")
    add_bh(rows)
    out = {"period": [th["settings"]["data_end_year"] - 24, th["settings"]["data_end_year"]], "cities": rows,
           "factors": factor_meta(th), "thresholds_version": th["version"]}
    path = DEMO_DIR / "places_compare.json"
    path.write_text(json.dumps(p.clean_json(out), separators=(",", ":")), encoding="utf-8")
    print(f"wrote {path}: {len(rows)} cities, {path.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
