"""Trend scan of ~50 US cities (NASA POWER, PM2.5, NO2 and fires; 25 years): significant trends per factor,
the strongest ones, and opposite-trend pairs. Picks demo stories.

Run:  python -m tools.us_scan        (from the data_pipeline folder; ~2 min, POWER is cached after)
"""
import pandas as pd

import pipeline as p
from paths import OUTPUT_DIR

CITIES = {
    "Phoenix": (33.45, -112.07), "Tucson": (32.22, -110.97), "Las Vegas": (36.17, -115.14), "El Paso": (31.76, -106.49),
    "Albuquerque": (35.08, -106.65), "Los Angeles": (34.05, -118.24), "San Diego": (32.72, -117.16),
    "San Francisco": (37.77, -122.42), "Sacramento": (38.58, -121.49), "Fresno": (36.74, -119.79),
    "Portland": (45.52, -122.68), "Seattle": (47.61, -122.33), "Spokane": (47.66, -117.43), "Boise": (43.62, -116.20),
    "Reno": (39.53, -119.81), "Salt Lake City": (40.76, -111.89), "Denver": (39.74, -104.99), "Missoula": (46.87, -113.99),
    "Dallas": (32.78, -96.80), "Houston": (29.76, -95.37), "San Antonio": (29.42, -98.49), "Austin": (30.27, -97.74),
    "Midland": (31.99, -102.08), "Oklahoma City": (35.47, -97.52), "Kansas City": (39.10, -94.58), "Omaha": (41.26, -95.93),
    "Minneapolis": (44.98, -93.27), "Des Moines": (41.59, -93.62), "Chicago": (41.88, -87.63), "Milwaukee": (43.04, -87.91),
    "St. Louis": (38.63, -90.20), "Indianapolis": (39.77, -86.16), "Detroit": (42.33, -83.05), "Cleveland": (41.50, -81.69),
    "Columbus": (39.96, -83.00), "Nashville": (36.16, -86.78), "Memphis": (35.15, -90.05), "New Orleans": (29.95, -90.07),
    "Atlanta": (33.75, -84.39), "Miami": (25.76, -80.19), "Tampa": (27.95, -82.46), "Orlando": (28.54, -81.38),
    "Charlotte": (35.23, -80.84), "Raleigh": (35.78, -78.64), "Washington DC": (38.91, -77.04),
    "Philadelphia": (39.95, -75.17), "New York": (40.76, -73.99), "Boston": (42.36, -71.06), "Pittsburgh": (40.44, -79.99),
    "Anchorage": (61.22, -149.90), "Honolulu": (21.31, -157.86),
}


def main():
    rows = []
    for name, (lat, lon) in CITIES.items():
        try:
            rep = p.build_report(lat, lon, sources=("pm25", "no2", "fires"), period_years=25)
        except Exception as e:  # noqa: BLE001 - research scan: skip a city, keep going
            print(f"skip {name}: {e!r}")
            continue
        for k, f in rep["factors"].items():
            if f.get("available"):
                rows.append({"city": name, "factor": k, "then": f["then"], "now": f["now"],
                             "slope_dec": f["slope_per_decade"], "p": f["mk_p"], "significant": f["significant"],
                             "direction": f["trend_direction"], "level": f["level"]})
    df = pd.DataFrame(rows)
    OUTPUT_DIR.mkdir(exist_ok=True)
    df.to_csv(OUTPUT_DIR / "us_scan.csv", index=False)
    pd.set_option("display.width", 250, "display.max_rows", 300)
    print(f"{df.city.nunique()} cities, {len(df)} factor results\n")

    sig = df[df.significant]
    print("== Significant trends per factor (worsening / improving) ==")
    print(sig.groupby(["factor", "direction"]).size().unstack(fill_value=0).to_string())

    print("\n== Strongest significant trends (lowest p), top 25 ==")
    print(sig.sort_values("p").head(25)[["city", "factor", "then", "now", "slope_dec", "p", "direction"]].to_string(index=False))

    print("\n== Cities ranked by number of significantly worsening factors ==")
    print(sig[sig.direction == "worsening"].groupby("city").factor.apply(lambda s: ", ".join(s)).to_frame("worsening")
          .assign(n=lambda t: t.worsening.str.count(",") + 1).sort_values("n", ascending=False).head(15).to_string())

    print("\n== Opposite-trend pairs: same factor, one city significantly rising, another significantly falling ==")
    for k, g in sig.groupby("factor"):
        up, down = g[g.slope_dec > 0].sort_values("p"), g[g.slope_dec < 0].sort_values("p")
        if len(up) and len(down):
            print(f"  {k:16s} up: {', '.join(f'{r.city} ({r.then:g}->{r.now:g})' for r in up.head(3).itertuples())}"
                  f" | down: {', '.join(f'{r.city} ({r.then:g}->{r.now:g})' for r in down.head(3).itertuples())}")


if __name__ == "__main__":
    main()
