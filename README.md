# Climatch: Earth System Trend Detective

NASA Space Apps Challenge 2026, "Be An Earth System Trend Detective". Team SNSD.

Pick a place in the US and Climatch shows how heat, cold, rain, humidity, smoke, air pollution, fires and water
changed there from 2001 to 2025 in NASA data, which of those changes are real (a statistical test, not a guess), and
what matters for the people who live there. It describes the past only: no forecasts and no medical advice.

**Features:** see [docs/FEATURES.md](docs/FEATURES.md) (written for the slides).

The app runs locally: a Python backend (FastAPI) on port 8000 and a Next.js frontend on port 5173.

## 1. Get the code

You need [Git](https://git-scm.com/), [Python 3.12](https://www.python.org/downloads/) and
[Node.js 20 or newer](https://nodejs.org/) (npm comes with it).

```bash
git clone https://github.com/melanthera-biflora/nasa-space-app.git
```

```bash
cd nasa-space-app
```

## 2. Install

Run these from the repo root. On macOS or Linux, write `.venv/bin/python` wherever you see `.venv/Scripts/python`.

```bash
python -m venv .venv
```

```bash
.venv/Scripts/python -m pip install -r backend/requirements.txt
```

```bash
npm --prefix frontend ci
```

`backend/requirements.txt` also installs the data pipeline's packages. Optional: `git config core.hooksPath .githooks`
turns on a check that refuses to commit `.env` files or downloaded data.

## 3. Get the data

**What already works with no download.** The repo carries the built files the app shows first: the demo city
reports, the US trend maps, the animated year-by-year maps and the 51-city comparison (about 13 MB in
`data_pipeline/demo_reports/`). Weather for any new address and state averages come live from NASA POWER, with no
login.

**What needs the data files.** For a new address, the PM2.5, NO₂, haze, smoke, satellite rain, ground heat, water
storage and fire records read large NetCDF files (about 600 MB). Without them those records say "not available". Get
them in one of two ways.

### Option A: download the team's copy from Google Drive (recommended, about 600 MB)

1. Open the team folder: **[Climatch data on Google Drive](https://drive.google.com/drive/folders/14ufVW-LEGdij8n6UJzTwrwU3apgdAPkw?usp=sharing)**.
2. Download `climatch-data.zip` and unzip it **into the repo root**. The zip holds the same folders as the repo
   (`data_pipeline/data/…` and `data_pipeline/cache/…`), so the files land in the right place. Only the zip is
   needed to run the app: the folder's `fires/`, `no2_years/` and `pm25_years/` are the raw parts the files were
   built from.
3. Check that these files are there, then start (or restart) the backend:

| File in the repo | Size | Used for |
| --- | --- | --- |
| `data_pipeline/data/pm25_monthly_global.nc` | 170 MB | Fine particles (PM2.5) |
| `data_pipeline/data/no2_monthly_global.nc` | 75 MB | Nitrogen dioxide (NO₂) |
| `data_pipeline/data/aod_monthly_us.nc` | 17 MB | Haze (aerosol optical depth) |
| `data_pipeline/data/imerg_monthly_us.nc` | 128 MB | Rain seen from satellites |
| `data_pipeline/data/modis_lst_monthly_us.nc` | 182 MB | Ground heat (5 km) |
| `data_pipeline/data/grace_lwe_us.nc` | 8 MB | Water storage |
| `data_pipeline/data/hms_smoke_days.nc` | 1 MB | Smoke days |
| `data_pipeline/data/fires/modis_United_States.parquet` (and `_meta.json`) | 21 MB | Fire detections near a place |
| `data_pipeline/cache/indices/` | 0.2 MB | El Niño and La Niña winters |
| `data_pipeline/cache/modis_lst_*.csv` | 0.1 MB | Neighbourhood heat (1 km) for the demo cities |

These folders are git-ignored: never commit them.

**For whoever updates the Drive copy:** from the repo root, this makes `climatch-data.zip` next to the repo folder
(outside it, so it can't be committed) with exactly the files above and their paths:

```bash
.venv/Scripts/python -c "import glob, zipfile; files = [f for f in glob.glob('data_pipeline/data/*.nc') if 'oisst' not in f] + glob.glob('data_pipeline/data/fires/modis_United_States*') + glob.glob('data_pipeline/cache/indices/*') + glob.glob('data_pipeline/cache/modis_lst_*.csv'); z = zipfile.ZipFile('../climatch-data.zip', 'w', zipfile.ZIP_DEFLATED); [z.write(f) for f in files]; z.close(); print(len(files), 'files')"
```

### Option B: download from the original sources

Run these from `data_pipeline/` with the repo's Python (`../.venv/Scripts/python -m …`). Every build works one year at a
time and resumes where it stopped if you run it again.

**NASA Earthdata login (free).** Six of the builds need one:

1. Create an account at [urs.earthdata.nasa.gov](https://urs.earthdata.nasa.gov/).
2. Under **Applications → Authorized Apps**, approve **NASA GESDISC DATA ARCHIVE** (PM2.5, haze, NO₂ and rain come
   from GES DISC). If another archive refuses a download, approve it there the same way.
3. Generate a token in your profile and set it **in the terminal** that runs the build (never in a file you commit):
   PowerShell `$env:EARTHDATA_TOKEN = '<your token>'`, macOS or Linux `export EARTHDATA_TOKEN='<your token>'`.

| Data | Command (from `data_pipeline/`) | Login | Download |
| --- | --- | --- | --- |
| Fire detections, US (FIRMS) | `python -m sources.fires_firms United_States` | None | ~200 MB |
| Smoke days (NOAA HMS) | `python -m sources.hms_smoke` | None | ~90 MB |
| PM2.5 (MERRA-2) | `python -m sources.pm25_merra2` (test one year first: `… 2025 2025`) | Earthdata | ~24 GB streamed, ~1 h |
| Haze (MERRA-2 AOD) | `python -m sources.merra2_aod` | Earthdata | ~25 MB |
| NO₂ (OMI) | `python -m sources.no2_omi` (test with `… 2024 2024`) | Earthdata | several GB streamed |
| Satellite rain (GPM IMERG) | `python -m sources.imerg` | Earthdata | ~750 MB |
| Ground heat, 5 km (MODIS MOD11C3) | `python -m sources.modis_lst_monthly` | Earthdata | ~3 GB |
| Water storage (GRACE and GRACE-FO) | `python -m sources.grace` | Earthdata | ~45 MB |
| Neighbourhood heat, 1 km (MODIS MOD11A2) | `python -m sources.modis_lst LAT LON`, once per demo city | None | 25–50 min per city |
| El Niño index (NOAA CPC RONI) | `curl -o cache/indices/RONI.ascii.txt https://www.cpc.ncep.noaa.gov/data/indices/RONI.ascii.txt` | None | 15 KB |

NASA POWER weather needs no build: it downloads on the first report for a place (1–60 s) and is cached.

After rebuilding the data, rebuild what the app shows first (each takes a few minutes):

```bash
python -m tools.trend_field
```

```bash
python -m tools.map_frames
```

```bash
python -m tools.compare_export
```

```bash
python -m tools.export_demo
```

## 4. Run

Start the backend and the frontend in two terminals, both from the repo root:

```bash
.venv/Scripts/python -m uvicorn backend.app:app --port 8000
```

```bash
npm --prefix frontend run dev
```

Open **http://localhost:5173**. For a demo, run `npm --prefix frontend run build` and then `npm --prefix frontend start`:
the production build is faster and prefetches links.

| Page | What it is |
| --- | --- |
| `/` | Who lives here (the household) |
| `/where` | Pick a place |
| `/report` | The household's report |
| `/compare` | Compare 51 US cities against the household's limits |
| `/explore`, `/seasons`, `/test`, `/events`, `/map`, `/patterns` | Look closer: the six detective steps |
| `/learn` | Case files (guided examples) |
| `/about` | Methods, data and limits |

The API's interactive docs are at http://localhost:8000/api/v1/docs (the contract is `backend/openapi.v1.json`).

**Settings (optional).** Settings are read from the environment or from a `.env` file at the repo root that you create
yourself. Never commit it; `.gitignore` already excludes it.

| Variable | What for |
| --- | --- |
| `DATABASE_URL` | A shared Postgres cache (Supabase Session pooler connection string). Without it, the backend uses files and everything still works |
| `EARTHDATA_TOKEN` | Only for Option B's NASA downloads; set it in the terminal |

**Shared database (optional).** The app doesn't need one: without `DATABASE_URL` the backend keeps everything in
files, and http://localhost:8000/api/v1/health says `"store": "files"`. A database only shares finished reports and
place lookups between the team's machines, so a city one person opened loads at once for everyone.

To use the team's Supabase database:

1. Ask the project owner for the **Session pooler** connection string (Supabase → the project → **Connect** →
   **Session pooler**). It holds the database password, so it's sent privately (a direct message or a password
   manager), never in a group chat, an issue or a commit. If Supabase shows `[YOUR-PASSWORD]` in the string, the owner
   puts the password there (or resets it under **Project Settings → Database**).
2. In the repo root, create a file named `.env` (no other name, no extension) with one line:
   `DATABASE_URL=postgresql://…` with the string pasted after the `=`.
3. Restart the backend and open http://localhost:8000/api/v1/health: it should say `"store": "postgres"`. If it says
   `"files"`, the backend's terminal shows why in a `database unavailable (…)` line. After several wrong passwords
   Supabase refuses new connections for a few minutes, so fix the string and wait before trying again.

To use your own free Supabase project instead:

1. Create a project at [supabase.com](https://supabase.com/).
2. In its **SQL Editor**, run `backend/migrations/001_init.sql`, `002_region_series.sql` and `003_cleanup.sql`, in
   that order.
3. Put that project's Session pooler string in `.env` as above, then fill it with the demo reports and maps:
   `.venv/Scripts/python -m backend.store.seed`.

## 5. Test

```bash
.venv/Scripts/python -m pytest -q backend
```

```bash
cd data_pipeline && ../.venv/Scripts/python -m pytest -q test --ignore=test/test_story_writer.py
```

```bash
npm --prefix frontend test
```

```bash
npm --prefix frontend run lint
```

## Project layout

| Folder | What's in it |
| --- | --- |
| `data_pipeline/` | Python: downloads NASA data (`sources/`), statistics (`analysis/`), builds maps and tables (`tools/`), settings and wording (`config/`), built demo files (`demo_reports/`) |
| `backend/` | FastAPI app: routes (`api/v1/`), use cases (`services/`), files or Postgres (`store/`), tests |
| `frontend/` | Next.js app: pages (`src/app/`), views, components, presenters (pure logic with tests), the API client (`src/api/`) |
| `docs/` | Features, decisions, data notes, team handoff, reviews |

## Data sources and citations

### In the app

| Data | Citation |
| --- | --- |
| **NASA POWER** daily and monthly weather (MERRA-2 based): very hot days, warm nights, cold nights, frost, heavy rain, dry and muggy days, state averages | These data were obtained from the NASA Langley Research Center (LaRC) POWER Project funded through the NASA Earth Science/Applied Science Program. https://power.larc.nasa.gov/ |
| **MERRA-2 aerosol diagnostics** (M2TMNXAER, V5.12.4): PM2.5 (rebuilt from dust, sea salt, sulfate, black and organic carbon) and haze (AOD) | Global Modeling and Assimilation Office (GMAO) (2015), MERRA-2 tavgM_2d_aer_Nx: 2d, Monthly mean, Time-averaged, Single-Level, Assimilation, Aerosol Diagnostics V5.12.4, Greenbelt, MD, USA, Goddard Earth Sciences Data and Information Services Center (GES DISC), https://doi.org/10.5067/FH9A0MLJPC7N. Gelaro, R., et al. (2017), The Modern-Era Retrospective Analysis for Research and Applications, Version 2 (MERRA-2), *J. Climate* 30, 5419–5454, https://doi.org/10.1175/JCLI-D-16-0758.1 |
| **OMI/Aura NO₂** (OMNO2d, version 004) | Krotkov, N. A., et al., OMI/Aura NO2 Cloud-Screened Total and Tropospheric Column Daily L3 Global 0.25deg Lat/Lon Grid, version 004, GES DISC, https://doi.org/10.5067/Aura/OMI/DATA3407 |
| **NASA FIRMS** MODIS active fire detections (Collection 6.1, Terra and Aqua) | MODIS Collection 6.1 Hotspot / Active Fire Detections MCD14ML, distributed from NASA FIRMS, https://doi.org/10.5067/FIRMS/MODIS/MCD14ML. We acknowledge the use of data and/or imagery from NASA's Fire Information for Resource Management System (FIRMS) (https://www.earthdata.nasa.gov/firms), part of NASA's Earth Science Data and Information System (ESDIS) |
| **NOAA Hazard Mapping System** smoke polygons (medium and heavy smoke, from 2011) | NOAA NESDIS Office of Satellite and Product Operations, Hazard Mapping System Fire and Smoke Product, https://www.ospo.noaa.gov/products/land/hms.html. Method note: Liu, T., et al. (2024), *Int. J. Wildland Fire* 33, WF23148 |
| **GPM IMERG Final** monthly precipitation (GPM_3IMERGM, V07) | Huffman, G. J., E. F. Stocker, D. T. Bolvin, E. J. Nelkin, J. Tan (2023), GPM IMERG Final Precipitation L3 1 month 0.1 degree x 0.1 degree V07, GES DISC, https://doi.org/10.5067/GPM/IMERG/3B-MONTH/07 |
| **MODIS/Terra land surface temperature**, monthly 0.05° (MOD11C3, v061) | Wan, Z., Hook, S., Hulley, G. (2021), MODIS/Terra Land Surface Temperature/Emissivity Monthly L3 Global 0.05Deg CMG V061, NASA EOSDIS LP DAAC, https://doi.org/10.5067/MODIS/MOD11C3.061 |
| **MODIS/Terra land surface temperature**, 8-day 1 km (MOD11A2, v061), through the ORNL DAAC subset service | Wan, Z., Hook, S., Hulley, G. (2021), MODIS/Terra Land Surface Temperature/Emissivity 8-Day L3 Global 1km SIN Grid V061, NASA EOSDIS LP DAAC, https://doi.org/10.5067/MODIS/MOD11A2.061. ORNL DAAC (2018), MODIS and VIIRS Land Products Global Subsetting and Visualization Tool, ORNL DAAC, Oak Ridge, Tennessee, USA, https://doi.org/10.3334/ORNLDAAC/1379 |
| **GRACE and GRACE-FO** water storage (JPL mascons RL06.3 v04, CRI filtered) | JPL GRACE and GRACE-FO Mascon Ocean, Ice, and Hydrology Equivalent Water Height Coastal Resolution Improvement (CRI) Filtered Release 06.3 Version 04, PO.DAAC, https://doi.org/10.5067/TEMSC-3JC634 |
| **NOAA CPC Relative Oceanic Niño Index** (RONI), for El Niño and La Niña winters | NOAA Climate Prediction Center, https://www.cpc.ncep.noaa.gov/data/indices/RONI.ascii.txt. L'Heureux, M. L., et al. (2024), A Relative Sea Surface Temperature Index for Classifying ENSO Events in a Changing Climate, *J. Climate* 37, 1197–1211, https://doi.org/10.1175/JCLI-D-23-0406.1 |
| **US Census Bureau** cartographic boundary files, states, 2024 (1:20,000,000) | U.S. Census Bureau, 2024 Cartographic Boundary Files, https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html |
| **OpenStreetMap**: map tiles, place search (Nominatim) and suggestions while typing (Photon by komoot) | © OpenStreetMap contributors, available under the Open Database License, https://www.openstreetmap.org/copyright. Nominatim, https://nominatim.org/. Photon, https://photon.komoot.io/ |
| **Event catalogue** (heat waves, smoke, floods, droughts) | Each event lists its own source (NOAA, NASA, state agencies, peer-reviewed studies) in `data_pipeline/config/events.json` |

### Used for checks only

| Data | Citation |
| --- | --- |
| **EPA AirData** daily PM2.5 monitors (88101, 88502), 2003–2016: a check on MERRA-2 PM2.5 (why PM2.5 trends start in 2010) | U.S. Environmental Protection Agency, Air Quality System data, https://aqs.epa.gov/aqsweb/airdata/download_files.html |
| **NOAA GHCN-Daily** airport stations: a check of the NASA grid against stations | Menne, M. J., et al. (2012), Global Historical Climatology Network - Daily (GHCN-Daily), Version 3, NOAA National Centers for Environmental Information, https://doi.org/10.7289/V5D21VHZ |

### Downloaded for the North America maps (not shown yet)

| Data | Citation |
| --- | --- |
| **NASA FIRMS**, Canada and Mexico | As FIRMS above |
| **NOAA OISST v2.1** monthly sea-surface temperature | Huang, B., et al. (2021), Improvements of the Daily Optimum Interpolation Sea Surface Temperature (DOISST) Version 2.1, *J. Climate* 34, 2923–2939, https://doi.org/10.1175/JCLI-D-20-0166.1. NOAA OI SST V2 High Resolution Dataset data provided by the NOAA PSL, Boulder, Colorado, USA, from their website at https://psl.noaa.gov |
| **Climate indices**: ONI, PDO and AMO (from ERSST v5), NAO, PNA, AO | NOAA Climate Prediction Center, https://www.cpc.ncep.noaa.gov/. NOAA NCEI, https://www.ncei.noaa.gov/pub/data/cmb/ersst/v5/index/. Huang, B., et al. (2017), Extended Reconstructed Sea Surface Temperature, Version 5 (ERSSTv5), *J. Climate* 30, 8179–8205, https://doi.org/10.1175/JCLI-D-16-0836.1 |
| **Natural Earth** country outlines (1:50m) | Made with Natural Earth. Free vector and raster map data @ naturalearthdata.com |

Climatch uses NASA data but is not endorsed by NASA. It shows no NASA logo.
