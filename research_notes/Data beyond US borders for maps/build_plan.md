# Data beyond US borders: a North America build plan for the animated and trend maps

Research notes, 15 November 2026. Scope: what it takes to draw `/map` (TimeMap, TrendMap) and their time series over a North America box (land, neighbouring countries and ocean) using the pipeline's existing approach. No code was changed. Payload numbers marked **measured** come from running the app's own `tools.map_frames.frames()` on the built `data/pm25_monthly_global.nc` and `data/aod_monthly_us.nc` (scratch script, nothing written to the repo). Download sizes marked **HEAD** come from HTTP HEAD requests (no files downloaded).

## 1. The box and the display grid

### Takeaway
Use 10–72°N, 170–50°W on the MERRA-2 0.5° × 0.625° grid the app already paints: 125 × 193 = 24,125 cells, 4.8 times the lower-48 box. One grid for land and sea is affordable (0.87 MB gzipped for a full 25-year PM2.5 field), so a coarser ocean grid is not needed. Fires stay at 1°.

### Cited Findings
- The current maps crop to the lower 48, `BOX = {"lat": (24.0, 50.0), "lon": (-125.0, -66.0)}`, and `map_frames.py` imports that box — [trend_field.py](../../data_pipeline/tools/trend_field.py), [map_frames.py](../../data_pipeline/tools/map_frames.py)
- MERRA-2 grid: lat −90..90 by 0.5 (361 rows), lon −180..179.375 by 0.625 (576 columns). The AOD build already addresses it by row and column (`ROWS = (216, 324)`, `COLS = (0, 184)` for 18–72°N, 180–65°W) — [merra2_aod.py](../../data_pipeline/sources/merra2_aod.py)
- **Measured:** 10–72°N, 170–50°W on that grid is 125 rows × 193 columns = **24,125 cells** (rows 200–324, columns 16–208). Coarsened 2 × 2 to 1° × 1.25° it is 62 × 96 = 5,952 cells. The built PM2.5 file covers the whole globe (361 × 576 × 300 months), so this cut needs no download — [pm25_merra2.py](../../data_pipeline/sources/pm25_merra2.py)
- **Measured:** inside that box, the existing `us_mask` keeps 3,565 cells (the lower 48 plus Alaska and Hawaii, which the box now contains); the lower-48 box had about 2,814 — [map_motion_overlay.md](../Climatch%20map%20motion%20and%20charts%20review/map_motion_overlay.md)
- **Measured:** about half of the existing 18–72°N, 180–65°W box is land (MODIS land-only LST present in 50% of 0.5° × 0.6° blocks; 46% mostly land) — built `data/modis_lst_monthly_us.nc`
- Fires are counted per 1° cell because they are point counts, not a surface — [trend_field.py](../../data_pipeline/tools/trend_field.py). For the box that is 62 × 120 = 7,440 cells.

### Inferences
- 10°N takes in Mexico, Central America to northern Costa Rica, Cuba, Hispaniola, the Bahamas, Hawaii and the Gulf of Mexico. 72°N takes in all of Alaska's mainland and Canada south of the Arctic Archipelago. 50°W takes in Newfoundland and the Grand Banks. The Aleutians west of 170°W are cut; use 180°W (column 0, 209 columns) if they matter.
- One grid keeps `paint()`, `cellAt()` and `squareAt()` unchanged: they take any `lats`, `lons`, `dlat` and `dlon` from the JSON. A second, coarser ocean grid would need two overlays, two hover look-ups and a seam at the coast, to save about 0.6 MB gzipped per field (section 8). Not worth it.
- Mercator stretch grows: in `paint()` the row height is fixed by `lats.length * S * 1.3`, where 1.3 is the lower-48 Mercator-to-latitude ratio (Mercator span 0.58 rad over 26° = 0.454 rad). For 10–72°N the ratio is about 1.54 (Mercator span about 1.67 rad over 1.08 rad). Rows at 72°N are about 3.2 times taller on screen than rows at 10°N. Compute the ratio from `top` and `bottom` instead of the constant 1.3 so southern rows keep at least S pixels.

### Gaps
- The exact box is a product choice (for example 14°N if Central America is out of scope). Every number here scales with the cell count.

## 2. Minimal datasets and how each existing source extends to the box

### Takeaway
Most of the current records come from global products, so the work is mostly re-cutting. PM2.5 needs nothing new: its file is already global. AOD (plus dust and organic carbon), OMI NO₂, IMERG and GRACE need their row and column constants widened and a rebuild. HMS smoke needs only a re-rasterisation of the zips already cached. FIRMS needs Canada and Mexico country files, and that breaks the current `us_mask` unless it is fixed first. MODIS LST is the one to skip. New data is needed only for sea temperature (OISST monthly), and optionally air temperature over land and sea (MERRA-2 T2M), an ENSO series (Niño 3.4) and a country outline (Natural Earth).

### Cited Findings
- **PM2.5 (MERRA-2 M2TMNXAER):** built as a global monthly file `data/pm25_monthly_global.nc` (178 MB, 361 × 576 × 300). Only total PM2.5 is saved, from the GES DISC formula `DUSMASS25 + SSSMASS25 + BCSMASS + OCSMASS + SO4SMASS × 132.14/96.06` — [pm25_merra2.py](../../data_pipeline/sources/pm25_merra2.py)
- **AOD (TOTEXTTAU, same collection):** a US block (18–72°N, 180–65°W) is fetched through cloud OPeNDAP, about 80 kB a month, about 25 MB for the whole build, and saved as `aod_monthly_us.nc` (17 MB). Rebuild takes about 2 minutes — [merra2_aod.py](../../data_pipeline/sources/merra2_aod.py), [DATA_ADDITIONS.md](../../docs/DATA_ADDITIONS.md)
- **Dust and organic carbon:** `DUSMASS25` and `OCSMASS` are variables of the same M2TMNXAER files, but only the PM2.5 sum is kept on disk — [pm25_merra2.py](../../data_pipeline/sources/pm25_merra2.py)
- **OMI NO₂ (OMNO2d v004, 0.25°):** daily OPeNDAP blocks, `US_ROWS = (432, 647)`, `US_COLS = (0, 459)` (18.125–71.875°N, 179.875–65.125°W), about 0.4 MB a day, averaged to months with at least 5 valid days. The saved file is a US crop despite its name (`no2_monthly_global.nc`: 216 × 460 × 252, 78 MB). The docstring puts the time at an "untested estimate 1-3 min per year" — [no2_omi.py](../../data_pipeline/sources/no2_omi.py)
- **IMERG V07 (0.1°):** `ROWS = (1080, 1619)`, `COLS = (0, 1149)`, about 2.5 MB a month fetched, 134 MB file — [imerg.py](../../data_pipeline/sources/imerg.py), [DATA_ADDITIONS.md](../../docs/DATA_ADDITIONS.md)
- **GRACE/GRACE-FO mascon:** one global file (44 MB) is kept in `cache/grace/` and cropped by `BOX = dict(lat=slice(18, 72), lon=slice(-180, -65))`. The real resolution is the 3° mascon (about 300 km) — [grace.py](../../data_pipeline/sources/grace.py), [DATA_ADDITIONS.md](../../docs/DATA_ADDITIONS.md). `DATA_ADDITIONS.md` says the file grid is 0.25°, but the built `grace_lwe_us.nc` is 108 × 230 cells over 18.25–71.75°N, 179.75–65.25°W, which is a 0.5° grid (checked with xarray). Treat it as 0.5° when regridding.
- **MODIS MOD11C3 LST:** land only (no data over water), about 10 MB a month fetched, 190 MB at 0.1°, and Terra's orbit drift means trends stop at 2022 — [modis_lst_monthly.py](../../data_pipeline/sources/modis_lst_monthly.py), [DATA_ADDITIONS.md](../../docs/DATA_ADDITIONS.md)
- **HMS smoke:** rasterised onto a lower-48 grid `LAT = 24..50`, `LON = −125..−66.25`. The yearly zips (86 MB for 2005–2025) are kept in `cache/hms/`, so a rerun downloads nothing — [hms_smoke.py](../../data_pipeline/sources/hms_smoke.py). NOAA says the HMS analysis covers "North America, Hawaii, and the Caribbean" — [NOAA OSPO HMS](https://www.ospo.noaa.gov/products/land/hms.html)
- **FIRMS:** yearly country files, no login, URL pattern `.../data/country/modis/<YEAR>/modis_<YEAR>_<Country>.csv`. All parquet files in `data/fires/` are merged by `_load_all()` — [fires_firms.py](../../data_pipeline/sources/fires_firms.py). **HEAD:** `modis_2023_Canada.csv` 26.5 MB, `modis_2023_Mexico.csv` 6.0 MB, `modis_2023_Guatemala.csv` 0.74 MB, `Cuba` 0.88 MB, `Honduras` 0.99 MB. Canada 2005/2015/2019: 2.6/5.9/3.3 MB. Mexico 2005/2015/2019: 7.0/4.4/7.0 MB. VIIRS S-NPP 2023: Canada 140.6 MB, Mexico 26.1 MB.
- **The `us_mask` trap:** `us_mask` builds the US outline from "every cell with at least one FIRMS detection in the US-only country file", but it reads `_load_all()`, which merges every country parquet present — [trend_field.py](../../data_pipeline/tools/trend_field.py), [fires_firms.py](../../data_pipeline/sources/fires_firms.py)
- **Sea temperature (new):** NOAA PSL serves OISST v2.1 `sst.mon.mean.nc` (global 0.25° monthly, 2.247 GB, updated 2026-11-15) and `lsmask.oisst.nc` (4.157 MB) through THREDDS — [PSL THREDDS OISST catalog](https://psl.noaa.gov/thredds/catalog/Datasets/noaa.oisst.v2.highres/catalog.html). Data run from 1 September 1981, updated daily, and V2.1 has significant quality improvements from 1 January 2016 — [NCEI OISST](https://www.ncei.noaa.gov/products/optimum-interpolation-sst)
- **ERSST v5 (new, for ENSO only):** PSL serves `sst.mnmean.nc` (162.3 MB, global, updated 2026-11-03) — [PSL THREDDS ERSST v5 catalog](https://psl.noaa.gov/thredds/catalog/Datasets/noaa.ersst.v5/catalog.html)
- **Air temperature over land and sea (optional, new):** MERRA-2 M2TMNXSLV (tavgM_2d_slv_Nx, V5.12.4) is the monthly single-level collection with 2-m air temperature (T2M) and surface skin temperature (TS) in K, global, 1980 to present, about three weeks' latency — [Earthdata M2TMNXSLV](https://www.earthdata.nasa.gov/data/catalog/ges-disc-m2tmnxslv-5.12.4)

### Inferences
- **Minimal set for the maps the app already has (pm25, no2, fires, smoke_days, aod):** no new dataset. PM2.5 is a crop, AOD and NO₂ are rebuilds with wider constants, smoke is a re-rasterisation, and fires need two country files (Canada, Mexico).
- **Minimal set for the new stories:** OISST monthly for "Gulf of Mexico sea temperature", Canada's FIRMS file for "Canadian fire detections", and PSL's ready-made Niño 3.4 series for the ENSO strip. MERRA-2 T2M is only needed for a single land-and-sea temperature map.
- **Skip MODIS LST for North America:** it is land only, would cost about 3.6 GB of OPeNDAP transfer (about 10 MB × 1.2 × 300 months), has 2023+ drift, and MERRA-2 T2M covers land temperature on the display grid for about 30 MB.
- **Per-source change list** (constants and a new year folder):
  - AOD: `ROWS = (200, 324)`, `COLS = (16, 208)`. Add `DUSMASS25` and `OCSMASS` to the same `dap4.ce` for dust and organic carbon.
  - NO₂: `US_ROWS = (400, 647)`, `US_COLS = (40, 519)` (10.125–71.875°N, 169.875–50.125°W, 248 × 480).
  - IMERG: `ROWS = (1000, 1619)`, `COLS = (100, 1299)` (620 × 1200).
  - GRACE: `BOX = dict(lat=slice(10, 72), lon=slice(-170, -50))`. No download.
  - HMS: `LAT = np.arange(10, 72 + 1e-9, 0.5)`, `LON = -180 + 0.625 * np.arange(16, 209)`.
  - FIRMS: `python -m sources.fires_firms Canada Mexico`. This runs only **after** `us_mask` is switched to the Census outline; that switch is already recommended in item 3 of `map_motion_overlay.md`. Otherwise the US trend map silently grows into Canada and Mexico.
- **Resume trap:** every OPeNDAP builder skips a year whose `<x>_years/<x>_<year>.nc` exists, and `combine_years()` concatenates whatever is there. Widening ROWS and COLS without a new `YEARS_DIR` (for example `aod_years_na/`) and a new `OUT` name would mix grids or keep the old box.

### Gaps
- I did not confirm the MERRA-2 constants file (FRLAND/FROCEAN) for a land fraction on the exact grid. Section 6 uses OISST's mask instead.
- I did not verify whether HMS analysts outline the far north (Nunavut, northern Quebec) as consistently as the lower 48. NOAA's page says "North America" without detail.
- FIRMS has no single "North America" country file. Central American and Caribbean countries would be separate files (about 0.7–1 MB a year each).

## 3. Access, subsetting, caching and login

### Takeaway
Keep the pattern the repo already uses: `earthaccess.search_data` plus one DAP4 constraint per granule through cloud OPeNDAP for MERRA-2, OMI and IMERG. Harmony works but adds async jobs and buys nothing here. Use PSL THREDDS OPeNDAP through xarray for OISST and ERSST (no login), with ERDDAP griddap as a fallback. Keep per-year files for resuming and never store credentials in code.

### Cited Findings
- The OPeNDAP pattern already in use: `session.get(url + ".dap.nc4", params={"dap4.ce": "/TOTEXTTAU[0:1:0][r0:1:r1][c0:1:c1];/lat[...];/lon[...]"})`, read with h5py from memory, grid checked against the expected lat/lon before saving — [merra2_aod.py](../../data_pipeline/sources/merra2_aod.py). IMERG and MODIS reuse `dap_arrays` and `one_per_month` — [imerg.py](../../data_pipeline/sources/imerg.py), [modis_lst_monthly.py](../../data_pipeline/sources/modis_lst_monthly.py)
- Login: `earthaccess.login()` reads `EARTHDATA_TOKEN` or `EARTHDATA_USERNAME`/`PASSWORD` environment variables or `.netrc` first, and prompts last. The PM2.5 and NO₂ builders call `login(persist=True)` — [merra2_aod.py](../../data_pipeline/sources/merra2_aod.py), [pm25_merra2.py](../../data_pipeline/sources/pm25_merra2.py), [no2_omi.py](../../data_pipeline/sources/no2_omi.py). House rule: "Never log a token or a URL that contains one" (the pipeline's rules)
- Harmony OGC Coverages: `https://harmony.earthdata.nasa.gov/{collectionId}/ogc-api-coverages/1.0.0/{variable}/coverage/rangeset` with `subset=lon(...)&subset=lat(...)`. Auth is `.netrc` or an EDL bearer token. Requests run as jobs (`forceAsync=true` forces async), and jobs with many granules can auto-pause unless `skipPreview=true` — [Harmony docs](https://harmony.earthdata.nasa.gov/docs)
- M2TMNXAER is global (90°N–90°S, 180°W–180°E); GES DISC also offers its own subsetter — [Earthdata M2TMNXAER](https://www.earthdata.nasa.gov/es/data/catalog/ges-disc-m2tmnxaer-5.12.4)
- ERDDAP: monthly OISST v2.1 is mirrored as dataset `noaa_psl_2d74_d418_a6fb` ("OISST AVHRR-only … Global 0.25° | Monthly | 1981-present") — [NEFSC ERDDAP info](https://comet.nefsc.noaa.gov/erddap/info/noaa_psl_2d74_d418_a6fb/index.html). Daily OISST v2.1 is `ncdcOisst21Agg` on CoastWatch — [CoastWatch ERDDAP](https://coastwatch.pfeg.noaa.gov/erddap/griddap/ncdcOisst21Agg). The griddap pattern is `.../erddap/griddap/<datasetID>.<fileType>?<query>` — [UAF ERDDAP](https://upwell.pfeg.noaa.gov/erddap/griddap/noaa_psl_1151_06d6_0e60.html)
- PSL asks users to acknowledge it ("data provided by the NOAA PSL, Boulder, Colorado, USA") — [PSL OISST page](https://psl.noaa.gov/data/gridded/data.noaa.oisst.v2.highres.html)
- HMS, FIRMS country files and Natural Earth need no login — [hms_smoke.py](../../data_pipeline/sources/hms_smoke.py), [fires_firms.py](../../data_pipeline/sources/fires_firms.py), [Natural Earth terms](https://www.naturalearthdata.com/about/terms-of-use/)

### Inferences
- **OISST builder** (a new `sources/oisst.py` in the shape of `grace.py`):
  `xr.open_dataset("https://psl.noaa.gov/thredds/dodsC/Datasets/noaa.oisst.v2.highres/sst.mon.mean.nc").sst.sel(time=slice("2001","2025"), lat=slice(10, 72), lon=slice(190, 310))`
  - Fetch one year per request into `data/oisst_years/`, then combine. The lon is 0–360 on PSL files: convert with `((lon + 180) % 360) - 180` as `grace.py` does.
  - The block is 248 × 480 × 300 months, about 143 MB as float32 (about half if stored packed).
  - netCDF4 (already a dependency) handles the dodsC URL, so nothing new is installed.
- **ERSST / Niño 3.4:** read PSL's monthly Niño 3.4 text series (section 7) instead of building anything. If it must be computed, open `sst.mnmean.nc` the same way and `.sel` 5°S–5°N, 190–240°E.
- **Harmony:** not needed. The DAP4 pattern already gives "only the block I asked for" per granule, synchronously, with the grid check the team trusts. Harmony would add job polling and a second output format.
- **Login:** new builders should call `earthaccess.login()` without `persist=True`, as `merra2_aod.py` does. `persist=True` writes the credentials to `~/.netrc`; that is not code, but it leaves a password on disk.

### Gaps
- I did not check the dimension order and lon convention of the ERDDAP OISST mirror, or whether PSL's THREDDS caps OPeNDAP response sizes. Yearly requests (about 6 MB each) avoid any likely cap.
- I did not confirm that Harmony supports M2TMNXAER or OMNO2d variable subsetting.

## 4. Regridding everything to one display grid

### Takeaway
Bin finer grids into the 0.5° × 0.625° cells by cell-centre membership and take a cos-weighted (or plain) mean of the valid sub-cells, as `map_frames.annual('no2')` already does with its 2 × 2 block mean. No new dependency (no xESMF). Coarser or point data are handled as today: GRACE is repeated, HMS is rasterised at cell centres, FIRMS is counted per 1°.

### Cited Findings
- NO₂ 0.25° → 0.5° today: `reshape(..., 2, ..., 2)` and `np.nanmean` per 2 × 2 block — [map_frames.py](../../data_pipeline/tools/map_frames.py)
- MODIS 0.05° → 0.1°: `coarsen2`, a 2 × 2 mean of squares that have data, NaN where all four are empty — [modis_lst_monthly.py](../../data_pipeline/sources/modis_lst_monthly.py)
- HMS: a day counts when an outline covers the grid-square centre (`inside(rings, glon, glat)`) — [hms_smoke.py](../../data_pipeline/sources/hms_smoke.py)
- `us_mask` maps points to cells with `floor((lat - (lats[0] - dlat/2)) / dlat)` — [trend_field.py](../../data_pipeline/tools/trend_field.py)

### Inferences
- **One helper** for every source finer than the display grid (OMI 0.25°, OISST 0.25°, IMERG 0.1°; GRACE's 0.5° file also goes through it, because 0.625° columns don't line up with 0.5°):
  - `i = floor((lat - 9.75) / 0.5)` and `j = floor((lon + 170.3125) / 0.625)` for each source cell centre.
  - Then a NaN-skipping mean per `(i, j)` (`xarray.groupby` over a stacked index, or `np.add.at` sums and counts).
- 0.625° is 2.5 × 0.25°, so target columns alternately get 2 or 3 OISST/OMI columns. That is harmless for display. A cell's mean is then "mean of the 0.25° cells whose centre falls in it", which is how the NO₂ block mean already behaves.
- **Coast cells for SST:** a 0.5° cell that is part land gets the mean of its ocean sub-cells only (OISST land is NaN). That is right for "sea temperature" but must not be called the cell's average.
- **Fires:** keep 1° counts (`_annual_grid('fires')` with the North America box). A count per 1° cell is not comparable between 10°N and 70°N, because cell area shrinks by cos(lat), from 0.98 to 0.32 of the equatorial area. Either label it "per 1° square (smaller in the north)" or divide by cell area for a density.

### Gaps
- No source on conservative versus centre-binning differences for this display use. It is an inference that the difference is invisible at 7 colour classes.

## 5. Precomputing frames, change and averages (pipeline steps)

### Takeaway
`frames()` already does the right maths on any grid. It needs two small changes: the cells that are painted and the cells that are averaged for the line must be separate masks, and class edges should come from the cells that matter (land, or the US) so ocean cells don't reset the US colours. Everything else (shared level edges, change from the first 5 years, 3-year trailing means, cos-lat means) carries over.

### Cited Findings
- `frames(years, lats, lons, cube, inside, decimals, smooth, base)` masks the cube with `inside` first. `level_breaks` (`class_edges`, 7 equal-count classes) and `change_breaks` (40/70/90/97th percentiles of |change|) are computed over all masked cells, and `us_mean`/`us_change` are cos(lat)-weighted means of the same cells — [map_frames.py](../../data_pipeline/tools/map_frames.py), [analysis/timeline.py](../../data_pipeline/analysis/timeline.py)
- Fires and smoke are 3-year trailing means (`SMOOTH`), so one big season doesn't flicker the map — [map_frames.py](../../data_pipeline/tools/map_frames.py)
- **Measured:** PM2.5 level edges from all 24,125 box cells are `[3.1, 5.4, 7.0, 8.5, 10, 12]` µg/m³; from the US cells only they are `[3.7, 5.3, 6.7, 8.3, 10, 11]`.
- **Measured:** `frames()` on the full box takes 1.5 s (PM2.5) and 1.4 s (AOD, 20,165 cells).
- The trend map runs one OLS + Mann-Kendall per cell and a Benjamini-Hochberg check across the map (`ALPHA_FDR = 0.10`) — [trend_field.py](../../data_pipeline/tools/trend_field.py)

### Inferences
- **Steps, in order:**
  1. Replace the FIRMS-guessed `us_mask` with the Census outline (item 3 of `map_motion_overlay.md`; `sources.power_region.inside`, 5 × 5 sample points). This is a prerequisite.
  2. Add `NA_BOX = {"lat": (10.0, 72.0), "lon": (-170.0, -50.0)}` next to `BOX` and let `annual(key, box)` crop with it.
  3. Rebuild AOD (+ dust, OC), NO₂, HMS and GRACE with the wider constants into new year folders; download FIRMS Canada and Mexico; build OISST (and optionally MERRA-2 T2M).
  4. Regrid finer fields to the display grid (section 4).
  5. `frames(..., inside=show_mask, mean_mask=us_mask, regions={...})`: paint `show_mask` (whole box, land only, or covered countries), keep `us_mean` on the US cells, add `region_means` (section 7).
  6. Compute `level_breaks`/`change_breaks` from `mean_mask` cells (or land cells), so the lower-48 colours stay as they are today. Ocean cells then use the same classes, clipped at the ends.
  7. Write `demo_reports/map_frames_na/<field>.json` (keeps the US files and API as they are) and add the keys to the backend `Literal` in `backend/api/v1/maps.py`.
  8. `trend_field` on the box: about 8.6 times the cells (24,125 versus 2,814), so minutes instead of about 1 minute (the module docstring says about 1 minute today). Run Benjamini-Hochberg on the shown cells and say so, or keep a US-only FDR family so the US story doesn't shift.
- With ocean cells, the change view's percentiles are dominated by small ocean changes (about half the box is sea), which squeezes the land classes. That is another reason to take edges from land or US cells.

### Gaps
- The trend-map runtime for 24,125 cells was not measured, only scaled from the docstring.

## 6. Land, sea and border handling on the map

### Takeaway
Three cases, all doable with Leaflet 1.9.4 and the existing `addLandMask(map, rings)`, and no new dependency:

- **(a) Fields defined on land and sea** (AOD, smoke, NO₂, T2M, IMERG): colour the whole box, drop the white mask, and stroke the US outline on top.
- **(b) Fields valid only where data were collected** (FIRMS for the three downloaded countries, PM2.5 kept to land, GRACE land): pass the covered countries' rings to the same `addLandMask`.
- **(c) Land and sea showing different variables:** prefer one map of *change* in °C with one diverging legend, as merged land-ocean anomaly maps do. Use two legends only if levels must be shown.

### Cited Findings
- `addLandMask(map, rings)` draws a world polygon with the given rings as holes (even-odd), white, in a `mask` pane at z 420, between the data (400) and the multiplied grey OSM basemap (450) — [basemap.js](../../frontend/src/lib/basemap.js)
- TimeMap fetches `fetchStateOutline('L48')` and passes its rings to `addLandMask`; on failure the map still works. `LOWER_48 = [[24, -125], [50, -66]]` sets the view, and the labels say "across the lower 48" and "Lower-48 average" — [TimeMap.jsx](../../frontend/src/components/TimeMap.jsx)
- `data_pipeline/config/us_states.json` is Census `cb_2024_us_state_20m` rounded to 0.01° (211 KB). The lower 48 + DC are 11,065 points (165 KB, 40 KB gzipped), served at `GET /regions/{code}/outline`. The Great Lakes fall outside it — [map_motion_overlay.md](../Climatch%20map%20motion%20and%20charts%20review/map_motion_overlay.md). Census cartographic boundary files are public domain — [Census cartographic boundary files](https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html) (as recorded in that note)
- Natural Earth 50m Admin 0 Countries: v5.1.1, 781.78 KB download (799.31 KB without boundary lakes), "de facto boundaries by default", with a separate disputed-areas theme — [Natural Earth 50m admin 0](https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries-2/)
- Natural Earth licence: "All versions of Natural Earth raster + vector map data found on this website are in the public domain"; "Crediting the authors is unnecessary" (suggested credit "Made with Natural Earth") — [Natural Earth terms](https://www.naturalearthdata.com/about/terms-of-use/)
- OISST ships a land-sea mask, `lsmask.oisst.nc` (4.157 MB) — [PSL THREDDS OISST catalog](https://psl.noaa.gov/thredds/catalog/Datasets/noaa.oisst.v2.highres/catalog.html)
- MODIS LST has no data over water, and the build checks that the Gulf of Mexico is empty — [modis_lst_monthly.py](../../data_pipeline/sources/modis_lst_monthly.py)
- Climate.gov's global temperature Data Snapshots use NOAAGlobalTemp, a merged land-ocean analysis (land stations plus ship and buoy SSTs), as a difference from average, with gray where there is no data — [Climate.gov Data Snapshots](https://content-drupal.climate.gov/maps-data/data-snapshots/data-source/temperature-global-monthly-difference-average), [DataLumos mirror](https://www.datalumos.org/datalumos/project/233461/version/V2/view)

### Inferences
- **US outline always visible:** reuse the rings already fetched for the mask and add one more layer, `L.polygon(rings, { pane: 'markerPane' or a new pane at 460, fill: false, color: token('--ink'), weight: 1.25, interactive: false })`. Add an `AK`/`HI`-inclusive code (for example `US`) to `regions.py outline()` so Alaska and Hawaii are stroked too. The grey OSM basemap already draws other borders and coasts above the colours, so a Natural Earth file is **not** needed for case (a).
- **Natural Earth is needed only for (b) and for regions:** keep CAN and MEX (plus the US from Census), clip to the box, round to 0.01° as `tools/state_shapes.py` does for states, and save as `config/na_countries.json`. Pass `[...US rings, ...CAN rings, ...MEX rings]` to `addLandMask`, so the uncovered countries turn white, or better a light grey "no data" (section 9). Canada's 50m coastline is long; my estimate is a few hundred KB raw before gzip.
- **Coastal colour:** for land-only fields, also mask the sea, using the OISST mask binned to the display grid (ocean fraction per cell). A cell is "land" if its ocean fraction is under 0.5, and the vector mask trims the coastline sharply as today. For SST, invert the mask.
- **Two legends (land temperature versus SST):** two frame files (`t2m_land`, `sst`), painted as two image overlays in the same `frames` pane, each NaN outside its surface, with two `tm-legend` blocks titled "On land: air temperature (MERRA-2)" and "At sea: sea-surface temperature (OISST)". This is about a day of frontend work. A single change map in °C with one legend avoids it entirely, because a change in °C means the same on both surfaces.

### Gaps
- I did not download Natural Earth, so the clipped CAN + MEX file size is an estimate.
- Whether OISST's mask counts the Great Lakes as ocean was not checked.

## 7. Time series beyond the US

### Takeaway
Four kinds of series, all computed in the pipeline with the existing cos(lat) approach:

- **Canadian fire detections per year:** a count of rows in `modis_Canada.parquet`. No grid and no weights needed.
- **Gulf of Mexico sea temperature:** an area-weighted mean of OISST ocean cells inside a hand-entered polygon.
- **ENSO strip:** take PSL's Niño 3.4 series (5°N–5°S, 170–120°W), which lies **outside** the 10–72°N box anyway.
- **Region means beside `us_mean`:** cos(lat) × fraction-inside weights.

### Cited Findings
- State means already use cos(lat) weights inside an outline, zero outside (`state_weights`, `grid_state_monthly`) — [power_region.py](../../data_pipeline/sources/power_region.py). Yearly values are made only from years with all 12 months (GRACE: 9) — [extras.py](../../data_pipeline/sources/extras.py)
- FIRMS cleaning keeps `type == 0` and confidence ≥ 30, and trends start in 2003 (`FIRST_TREND_YEAR`, Terra only before July 2002) — [fires_firms.py](../../data_pipeline/sources/fires_firms.py)
- Niño 3.4 region: 5°N–5°S, 170°W–120°W. PSL's series is the area-averaged anomaly from ERSST v5 using a 1981–2010 climatology, computed at NOAA CPC — [PSL Niño 3.4 (CPC)](https://psl.noaa.gov/data/timeseries/month/Nino34_CPC/). The ONI is a 3-month running mean of ERSST.v5 anomalies in the same box, with a base period that moves every 5 years, which removes the warming trend. Events are ±0.5 °C for at least 5 consecutive months — [UCAR Climate Data Guide](https://climatedataguide.ucar.edu/climate-data/nino-sst-indices-nino-12-3-34-4-oni-and-tni)
- **HEAD:** Canada's 2023 MODIS country file is 26.5 MB against 2.6–5.9 MB in 2005, 2015 and 2019, so the 2023 fire year will dominate the series (sizes track row counts, not cleaned counts).

### Inferences
- **Regions needed:**
  - `US` (Census outline, existing).
  - `Canada` and `Mexico`: for fire counts, the country files themselves are the region. For gridded means, use the Natural Earth polygon.
  - `Gulf of Mexico`: a hand-entered polygon of about 8 vertices in `config/regions_na.json`, closed across the Yucatán Channel (Cabo Catoche to Cabo San Antonio) and the Florida Straits (Cuba to the Keys).
  - `Niño 3.4`: index only, not mapped.
- **Weights:** `w = cos(lat) × f_inside × f_valid`, where `f_inside` is the share of 5 × 5 sample points inside the polygon (as proposed for `us_mask`) and `f_valid` drops NaN cells per month. Series = Σ w·x / Σ w per month, then yearly with the 12-month rule. For SST, compute at OISST's native 0.25° with its land mask **before** regridding, so coast cells don't bias the mean.
- **Output:** add `region_means: {"gulf_of_mexico": [...], ...}` to the frames JSON (a few hundred bytes), or `demo_reports/series_na/<name>.json` for series that have no map (Niño 3.4, Canada fires).
- **ENSO strip:** monthly anomalies as coloured bars (warm/cool) for 2001–2025. Say "observed index from NOAA", and note that ONI's moving base period removes the trend, so it is not a warming series.

### Gaps
- I did not research an official Gulf of Mexico polygon (for example the IHO sea areas from Marine Regions). The hand-drawn box is approximate.
- I did not confirm the exact PSL text-file URL format or the CPC ONI file.

## 8. Payload, performance, disk and download budget

### Takeaway
JSON stays. A full-box 25-year field with values and change is 5.3–6.2 MB raw but **0.77–0.87 MB gzipped** (measured), under the 2 MB budget, and Next.js already gzips. Quantised PNG frames would be about 13 times smaller (65 KB) but lose the hover readout and need Mercator rows: not worth it. The real browser cost is canvas memory: at the current 8 px per cell, 25 frames take about 200 MB of decoded images. Use 4 px per cell for the box (about 50 MB, close to today's about 42 MB). New disk is about 0.4–0.5 GB, and downloads total about 1–5 GB, mostly OMI NO₂.

### Cited Findings
- **Measured: PM2.5, 10–72°N, 170–50°W, 24,125 cells, 25 years, every cell coloured:**
  - JSON (values + change): **5.34 MB raw, 0.87 MB gzip (level 6)**.
  - Values only: 0.48 MB gzip.
  - int16 binary (values + change): 0.76 MB gzip (2.41 MB raw).
  - One class byte per cell: 63 KB gzip.
  - PNG-like (palette index, deflate per frame): 65 KB.
- **Measured: PM2.5 at 1° × 1.25°** (5,952 cells): JSON 1.32 MB raw, 0.26 MB gzip.
- **Measured: AOD** (3 decimals) on the existing 18–72°N, 180–65°W file, 20,165 cells, every cell coloured: **6.21 MB raw, 0.77 MB gzip**. Values only 0.43 MB; int16 0.61 MB.
- Today, lower-48 only: AOD 1,390 → 151 KB, NO₂ 1,297 → 207 KB, PM2.5 1,149 → 144 KB, smoke 468 → 46 KB, fires 252 → 52 KB. Next.js compresses by default (PM2.5 arrives gzipped at 145 KB), and FastAPI has no compression — [map_motion_overlay.md](../Climatch%20map%20motion%20and%20charts%20review/map_motion_overlay.md), [Next.js compress](https://nextjs.org/docs/app/api-reference/config/next-config-js/compress)
- Measured in Chrome on NO₂'s 6,136 cells: repaint all cells 0.69 ms, `toDataURL` 3.1 ms, cross-fade 0.10 ms. A PNG with rows evenly spaced in latitude would be up to 1.19° out at 37°N unless rows are placed by Mercator — [map_motion_overlay.md](../Climatch%20map%20motion%20and%20charts%20review/map_motion_overlay.md)
- `paint()` uses `S = 8` px per column and a height of `lats.length × S × 1.3`, and paints one `L.imageOverlay` per year, one per 16 ms tick — [fieldPaint.js](../../frontend/src/lib/fieldPaint.js), [TimeMap.jsx](../../frontend/src/components/TimeMap.jsx)
- Existing build times and sizes: AOD about 2 min and 17 MB; IMERG about 2 min and 134 MB; MODIS about 4 min and 190 MB; HMS about 2 min, 0.6 MB, with 86 MB of zips cached; GRACE about 1 min, 8.7 MB, 44 MB raw — [DATA_ADDITIONS.md](../../docs/DATA_ADDITIONS.md). Local folders: `pm25_years/` 171 MB, `no2_years/` 724 MB (old global build), `fires/years/` 19 MB + parquet 21 MB (US).

### Inferences
- **Browser:**
  - Paint scales with cells: about 2.7 ms per frame (4 × 0.69).
  - Canvas at S = 8: 1,544 × 1,300 px = 2.0 MP. `toDataURL` is about 12 ms (scaled from 3.1 ms on NO₂'s 944 × 541 px = 0.51 MP canvas), most of the 16 ms tick, and 25 decoded frames take about 200 MB. A view change drops the old images (`l.images = new Map()`), so this does not double.
  - With `S = lons.length > 120 ? 4 : 8`: 0.5 MP per frame (as today), about 50 MB for 25 frames. At zoom 3–4 a 0.5° cell is only a few screen pixels, so nothing visible is lost.
- **Budget table** (estimates unless marked):

| Item | New transfer | New disk | Time (est.) |
|---|---|---|---|
| PM2.5 crop | 0 | 0 (file exists) | seconds |
| AOD + dust + OC, box (3 vars × 125 × 193 × 4 B × 300) | ~90 MB | ~60 MB | ~3–5 min |
| MERRA-2 T2M (optional) | ~30 MB | ~20 MB | ~2 min |
| OMI NO₂, box (248 × 480 × 4 B ≈ 0.48 MB/day × ~7,670 days) | ~3.7 GB (or ~0.9 GB fetching only the new strips) | ~95 MB | ~20–60 min (docstring: 1–3 min/year, untested) |
| HMS on box grid | 0 (zips cached) | ~3 MB (0.6 MB × 4.8) | ~10 min |
| FIRMS Canada + Mexico 2001–2025 (**HEAD**-based: CA 2.6–26.5 MB/yr, MX 4.4–7.0 MB/yr) | ~300 MB | ~60–80 MB | ~10–20 min |
| GRACE re-crop | 0 (cached) | ~11 MB | ~1 min |
| IMERG box (optional; or bin to display grid at build) | ~0.9 GB | ~160 MB at 0.1° / ~20 MB binned | ~3 min |
| OISST monthly box, PSL OPeNDAP | ~70–145 MB | ~20 MB binned (+4 MB mask) | minutes |
| Niño 3.4 series, Natural Earth 50m | <1 MB | <1 MB | seconds |
| Frames JSON (5–6 per field) | — | ~5–6 MB raw each | ~1.5 s each (**measured**) |

  The core set (PM2.5, AOD, smoke, fires, OISST, Niño) is about 0.5 GB of transfer and under 200 MB of disk. NO₂ alone is the multi-GB item. Fetching only the two new strips (rows 400–431 for all columns, and columns 460–519 for rows 432–647) cuts it to about 0.9 GB.
- **Browser payload per field: about 0.8–0.9 MB gzipped**. Smoke and fires are smaller (integers, sparse). Three fields viewed is about 2.5 MB. Keep JSON. Add binary or class bytes only if a phone test shows `JSON.parse` or memory trouble.

### Gaps
- Not measured: `JSON.parse` time for 5–6 MB in the browser, real canvas memory, and network throughput to GES DISC, PSL and FIRMS from the venue. Download times are scaled from the repo's recorded build times, not timed.
- OISST's on-disk variable type (float or packed short) was not checked, hence the 70–145 MB range.

## 9. Honesty: coverage, resolution, borders, land versus ocean

### Takeaway
Use one product per field across all borders (MERRA-2, OMI, HMS and FIRMS each are one product), so there is no seam at the border. Say per field where it is measured, at what resolution, and over what surface. Show "no data" in a visible grey with a legend swatch, not the same white as "outside the map", and caption the projection stretch.

### Cited Findings
- The current caption already says: "Each square is one NASA grid box, about 50 km across (fires: 1°, about 100 km), cut at the coast and border", and "the short fade between years is not data" — [map_motion_overlay.md](../Climatch%20map%20motion%20and%20charts%20review/map_motion_overlay.md), [TimeMap.jsx](../../frontend/src/components/TimeMap.jsx)
- Data caveats to carry over the border:
  - HMS cannot see smoke under cloud, and imagery and analyst practice changed (GOES-16 from 2017).
  - MERRA-2 PM2.5 has no nitrate.
  - GRACE is about 300 km.
  - IMERG is less reliable over snow and ice.

  Sources: [DATA_ADDITIONS.md](../../docs/DATA_ADDITIONS.md), [pm25_merra2.py](../../data_pipeline/sources/pm25_merra2.py)
- The PM2.5 formula includes sea salt (`SSSMASS25`) — [pm25_merra2.py](../../data_pipeline/sources/pm25_merra2.py)
- OISST V2.1 changed quality from 2016 — [NCEI OISST](https://www.ncei.noaa.gov/products/optimum-interpolation-sst)
- Natural Earth draws de facto boundaries by default — [Natural Earth 50m admin 0](https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries-2/)
- Climate.gov greys out areas with no data on its land-ocean maps — [Climate.gov Data Snapshots](https://content-drupal.climate.gov/maps-data/data-snapshots/data-source/temperature-global-monthly-difference-average)

### Inferences
- **Per-field coverage line in the JSON** (`"coverage"`), shown under the legend, for example:
  - "Fire detections: US, Canada and Mexico only; grey where not downloaded."
  - "Sea temperature: ocean only, from satellites, ships and buoys (NOAA OISST)."
  - "Air temperature 2 m above land and sea (NASA MERRA-2, a reanalysis: a model that takes in observations)."
- **PM2.5 over the sea** is mostly sea salt. Mask PM2.5 to land (people breathe it there). Keep AOD and smoke over the sea, where continuity shows transport (Canadian smoke over the Atlantic).
- **No seams by design:** never mix a US product (for example NClimGrid or Census-tied data) with a different Canadian or Mexican one in the same field. If a field is US-only, mask the rest grey and say "US data only".
- **Resolution:** keep one grid. Note that GRACE squares share 3° values, that the 1° fire squares cover less area in the north, and that squares look taller in the north because of the map projection, not the data.
- **Line under the map:** keep the "US average" label for `us_mean`, add named region lines, and never average land and ocean into one "North America" number.
- **Borders:** credit "Borders: US Census; other countries: Natural Earth (de facto boundaries)".

### Gaps
- I found no reviewed examples (NASA Worldview, SVS) of how border coverage changes are worded. These suggestions follow the app's own caption style and Climate.gov's grey "no data" convention.
