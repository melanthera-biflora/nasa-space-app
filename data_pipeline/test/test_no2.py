"""NO2 OPeNDAP parsing (sources/no2_omi.py), with no network: metadata path, response reading, US grid."""
import io

import h5py
import numpy as np

from sources import no2_omi as no2

DMR = b"""<?xml version="1.0" encoding="UTF-8"?>
<Dataset xmlns="http://xml.opendap.org/ns/DAP/4.0#" name="OMNO2d">
  <Group name="HDFEOS"><Group name="GRIDS"><Group name="ColumnAmountNO2"><Group name="Data_Fields">
    <Float32 name="ColumnAmountNO2"/><Float32 name="ColumnAmountNO2TropCloudScreened"/>
  </Group></Group></Group></Group>
</Dataset>"""


def test_variable_path_comes_from_the_metadata():
    assert no2.var_path(DMR) == "/HDFEOS/GRIDS/ColumnAmountNO2/Data_Fields/ColumnAmountNO2TropCloudScreened"


def test_response_is_scaled_and_fill_becomes_nan():
    buf = io.BytesIO()
    with h5py.File(buf, "w") as f:
        f.create_dataset("HDFEOS/GRIDS/ColumnAmountNO2/Data_Fields/ColumnAmountNO2TropCloudScreened",
                         data=np.array([[3e15, -2.0 ** 100]], dtype="float32"))
    a = no2.read_block(buf.getvalue())
    assert a[0, 0] == np.float32(3.0) and np.isnan(a[0, 1])


def test_us_grid_covers_the_us_at_quarter_degrees():
    assert len(no2.LAT) == no2.US_ROWS[1] - no2.US_ROWS[0] + 1 and len(no2.LON) == no2.US_COLS[1] - no2.US_COLS[0] + 1
    assert no2.LAT[0] == 18.125 and no2.LAT[-1] == 71.875 and no2.LON[0] == -179.875 and no2.LON[-1] == -65.125
