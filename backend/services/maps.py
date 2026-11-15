"""The US map fields, the yearly map frames and the demo cities."""
import json

from backend.errors import ApiError
from paths import DEMO_DIR


class MapService:
    def __init__(self, store, demos, frames_dir=None):
        self.store, self.demo_list = store, demos
        self.frames_dir = frames_dir or DEMO_DIR / "map_frames"
        self._frames = {}                                   # factor -> (file time, frames): a rebuild shows up at once

    def frames(self, factor):
        """Yearly values per grid cell on one colour scale (built by `python -m tools.map_frames`), for the animated map."""
        path = self.frames_dir / f"{factor}.json"
        if not path.exists():
            raise ApiError(404, "not_built", "This map's years haven't been built yet. Run: python -m tools.map_frames")
        mtime = path.stat().st_mtime
        if self._frames.get(factor, (None,))[0] != mtime:
            self._frames[factor] = (mtime, json.loads(path.read_text(encoding="utf-8")))
        return self._frames[factor][1]

    def trend_field(self, factor):
        field = self.store.get_trend_field(factor)
        if field is None:
            raise ApiError(404, "not_built", "This map hasn't been built yet. Run: python -m tools.trend_field")
        return field

    def compare_table(self):
        table = self.store.get_compare_table()
        if table is None:
            raise ApiError(404, "not_built", "The place comparison hasn't been built yet. Run: python -m tools.compare_export")
        return table

    def demos(self):
        return [{"name": n, "lat": la, "lon": lo, "conditions": [c], "age_groups": [a]} for n, la, lo, c, a in self.demo_list]
