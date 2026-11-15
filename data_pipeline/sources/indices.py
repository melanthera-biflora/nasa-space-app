"""Climate driver indices from NOAA CPC, read from cache/indices/ as served (docs/DATA_ADDITIONS.md §9)."""
from functools import lru_cache

from analysis.enso import parse_roni
from paths import CACHE_DIR

RONI_FILE = CACHE_DIR / "indices" / "RONI.ascii.txt"


@lru_cache(maxsize=1)
def roni():
    """{winter year: Dec–Feb RONI}, or {} when the file isn't there (the winters section is then left out)."""
    return parse_roni(RONI_FILE.read_text(encoding="utf-8")) if RONI_FILE.exists() else {}
