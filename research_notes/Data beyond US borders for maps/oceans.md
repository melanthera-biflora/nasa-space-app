# Ocean datasets around the US for Climatch maps and time series (2001–2025)

Scope: free, public ocean data for the North Pacific, North Atlantic, Gulf of Mexico, Caribbean and US coasts that can fill the sea part of the animated year-by-year US map (box 10–60°N, 140–50°W) and drive "ocean → US land" stories (heat, storms, rain, sea level). Research date: 2026-11-15. Sizes marked "measured" were tested live against the server; sizes marked "computed" are cells × months × 4 bytes (float32, uncompressed) and are estimates.

## Objective: master inventory (what to use, size, access, login)

### Takeaway
Everything needed for a demo fits in roughly 100–400 MB if you take monthly products and subset with ERDDAP/OPeNDAP. Only Copernicus Marine needs a separate (free) account. PO.DAAC and GES DISC need the Earthdata login the team already has. ERDDAP, PSL THREDDS, NCEI, NHC, NSIDC, GLERL and CO-OPS need no login.

### Cited Findings
| Dataset | Variable(s) | Grid | Years | Step | Access / login | Box size 2001–2025 monthly | Credit / licence |
|---|---|---|---|---|---|---|---|
| NOAA OISST v2.1 (daily) | sst, anom, err, ice | 0.25°, lon 0–360 | 1981-09-01 → 2026-10-29 | daily | CoastWatch ERDDAP `ncdcOisst21Agg`, no login — [ERDDAP](https://coastwatch.pfeg.noaa.gov/erddap/griddap/ncdcOisst21Agg.html) | one day for the box = 300,128 bytes (measured) → about 2.7 GB of daily data for 2001–2025 | free use and redistribution, no warranty; cite Reynolds 2007, Banzon 2016, Huang 2020; DOI 10.25921/RE9P-PT57 — [ERDDAP](https://coastwatch.pfeg.noaa.gov/erddap/griddap/ncdcOisst21Agg.html) |
| NOAA OISST v2.1 monthly mean (PSL) | sst | 0.25°, lat ascending −89.875…89.875, lon 0.125…359.875, 542 months from 1981-09 | 1981-09 → 2026-10 | monthly | PSL THREDDS/OPeNDAP `sst.mon.mean.nc`, no login (dims checked live via `.dds`/`.ascii`) — [PSL OISST](https://psl.noaa.gov/data/gridded/data.noaa.oisst.v2.highres.html) | about 86 MB (computed: 200×360×300×4 B) | "data provided by the NOAA PSL, Boulder, Colorado, USA" — [PSL](https://psl.noaa.gov/data/gridded/data.noaa.oisst.v2.highres.html) |
| ERSST v5 (v6 is now current) | sst | 2° (89×180) | 1854 → present | monthly | ERDDAP `nceiErsstv5` / `nceiErsstv5_LonPM180`, no login; NCEI HTTPS — [NCEI](https://www.ncei.noaa.gov/products/extended-reconstructed-sst) | 1,446,640 bytes (measured, ERDDAP .nc for the box) | Huang et al. 2017, doi:10.7289/V5T72FNM — [NCEI](https://www.ncei.noaa.gov/products/extended-reconstructed-sst) |
| NASA/JPL MUR SST v4.1 | analysed SST (foundation), sst_anomaly from 2019-07-23 | 0.01° | 2002-05-31 → present | daily | PO.DAAC (Earthdata login for the protected S3 bucket), OPeNDAP, Harmony subsetting — [PO.DAAC](https://podaac.jpl.nasa.gov/dataset/MUR-JPL-L4-GLOB-v4.1); ERDDAP `jplMURSST41mday` (monthly) — [ERDDAP search](https://coastwatch.pfeg.noaa.gov/erddap/search/index.csv?page=1&itemsPerPage=80&searchFor=sst+monthly) | about 50 GB at full resolution (computed) — use stride or MUR25 | cite "JPL MUR MEaSUREs Project 2015", doi:10.5067/GHGMR-4FJ04 — [PO.DAAC](https://podaac.jpl.nasa.gov/dataset/MUR-JPL-L4-GLOB-v4.1) |
| MUR25 v4.2 | sst | 0.25° | 2002-08-31 → present (CMR) | monthly on ERDDAP `jplMURSST42mday` (stored as Float64) | ERDDAP no login; PO.DAAC `MUR25-JPL-L4-GLOB-v04.2` — [CMR](https://cmr.earthdata.nasa.gov/search/collections.json?keyword=MUR25*&provider=POCLOUD) | about 160 MB because values are Float64 (computed) | as MUR |
| NOAA Coral Reef Watch CoralTemp v3.1 | SST, SST anomaly, DHW family | 0.05° (5 km), 3600×7200 | 1985-01-01 → present | daily; monthly on ERDDAP `NOAA_DHW_monthly` (501 months) | CRW site; ERDDAP no login — [CRW](https://coralreefwatch.noaa.gov/product/5km/index_5km_sst.php) | 2.16 GB full resolution; 22 MB at stride 10 (computed) | NOAA Coral Reef Watch; Maturi et al. 2017 — [CRW](https://coralreefwatch.noaa.gov/product/5km/index_5km_sst.php) |
| PSL marine heatwave files | SST anomaly, 90th-percentile threshold, MHW forecast probabilities | 1° (NMME grid) | from 1990/1991 | monthly | `downloads.psl.noaa.gov/Datasets/marinehw/`, no login — [PSL MHW](https://psl.noaa.gov/marine-heatwaves/) | a few MB (not measured) | "Image provided by the NOAA Physical Sciences Laboratory…" — [PSL MHW](https://psl.noaa.gov/marine-heatwaves/) |
| NASA-SSH Simple Gridded SSH v1 / v1.1 | SSH anomaly | 0.5° | 1992-10 → present | every 7 days (10-day window) | PO.DAAC, Earthdata login — [CMR](https://cmr.earthdata.nasa.gov/search/collections.json?short_name=NASA_SSH_REF_SIMPLE_GRID*&options[short_name][pattern]=true); [PO.DAAC news](https://podaac.jpl.nasa.gov/announcements/2025-03-11-Release-of-NASA-SSH-Reference-Collections) | about 94 MB weekly, or 22 MB as monthly means (computed) | DOI 10.5067/NSREF-SG0V1 — [Earthdata search result](https://www.earthdata.nasa.gov/data/catalog/pocloud-nasa-ssh-ref-simple-grid-v1-1) |
| Copernicus DUACS L4 `SEALEVEL_GLO_PHY_L4_MY_008_047` | SLA, ADT, geostrophic currents | 0.125° | 1993-01-01 → 2026-05-15 | daily (`…_P1D`) and monthly (`…_P1M-m`) | Copernicus Marine Toolbox, **free registration required** — [CMEMS product](https://data.marine.copernicus.eu/product/SEALEVEL_GLO_PHY_L4_MY_008_047/description); [CMEMS STAC](https://stac.marine.copernicus.eu/metadata/SEALEVEL_GLO_PHY_L4_MY_008_047/product.stac.json) | about 346 MB per variable for monthly (computed: 400×720×300×4 B) | DOI 10.48670/moi-00148 — [CMEMS](https://data.marine.copernicus.eu/product/SEALEVEL_GLO_PHY_L4_MY_008_047/description) |
| NOAA CO-OPS tide gauges | monthly MSL, MHHW, MLLW, and others | station | per station (Battery NY back to 1856 in API; 2001–2025 tested) | monthly | API `datagetter?product=monthly_mean`, CSV, no login (tested) — [CO-OPS API](https://tidesandcurrents.noaa.gov/api/) | about 25 KB per station (300 rows) | NOAA; relative sea level includes vertical land motion — [CO-OPS](https://tidesandcurrents.noaa.gov/trends-and-extremes/) |
| PSMSL | RLR monthly and annual MSL | station | varies | monthly, annual | psmsl.org, no login — [PSMSL](https://psmsl.org/data/obtaining/) | KB per station | cite Holgate et al. 2013 + PSMSL dataset with extraction date — [PSMSL recommendation](https://psmsl.org/about_us/news/2012/referencing_recommendation.php) |
| NCEI ocean heat content | OHC anomaly 0–700 m, 0–2000 m; by basin | gridded and basin series | 1955 → present | 3-monthly, yearly, pentadal | NCEI HTTPS/THREDDS/AWS/GCS, no login — [NCEI OHC](https://www.ncei.noaa.gov/products/climate-data-records/global-ocean-heat-content) | small (yearly and seasonal netCDF, basin CSV) | cite doi:10.7289/V53F4MVP — [NCEI OHC](https://www.ncei.noaa.gov/products/climate-data-records/global-ocean-heat-content) |
| IBTrACS v04r01 | track, wind, pressure, from all agencies | points | full record; provisional recent storms | mostly 3-hourly and 6-hourly | NCEI HTTPS CSV/netCDF/shapefile, no login — [IBTrACS](https://www.ncei.noaa.gov/products/international-best-track-archive) | NA basin CSV 57.6 MB; NA netCDF 4.27 MB (measured from HTTP Content-Length) | cite Knapp 2010 + Gahtan 2024 doi:10.25921/82ty-9e16; WMO full and open — [IBTrACS](https://www.ncei.noaa.gov/products/international-best-track-archive) |
| HURDAT2 (NHC) | 6-hourly position, max wind, pressure, wind radii from 2004 | points | Atlantic 1851–2025; NE/N-Central Pacific 1949–2025 | 6-hourly plus landfall/peak | NHC text, no login — [NHC data](https://www.nhc.noaa.gov/data/) | 6.8 MB (Atlantic), 4.0 MB (Pacific) | Landsea & Franklin 2013 — [NHC data](https://www.nhc.noaa.gov/data/) |
| MODIS-Aqua L3m CHL v2022.0 | chlor_a | 4 km and 9 km | 2002-07-04 → present | daily, 8-day, monthly | OB.DAAC / Earthdata — [CMR](https://cmr.earthdata.nasa.gov/search/collections.json?short_name=MODISA_L3m_CHL*&options[short_name][pattern]=true) | about 2.9 GB at 4 km; about 0.7 GB at 9 km (computed) | NASA OB.DAAC |
| VIIRS SNPP chl, science quality | chlor_a | 4 km | 2012 → present | monthly | CoastWatch ERDDAP `noaacwNPPVIIRSSQchlaMonthly`, no login — [ERDDAP search](https://coastwatch.noaa.gov/erddap/search/index.csv?page=1&itemsPerPage=60&searchFor=monthly) | GB scale at full resolution; use stride | NOAA CoastWatch |
| PACE OCI v3 / v3.1 | chlorophyll and many more | 4 km, 0.1° | 2024 → present | daily to monthly | OB.DAAC, Earthdata Search — [PACE access](https://pace.oceansciences.org/access_pace_data.htm) | small for 2024–2025 only | NASA |
| GLERL Great Lakes ice | % ice cover per lake; gridded charts | lake and grid | 1973 → present | daily; annual maximum | GLERL HTTPS, no login — [GLERL](https://www.glerl.noaa.gov/data/ice/) | AMIC.txt = 2,243 bytes (measured) | Yang et al. 2020, doi:10.1038/s41597-020-00603-1 — [GLERL](https://www.glerl.noaa.gov/data/ice/) |
| NSIDC Sea Ice Index (G02135) | extent, area | 25 km | 1978 → present | daily, monthly | HTTPS CSV `N_MM_extent_v4.0.csv` (v4 listed live) — [NSIDC v3](https://nsidc.org/data/g02135/versions/3) | KB | Fetterer et al. 2017 (v3) — [NSIDC](https://nsidc.org/data/g02135/versions/3) |
| MERRA-2 `M2TMNXINT` (tavgM_2d_int_Nx) | UFLXQV, VFLXQV (kg m⁻¹ s⁻¹) → IVT | 0.625°×0.5° (361×576) | 1980 → present | monthly; hourly in M2T1NXINT | GES DISC, Earthdata login — [CMR](https://www.earthdata.nasa.gov/data/catalog/ges-disc-m2tmnxint-5.12.4) | 35 MB for both components (computed) | NASA GMAO |
| MERRA-2 TS / TSKINWTR | surface skin temperature (land and sea) | 0.625°×0.5° | 1980 → present | monthly | GES DISC — [CMR variables](https://cmr.earthdata.nasa.gov/search/variables.umm_json?name=TSKINWTR) | 17.6 MB (computed) | NASA GMAO |

- Login rules: the MUR and MEaSUREs/NASA-SSH data files sit in a protected PO.DAAC S3 bucket that needs Earthdata Login — [PO.DAAC MUR](https://podaac.jpl.nasa.gov/dataset/MUR-JPL-L4-GLOB-v4.1). Copernicus Marine downloads need a free Copernicus Marine account (a CDSE account also works), while browsing in MyOcean Pro needs none — [CMEMS sign-up](https://help.marine.copernicus.eu/en/articles/4220332-how-to-sign-up-for-copernicus-marine-service); [Toolbox docs](https://toolbox-docs.marine.copernicus.eu/en/stable/usage/quickoverview.html).
- Tested subset URLs that worked without login on 2026-11-15:
  - ERSST v5 box, 2001–2025 (1.45 MB): `https://coastwatch.pfeg.noaa.gov/erddap/griddap/nceiErsstv5_LonPM180.nc?sst[(2001-01-01):(2025-12-01)][(0.0)][(10):(60)][(-140):(-50)]`
  - OISST one day (0.30 MB): `https://coastwatch.pfeg.noaa.gov/erddap/griddap/ncdcOisst21Agg.nc?sst[(2023-08-15T12:00:00Z)][(0.0)][(10):(60)][(220):(310)]`
  - CO-OPS Battery NY monthly MSL, CSV: `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=monthly_mean&station=8518750&datum=MSL&units=metric&time_zone=gmt&format=csv&begin_date=20010101&end_date=20251231&application=demo`

### Inferences
- PSL OISST monthly box subset by OPeNDAP index (worked out from the live dimensions: index 0 = 1981-09; lat[i] = −89.875 + 0.25i; lon[j] = 0.125 + 0.25j): `https://psl.noaa.gov/thredds/dodsC/Datasets/noaa.oisst.v2.highres/sst.mon.mean.nc?sst[232:1:531][400:1:599][880:1:1239]` gives Jan 2001–Dec 2025, 10.125–59.875°N, 220.125–309.875°E. Not test-downloaded.
- ERDDAP stride (for example `[(10):10:(60)]`) subsamples. It does not average. For a 0.5° map from 5 km CoralTemp, prefer downloading at a moderate stride and block-averaging locally, or accept the subsampling.
- CoastWatch West Coast ERDDAP (coastwatch.pfeg) returned HTTP 503 on some requests during testing and then worked. The demo should cache files locally and not depend on live ERDDAP.

### Gaps
- No live size test was made for Copernicus, PO.DAAC or GES DISC downloads, because they need logins. Their sizes are computed.
- The PSL marine heatwave file sizes and exact file names under `/Datasets/marinehw/` were not listed.

## Sea surface temperature: OISST v2.1 vs ERSST v5 vs MUR vs Coral Reef Watch — which suits a 50 km land grid and an animated yearly map, and what each does near coasts?

### Takeaway
Use NOAA OISST v2.1 monthly (0.25°, about 25–28 km) and average it onto the MERRA-2 0.5°×0.625° grid. It covers all of 2001–2025, needs no login and is about 86 MB for the box. ERSST (2°) is too coarse for coastlines. MUR (0.01°, from mid-2002) is overkill and misses 2001. CoralTemp (5 km, from 1985) is a good high-resolution alternative but GB-sized unless you use stride. MERRA-2's own TS is the simplest seamless option (see the last section).

### Cited Findings
- OISST v2.1: 0.25° grid of 720×1440 points, daily from 1981-09-01. Variables sst, anom, err and ice. Final files replace near-real-time (NRT) files about 2 weeks later. A related product with microwave data (DOISST) exists from June 2002 — [CoastWatch ERDDAP ncdcOisst21Agg](https://coastwatch.pfeg.noaa.gov/erddap/griddap/ncdcOisst21Agg.html).
- OISST licence: "Data may be used and redistributed for free but may contain inaccuracies" (no warranty) — [ERDDAP](https://coastwatch.pfeg.noaa.gov/erddap/griddap/ncdcOisst21Agg.html).
- ERSST: v6 is now the current version (2°, 1850–present, anomalies against 1991–2020). v5 is "previous" (2°, 1854–present, 1971–2000 base, doi:10.7289/V5T72FNM). NCEI says ERSST "smooths local and short-term variations" and is more reliable after the 1940s — [NCEI ERSST](https://www.ncei.noaa.gov/products/extended-reconstructed-sst).
- ERDDAP still serves `nceiErsstv5` (1854–present) and `nceiErsstv5_LonPM180`. The older `nceiErsstv4` ends in 2020 — [ERDDAP search](https://coastwatch.pfeg.noaa.gov/erddap/search/index.csv?page=1&itemsPerPage=80&searchFor=sst+monthly).
- MUR v4.1: 0.01° global, 2002-05-31 → present, netCDF-4 in GHRSST GDS2 format. It uses nighttime L2P skin and subskin SST. `sst_anomaly` exists only from 2019-07-23. There is a 1-day-latency NRT stream and a 4-day-latency retrospective stream — [PO.DAAC](https://podaac.jpl.nasa.gov/dataset/MUR-JPL-L4-GLOB-v4.1).
- ERDDAP has MUR monthly at 0.01° (`jplMURSST41mday`, plus `jplMURSST41anommday`) and at 0.25° (`jplMURSST42mday`), from 2002 — [ERDDAP search](https://coastwatch.pfeg.noaa.gov/erddap/search/index.csv?page=1&itemsPerPage=80&searchFor=sst+monthly). The `.dds` checked live showed `jplMURSST42mday` with 285 time steps on a 720×1440 grid, with sst as Float64.
- CoralTemp v3.1: 0.05° daily nighttime SST from 1985-01-01. It joins OSTIA reanalysis (1985–2002), reprocessed Geo-Polar Blended (2002–2016) and NRT Geo-Polar Blended (2016–). The merges happened in Nov 2002 and Oct 2016. The land value is −32768 — [CRW](https://coralreefwatch.noaa.gov/product/5km/index_5km_sst.php). ERDDAP `NOAA_DHW_monthly` (1985–present, 3600×7200, 501 months) — [ERDDAP search](https://coastwatch.pfeg.noaa.gov/erddap/search/index.csv?page=1&itemsPerPage=80&searchFor=sst+monthly).
- CoastWatch also has an East Coast EEZ MUR 1 km monthly composite for 2003–2021 (`noaacwecnMURmonthly`) — [CoastWatch ERDDAP search](https://coastwatch.noaa.gov/erddap/search/index.csv?page=1&itemsPerPage=60&searchFor=monthly).

### Inferences
- For a 50 km land grid, 0.25° OISST gives about 2×2.5 source cells per MERRA-2 cell, so conservative averaging is clean. ERSST at 2° would be blown up about 4× and would leave a wide empty or blocky coastal strip. MUR and CoralTemp must be averaged down a lot, which removes their only advantage.
- The CoralTemp joins (2002, 2016) and the OISST AVHRR-only design are fine for yearly anomaly maps. For trends, prefer OISST or ERSST (one consistent method) over CoralTemp's spliced record.
- Near coasts, all gridded SST products leave a gap where the cell centre is land. At 0.25° that gap is about one cell wide, and averaging onto the MERRA-2 grid will create mixed land/sea cells. Draw the land layer on top and let the sea layer extend under it (fill coastal cells by nearest-neighbour) so that no white seam appears.

### Gaps
- None of the pages read describe each product's skill near coasts (for example OISST's coastal bias versus MUR's). Chin et al. 2017 (MUR) is the usual reference but was not read.
- Whether ERDDAP serves a ready-made OISST v2.1 *monthly* dataset was not confirmed. The PSL THREDDS monthly file is the confirmed route.

## Marine heatwaves: ready-made products, how to derive them (Hobday et al.), and links to US heat and drought

### Takeaway
For the demo, use NOAA PSL's ready-made monthly marine heatwave files (built on OISST, 90th-percentile threshold, 1991–2020 baseline). For a pixel-level "MHW days per year" map, apply Hobday et al. (2016) to daily OISST (about 2.7 GB for the box for 2001–2025, plus a 1991–2020 climatology). The 2013–15 "Blob" has a well-sourced link to Western US drought. The Gulf/Florida 2023 heat is well documented as an ocean event, but in what was read its link to land heat is only qualitative.

### Cited Findings
- Hobday et al. 2016 (Progress in Oceanography 141:227–238, doi:10.1016/j.pocean.2015.12.014) define a marine heatwave as an event of ≥5 days above the 90th percentile of a 30-year baseline — [ABER record](https://research.aber.ac.uk/en/publications/a-hierarchical-approach-to-defining-marine-heatwaves/); [accepted manuscript](https://plymsea.ac.uk/id/eprint/7115/).
- The NOAA PSL Marine Heatwave Tracker uses daily OISST v2 at 0.25°, interpolated to 1° to compare with the NMME forecast. Threshold is the 90th percentile (95th and 99th offered), with a 1991–2020 climatology and trend-kept and detrended versions. Monthly statistics and netCDF downloads at `downloads.psl.noaa.gov/Datasets/marinehw/` include OISST anomalies and 90% thresholds from 1990. The page links Python code for defining marine heatwaves. Forecasts are experimental — [PSL MHW](https://psl.noaa.gov/marine-heatwaves/).
- The Blob: Bond et al. 2015 (GRL) tie the 2014 NE Pacific warm anomaly to a persistent Gulf of Alaska ridge (Oct 2013–Feb 2014) that cut ocean heat loss. The same ridge pushed storms away and cut precipitation west of the Continental Divide, while the eastern US had a cold, snowy winter — [US CLIVAR](https://usclivar.org/node/873); [PMEL](https://pmel.noaa.gov/node/545); [EarthSky/The Conversation](https://earthsky.org/earth/pacific-blob-is-changing-weather-patterns).
- Gulf/Florida 2023: buoy MNBF1 in Manatee Bay, FL, read 101.1°F (38.4°C) on 24 July 2023. NOAA did not certify it as a record. Waters around South Florida were the warmest since 1981, and corals in the Florida Keys bleached and died — [Florida Museum](https://www.floridamuseum.ufl.edu/earth-systems/blog/hot-tub-heat-understanding-the-high-ocean-temperatures-off-floridas-coast/); [AP via Fortune](https://dc.fortune.com/2023/07/26/florida-ocean-temperature-hits-100-degree-hot-tub-levels-record-hottest-seawater-measured).
- Northern Gulf: a 2020 Nature Communications study found an extreme coastal heat-content event caused by a tropical storm followed by an atmospheric heatwave. In other words, land/air heat drove ocean heat — [Nature Comms 2020](https://www.nature.com/articles/s41467-020-18339-2).
- Compound coastal land–sea heat: in Europe, marine heatwaves next to the coast raised coastal land heatwave exposure by up to 3.5× (Barkhordarian et al. 2025). No matching US study was found — [PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12706064/).

### Inferences
- Yearly map metric: "MHW days per year" or "max SST anomaly per year" per pixel, from daily OISST with a 1991–2020 day-of-year climatology (11-day window) and 90th percentile, as in Hobday. Doing this needs daily 1991–2025 for the box, about 35 years × 365 × 0.3 MB ≈ 3.8 GB, which is feasible locally but slow. A lighter option: count months above the PSL monthly 90% threshold (1° grid).
- Use the detrended threshold if the message is "unusual for its time". Use the fixed baseline if the message is "warming makes MHWs near-permanent". Say which one the map uses.

### Gaps
- No peer-reviewed source read here gives a quantitative Gulf of Mexico SST → US land heat or rain attribution. Trenberth et al. 2018 (Earth's Future, Harvey and Gulf ocean heat content) is a likely source but was not checked this session.
- The name and URL of the Python MHW package linked by PSL was not captured.

## Sea level: satellite altimetry vs tide gauges, and which is better for a household-level "your coast" time series

### Takeaway
For a "your coast" household series, use NOAA CO-OPS tide-gauge monthly mean sea level (API, CSV, no login). It is *relative* sea level, which includes land sinking, and that is what a house experiences. For the ocean map, use NASA-SSH Simple Grid (0.5°, 7-day, 1992–present, Earthdata login): it is NASA, the same scale as MERRA-2, and replaces the retired MEaSUREs V2205. Copernicus DUACS (0.125°, daily or monthly, 1993–) is sharper but needs Copernicus registration.

### Cited Findings
- JPL MEaSUREs Gridded SSHA V2205 (1/6°, 5-day, DOI 10.5067/SLREF-CDRV3) is marked "deprecated and retired" on PO.DAAC — [PO.DAAC](https://podaac.jpl.nasa.gov/dataset/SEA_SURFACE_HEIGHT_ALT_GRIDS_L4_2SATS_5DAY_6THDEG_V_JPL2205).
- NASA-SSH Reference collections were released 11 Mar 2025. The Simple Gridded SSH product gives an SSHA map every 7 days on a 0.5° grid, each from 10 days of reference-mission data (TOPEX, Jason, Sentinel-6). It starts Oct 1992, in netCDF4. v1.1 was released June 2026 — [PO.DAAC announcement](https://podaac.jpl.nasa.gov/announcements/2025-03-11-Release-of-NASA-SSH-Reference-Collections); [Earthdata v1.1 alert](https://www.earthdata.nasa.gov/data/alerts-outages/nasa-ssh-sea-surface-height-from-standardized-reference-missions-version-1.1). CMR lists `NASA_SSH_REF_SIMPLE_GRID_V1` (from 1992-10-25) and `NASA_SSH_REF_SIMPLE_GRID_V11` (from 1992-10-21) — [CMR](https://cmr.earthdata.nasa.gov/search/collections.json?short_name=NASA_SSH_REF_SIMPLE_GRID*&options[short_name][pattern]=true).
- Copernicus DUACS `SEALEVEL_GLO_PHY_L4_MY_008_047`: 0.125°, 1993-01-01 → 2026-05-15, daily. Variables are SSH, SLA (1993–2012 reference) and geostrophic velocities. DOI 10.48670/moi-00148 — [CMEMS](https://data.marine.copernicus.eu/product/SEALEVEL_GLO_PHY_L4_MY_008_047/description). The product STAC lists a daily dataset `…0.125deg_P1D_202411` and a monthly one `…0.125deg_P1M-m_202411` — [CMEMS STAC](https://stac.marine.copernicus.eu/metadata/SEALEVEL_GLO_PHY_L4_MY_008_047/product.stac.json). Download needs a free account — [CMEMS help](https://help.marine.copernicus.eu/en/articles/4220332-how-to-sign-up-for-copernicus-marine-service).
- NOAA CO-OPS "Sea Level Trends and Extremes" shows total change, change since the 1983–2001 tidal epoch, rate since 1992, extremes, and vertical land motion. It warns that measurements are *relative* (they include subsidence or uplift), that records of ≤30 years are imprecise, and that historical data "should not be used for planning purposes" — [CO-OPS](https://tidesandcurrents.noaa.gov/trends-and-extremes/). The old `/sltrends/` URLs now redirect there, so old per-station `…_meantrend.csv` links no longer work (tested).
- CO-OPS API `product=monthly_mean&datum=MSL&format=csv` returned monthly MSL for The Battery, NY (8518750) from Jan 2001 (tested). Columns: Year, Month, Highest, MHHW, MHW, MSL, MTL, MLW, MLLW, … — [CO-OPS API](https://tidesandcurrents.noaa.gov/api/). An IOOS ERDDAP dataset says verified monthly water level there is Great Lakes only, but that note applies to that ERDDAP dataset, not the API — [CO-OPS ERDDAP](https://opendap.co-ops.nos.noaa.gov/erddap/info/IOOS_Monthly_Verified_Water_Level/index.html).
- PSMSL: the RLR (Revised Local Reference) set has benchmark-controlled datums; the "Metric" set has no datum control. Cite Holgate et al. 2013 plus "PSMSL, year, Tide Gauge Data, retrieved <date>" — [PSMSL](https://psmsl.org/data/obtaining/); [PSMSL referencing](https://psmsl.org/about_us/news/2012/referencing_recommendation.php).

### Inferences
- Household story: pick the nearest CO-OPS gauge to the user's coast. Plot monthly MSL for 2001–2025 with a 12-month running mean, and add the NASA-SSH offshore cell for comparison. The difference between them is mostly vertical land motion; Gulf Coast gauges are the strongest example.
- Map story: NASA-SSH 0.5° averaged to yearly means and regridded to MERRA-2 is enough to show the US East and Gulf coasts rising faster since about 2010. DUACS adds resolution near the Gulf Stream and Loop Current.

### Gaps
- Altimetry quality near coasts (roughly the last 10–20 km) and GIA treatment for NASA-SSH were not found in the pages read.
- The PSMSL licence text was not found; it is only described as "freely accessible" in secondary sources — [Wikipedia](https://en.wikipedia.org/wiki/Permanent_Service_for_Mean_Sea_Level).

## Ocean heat content and Gulf Loop Current: simple to show?

### Takeaway
Ocean heat content is easy as a time series: NCEI basin series (0–700 m and 0–2000 m, 3-monthly or yearly since 1955), with yearly and seasonal netCDF grids. The Loop Current has no ready-made public index found. Draw it from altimetry (the 17 cm SSH contour method) using DUACS or NASA-SSH, or leave it out.

### Cited Findings
- NCEI Global OHC CDR: anomalies for 0–700 m and 0–2000 m, also by basin and hemisphere, 3-monthly, yearly and pentadal, 1955–present. The XBT era (up to about 2002) gave way to Argo (2003+). Access by HTTPS archive 0164586, THREDDS, AWS (`noaa-cdr-ocean-heat-content-pds`) or GCS. Cite doi:10.7289/V53F4MVP — [NCEI OHC](https://www.ncei.noaa.gov/products/climate-data-records/global-ocean-heat-content).
- The NCEI directory `woa/DATA_ANALYSIS/3M_HEAT_CONTENT/NETCDF/` holds `yearly_ocean_heat_content.nc` and `seasonal_ocean_heat_content.nc`. `DATA/basin/` holds 3-month, one-month and pentad basin series, including `ohc2000m_levitus_climdash_seasonal.csv` (directory listing checked live) — [NCEI directory](https://www.ncei.noaa.gov/data/oceans/woa/DATA_ANALYSIS/3M_HEAT_CONTENT/).
- Loop Current tracking: the 17 cm SSH-anomaly contour (Leben) follows the current's core. Automated tracking gives northern extent, length and area, and a 1993–2021 study used 29 years of altimetry with this contour — [Leben AVISO poster](https://mobile.aviso.altimetry.fr/fileadmin/documents/OSTST/2012/posters/Leben_loop_current.pdf); [arXiv 2026](https://arxiv.org/pdf/2606.06844); [EGUsphere 2025](https://egusphere.copernicus.org/preprints/2025/egusphere-2025-5574/egusphere-2025-5574.pdf).

### Inferences
- A simple demo layer: yearly mean DUACS ADT over the Gulf, with the 17 cm SLA contour drawn after removing the Gulf-box spatial mean. That needs DUACS daily for the Gulf only (about 0.1 of the full box, roughly 1 GB for daily 2001–2025, computed).
- OHC links to hurricanes better than to land temperature. Use the North Atlantic 0–700 m series alongside ACE.

### Gaps
- The resolution of the NCEI gridded OHC files (believed to be 1°) was not confirmed.
- No maintained public Loop Current northern-extent time series was found to be downloadable.

## Tropical cyclones: IBTrACS and HURDAT2 (format, years, licence), drawing tracks and counts near the US, and ACE

### Takeaway
Use HURDAT2 (Atlantic 1851–2025 and NE Pacific 1949–2025, 6-hourly, small text files) as the official US source, and IBTrACS v04r01 for netCDF/CSV/shapefile convenience and recent provisional storms. ACE is easy to compute from 6-hourly winds.

### Cited Findings
- HURDAT2: Atlantic `hurdat2-1851-2025-092326.txt` (6.8 MB), updated 2026-09-23 with the reanalysed 1971–75 seasons. NE/N-Central Pacific `hurdat2-nepac-1949-2025-092926.txt` (4.0 MB). Comma-delimited, 6-hourly position, maximum wind and central pressure, tropical and subtropical cyclones, wind radii from 2004. Format PDFs are on the same page. Cite Landsea & Franklin 2013 — [NHC data](https://www.nhc.noaa.gov/data/).
- IBTrACS v04r01 (released June 2024) comes in netCDF (CF), CSV (blank = missing) and point/line shapefiles. Basin subsets include NA and EP; there are also "since1980" and "last3years" subsets. It is updated about weekly or 3×/week (the page is inconsistent). Agency winds are not harmonised: averaging periods differ. Cite Knapp et al. 2010 + Gahtan et al. 2024 (doi:10.25921/82ty-9e16). Use follows WMO full and open data policy, with Resolution 40 for commercial use — [IBTrACS](https://www.ncei.noaa.gov/products/international-best-track-archive).
- Live file sizes: `ibtracs.NA.list.v04r01.csv` 57,593,323 bytes (last modified 2026-11-12); `IBTrACS.NA.v04r01.nc` 4,270,868 bytes — [IBTrACS access dir](https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-stewardship-ibtracs/v04r01/access/csv/).
- ACE = the sum of squared maximum sustained winds (kt), every 6 hours, while a storm is at least tropical storm strength, in units of 10⁴ kt². Atlantic "above normal" is > 126.1; "hyperactive" is > 159.6; the 1991–2020 median is 125.5 — [NOAA CPC](https://www.cpc.ncep.noaa.gov/products/outlooks/Background.html). IBTrACS gives annual and monthly ACE tables by basin only through 2010 — [IBTrACS](https://www.ncei.noaa.gov/products/international-best-track-archive).

### Inferences
- Tracks on the map: draw HURDAT2 6-hourly points as polylines, coloured by Saffir-Simpson category, filtered to the year shown. "Near the US" can be any storm with a point inside the box, or the stricter rule of a landfall record or a point within about 200 km of the US coast.
- Counts per year: count named storms (≥34 kt), hurricanes (≥64 kt) and US landfalls. ACE per year: use only 00/06/12/18 UTC rows with status TS/HU/SS (≥34 kt). Skip the extra landfall/peak rows, or ACE will be counted twice.
- A good pairing for the map is ACE per year against the August–October Main Development Region or Gulf SST from OISST.

### Gaps
- The exact HURDAT2 licence wording was not found. US Government works are generally public domain, but this is not confirmed on the page.
- The details of HURDAT2's landfall ("L") record identifier were not re-checked in the format PDF this session.

## Ocean colour, chlorophyll and harmful algal blooms (MODIS Aqua, VIIRS, PACE): useful for Gulf and Great Lakes stories?

### Takeaway
These are useful as a side story (Lake Erie blooms, Florida/Gulf), but they are weak for "ocean drives US climate". MODIS-Aqua L3m (2002–) is the only chlorophyll record covering about 2003–2025. VIIRS starts in 2012 and PACE in 2024. Lake Erie's NOAA bloom Severity Index (2002–2025) is a ready-made yearly series.

### Cited Findings
- `MODISA_L3m_CHL` v2022.0 (Aqua MODIS Level-3 mapped chlorophyll) runs 2002-07-04 → present, with an NRT twin — [CMR](https://cmr.earthdata.nasa.gov/search/collections.json?short_name=MODISA_L3m_CHL*&options[short_name][pattern]=true).
- VIIRS: CoastWatch ERDDAP has `noaacwNPPVIIRSSQchlaMonthly` (S-NPP VIIRS science quality, global 4 km, 2012 → 2026-11-02, monthly) and NOAA-20/21 daily sectors from 2025 — [CoastWatch ERDDAP](https://coastwatch.noaa.gov/erddap/search/index.csv?page=1&itemsPerPage=60&searchFor=monthly).
- PACE OCI: current processing is Version 3, with Level-2 and Level-3 products refined to v3.1 in Aug 2025. Access is via Earthdata Search and the OB.DAAC L3/L4 browser — [PACE access](https://pace.oceansciences.org/access_pace_data.htm). OB.DAAC directory pages list PACE-OCI Level-4 mapped files from 11 Apr 2024 — [OB.DAAC](https://oceandata.sci.gsfc.nasa.gov/directdataaccess/Level-4%20Mapped/PACE-OCI/2024/11-Apr-2024).
- Lake Erie HAB Severity Index (NOAA NCCOS) is based on the peak 30-day bloom biomass from satellite. Above 5 is severe; above 7 is very severe. The largest blooms were 2011 (10) and 2015 (10.5); 2025 was 2.4. The 2002–2024 series was reprocessed in May 2025, so older published values (for example 2024 = 6.6 vs 4.2 vs 3.9) disagree — [NCCOS](https://coastalscience.noaa.gov/?p=118362); [EPA Lake Erie](https://www.epa.gov/glwqa/lake-erie-water-quality-data).

### Inferences
- For a yearly map, MODIS-Aqua monthly 9 km chlorophyll (about 0.7 GB for the box, computed) is the cheapest 2003–2025 choice. Show anomalies on a log scale. Chlorophyll near coasts and in lakes is affected by sediment and other coloured material (inference, not checked here).
- The Lake Erie SI as a bar chart, next to spring Maumee River discharge or summer lake temperature, makes a clear "water + heat → bloom" story without big downloads.

### Gaps
- The exact PACE monthly L3 chlorophyll collection short name and its 2024 start date were not confirmed in CMR (the query returned nothing).
- No reprocessed annual table for the Lake Erie SI (2002–2025) download was found. Florida red tide (Karenia brevis) data were not researched.

## Sea ice and Great Lakes ice cover: NOAA GLERL, NSIDC Sea Ice Index — relevant to US winters?

### Takeaway
Great Lakes ice cover (GLERL, 1973–present, daily and annual maximum per lake, tiny text files) is a strong and easy US-winter story. Arctic sea ice (NSIDC Sea Ice Index, 25 km, 1978–) is a global-context series. In what was read, it has no sourced direct link to US winters.

### Cited Findings
- GLERL: ice charts 1973–present (Canadian Ice Service 1973–88, US National Ice Center 1989–). Daily % ice cover for the basin and each lake, annual maximum ice cover (AMIC.txt, dates_AMIC.txt), and gridded charts as ASCII grids, shapefiles and JPEGs by decade. Grids were standardised in 2020. Record maxima include Superior 94.7% (1979), Michigan 100% (1996), Huron 93.1% (2014) and Erie 98.2% (1994). Lows include basin 1.9% (2012) and Superior 11.9% (2002). Cite Yang et al. 2020 — [GLERL](https://www.glerl.noaa.gov/data/ice/). AMIC.txt is 2,243 bytes (tested).
- NSIDC Sea Ice Index G02135: 25 km, daily and monthly, PNG/GeoTIFF/CSV/shapefile, 1981–2010 reference. v3 is retired and moved to "Basic" service; NSIDC advises monthly values for trends — [NSIDC v3](https://nsidc.org/data/g02135/versions/3). v4 monthly CSVs (`N_01_extent_v4.0.csv` …) are listed at `noaadata.apps.nsidc.org/NOAA/G02135/north/monthly/data/` (checked live) — [NSIDC directory](https://noaadata.apps.nsidc.org/NOAA/G02135/north/monthly/data/).
- OISST also carries an `ice` (concentration fraction) variable, so the SST map can mask or show sea ice directly — [ERDDAP](https://coastwatch.pfeg.noaa.gov/erddap/griddap/ncdcOisst21Agg.html).

### Inferences
- Map: GLERL gridded ice for one date per winter (for example the date of the annual maximum) can be shown over the lakes. Time series: annual maximum % per lake for 2001–2025, which has clear lows (2002, 2012, 2024 if present) and highs (2014, 2015). This links to lake-effect snow and winter temperature over nearby land.
- Arctic sea ice: show the September and March extent series as context only, unless a sourced US-weather link is added.

### Gaps
- The GLERL grid resolution was not given on the page (it says only "high resolution grid").
- The NSIDC v4 landing page (citation, version changes) was not read. No source was found for Arctic sea ice → US winter links.

## Atmospheric rivers and moisture transport: MERRA-2 IVT and AR catalogues (e.g. Guan & Waliser) as a West Coast overlay

### Takeaway
Compute IVT from MERRA-2 `M2TMNXINT` (monthly) or `M2T1NXINT` (hourly) UFLXQV and VFLXQV on the same 0.5°×0.625° grid the app already uses. Ready-made Guan & Waliser MERRA-2 AR masks exist through ARTMIP (1980 to mid-2017 only). Newer tARget v4 covers 1940–2023 on ERA5. For 2001–2025 on MERRA-2, a self-computed IVT threshold mask is the practical way.

### Cited Findings
- `M2TMNXINT` = MERRA-2 tavgM_2d_int_Nx "Vertically Integrated Diagnostics 0.625 x 0.5 degree V5.12.4", from 1980-01-01 — [CMR](https://www.earthdata.nasa.gov/data/catalog/ges-disc-m2tmnxint-5.12.4); access at `goldsmr4.gesdisc.eosdis.nasa.gov/data/MERRA2_MONTHLY/M2TMNXINT.5.12.4/` and in Giovanni — [data.gov](https://catalog.data.gov/dataset/merra-2-tavgm_2d_int_nx-2dmonthly-meantime-averagedsingle-levelassimilationvertically-inte).
- The CMR variable record for `UFLXQV` is "eastward_flux_of_atmospheric_water_vapor", kg m⁻¹ s⁻¹, dimensions [1, 361, 576] (monthly) and [24, 361, 576] (hourly-file variant) — [CMR variables](https://cmr.earthdata.nasa.gov/search/variables.umm_json?name=UFLXQV).
- ARTMIP Tier 1: binary AR/no-AR catalogues from many algorithms on MERRA-2, Jan 1980–Jun 2017, DOI 10.5065/D62R3QFS. A THREDDS listing shows yearly `MERRA2.ar_tag.Guan_Waliser_v2.3hourly.<year>.nc` files — [UCAR data](https://data.ucar.edu/dataset/5ab98e63-14df-4717-a1a0-e415f2fb1916); [GDEX THREDDS](https://tds.gdex.ucar.edu/thredds/catalog/files/d651012/catalogues/guan_waliser/catalog.html).
- ARTMIP Tier 2 (ERA5) catalogues are over 4 TB compressed, DOI 10.26024/RAWV-YX53 — [GDEX d651018](https://gdex.ucar.edu/datasets/d651018/). Guan & Waliser (Scientific Data 2024) tARget v4 covers ERA5 1940–2023, 6-hourly, 0.25° (reported in the search summary; download location not confirmed).

### Inferences
- IVT = √(UFLXQV² + VFLXQV²). Monthly-mean IVT smooths individual ARs into a "moisture highway" climatology. That is fine for a yearly map (for example the Oct–Mar mean IVT anomaly over the NE Pacific). For AR days per year at West Coast cells, use hourly or 3-hourly data and a threshold. The commonly used 250 kg m⁻¹ s⁻¹ is not sourced here; the Guan & Waliser method is percentile-based.
- Size: the monthly box (101×145 cells) for 2 variables × 300 months is about 35 MB. Hourly data for 2001–2025 would be about 2 vars × 219,000 h × 14,645 × 4 B ≈ 26 GB, so compute daily means on the server with the GES DISC subsetter or OPeNDAP if needed.
- An overlay of arrows (U, V) plus shaded IVT, ending at the West Coast, sits on the same grid as the land aerosols and rain, so no regridding is needed.

### Gaps
- The download location and licence for Guan & Waliser tARget v4 (ERA5), and any MERRA-2 version after 2017, were not found.
- The GES DISC page did not render (JavaScript). Earthdata-login and per-file sizes for M2TMNXINT were not read directly.

## Blending ocean and land on one map: regridding to MERRA-2 0.5°×0.625°, and whether MERRA-2 surface temperature is a seamless land+sea field

### Takeaway
MERRA-2 TS (surface skin temperature) already covers land and ocean on the app's 576×361 grid. Over the ocean it follows prescribed SST: Reynolds OISST to March 2006, then OSTIA. It is therefore the cheapest seamless "land + sea temperature" layer, with a known join in April 2006. For a pure ocean product, OISST 0.25° averages cleanly onto the grid. NASA-SSH 0.5° and PSL MHW 1° need only bilinear or nearest regridding.

### Cited Findings
- The MERRA-2 grid is 361 × 576 (0.5° lat × 0.625° lon), as shown by the CMR variable dimensions for UFLXQV — [CMR](https://cmr.earthdata.nasa.gov/search/variables.umm_json?name=UFLXQV).
- MERRA-2 variables: `TS` = "surface_skin_temperature" and `TSKINWTR` = "open_water_skin_temperature" (ocean collection) — [CMR TS](https://cmr.earthdata.nasa.gov/search/variables.umm_json?name=TS); [CMR TSKINWTR](https://cmr.earthdata.nasa.gov/search/variables.umm_json?name=TSKINWTR).
- MERRA-2 SST and sea-ice boundary forcing: AMIP-II (1980–81), Reynolds et al. 2007 OISST (1982–Mar 2006), OSTIA (Apr 2006–present). These "contain discontinuities that affect certain time series analysis" — [NCAR Climate Data Guide](https://climatedataguide.ucar.edu/climate-data/nasas-merra2-reanalysis). A GMAO poster notes Arctic temperature shifts possibly linked to the boundary-condition changes — [GMAO poster](https://gmao.Gsfc.Nasa.Gov/pubs/posters/2018/Collow56.pdf).

### Inferences
- Seamless option: show MERRA-2 `TS` anomaly (land + sea) for each year 2001–2025, about 17.6 MB for the box. Its 2001–2025 span crosses the April 2006 switch from OISST (0.25°) to OSTIA (0.05°). That is acceptable for yearly anomalies on a 50 km map, but flag it for trend lines and compare against OISST, which has no switch.
- Regridding recipe: (1) shift OISST and MUR/CoralTemp longitudes from 0–360 to −180…180 if needed; (2) conservatively average OISST 0.25° to the 0.5°×0.625° cells (2 lat × 2.5 lon) with ESMF/xESMF or a simple area-weighted block mean; (3) build a land mask from MERRA-2 FRLAND or FROCEAN. That variable was not checked in this session and is believed to be in the M2C0NXASM constants file. (4) Draw land layers on top and sea layers underneath, filling coastal cells by nearest-neighbour.
- Fields already on or near the grid: all MERRA-2 (TS, TSKINWTR, IVT); NASA-SSH (0.5°); PSL MHW (1°, upsample). Fields needing averaging: OISST, MUR25 (0.25°), DUACS (0.125°), CoralTemp (0.05°), chlorophyll (4–9 km). Point data (tracks, gauges) need no grid.

### Gaps
- Whether MERRA-2 TS over open ocean equals the prescribed foundation SST exactly or includes a diurnal or cool-skin adjustment was not confirmed. Check the MERRA-2 file specification (GMAO Office Note 9) or Bosilovich et al. 2015 Section 8.
- The name and collection of the MERRA-2 land-fraction variable (FRLAND/FROCEAN) were not verified this session.
