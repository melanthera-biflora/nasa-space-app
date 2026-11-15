"""Climatch local API. Layers: api/v1 (HTTP) -> services (use cases) -> store (Postgres or files); see backend/AGENTS.md."""
import sys
from pathlib import Path

# The services call the data pipeline, which imports its own modules by plain name (pipeline, paths, sources...).
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "data_pipeline"))
