# Climate drivers from outside the US: index time series to set beside a place's 2001–2025 monthly records

Research date: 2026-11-15. All URLs were fetched or found by search on that date. Values quoted from data files are as fetched that day. NOAA revises recent values: CPC says the latest ONI and RONI seasons can change for up to two months.

Two facts from this research change older advice:
1. Since **1 February 2026**, NOAA CPC's official ENSO index is the **Relative Oceanic Niño Index (RONI)**, not the ONI. The legacy ONI files are still updated.
2. **Climate.gov is archived as of 25 June 2025** and is no longer updated. Its ENSO blog pages and maps are still online and citable, but they are not maintained.

---

## 1. Which index files to download (source, URL, format, 2001–2025 coverage, update cadence, licence)

### Takeaway
Every index needed is free as a plain-text monthly or seasonal file from NOAA CPC, NCEI or PSL, and each covers 2001–2025 completely. Use these: RONI (with the ONI as a check) for ENSO, MEI.v2 as a second ENSO view, the NCEI ERSSTv5 PDO, the NCEI ERSSTv5 AMO (which is not detrended, so handle with care), and the CPC monthly NAO, PNA and AO. Do not use the PSL Kaplan AMO, which stopped in January 2023, or the PSL copy of the JISAO PDO, which is labelled as using data from 1948 to 2002.

### Cited Findings

**ENSO**
- **RONI (official since 1 Feb 2026).** Text file: `https://www.cpc.ncep.noaa.gov/data/indices/RONI.ascii.txt`. Columns are `SEAS YR ANOM`, one row for each overlapping 3-month season (DJF … NDJ). It covers 1950 to the latest season; the last row on 2026-11-15 was ASO 2026. — [CPC RONI.ascii.txt](https://www.cpc.ncep.noaa.gov/data/indices/RONI.ascii.txt); [NWS PNS 26-05](https://www.weather.gov/media/notification/pdf_2026/pns26-05_Relative_ONI.pdf)
- **Monthly relative Niño‑3.4 (the input to RONI):** `https://www.cpc.ncep.noaa.gov/data/indices/Rnino34.ascii.txt` (ERSSTv6, 1991–2020 base). — [NWS PNS 26-05](https://www.weather.gov/media/notification/pdf_2026/pns26-05_Relative_ONI.pdf); [CPC data/indices listing](https://www.cpc.ncep.noaa.gov/data/indices/)
- **Legacy ONI:** `https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt`. Columns are `SEAS YR TOTAL ANOM`, from DJF 1950 to ASO 2026, and the directory listing says it is ERSSTv6. The monthly Niño‑3.4 input to the ONI is `detrend.nino34.ascii.txt`. — [CPC oni.ascii.txt](https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt); [CPC data/indices listing](https://www.cpc.ncep.noaa.gov/data/indices/)
- **Niño 3.4 from OISST v2.1** (satellite-era SST, monthly): `https://www.cpc.ncep.noaa.gov/data/indices/sstoi.indices`. A relative version on a 1991–2020 base is `rel_mthsst9120.txt`. — [CPC data/indices listing](https://www.cpc.ncep.noaa.gov/data/indices/)
- RONI and ONI pages are "updated by the 5th of each month", and values "may change up to two months after first posting". — [CPC ONI v6 page](https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/oni/v6/); [CPC RONI page](https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/)
- **MEI.v2** (PSL): `https://psl.noaa.gov/enso/mei/data/meiv2.data`, now based on JRA‑3Q. The older JRA‑55 version at `datajra55/meiv2.data` is discontinued. It is bimonthly (Dec–Jan … Nov–Dec), starts in 1979, uses a 1980–2018 base, and is "generally updated by the 10th of each month". PSL labels it "a Research and Development Application". — [PSL MEI.v2](https://psl.noaa.gov/enso/mei/)

**Pacific Decadal Oscillation (PDO)**
- **NCEI ERSSTv5 PDO:** `https://www.ncei.noaa.gov/pub/data/cmb/ersst/v5/index/ersst.v5.pdo.dat`. It has one title line and one header line, then one row per year with 12 monthly values. Missing values are `99.99`. It runs from Jan 1854 to Oct 2026, and the file was modified 2026-11-03, so it is updated monthly. — [NCEI PDO file](https://www.ncei.noaa.gov/pub/data/cmb/ersst/v5/index/ersst.v5.pdo.dat); [NCEI ERSSTv5 index directory](https://www.ncei.noaa.gov/pub/data/cmb/ersst/v5/index/)
- The PSL climate-indices list still points its "PDO" entry to the JISAO (Mantua) series and labels it "UPDATED: Using data from 1948 to 2002". Do not use it for 2001–2025. — [PSL climate indices list](https://psl.noaa.gov/data/climateindices/list/)

**Atlantic Multidecadal Oscillation (AMO)**
- **PSL AMO (Kaplan SST, detrended; smoothed and unsmoothed):** the files are `amon.us.data`, `amon.sm.data`, `amon.us.long.data` and others. The page says the index "is not currently updated" because Kaplan SST stopped, and the data end in **January 2023**. The page itself points to the NCEI ERSSTv5 AMO instead. — [PSL AMO page](https://psl.noaa.gov/data/timeseries/AMO/)
- **NCEI ERSSTv5 AMO:** `https://www.ncei.noaa.gov/pub/data/cmb/ersst/v5/index/ersst.v5.amo.dat`. The header reads "ERSST AMO (North Atlantic 0-60N SSTA) Index", and the columns are `Year month SSTA`. It runs from 1854-01 to 2026-10 and was updated 2026-11-03. Its 2001 monthly values are about 0.1–0.5 and its 2025 values about 0.7–1.0. — [NCEI AMO file](https://www.ncei.noaa.gov/pub/data/cmb/ersst/v5/index/ersst.v5.amo.dat)
- NCAR's AMO removes the global mean, so its values differ from PSL's. — [PSL AMO page](https://psl.noaa.gov/data/timeseries/AMO/)

**NAO, PNA and AO (CPC, monthly)**
- **NAO:** `https://www.cpc.ncep.noaa.gov/products/precip/CWlink/pna/norm.nao.monthly.b5001.current.ascii`. It has three columns (year, month, value) and no header, and runs from 1950‑01 to 2026‑10. — [CPC NAO monthly file](https://www.cpc.ncep.noaa.gov/products/precip/CWlink/pna/norm.nao.monthly.b5001.current.ascii)
- **PNA:** `https://www.cpc.ncep.noaa.gov/products/precip/CWlink/pna/norm.pna.monthly.b5001.current.ascii`. Same layout, 1950‑01 to 2026‑10. — [CPC PNA monthly file](https://www.cpc.ncep.noaa.gov/products/precip/CWlink/pna/norm.pna.monthly.b5001.current.ascii)
- **AO:** `https://www.cpc.ncep.noaa.gov/products/precip/CWlink/daily_ao_index/monthly.ao.index.b50.current.ascii`. Same layout, 1950‑01 to 2026‑10. — [CPC AO monthly file](https://www.cpc.ncep.noaa.gov/products/precip/CWlink/daily_ao_index/monthly.ao.index.b50.current.ascii); [CPC AO page](https://www.cpc.ncep.noaa.gov/products/precip/CWlink/daily_ao_index/ao.shtml)
- **All 10 CPC patterns in one file** (NAO, EA, EA/WR, SCAND, POL, WP, EP‑NP, PNA, TNH, PT), monthly since 1950: `https://ftp.cpc.ncep.noaa.gov/wd52dg/data/indices/tele_index.nh`. These indices are "standardized by the 1981‑2010 climatology". — [CPC teleconnection contents](https://www.cpc.ncep.noaa.gov/data/teledoc/telecontents.shtml); [CPC NAO page](https://www.cpc.ncep.noaa.gov/data/teledoc/nao.shtml); [CPC PNA page](https://www.cpc.ncep.noaa.gov/data/teledoc/pna.shtml)

**One-stop mirror:** PSL keeps copies of many indices in one "standard PSL format": a header line `year1 yearN`, then one row per year with 12 monthly values, then a final line giving the missing-value code. Examples are `/data/correlation/nina34.anom.data`, `oni.data`, `nao.data`, `pna.data`, `ao.data`, `soi.data`, `tna.data`, `whwp.data` and `swmonsoon.data`. PSL asks: "Please reference time series use in publications!" — [PSL climate indices list](https://psl.noaa.gov/data/climateindices/list/)

**Licence and attribution**
- No explicit licence statement was found for the CPC or NCEI index files. PSL's disclaimer says the data are provided "as is". PSL asks users to acknowledge "NOAA PSL, Boulder, Colorado" with the website, and to cite datasets separately from PSL images. — [PSL disclaimer](https://www.psl.noaa.gov/disclaimer) (as summarized by search); [PSL climate indices list](https://psl.noaa.gov/data/climateindices/list/)
- The ARTMIP atmospheric-river catalogues on NCAR are released under CC BY 4.0. — [ARTMIP Tier 1 on NCAR data commons](https://data.ucar.edu/dataset/5ab98e63-14df-4717-a1a0-e415f2fb1916) (as summarized by search)

### Inferences
- A small static table in the app, refreshed by hand once or twice a year, is enough. These files change monthly and their recent values are provisional. A 2001–2025 demo does not need a live fetch.
- Before using any file, normalise it to one long table: `index, year, month, value`. For RONI and ONI, assign each 3-month season to its centre month (DJF goes to January). For MEI.v2, assign each bimonthly value to its second month, which is PSL's convention: "the Jan value represents Dec–Jan".
- CPC, NCEI and PSL are US federal sources. They are very likely US‑government works and free to reuse. This could not be confirmed per file, so credit "NOAA CPC / NCEI / PSL" on the page whatever the licence turns out to be.

### Gaps
- No explicit public-domain or licence statement was found for the CPC or NCEI index files.
- The exact date the UW/JISAO PDO stopped updating was not verified.
- The NCEI AMO header does not say whether the series is detrended, or what its base period is. The rising values suggest it is not detrended (see Section 3).

---

## 2. ENSO (El Niño / La Niña): which index, how episodes are defined, and which US regions respond in which seasons

### Takeaway
Use the **RONI** to label years as El Niño, La Niña or neutral. It has been NOAA's official index since February 2026, and it removes the general warming of the tropical oceans, which the ONI does not. Show the ONI only as a sensitivity check. The two indices disagree on 2 or 3 of the 25 winters in 2001–2025, which is enough to change a small composite. The US signal is mainly a cool-season one, roughly October to March. The Gulf Coast is the most reliable responder: it is wetter in more than 80% of El Niño events. California's response depends on how strong the event is.

### Cited Findings

**Definitions**
- **RONI.** CPC defines "El Niño (La Niña) as a relative, positive (negative) mean SST anomaly of 0.5 degrees C or greater over 3 consecutive months in the Niño 3.4 region (5N–5S, 120W–170W)". The relative anomaly subtracts "the average SST anomaly of the global tropics (20N–20S)" and is then "rescaled to match the amplitude of the traditional index". Historical events are categorized "when there are five or more consecutive, overlapping three-month seasons" above +0.5 or below −0.5. — [NWS PNS 26-05 (13 Jan 2026)](https://www.weather.gov/media/notification/pdf_2026/pns26-05_Relative_ONI.pdf)
- **Why NOAA switched.** First, the relative index is "less sensitive to the chosen base climatology period". Second, it is "more related to changes in rainfall over the tropical Pacific", and tropical rainfall is what drives US impacts. The statement adds: "the legacy Niño 3.4 and Oceanic Niño Index files will continue to be updated." — [NWS PNS 26-05](https://www.weather.gov/media/notification/pdf_2026/pns26-05_Relative_ONI.pdf)
- RONI uses ERSSTv6 and a 1991–2020 base, with the same ±0.5 °C threshold and 5-season rule. — [CPC RONI page](https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/)
- **ONI.** A 3-month running mean of Niño‑3.4 SST anomalies, using "centered 30-year base periods updated every 5 years", ±0.5 °C, and at least 5 consecutive overlapping seasons. The v6 page header says ERSSTv6 but its body text still says ERSSTv5, an inconsistency on the page itself. — [CPC ONI v6](https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/oni/v6/)
- **MEI.v2.** The leading combined EOF of five tropical Pacific fields (sea-level pressure, SST, both surface wind components, and outgoing longwave radiation) over 30°S–30°N, 100°E–70°W. It correlates 0.95 with the original MEI for 1979–2018. — [PSL MEI.v2](https://psl.noaa.gov/enso/mei/)
- **How RONI differs from ONI.** RONI generally weakens El Niño events and strengthens La Niña events. 2020–2023 becomes one continuous three-year La Niña, where the ONI shows three separate winters. 2023–24 stays an El Niño but about 0.6 °C weaker. 2024–25 and 2025–26 are neutral on the ONI but "definitive La Niñas" on RONI. — [Drought.gov, 11 Mar 2026](https://www.drought.gov/news/new-noaa-el-nino-southern-oscillation-index-supports-drought-early-warning-2026-03-11)
- **Strength categories by peak index:** weak 0.5–0.9 °C, moderate 1.0–1.4 °C, strong 1.5 °C or more. — [Climate.gov (archived), US El Niño impacts](https://www.climate.gov/news-features/blogs/enso/united-states-el-niño-impacts-0)

**Episodes, 2001–2025, from RONI.** I applied CPC's 5-overlapping-season rule to the RONI values as fetched; this is my own computation. A season counts at ≤ −0.5 or ≥ +0.5. "(b)" marks a run that relies on a value between ±0.45 and ±0.50, which rounds to ±0.5 in CPC's one-decimal tables. — data: [CPC RONI.ascii.txt](https://www.cpc.ncep.noaa.gov/data/indices/RONI.ascii.txt)
- **La Niña:** SON 2000–FMA 2001; OND 2005–FMA/MAM 2006 (b: OND 2005 = −0.50, MAM 2006 = −0.49); JJA/JAS 2007–AMJ/MJJ 2008; OND 2008–FMA 2009; AMJ 2010–AMJ 2011; ASO 2011–FMA 2012; JJA 2016–DJF 2017; JAS 2017–MAM 2018; AMJ 2020–FMA 2023 (unbroken); JJA/JAS 2024–MAM/AMJ 2025; JAS 2025–NDJ 2025, which continues into 2026.
- **El Niño:** JJA 2002–DJF 2003; JJA 2004–DJF 2005; ASO 2006–DJF 2007; ASO 2009–FMA 2010; FMA 2015–MAM 2016, possibly from OND 2014 (b: JFM 2015 = 0.47); SON 2018–MAM 2019; JJA 2023–JFM 2024.
- **Winters (DJF, labelled by the January year), 2001–2025:**
  - El Niño: 2003, 2005, 2007, 2010, 2016, 2019, 2024, which is 7.
  - La Niña: 2001, 2006 (b), 2008, 2009, 2011, 2012, 2017, 2018, 2021, 2022, 2023, 2025, which is 12.
  - Neutral: 2002, 2004, 2013, 2014, 2020, which is 5.
  - Borderline El Niño/neutral: 2015.

**ONI v6 by comparison** (CPC table, read from its bold formatting):
- The ONI does not flag La Niña in 2016 or DJF 2017.
- It breaks 2020–23 in mid‑2021.
- It flags nothing in 2025.
- It flags El Niño continuously from SON 2014 through AMJ 2016.
- Source: [CPC ONI v6](https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/oni/v6/)

A CPC figure compares the ONI and RONI series from 1950 to the present: `https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_update/compare_RONI_ONI.png`. — [NWS PNS 26-05](https://www.weather.gov/media/notification/pdf_2026/pns26-05_Relative_ONI.pdf)

**US responses by region and season**
- "Most El Niño-related U.S. temperature and precipitation impacts occur from October through March."
  - **Gulf Coast (Texas to Florida):** wetter than average in more than 80% of El Niño events over the past 100 years, the most reliable signal.
  - **California and the Southwest:** weaker and strength-dependent. The strong events of 1982/83 and 1997/98 were very wet, but the strong events of 1991/92 and 2009/10 gave southern California only small surpluses. Weak and moderate events give roughly equal chances of above-, near- and below-average precipitation.
  - **Ohio Valley:** typically drier.
  - **Pacific Northwest and northern Rockies:** a less reliable dry signal.
  - **Alaska:** warmer winters (from the author's reply in the comments).
  - The page's own warning: "'Associated with' doesn't mean that all of these impacts happen during every El Niño episode."
  - Source: [Climate.gov (archived), US El Niño impacts](https://www.climate.gov/news-features/blogs/enso/united-states-el-niño-impacts-0)
- **La Niña:** northern US winters tend to be cooler than average, and the Pacific jet tends to meander high into the North Pacific. "No two La Niña winters have identical temperature and precipitation patterns." Climate.gov also tallied below-average January–March snowfall over 22 La Niña winters, 1959–2024. — [Climate.gov (archived), La Niña winter precipitation patterns](https://www.climate.gov/news-features/featured-images/precipitation-patterns-during-every-la-niña-winter-1950); [Climate.gov (archived), La Niña winter temperature patterns](https://www.climate.gov/news-features/featured-images/temperature-patterns-during-every-la-niña-winter-1950) (as summarized by search)
- La Niña "often brings warm, dry winters to the southern U.S." Drought.gov says RONI's classification better explains recent drought in the Southwest and Southern Plains. — [Drought.gov](https://www.drought.gov/news/new-noaa-el-nino-southern-oscillation-index-supports-drought-early-warning-2026-03-11)
- **Ropelewski & Halpert (1986), Mon. Wea. Rev. 114, 2352–2362.** They built monthly composites over an idealized two-year ENSO episode, at all stations with seven or more ENSO events. One abstract reports above-normal precipitation with ENSO in **18 of 22 cases (81%) for October–March** in a core region, and no high-latitude precipitation signal. — [IRI Data Library, Ropelewski & Halpert maproom](https://iridl.ldeo.columbia.edu/maproom/ENSO/New/ropelewskihalpert.html); [NOAA repository citation](https://repository.library.noaa.gov/view/noaa/33759/noaa_33759_DS1.pdf) (as summarized by search; full text not read)
- **CPC ENSO composites** of US temperature, precipitation and snow, for each of the 12 overlapping 3-month seasons:
  - Index pages: `EC_ENT_index.shtml` (El Niño temperature), `EC_ENP_index.shtml` (El Niño precipitation), `EC_ENS_index.shtml` (El Niño snow), and `EC_LNT`, `EC_LNP`, `EC_LNS` for La Niña.
  - Base: departures from 1981–2010, data 1950 to present.
  - Each map pairs the composite with a **frequency map** showing the "percentage of individual episode years showing the same sign". The page's example is JFM La Niña precipitation above average over the Ohio Valley in 60–70% of cases, about 10–11 of 16 years.
  - The readme describes no significance test, and its episodes are still defined by the ONI on ERSST.v3 (the page was last modified in 2012).
  - Source: [CPC ENSO composites](https://www.cpc.ncep.noaa.gov/products/precip/CWlink/ENSO/composites/); [CPC composites readme](https://www.cpc.ncep.noaa.gov/products/precip/CWlink/ENSO/composites/readme.shtml)

### Inferences
- Only about 7 El Niño and 12 La Niña winters fall in 2001–2025. My own calculation: to have an 80% chance of detecting a difference between the two groups at α = 0.05, the local difference would need to be about 1.3–1.4 standard deviations of the local winter variability (from (1.96 + 0.84)·√(1/7 + 1/12) ≈ 1.33). Most real ENSO effects at a single place are smaller, so "no clear difference" will be the honest result for most places.
- In 2001–2025 La Niña winters greatly outnumber El Niño winters, and they cluster in later years (2021–2023 and 2025). A warming or drying trend can therefore look like a La Niña effect. Detrend the local record first, or compare within the same decade.
- 2 or 3 winters change class between ONI and RONI: 2015, 2017 and 2025, plus the borderline 2006. With 7 and 12 members, the app should state which index it used and show whether the result survives a switch to the ONI.
- Monthly use: either colour each month by the RONI season centred on it, or use the monthly relative Niño‑3.4 directly for correlations. For "La Niña years were drier here", use whole winters or water years, not single months.

### Gaps
- I did not read Ropelewski & Halpert's full text, so the region behind the 81% figure is unconfirmed. Their 1987 temperature paper was not checked.
- No official CPC table of RONI episodes for 2001–2025 was available as text. The list above is my own computation, and borderline seasons should be checked against CPC's coloured table.
- No published US composite maps built on RONI (rather than ONI) were found.

---

## 3. PDO, AMO, NAO, PNA and AO: definitions, version differences, and US impacts by season

### Takeaway
- **NAO, PNA and AO** are weather-pattern indices that change month to month. They matter mostly in **winter**: AO and NAO for cold-air outbreaks in the East, PNA for a warm West with a cold Southeast. They are safe to show monthly.
- **PDO and AMO** are slow ocean patterns. In 2001–2025 the PDO was negative almost all the time, and the NCEI AMO mostly rose. A 25-year record therefore holds one phase or a trend, not repeated cycles, so these two should be shown as background context, not tested statistically.

### Cited Findings

**PDO**
- **Definition (NCEI).** NCEI regresses ERSST anomalies against the Mantua PDO index to build a North Pacific map, then projects ERSST anomalies onto that map; the result "closely follows the Mantua PDO index".
  - Positive phase: cooler interior North Pacific, a warmer Pacific coast, and low sea-level pressure over the North Pacific.
  - Negative phase: the reverse.
  - Source: [NCEI PDO](https://www.ncei.noaa.gov/access/monitoring/pdo/)
- **What it is physically.** Climate.gov's ENSO blog calls the PDO "an aggregation of mostly independent processes", one of which is ENSO, and "a response, not an agent of change itself". It found little added influence on precipitation beyond what ENSO explains, and a US influence that is measurable mainly in winter and mostly in the far West. — [Climate.gov (archived), "Going out for ice cream: a first date with the PDO"](https://webarchive.library.unt.edu/web/20170119125750/https://www.climate.gov/news-features/blogs/enso/going-out-ice-cream-first-date-pacific-decadal-oscillation) (as summarized by search)
- **Warm (positive) phase impacts:** above-normal temperatures from the Pacific Northwest to Alaska, and more winter precipitation in the Southwest US and Mexico. The PDO combines with ENSO for western winter precipitation. — [NWS Flagstaff (archived), "What is the PDO?"](https://webarchive.library.unt.edu/eot2008/20090114163401/http:/www.wrh.noaa.gov/fgz/science/pdo.php?wfo=fgz) (as summarized by search)
- **2001–2025 values (NCEI file):**
  - The index was negative in most months. It was strongly negative from 2008 to 2013 and again from 2020 to 2025.
  - The only sustained positive spell was 2014 to mid‑2016.
  - July 2025 was −4.21, and Sep–Oct 2024 were −3.56 and −3.80.
  - Source: [NCEI PDO file](https://www.ncei.noaa.gov/pub/data/cmb/ersst/v5/index/ersst.v5.pdo.dat)

**AMO**
- **Definition (PSL/Enfield).** An area-weighted average of North Atlantic SST from about 0 to 70°N, detrended, with an optional 121‑month smoothing. PSL calls it "basically an index of the N Atlantic temperatures". — [PSL AMO](https://psl.noaa.gov/data/timeseries/AMO/)
- **NCEI ERSSTv5 version.** North Atlantic SST anomaly over 0–60°N, with no detrending stated. Values rise from about 0.1–0.5 in 2001 to about 0.7–1.0 in 2025. — [NCEI AMO file](https://www.ncei.noaa.gov/pub/data/cmb/ersst/v5/index/ersst.v5.amo.dat)
- **US impact evidence.** McCabe, Palecki & Betancourt (2004, PNAS 101:4136–4141) found that **52%** of the spatial and temporal variance in *multidecadal* US drought frequency is attributable to the PDO and AMO. A further 22% follows a trend pattern. Their method used 20-year moving windows. — [PMC full text](https://pmc.ncbi.nlm.nih.gov/articles/PMC384707); [USGS summary](https://www.usgs.gov/publications/pacific-and-atlantic-ocean-influences-multidecadal-drought-frequency-united-states)
- Enfield et al. (2001) link the AMO to "rainfall and river flows in the continental U.S." PSL cites only the title, and I did not read the paper. — [PSL AMO](https://psl.noaa.gov/data/timeseries/AMO/)

**NAO**
- **Definition.** A north–south dipole, with one centre over Greenland and the opposite centre around 35–40°N. "one of the most prominent teleconnection patterns in all seasons".
  - Positive phase: high pressure over the central North Atlantic, the eastern US and western Europe, with **above-average temperatures in the eastern US**.
  - Standardized by 1981–2010.
  - Source: [CPC NAO](https://www.cpc.ncep.noaa.gov/data/teledoc/nao.shtml)
- **Negative NAO:** stronger cold-air outbreaks and more storminess in eastern North America, and cooler mid-latitude winters. The NAO is usually in phase with the AO. — [Climate.gov (archived), NAO](https://climate.gov/news-features/understanding-climate/climate-variability-north-atlantic-oscillation) (as summarized by search)
- **Versions.** CPC's NAO is pattern-based (rotated principal components of height anomalies). The station-based NAO (Jones/CRU: Gibraltar minus SW Iceland pressure; also Hurrell's version) is different. PSL mirrors both. — [PSL climate indices list](https://psl.noaa.gov/data/climateindices/list/); [CPC teleconnection contents](https://www.cpc.ncep.noaa.gov/data/teledoc/telecontents.shtml)

**PNA**
- **Positive phase** (higher pressure near Hawaii and over the intermountain West, lower south of the Aleutians and over the Southeast US):
  - Temperature: above average in western Canada and the far western US; below average in the south-central and southeastern US.
  - Precipitation: above average from the Gulf of Alaska into the Pacific Northwest; below average in the upper Midwest.
  - Summer: "little impact on surface temperature variability".
  - The PNA is "strongly influenced by ENSO": its positive phase tends to occur with El Niño and its negative phase with La Niña.
  - Source: [CPC PNA](https://www.cpc.ncep.noaa.gov/data/teledoc/pna.shtml)

**AO**
- **Definition.** Daily 1000‑hPa height anomalies poleward of 20°N, projected onto the AO loading pattern. The pattern "primarily captures characteristics of the cold season AO". Values are standardized by the 1979–2000 monthly standard deviation. — [CPC AO](https://www.cpc.ncep.noaa.gov/products/precip/CWlink/daily_ao_index/ao.shtml)
- **Negative AO:** a weaker, meandering jet stream "dips farther south", which makes frigid outbreaks more likely and coastal nor'easters in New England more frequent. **Positive AO:** milder mid-latitude winters. — [Climate.gov (archived), AO](https://content-drupal.climate.gov/news-features/understanding-climate/climate-variability-arctic-oscillation)
- **Example inside the app window:** the monthly AO was −3.41 in Dec 2009, −2.59 in Jan 2010 and −4.27 in Feb 2010. That was the cold, snowy eastern winter of 2009–10, which Climate.gov cites as the classic case. — [CPC AO monthly file](https://www.cpc.ncep.noaa.gov/products/precip/CWlink/daily_ao_index/monthly.ao.index.b50.current.ascii); [Climate.gov NAO/AO pages](https://climate.gov/news-features/understanding-climate/climate-variability-north-atlantic-oscillation) (as summarized by search)

**Plain words** (one sentence each, written from the definitions above)
- **ENSO:** "Every few years the central tropical Pacific runs warmer (El Niño) or cooler (La Niña) than the tropics around it. That shifts where tropical storms form, which bends the winter jet stream over the US."
- **PDO:** "A slow pattern of warm and cool water in the North Pacific, partly an echo of ENSO. It has been in its cool phase for most of 2001–2025."
- **AMO:** "How warm the North Atlantic is overall, compared with normal. Since 2001 it has mostly gone up."
- **NAO / AO:** "A see-saw of air pressure between the Arctic and the mid-latitudes. When it tips negative, Arctic air spills south into the eastern US."
- **PNA:** "A wavy jet-stream pattern over the Pacific and North America. Positive means a warm, ridged West and a cold Southeast."

### Inferences
- **AMO.** Over 2001–2025 the NCEI AMO behaves mostly like a warming trend. Correlating it with any local record that also trends (heat, PM2.5 decline, NO₂ decline) will give a large but meaningless correlation. Either detrend both series, or show the AMO as context only and do not test it.
- **PDO.** One mostly negative phase in 25 years gives about one degree of freedom for "PDO phase". Show it as a background band. Do not claim "negative PDO years were drier here", because in this window that is nearly the same claim as "2008–13 and 2020–25 were drier".
- **Seasons.** NAO, PNA and AO effects are strongest in winter (PNA explicitly weak in summer). Correlations should be computed for DJF (or NDJFM) months separately, not pooled over all 12 months.
- **Overlap.** PNA overlaps ENSO, and the PDO partly echoes ENSO. Showing all of them as separate "drivers" double-counts one signal. Group them, or note the overlap.

### Gaps
- No NOAA page with season-by-region US impact maps for the PDO or AMO was found. NCEI's PDO page has no impacts section.
- CPC's exact definitions (rotated PCA of 500‑hPa monthly heights, and the base period of the patterns) were described only on linked sub-pages that I did not fetch.
- The literature disputing whether the AMO is an internal oscillation or a response to aerosol and greenhouse forcing was not reviewed.
- No quantitative share of US winter temperature variance explained by AO or NAO was found.

---

## 4. North American monsoon, atmospheric rivers, the Saharan Air Layer, and the MJO: is there a usable monthly series?

### Takeaway
- **Monsoon:** there is no official NOAA monthly monsoon index. PSL's Arizona plus New Mexico summer rainfall series, or the place's own July–September rain, is the practical choice.
- **Atmospheric rivers:** a NOAA NCEI catalogue (ERA5-based, 1940 to present, updated monthly) can be aggregated into monthly AR counts or intensity for a point, which makes it the best "outside driver" for western rain.
- **Saharan Air Layer:** there is no index. Use dust aerosol data or EPA exceptional-event days.
- **MJO:** a 30–60-day phenomenon, so monthly averages wash it out. Count active-phase days per month if it is used at all.

### Cited Findings

**North American monsoon (NAM)**
- The PSL index list has no NAM index. The closest entry is "SW Monsoon Region rainfall" for Arizona and New Mexico (`/data/correlation/swmonsoon.data`, from NCDC climate-division data). — [PSL climate indices list](https://psl.noaa.gov/data/climateindices/list/)
- Higgins et al. (1999) found early monsoons in Arizona–New Mexico tend to be wet, with only a weak association between dry monsoons and La Niña (or El Niño). Wet monsoons tend to follow dry Southwest winters. — [NWS Tucson, monsoon variability](https://www.weather.gov/media/twc/monsoon/monsoon_variability.pdf); [Gutzler, J. Climate draft](https://www.eol.ucar.edu/sites/default/files/files_live/private/JCL-4863.pdf) (as summarized by search)
- Castro et al. (2001) linked a high PDO with El Niño to a late monsoon onset and below-average early (July) rain. Gutzler built a land-based precipitation index for the core monsoon region. ENSO and the PDO "contribute to, but do not fully explain" year-to-year variability. — [Gutzler draft](https://www.eol.ucar.edu/sites/default/files/files_live/private/JCL-4863.pdf); [NWS Tucson](https://www.weather.gov/media/twc/monsoon/monsoon_variability.pdf) (as summarized by search)

**Atmospheric rivers (AR)**
- **NOAA NCEI "Atmospheric Rivers, Version 1":** a historical AR record built from ERA5, 6-hourly at 0.25°, 1940 to present, **updated monthly**. It combines an AR detection tool (tARget v3) with the AR intensity scale. DOI 10.25921/tkq4-xj93. — [data.gov listing](https://catalog.data.gov/dataset/atmospheric-rivers-version-1); [CW3E notice (Rutz, Slinskey, Guan, Ralph)](https://cw3e.ucsd.edu/cw3e-publication-notice-the-ncei-historical-data-record-for-atmospheric-rivers-visualization-over-the-western-united-states/)
- **ARTMIP catalogues:** Tier 1 uses MERRA‑2 from 1980 and is CC BY 4.0. Tier 2 uses ERA5 for 2000–2019 and holds hourly AR tags, more than 4 TB compressed. — [ARTMIP Tier 1](https://data.ucar.edu/dataset/5ab98e63-14df-4717-a1a0-e415f2fb1916); [ARTMIP Tier 2](https://data.ucar.edu/dataset/fe79b951-4419-499f-a1ee-9a2fc785b1ca) (as summarized by search)

**Saharan Air Layer and African dust**
- No named dust index was found. The Texas Commission on Environmental Quality has filed Saharan-dust PM2.5 exceptional events with EPA:
  - Kleberg County, 15–16 and 25–28 July 2023.
  - Kleberg and Travis Counties, 30 July to 1 August 2024.
  - EPA treats "dust from the Sahara Desert" as a possible exceptional event.
  - Source: [TCEQ 2023 PM2.5 exceptional events](https://www.tceq.texas.gov/downloads/air-quality/air-monitoring/pm/2023-ee-pm25-harrison-kleberg-travis-summary-english.pdf); [TCEQ 2022–2024 summary](https://www.tceq.texas.gov/downloads/air-quality/air-monitoring/pm/summary_2022-2024_harrison-kleberg-travis_pm2-5_ee_4aug2025.pdf)
- **June 2020 dust event:** the 24-hour PM2.5 standard was exceeded over the Florida Panhandle. — [AGU 2020 abstract](https://ui.adsabs.harvard.edu/abs/2020AGUFMA007.0003S/abstract) (as summarized by search)
- A 2024 North‑Central Texas study reportedly found Saharan dust behind 22 of the 23 samples above 20 µg/m³ in five years of data, mostly in summer. The search result did not tie this clearly to one URL; a candidate is [LSU repository item](https://repository.lsu.edu/oceanography_coastal_pubs/1087). Verify before use.

**MJO**
- The MJO is a cluster of storm clouds that moves east along the tropical Indian and Pacific Oceans, cycling every 30 to 60 days. Its US rain influence "can change weekly", whereas ENSO's lasts a season. MJO and ENSO waves can reinforce each other (December 2015 Mississippi flooding; summer 2000 Southern flash drought) or cancel each other (MJO wet signals offsetting La Niña's dry Southeast, 1998–2001). — [Climate.gov (archived), "Catch a wave"](https://www.climate.gov/news-features/blogs/enso/catch-wave-how-waves-mjo-and-enso-impact-us-rainfall)
- **US winter impacts:** more frequent and intense heavy rain on the West Coast, and more frequent and intense cold-air outbreaks in the East. — [CPC MJO factsheet (archived)](https://webarchive.library.unt.edu/eot2008/20090510003847/http:/www.cpc.ncep.noaa.gov/products/precip/CWlink/MJO/MJO_1page_factsheet.pdf)
- **Index:** the Wheeler–Hendon RMM index (RMM1, RMM2, amplitude, phase 1–8), daily, from the Australian Bureau of Meteorology: `http://www.bom.gov.au/climate/mjo/graphics/rmm.74toRealtime.txt`. The PSL index list has no MJO series. — [IRIDL BoM RMM record](https://iridl.ldeo.columbia.edu/SOURCES/.BoM/.MJO/.RMM/dods.das); [PSL MJO page](https://psl.noaa.gov/mjo/) (as summarized by search)

### Inferences
- **Atmospheric rivers.** For western places, "AR days per month" or "AR-scale ≥3 days per month" at the nearest grid cell would be a strong, physically direct driver of rain and snow. The cost is processing large gridded files. It is a stretch goal, not a quick win.
- **MJO.** The honest monthly form is "days in month with RMM amplitude ≥ 1 in phases X–Y". Averaging RMM1 and RMM2 over a month cancels the signal. With 25 winters this is likely too noisy to show per place.
- **Saharan dust.** Smoke and dust days in Gulf Coast PM2.5 records are better labelled from event lists (EPA exceptional events, satellite dust) than by correlating with an index.

### Gaps
- The current BoM RMM file layout, its update status and its licence were not verified.
- The NCEI AR file format and direct download URL were not opened. The DOI landing page is the starting point.
- No satellite dust-AOD monthly product (for example MERRA‑2 dust) was checked in this research.

---

## 5. Documented links to US drought, wildfire, smoke and air quality

### Takeaway
The best-documented chain runs: autumn La Niña, then a dry winter and spring in the southern and western US, then more large fires the following spring and summer. El Niño roughly halves the risk in the same regions. No study was found that tests ENSO directly against US PM2.5 or smoke days, and none at all for NO₂. Any "smoke vs La Niña" result in the app is therefore new, weak, place-level evidence, and should be labelled that way.

### Cited Findings
- **Hoell et al. (NOAA PSL, JGR: Atmospheres).** Data: extensive area burned in nine Geographic Area Coordination Centers, 1984–2022.
  - After an autumn La Niña: a "greater than two-fold increase in the relative risk of extensive burns" in the **Southern, Southwest and Rocky Mountain** regions the following spring. The La Niña effect lingered into summer over the **Great Basin and Northern California**.
  - After an autumn El Niño: the likelihood was "consistently halved" in the same regions in spring and summer.
  - Mechanism: low wet-season precipitation and high evaporative demand under anomalous high pressure over the southern US.
  - Source: [PreventionWeb summary of PSL release](https://www.preventionweb.net/news/phase-el-nino-southern-oscillation-foreshadows-us-wildfire-activity-year-advance); [CU Boulder record](https://vivo.colorado.edu/display/pubid_510736) (as summarized by search; full paper not read)
- **Mason et al. (2017, GRL 44:7002–7010)**, 1979–2015, cyclostationary EOFs:
  - ENSO's effect on fire potential is "most closely associated with variations in relative humidity".
  - Early summer: El Niño lowers fire potential in the Southwest and raises it in the Northwest; La Niña does the opposite.
  - Late summer: El Niño raises Southwest fire potential.
  - The largest relative impacts are in the Northwest and Southeast.
  - Source: [USFS PDF](https://fs.usda.gov/rm/pubs_journals/2017/rmrs_2017_mason_s001.pdf); [USFS Treesearch](https://research.fs.usda.gov/treesearch/54903) (as summarized by search)
- **Keeping et al. (2026, Climate Dynamics):** "El Niño is not significantly associated with wildfire occurrence in the northwestern US", contrary to expectation. — [Reading CentAUR record](https://centaur.reading.ac.uk/127787) (as summarized by search)
- **Kitzberger et al. (2007, PNAS)**, a paleofire study: ENSO and the PDO drove interannual-to-decadal fire variation in the West, and the AMO modulated their strength and reach over decades. — [as summarized by search; original not opened](https://research.fs.usda.gov/treesearch/27697)
- **Smoke and PM2.5:** since about 2016, wildfire smoke has influenced trends in average annual PM2.5 in nearly three-quarters of contiguous states. — [Burke et al. 2023, Nature](https://www.nature.com/articles/s41586-023-06522-6.pdf) (as summarized by search)
- **Smoke and ozone:** across about 600 monitoring stations in 2018–2023, smoke raised both PM2.5 and ozone. — [Climate.gov feed item](https://climate.gov/news-features/feed/wildfire-smoke-impacted-air-quality-across-united-states-2018-2023) (as summarized by search)
- **Drought:** PDO and AMO explain 52% of the variance in multidecadal US drought frequency (McCabe et al. 2004, Section 3). La Niña winters are warm and dry across the southern US. — [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC384707); [Drought.gov](https://drought.gov/news/new-noaa-el-nino-southern-oscillation-index-supports-drought-early-warning-2026-03-11)

### Inferences
- **Fire and smoke need a lag.** The link runs from autumn ENSO to next-year fire, so a record such as "smoke days, May–Sep, year Y" should be compared with RONI in SON of year Y−1, not with the same month. Specify that lag in advance rather than searching across lags.
- **Smoke travels.** A place's smoke days often come from fires in other regions or in Canada (for example 2023). A local ENSO–smoke association therefore mixes several regions' fire responses, and is weaker evidence than a local ENSO–rain association.
- **Pollutants without a teleconnection link.** For NO₂ and non-smoke PM2.5, the dominant 2001–2025 signal is emissions decline. Without detrending, any index that also trends will appear related.

### Gaps
- No US study testing ENSO, PDO or AO against PM2.5, smoke-day counts or NO₂ was found.
- The Hoell et al. paper's exact title, DOI and effect sizes by season were not verified from the paper itself.

---

## 6. Method: showing an index–record relationship from 25 years of monthly data without overclaiming

### Takeaway
Use what NOAA uses for the public: **composites with counts**. For example: "In 9 of 12 La Niña winters since 2001, January–March rain here was below this place's usual". Show the spread of every year, not only the average. Stratify by season (winter first). Detrend the place's record before comparing it with an index. For any correlation, use an effective sample size that accounts for autocorrelation (Bretherton et al. 1999). Apply the existing Benjamini–Hochberg correction across every index × season × lag tried. Label everything "associated with", never "caused by" or "will".

### Cited Findings
- **NOAA's public framing.** Impacts are "associated with" El Niño: they happen more often than chance, but "'Associated with' doesn't mean that all of these impacts happen during every El Niño episode". Reliability is given as the share of events, for example the Gulf Coast at >80%. Maps are shown separately for weak, moderate and strong events, by climate division, using DJF precipitation against 1981–2010. — [Climate.gov (archived), US El Niño impacts](https://www.climate.gov/news-features/blogs/enso/united-states-el-niño-impacts-0)
- **CPC's composites** pair the mean departure with a frequency panel showing the percentage of episode years with the same sign (for example 60–70%, about 10–11 of 16 years). They report no significance test. They also offer a "Composite + Trend" version: the composite is rebuilt from high-pass-filtered data (an 11-year running mean removed for temperature, 15 years for precipitation), then the recent trend is added back. — [CPC composites readme](https://www.cpc.ncep.noaa.gov/products/precip/CWlink/ENSO/composites/readme.shtml)
- **Small multiples of every event.** Climate.gov showed temperature and precipitation maps for every La Niña winter since 1950, and stressed that no two are alike. — [Climate.gov (archived), La Niña winter precipitation patterns](https://www.climate.gov/news-features/featured-images/precipitation-patterns-during-every-la-niña-winter-1950)
- **Effective sample size (Bretherton et al. 1999, J. Climate 12:1990–2009).** Standard tests of the correlation between two series are approximately valid when the degrees of freedom are chosen properly. The common form is **N_eff = N·(1 − r₁·r₂)/(1 + r₁·r₂)**, where r₁ and r₂ are the lag-1 autocorrelations of the two series. It is implemented as `xskillscore.effective_sample_size` and in climpred. — [Bretherton et al. 1999 PDF (UW)](https://atmos.uw.edu/wallace/PDFs/1999%20-%20The%20effective%20number%20of%20spatial%20degrees%20of%20freedom%20of%20a%20time-varying%20field.pdf); [climpred docs](https://climpred.readthedocs.io/en/latest/api/climpred.metrics._effective_sample_size.html); [xskillscore docs](https://xskillscore.readthedocs.io/en/latest/api/xskillscore.effective_sample_size.html)
- **Multiple testing on maps (Wilks 2016, BAMS 97:2263–2273).** Testing each grid point separately and stippling the "significant" ones overstates results. Controlling the false discovery rate (Benjamini–Hochberg) limits the share of spurious significant points and copes with spatial correlation. — [Wilks 2016 (bibliographic record)](https://bibsonomy.org/bibtex/282b206c5e7233eadc201d54af6279d72/pbett); [Ventura et al. 2004](https://www.stat.berkeley.edu/~paciorek/files/jclim/vent.etal.2004.pdf) (as summarized by search)
- **Seasonality.** ENSO's US impacts are concentrated in October–March, and the PNA has little summer impact. — [Climate.gov (archived)](https://www.climate.gov/news-features/blogs/enso/united-states-el-niño-impacts-0); [CPC PNA](https://www.cpc.ncep.noaa.gov/data/teledoc/pna.shtml)

### Inferences (recommended recipe; my synthesis, with illustrative numbers I calculated)
1. **Use anomalies.** Remove each calendar month's 2001–2025 mean from the place's record, then remove a linear (or Theil–Sen) trend. Do the same to the index, or use RONI, which is already relative. This prevents shared trends producing fake links; the NCEI AMO and the 2001–2025 PDO both carry trends.
2. **Season first, months second.** Default to winter (DJF, or NDJFM for snow) for ENSO, AO, NAO and PNA. For fire and smoke, use fire season against the previous autumn's RONI. For the monsoon, use July–September. One season gives one value per year, so N = 24 or 25.
3. **Composites as dot plots, with counts.** Show El Niño, Neutral and La Niña groups, each with one dot per year, labelled n = 7, 5 and 12 for DJF 2001–2025 on RONI. Add a sentence such as "x of n La Niña winters were drier than this place's usual winter". Use a permutation test (shuffle the year labels about 10,000 times) for the group difference. It suits small, unequal groups.
4. **Correlations only with N_eff.**
   - Illustration: with N = 25 annual values, |r| must exceed about 0.40 for p < 0.05.
   - If both series have a lag-1 autocorrelation around 0.4 (typical of PDO-like series), N_eff ≈ 25 × 0.84/1.16 ≈ 18, and the threshold rises to about 0.46.
   - Pooling all 300 months looks like a big sample, but most months carry no teleconnection signal, and monthly ENSO indices have a lag-1 autocorrelation above 0.9.
5. **Lags.** Fix a small set of physically motivated lags in advance (0 for winter circulation; the previous SON for fire). Do not scan 0–12 months. If a scan is shown, every lag counts as a test in the Benjamini–Hochberg family.
6. **Benjamini–Hochberg family.** The family is all index × season × lag combinations tried for that place and record, about 6 indices × 2–4 seasons × 1–2 lags, so 12 to 48 tests. Report q-values, and use "no clear link" as the default wording.
7. **Index robustness.** Re-run with the ONI (and MEI.v2). Show "holds with other ENSO indices: yes / no".
8. **Wording.** Use phrases such as "In this place's records, La Niña winters were more often dry (9 of 12). NOAA finds the same tendency across the southern US. This is an association across 25 years, not a cause, and not a forecast."

### Gaps
- The full text of Bretherton et al. 1999 (equation number and caveats) and of Wilks 2016 was not read. The formula above is the form quoted by climpred and xskillscore.
- No archived Climate.gov post was found that states its significance method. The CPC readme says no significance test is applied to its composites.

---

## 7. Visual forms: index strip under a monthly line, and composite anomaly maps, with public examples

### Takeaway
The NOAA convention is red shading for El Niño and blue for La Niña. A thin index strip in that convention, aligned month by month under the place's line, is standard and readable. For "does it matter here", NOAA's best public forms are small multiples of every event and a composite map paired with a "% of events with the same sign" map. A single average map hides how often the pattern fails.

### Cited Findings
- **Climate.gov ONI time series** with red shading for El Niño and blue for La Niña, applying the five-season persistence rule. — [Climate.gov media 12843](https://www.climate.gov/media/12843); [Climate.gov ONI graph dashboard](https://www.climate.gov/graph-dashboard-oceanic-nino-index-oni) (as summarized by search)
- **CPC RONI and ONI tables** use "Warm (red) and cold (blue) periods based on a threshold of +/- 0.5°C". — [CPC RONI](https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/); [CPC ONI v6](https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/oni/v6/)
- **CPC's ONI vs RONI comparison figure:** `https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_update/compare_RONI_ONI.png`. — [NWS PNS 26-05](https://www.weather.gov/media/notification/pdf_2026/pns26-05_Relative_ONI.pdf)
- **Small multiples of every La Niña winter since 1950**, for temperature and precipitation. — [Climate.gov (archived), temperature](https://www.climate.gov/news-features/featured-images/temperature-patterns-during-every-la-niña-winter-1950); [precipitation](https://www.climate.gov/news-features/featured-images/precipitation-patterns-during-every-la-niña-winter-1950)
- **El Niño winter precipitation by climate division**, grouped by weak, moderate and strong events (Figure 2), plus a jet-stream schematic of typical impacts (Figure 1). — [Climate.gov (archived), US El Niño impacts](https://www.climate.gov/news-features/blogs/enso/united-states-el-niño-impacts-0)
- **CPC composite maps** show three rows (Composite, Trend, Composite + Trend), each with a frequency panel, for 12 seasons. — [CPC composites](https://www.cpc.ncep.noaa.gov/products/precip/CWlink/ENSO/composites/); [readme](https://www.cpc.ncep.noaa.gov/products/precip/CWlink/ENSO/composites/readme.shtml)
- **PSL correlation pages.** The short PSL index files "are intended for the PSL Correlation pages", which map correlations between an index and gridded fields. — [PSL AMO](https://psl.noaa.gov/data/timeseries/AMO/); [PSL climate indices list](https://psl.noaa.gov/data/climateindices/list/)
- **Stippling.** Stippling on composite maps should mark points that survive false-discovery control. — [Wilks 2016](https://bibsonomy.org/bibtex/282b206c5e7233eadc201d54af6279d72/pbett) (as summarized by search)

### Inferences (design suggestions for Climatch)
- **Index strip.**
  - A 12–16 px band directly under the place's monthly line, on the same time axis, filled red, blue or neutral grey by RONI episode.
  - A second optional strip could show AO or NAO as a diverging colour band, winter months only.
  - Hover shows "DJF 2011: La Niña (RONI −1.42)", adding the ONI value when it disagrees.
  - Do not draw the index as a second y-axis line on the same chart: dual axes invite reading crossings as meaning.
- **Composite panel.** One dot per winter, in three columns (El Niño, Neutral, La Niña), with the y-axis as this place's anomaly. Mark the median and print "n = …". Add a one-line count sentence and a "no clear link" badge when the BH-adjusted q ≥ 0.1.
- **Map.**
  - Show a US composite anomaly map only for the drivers and seasons NOAA documents (ENSO in winter first).
  - Pair it with a "% of years with the same sign" map, as CPC does.
  - Link to the CPC composite as the long-record reference. A 2001–2025 composite has too few events to map alone.
- **Plain-language card per index:** what it is (one sentence), when it matters (season and regions), and "what we can and can't say from 25 years".
- **No forecasts.**
  - The source files already contain 2026 values (for example, the ASO 2026 RONI of 1.97, an El Niño). Clip display at December 2025, and do not show CPC "outlook" or "alert" status.
  - Drought.gov's RONI article includes a 2026 El Niño outlook. Do not quote it.

### Gaps
- The Climate.gov ONI dashboard page itself was not opened. Its description comes from search snippets.
- No public example was found of an index strip aligned under a single-place monthly series on a NOAA site. Examples were found only for the index alone.

---

### Not covered or not checked
- I read none of the full papers: Ropelewski & Halpert, Bretherton, Wilks, Hoell, Mason and Keeping are cited from abstracts or search summaries.
- The RONI episode list is my own computation from the data file, and borderline seasons are marked "(b)".
- Two notes for the team:
  - **Climate.gov:** it is archived, so its links may break.
  - **Choice of ENSO index:** RONI and the ONI disagree on 2 or 3 of the 25 winters, so the team must decide which index the app uses.
