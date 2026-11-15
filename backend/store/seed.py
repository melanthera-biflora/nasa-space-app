"""Fill Postgres with what the app already has: the saved demo reports (as stored reports, so the cases open
instantly on any machine), the US map fields, and which NASA dataset built them.

Run from the repo root (needs DATABASE_URL in .env):   .venv/Scripts/python -m backend.store.seed
"""
import json
import sys
from pathlib import Path

from backend.services.reports import DATA_VERSION, ReportService
from backend.settings import read_env, setting
from backend.store import make_store
from paths import DEMO_DIR
from pipeline import strip_household
from tools.export_demo import DEMOS

DATASETS = [   # from docs/US_DATA_RESEARCH.md and docs/DECISIONS.md; keep in step with the sources
    {"name": "power", "source": "NASA POWER daily point API (MERRA-2), power.larc.nasa.gov/api/temporal/daily/point", "version": None, "first_year": 2001, "last_year": 2025,
     "notes": "fetched per place and cached; years with under 330 valid days dropped"},
    {"name": "pm25_merra2", "source": "NASA MERRA-2 M2TMNXAER via GES DISC", "version": "5.12.4", "first_year": 2001, "last_year": 2025,
     "notes": "PM2.5 = dust + sea salt + BC + OC + 1.375 x SO4; no nitrate"},
    {"name": "no2_omi", "source": "NASA OMI OMNO2d tropospheric column (team files)", "version": "unverified (v003 or v004, D10)",
     "first_year": 2005, "last_year": 2025, "notes": "trend only, no health level"},
    {"name": "fires_firms", "source": "NASA FIRMS MODIS C6.1 country files", "version": "C6.1", "first_year": 2003, "last_year": 2025,
     "notes": "type 0, confidence >= 30; counted within 50 km"},
    {"name": "modis_lst", "source": "NASA MODIS MOD11A2 land surface temperature via the ORNL DAAC subset service", "version": "v061", "first_year": 2001,
     "last_year": 2022, "notes": "precomputed demo cities only; ends 2022 (Terra drift)"},
]


def main():
    url = setting("DATABASE_URL") or read_env().get("DATABASE_URL", "")
    store = make_store(url)
    if store.name != "postgres":
        sys.exit("No database: set DATABASE_URL in .env to the Supabase Session pooler connection string.")
    reports = ReportService(store, build=None, heat_ready=None)
    n = 0
    for name, lat, lon, cond, age in DEMOS:
        for period in (10, 25):
            path = Path(DEMO_DIR) / f"{name}_{period}y.json"
            if not path.exists():
                continue
            report = strip_household(json.loads(path.read_text(encoding="utf-8")))   # stored without the household (A3)
            key = reports.key(round(lat, 2), round(lon, 2), period)
            store.put_report(key, {"lat": round(lat, 2), "lon": round(lon, 2), "period": period, "version": reports.version}, report)
            n += 1
    fields = 0
    for path in sorted((Path(DEMO_DIR) / "trend_fields").glob("*.json")):
        store.put_trend_field(path.stem, DATA_VERSION, json.loads(path.read_text(encoding="utf-8")))
        fields += 1
    for row in DATASETS:
        store.put_dataset(row)
    print(f"stored {n} demo reports, {fields} map fields, {len(DATASETS)} dataset rows")
    store.pool.close()


if __name__ == "__main__":
    main()
