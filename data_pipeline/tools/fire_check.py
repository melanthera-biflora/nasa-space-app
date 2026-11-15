"""Are falling FIRMS fire counts real, or satellite orbit drift (2020+)?
Test: does a city's decline already hold over 2003-2019 (before drift), and is there a nationwide step after 2020?

Run:  python -m tools.fire_check        (from the data_pipeline folder; needs the FIRMS US file)
"""

import pandas as pd
import pymannkendall as mk

from paths import DATA_DIR
from sources.fires_firms import fires_series

df = pd.read_parquet(DATA_DIR / "fires" / "modis_United_States.parquet")
nat = df.groupby(df.date.dt.year).size()
print("US-wide detections per year (vegetation, conf >= 30):")
print("  " + "  ".join(f"{y}:{n // 1000}k" for y, n in nat.loc[2003:].items()))
r_pre = mk.original_test(nat.loc[2003:2019].to_numpy())
print(f"  US 2003-2019 trend: {r_pre.slope:+.0f}/yr p={r_pre.p:.3f};  mean 2016-19 {nat.loc[2016:2019].mean():.0f} vs 2021-25 {nat.loc[2021:2025].mean():.0f}\n")

CITIES = {"Cleveland": (41.50, -81.69), "Detroit": (42.33, -83.05), "Chicago": (41.88, -87.63), "Columbus": (39.96, -83.00),
          "Atlanta": (33.75, -84.39), "New Orleans": (29.95, -90.07), "Dallas": (32.78, -96.80), "Seattle": (47.61, -122.33),
          "Pittsburgh": (40.44, -79.99), "St. Louis": (38.63, -90.20), "Midland": (31.99, -102.08), "Des Moines": (41.59, -93.62)}
print(f"{'city':12s} {'03-07':>6s} {'08-12':>6s} {'13-17':>6s} {'16-19':>6s} {'21-25':>6s}   2003-2019 trend        2003-2025 trend")
for name, (lat, lon) in CITIES.items():
    a = fires_series(lat, lon)["fires"]["annual"]
    m = lambda y0, y1: a.loc[y0:y1].mean()  # noqa: E731
    pre, full = mk.original_test(a.loc[2003:2019].to_numpy()), mk.original_test(a.loc[2003:2025].to_numpy())
    print(f"{name:12s} {m(2003, 2007):6.1f} {m(2008, 2012):6.1f} {m(2013, 2017):6.1f} {m(2016, 2019):6.1f} {m(2021, 2025):6.1f}"
          f"   {pre.slope * 10:+6.1f}/dec p={pre.p:.3f}   {full.slope * 10:+6.1f}/dec p={full.p:.3f}")
