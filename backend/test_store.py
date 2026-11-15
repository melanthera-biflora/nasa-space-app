"""The stores: choosing one, the Postgres store's behaviour with a fake pool, and an opt-in round trip."""
import os
import time
from contextlib import contextmanager

import pytest

from backend import settings
from backend.store import make_store
from backend.store.files import FileStore
from backend.store.postgres import PostgresStore


def test_settings_read_env_files_and_the_environment_wins(tmp_path, monkeypatch):
    env = tmp_path / ".env"
    env.write_text("\n".join(["# comment", 'DATABASE_URL="postgresql://a"', "OTHER = 1"]), encoding="utf-8")
    assert settings.read_env(env) == {"DATABASE_URL": "postgresql://a", "OTHER": "1"}
    monkeypatch.setattr(settings, "ENV_FILE", env)
    monkeypatch.delenv("DATABASE_URL", raising=False)
    assert settings.setting("DATABASE_URL") == "postgresql://a"       # from the file
    monkeypatch.setenv("DATABASE_URL", "")
    assert settings.setting("DATABASE_URL") == ""                     # the environment wins (switch the DB off)


def test_no_url_means_files_and_a_dead_database_falls_back_quickly():
    assert isinstance(make_store(""), FileStore)
    t0 = time.time()
    assert isinstance(make_store("postgresql://u:p@127.0.0.1:1/x"), FileStore)   # nothing listens on port 1
    assert time.time() - t0 < 15


class FakeConn:
    def __init__(self, pool):
        self.pool = pool

    def execute(self, sql, args):
        self.pool.sql.append((" ".join(sql.split()), args))
        if self.pool.fail:
            raise OSError("network down")
        row = self.pool.rows.pop(0) if self.pool.rows else None

        class Cursor:
            def fetchone(self):
                return row
        return Cursor()


class FakePool:
    def __init__(self, rows=(), fail=False):
        self.rows, self.fail, self.sql = list(rows), fail, []

    @contextmanager
    def connection(self):
        yield FakeConn(self)


def test_postgres_store_reads_writes_and_never_raises(tmp_path):
    pool = FakePool(rows=[({"factors": {}},), None])
    store = PostgresStore("unused", files=FileStore(tmp_path), pool=pool)
    assert store.get_report("k1") == {"factors": {}}
    assert store.get_places("suggest", "boi") is None
    store.put_report("k1", {"lat": 1, "lon": 2, "period": 25, "version": "v"}, {"a": 1})
    assert pool.sql[-1][0].startswith("insert into public.report_cache") and pool.sql[-1][1][0] == "k1"
    assert "conditions" not in pool.sql[-1][0] and "age_groups" not in pool.sql[-1][0]      # no household column (D32)
    store.put_places("suggest", "boi", [])
    assert "delete from public.place_cache" in pool.sql[-1][0] and pool.sql[-1][1][0] == 30   # expired lookups pruned
    assert "created_at > now()" in pool.sql[1][0]                                            # and ignored on read

    broken = PostgresStore("unused", files=FileStore(tmp_path), pool=FakePool(fail=True))
    assert broken.get_report("k1") is None                  # a database hiccup is a miss
    broken.put_places("suggest", "boi", [])                 # and a skipped write, not an error
    assert broken.get_trend_field("pm25") is None           # no row and no file: nothing to show


def test_recent_results_are_reused_without_asking_the_database_again(tmp_path):
    pool = FakePool(rows=[({"factors": {}},)])
    store = PostgresStore("unused", files=FileStore(tmp_path), pool=pool)
    assert store.get_report("k") == store.get_report("k") == {"factors": {}}
    assert len(pool.sql) == 1                                # the second read came from memory


def test_map_fields_fall_back_to_files_until_seeded():
    store = PostgresStore("unused", pool=FakePool(rows=[None]))
    assert store.get_trend_field("fires")["factor"] == "fires"


@pytest.mark.skipif(os.environ.get("RUN_DB_TESTS") != "1", reason="set RUN_DB_TESTS=1 to test against the .env database")
def test_round_trip_against_the_real_database():
    url = settings.read_env().get("DATABASE_URL")
    assert url, "DATABASE_URL is not in .env"
    store = make_store(url)
    assert store.name == "postgres"
    key = f"test:{time.time()}"
    store.put_report(key, {"lat": 0, "lon": 0, "period": 25, "version": "test"}, {"ok": 1})
    store.put_places("suggest", key, [{"name": "x"}])
    try:
        assert store.get_report(key) == {"ok": 1}
        assert store.get_places("suggest", key) == [{"name": "x"}]
    finally:
        with store.pool.connection() as conn:
            conn.execute("delete from public.report_cache where key = %s", (key,))
            conn.execute("delete from public.place_cache where query = %s", (key,))
        store.pool.close()
