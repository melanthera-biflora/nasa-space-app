"""Create or update the tables: run every file in backend/migrations/ in order (each one is safe to run again).

Run from the repo root, with DATABASE_URL in .env:
    .venv/Scripts/python -m backend.store.migrate              a database on this computer (localhost)
    .venv/Scripts/python -m backend.store.migrate --remote     a hosted one (the deployed app's), on purpose only

A hosted database needs --remote, so a .env that happens to point at the deployed app's database is never changed by
someone setting up a local copy.
"""
import sys
from pathlib import Path
from urllib.parse import urlparse

from backend.settings import setting

MIGRATIONS = Path(__file__).resolve().parent.parent / "migrations"
LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1"}


def is_local(url):
    return (urlparse(url).hostname or "") in LOCAL_HOSTS


def main(argv):
    url = setting("DATABASE_URL")
    if not url:
        sys.exit("DATABASE_URL isn't set: put it in .env first (see the README, 'Full setup with a local database').")
    host = urlparse(url).hostname
    if not is_local(url) and "--remote" not in argv:
        sys.exit(f"DATABASE_URL points at {host}, not this computer. Add --remote if you mean to change that database.")
    import psycopg
    with psycopg.connect(url, autocommit=True, prepare_threshold=None) as conn:
        for path in sorted(MIGRATIONS.glob("*.sql")):
            conn.execute(path.read_text(encoding="utf-8"))
            print("applied", path.name)
    print(f"tables ready on {host}")


if __name__ == "__main__":
    main(sys.argv[1:])
