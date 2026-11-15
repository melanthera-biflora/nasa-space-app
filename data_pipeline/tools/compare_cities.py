"""
For the team meeting: every factor for several cities, under the CURRENT thresholds.json.
Format of each cell:  then -> now  LEVEL  arrow     (↑ worse, ↓ better, → no clear trend)

Run:   python -m tools.compare_cities            (all data sources, from the data_pipeline folder)
       python -m tools.compare_cities fast       (skip MODIS neighborhood heat, which is slow the first time)
Change numbers in thresholds.json and run again to see what changes.
"""
import sys

import pandas as pd

import pipeline as p

CITIES = {
    "Phoenix": (33.45, -112.07),
    "Houston": (29.76, -95.37),
    "Miami": (25.76, -80.19),
    "New York": (40.76, -73.99),
    "Atlanta": (33.75, -84.39),
    "Boise": (43.62, -116.20),
    "Minneapolis": (44.98, -93.27),
    "Seattle": (47.61, -122.33),
}
SHORT = {"suitable": "OK", "caution": "CAUTION", "high_risk": "HIGH", None: "trend"}
ARROW = {"worsening": "↑", "improving": "↓", "no_clear_trend": "→"}


def main(sources=("pm25", "no2", "fires", "surface_heat")):
    rows = []
    for name, (lat, lon) in CITIES.items():
        rep = p.build_report(lat, lon, sources=sources)
        row = {"city": name, "OVERALL": SHORT[rep["overall"]]}
        for k, f in rep["factors"].items():
            if f["available"]:
                row[k] = f"{f['then']:g}->{f['now']:g} {SHORT[f['level']]} {ARROW[f['trend_direction']]}"
            else:
                row[k] = "n/a"
        missing = [k for k, v in rep["data_status"].items() if v != "ok"]
        row["missing data"] = ", ".join(missing)
        rows.append(row)
    pd.set_option("display.width", 250)
    pd.set_option("display.max_columns", 30)
    print(pd.DataFrame(rows).set_index("city").T.to_string())
    print("\nEach cell: then -> now, level, trend (↑ worse, ↓ better, → no clear trend)")
    print("\nHeat cutoff options (days per year, 2021-2025 average):")
    for name, (lat, lon) in CITIES.items():
        t = p.compare_heat_cutoffs(lat, lon)["2021-2025 avg"]
        print(f"  {name:18s}", "  ".join(f"{k}: {v:5.1f}" for k, v in t.items()))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")   # Windows consoles default to cp1252 and crash on → ↑ ↓
    main(("pm25", "no2", "fires") if "fast" in sys.argv else ("pm25", "no2", "fires", "surface_heat"))
