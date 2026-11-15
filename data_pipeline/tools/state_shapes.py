"""
One-time: turn the Census state outlines into config/us_states.json (outlines rounded to 0.01 degrees, about 1 km).
Source: https://www2.census.gov/geo/tiger/GENZ2024/shp/cb_2024_us_state_20m.zip (unzipped into cache/census/).

    python -m tools.state_shapes cache/census/cb_2024_us_state_20m

Reads the shapefile and its attribute table directly (both are simple binary formats), so no geo library is needed.
"""
import json
import struct
import sys
from pathlib import Path

from paths import CONFIG_DIR


def read_dbf(path):
    """Attribute rows as dicts of text."""
    b = Path(path).read_bytes()
    n, header_len, rec_len = struct.unpack("<IHH", b[4:12])
    fields, pos = [], 32
    while b[pos] != 0x0D:
        name = b[pos:pos + 11].split(b"\0")[0].decode()
        fields.append((name, b[pos + 16]))
        pos += 32
    rows = []
    for i in range(n):
        rec, off = b[header_len + i * rec_len: header_len + (i + 1) * rec_len], 1   # byte 0: deleted flag
        row = {}
        for name, length in fields:
            row[name] = rec[off:off + length].decode("utf-8", "replace").strip()
            off += length
        rows.append(row)
    return rows


def read_shp(path):
    """Polygon records -> list of rings, each a list of (lon, lat)."""
    b = Path(path).read_bytes()
    shapes, pos = [], 100
    while pos < len(b):
        length = struct.unpack(">i", b[pos + 4:pos + 8])[0] * 2       # in 16-bit words
        c = b[pos + 8:pos + 8 + length]
        if struct.unpack("<i", c[:4])[0] != 5:
            raise ValueError("expected polygons")
        n_parts, n_points = struct.unpack("<ii", c[36:44])
        parts = list(struct.unpack(f"<{n_parts}i", c[44:44 + 4 * n_parts])) + [n_points]
        xy = struct.unpack(f"<{2 * n_points}d", c[44 + 4 * n_parts: 44 + 4 * n_parts + 16 * n_points])
        pts = list(zip(xy[0::2], xy[1::2]))
        shapes.append([pts[parts[k]:parts[k + 1]] for k in range(n_parts)])
        pos += 8 + length
    return shapes


def main(stem):
    rows, shapes = read_dbf(f"{stem}.dbf"), read_shp(f"{stem}.shp")
    out = {}
    for row, rings in sorted(zip(rows, shapes), key=lambda rs: rs[0]["STUSPS"]):
        rings = [[[round(x, 2), round(y, 2)] for x, y in ring] for ring in rings]
        xs = [p[0] for r in rings for p in r if p[0] < 0]      # Alaska's Aleutians cross 180°; keep the west side
        ys = [p[1] for r in rings for p in r]
        out[row["STUSPS"]] = {"name": row["NAME"], "fips": row["STATEFP"],
                              "bbox": [min(xs), min(ys), max(xs), max(ys)], "rings": rings}
    path = CONFIG_DIR / "us_states.json"
    path.write_text(json.dumps(out, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {path}: {len(out)} states and territories, {path.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main(sys.argv[1])
