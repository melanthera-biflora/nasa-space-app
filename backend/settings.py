"""Settings: the environment first, then the repo-root .env (never committed; .env.example lists the names).
So a terminal `set DATABASE_URL=` (empty) switches the database off without editing the file."""
import os
from pathlib import Path

ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


def read_env(path=None):
    """NAME=value lines of a .env file as a dict (comments and blank lines skipped, quotes removed)."""
    path = path or ENV_FILE
    values = {}
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                name, value = line.split("=", 1)
                values[name.strip()] = value.strip().strip('"').strip("'")
    return values


def setting(name, default=""):
    return os.environ.get(name, read_env().get(name, default)).strip()


DATABASE_URL = setting("DATABASE_URL")
