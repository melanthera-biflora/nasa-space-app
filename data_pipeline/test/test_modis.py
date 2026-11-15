"""Which MODIS dates get requested (sources/modis_lst.py): summer only, never a range over 10 composites."""
import pandas as pd

from sources.modis_lst import summer_chunks

DATES = [{"calendar_date": d.strftime("%Y-%m-%d")} for d in pd.date_range("2020-01-01", "2021-12-31", freq="8D")]


def test_north_requests_only_jun_aug_within_one_summer():
    chunks = summer_chunks(DATES, lat=33.45)
    months = {int(d["calendar_date"][5:7]) for c in chunks for d in c}
    assert months == {6, 7, 8}
    assert all(len(c) <= 10 and len({d["calendar_date"][:4] for d in c}) == 1 for c in chunks)
    assert sum(len(c) for c in chunks) == sum(int(d["calendar_date"][5:7]) in (6, 7, 8) for d in DATES)


def test_south_summer_runs_december_into_the_next_year():
    chunks = summer_chunks(DATES, lat=-33.9)
    assert {int(d["calendar_date"][5:7]) for c in chunks for d in c} == {12, 1, 2}
    assert any(c[0]["calendar_date"].startswith("2020-12") and c[-1]["calendar_date"].startswith("2021-0") for c in chunks)
