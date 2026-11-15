"""Data access. One interface, two backends: Postgres when DATABASE_URL is set and reachable, files otherwise
(so the demo still runs with no database or no network).

A store has:
    name                                         "postgres" | "files"
    get_report(key) -> dict | None              put_report(key, params, report)
    get_places(kind, query) -> list | None       put_places(kind, query, places)       kind: "geocode" | "suggest"
    get_trend_field(factor) -> dict | None
"""
import logging

from backend import settings
from backend.store.files import FileStore

log = logging.getLogger("climatch.store")


def make_store(url=None):
    url = settings.DATABASE_URL if url is None else url
    if not url:
        return FileStore()
    # One plain connection first, and only then a pool: a pool retries in the background, and repeated failed
    # logins make Supabase's pooler block every connection for a while ("too many authentication failures").
    try:
        import psycopg
        with psycopg.connect(url, connect_timeout=5, prepare_threshold=None, autocommit=True) as conn:
            conn.execute("select 1 from public.report_cache limit 1")
    except Exception as e:                            # noqa: BLE001 - never block the demo on the database
        reason = "wrong password" if "password authentication failed" in str(e) else type(e).__name__
        log.warning("database unavailable (%s); using the file store", reason)
        return FileStore()
    from backend.store.postgres import PostgresStore
    return PostgresStore(url)
