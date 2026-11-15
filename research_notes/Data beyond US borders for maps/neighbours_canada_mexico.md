# Datasets for a North America view: how Canada and Mexico affect US air, smoke, fire, dust, heat and water

Scope: free, public observation and reanalysis datasets (no forecasts) that cover Canada, Mexico and the border regions, for extending Climatch's US maps and time series (2001–2025). Researched 2026-11-15. "CMR" means the NASA Common Metadata Repository collection record, which is the authoritative source for start dates and grids of NASA products.

Reference box used throughout: **15–72°N, 170–50°W** (Alaska, all of Canada south of the Arctic islands, CONUS, Mexico, northern Central America, Gulf of Mexico, western Caribbean, and the eastern Pacific inflow region).

---

## 1. Canadian wildfire smoke and fires: which datasets show fire activity, burned area and smoke reaching the US, and how far back is each consistent?

### Takeaway
For one consistent record on both sides of the border, use NASA FIRMS MODIS C6.1 detections (Nov 2000 onward) plus MODIS MCD64A1 burned area (Nov 2000 onward) for fire, and MERRA-2 organic and black carbon (1980 onward) plus NOAA HMS smoke polygons (Aug 2005 onward) for smoke. Canada's own products (NBAC, CNFDB, CWFIS Fire M3) are better for perimeters and official burned area, but they stop at the border and their methods have changed over time. MERRA-2 smoke has a documented emissions-source change in 2010. HMS shows smoke anywhere in the column, not at the surface, and has nothing before 2005.

### Cited Findings

**NASA FIRMS active fire detections (global, so it already covers Canada and Mexico)**
- Archive coverage: MODIS Collection 6.1 from **1 Nov 2000** to present. VIIRS S-NPP 375 m from **20 Jan 2012**. VIIRS NOAA-20 from **1 Apr 2018**. Downloads are shapefile, CSV or JSON, for data older than 7 days. A download needs an **Earthdata Login or an emailed code**. — [FIRMS Archive Download](https://firms.modaps.eosdis.nasa.gov/download/)
- The current S-NPP product is VIIRS Collection 2. The original C1 is "no longer recommended". The archive folders are `modis-c6.1` and `suomi-npp-viirs-c2`. — [FIRMS archive README](https://nrt3.modaps.eosdis.nasa.gov/archive/FIRMS/README.pdf)
- FIRMS offers a **"yearly summary by country [.csv]"** download, and the archive tool can subset by date, format, country or a map area. FIRMS does not subset by county. — [Earthdata Forum, FIRMS reply](https://forum.earthdata.nasa.gov/viewtopic.php?p=14071); [FIRMS Archive Download](https://firms.modaps.eosdis.nasa.gov/download/)
- Near-real-time (NRT) detections are replaced by standard science-quality data after about **5 months**. — [Earthdata Forum](https://forum.earthdata.nasa.gov/viewtopic.php?p=14071)
- Caveat: from Nov 2000 to Jul 2002 the record is **Terra only**. Aqua MODIS fire data start in **July 2002**. Terra passes at about 10:30 and Aqua at about 13:30 local time, so detection counts depend on which satellites are included. — [Giglio et al. 2006, JGR](https://dataserver-coids.inpe.br/queimadas/queimadas/Publicacoes-Impacto/material3os/2006_Giglio_etal_GlobalDistribuiton_JGR_DE3os.pdf)
- Global fire-count totals for 2001 and 2002 differed by less than 3%, but there were "regionally significant differences". — [Csiszar et al. 2005, IJWF](https://publish.csiro.au/WF/WF03078)

**MODIS MCD64A1 burned area (global, NASA LP DAAC)**
- MCD64A1 v061: monthly, **500 m** sinusoidal tiles, from **2000-11-01** to present. It combines 500 m surface reflectance with 1 km active-fire data to estimate a burn date for each pixel. — [CMR MCD64A1](https://cmr.earthdata.nasa.gov/search/collections.json?short_name=MCD64A1)
- VIIRS VNP64A1 v002: monthly 500 m burned area from **2012-03-01**. — [CMR VNP64A1](https://cmr.earthdata.nasa.gov/search/collections.json?short_name=VNP64A1)
- **GFED5** burned area (built from MODIS): monthly netCDF at **0.25° for 2001–2020** and 1° for 1997–2000, licensed **CC BY 4.0**, on Zenodo (DOI 10.5281/zenodo.7668423). Gridded GFED5 files are also served over SFTP on port 1022, with login details published on the site. A GFED5.1 Zenodo release is about 20.5 GB in total. — [Zenodo GFED5 BA](https://zenodo.org/record/7668423); [GFED data page](https://globalfiredata.org/data.html); [Chen et al. 2023, ESSD](https://essd.copernicus.org/articles/15/5227/2023/); [Zenodo GFED5.1](https://zenodo.org/records/16794692)

**Canada: National Burned Area Composite (NBAC), from Natural Resources Canada / Canadian Forest Service via CWFIS**
- The newest release found is **NBAC 1972–2024** (metadata v20250506). It adds 1972–1985 polygons and removes polygons duplicated across consecutive years. The previous release (2024-05-30) covered 1972–2023. The format is **ESRI shapefile**. The required citation is Canadian Forest Service, NBAC, plus Skakun et al. 2022 (*Remote Sensing* 14:3050) and Hall et al. 2020 (*IJWF*, doi 10.1071/WF19201). — [NBAC 1972–2024 metadata (search listing)](https://cwfis.cfs.nrcan.gc.ca/downloads/nbac/NBAC_1972to2024_20250506_shp_metadata.pdf); [CWFIS NBAC download page](https://cwfis.cfs.nrcan.gc.ca/datamart/download/nbac). Note: the direct PDF URL returned HTTP 404 when fetched, so the file may have moved.
- Method: automated 30 m Landsat fire mapping (MAFiMS) and high-quality agency polygons from imagery at ≤30 m. Fires that both miss are filled with the HANDS method on 250–1000 m (MODIS-class) data. The paper reports burned area for 2004–2016 with uncertainty estimates. — [Hall et al. 2020, IJWF](https://publish.csiro.au/wf/WF19201)
- Manual delineation of Landsat imagery became agencies' main post-fire mapping method in **2014**. Agency methods vary. — [Hall et al. 2020 supplement](https://connectsci.au/wf/article-supplement/21746/pdf/wf19201_ac/)
- Skakun et al. 2022 extended NBAC to 1986–2020. Of burned area over that period: about 81% comes from 30 m Landsat change detection, 10% from airborne or <5 m imagery, and 9% mostly from aerial surveys. The mean annual confidence interval is ±9.7%. — [Skakun et al. 2022, Remote Sensing (DOAJ)](https://doaj.org/article/9655f511e5814f25bd4f87a062099842)

**Canada: Canadian National Fire Database (CNFDB / NFDB) points and polygons**
- These are agency-reported fire **polygons (shapefile)** and **points (text file)**. Each comes as a full set and as a large-fire subset (≥200 ha). Start years differ by agency, e.g. BC 1917–2024 and AB 1931–2024, and some have gaps, e.g. NL 1980–2016. — [CWFIS NFDB poly download](https://cwfis.cfs.nrcan.gc.ca/datamart/download/nfdbpoly); [CWFIS NFDB poly metadata](https://cwfis.cfs.nrcan.gc.ca/datamart/metadata/nfdbpoly)
- Licence: the Datamart metadata says **Open Government Licence – Canada**. Ontario data are used under licence with the Ontario Ministry of Natural Resources, and Quebec points to its own open-data licence. The Datamart also has an **End-User Agreement** page for NFDB points and polygons. — [CWFIS NFDB metadata](https://cwfis.cfs.nrcan.gc.ca/datamart/metadata/nfdbpoly); [CWFIS end-user agreement page](https://cwfis.cfs.nrcan.gc.ca/datamart/datarequest/lfdb)

**Canada: CWFIS Fire M3 hotspots and perimeter estimates**
- Daily hotspots (CSV) and season-to-date **fire perimeter estimates** (shapefile, built from buffered hotspots), updated daily from May to September. The yearly archive zips are at `downloads/hotspots/archive/`. One mirror lists files from 2015_hotspots.zip to 2025_perimeters.zip, and some years lack perimeter files. The hotspot metadata states a period of 1994–2020. Licence: Open Government Licence – Canada. NRCan says the products are "not designed for operational purposes". — [CWFIS hotspot archive](https://cwfis.cfs.nrcan.gc.ca/downloads/hotspots/archive/); [Fire M3 buffered metadata](https://cwfis.cfs.nrcan.gc.ca/datamart/metadata/fm3buffered); [NRCan Fire M3 page](https://natural-resources.canada.ca/forests-forestry/wildland-fires/fire-monitoring-mapping-modelling-system)

**NOAA HMS smoke polygons (analyst-drawn)**
- The archive has year folders from **2005 to 2026**: `satepsanone.nesdis.noaa.gov/pub/FIRE/web/HMS/Smoke_Polygons/Shapefile/YYYY/MM/hms_smokeYYYYMMDD.zip`. — [NESDIS HMS Shapefile index](https://satepsanone.nesdis.noaa.gov/pub/FIRE/web/HMS/Smoke_Polygons/Shapefile/)
- The 2005 folder listing shows only **August–December 2005**. — [HMS 2005 index (search listing)](https://satepsanone.nesdis.noaa.gov/pub/FIRE/web/HMS/Smoke_Polygons/Shapefile/2005)
- Domain: the OSPO page says the analysis covers "North America, Hawaii, and the Caribbean". Formats are shapefile, KML, WFS on ArcGIS Online, and a text smoke product. On **19 Jul 2022** the density field changed from numeric codes **[5, 16, 21] to [light, medium, heavy]**. HMS is forward-processing only: gaps are not back-filled, and input-satellite changes can shift performance. Cloud cover can make smoke mapping incomplete. — [NOAA OSPO HMS](https://www.ospo.noaa.gov/products/land/hms.html)
- Analysts draw polygons mainly from GOES-16 and GOES-18 true-colour imagery, with about two major updates a day. Because they cover North America daily, the product is spatially and temporally coarse and "has not been fully validated" against surface observations. — [Liu et al., HMS as surface smoke proxy (Harvard ACMG)](https://acmg.seas.harvard.edu/sites/projects.iq.harvard.edu/files/acmg/files/liut_hms_isd.pdf)

**MERRA-2 aerosol (organic carbon, black carbon, dust, sulfate, AOD)**
- M2TMNXAER v5.12.4: monthly mean, **0.5° × 0.625°**, from **1980-01-01**. Contains column mass and surface concentrations of black carbon, dust, sea salt, sulfate and organic carbon, plus AOD at 550 nm. — [CMR M2TMNXAER](https://cmr.earthdata.nasa.gov/search/collections.json?short_name=M2TMNXAER)
- Each global monthly file is **about 80 MB**, e.g. `MERRA2_400.tavgM_2d_aer_Nx.202001.nc4`. The September 2020 file uses stream **401** instead of 400, so file names are not uniform. — [GES DISC M2TMNXAER 2020 directory](https://goldsmr4.gesdisc.eosdis.nasa.gov/data/MERRA2_MONTHLY/M2TMNXAER.5.12.4/2020/)
- Caveat: biomass-burning emissions change source in **2010**. Before 2010 they are monthly and scaled to GFED v3.1. From 2010 they are daily QFED. A GES DISC expert calls the sudden March–May increase after 2010 "spurious", "primarily due to an artificial change in the source data". — [Earthdata Forum thread](https://forum.earthdata.nasa.gov/viewtopic.php?p=21342); [earlier reply](https://forum.earthdata.nasa.gov/viewtopic.php?p=21006)
- A 2024 GMAO poster lists MERRA-2 biomass burning as "HFED→QFED 2.4r6". — [GMAO poster 2024](https://gmao.gsfc.nasa.gov/pubs/posters/2024/Collow141.pdf)

**CAMS global reanalysis (EAC4), Copernicus/ECMWF**
- 0.75° × 0.75° (about 80 km), 60 levels, **2003–2025**, 3-hourly. A monthly-mean product is also available. The monthly variables include dust AOD at 550 nm and PM2.5. — [ADS EAC4](https://ads.atmosphere.copernicus.eu/datasets/cams-global-reanalysis-eac4); [ADS EAC4 monthly](https://ads.atmosphere.copernicus.eu/datasets/cams-global-reanalysis-eac4-monthly); [CAMS news](https://atmosphere.copernicus.eu/ads-now-contains-20-year-cams-global-reanalysis-eac4-dataset)
- A validation report covering 2003–2025 is dated 31 Mar 2026, and EAC4 is to be extended further during 2026. — [CAMS2_82 validation report](https://atmosphere.copernicus.eu/sites/default/files/publications/CAMS2_82_bis_2025SC1_D82_bis.4.1.1-2026.pdf)
- Licence: CC BY 4.0 replaced the "Licence to use Copernicus Products" on **2 July 2025**. The required credit is "Generated using Copernicus Atmosphere Monitoring Service data [Year] under ... CC BY 4.0". — [ECMWF forum, CAMS tag](https://forum.ecmwf.int/tag/cams); [ECMWF access conditions](https://apps.ecmwf.int/datasets/licences/openifshub)

**Evidence that Canadian smoke matters for US maps**
- Chen, Zhang & Sheng, "Canadian record-breaking wildfires in 2023 and their impact on US air quality" (*Atmospheric Environment* 342:120941), report a daily PM2.5 peak of 258.9 µg/m³. This figure comes from an abstract summary and has not been checked against the original paper. — [NR Fire Science summary](https://nrfirescience.org/node/27537)
- Jaffe et al. estimate about 16,000 extra US emergency-room visits on 2023 smoke days. They also found the smoke reached farther east than usual: Baltimore's smoke PM2.5 averaged 2.0 µg/m³ in 2023, against 0.7 in the previous four years. — [ScienceDaily, Dec 2024](https://www.sciencedaily.com/releases/2024/12/241210115914.htm)
- Cooper et al. (2024, GRL) found that the early-season 2023 fires produced the highest regional surface ozone ever recorded across the northern US. — [NOAA CSL news](https://csl.noaa.gov/news/2024/418_1126.html)

### Inferences
- **Recommended Canada stack for Climatch:**
  - Map layers: (a) FIRMS MODIS C6.1 counts gridded to 0.25° or 0.5° monthly, using the box rather than a US mask; (b) MCD64A1, or GFED5 0.25° (2001–2020) for an easy gridded version; (c) MERRA-2 OCSMASS + BCSMASS (surface organic and black carbon) or OCEXTTAU + BCEXTTAU (carbon AOD); (d) HMS smoke-day counts per grid cell from 2006 onward.
  - Optional overlay: NBAC polygons for the official Canadian burned area.
  - These variable names are the standard MERRA-2 aer_Nx names from the MERRA-2 File Specification. They were not re-checked in this session.
- **Consistent from:**
  - FIRMS MODIS: Jul 2002 if Terra and Aqua are both required. From Nov 2000 if only Terra (MOD14) is used, which is the safest way to keep 2001–2025 uniform.
  - MCD64A1: Nov 2000.
  - HMS: Aug 2005, so complete years start in 2006.
  - MERRA-2 OC/BC: 1980, but treat 2010 as a possible step in spring smoke.
  - NBAC: national method since 1986, mainly Landsat-based, and changing over time.
- Do not use VIIRS 375 m for 2001–2025 trends, because it starts in 2012. Use it only for "recent detail" views.
- HMS polygons show smoke anywhere in the column, so a "smoke day" in HMS does not mean surface PM2.5 was high. Pair HMS with MERRA-2 surface PM2.5, which Climatch already computes, when making surface claims.
- **CAMS EAC4 vs MERRA-2.** EAC4 is a useful second opinion (it assimilates different AOD retrievals and uses GFAS fire emissions) but it starts in 2003, and the ADS needs a free ECMWF account plus per-dataset licence acceptance. That account requirement comes from general knowledge of the new ADS/CDS and from snippets in ECMWF documentation. Prefer MERRA-2, which is NASA, has no extra registration and starts in 1980.

### Gaps
- No file sizes were found for the NBAC or NFDB shapefiles. The CWFIS pages need JavaScript and returned only a title to the fetch tool.
- Whether the NFDB end-user agreement still applies to direct downloads (rather than the OGL-Canada licence) could not be confirmed.
- No official OSPO statement was found on how far north into Canada, or how far south into Central America, analysts draw HMS smoke, or on whether this changed when GOES-16 replaced GOES-13 in late 2017/2018.
- The size of the MERRA-2 2010 artifact over Canada specifically was not found in a primary source. The forum posts are informal, and the primary source is Randles et al. 2017, *J. Climate* 30:6823, Table 1.
- CNFDB/NBAC licences say OGL-Canada, but no exact credit line was retrieved beyond the NBAC citation.

---

## 2. Mexico and the southwest: fires and agricultural burning (Yucatán and Central America smoke into Texas), dust, NO₂ and SO₂ along the border, and heat

### Takeaway
Mexico has no national gridded product as long-running as NASA's, so use global NASA products: FIRMS MODIS fires and MCD64A1 burned area; MERRA-2 dust and carbon; OMI NO₂ and SO₂ (Oct 2004 onward) with TROPOMI (2018 onward) for detail; and MODIS LST (MOD11C3, 0.05°, 2000 onward) for heat. CONAFOR fire polygons exist only for recent years (2014 and 2022 layers were found), and the Mexican drought monitor is fortnightly from 2003 but has no easy bulk download. TEMPO covers Mexico City and the border hourly, but only from Aug 2023.

### Cited Findings

**Fires and agricultural burning (Mexico, Central America to Texas)**
- Smoke from fires in the Yucatán and southern Mexico in spring 2003 reached Texas, Oklahoma and the southeastern US. It gave southern Texas its highest fine-particle concentration since 1998 (NASA-funded study, 2006). — [ScienceDaily 2006](https://www.sciencedaily.com/releases/2006/10/061012185917.htm)
- An ACP 2023 study used satellite data with HYSPLIT and found one Texas event was a "mixed influence of transported smoke plumes from fires in central Mexico, the Yucatán Peninsula and the central US". It says episodic biomass-burning transport can cause O₃ and PM2.5 exceedances in several Texas metro areas. — [ACP 23, 10845 (2023)](https://acp.copernicus.org/articles/23/10845/2023/acp-23-10845-2023.html)
- A report by Ramboll for the TCEQ (Texas Commission on Environmental Quality) argues that fewer than a third of Mexican fires are agricultural. Because it supports exceptional-event claims, treat its framing with caution. — [Ramboll/TCEQ](https://www.tceq.texas.gov/downloads/air-quality/sip/pm/ramboll_mexicanfires.pdf)
- NOAA's daily HMS smoke text bulletins describe smoke moving from northern Central America into the Yucatán and out over the Gulf, and warn that cloud cover can hide smoke from significant fires. — [NOAA OSPO smoke text, 9 May 2026](https://ospo.noaa.gov/smoke-data/2026E091638.html)
- **CONAFOR:** its IDEFOR geoportal hosts fire-polygon layers such as "Concentrado Nacional de Polígonos de Incendios Forestales 2014" and a 2022 layer. — [IDEFOR 2014 layer](https://idefor.cnf.gob.mx/layers/geonode%3Aincendios_2014_v1/pdf_metadata_layer); [IDEFOR 2022 layer](https://idefor.cnf.gob.mx/layers/geonode%3A_2022_incendios_forestales_wgs84/pdf_metadata_layer)
- National Mexican fire totals (number of fires, hectares) for 2001 onward appear as tables in the SEMARNAT environmental compendium, not as a geodatabase. — [SEMARNAT compendio 2021](https://apps1.semarnat.gob.mx:8443/dgeia/compendio_2021/archivos/01_rforestales/d3_rforesta05_01.pdf)

**NO₂ and SO₂ along the border**
- OMNO2d (OMI NO₂, total and tropospheric column, cloud fraction <30%): daily L3, **0.25°**, from **2004-10-01**, collection 004 (Ver 5.0). — [CMR OMNO2d](https://cmr.earthdata.nasa.gov/search/collections.json?short_name=OMNO2d)
- OMSO2e (OMI SO₂ total column, "best pixel"): daily, **0.25°**, from **2004-10-01**, V4. — [CMR OMSO2e](https://cmr.earthdata.nasa.gov/search/collections.json?short_name=OMSO2e)
- **OMI row anomaly:** it began in June 2007 and has since spread to more rows. In NO₂, affected rows are flagged and should be excluded. In SO₂ the artifact shows as positive or negative stripes, and flagged scenes are given a large negative fill value. — [TEMIS OMI row anomaly](https://www.temis.nl/tropomi/no2scd/omi_rowanomaly.php); [NASA OMSO2 Readme](https://so2.gsfc.nasa.gov/Documentation/OMSO2Readme_V130_20160616.htm)
- TROPOMI NO₂ at GES DISC: **Level 2 swath only** (S5P_L2__NO2____HiR, 5.5 × 3.5 km). V2 runs from 2018-04-30, and the earlier 7 × 3.5 km product covers 2018-04-30 to 2019-08-06. There are roughly 3,400–5,100 orbit files a year. — [Earthdata catalog S5P_L2__NO2____HiR](https://www.earthdata.nasa.gov/data/catalog/ges-disc-s5p-l2-no2-hir-2)
- A gridded TROPOMI option exists: HAQAST monthly and annual L3 tropospheric NO₂ at **0.1°**, from George Washington University and built from L2 v2.4. — [data.gov HAQAST TROPOMI NO₂ monthly L3](https://catalog.data.gov/dataset/haqast-sentinel-5p-tropomi-nitrogen-dioxide-no2-global-monthly-level-3-0-1-x-0-1-degree-gr-b42b4)
- **TEMPO** (NASA, geostationary, hourly): the field of regard runs "from Mexico City to the Canadian oil sands" and covers most of Mexico, southern and central Canada, Puerto Rico and southern Alaska. Data are at NASA ASDC (Langley). The L3 NO₂ collection starts **1 Aug 2023** (per the GEE catalogue). — [Earthdata TEMPO overview](https://www.earthdata.nasa.gov/learn/articles/tempo-overview); [NASA SVS 5303](https://svs.gsfc.nasa.gov/5303); [GEE NASA/TEMPO/NO2_L3](https://developers.google.com/earth-engine/datasets/catalog/NASA_TEMPO_NO2_L3)

**Dust and heat**
- MERRA-2 M2TMNXAER includes dust column and surface mass and total AOD, monthly at 0.5° × 0.625° from 1980 (see section 1). — [CMR M2TMNXAER](https://cmr.earthdata.nasa.gov/search/collections.json?short_name=M2TMNXAER)
- MOD11C3 v061 (Terra LST): monthly, **0.05° CMG (about 5.6 km)**, from **2000-02-01**, composited from daily MOD11C1. — [CMR MOD11C3](https://cmr.earthdata.nasa.gov/search/collections.json?short_name=MOD11C3)
- MERRA-2 M2TMNXSLV (monthly single-level: near-surface temperature and wind, etc.) is at 0.5° × 0.625° from 1980. It is a reanalysis air-temperature alternative to LST for heat. — [CMR M2TMNXSLV](https://cmr.earthdata.nasa.gov/search/collections.json?short_name=M2TMNXSLV)

**Mexican drought monitor (Monitor de Sequía de México, MSM, SMN/CONAGUA)**
- The MSM is adapted from the North American Drought Monitor (NADM) methodology and was introduced in **2003**. — [Tecnología y Ciencias del Agua article](https://www.revistatyca.org.mx/index.php/tyca/article/download/1994/1616/6911)
- A Tlaxcala state atlas compiled the MSM database at **fortnightly** steps from January 2003 to September 2025, sourced from the SMN. — [Atlas Tlaxcala, sequías](https://atlas.tlaxcala.gob.mx/data/pdf/TLAX-pel-sequias-251105-1520.pdf)

### Inferences
- **Recommended Mexico and southwest stack:**
  - Fires: FIRMS MODIS C6.1 for Mexico and Central America, a box down to 15°N or ideally 10°N to include Guatemala and Honduras, the main sources of spring smoke reaching Texas. Plus MCD64A1 or GFED5 burned area.
  - Smoke: MERRA-2 OC/BC and total AOD for April–May transport, and HMS smoke-day counts over South Texas.
  - Dust: MERRA-2 DUSMASS25 or DUEXTTAU for Chihuahuan Desert dust into New Mexico and west Texas.
  - Gases: OMI NO₂ and SO₂ 0.25° for border pairs (Tijuana–San Diego, Mexicali–Imperial, Ciudad Juárez–El Paso, Monterrey/Saltillo, the Tula–Mexico City power-plant SO₂).
  - Heat: MOD11C3 LST.
- Climatch already uses OMI NO₂ at 0.25°, so extending it to Mexico only means widening the subset box. No new product is needed.
- SO₂ from OMSO2e is noisy at 0.25° daily. For a 2005–2025 map, use multi-year means, and treat single months as unreliable outside large point sources. This is based on the row-anomaly stripes plus general knowledge of OMI SO₂ noise.
- TROPOMI L2 is too large for a local demo: thousands of orbit files a year, each typically hundreds of MB (this per-file size is general knowledge, not checked here). Use the HAQAST 0.1° monthly L3, or TEMPO L3 for a "2023+ hourly" showcase. Neither covers 2001–2017.
- The MSM and CONAFOR products are national and do not match US or Canadian products at the border. Use them only for country-specific context text, not for map layers.

### Gaps
- No bulk download URL was found for MSM shapefiles, 2003 onward, on smn.conagua.gob.mx. A third-party portal has Jalisco 2007–2016 only.
- No CONAFOR fire polygons or points before 2014 were found in IDEFOR.
- No study was found that quantifies NO₂ or SO₂ transport across the US–Mexico border from satellites. This session found only fire-smoke studies.
- No SMN Mexico gridded temperature product was assessed. Daymet (section 3) and MERRA-2 cover Mexico, and MODIS LST covers the heat question.
- Whether GES DISC hosts an official monthly OMNO2 L3 product, rather than only daily, was not confirmed. Monthly maps can be made with Giovanni or by averaging the daily files.

---

## 3. Cross-border water and snow: snow cover and SWE, GRACE over the Great Lakes and Canada, and North American drought indices

### Takeaway
For snow across all three countries, use ERA5-Land SWE (0.1°, monthly, Copernicus, CC BY 4.0), Daymet V4 SWE (1 km, daily, includes Canada and Mexico but is very large), or MOD10CM snow-cover fraction (0.05°, monthly, from 2000). SNODAS covers the US only. GRACE/GRACE-FO JPL mascons are global, but the native resolution is about 3°, with an 11-month gap from Jul 2017 to May 2018. A gridded monthly NADM (2.5 km, Nov 2001 onward) exists, but the only access found is Google Earth Engine. NOAA also publishes NADM shapefiles.

### Cited Findings

**Snow**
- **SNODAS** (NSIDC G02158): daily, 1 km, from **30 Sep 2003**. Its bounding box is the **contiguous US**, so it covers no Canada or Mexico. It is a model output, "not recommended" for quantitative water budgets, and NSIDC has moved it to a "Basic" service level. — [NSIDC G02158](https://nsidc.org/data/g02158)
- **Daymet V4 / V4R1** (NASA ORNL DAAC): daily, **1 km**, for "continental North America (Mexico, United States, Canada)", plus Hawaii and Puerto Rico. Includes **swe** (kg m⁻²). Coverage runs from 1 Jan 1980 to the latest full calendar year. Files are CF netCDF in a Lambert Conformal Conic projection. — [Daymet Daily V4R1 guide](https://daac.ornl.gov/DAYMET/guides/Daymet_Daily_V4R1.html); [Daymet Daily V4 guide](https://daac.ornl.gov/DAYMET/guides/Daymet_Daily_V4.html)
- **ERA5-Land monthly means** (Copernicus C3S): **0.1°** grid (native about 9 km). SWE is in m of water equivalent. Coverage is from **1950**, updated monthly with a 2–3 month delay. — [CDS ERA5-Land monthly](https://cds.climate.copernicus.eu/datasets/reanalysis-era5-land-monthly-means); [U Toronto snow products of ERA5-Land](https://nordata.physics.utoronto.ca/en/annexes-datasets-descriptions/75-snow/snow-products-of-era5-land)
- **MOD10CM** v61 (Terra snow cover): monthly mean snow-cover extent, **0.05° CMG**, from **2000-03-01**, at NSIDC DAAC. — [CMR MOD10CM](https://cmr.earthdata.nasa.gov/search/collections.json?short_name=MOD10CM)
- **CMC Daily Snow Depth Analysis** (NSIDC-0447, Environment and Climate Change Canada's Canadian Meteorological Centre, archived by NASA NSIDC): Northern Hemisphere, **24 km** polar stereographic, daily snow depth plus monthly means and estimated SWE, from **1 Aug 1998**. The end date is listed as 31 Dec 2020 on the NSIDC page, but older sources say 2018 or 2014. It is built from in-situ SYNOP and METAR snow-depth reports. — [NSIDC-0447](https://nsidc.org/data/nsidc-0447)
- **IMS** (NOAA/USNIC, NSIDC G02156): daily Northern Hemisphere snow and ice at **1, 4 and 24 km**, from **5 Feb 1997**, as ASCII, GeoTIFF or NetCDF. It is "operational", with no guarantee of timely delivery. It is also served on NOAA PolarWatch ERDDAP at 4 km. — [NSIDC G02156](https://nsidc.org/data/g02156/versions/1); [PolarWatch ERDDAP usnic_ims_4km](https://polarwatch.noaa.gov/erddap/griddap/usnic_ims_4km)
- **AMSR-E/AMSR2 unified SWE** (AU_DySno, NSIDC): daily, **25 km** EASE-Grid, from 2002-06-01 to 2025-08-31. The earlier AE_DySno runs from 2002-06-19 to 2011-10-03. — [CMR AU_DySno / AE_DySno](https://cmr.earthdata.nasa.gov/search/collections.json?short_name=AU_DySno&short_name=AE_DySno)

**GRACE / GRACE-FO**
- JPL mascons are on a **0.5° grid**, but the native resolution is **3°** (equal-area caps). The format is netCDF. — [JPL GRACE mascons](https://grace.jpl.nasa.gov/data/get-data/jpl_global_mascons/)
- The GRACE RL06 mascons covered Apr 2002 to Jun 2017. GRACE-FO data start in May 2018, so there is a gap between the missions. — [PO.DAAC RL06 v1.0 release](https://podaac.jpl.nasa.gov/announcements/2018-12-11_JPL_Tellus_GRACE_Mascon_RL06_v1.0_Data_Release)
- RL06.3 (Sep 2024): TELLUS_GRAC-GRFO_MASCON_GRID_RL06.3_V4 (DOI 10.5067/TEMSC-3MJ634), with a CRI-filtered variant (10.5067/TEMSC-3JC634). PO.DAAC recommends the podaac-data-subscriber tool, which uses Earthdata Login. — [PO.DAAC RL06.3 announcement](https://podaac.jpl.nasa.gov/announcements/2024-09-12-Release-of-GRACE-FO-JPL-RL06.3-for-L2-3-and-MASCON-Data-Sets)

**Drought indices covering North America**
- **NADM** is produced jointly by Canadian, Mexican and US authors. A gridded **2.5 km monthly** raster (each cell takes the current NADM category) runs from **2001-11-01** to present. It is produced by NOAA NCEI and NIDIS and available in Earth Engine. NOAA data carry no copyright restrictions. — [GEE community catalog: NADM](https://gee-community-catalog.org/projects/nadm/)
- NADM **shapefiles (zip)** are on the NOAA NCEI NIDIS FTP and linked from drought.gov. — [NCEI NIDIS shapefiles readme](https://www.ncei.noaa.gov/pub/data/nidis/shapefiles/readme.txt); [drought.gov NADM](https://www.drought.gov/data-maps-tools/north-american-drought-monitor-nadm)
- The US-only USDM grid (500 m) is "mainly for display" and cannot be matched directly to USDM statistics. — [USDM metadata](https://www.droughtmonitor.unl.edu/DmData/Metadata.aspx)

### Inferences
- **Best single SWE layer for a 2001–2025 three-country map: ERA5-Land monthly SWE.** It is one model, has no border step, the CC BY 4.0 licence applies to C3S data from 2 Jul 2025, and it needs a free ECMWF/CDS account.
  - A NASA-only alternative is Daymet SWE, but 1 km daily data for North America is far too big for a local demo. Use the Daymet monthly product or THREDDS (NetCDF Subset Service) spatial striding, or aggregate to 0.25° offline. The Daymet monthly product was not confirmed in this session.
  - For snow *cover*, MOD10CM is NASA, uniform and small after coarsening.
- Keep SNODAS for US-only detail. It ends at the 49th parallel and the Rio Grande, so the map would show an artificial edge.
- **GRACE over the Great Lakes:** at a native 3° (about 330 km), a mascon over the Great Lakes mixes lake level, groundwater and soil moisture on both sides of the border. Present it as a regional signal, not a lake-specific one. Show the Jul 2017 to May 2018 gap explicitly in time series.
  - Climatch already downloads global mascon files (the whole product is global), so no new download is needed, only a wider crop.
- **Drought:** the gridded NADM in Earth Engine is the only seamless three-country drought layer found. Getting it outside Earth Engine is unverified: either export from GEE (needs a Google Earth Engine account, which is a separate registration) or rasterize the NCEI shapefiles.

### Gaps
- No direct non-GEE download of the gridded NADM raster from NCEI was confirmed.
- The NCEI NADM shapefile archive start date was not confirmed (2002 or 2003?).
- The current end date of NSIDC-0447 (CMC snow depth) is inconsistent across sources: 2014, 2018 and 2020.
- File sizes for Daymet NA tiles and the JPL mascon netCDF were not found.
- No study was found that quantifies GRACE signal leakage across the Great Lakes or the border.

---

## 4. Long-range transport into the US: Saharan dust into the Gulf Coast and Florida, and Asian pollution reaching the West Coast

### Takeaway
Saharan dust is best shown with MERRA-2 dust AOD or surface dust mass (daily or monthly, June–August), checked against MODIS Aqua or VIIRS Deep Blue AOD. Asian pollution is best shown with MOPITT CO (Mar 2000 to early 2025) and MERRA-2 sulfate and AOD over the North Pacific in spring. Both need a box extending well beyond 170–50°W: east to about 20°W for the Saharan Air Layer, and west to about 120°E for Asia.

### Cited Findings
- **Saharan dust in Miami:** more than half of surface dust mass is in particles <2.1 µm. MERRA-2 puts too much dust in the larger size bins, though the vertical distribution of dust mass is about right. — [Kramer et al. 2020, ACP 20:10047](https://acp.copernicus.org/articles/20/10047/2020/)
- MERRA-2 "adequately captures day-to-day Saharan dust variability" in Miami, because it assimilates AOD. — [AMS 2018 abstract J9.5](https://ams.confex.com/ams/98Annual/webprogram/Paper335459.html)
- A NASA case study compared daily MERRA-2 PM2.5 with EPA PM2.5 at Florida stations during extreme African dust events. — [NASA NTRS 20220018436](https://ntrs.nasa.gov/citations/20220018436)
- **Satellite AOD products:**
  - MODIS Aqua MYD08_M3 (1° monthly, from 2002-07-01) and Terra MOD08_M3 (1° monthly, from 2000-02-01). — [CMR MYD08_M3 / MOD08_M3](https://cmr.earthdata.nasa.gov/search/collections.json?short_name=MYD08_M3&short_name=MOD08_M3)
  - VIIRS SNPP Deep Blue L3 monthly AERDB_M3_VIIRS_SNPP v2.1: 1° × 1°, from 2012-03-01. A cell needs at least 3 valid days. — [CMR AERDB_M3_VIIRS_SNPP](https://cmr.earthdata.nasa.gov/search/collections.json?short_name=AERDB_M3_VIIRS_SNPP)
  - OMI OMAERUVd (near-UV AOD and single-scattering albedo, sensitive to absorbing dust and smoke): daily 1°, from 2004-10-01. — [CMR OMAERUVd](https://cmr.earthdata.nasa.gov/search/collections.json?short_name=OMAERUVd)
- **Asian pollution:** a 2000–2019 climatology of high-CO events at 400 hPa over the North Pacific found most episodes occur in spring, with China the main source. MODIS AOD shows the Asian outflow plume splitting, with a northern branch reaching the western US. — [ACP 22:7193 (2022)](https://acp.copernicus.org/articles/22/7193/2022/)
- MOPITT showed four major trans-Pacific Asian pollution events in spring 2001, consistent with aircraft data and GEOS-Chem. — [U Toronto MOPITT trans-Pacific page](https://www.atmosp.physics.utoronto.ca/people/nichitiu/MOPITT/IntercontinentalCOtransport.html)
- **MOPITT** MOP03JM V010: monthly gridded CO profiles and total column (Terra), from **2000-03-03** with time_end **2025-02-01** in CMR, at NASA LaRC ASDC. — [CMR MOP03JM](https://cmr.earthdata.nasa.gov/search/collections.json?short_name=MOP03JM)

### Inferences
- **Best map variables:**
  - Saharan dust: MERRA-2 **DUEXTTAU** (dust AOD at 550 nm) for column transport and **DUSMASS25** (surface PM2.5 dust) for health relevance, as June–August composites or daily event maps.
  - Asian transport: MOPITT **total column CO** (MOP03JM, 1° monthly) and MERRA-2 **SO4CMASS / TOTEXTTAU** over the Pacific, as March–May composites.
  - The variable names are standard MERRA-2 and MOPITT names from general knowledge and were not re-checked in this session.
- MERRA-2 is the cleanest choice: one global grid, 1980 onward, and the same file Climatch already uses. Only the crop changes. A single global M2TMNXAER file is 80 MB, so for transport maps it can be easier to keep global monthly files for selected variables via OPeNDAP or the GES DISC subsetter rather than three regional boxes.
- MOPITT's CMR end date of Feb 2025 means 2025 is incomplete. AIRS CO could fill it, but that was not assessed.
- **Satellite AOD as a check:** MODIS Aqua or Terra 1° L3 (2000 onward) is the 2001–2025 observational counterpart. VIIRS Deep Blue starts in 2012. All three are NASA LAADS products, need an Earthdata login, and are tiny at 1°.

### Gaps
- No peer-reviewed study was found pairing MERRA-2 dust AOD with surface PM2.5 specifically along the northern Gulf Coast (Texas to Florida Panhandle), as opposed to Miami.
- Lin et al. 2012, on Asian ozone in the western US using MOPITT CO as an early warning, came up in search but its primary URL was not retrieved.
- Whether OMAERUVd includes the UV Aerosol Index variable (often used for smoke and dust tracking) was not confirmed from CMR. The CMR title mentions only AOD and SSA.
- The VNP64A1 CMR summary was read (by a summarizer) as saying Suomi NPP VIIRS data delivery ended in November 2026. This was not verified and could affect VIIRS-based products from 2026.

---

## 5. Consistency: which datasets are one product across all three countries, with no jump at the border?

### Takeaway
Single products with no border edge: MERRA-2, CAMS EAC4, ERA5-Land, FIRMS MODIS/VIIRS, MCD64A1/GFED5, OMI NO₂/SO₂, MODIS LST, snow and AOD, MOPITT, GRACE mascons, IMS, CMC snow depth, Daymet (one North America domain), TEMPO (2023 onward), and the gridded NADM. National products (NBAC/CNFDB, CONAFOR, MSM, SNODAS, USDM, MTBS) stop at the border and use different methods, so they should be overlays, not continuous layers.

### Cited Findings
- **Global (no border):**
  - MERRA-2 M2TMNXAER and M2TMNXSLV — [CMR](https://cmr.earthdata.nasa.gov/search/collections.json?short_name=M2TMNXAER)
  - OMNO2d and OMSO2e — [CMR](https://cmr.earthdata.nasa.gov/search/collections.json?short_name=OMNO2d)
  - MOD11C3, MOD10CM and MOD08_M3 — [CMR](https://cmr.earthdata.nasa.gov/search/collections.json?short_name=MOD11C3)
  - MCD64A1 — [CMR](https://cmr.earthdata.nasa.gov/search/collections.json?short_name=MCD64A1)
  - FIRMS — [FIRMS](https://firms.modaps.eosdis.nasa.gov/download/)
  - CAMS EAC4 — [ADS](https://ads.atmosphere.copernicus.eu/datasets/cams-global-reanalysis-eac4)
  - ERA5-Land — [CDS](https://cds.climate.copernicus.eu/datasets/reanalysis-era5-land-monthly-means)
  - GRACE mascons — [JPL](https://grace.jpl.nasa.gov/data/get-data/jpl_global_mascons/)
- **Hemispheric or continental:**
  - IMS (Northern Hemisphere) — [NSIDC G02156](https://nsidc.org/data/g02156/versions/1)
  - CMC snow depth (Northern Hemisphere) — [NSIDC-0447](https://nsidc.org/data/nsidc-0447)
  - Daymet (one continental North America domain) — [ORNL DAAC](https://daac.ornl.gov/DAYMET/guides/Daymet_Daily_V4R1.html)
  - HMS ("North America, Hawaii, and the Caribbean") — [OSPO HMS](https://www.ospo.noaa.gov/products/land/hms.html)
  - TEMPO (Mexico City to the Canadian oil sands) — [Earthdata TEMPO](https://www.earthdata.nasa.gov/learn/articles/tempo-overview)
  - Gridded NADM (CA/US/MX authors) — [GEE community catalog](https://gee-community-catalog.org/projects/nadm/)
- **National or border-limited:**
  - SNODAS covers the contiguous US only — [NSIDC G02158](https://nsidc.org/data/g02158)
  - NBAC and CNFDB are Canadian agency-based, and methods vary by agency and year — [Hall et al. 2020](https://publish.csiro.au/wf/WF19201)
  - The Mexican drought monitor was adapted from NADM and started in 2003 — [TyCA](https://www.revistatyca.org.mx/index.php/tyca/article/download/1994/1616/6911)
  - CONAFOR polygons were found for single years only (2014, 2022) — [IDEFOR](https://idefor.cnf.gob.mx/layers/geonode%3Aincendios_2014_v1/pdf_metadata_layer)

### Inferences
- **Time consistency differs from space consistency:**
  - MERRA-2 is spatially seamless but has the 2010 biomass-burning source change.
  - OMI is seamless but degrades from 2007 because of the row anomaly.
  - FIRMS MODIS changes at the Terra→Terra+Aqua step in July 2002.
  - HMS starts in 2005 and changed its density encoding in 2022.
  - GRACE has the 2017–18 gap.
  - The trend charts should flag these breaks, much as Climatch already handles data caveats.
- HMS is "continental" but analyst-drawn. Cloudiness and analyst workload differ across regions, so smoke frequency over remote northern Canada is likely under-recorded relative to the US. This is an inference from the coarse-coverage and cloud caveats, not a measured bias.
- **National products are best kept as overlays and context:** NBAC for "official burned area in Canada" and the MSM for Mexican drought categories. US equivalents (MTBS, USDM) are not directly comparable to them.

### Gaps
- No published comparison of FIRMS detection density across the US–Canada border, for example from viewing-geometry differences at high latitude, was found.
- No source documents the HMS analysis domain boundary or changes to it over 2005–2025.

---

## 6. Grid and box: native grids, a sensible North America box, and the size of monthly means for 2001–2025

### Takeaway
At 15–72°N, 170–50°W, coarse gridded products are tiny once subset: MERRA-2 is about 27 MB per variable for 300 months, OMI about 112 MB per variable, and GRACE about 28 MB. The 0.05° MODIS CMG products and 0.1° ERA5-Land are close to 1–1.6 GB per variable and should be coarsened to 0.25° (about 130 MB). Daily OMI, TROPOMI L2, Daymet 1 km daily and MCD64A1 500 m tiles are too big for a local demo unless aggregated on the server or offline.

### Cited Findings
- **Native grids and start dates:**
  - MERRA-2: 0.5° × 0.625°, from 1980 — [CMR](https://cmr.earthdata.nasa.gov/search/collections.json?short_name=M2TMNXAER)
  - OMI L3: 0.25°, daily, from Oct 2004 — [CMR](https://cmr.earthdata.nasa.gov/search/collections.json?short_name=OMNO2d)
  - MOD11C3 and MOD10CM: 0.05° CMG, monthly — [CMR](https://cmr.earthdata.nasa.gov/search/collections.json?short_name=MOD11C3)
  - MOD08_M3 and MYD08_M3: 1°, monthly — [CMR](https://cmr.earthdata.nasa.gov/search/collections.json?short_name=MOD08_M3)
  - AERDB_M3_VIIRS_SNPP: 1°, monthly, from 2012 — [CMR](https://cmr.earthdata.nasa.gov/search/collections.json?short_name=AERDB_M3_VIIRS_SNPP)
  - MCD64A1: 500 m SIN, monthly — [CMR](https://cmr.earthdata.nasa.gov/search/collections.json?short_name=MCD64A1)
  - GFED5: 0.25°, monthly, 2001–2020 — [Zenodo](https://zenodo.org/record/7668423)
  - GRACE: 0.5° grid, about 3° native — [JPL](https://grace.jpl.nasa.gov/data/get-data/jpl_global_mascons/)
  - ERA5-Land: 0.1° — [CDS](https://cds.climate.copernicus.eu/datasets/reanalysis-era5-land-monthly-means)
  - CAMS EAC4: 0.75° — [ADS](https://ads.atmosphere.copernicus.eu/datasets/cams-global-reanalysis-eac4)
  - IMS: 1, 4 or 24 km — [NSIDC](https://nsidc.org/data/g02156/versions/1)
  - CMC snow depth: 24 km — [NSIDC](https://nsidc.org/data/nsidc-0447)
  - AMSR SWE: 25 km EASE — [CMR](https://cmr.earthdata.nasa.gov/search/collections.json?short_name=AU_DySno)
  - Daymet: 1 km LCC — [ORNL](https://daac.ornl.gov/DAYMET/guides/Daymet_Daily_V4R1.html)
  - HAQAST TROPOMI L3: 0.1° — [data.gov](https://catalog.data.gov/dataset/haqast-sentinel-5p-tropomi-nitrogen-dioxide-no2-global-monthly-level-3-0-1-x-0-1-degree-gr-b42b4)
- **Measured file size:** a global MERRA-2 M2TMNXAER monthly file is about **80 MB**. — [GES DISC directory](https://goldsmr4.gesdisc.eosdis.nasa.gov/data/MERRA2_MONTHLY/M2TMNXAER.5.12.4/2020/)
- **Access and registration:**
  - Earthdata Login: FIRMS archive (or an emailed code), GES DISC, LP DAAC, NSIDC, LAADS, PO.DAAC and ASDC. — [FIRMS](https://firms.modaps.eosdis.nasa.gov/download/); [PO.DAAC](https://podaac.jpl.nasa.gov/announcements/2024-09-12-Release-of-GRACE-FO-JPL-RL06.3-for-L2-3-and-MASCON-Data-Sets)
  - No login: HMS (plain HTTPS index) — [NESDIS](https://satepsanone.nesdis.noaa.gov/pub/FIRE/web/HMS/Smoke_Polygons/Shapefile/); CWFIS NBAC, NFDB and Fire M3 (plain downloads, OGL-Canada) — [CWFIS](https://cwfis.cfs.nrcan.gc.ca/downloads/hotspots/archive/); IMS on ERDDAP — [PolarWatch](https://polarwatch.noaa.gov/erddap/griddap/usnic_ims_4km)
  - Separate registration: CAMS and ERA5-Land need an **ECMWF account** — [ECMWF forum ADS](https://forum.ecmwf.int/tag/ads). The gridded NADM is in Google Earth Engine — [GEE catalog](https://gee-community-catalog.org/projects/nadm/). GFED5 SFTP uses published credentials — [GFED](https://globalfiredata.org/data.html).

### Inferences
**Computed sizes** for the 15–72°N, 170–50°W box. These are uncompressed float32 unless noted, one variable, monthly means. They were calculated in this session from the native grids above, not taken from a source. NetCDF4 compression typically shrinks them by 2–4×, and much of the box is ocean.

| Product (grid) | Grid cells in box | Per month | Months | Total per variable |
|---|---|---|---|---|
| MERRA-2 (0.5° × 0.625°) | 115 × 193 = 22,195 | 89 KB | 300 (2001–2025) | **~27 MB** |
| CAMS EAC4 monthly (0.75°) | 77 × 161 = 12,397 | 50 KB | 276 (2003–2025) | **~14 MB** |
| OMI NO₂/SO₂ as monthly means (0.25°) | 229 × 481 = 110,149 | 441 KB | 255 (Oct 2004–2025) | **~112 MB** |
| OMI daily (0.25°), if downloaded raw | same | 441 KB/day | ~7,760 days | **~3.4 GB** (aggregate to monthly before storing) |
| MOD11C3 LST (0.05°, uint16) | 1141 × 2401 = 2.74 M | 5.5 MB | 300 | **~1.6 GB** (coarsen) |
| MOD10CM snow (0.05°, uint8) | same | 2.7 MB | 300 | **~0.8 GB** (coarsen) |
| Any 0.05° product coarsened to 0.25° | 110,149 | 441 KB | 300 | **~132 MB** |
| ERA5-Land (0.1°) | 571 × 1201 = 685,771 | 2.7 MB | 300 | **~0.8 GB** (or about half as packed int16; coarsen to 0.25° → ~130 MB) |
| MODIS/MOPITT 1° L3 | 58 × 121 = 7,018 | 28 KB | 300 | **~8 MB** |
| VIIRS Deep Blue 1° | 7,018 | 28 KB | 166 (2012–2025) | **~5 MB** |
| GRACE mascon (0.5°) | 115 × 241 = 27,715 | 111 KB | ~250 (Apr 2002–2025 minus gaps) | **~28 MB** |
| GFED5 BA (0.25°) | 110,149 | 441 KB | 240 (2001–2020) | **~106 MB** |
| TROPOMI HAQAST L3 (0.1°) | 685,771 | 2.7 MB | ~92 (May 2018–2025) | **~250 MB** |

- **Raw download vs subset, MERRA-2:** 300 global monthly files × 80 MB = about **24 GB**. Using the GES DISC subsetter or OPeNDAP for the box and about 6 variables (TOTEXTTAU, DUEXTTAU, DUSMASS25, OCSMASS, BCSMASS, SO4SMASS) gives about **160 MB uncompressed**. Always subset on the server.
- **FIRMS:** prefer the country or bbox CSVs, then bin them into monthly counts on the 0.25° or 0.5° grid locally. The raw CSV size for Canada and Mexico over 2001–2025 was not measured.
- **Box choice:**
  - 15–72°N, 170–50°W is fine for "neighbours" maps.
  - Move the south edge to about 10°N if Guatemala and Honduras spring smoke sources should show.
  - Long-range transport maps need separate wider boxes: Saharan dust about 0–40°N, 100–15°W; Asian outflow about 20–60°N, 100°E–110°W, which crosses the dateline and needs longitude wrapping.
- **Too big for a local demo without aggregation:** MCD64A1 500 m tiles (use GFED5 0.25° or aggregate), Daymet 1 km daily, TROPOMI L2 swaths, daily OMI raw and IMS 1 km. Use the 24 km IMS, monthly CMC or ERA5-Land instead.

### Gaps
- No published per-file sizes were found for MOD11C3, MOD10CM, OMNO2d, the JPL mascon netCDF, the ERA5-Land monthly GRIB/netCDF, NBAC or NFDB shapefiles, or the FIRMS country-year CSVs. All sizes in the table are computed estimates.
- Whether the GES DISC subsetter (or Harmony) currently supports a bounding box plus variable subset for M2TMNXAER was not re-checked in this session. It did historically.
