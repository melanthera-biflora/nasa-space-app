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
DEMOS = [
    # name,              lat,     lon,      condition,       age group
    ("phoenix",          33.45, -112.07, "asthma_copd",   "65_plus"),
    ("seattle",          47.61, -122.33, "none",          "18_64"),
    ("miami",            25.76,  -80.19, "heart_disease", "65_plus"),
    ("hanoi",            21.03,  105.85, "asthma_copd",   "under_5"),
]


def main():
    out_dir = DEMO_DIR
    out_dir.mkdir(exist_ok=True)
    index = []
    for name, lat, lon, cond, age in DEMOS:
        for period in (10, 25):
            rep = p.build_report(lat, lon, cond, age, period_years=period)
            f = out_dir / f"{name}_{period}y.json"
            f.write_text(json.dumps(rep, indent=1, ensure_ascii=False, allow_nan=False), encoding="utf-8")
            index.append({"name": name, "lat": lat, "lon": lon, "condition": cond,
                          "age_group": age, "period_years": period, "file": f.name,
                          "missing": [k for k, v in rep["data_status"].items() if v != "ok"]})
            print(f"saved {f.name}  overall={rep['overall']}  missing={index[-1]['missing']}")
    (out_dir / "index.json").write_text(json.dumps(index, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
