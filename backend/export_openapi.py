"""Write the reviewed API contract: python -m backend.export_openapi (then review the diff of openapi.v1.json)."""
import json
from pathlib import Path

from backend.app import app

CONTRACT = Path(__file__).with_name("openapi.v1.json")


def current():
    return json.loads(json.dumps(app.openapi()))


if __name__ == "__main__":
    CONTRACT.write_text(json.dumps(current(), indent=1, sort_keys=True) + "\n", encoding="utf-8")
    print(f"wrote {CONTRACT}")
