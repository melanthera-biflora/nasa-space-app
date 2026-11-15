"""
Sea-surface temperature, monthly, from NOAA OISST v2.1, for the North America maps (not wired into reports). No login.

Data:   NOAA PSL OISST v2.1 high resolution, sst.mon.mean.nc: global 0.25°, monthly means from Sep 1981 (2.25 GB as
        one file). Read through PSL's THREDDS OPeNDAP, so only the box is fetched, one year per request.
        Land is NaN. The land-sea mask lsmask.oisst.nc (4 MB) is kept in cache/oisst/ for coast handling later.
Box:    10-72 N, 170-50 W (lon 190-310 on file, turned to -180..180), 248 x 480 squares.
Output: data/oisst_monthly_na.nc, sst in °C; per-year parts in data/oisst_years/ so a rerun resumes.
Credit: "Data provided by the NOAA PSL, Boulder, Colorado, USA". Not NASA data.
Caveat: V2.1 has significant quality improvements from 1 January 2016 (NCEI), so compare earlier years with care.

Run:    python -m sources.oisst              (2001-2025, from the data_pipeline folder; minutes)
        python -m sources.oisst 2023 2023    (one year)
"""
import sys

import requests
import xarray as xr

from paths import CACHE_DIR, DATA_DIR

URL = "https://psl.noaa.gov/thredds/dodsC/Datasets/noaa.oisst.v2.highres/sst.mon.mean.nc"
MASK_URL = "https://psl.noaa.gov/thredds/fileServer/Datasets/noaa.oisst.v2.highres/lsmask.oisst.nc"
YEARS_DIR = DATA_DIR / "oisst_years"
OUT = DATA_DIR / "oisst_monthly_na.nc"
RAW_DIR = CACHE_DIR / "oisst"
BOX = dict(lat=slice(10, 72), lon=slice(190, 310))       # on the file's 0-360 longitudes
SHAPE = (248, 480)


def crop_na(da):
    """Global 0.25° grid (lon 0-360, lat ascending) -> the North America box with lon -180..180."""
    da = da.sel(**BOX)
    return da.assign_coords(lon=((da.lon + 180) % 360) - 180).sortby("lon")


def build(start=2001, end=2025):
    YEARS_DIR.mkdir(parents=True, exist_ok=True)
    with xr.open_dataset(URL) as ds:
        for year in range(start, end + 1):
            out = YEARS_DIR / f"oisst_{year}.nc"
            if out.exists():
                print(f"{year}: already done")
                continue
            sst = crop_na(ds.sst.sel(time=str(year))).load()
            if sst.sizes["time"] != 12 or (sst.sizes["lat"], sst.sizes["lon"]) != SHAPE:
                raise RuntimeError(f"{year}: got {dict(sst.sizes)}, expected 12 months on {SHAPE}; nothing saved")
            part = out.with_suffix(".part")                  # a stop never leaves half a year under the real name
            sst.to_netcdf(part, encoding={"sst": {"zlib": True, "complevel": 4, "dtype": "float32"}})
            part.replace(out)
            print(f"{year}: saved ({out.stat().st_size / 1e6:.1f} MB)", flush=True)
    da = xr.concat([xr.open_dataarray(f) for f in sorted(YEARS_DIR.glob("oisst_*.nc"))], dim="time").sortby("time")
    da.attrs = {"units": "degC", "source": "NOAA OISST v2.1 monthly mean (NOAA PSL, Boulder, Colorado, USA)",
                "box": "10-72 N, 170-50 W; land is NaN"}
    da.to_netcdf(OUT, encoding={"sst": {"zlib": True, "complevel": 4, "dtype": "float32"}})
    print(f"Saved {OUT} ({OUT.stat().st_size / 1e6:.1f} MB): {da.sizes['time']} months, "
          f"{str(da.time.values[0])[:7]} to {str(da.time.values[-1])[:7]}")
    mask = RAW_DIR / "lsmask.oisst.nc"
    if not mask.exists():
        RAW_DIR.mkdir(parents=True, exist_ok=True)
        r = requests.get(MASK_URL, timeout=300)
        r.raise_for_status()
        mask.write_bytes(r.content)
        print(f"Saved {mask} ({mask.stat().st_size / 1e6:.1f} MB)")


def sanity_check(path=OUT):
    """The Gulf of Mexico should be near 30 °C in August and 22-24 °C in February; Kansas should be empty (land)."""
    with xr.open_dataarray(path) as da:
        gulf = da.sel(lat=25.125, lon=-90.125, method="nearest").load()
        kansas = da.sel(lat=38.5, lon=-98.0, method="nearest").load()
    print("Gulf of Mexico (25 N, 90 W), August means:", {int(t.dt.year): round(float(v), 1)
          for t, v in zip(gulf.time, gulf.values) if t.dt.month == 8 and t.dt.year >= 2019})
    print("Gulf of Mexico, February mean 2001-2025:", round(float(gulf.sel(time=gulf.time.dt.month == 2).mean()), 1))
    print("Kansas has values:", bool(kansas.notnull().any()))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    years = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) == 3 else (2001, 2025)
    build(*years)
    sanity_check()
