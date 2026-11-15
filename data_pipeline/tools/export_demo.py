"""
Save ready-made reports for the demo cities into demo_reports/.

Why: - the FRONTEND can build every chart from these files without waiting for the backend
     - the DEMO works even if NASA's servers are slow on the day (backend can serve these files)

Run:  python -m tools.export_demo        (from the data_pipeline folder)
Then share the demo_reports/ folder with the frontend and backend people.
"""
import json

import pipeline as p
from paths import DEMO_DIR
from sources import modis_lst
DEMOS = [
    # name,              lat,     lon,      condition,          age group   (US demo cities, docs/US_DATA_RESEARCH.md)
    ("phoenix",          33.45, -112.07, "heart_disease",    "65_plus"),   # hot days, warm nights
    ("houston",          29.76,  -95.37, "asthma_copd",      "18_64"),     # strongest heat trends, muggy days
    ("miami",            25.76,  -80.19, "heart_disease",    "65_plus"),   # warm nights, muggy days
    ("new_york",         40.76,  -73.99, "asthma_copd",      "5_17"),      # rain; inland point (MODIS has no data on water)
    ("atlanta",          33.75,  -84.39, "allergies",        "18_64"),     # neighborhood heat island
    ("boise",            43.62, -116.20, "asthma_copd",      "under_5"),   # fires and smoke
    ("minneapolis",      44.98,  -93.27, "limited_mobility", "65_plus"),   # very cold nights
]


def main():
    out_dir = DEMO_DIR
    out_dir.mkdir(exist_ok=True)
    index = []
    for name, lat, lon, cond, age in DEMOS:
        # surface heat only where MODIS is already downloaded (a new place takes 25-50 min, or fails)
        sources = ("pm25", "no2", "fires") + p.ADDED_SOURCES + (("surface_heat",) if modis_lst.cache_file(lat, lon).exists() else ())
        for period in (10, 25):
            rep = p.build_report(lat, lon, cond, age, period_years=period, sources=sources)
            f = out_dir / f"{name}_{period}y.json"
            f.write_text(json.dumps(rep, indent=1, ensure_ascii=False, allow_nan=False), encoding="utf-8")
            index.append({"name": name, "lat": lat, "lon": lon, "condition": cond,
                          "age_group": age, "period_years": period, "file": f.name,
                          "missing": [k for k, v in rep["data_status"].items() if v != "ok"]})
            print(f"saved {f.name}  overall={rep['overall']}  missing={index[-1]['missing']}")
    (out_dir / "index.json").write_text(json.dumps(index, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
