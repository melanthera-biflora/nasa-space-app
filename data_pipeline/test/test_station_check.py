"""Station counts (tools/station_check.py) use the same cutoffs and missing-day rules as the app."""
import numpy as np
import pandas as pd

from paths import load_thresholds
from tools.station_check import station_counts


def test_counts_follow_the_card_cutoffs_and_drop_gappy_years():
    days = pd.date_range("2020-01-01", "2021-12-31", freq="D")
    df = pd.DataFrame({"T2M_MAX": 30.0, "T2M_MIN": 10.0}, index=days)
    df.loc["2020-07-01":"2020-07-10", "T2M_MAX"] = 36.0          # 10 very hot days (>= 35 C)
    df.loc["2020-08-01":"2020-08-05", "T2M_MIN"] = 25.0          # 5 warm nights (>= 24 C)
    df.loc["2020-01-01":"2020-01-03", "T2M_MIN"] = -13.0         # 3 very cold nights (< -12 C)
    df.loc["2021-01-01":"2021-03-31", "T2M_MAX"] = np.nan        # 2021 has under 330 valid days
    counts = station_counts(df, load_thresholds(), 330)
    assert counts.loc[2020, "hot_days"] == 10 and counts.loc[2020, "warm_nights"] == 5 and counts.loc[2020, "cold_days"] == 3
    assert counts.loc[2021].isna().all()
