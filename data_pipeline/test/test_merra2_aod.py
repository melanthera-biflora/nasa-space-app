"""MERRA-2 AOD: OPeNDAP reply parsing and picking one file per month (sources/merra2_aod.py). No network."""
import numpy as np
import pandas as pd
import pytest

from sources.merra2_aod import LAT, LON, aod_block, one_per_month


def granule(ur, start):
    return {"umm": {"GranuleUR": ur, "TemporalExtent": {"RangeDateTime": {"BeginningDateTime": start}}}}


def test_fill_values_become_empty():
    tau = np.full((1, len(LAT), len(LON)), 0.2, "float32")
    tau[0, 0, 0] = 1e15
    a = aod_block({"TOTEXTTAU": (tau, {"_FillValue": np.float32(1e15)}), "lat": (LAT, {}), "lon": (LON, {})})
    assert a.shape == (len(LAT), len(LON)) and np.isnan(a[0, 0]) and a[1, 1] == pytest.approx(0.2)


def test_a_shifted_box_is_refused():
    tau = np.zeros((1, len(LAT), len(LON)), "float32")
    with pytest.raises(RuntimeError):
        aod_block({"TOTEXTTAU": (tau, {}), "lat": (LAT + 0.5, {}), "lon": (LON, {})})


def test_reprocessed_month_wins_and_other_years_are_dropped():
    found = one_per_month([granule("M2TMNXAER.5.12.4:MERRA2_401.tavgM_2d_aer_Nx.202009.nc4", "2020-09-01T00:00:00Z"),
                           granule("M2TMNXAER.5.12.4:MERRA2_400.tavgM_2d_aer_Nx.202009.nc4", "2020-09-01T00:00:00Z"),
                           granule("M2TMNXAER.5.12.4:MERRA2_400.tavgM_2d_aer_Nx.201912.nc4", "2019-12-01T00:00:00Z")],
                          2020)
    assert list(found) == [pd.Timestamp("2020-09-01")]
    assert "MERRA2_401" in found[pd.Timestamp("2020-09-01")]["umm"]["GranuleUR"]
