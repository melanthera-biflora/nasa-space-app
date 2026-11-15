# Backend tests never touch the network: the app built on import uses the file store, not the .env database.
# The Postgres round-trip test in test_store.py opts in with RUN_DB_TESTS=1.
import os

os.environ["DATABASE_URL"] = ""
