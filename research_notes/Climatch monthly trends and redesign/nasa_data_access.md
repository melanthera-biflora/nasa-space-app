# NASA Earth-science data access for Climatch: monthly and weekly US region time series (status as of 2026-11-14)

Method note: besides web sources, I made live, unauthenticated test calls on 2026-11-14 to the NASA POWER API, the NASA CMR catalog (collection and latest-granule metadata), the OB.DAAC public directory and the Census download server. Results from those calls are cited with the exact URL that was called. Anything I could not check this session is labelled "(not verified this session)" or listed under Gaps.

## 1. Candidate datasets: product, variables, grid, period, latency, access, login, size

### Takeaway
Every candidate except POWER, FIRMS and the Census shapes needs an Earthdata Login (EDL) and is now cloud-hosted (`cloud_hosted=true` in CMR). Most are single global files per month, 2–600 MB each. So apart from NASA POWER, a state-by-month series means a one-time batch job (earthaccess + xarray, or the Giovanni web UI by hand) whose results are cached in Supabase. NASA POWER (MERRA-2 based, no login) is the only source that returns a state-sized regional grid in under 1 s.

### Cited Findings

**Catalog facts from CMR (queried 2026-11-14).** Columns: product; short name and version (CMR); provider; CMR start date; latest granule in CMR; size of one granule.
- MODIS Terra AOD monthly 1°: MOD08_M3 v6.1 (LAADS); start 2000-02-01; latest 2026-10-01; 375 MB — [CMR collections](https://cmr.earthdata.nasa.gov/search/collections.json?short_name=MOD08_M3), [CMR latest granule](https://cmr.earthdata.nasa.gov/search/granules.json?collection_concept_id=C1443766359-LAADS&sort_key=-start_date&page_size=1)
- MODIS Aqua AOD monthly 1°: MYD08_M3 v6.1 (LAADS); start 2002-07-01; latest 2026-10-01; 378 MB — [CMR latest granule](https://cmr.earthdata.nasa.gov/search/granules.json?collection_concept_id=C1443775657-LAADS&sort_key=-start_date&page_size=1)
- MAIAC AOD daily 0.05° CMG: MCD19A2CMG v061 (LPCLOUD); start 2000-02-24; latest 2026-11-13; 44 MB per day — [CMR latest granule](https://cmr.earthdata.nasa.gov/search/granules.json?collection_concept_id=C2565807733-LPCLOUD&sort_key=-start_date&page_size=1)
- MAIAC AOD daily 1 km: MCD19A2 v061 (LPCLOUD); start 2000-02-24; still ongoing in CMR — [CMR collections](https://cmr.earthdata.nasa.gov/search/collections.json?short_name=MCD19A2)
- MODIS NDVI/EVI monthly 0.05° CMG: MOD13C2 / MYD13C2 v061 (LPCLOUD); start 2000-02 / 2002-07; latest 2026-10-01; about 100 MB — [CMR latest granule](https://cmr.earthdata.nasa.gov/search/granules.json?collection_concept_id=C2565788914-LPCLOUD&sort_key=-start_date&page_size=1)
- VIIRS NDVI monthly CMG (continuity): VNP13C2 v002 (LPCLOUD); start 2012-01-01; latest 2026-11-01; 147 MB — [CMR latest granule](https://cmr.earthdata.nasa.gov/search/granules.json?collection_concept_id=C2631828311-LPCLOUD&sort_key=-start_date&page_size=1)
- MODIS snow cover monthly CMG: MOD10CM / MYD10CM v61 (NSIDC_CPRD); start 2000-03 / 2002-07; latest 2026-10-01; **2 MB** — [CMR latest granule](https://cmr.earthdata.nasa.gov/search/granules.json?collection_concept_id=C3050353608-NSIDC_CPRD&sort_key=-start_date&page_size=1)
- MODIS LST monthly 0.05° CMG: MOD11C3 / MYD11C3 v061 (LPCLOUD); start 2000-02 / 2002-07; latest 2026-10-01; 74 MB — [CMR latest granule](https://cmr.earthdata.nasa.gov/search/granules.json?collection_concept_id=C2565788897-LPCLOUD&sort_key=-start_date&page_size=1)
- GPM IMERG Final monthly: GPM_3IMERGM v07 (GES_DISC); start 1998-01-01; **latest 2025-09-01**; 18 MB — [CMR latest granule](https://cmr.earthdata.nasa.gov/search/granules.json?collection_concept_id=C2723754851-GES_DISC&sort_key=-start_date&page_size=1)
- GPM IMERG Final daily: GPM_3IMERGDF v07 (GES_DISC); start 1998-01-01; **latest 2025-09-30**; 31 MB — [CMR latest granule](https://cmr.earthdata.nasa.gov/search/granules.json?collection_concept_id=C2723754864-GES_DISC&sort_key=-start_date&page_size=1)
- GPM IMERG Late daily: GPM_3IMERGDL v07 (V07C files) (GES_DISC); latest 2026-11-13 — [CMR latest granule](https://cmr.earthdata.nasa.gov/search/granules.json?collection_concept_id=C2723754859-GES_DISC&sort_key=-start_date&page_size=1)
- GLDAS Noah monthly 0.25°: GLDAS_NOAH025_M v2.1 (GES_DISC); start 2000-01-01; latest 2026-07-01; 23 MB — [CMR latest granule](https://cmr.earthdata.nasa.gov/search/granules.json?collection_concept_id=C1342986036-GES_DISC&sort_key=-start_date&page_size=1)
- NLDAS Noah monthly 0.125° (CONUS only): NLDAS_NOAH0125_M v2.0 (GES_DISC); start 1979-01-01; latest 2026-10-01; 10 MB — [CMR latest granule](https://cmr.earthdata.nasa.gov/search/granules.json?collection_concept_id=C1887990023-GES_DISC&sort_key=-start_date&page_size=1)
- SMAP L3 enhanced soil moisture, daily: SPL3SMP_E v006 (NSIDC_CPRD); start 2015-03-31; latest 2026-11-13; **609 MB** — [CMR latest granule](https://cmr.earthdata.nasa.gov/search/granules.json?collection_concept_id=C2938664763-NSIDC_CPRD&sort_key=-start_date&page_size=1)
- SMAP L4 soil moisture: SPL4SMGP v008 (NSIDC_CPRD); start 2015-03-31; ongoing — [CMR collections](https://cmr.earthdata.nasa.gov/search/collections.json?short_name=SPL4SMGP)
- AIRS L3 monthly: AIRS3STM v7.0 (GES_DISC); start 2002-09-01; latest 2026-10-01; 202 MB — [CMR latest granule](https://cmr.earthdata.nasa.gov/search/granules.json?collection_concept_id=C1701805662-GES_DISC&sort_key=-start_date&page_size=1)
- AIRS L3 daily: AIRS3STD v7.0 (GES_DISC); start 2002-08-31; ongoing — [CMR collections](https://cmr.earthdata.nasa.gov/search/collections.json?short_name=AIRS3STD)
- MERRA-2 monthly aerosol: M2TMNXAER v5.12.4 (GES_DISC); start 1980-01-01; latest 2026-09-01; 80 MB — [CMR latest granule](https://cmr.earthdata.nasa.gov/search/granules.json?collection_concept_id=C1276812866-GES_DISC&sort_key=-start_date&page_size=1)
- MERRA-2 monthly single-level (T2M etc.): M2TMNXSLV v5.12.4 (GES_DISC); start 1980-01-01; latest 2026-09-01; 75 MB — [CMR latest granule](https://cmr.earthdata.nasa.gov/search/granules.json?collection_concept_id=C1276812859-GES_DISC&sort_key=-start_date&page_size=1)
- MERRA-2 hourly aerosol: M2T1NXAER v5.12.4 (GES_DISC); start 1980-01-01; ongoing — [CMR collections](https://cmr.earthdata.nasa.gov/search/collections.json?short_name=M2T1NXAER)
- OMI NO2 daily L3 0.25°, Collection 4: OMNO2d v004 (GES_DISC); start 2004-10-01; latest 2026-11-12; 11 MB — [CMR latest granule](https://cmr.earthdata.nasa.gov/search/granules.json?collection_concept_id=C3333493715-GES_DISC&sort_key=-start_date&page_size=1)
- OMI NO2 daily L3, Collection 3: OMNO2d v003 (GES_DISC); start 2004-10-01; **latest 2026-03-15 (stopped)**; 13 MB — [CMR latest granule](https://cmr.earthdata.nasa.gov/search/granules.json?collection_concept_id=C1266136111-GES_DISC&sort_key=-start_date&page_size=1)
- GRACE/GRACE-FO JPL mascon: TELLUS_GRAC-GRFO_MASCON_CRI_GRID_RL06.3_V4 (POCLOUD); start 2002-04-04; one file covering **200204–202609**; 44 MB — [CMR latest granule](https://cmr.earthdata.nasa.gov/search/granules.json?collection_concept_id=C3195527175-POCLOUD&sort_key=-start_date&page_size=1)
- VIIRS Deep Blue AOD monthly (MODIS continuity): AERDB_M3_VIIRS_SNPP v2.1 (LAADS); start 2012-03-01; latest 2026-10-01; 6 MB — [CMR latest granule](https://cmr.earthdata.nasa.gov/search/granules.json?collection_concept_id=C4218022437-LAADS&sort_key=-start_date&page_size=1)
- Also present in CMR: FLDAS_NOAH01_C_GL_M v001 (1982–ongoing) — [CMR collections](https://cmr.earthdata.nasa.gov/search/collections.json?short_name=FLDAS_NOAH01_C_GL_M)
- All collections above report `cloud_hosted=true` in CMR, so they live in Earthdata Cloud (AWS us-west-2), not on legacy DAAC servers — [CMR collections query](https://cmr.earthdata.nasa.gov/search/collections.json?short_name=M2TMNXAER)

**Per-product details from documentation.**
- MOD08_M3 gives monthly 1°×1° grid averages of atmospheric parameters including aerosol. DOI 10.5067/MODIS/MOD08_M3.061 — [LAADS MOD08_M3](https://ladsweb.modaps.eosdis.nasa.gov/missions-and-measurements/products/MOD08_M3)
- The Collection 6.1 L3 aerosol SDS list includes `AOD_550_Dark_Target_Deep_Blue_Combined`. The C6.1 L3 changes are confined to the monthly product — [C6.1 L3 changes PDF (ICDC mirror)](https://www.cen.uni-hamburg.de/en/icdc/data/atmosphere/docs-atmo/l3-c61-changes.pdf)
- Earth Engine band names follow a `..._Mean_Mean` pattern. The exact full SDS name (likely `AOD_550_Dark_Target_Deep_Blue_Combined_Mean_Mean`) must be checked in the file — [GEE MOD08_M3](https://developers.google.com/earth-engine/datasets/catalog/MODIS_061_MOD08_M3?hl=en)
- MCD19A2CMG v061: combined Terra+Aqua MAIAC land AOD and water vapor, daily, 0.05° CMG (about 5.6 km). Variables include AOD_047, AOD_055, Sigma_AOD_055, column water vapor and cloud fraction — [Earthdata MCD19A2CMG](https://www.earthdata.nasa.gov/data/catalog/lpcloud-mcd19a2cmg-061)
- MOD13C2 v061: monthly NDVI/EVI on a 0.05° CMG (about 5.6 km). Built by a weighted temporal average of the MOD13A2 composites that overlap the month. Includes QA, mean, standard deviation and pixel counts. DOI 10.5067/MODIS/MOD13C2.061 — [ICDC MODIS VI](https://www.cen.uni-hamburg.de/en/icdc/data/land/modis-vegetationindex.html), [Earthdata MOD13C2](https://earthdata.nasa.gov/data/catalog/lpcloud-mod13c2-061)
- MOD13A3 Version 6 was decommissioned on 2023-07-31; use v6.1 — [Earthdata Forum](https://forum.earthdata.nasa.gov/viewtopic.php?p=11172)
- GPM_3IMERGDF V07: Final daily, 0.1° (10×10 km), mean rate in mm/day, derived from half-hourly Final.
  - V07 applies the valid-sample correction during production, which removes the earlier daily dry bias.
  - Latency: Final half-hourly files arrive "once per month for the entire month, with up to 4 months latency". January dailies appear no earlier than April 2.
  - V07 supersedes older versions.
  - [Earthdata GPM_3IMERGDF](https://www.earthdata.nasa.gov/es/data/catalog/ges-disc-gpm-3imergdf-07)
- GLDAS-2.1: 2000 to present, 36 land-surface fields, monthly means of 3-hourly Noah 3.6 output. Variables include `SoilMoi0_10cm_inst` (kg m-2) and `Evap_tavg`.
  - Main product latency is set by GPCP v1.3 (3–4 months).
  - Early Products (EP) have about 1.5-month latency.
  - [Earthdata GLDAS_NOAH025_M 2.1](https://earthdata.nasa.gov/data/catalog/ges-disc-gldas-noah025-m-2.1), [GLDAS2 README (mirror)](https://data.mint.isi.edu/files/raw-data/GLDAS_NOAH025_M.2.1/doc/README_GLDAS2.pdf)
- OMI NO2 L3 daily is gridded at 0.25°. A GES DISC alert dated 2026-02-17 (updated 2026-06-17) asks users to switch to Collection 4 — [OMI switch to Collection 4](https://www.earthdata.nasa.gov/data/alerts-outages/omi-data-users-switch-collection-4), [data.gov OMNO2d](https://catalog-beta.data.gov/dataset/omi-aura-no2-cloud-screened-total-and-tropospheric-column-l3-global-gridded-0-25-degree-x-)
- OMNO2d_004 has DOI 10.5067/AURA/OMI/DATA3407. It holds total and tropospheric NO2 for all-sky and for cloud fraction under 30% — [Earthdata OMNO2d_004](https://www.earthdata.nasa.gov/es/data/catalog/ges-disc-omno2d-004?page=4%2C0)
- GRACE-FO RL06.3 Level-3 fields are fully compatible with GRACE RL06. The JPL Tellus mascon uses a 0.5° grid — [data.gov JPL RL06.3](https://catalog-beta.data.gov/dataset/jpl-tellus-grace-fo-level-3-monthly-land-water-equivalent-thickness-surface-mass-anomal-04)
- The CSR GRACE-FO record starts 2018-05-22, which leaves a gap between GRACE and GRACE-FO — [PO.DAAC CSR RL06.3](https://podaac.jpl.nasa.gov/dataset/TELLUS_GRFO_L3_CSR_RL06.3_LND_v04)
- FIRMS area API:
  - URL pattern: `/api/area/csv/[MAP_KEY]/[SOURCE]/[west,south,east,north]/[DAY_RANGE]/[YYYY-MM-DD]`, with `DAY_RANGE` from 1 to 5.
  - Sources include MODIS_SP, MODIS_NRT and VIIRS_SNPP/NOAA20/NOAA21 _SP/_NRT, plus LANDSAT_NRT (US and Canada only).
  - A free MAP_KEY allows 5,000 transactions per 10 minutes.
  - [FIRMS area API](https://firms.modaps.eosdis.nasa.gov/api/area/)

**Example requests**

NASA POWER (no login). Tested 2026-11-14: HTTP 200 in 0.54 s, 450 KB, 100 grid cells — [request](https://power.larc.nasa.gov/api/temporal/monthly/regional?latitude-min=42.5&latitude-max=47.1&longitude-min=-92.9&longitude-max=-86.8&parameters=T2M&community=ag&start=2002&end=2024&format=JSON)
```
https://power.larc.nasa.gov/api/temporal/monthly/regional?latitude-min=42.5&latitude-max=47.1&longitude-min=-92.9&longitude-max=-86.8&parameters=T2M&community=ag&start=2002&end=2025&format=JSON
```

earthaccess plus xarray for any NetCDF4/HDF5 monthly product (MERRA-2, GLDAS, NLDAS, IMERG). Library calls are as documented for earthaccess 0.x (see section 6); the snippet was not executed this session because no EDL credentials were available.
```python
import earthaccess, xarray as xr
earthaccess.login()  # reads ~/.netrc or EARTHDATA_USERNAME / EARTHDATA_PASSWORD
res = earthaccess.search_data(short_name="M2TMNXAER", version="5.12.4",
                              temporal=("2002-01-01", "2025-12-31"),
                              bounding_box=(-125, 24, -66, 50))
ds = xr.open_mfdataset(earthaccess.open(res), combine="by_coords")["TOTEXTTAU"]
ds = ds.sel(lat=slice(24, 50), lon=slice(-125, -66)).load()  # then mask/weight per state (section 4)
```
- The variable names `TOTEXTTAU` (MERRA-2 total aerosol extinction AOT at 550 nm), `T2M` (in M2TMNXSLV) and `precipitation` (IMERG) come from the product specs and were not verified this session. Check them with `ds.data_vars`.

FIRMS (free MAP_KEY). Daily counts for Wisconsin come in 5-day windows:
```
https://firms.modaps.eosdis.nasa.gov/api/area/csv/<MAP_KEY>/MODIS_SP/-92.9,42.5,-86.8,47.1/5/2023-06-01
```
Source: [FIRMS area API](https://firms.modaps.eosdis.nasa.gov/api/area/).

CMR "is there new data?" check (no login): `https://cmr.earthdata.nasa.gov/search/granules.json?collection_concept_id=<id>&sort_key=-start_date&page_size=1` — [example](https://cmr.earthdata.nasa.gov/search/granules.json?collection_concept_id=C1342986036-GES_DISC&sort_key=-start_date&page_size=1)

### Inferences
**Bytes to touch if whole global granules are downloaded for 2002–2025 (288 months).** Computed from the CMR granule sizes above:

| Product | Download volume | Practical? |
|---|---|---|
| MOD08_M3 or MYD08_M3 | about 108 GB | No. Needs OPeNDAP/Harmony subsetting, the Giovanni web UI, or a run near the data |
| AIRS3STM | about 58 GB | No (same options) |
| MOD13C2 | about 29 GB | Not on a laptop |
| M2TMNXAER | about 23 GB | Not on a laptop |
| GLDAS_NOAH025_M | about 6.7 GB | Yes |
| IMERG monthly | about 5 GB | Yes |
| NLDAS monthly | about 3 GB | Yes |
| MOD10CM | about 0.6 GB | Yes |
| GRACE mascon | 44 MB (one file) | Yes |

- Daily products are the costliest:
  - MCD19A2CMG: about 8,700 days × 44 MB ≈ 380 GB.
  - SPL3SMP_E: 609 MB per day.
  - OMNO2d: about 8,000 days × 11 MB ≈ 88 GB.
- For these, use `xr.open_dataset` on `earthaccess.open()` file objects. Over HTTPS that reads only the chunks a lazy subset needs, which is far less than whole files.
- HDF4 products (MOD08/MYD08, MOD13C2, MOD10CM, MOD11C3) cannot be streamed through h5netcdf. They need a local download and GDAL/rioxarray or pyhdf. This is the main extra friction for MODIS.
- MODIS L3 monthly products have about 1 month of latency (October 2026 was published by mid-November). MERRA-2 runs about 2 months behind, NLDAS about 1 month, GLDAS-2.1 main about 4 months, and GRACE about 2 months. All are fine for a 2001–2025 demo.

### Gaps
- I could not measure OPeNDAP or Harmony subset response times without EDL credentials. The per-request seconds for a single-state subset are unmeasured.
- The exact MOD08_M3 C6.1 SDS name for the combined DT/DB AOD mean was not confirmed in a file (see the GEE and ICDC sources above).
- I did not confirm the AIRS3STM 1° grid, SPL3SMP_E 9 km grid, AERDB_M3 grid or IMERG monthly units (mm/hr vs mm/day) from a primary page this session.
- TROPOMI (S5P) NO2: I did not check a gridded L3 NO2 product at GES DISC this session. OMNO2d v004 stays the simplest daily-gridded NO2 option.

## 2. MODIS AOD: getting a state-average monthly series, and Giovanni in 2026

### Takeaway
The fastest faithful copy of the challenge video (Wisconsin monthly MODIS Aqua AOD since 2002) is the Giovanni web UI "Time Series, Area-Averaged" plot on MYD08_M3 v6.1, exported as CSV for a fixed list of states. Giovanni was still operating in November 2026. Its programmatic time-series API is reported to be point-only, so it cannot produce state means. For code-driven series, download or subset MYD08_M3 (1°, 375 MB HDF4 per month) or the daily MCD19A2CMG (0.05°) once and precompute state means. MERRA-2 TOTEXTTAU (NetCDF4, gap-free) is the low-friction fallback.

### Cited Findings
- Giovanni was live in November 2026: a GES DISC alert dated 2026-11-02 announced a maintenance outage on Wednesday 2026-11-04 from 19:00 UTC — [GES DISC alerts](https://disc.gsfc.nasa.gov/information/alerts) (via search summary; a direct fetch returned only the page shell)
- The newest Giovanni release found is 4.34, which redesigned how users pick among 22 visualization types — [GES DISC service release 4.34](https://disc.gsfc.nasa.gov/information/service-release?title=Giovanni+Release+4.34+Features+a+New+Look+to+Choosing+a+Data+Visualization)
- In April 2026 GES DISC finished migrating 34 MERRA-2 collections to Earthdata Cloud, and Giovanni variables from them came back — [Earthdata alert: Giovanni MERRA-2 maintenance completed](https://www.earthdata.nasa.gov/data/alerts-outages/giovanni-system-maintenance-merra-2-variables-has-been-completed)
- The Giovanni user guide (version 2024.1) documents an "Area-Averaged Time Series" plot type — [Giovanni User Guide](https://giovanni.gsfc.nasa.gov/giovanni/doc/UsersManualworkingdocument.docx.html)
- On the Earthdata Forum, GES DISC staff said the Giovanni time-series API "will only work with single points". It returns neither area-averaged series nor spatial subsets, and they pointed users to a harmony-py subsetting tutorial instead — [Earthdata Forum thread](https://forum.earthdata.nasa.gov/viewtopic.php?t=7628) (search snippet; the thread URL returned 404 when fetched on 2026-11-14)
- Harmony documentation lists a `giovanni-averaging-service` that averages Zarr data over chosen dimensions, and says an area-averaged time series is produced as CSV. How to call it for a given collection is not documented there — [Harmony docs](https://harmony.earthdata.nasa.gov/docs)
- MYD08_M3 v6.1 and MOD08_M3 v6.1 run 2002-07 and 2000-02 respectively through October 2026, with granules of about 375 MB — [CMR MYD08_M3 latest](https://cmr.earthdata.nasa.gov/search/granules.json?collection_concept_id=C1443775657-LAADS&sort_key=-start_date&page_size=1)
- MCD19A2CMG (daily, 0.05°, Terra+Aqua MAIAC) is current to 2026-11-13 — [CMR MCD19A2CMG latest](https://cmr.earthdata.nasa.gov/search/granules.json?collection_concept_id=C2565807733-LPCLOUD&sort_key=-start_date&page_size=1)
- Aerosol continuity after MODIS is VIIRS-only:
  - Deep Blue (AERDB) L2/L3 daily and monthly from SNPP and NOAA-20.
  - Dark Target (AERDT) is L2 only, and no Aqua-MODIS AERDT continuity product is made.
  - [LAADS MODIS-to-VIIRS transition](https://ladsweb.modaps.eosdis.nasa.gov/learn/modis-to-viirs-transition)
- AERDB_M3_VIIRS_SNPP v2.1 is in CMR from 2012-03 to 2026-10 — [CMR AERDB_M3 latest](https://cmr.earthdata.nasa.gov/search/granules.json?collection_concept_id=C4218022437-LAADS&sort_key=-start_date&page_size=1)
- AppEEARS supports area tasks through its API (task type `area` with a polygon). Its time-series statistics graphs are a GUI feature, and I found no API documentation for fetching statistics directly — [earthpy AppEEARS wrapper](https://www.github.com/earthlab/earthpy/blob/20e0b17e563da17ba46dc32832cf4ed9173a7531/earthpy/appeears.py), [Earthdata AppEEARS article](https://www.earthdata.nasa.gov/learn/articles/appeears-data-tool-focus)

### Inferences
- At 1°, Wisconsin covers about 30 grid cells. Small states (RI, DE, CT) cover 0–2 cell centres, so the 1° MOD08 series is coarse but matches what the challenge video does.
- For weekly smoke spikes (for example the June 2023 smoke episode from the challenge brief), the daily 0.05° MCD19A2CMG is the right product. State means can be precomputed with `resample("W")`.
- For the hackathon, three AOD routes, in order of preference:
  1. Giovanni UI exports (CSV) for the 50 states. This is manual, with roughly 1–3 min per state from my experience of Giovanni, not measured.
  2. A one-off earthaccess download of 288 MYD08_M3 files (about 108 GB). Too heavy; prefer route 3 or subset with Harmony or OPeNDAP if available.
  3. MERRA-2 M2TMNXAER TOTEXTTAU (288 × 80 MB, NetCDF4, streamable). It is model-plus-assimilation, not pure MODIS, and the app already uses MERRA-2 for PM2.5.

### Gaps
- I could not confirm whether Giovanni offers US-state shapefile masks ("Shape" selector) in v4.34 this session. From memory it does, but this is unverified.
- I could not confirm whether `giovanni-averaging-service` in Harmony is enabled for MYD08_M3 or MCD19A2CMG, or how long a request takes.
- I did not confirm whether LAADS still offers OPeNDAP for MOD08_M3 after the cloud migration.

## 3. NASA POWER: endpoints, limits and parameters (verified by live calls)

### Takeaway
POWER can produce live state-level series with no login. Its regional endpoint returns the native MERRA-2 0.5°×0.625° grid for a bounding box of **at least 2° and at most 10° on each axis**, **one parameter per regional request**, and **at most 366 days per daily request**. A whole-Wisconsin monthly series for 2002–2024 came back in 0.54 s. Monthly data run through 2025, including an annual value coded as month "13". GWETROOT (root-zone soil wetness) and FROST_DAYS both exist as monthly parameters.

### Cited Findings
- Endpoints:
  - `/api/temporal/{hourly,daily,monthly,climatology}/{point,regional}`
  - Application APIs: `/api/application/indicators` and `/api/application/windrose`
  - OpenAPI specs at `/api/temporal/monthly/openapi.json`, etc.
  - [POWER llms.txt](https://power.larc.nasa.gov/llms.txt)
- Monthly API title and version: "POWER Monthly and Annual API" v2.10.0. `start`/`end` are YYYY. Communities are `ag`, `hy`, `sb`, `re`. `time-standard` is `lst` (default) or `utc` — [monthly openapi.json](https://power.larc.nasa.gov/api/temporal/monthly/openapi.json)
- The climatology API is v2.10.1. Its header reads "25-year Meteorological and Solar Monthly & Annual Climatologies (January 2001 - December 2025)". Point T2M at Madison returned JAN … DEC plus ANN in 0.26 s — [climatology point test](https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=T2M&community=ag&longitude=-89.4&latitude=43.07&format=JSON)
- Point requests take up to 20 parameters. "Regional requests are limited to one parameter." — [POWER daily docs](https://power.larc.nasa.gov/docs/services/api/temporal/daily/), [POWER monthly docs](https://power.larc.nasa.gov/docs/services/api/temporal/monthly/)
- Bounding-box limits, from live 422 errors on 2026-11-14:
  - CONUS box: "Please provide a maximum of 10 degree range in latitude." / "...longitude." — [request](https://power.larc.nasa.gov/api/temporal/monthly/regional?latitude-min=24&latitude-max=50&longitude-min=-125&longitude-max=-66&parameters=T2M&community=ag&start=2020&end=2020&format=JSON)
  - 1°×1° box: "Please provide at least a 2 degree range in latitude; otherwise use the point endpoint." — [request](https://power.larc.nasa.gov/api/temporal/monthly/regional?latitude-min=43&latitude-max=44&longitude-min=-90&longitude-max=-89&parameters=T2M&community=ag&start=2020&end=2020&format=JSON)
- Daily regional limit, from a live 422 error: "Please do not request a time period greater than 366 days." A 1-year daily regional request for Wisconsin (PRECTOTCORR, 2024) took 0.52 s and returned 590 KB for 100 cells — [request](https://power.larc.nasa.gov/api/temporal/daily/regional?latitude-min=42.5&latitude-max=47.1&longitude-min=-92.9&longitude-max=-86.8&parameters=PRECTOTCORR&community=ag&start=20240101&end=20241231&format=JSON)
- Monthly regional, Wisconsin box, 2002–2024, T2M:
  - HTTP 200 in 0.54 s, 450 KB GeoJSON FeatureCollection with 100 points.
  - Longitude step 0.625°, latitude step 0.5°.
  - `header.sources = ["MERRA2"]`.
  - Keys run `YYYYMM` plus `YYYY13` (annual).
  - [request](https://power.larc.nasa.gov/api/temporal/monthly/regional?latitude-min=42.5&latitude-max=47.1&longitude-min=-92.9&longitude-max=-86.8&parameters=T2M&community=ag&start=2002&end=2024&format=JSON)
- Monthly point parameter check (Madison, 2024–2025), all HTTP 200 in 0.18–0.30 s with values through 202512 and 202513:
  - GWETROOT (0–1): 2025 annual 0.63.
  - FROST_DAYS (days per month): Dec 2025 = 30, 2025 annual = 146.
  - PRECTOTCORR, RH2M, WS2M, T2M_MAX.
  - ALLSKY_SFC_SW_DWN: 2025 annual 13.84 with community=ag. That looks like MJ/m²/day; units differ by community (not verified this session).
  - [example request](https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=FROST_DAYS&community=ag&longitude=-89.4&latitude=43.07&start=2024&end=2025&format=JSON)
- POWER has 300+ parameters (searchable at power.larc.nasa.gov/parameters/). Latency is "2 to 7 days depending on source provider". Coverage: meteorology 1981 to present, radiation 1984 to present — [POWER llms.txt](https://power.larc.nasa.gov/llms.txt)
- 429 "Too Many Requests" exists, with no published threshold. The daily docs warn that repeatedly requesting the same location "will potentially be blocked" — [POWER API overview](https://power.larc.nasa.gov/docs/services/api/), [POWER daily docs](https://power.larc.nasa.gov/docs/services/api/temporal/daily/)
- Monthly PRECTOTCORR is a mean rate in mm/day, not a monthly total. This comes from a third-party wrapper description, not NASA docs, so verify it — [fastcrw nasapower](https://fastcrw.com/pergamon/nasapower)

### Inferences
- Because POWER's header lists MERRA-2 as the source, POWER T2M, GWETROOT and so on are MERRA-2 values on the MERRA-2 grid. Regional POWER is effectively a no-login, fast MERRA-2 subsetter for single variables.
- States wider than 10° (TX about 13° lon × 10.7° lat, CA about 10.4°, MT about 12° lon, AK, and probably NV and OR, not checked) need 2–4 tiled requests. Small states under 2° (RI, DE, CT, DC, HI islands) must use a padded 2°×2° box and then mask to the polygon.
- A full 2002–2025 daily series (for weekly aggregation) is 24 sequential 366-day calls of about 0.5 s each, so about 12 s for one state and one variable. That is near the 10 s budget. Run calls in parallel (4–6 at once) or precompute and cache in Supabase.

### Gaps
- No official numeric request-rate limit was found.
- I did not verify the exact FROST_DAYS definition (threshold) or GWETROOT layer depth from a NASA page (a forum thread describes it as roughly the top 1 m).

## 4. Area averaging over US states and counties

### Takeaway
Use the Census 2024 cartographic boundary shapefiles: `cb_2024_us_state_20m.zip` (188 KB) or `_500k` (3.2 MB) for states, and the `county` equivalents. Mask grid cells whose centres fall inside the polygon (regionmask or a shapely point-in-polygon test), then take an xarray `.weighted()` mean with cos(latitude) weights. All four files were confirmed downloadable.

### Cited Findings
- HTTP 200 checks on 2026-11-14 for the 2024 cartographic boundary files:
  - States: [cb_2024_us_state_20m.zip](https://www2.census.gov/geo/tiger/GENZ2024/shp/cb_2024_us_state_20m.zip) (187,671 bytes), [cb_2024_us_state_500k.zip](https://www2.census.gov/geo/tiger/GENZ2024/shp/cb_2024_us_state_500k.zip) (3.24 MB)
  - Counties: [cb_2024_us_county_20m.zip](https://www2.census.gov/geo/tiger/GENZ2024/shp/cb_2024_us_county_20m.zip) (0.90 MB), [cb_2024_us_county_500k.zip](https://www2.census.gov/geo/tiger/GENZ2024/shp/cb_2024_us_county_500k.zip) (11.6 MB)
- The files are made for small-scale thematic mapping. DC, Puerto Rico and the Island Areas are treated as state equivalents. Formats are shapefile, geodatabase and KML, plus GeoPackage from 2024. The license is public domain — [data.gov 2024 CB state 1:20M](https://catalog.data.gov/dataset/2024-cartographic-boundary-file-shp-state-and-equivalent-entities-for-united-states-1-2000)
- Area-weighted averaging on a lat-lon grid uses cos(latitude) weights with `DataArray.weighted(...).mean(...)` — [xarray area-weighted example](https://docs.xarray.dev/en/stable/examples/area_weighted_temperature.html) (URL from prior knowledge, not fetched this session)
- regionmask turns a GeoDataFrame into regions (`regionmask.from_geopandas`) and builds 2D or 3D boolean masks for xarray grids — [regionmask docs](https://regionmask.readthedocs.io/en/stable/) (prior knowledge, not fetched this session)

Snippet (works for POWER regional JSON or any xarray grid):
```python
import geopandas as gpd, numpy as np, xarray as xr, regionmask
states = gpd.read_file("https://www2.census.gov/geo/tiger/GENZ2024/shp/cb_2024_us_state_20m.zip")
regions = regionmask.from_geopandas(states, names="NAME", abbrevs="STUSPS", overwrite=True)
mask3d = regions.mask_3D(da)                    # da: DataArray with lat/lon (lon in -180..180)
w = np.cos(np.deg2rad(da.lat))
state_means = da.where(mask3d).weighted(w).mean(("lat", "lon"))   # dims: region x time
```

### Inferences
- Centre-in-polygon masking leaves very small states empty on 1° grids (MOD08_M3, AIRS). Fall back to the nearest cell, or use fractional-overlap masks: regionmask has an approximate-fraction mask function in recent versions (not verified this session), and `exactextract` is another option.
- On 0.05° CMG grids (MOD13C2, MOD10CM, MCD19A2CMG, MOD11C3) every state and most counties get many cells. Counties are realistic only on grids of 0.125° or finer.
- cos-lat weighting changes CONUS-scale means only slightly but is cheap and correct. Inside a single state it barely matters, though large states (MT, TX, AK) see a small effect.
- Also apply the product's own QA and fill values before averaging, and record the number of valid cells per month. AOD and NDVI have cloud and snow gaps, so months with very low coverage should be flagged in the chart.

### Gaps
- I did not test regionmask against the CB files or measure masking runtime (expected to take seconds).

## 5. Live per request (<10 s) vs precompute

### Takeaway
**Live:**
- NASA POWER monthly regional: 1–4 calls per state-variable, under 1 s each, measured.
- POWER climatology: under 0.3 s.
- GRACE: a single 44 MB file, loaded once at startup.

**Precompute once, store state × month (and state × week) rows in Supabase:**
- MODIS AOD, NDVI, snow, LST; IMERG; GLDAS/NLDAS; MERRA-2 direct; OMI NO2; AIRS; SMAP.
- FIRMS: 5-day windows mean about 1,750 calls for 2002–2025.

POWER daily over 24 years (24 calls) sits at the edge of the budget. Cache it after the first request.

### Cited Findings
- POWER monthly regional, Wisconsin 2002–2024: 0.54 s / 450 KB. Daily regional, 1 year: 0.52 s / 590 KB. Climatology point: 0.26 s — [monthly test](https://power.larc.nasa.gov/api/temporal/monthly/regional?latitude-min=42.5&latitude-max=47.1&longitude-min=-92.9&longitude-max=-86.8&parameters=T2M&community=ag&start=2002&end=2024&format=JSON), [daily test](https://power.larc.nasa.gov/api/temporal/daily/regional?latitude-min=42.5&latitude-max=47.1&longitude-min=-92.9&longitude-max=-86.8&parameters=PRECTOTCORR&community=ag&start=20240101&end=20241231&format=JSON)
- Daily regional requests are capped at 366 days — [same daily test with 2002–2024 range returned 422](https://power.larc.nasa.gov/api/temporal/daily/regional?latitude-min=42.5&latitude-max=47.1&longitude-min=-92.9&longitude-max=-86.8&parameters=PRECTOTCORR&community=ag&start=20020101&end=20241231&format=JSON)
- FIRMS allows 1–5 days per area query and 5,000 transactions per 10 minutes. Larger requests count as several transactions — [FIRMS area API](https://firms.modaps.eosdis.nasa.gov/api/area/)
- Earthdata granule sizes run from 2 MB (MOD10CM) to 375 MB (MOD08_M3) and 609 MB (SPL3SMP_E) per granule, with 288 monthly granules per 24 years — [CMR granule queries in section 1](https://cmr.earthdata.nasa.gov/search/granules.json?collection_concept_id=C1443766359-LAADS&sort_key=-start_date&page_size=1)
- The Giovanni API is point-only, so it cannot serve live state means — [Earthdata Forum](https://forum.earthdata.nasa.gov/viewtopic.php?t=7628)
- AppEEARS area tasks are asynchronous jobs submitted to a task endpoint — [earthpy AppEEARS wrapper](https://www.github.com/earthlab/earthpy/blob/20e0b17e563da17ba46dc32832cf4ed9173a7531/earthpy/appeears.py)

### Inferences
- Precompute size is trivial. 50 states + DC × 288 months × 6 variables ≈ 88k rows. Adding weekly rows for 3 daily variables (about 1,250 weeks) gives ≈ 190k rows. That fits easily in the existing Supabase cache.
- Suggested pipeline: one batch script per product (earthaccess → xarray → regionmask → weighted mean) writes `(var, region, period_type, period_start, value, n_valid)`. The FastAPI endpoint then only reads rows and runs the trend test.
- Weekly from daily: `series.resample("W-MON").mean()` (or `.sum()` for precipitation and fire counts). Daily sources suitable for weekly:
  - POWER daily: T2M, PRECTOTCORR, GWETROOT.
  - IMERG daily: Final to 2025-09, then Late.
  - MCD19A2CMG daily AOD.
  - OMNO2d daily NO2.
  - FIRMS daily detections.
- AppEEARS is too slow and asynchronous (minutes or more, inferred) for per-request use, but it is a valid no-code way to precompute MODIS NDVI/LST/AOD state statistics with GeoJSON polygons.

### Gaps
- OPeNDAP, Harmony and AppEEARS turnaround times for a one-state 24-year subset were not measured, because no EDL credentials were available in this session.

## 6. 2025–2026 changes, retirements and status flags

### Takeaway
As of mid-November 2026, Aqua and Terra MODIS **were still producing data**: Aqua MODIS L2 NRT files exist for 2026-11-12 and 11-13 despite the planned 2026-08-26 Aqua instrument shutdown. Both orbits are drifting, which matters for trends in afternoon or morning products such as LST and AOD.

Other changes:
- **OMI:** Aura/OMI continues. OMNO2d Collection 3 (v003) stopped at 2026-03-15, so use v004.
- **IMERG:** Final V07 in CMR ends at 2025-09-30, while Late V07C is current.
- **GES DISC servers:** on-prem data servers and the L3/4 Regridder are being retired in favour of Earthdata Cloud. Giovanni is alive (v4.34).
- **POWER:** API v2.10.x.
- **earthaccess:** latest found is v0.18.0 (2026-05-12); the repo moved to the earthaccess-dev org.

### Cited Findings
- **Aqua still operating:**
  - The OB.DAAC directory for 2026-11-12 lists 288 distinct Aqua MODIS L2 NRT granule times (for example `AQUA_MODIS.20261112T000000.L2.OC.NRT.nc`) — [OB.DAAC Aqua-MODIS 12-Nov-2026](https://oceandata.sci.gsfc.nasa.gov/directdataaccess/Level-2/Aqua-MODIS/2026/12-Nov-2026/)
  - Day folders exist through 15-Nov-2026 for Aqua and 14-Nov-2026 for Terra — [OB.DAAC Aqua 2026](https://oceandata.sci.gsfc.nasa.gov/directdataaccess/Level-2/Aqua-MODIS/2026/), [OB.DAAC Terra 2026](https://oceandata.sci.gsfc.nasa.gov/directdataaccess/Level-2/Terra-MODIS/2026/)
  - MYD08_M3 and AIRS3STM both have October 2026 monthly granules — [CMR MYD08_M3](https://cmr.earthdata.nasa.gov/search/granules.json?collection_concept_id=C1443775657-LAADS&sort_key=-start_date&page_size=1), [CMR AIRS3STM](https://cmr.earthdata.nasa.gov/search/granules.json?collection_concept_id=C1701805662-GES_DISC&sort_key=-start_date&page_size=1)
- **Planned end dates (conflicting):**
  - The NASA April 2025 plan: stop Aqua MODIS science collection around August 2026 and Terra MODIS around January 2027 — [LAADS MODIS-VIIRS Transition PDF (2025-04-18)](https://ladsweb.modaps.eosdis.nasa.gov/learn/modis-to-viirs-transition/MODIS-VIIRS_Transition.pdf)
  - The Aqua status PDF projects instrument shutdown on 2026-08-26 and passivation on 2026-11-04. Earlier versions said 2026-07-22 and 09-30 — [Aqua status PDF](https://aqua.gsfc.nasa.gov/sites/default/files/AquaStatus.pdf), [Aqua status Feb 2025](https://aqua.gsfc.nasa.gov/sites/default/files/AquaStatus_February2025.pdf)
  - Wikipedia: "By June 2026, they were predicting it would operate into September" — [Wikipedia Aqua](https://en.wikipedia.org/wiki/Aqua_(satellite))
  - A Copernicus CAMS article gives about September 2027 for Aqua — [CAMS: Drifting away from MODIS](https://atmosphere.copernicus.eu/drifting-away-modis-cams-global-fire-assimilation-system)
  - Earthdata says the platforms "will begin shutting down operations in late 2026 or early 2027" — [Earthdata MODIS→VIIRS alert](https://www.earthdata.nasa.gov/data/alerts-outages/transition-from-modis-viirs)
- **Orbit drift and data quality:**
  - Aqua's mean local crossing time is projected to reach about 15:50 by August 2026.
  - Terra's descending node is moving from 10:30 toward about 08:30 by late 2026, and its altitude from 715 to about 702 km.
  - Gridded MODIS Land products are expected to stay mostly science quality.
  - A final MODIS v8.0 calibration and reprocessing is planned after operations end.
  - [MODIS Land news](https://modis-land.gsfc.nasa.gov/news.html), [Terra drift AGU poster](https://ntrs.nasa.gov/api/citations/20250000522/downloads/AGU24_Terra_25years_MODIS_geometry_poster_GLin.pdf)
- **Aura/OMI:**
  - Daily yaw manoeuvres since July 2026 keep the solar view as in the original mission until about August 2027. The OMI team is adjusting retrievals for the changing beta angle — [NASA Aura update, Sept 2026](https://science.nasa.gov/?p=420515)
  - The earlier projection that power would limit the mission by mid-2026 is superseded — [NASA Aura potential evolution, May 2025](https://science.nasa.gov/missions/potential-evolution-of-the-aura-mission)
  - The FY2026 budget proposal sought to end Aura early. In early 2026 NASA was seeking partners for Aura, Aqua and Terra operations (secondary source) — [TerraDaily](https://www.terradaily.com/reports/NASA_Earth_science_faces_rollback_as_Mission_to_Planet_Earth_era_winds_down_999.html)
- **OMI Collection 4:** switch-over alert dated 2026-02-17 — [Earthdata alert](https://www.earthdata.nasa.gov/data/alerts-outages/omi-data-users-switch-collection-4). OMNO2d v003 ends at 2026-03-15 and v004 is current to 2026-11-12 — [CMR v003](https://cmr.earthdata.nasa.gov/search/granules.json?collection_concept_id=C1266136111-GES_DISC&sort_key=-start_date&page_size=1), [CMR v004](https://cmr.earthdata.nasa.gov/search/granules.json?collection_concept_id=C3333493715-GES_DISC&sort_key=-start_date&page_size=1)
- **IMERG:** Final V07B ends at 2025-09-30 (half-hourly, daily and monthly), while Late V07C runs to 2026-11-13/14 — [CMR GPM_3IMERGDF](https://cmr.earthdata.nasa.gov/search/granules.json?collection_concept_id=C2723754864-GES_DISC&sort_key=-start_date&page_size=1), [CMR GPM_3IMERGDL](https://cmr.earthdata.nasa.gov/search/granules.json?collection_concept_id=C2723754859-GES_DISC&sort_key=-start_date&page_size=1)
- **GES DISC infrastructure:** access to on-prem data servers is to be discontinued no earlier than 2026-09-30. The L3/4 Regridder/Subsetter is to be shut down no earlier than 2026-09-15. OPeNDAP is moving to Earthdata Cloud. S-NPP product delivery at GES DISC ends in early November 2026 (Nov 1 or Nov 2 depending on the page) — [GES DISC alerts](https://disc.gsfc.nasa.gov/information/alerts) (via search summary)
- **POWER versions:** Monthly API v2.10.0 and Climatology API v2.10.1, from live response headers — [monthly openapi.json](https://power.larc.nasa.gov/api/temporal/monthly/openapi.json)
- **earthaccess:**
  - Latest release found: v0.18.0, 2026-05-12 — [ecosyste.ms earthaccess](https://ost.ecosyste.ms/api/v1/projects/64195), [PyPI earthaccess](https://pypi.org/project/earthaccess)
  - The repo moved to the community GitHub org `earthaccess-dev` in March 2026, and the minimum Python is reported as 3.12 (sources disagree) — [relatedrepos earthaccess](https://relatedrepos.com/gh/earthaccess-dev/earthaccess)
- **MOD13A3:** v6 was decommissioned on 2023-07-31; use v6.1 — [Earthdata Forum](https://forum.earthdata.nasa.gov/viewtopic.php?p=11172)

### Inferences
- **Existing app data:**
  - The OMI NO2 monthly 2005–2025 series is unaffected for 2005–2025 whichever collection was used. Any future extension should use OMNO2d v004, and mixing v003 and v004 in one trend should be avoided.
  - The IMERG "2001–2025" period needs Late-run (or GLDAS/POWER) values for Oct–Dec 2025, or the period should end at 2025-09. The data-access-friendly choice is POWER PRECTOTCORR.
- **For 2002–2025 trends:** MODIS end-of-mission does not truncate the window. Drift-induced overpass-time changes (mostly after about 2022 for Terra) can create artificial trends in LST and, to a lesser degree, AOD. Mention this as a caveat in the UI, or prefer Aqua for 2002–2022.

### Gaps
- No primary NASA notice confirmed why Aqua kept operating past 2026-08-26 or what the new end date is. Only the presence of fresh data, the Wikipedia June 2026 note and the CAMS article support continued operation.
- No source explained why IMERG Final V07 stops at September 2025 (a possible V08 transition or a GPCP gauge delay is speculation).
- No AIRS-specific 2026 status page was found. AIRS rides on Aqua, so it presumably shares Aqua's fate, and its October 2026 L3 exists.

## 7. Ranked recommendation: 4–6 additional variables for monthly/weekly trends, seasons and disasters (hackathon effort)

### Takeaway
Ranked by demo value per hour of work:
1. **MODIS AOD state mean** (the challenge's own example).
2. **Root-zone soil wetness (POWER GWETROOT)**, live.
3. **NDVI (MOD13C2)**, for seasons and green-up.
4. **Snow cover (MOD10CM)**, tiny files.
5. **Precipitation as a regional state mean** (POWER PRECTOTCORR live; IMERG optional).
6. **GRACE/GRACE-FO water storage** (one file) or **FROST_DAYS / T2M_MAX** heat and cold extremes (POWER, live).

### Cited Findings
- AOD: MYD08_M3/MOD08_M3 v6.1 monthly 1°, 2002/2000–2026-10. MCD19A2CMG daily 0.05° for weekly smoke. The Giovanni web UI area-averaged time series is the zero-code route — [CMR MYD08_M3](https://cmr.earthdata.nasa.gov/search/granules.json?collection_concept_id=C1443775657-LAADS&sort_key=-start_date&page_size=1), [Earthdata MCD19A2CMG](https://www.earthdata.nasa.gov/data/catalog/lpcloud-mcd19a2cmg-061), [Giovanni User Guide](https://giovanni.gsfc.nasa.gov/giovanni/doc/UsersManualworkingdocument.docx.html)
- GWETROOT is available monthly through 2025 via POWER, with a 2025 annual value. Regional calls run under 1 s with no login — [POWER test](https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=GWETROOT&community=ag&longitude=-89.4&latitude=43.07&start=2024&end=2025&format=JSON)
- MOD13C2 v061 monthly 0.05° NDVI/EVI runs 2000-02 to 2026-10 at about 100 MB per month. VNP13C2 provides VIIRS continuity from 2012 — [Earthdata MOD13C2](https://earthdata.nasa.gov/data/catalog/lpcloud-mod13c2-061), [CMR VNP13C2](https://cmr.earthdata.nasa.gov/search/granules.json?collection_concept_id=C2631828311-LPCLOUD&sort_key=-start_date&page_size=1)
- MOD10CM v61 monthly snow-cover CMG is 2 MB per month, 2000-03 to 2026-10 — [CMR MOD10CM](https://cmr.earthdata.nasa.gov/search/granules.json?collection_concept_id=C3050353608-NSIDC_CPRD&sort_key=-start_date&page_size=1)
- POWER PRECTOTCORR is available regionally (daily, at most 366 days per call; monthly, one call). IMERG Final V07 is 0.1° but ends 2025-09 in CMR — [POWER daily test](https://power.larc.nasa.gov/api/temporal/daily/regional?latitude-min=42.5&latitude-max=47.1&longitude-min=-92.9&longitude-max=-86.8&parameters=PRECTOTCORR&community=ag&start=20240101&end=20241231&format=JSON), [CMR GPM_3IMERGM](https://cmr.earthdata.nasa.gov/search/granules.json?collection_concept_id=C2723754851-GES_DISC&sort_key=-start_date&page_size=1)
- The GRACE/GRACE-FO JPL mascon RL06.3 v04 is a single 44 MB file covering 2002-04 to 2026-09 on a 0.5° grid — [CMR GRACE mascon](https://cmr.earthdata.nasa.gov/search/granules.json?collection_concept_id=C3195527175-POCLOUD&sort_key=-start_date&page_size=1), [data.gov JPL RL06.3](https://catalog-beta.data.gov/dataset/jpl-tellus-grace-fo-level-3-monthly-land-water-equivalent-thickness-surface-mass-anomal-04)
- FROST_DAYS returns monthly day counts (Madison: Dec 2025 = 30, 2025 annual = 146) — [POWER test](https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=FROST_DAYS&community=ag&longitude=-89.4&latitude=43.07&start=2024&end=2025&format=JSON)
- MOD11C3 v061 monthly 0.05° LST (to 2026-10) could extend the app's six-city LST to every state — [CMR MOD11C3](https://cmr.earthdata.nasa.gov/search/granules.json?collection_concept_id=C2565788897-LPCLOUD&sort_key=-start_date&page_size=1)

### Inferences
| Rank | Variable (product) | Shows best | Effort | Live or precompute |
|---|---|---|---|---|
| 1 | Aerosol optical depth, state mean (MYD08_M3 C6.1; fallback MERRA-2 TOTEXTTAU; weekly from MCD19A2CMG) | Smoke and wildfire disasters, the challenge's own Wisconsin example | Medium. HDF4 plus big files; Giovanni CSV for about 10 demo states is quickest | Precompute |
| 2 | Root-zone soil wetness (POWER GWETROOT; alternative GLDAS/NLDAS SoilMoi) | Droughts, seasonal dry-down | Very low: same code path as the existing POWER usage plus a bbox and mask | Live |
| 3 | NDVI greenness (MOD13C2 v061) | Seasons, green-up timing, drought stress | Medium (HDF4, 29 GB total, or AppEEARS/Giovanni) | Precompute |
| 4 | Snow cover fraction (MOD10CM v61) | Strong seasonality, snow-drought years (northern states, West) | Low (0.6 GB total) | Precompute |
| 5 | Precipitation state mean (POWER PRECTOTCORR regional; IMERG daily/monthly as a satellite upgrade) | Floods and hurricanes (weekly), wet/dry seasons | Very low for POWER; medium for IMERG (2025-09 cutoff) | Live (POWER) / precompute (IMERG) |
| 6 | Terrestrial water storage (GRACE/GRACE-FO mascon) **or** FROST_DAYS / T2M_MAX extremes (POWER) | Long-term groundwater decline (large states); cold/heat season shifts | Low: one file / one API call | Load once / live |

- Upgrade path for existing data: switch OMI NO2 to OMNO2d v004 for any post-2025 work. Generalise the six-city LST to state means with MOD11C3, with a drift caveat. Convert FIRMS detections into state-week counts in the precompute job.
- Trend method (for the app's significance display): compute anomalies against the 2001–2025 monthly climatology (POWER's climatology endpoint even returns it), then run Mann-Kendall or Sen's slope on the anomalies, or a seasonal Mann-Kendall. This avoids the seasonal cycle swamping the trend. This is standard practice and was not researched here.

### Gaps
- Specific US disaster events for each variable (for example a drought year in GWETROOT, a hurricane in IMERG weekly) were not verified in this research. A separate disasters note exists in this folder.
- Effort estimates are judgment-based, not measured.
