"""The Postgres store (Supabase): reports, place lookups and map fields shared by every machine using the same
database. Tables: backend/migrations/*.sql. A database hiccup never breaks a request: reads miss, writes are skipped,
and both are logged. Map fields not yet seeded into the database are read from the files.
Recent results are also kept in memory: a 200 KB report takes ~0.3 s to download from Postgres but ~0 s to reuse,
so repeats on this machine are instant while Postgres shares results across machines and restarts."""
import logging

from psycopg.types.json import Jsonb
from psycopg_pool import ConnectionPool

from backend.store.files import FileStore, _Lru

log = logging.getLogger("climatch.store")
PLACE_DAYS = 30          # what people typed into the address box is kept this long, then ignored and pruned (D32)


class PostgresStore:
    name = "postgres"

    def __init__(self, url, files=None, pool=None):
        # prepare_threshold=None: Supabase's transaction pooler doesn't keep prepared statements
        self.pool = pool or ConnectionPool(url, min_size=1, max_size=4, timeout=5, open=True,
                                           kwargs={"autocommit": True, "prepare_threshold": None, "connect_timeout": 5})
        self.files = files or FileStore()
        self._recent = _Lru(64)          # (table, key) -> value, for this process only

    def _one(self, sql, args):
        try:
            with self.pool.connection() as conn:
                row = conn.execute(sql, args).fetchone()
            return row[0] if row else None
        except Exception as e:                       # noqa: BLE001 - any database trouble is a cache miss
            log.warning("store read failed: %s", type(e).__name__)
            return None

    def _write(self, sql, args):
        try:
            with self.pool.connection() as conn:
                conn.execute(sql, args)
        except Exception as e:                       # noqa: BLE001 - a failed cache write must not fail the request
            log.warning("store write failed: %s", type(e).__name__)

    def _cached(self, slot, sql, args):
        hit = self._recent.get_fresh(slot)
        if hit is None:
            hit = self._one(sql, args)
            if hit is not None:
                self._recent.put(slot, hit)
        return hit

    def get_report(self, key):
        return self._cached(("report", key), "select report from public.report_cache where key = %s", (key,))

    def put_report(self, key, params, report):
        self._write(
            """insert into public.report_cache (key, lat, lon, period, version, report)
               values (%s, %s, %s, %s, %s, %s)
               on conflict (key) do update set report = excluded.report, created_at = now()""",
            (key, params["lat"], params["lon"], params["period"], params["version"], Jsonb(report)))
        self._recent.put(("report", key), report)

    def get_region(self, key):
        return self._cached(("region", key), "select body from public.region_series where key = %s", (key,))

    def put_region(self, key, params, body):
        self._write(
            """insert into public.region_series (key, code, variable, period, version, body)
               values (%s, %s, %s, %s, %s, %s)
               on conflict (key) do update set body = excluded.body, created_at = now()""",
            (key, params["code"], params["variable"], params["period"], params["version"], Jsonb(body)))
        self._recent.put(("region", key), body)

    def get_places(self, kind, query):
        return self._cached(("places", kind, query),
                            """select places from public.place_cache
                               where kind = %s and query = %s and created_at > now() - %s * interval '1 day'""",
                            (kind, query, PLACE_DAYS))

    def put_places(self, kind, query, places):
        self._write(          # one round trip: drop what has expired, then store this lookup
            """with expired as (delete from public.place_cache where created_at < now() - %s * interval '1 day')
               insert into public.place_cache (kind, query, places) values (%s, %s, %s)
               on conflict (kind, query) do update set places = excluded.places, created_at = now()""",
            (PLACE_DAYS, kind, query, Jsonb(places)))
        self._recent.put(("places", kind, query), places)

    def get_compare_table(self):
        return self.files.get_compare_table()      # a committed static file; no table needed

    def get_trend_field(self, factor):
        stored = self._cached(("field", factor), "select field from public.trend_fields where factor = %s", (factor,))
        return stored if stored is not None else self.files.get_trend_field(factor)

    # ---- used by `python -m backend.store.seed` -------------------------------------------------------------------
    def put_trend_field(self, factor, data_version, field):
        self._write(
            """insert into public.trend_fields (factor, data_version, field) values (%s, %s, %s)
               on conflict (factor) do update set data_version = excluded.data_version, field = excluded.field,
               built_at = now()""",
            (factor, data_version, Jsonb(field)))

    def put_dataset(self, row):
        self._write(
            """insert into public.datasets (name, source, version, first_year, last_year, built_at, notes)
               values (%(name)s, %(source)s, %(version)s, %(first_year)s, %(last_year)s, now(), %(notes)s)
               on conflict (name) do update set source = excluded.source, version = excluded.version,
               first_year = excluded.first_year, last_year = excluded.last_year, built_at = now(), notes = excluded.notes""",
            row)
