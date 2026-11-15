"""The file store: NASA-derived files on disk plus small in-memory caches. Used when there is no database."""
import json
from collections import OrderedDict

from paths import DEMO_DIR
from tools.trend_field import OUT_DIR as FIELD_DIR


class _Lru(OrderedDict):
    def __init__(self, size):
        super().__init__()
        self.size = size

    def get_fresh(self, key):
        if key not in self:
            return None
        self.move_to_end(key)
        return self[key]

    def put(self, key, value):
        self[key] = value
        self.move_to_end(key)
        while len(self) > self.size:
            self.popitem(last=False)


class FileStore:
    name = "files"

    def __init__(self, field_dir=FIELD_DIR, compare_path=DEMO_DIR / "places_compare.json"):
        self.field_dir, self.compare_path = field_dir, compare_path
        self._compare = None              # (mtime, parsed table)
        self._reports = _Lru(32)        # shortcut: lives only while the backend runs; Postgres shares it (T43)
        self._places = _Lru(512)
        self._regions = _Lru(64)
        self._fields = {}               # factor -> (mtime, parsed field)

    def get_report(self, key):
        return self._reports.get_fresh(key)

    def put_report(self, key, params, report):
        self._reports.put(key, report)

    def get_places(self, kind, query):
        return self._places.get_fresh((kind, query))

    def put_places(self, kind, query, places):
        self._places.put((kind, query), places)

    def get_region(self, key):
        return self._regions.get_fresh(key)

    def put_region(self, key, params, body):
        self._regions.put(key, body)

    def get_compare_table(self):
        """The 51-city comparison table (tools/compare_export.py), re-read when the file changes."""
        if not self.compare_path.exists():
            return None
        mtime = self.compare_path.stat().st_mtime
        if not self._compare or self._compare[0] != mtime:
            self._compare = (mtime, json.loads(self.compare_path.read_text(encoding="utf-8")))
        return self._compare[1]

    def get_trend_field(self, factor):
        path = self.field_dir / f"{factor}.json"
        if not path.exists():
            return None
        mtime = path.stat().st_mtime
        cached = self._fields.get(factor)
        if not cached or cached[0] != mtime:          # a rebuilt field shows up without a restart
            cached = self._fields[factor] = (mtime, json.loads(path.read_text(encoding="utf-8")))
        return cached[1]
