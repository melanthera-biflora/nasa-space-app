# Data additions (Nov 2026)

Six datasets added so households can compare places on heat stress, smoke, drought, rain, street-level heat and haze.
Each has a source module in `data_pipeline/sources/` and parser tests in `data_pipeline/test/` (no network). The built
files live in `data_pipeline/data/` (git-ignored; share through Google Drive). **None is wired into reports, `config/`,
`pipeline.py`, the backend or the frontend yet**: that is SPEC amendment A3's job.

Run every command from the `data_pipeline` folder with the repo's `.venv`. The Earthdata builds need a login in the
same terminal (see the README, Option B): set `EARTHDATA_TOKEN` there, or let `earthaccess` prompt. The four
login builds stream only the US block of each variable through NASA's cloud OPeNDAP service, so nothing big is
downloaded or left on disk.

| File | What | Size | Period |
| --- | --- | --- | --- |
| `cache/power_*.csv` (column `T2MWET`) | Daily-mean wet-bulb temperature | +1 column on 64 points | 2001–2025 |
| `data/hms_smoke_days.nc` | Smoke days per month and year | 0.6 MB | Aug 2005–Dec 2025 (full years 2006–2025) |
| `data/grace_lwe_us.nc` | Water storage anomaly | 8.7 MB | Apr 2002–Sep 2026, 261 months (gap Jul 2017–May 2018) |
| `data/imerg_monthly_us.nc` | Rain per month | 134 MB | Jan 2001–Sep 2025 (last Final month) |
| `data/modis_lst_monthly_us.nc` | Day and night surface temperature | 190 MB | Jan 2001–Dec 2025 (trend to 2022) |
| `data/aod_monthly_us.nc` | Aerosol optical depth | 17 MB | Jan 2001–Dec 2025 |
| `data/fires/na/modis_{Canada,Mexico}.parquet` | Fire detections beyond the border (maps only) | 39 MB with yearly parts | 2001–2025 |
| `data/oisst_monthly_na.nc` | Sea-surface temperature, North America box | 60 MB | Jan 2001–Dec 2025 |
| `cache/indices/*` | ENSO (RONI, ONI), PDO, AMO, NAO, PNA, AO | 155 KB | 1950s–Oct 2026 |
| `cache/natural_earth/ne_50m_admin_0_countries.zip` | Country outlines | 0.8 MB | v5.1.1 |
| `cache/epa_aqs/daily_{88101,88502}_<year>.zip` | EPA ground PM2.5, daily (a check, not a record) | 81 MB | 2003–2016 |

The builds also keep per-year parts for resuming (`data/aod_years/` 17 MB, `data/imerg_years/` 134 MB,
`data/modis_lst_years/` 187 MB) and raw files in `cache/hms/` (86 MB) and `cache/grace/` (45 MB). They can be
deleted once the joined files exist; a rebuild then fetches them again.

The US box used by the gridded files is 18–72 N, 180–65 W (lower 48, Alaska, Hawaii), except HMS smoke (lower 48).

## 1. Wet-bulb temperature (NASA POWER)

- **Product:** NASA POWER daily point API, community RE, parameter `T2MWET` ("Wet Bulb Temperature at 2 Meters"),
  MERRA-2 based, 0.5° x 0.625°. No login.
- **Variable / units:** daily **mean** wet-bulb, °C. POWER has **no daily maximum** wet-bulb: the daily, AG/SB/RE
  parameter lists (checked 2026-11-15) only have `T2MWET`; an hourly `T2MWET` exists, so a daily max could be built
  from the hourly API later (much slower).
- **Where:** added to `POWER_PARAMS` in `sources/power.py`, so every new place fetches it and a cached place missing
  it is refetched. Helper: `wet_bulb_days(daily, threshold_c)` (days per year at or above the cutoff, scaled and
  masked like the other day counts).
- **Rebuild:** nothing to build; the 64 cached points were refetched on 2026-11-15 (old columns identical, no year
  changed between complete and incomplete, no `-999` in `T2MWET`).
- **Caveats:** a 50 km grid-cell average; a daily mean is several degrees below the afternoon peak, so physiological
  limits (31–35 °C, which are peak values) are never reached in daily means (US maximum in our 64 points: 28.9 °C,
  New Orleans).
- **Cutoff: adopted by the owner on 2026-11-15, not yet in `config/thresholds.json`** (the A3 wiring adds it there
  and to `docs/DECISIONS.md`). Daily-mean wet-bulb **≥ 24 °C** is a "humid-heat day":
  - the 24 °C floor on daily-mean wet-bulb used to define humid heatwaves in
    [Nature Communications 2025](https://www.nature.com/articles/s41467-025-58694-6);
  - consistent with Climate Central's "dangerous humid heat day" (daily **maximum** wet-bulb ≥ 25 °C, informed by
    critical wet-bulb studies) [climatecentral.org](https://www.climatecentral.org/climate-matters/dangerous-humid-heat),
    since a day whose mean is 24 °C almost always peaks above 25 °C;
  - for context: uncompensable heat for young, healthy adults starts near 30–31 °C wet-bulb in humid air
    ([Vecellio et al. 2022, J Appl Physiol](https://pmc.ncbi.nlm.nih.gov/articles/PMC8799385)), lower for older adults.
  - Days per year at several cutoffs (2001–05 average / 2021–25 average):

    | Place | ≥ 22 °C | ≥ 24 °C | ≥ 25 °C | ≥ 26 °C |
    | --- | --- | --- | --- | --- |
    | Miami | 237 / 276 | 170 / 192 | 145 / 155 | 90 / 122 |
    | Houston | 149 / 163 | 108 / 121 | 76 / 98 | 27 / 59 |
    | New Orleans | 159 / 172 | 127 / 131 | 100 / 109 | 54 / 77 |
    | Atlanta | 66 / 70 | 14 / 25 | 1 / 7 | 0 / 1 |
    | Phoenix | 49 / 66 | 24 / 36 | 6 / 16 | 1 / 2 |
    | New York | 28 / 44 | 5 / 12 | 1 / 2 | 0 / 0 |
    | Minneapolis | 15 / 16 | 4 / 4 | 1 / 2 | 0 / 0 |
    | Boise | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |

## 2. Smoke days (NOAA HMS smoke polygons)

- **Product:** NOAA NESDIS/OSPO Hazard Mapping System (HMS) smoke polygons, analyst-drawn from GOES and polar-orbiter
  imagery. One shapefile zip a year from
  `https://satepsanone.nesdis.noaa.gov/pub/FIRE/web/HMS/Smoke_Polygons/Shapefile/Annual_Bundles/` (86 MB for
  2005–2025, kept in `cache/hms/`). No login. Not NASA data: credit NOAA.
- **File:** `data/hms_smoke_days.nc`, 0.6 MB, float32 (NaN = unknown).
  - `smoke_days` (time, lat, lon) and `smoke_days_year` (year, lat, lon): days with any smoke outline over the
    square's centre.
  - `smoke_days_mh`, `smoke_days_mh_year`: days with a Medium or Heavy outline.
  - `days_with_smoke_anywhere` (time): days with any outline in the lower-48 box (a coverage check).
- **Grid:** the MERRA-2 / POWER grid (0.5° lat x 0.625° lon), lower-48 box 24–50 N, 125–66.25 W, the same squares as
  `data/pm25_monthly_global.nc`. A day is the UTC date of the outline's start time.
- **Period:** the archive starts on 5 Aug 2005, so months before Sep 2005 and the year 2005 are empty; full years
  2006–2025. **Medium + heavy** starts in June 2010 (first full year 2011): density tags are patchy before that
  (checked in the files: 2008 mostly tagged, 2009 almost none, 2010 from June).
- **Used in the app (D37):** `smoke_days_mh` from 2011. The any-density count is kept in the file, but not shown: its jump from 2022 is light smoke (often aloft; NOAA relabelled density that year), and Liu et al. 2024 find light plumes overstate smoke days and trends.
- **Rebuild:** `python -m sources.hms_smoke` (about 2 minutes; one year: `python -m sources.hms_smoke 2020 2020`).
- **Sanity check (2026-11-15):** Portland, OR, Sep 2020: 23 smoke days (16 medium/heavy). Milwaukee, Jun 2023: 30
  smoke days (23 medium/heavy); Milwaukee's yearly count was 94–172 in 2021–2025 against 21–78 before.
- **Caveats:**
  - Smoke can be anywhere in the column: an outline says smoke was seen overhead, not that the air at the ground was
    smoky. Pair with PM2.5 for ground level.
  - No outline is drawn where cloud hides the smoke, so cloudy smoke days are missed.
  - Imagery and analyst practice changed over time: GOES-16 (from 2017) gives more frequent, sharper images, and the
    outlines got more detailed (the yearly file grew from about 2 MB to 5–9 MB while the number of outlines stayed
    between 12,000 and 45,000). Long trends, especially in light smoke, partly reflect this; compare with care.
  - A square counts when the outline covers its centre: a thin plume can cross a square without counting.

## 3. Water storage (GRACE / GRACE-FO)

- **Product:** JPL GRACE/GRACE-FO mascon RL06.3 v04 with Coastline Resolution Improvement,
  `TELLUS_GRAC-GRFO_MASCON_CRI_GRID_RL06.3_V4` (PO.DAAC, Earthdata login). One file,
  `GRCTellus.JPL.200204_202609.GLO.RL06.3M.MSCNv04CRI.nc` (44 MB, kept in `cache/grace/`).
- **File:** `data/grace_lwe_us.nc`, 8.7 MB. `lwe_thickness` and `uncertainty` (time, lat, lon), **cm of liquid water
  equivalent**, anomaly against the 2004.0–2009.999 mean. Times are each solution's mid-point (not month starts).
- **Grid:** 0.5° on file (108 × 230 squares, checked 2026-11-15), longitudes turned from 0–360 to −180–180, US box. The real resolution is the **3° mascon
  (~300 km)**: neighbouring squares share one value, so this is a regional signal, never a neighbourhood one.
- **Period:** Apr 2002–Sep 2026, 261 solutions. Missing runs of 2+ months: 2002-06/07, 2013-08/09, 2015-05/06,
  2015-10/11, 2016-09/10, **2017-07 to 2018-05 (11 months, the GRACE to GRACE-FO gap)**, 2018-08/09; plus single
  missing months (battery management). Don't draw a line across the gap, and don't average a year with missing months
  without saying so (season matters: a year missing its spring reads dry).
- **Rebuild:** `python -m sources.grace` (about 1 minute).
- **Sanity check (2026-11-15):** California state mean (cos-lat weighted inside the outline): 2011 +2.7 cm,
  2012 −5.7, 2013 −10.3, 2014 −20.1, 2015 −20.5, 2016 −15.2: the 2012–2016 drought shows.
- **Caveats:** total water (groundwater, soil, snow, surface water) without telling them apart; JPL's optional
  land-hydrology gain factors are not applied; small states sit inside one or two mascons.

## 4. Rain (GPM IMERG)

- **Product:** GPM IMERG Final Run V07 monthly, `GPM_3IMERGM` (GES DISC, Earthdata login), satellite estimate
  calibrated to rain gauges. Streamed through cloud OPeNDAP (`/Grid/precipitation`, US block only).
- **File:** `data/imerg_monthly_us.nc`, 134 MB. `rain` (time, lat, lon), **mm in the month**: the file stores a monthly
  mean rate in **mm/hr** (checked in each reply's `units`; the build refuses any other unit), multiplied by 24 x days
  in the month. Stored rounded to whole mm.
- **Grid:** 0.1° (cell centres 18.05–71.95 N, 179.95–65.05 W).
- **Period:** Jan 2001–**Sep 2025**: the Final Run is 3–4 months behind and Sep 2025 was the last Final month on
  2026-11-15. `data/imerg_years/imerg_2025.part.nc` holds the partial year; a rerun refetches it and picks up new months.
- **Rebuild:** `python -m sources.imerg` (about 2 minutes; one year: `python -m sources.imerg 2017 2017`).
- **Sanity check (2026-11-15):** Houston, Aug 2017 (Hurricane Harvey): 776 mm, against a median of 86 mm for its other
  Augusts. Largest value in the box: 2,689 mm, Sep 2008 at sea near Hispaniola.
- **Caveats:** a 10 km satellite estimate, not a gauge; less reliable for snow and over snow- or ice-covered ground,
  which matters for much of Alaska. A monthly total says nothing about single-day downpours: POWER's daily
  `PRECTOTCORR` covers those.

## 5. Surface temperature, day and night (MODIS MOD11C3)

- **Product:** MODIS **Terra** `MOD11C3` v061 monthly land surface temperature on the 0.05° climate-modelling grid
  (LP DAAC, Earthdata login). Streamed through cloud OPeNDAP (`/MODIS_MONTHLY_0_05DEG_CMG_LST/Data_Fields/LST_Day_CMG`
  and `LST_Night_CMG`, US block only), so **no HDF4 reader and no new dependency** were needed. (For the record: the
  repo's netCDF4 wheel ships `hdf.dll`/`mfhdf.dll`, but it was not needed.)
- **File:** `data/modis_lst_monthly_us.nc`, 190 MB. `lst_day` (~10:30 local) and `lst_night` (~22:30 local),
  (time, lat, lon), **°C** = raw x 0.02 − 273.15; raw 0 (water, or no clear sky all month) is NaN. Stored to ~0.1 °C.
- **Grid:** **0.1°** (2 x 2 mean of the 0.05° squares that have data; 0.05° over the US box would be ~6 GB).
- **Period:** Jan 2001–Dec 2025.
- **Why Terra, not Aqua (`MYD11C3`, 13:30):** Terra matches our 1 km surface-heat card (`MOD11A2`) and starts in 2000;
  Aqua starts in July 2002 and has also drifted since 2022, so it wouldn't give clean recent years either.
- **Rebuild:** `python -m sources.modis_lst_monthly` (about 4 minutes; one year: `... 2020 2020`). A check stops the
  build if Phoenix has no data or the middle of the Gulf of Mexico has some (a flipped or shifted map).
- **Sanity check (2026-11-15):** Phoenix, Jun–Aug, 2001–2025 mean: day 49.6 °C, night 30.7 °C.
- **Caveats:**
  - **Terra orbit drift:** the overpass moved more than an hour earlier after 2020, so daytime values read cool from
    about 2023 (Phoenix summer days: 2024 48.8 °C and 2025 47.1 °C against 49–50 °C before). Stop daytime trends at
    2022 (`LAST_CLEAN_YEAR` in `sources/modis_lst.py`).
  - The temperature of the ground and roofs, not the air; clear-sky days only (a cloudy month is biased to its sunny
    days); no data over water.

## 6. Aerosol optical depth (MERRA-2)

- **Product:** MERRA-2 `M2TMNXAER` v5.12.4 monthly means (GES DISC, Earthdata login), the same collection as our
  PM2.5, but a separate build: `data/pm25_monthly_global.nc` is untouched. Streamed through cloud OPeNDAP
  (`/TOTEXTTAU`, US block only): about 25 MB fetched instead of ~24 GB of files. Where a month was reprocessed
  (`MERRA2_401`), the reprocessed file is used.
- **File:** `data/aod_monthly_us.nc`, 17 MB. `aod` (time, lat, lon), `TOTEXTTAU` "Total Aerosol Extinction AOT
  [550 nm]", **no unit** (about 0.1 is clear air, 0.5 and up very hazy).
- **Grid:** 0.5° x 0.625° (18–72 N, 180–65 W), the same squares as the PM2.5 file.
- **Period:** Jan 2001–Dec 2025, 300 months, no gaps.
- **Rebuild:** `python -m sources.merra2_aod` (about 2 minutes; one year: `... 2023 2023`).
- **Sanity check (2026-11-15):** Wisconsin state mean, June 2023 (Canadian wildfire smoke): 0.373, against a median
  of 0.174 for its other Junes, the highest of 25 Junes. Portland, OR, Sep 2020: 0.82. Largest value in the box:
  4.3, Sep 2023 over northern British Columbia and Alberta.
- **Caveats:** the whole air column: smoke high overhead counts as much as smoke at the ground (pair with PM2.5).
  A reanalysis: satellite AOD is assimilated, but the model fills in cloudy areas.

## 7. Fire detections in Canada and Mexico (NASA FIRMS)

- **Added 2026-11-15** on the owner's go-ahead, after `us_mask` moved to the Census outline (the old mask was built
  from whatever fire files were on disk and would have grown into both countries).
- **Product:** the same FIRMS MODIS C6.1 yearly country files as the US (`modis_<year>_Canada.csv`,
  `modis_<year>_Mexico.csv`), no login; same cleaning (`type == 0`, confidence ≥ 30). About 300 MB fetched.
- **Where:** `data/fires/na/` (39 MB with the yearly parts in `data/fires/na/years/`). **Reports never read this
  folder:** `fires_series()` merges only the files directly in `data/fires/`, so "fires within 50 km" stays US
  detections (owner's choice; counting across the border would change border-city reports).
- **Counts kept:** Canada 1,443,798 detections (2001: 6,939; 2023: 280,489; 2025: 132,777); Mexico 1,491,711
  (2001: 23,452; 2023: 62,670; 2025: 51,974). All 25 years present for both.
- **Rebuild:** `python -m sources.fires_firms --na Canada Mexico` (resumes from the yearly parts).
- **Caveat:** a count per 1° square covers less ground in the north (cos latitude); Canada's 2023 season dwarfs every
  other year.

## 8. Sea-surface temperature (NOAA OISST v2.1)

- **Added 2026-11-15** on the owner's go-ahead. Not NASA data: credit "Data provided by the NOAA PSL, Boulder,
  Colorado, USA".
- **Product:** NOAA OISST v2.1 monthly means, `sst.mon.mean.nc` on PSL's THREDDS server (global 0.25°, 2.25 GB as a
  file). Only the box was fetched through OPeNDAP, one year per request (about 8 s a year). No login.
- **File:** `data/oisst_monthly_na.nc`, 60 MB, `sst` (time, lat, lon) in °C, land NaN; 10–72 N, 170–50 W
  (248 × 480 squares), Jan 2001–Dec 2025. Per-year parts in `data/oisst_years/` (59 MB). Land-sea mask
  `cache/oisst/lsmask.oisst.nc` (4.2 MB).
- **Rebuild:** `python -m sources.oisst` (about 4 minutes; one year: `python -m sources.oisst 2023 2023`).
- **Sanity check (2026-11-15):** Gulf of Mexico at 25 N, 90 W, August: 30.4 (2019), 29.9, 30.2, 30.1, **31.1 (2023)**,
  30.8, 30.9 (2025) °C; February mean 23.5 °C; no values over Kansas.
- **Caveats:** V2.1 has significant quality improvements from 1 January 2016 (NCEI), so early years compare with care;
  a coastal square averages only its sea part. Not on any map yet (the North America build waits for the owner).

## 9. Climate driver indices (NOAA CPC and NCEI)

- **Added 2026-11-15** on the owner's go-ahead, in `cache/indices/` as served (whole records, 155 KB). Show
  2001–2025 only.

  | File | Index | Source |
  | --- | --- | --- |
  | `RONI.ascii.txt` | Relative Oceanic Niño Index, 3-month seasons | [CPC](https://www.cpc.ncep.noaa.gov/data/indices/RONI.ascii.txt) |
  | `oni.ascii.txt` | Oceanic Niño Index (total and anomaly) | [CPC](https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt) |
  | `ersst.v5.pdo.dat` | Pacific Decadal Oscillation, monthly | [NCEI](https://www.ncei.noaa.gov/pub/data/cmb/ersst/v5/index/ersst.v5.pdo.dat) |
  | `ersst.v5.amo.dat` | Atlantic Multidecadal Oscillation (North Atlantic 0–60 N SST anomaly), monthly | [NCEI](https://www.ncei.noaa.gov/pub/data/cmb/ersst/v5/index/ersst.v5.amo.dat) |
  | `norm.nao.monthly.b5001.current.ascii` | North Atlantic Oscillation | [CPC](https://www.cpc.ncep.noaa.gov/products/precip/CWlink/pna/norm.nao.monthly.b5001.current.ascii) |
  | `norm.pna.monthly.b5001.current.ascii` | Pacific/North American pattern | [CPC](https://www.cpc.ncep.noaa.gov/products/precip/CWlink/pna/norm.pna.monthly.b5001.current.ascii) |
  | `monthly.ao.index.b50.current.ascii` | Arctic Oscillation | [CPC](https://www.cpc.ncep.noaa.gov/products/precip/CWlink/daily_ao_index/monthly.ao.index.b50.current.ascii) |

- **Checked:** every file is plain text and runs to Oct 2026 (RONI and ONI to the ASO 2026 season). The PDO file
  marks missing months as `99.99`; drop them when parsing.
- **Caveats:** ONI's base period moves every 5 years and RONI is relative to the tropical mean, so neither is a
  warming series. Indices describe the past; never use them to project.

## 10. Country outlines (Natural Earth 50m)

- **Added 2026-11-15** on the owner's go-ahead: `cache/natural_earth/ne_50m_admin_0_countries.zip` (0.8 MB,
  v5.1.1, shapefile set), from [naciscdn.org](https://naciscdn.org/naturalearth/50m/cultural/ne_50m_admin_0_countries.zip).
- Public domain; de facto boundaries. For the North America maps' Canada and Mexico outlines (clip and round as
  `tools/state_shapes.py` does for states); the US keeps the Census outline. Not used yet.

## 11. EPA ground PM2.5 (a check on MERRA-2, not a new record)

- **Added 2026-11-15** on the owner's go-ahead, for T105 (`docs/DATA_CHECKS.md` §2).
- **Product:** EPA AirData pre-generated daily files, `daily_88101_<year>.zip` (regulatory FRM/FEM monitors) and
  `daily_88502_<year>.zip` (other PM2.5 monitors, including Washington's nephelometers), 2003–2016, from
  [aqs.epa.gov/aqsweb/airdata](https://aqs.epa.gov/aqsweb/airdata/download_files.html). No login. Not NASA data.
- **Where:** `cache/epa_aqs/`, 28 zips, 81 MB, as served (every US monitor; the check reads three regional boxes).
- **Used by:** `python -m tools.pm25_ground_check` (about 30 s). Not wired into reports or maps.
- **Caveats:** monitors start, stop and move; the check compares each site only with itself, and only sites with 4+
  years on both sides of 2009–10. A point monitor is not a 50 km square, so levels differ; the check is about change.
