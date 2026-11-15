"""Sea temperature (sources/oisst.py): the crop to the North America box, with a fake global grid."""
import numpy as np
import xarray as xr

from sources.oisst import SHAPE, crop_na


def test_crop_turns_0_360_longitudes_into_the_box():
    lat = -89.875 + 0.25 * np.arange(720)
    lon = 0.125 + 0.25 * np.arange(1440)
    da = xr.DataArray(np.broadcast_to(lon, (720, 1440)), coords={"lat": lat, "lon": lon}, dims=("lat", "lon"))
    na = crop_na(da)
    assert (na.sizes["lat"], na.sizes["lon"]) == SHAPE
    assert float(na.lon[0]) == -169.875 and float(na.lon[-1]) == -50.125
    assert float(na.lat[0]) == 10.125 and float(na.lat[-1]) == 71.875
    assert float(na.sel(lat=25.125, lon=-90.125)) == 269.875          # the value still sits on its own square
