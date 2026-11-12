"""
Where everything lives. Every other file imports its folders from here,
so the project works no matter where the data_pipeline folder is placed.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent        # the data_pipeline folder
CONFIG_DIR = ROOT / "config"                  # thresholds.json, narratives.json, conditions.json
DATA_DIR = ROOT / "data"                      # built data: PM2.5, NO2, fires  (Google Drive)
CACHE_DIR = ROOT / "cache"                    # per-address downloads: POWER, MODIS, AI stories  (Google Drive)
OUTPUT_DIR = ROOT / "output"                  # reports from `python pipeline.py ...`  (local only)
DEMO_DIR = ROOT / "demo_reports"              # reports from tools/export_demo.py  (GitHub)


def load_json(name):
    """Read one of the shared settings files from config/."""
    with open(CONFIG_DIR / name, encoding="utf-8") as f:
        return json.load(f)


def load_thresholds():
    return load_json("thresholds.json")
