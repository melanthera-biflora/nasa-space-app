"""Download the team's data zip and unzip it into the repo (README, Option A, done for you).

Run from the repo root:
    .venv/Scripts/python -m backend.fetch_data
The Render build runs it too. It does nothing when the files are already there; set DATA_ZIP_URL to use another copy.
"""
import os
import shutil
import sys
import tempfile
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
# the team's Google Drive copy (folder 14ufVW-LEGdij8n6UJzTwrwU3apgdAPkw), a direct download that skips the scan page
DEFAULT_URL = "https://drive.usercontent.google.com/download?id=1wevR0dFDS8pOFv3Lu_SRNrL7xV9cu3uG&export=download&confirm=t"
NEEDED = ["data_pipeline/data/pm25_monthly_global.nc", "data_pipeline/data/no2_monthly_global.nc",
          "data_pipeline/data/aod_monthly_us.nc", "data_pipeline/data/imerg_monthly_us.nc",
          "data_pipeline/data/modis_lst_monthly_us.nc", "data_pipeline/data/grace_lwe_us.nc",
          "data_pipeline/data/hms_smoke_days.nc", "data_pipeline/data/fires/modis_United_States.parquet",
          "data_pipeline/cache/indices/RONI.ascii.txt"]


def missing():
    return [p for p in NEEDED if not (ROOT / p).is_file()]


def safe_members(zf):
    """Only paths inside the repo's data folders: a zip can't write anywhere else."""
    for name in zf.namelist():
        path = Path(name)
        if path.is_absolute() or ".." in path.parts or not name.startswith(("data_pipeline/data/", "data_pipeline/cache/")):
            raise SystemExit(f"refusing a zip entry outside the data folders: {name}")
    return zf.namelist()


def main():
    if not missing():
        print("data already in place")
        return
    url = os.environ.get("DATA_ZIP_URL") or DEFAULT_URL
    with tempfile.TemporaryDirectory() as tmp:
        zip_path = Path(tmp) / "climatch-data.zip"
        print("downloading the data zip (about 600 MB)…", flush=True)
        with urllib.request.urlopen(url, timeout=120) as response, open(zip_path, "wb") as out:
            shutil.copyfileobj(response, out, length=1 << 20)
        if not zipfile.is_zipfile(zip_path):
            raise SystemExit("the download isn't a zip (Google Drive may be asking to sign in or rate-limiting); "
                             "check that the file is shared as 'Anyone with the link', or set DATA_ZIP_URL")
        with zipfile.ZipFile(zip_path) as zf:
            zf.extractall(ROOT, members=safe_members(zf))
    gaps = missing()
    if gaps:
        raise SystemExit(f"the zip didn't hold: {', '.join(gaps)}")
    print("data ready")


if __name__ == "__main__":
    sys.exit(main())
