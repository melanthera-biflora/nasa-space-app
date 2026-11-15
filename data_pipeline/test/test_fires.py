"""Wildfire counting near an address (sources/fires_firms.py), with a fake fire file."""
import json

import pandas as pd
import pytest

import sources.fires_firms as ff


@pytest.fixture
def fire_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(ff, "FIRE_DIR", tmp_path)
    ff._cache.clear()
    fires = pd.DataFrame({
        "lat": [33.45, 33.60, 34.30, 33.45],                   # near, near, ~95 km away, near
        "lon": [-112.07, -112.00, -112.07, -112.10],
        "date": pd.to_datetime(["2020-06-01", "2020-07-01", "2020-07-01", "2021-08-01"]),
    })
    fires.to_parquet(tmp_path / "modis_Test.parquet", index=False)
    (tmp_path / "modis_Test_meta.json").write_text(json.dumps(
        {"country": "Test", "years": [2020, 2021], "bbox": [33.0, 34.5, -113.0, -111.0]}))
    yield tmp_path
    ff._cache.clear()


def test_counts_only_fires_within_50_km(fire_dir):
    annual = ff.fires_series(33.45, -112.07)["fires"]["annual"]
    assert annual.loc[2020] == 2 and annual.loc[2021] == 1


def test_years_without_fires_are_zero_not_missing(fire_dir):
    monthly = ff.fires_series(33.45, -112.07)["fires"]["monthly"]
    assert len(monthly) == 24 and monthly.loc["2020-01-01"] == 0


def test_years_before_2003_are_left_out(fire_dir):
    (fire_dir / "modis_Test_meta.json").write_text(json.dumps(
        {"country": "Test", "years": [2002, 2020, 2021], "bbox": [33.0, 34.5, -113.0, -111.0]}))
    annual = ff.fires_series(33.45, -112.07)["fires"]["annual"]
    assert list(annual.index) == [2020, 2021]


def test_place_outside_downloaded_countries_is_not_available(fire_dir):
    with pytest.raises(LookupError):
        ff.fires_series(21.03, 105.85)                         # Hanoi: not in the fake file


def test_neighbours_in_the_na_folder_never_reach_a_report(fire_dir):
    na = fire_dir / "na"
    na.mkdir()
    pd.DataFrame({"lat": [33.46] * 5, "lon": [-112.07] * 5, "date": pd.to_datetime(["2020-06-02"] * 5)}).to_parquet(
        na / "modis_Mexico.parquet", index=False)
    (na / "modis_Mexico_meta.json").write_text(json.dumps({"country": "Mexico", "years": [2019], "bbox": [33, 34, -113, -111]}))
    assert ff.fires_series(33.45, -112.07)["fires"]["annual"].loc[2020] == 2
