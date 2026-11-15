import zipfile

import pytest

from backend import fetch_data


def _zip(tmp_path, names):
    path = tmp_path / "d.zip"
    with zipfile.ZipFile(path, "w") as zf:
        for n in names:
            zf.writestr(n, "x")
    return zipfile.ZipFile(path)


def test_the_data_zip_may_only_write_into_the_data_folders(tmp_path):
    good = ["data_pipeline/data/pm25_monthly_global.nc", "data_pipeline/cache/indices/RONI.ascii.txt"]
    assert fetch_data.safe_members(_zip(tmp_path, good)) == good
    for bad in ("../outside.txt", "data_pipeline/data/../../backend/app.py", "backend/app.py"):
        with pytest.raises(SystemExit, match="outside the data folders"):
            fetch_data.safe_members(_zip(tmp_path, [bad]))


def test_nothing_is_downloaded_when_the_files_are_there(monkeypatch, tmp_path, capsys):
    monkeypatch.setattr(fetch_data, "ROOT", tmp_path)
    for p in fetch_data.NEEDED:
        (tmp_path / p).parent.mkdir(parents=True, exist_ok=True)
        (tmp_path / p).write_text("x")
    monkeypatch.setattr(fetch_data.urllib.request, "urlopen", lambda *a, **k: pytest.fail("no download expected"))
    fetch_data.main()
    assert "already in place" in capsys.readouterr().out
