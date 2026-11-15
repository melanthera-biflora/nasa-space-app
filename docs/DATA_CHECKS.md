# Data checks (2026-11-15)

Five checks on data the app already uses, each with its evidence and what it changes. Commands run from
`data_pipeline/` with the repo's `.venv`. Nothing here changed a report, so `DATA_VERSION` stays `2026-11-15-a5b`.

| Check | Result | Action |
| --- | --- | --- |
| 1. HMS density coding across 2022 | Every cached year uses text labels; no year uses 5/16/27 | None: D37 counts are right |
| 2. Spokane PM2.5 autumn +8/decade | Not a code bug: Sen's slope doesn't add up across months. But MERRA-2 PM2.5 steps up in 2009–10 where EPA monitors fell | PM2.5 trends start in 2010 (D41) |
| 3. OMI NO₂ version (T34, D10) | Script ready; needs the owner's Earthdata login | Owner runs one command |
| 4. MERRA-2 variable names | All five exist, with the units the code assumes | None |
| 5. NASA POWER 2025 | MERRA-2 based (not the near-real-time stand-in) for all of 2025 | None |

## 1. HMS smoke density coding

**Question.** HMS smoke density changed from numbers (5, 16, 27) to text (Light, Medium, Heavy) around 2022.
`sources/hms_smoke.py` counts `{"Medium", "Heavy"}`, so any year coded in numbers would count zero medium/heavy days.

**Evidence.** Every outline in every cached annual bundle (`cache/hms/hms_smoke2005.zip` … `2025.zip`), read with the
same `read_bundle()` the build uses. All bundles have the fields `Density, End, Satellite, Start`.

| Year | Outlines | NA | Light | Medium | Heavy |
| --- | --- | --- | --- | --- | --- |
| 2005 | 6,289 | 6,289 | | | |
| 2006 | 15,443 | 15,443 | | | |
| 2007 | 19,872 | 19,614 | 178 | 61 | 19 |
| 2008 | 23,277 | 5,076 | 11,556 | 4,754 | 1,891 |
| 2009 | 23,473 | 23,325 | 101 | 38 | 9 |
| 2010 | 27,230 | 7,437 | 14,104 | 4,220 | 1,469 |
| 2011 | 33,720 | | 24,320 | 7,013 | 2,387 |
| 2012 | 27,966 | | 19,857 | 6,109 | 2,000 |
| 2013 | 23,151 | | 16,627 | 4,958 | 1,566 |
| 2014 | 18,562 | | 14,443 | 3,242 | 877 |
| 2015 | 16,349 | | 12,181 | 3,130 | 1,038 |
| 2016 | 21,267 | | 17,245 | 3,107 | 915 |
| 2017 | 26,187 | | 20,677 | 3,936 | 1,574 |
| 2018 | 41,294 | | 34,272 | 4,681 | 2,341 |
| 2019 | 42,951 | | 32,642 | 6,706 | 3,603 |
| 2020 | 45,287 | | 34,276 | 7,289 | 3,722 |
| 2021 | 27,445 | | 17,979 | 5,360 | 4,106 |
| 2022 | 21,768 | | 13,987 | 5,295 | 2,486 |
| 2023 | 20,191 | | 11,871 | 5,284 | 3,036 |
| 2024 | 12,527 | | 8,486 | 3,008 | 1,033 |
| 2025 | 24,238 | | 15,237 | 5,997 | 3,004 |

No other value appears in any year (no `5`, `16`, `27`, blanks or padded strings). In 2010 the `NA` outlines are
January–May (7,430 of 7,437; 7 in June) and every month from June on is tagged, which confirms `DENSITY_START =
2010-06-01` and 2011 as the first full year.

**Conclusion.** NOAA's annual bundles carry text labels for every year, so the medium-and-heavy counts (D37) are right
for every year from 2011. Nothing to change. Not checked: the daily shapefiles NOAA also publishes (we don't use them),
and outline area (the number of Light outlines did not jump in 2022, so this check doesn't explain D37's jump in
light-smoke days; it only rules out a coding error).

## 2. Spokane PM2.5: autumn +8 µg/m³ per decade, months +3.8 to +6.9

**Question.** The seasons page shows autumn rising faster than any of its months (Sep +4.6, Oct +3.8, Nov +6.9).

**Evidence.** `analysis/seasonal.py` on Spokane's square (47.66, −117.43) reproduces the page: autumn +8.02, Sep +4.63,
Oct +3.78, Nov +6.90 (Sen's slope, per decade). The same series with ordinary least squares:

| | Sep | Oct | Nov | Mean of the three | Autumn (3-month mean) |
| --- | --- | --- | --- | --- | --- |
| Sen's slope | 4.63 | 3.78 | 6.90 | 5.10 | **8.02** |
| Least squares | 12.16 | 4.81 | 8.17 | 8.38 | **8.38** |

**Why.** Not a code bug. The seasonal and monthly rates are Sen's slopes, the median of all pairwise slopes, and a
median doesn't add up: the slope of an average is not the average of the slopes. Least squares does add up (8.38 both
ways), and Sen's autumn value lands right next to it. Each month's big years differ (September 2017, 2020, 2025 at
51–79 µg/m³; October 2013 at 38; November 2011 and 2021 at 30–38), so each month's median slope discounts its own
spikes, while the three-month average rises more steadily and its median slope stays high.

**Options (owner's choice; nothing changed):**
- Keep Sen's slope and add one line to the seasons page: "A season's rate is for its three-month average, so it can be
  larger than each month's."
- Or report seasons and months with least squares, like the yearly headline, so they add up. Sen's slope is the
  more robust choice for spiky series, which is why it was picked.

**A second finding, more important: MERRA-2 PM2.5 steps up in 2009–10 and ground monitors don't.**

MERRA-2 PM2.5 jumps in 2009–10 and stays up in Northwest autumns and in the Southeast (not in the Northeast), through
quiet fire years too. Mean MERRA-2 PM2.5 over the inland Northwest (42–49 °N, 124–110 °W), by year:

| Months | 2001–2008 | 2009 | 2010 | 2011–2025 |
| --- | --- | --- | --- | --- |
| Oct–Nov | 3.5–4.3 | 7.5 | 7.9 | 6.4–11.1 |
| Jan–Feb | 2.8–3.9 | 4.0 | 3.8 | 2.6–4.2 |

**Ground check (2026-11-15, `python -m tools.pm25_ground_check`).** EPA AirData daily PM2.5 (codes 88101 and 88502,
24-hour means, 2003–2016, 641 sites). For each site with the season in at least 4 years before (2003–08) and 4 after
(2011–16), the change between the two periods, on the ground and in MERRA-2's square for the same site-years:

| Region, months | Sites | Ground, 2003–08 → change | MERRA-2, 2003–08 → change |
| --- | --- | --- | --- |
| Inland Northwest, Oct–Nov | 69 | 9.9 → **−1.7** | 5.0 → **+6.1** |
| Inland Northwest, Jan–Feb | 53 | 10.8 → −2.0 | 4.6 → +0.2 |
| Southeast, Oct–Nov | 50 | 12.3 → **−3.4** | 7.8 → **+2.6** |
| Southeast, Jan–Feb | 29 | 10.8 → −2.5 | 7.5 → +1.4 |
| Northeast, Oct–Nov | 46 | 9.8 → −2.4 | 9.1 → −0.5 |
| Northeast, Jan–Feb | 22 | 11.9 → −1.3 | 9.1 → −0.4 |

Spokane Monroe St (53-063-0047, one monitor from 2004 to 2016), October–November, ground / MERRA-2's square:
2004–2008 10.8–13.5 / 4.0–4.5; 2009 7.6 / 8.9; 2011 9.5 / 25.5; 2013 13.4 / 28.5; 2016 7.3 / 16.4.

**Conclusion.** The step is in MERRA-2, not in the air: where it appears, ground PM2.5 fell over the same years and
months. MERRA-2 read Spokane's autumns at a third of the ground value before 2009 and up to 2.7 times it after. The
likely cause is MERRA-2's switch from monthly GFED-scaled fire emissions to daily QFED in 2010 (a GES DISC staff
reply on the Earthdata forum; Randles et al. 2017 not opened). The cause is unconfirmed; the artifact is not. MERRA-2
haze (AOD) shows a smaller step in Northwest autumns (0.057 → 0.085 in 2009, easing after) and none in the Southeast.

**What it does to the app.** PM2.5 trends that start in 2001 are inflated wherever fires matter:
- PM2.5 trend map, after the map-wide check: 2001–2025 rising 27.2% / falling 9.7% of the area; **2010–2025 rising
  0% / falling 0%**.
- Spokane's PM2.5 card: 2001–2025 +3.83 per decade (clear, then 5.0 → now 12.1); **2010–2025 +0.57 (p 0.75)**.
- Proposal P4's "PM2.5 rose in 9 Northwest cities" rests on the step.

Starting at 2010 removes the artifact but also drops the East's real 2001–2010 decline (which MERRA-2 already
understates: Northeast ground −2.4 against MERRA-2 −0.5). **Decided: PM2.5 trends start in 2010 (D41, data version
`2026-11-15-a6`).** The data file keeps 2001–2025; `sources/pm25_merra2.FIRST_TREND_YEAR` sets the start.

## 3. OMI NO₂: which version built the team's files (T34, D10)

**What we know.** The team's yearly files (`data/no2_years/`) have no metadata (no attributes, global 720 × 1440 grid).
Their original script (commit `4cdea61`, 2026-11-12) searched `OMNO2d` **without a version** and kept "the later name"
for each day, so a month could mix v003 and v004. It read `ColumnAmountNO2TropCloudScreened` and took a plain mean
of the valid days.

**The check.** `tools/no2_version_check.py` rebuilds one month from v003 and from v004 exactly that way and compares
both with the team's month on the US block: correlation, median difference, the share of identical cells, and the
least-squares mix of v003 and v004 that fits best. The right version should match almost exactly. About 25 MB is
fetched; nothing is saved; no token or URL is printed. Tested offline (`test/test_no2_version_check.py`).

**Run it in your own terminal** (the Earthdata login stays there):

```powershell
cd data_pipeline
..\.venv\Scripts\python -m tools.no2_version_check 2015 7
```

Optionally a second month after the 2020 rise: `..\.venv\Scripts\python -m tools.no2_version_check 2022 7`.

**Result:** pending the owner's run. If it says "matches v004", D10's caveat can go and the source line can say
v004. If it says v003 or a mix, rebuild with `python -m sources.no2_omi` (pinned to v004) before the NO₂ trend is trusted.

## 4. MERRA-2 variable names (M2TMNXAER)

**Evidence.** MERRA-2 File Specification (GMAO Office Note No. 9, v1.1, Bosilovich et al. 2016), table
`tavg1_2d_aer_Nx (M2T1NXAER): Aerosol Diagnostics`, pages 30–31. M2TMNXAER is the monthly mean of the same
collection (`tavgM_2d_aer_Nx`). Our builds have read these names from M2TMNXAER without error:
`data/pm25_monthly_global.nc` (the five PM2.5 terms) and `data/aod_monthly_us.nc` (TOTEXTTAU).

| Name | Long name (File Specification) | Units | Used by |
| --- | --- | --- | --- |
| DUEXTTAU | Dust Extinction AOT [550 nm] | 1 | not used yet |
| DUSMASS25 | Dust Surface Mass Concentration - PM 2.5 | kg m⁻³ | PM2.5 |
| OCSMASS | Organic Carbon Surface Mass Concentration | kg m⁻³ | PM2.5 |
| BCSMASS | Black Carbon Surface Mass Concentration | kg m⁻³ | PM2.5 |
| SO4SMASS | SO4 Surface Mass Concentration | kg m⁻³ | PM2.5 (× 132.14/96.06) |
| SSSMASS25 | Sea Salt Surface Mass Concentration - PM 2.5 | kg m⁻³ | PM2.5 |
| TOTEXTTAU | Total Aerosol Extinction AOT [550 nm] | 1 | haze (AOD) |

**Conclusion.** All names are right, and kg m⁻³ × 10⁹ = µg/m³ is what `sources/pm25_merra2.py` does. DUEXTTAU is in
the hourly table; it has not been fetched from the monthly collection yet, so check it on the first build that uses it.

## 5. NASA POWER 2025: final or preliminary?

**Evidence.**
- POWER's daily API names its source in the reply header. Phoenix, all parameters we use (`T2M`-family, `T2MWET`,
  `PRECTOTCORR`): 1–31 Dec 2025 → `["MERRA2", "POWER"]`; 1–5 Sep 2026 → `["MERRA2"]`; 1–5 Nov 2026 → `["GEOSIT"]`
  (requests on 2026-11-15, API v2.10.3).
- POWER's meteorology page: GEOS-IT fills from the end of MERRA-2 to near real time, and GEOS-IT values are
  overwritten as MERRA-2 arrives; it recommends ending trend analyses 2 months behind near real time
  ([POWER meteorology sources](https://power.larc.nasa.gov/docs/methodology/data/sources_meteorology/)).
- We use no solar parameter, so the CERES FLASHFlux (preliminary) vs SYN1deg question doesn't apply.

**Conclusion.** All of 2025 comes from MERRA-2, not the near-real-time stand-in, and the 64 cached points were refetched
on 2026-11-15. The values are final in that sense. Our 2001–2025 window already ends more than 10 months behind real time.

## The `us_mask` switch: how the maps shifted

`tools/trend_field.us_mask` now keeps a square when any of 5 × 5 sample points falls inside the Census lower-48
outline (`config/us_states.json`), instead of every square with a FIRMS fire detection. It no longer depends on which
fire files are on disk. Rerun on 2026-11-15 (`python -m tools.trend_field`, `python -m tools.map_frames`).

| Field | Squares before → after | Rising / falling, p < 0.05 (% of area) | After the false-discovery check |
| --- | --- | --- | --- |
| PM2.5 | 2,814 → 2,817 | 28.3 / 10.0 → 28.3 / 10.0 | 27.2 / 9.7 → 27.2 / 9.7 |
| NO₂ | 13,446 → 13,569 | 5.7 / 44.7 → 5.6 / 44.3 | 5.2 / 43.7 → 5.2 / 43.2 |
| Fires (1°) | 867 → 867 | 9.6 / 18.9 → unchanged | 6.9 / 13.1 → unchanged |
| Smoke days (new) | 2,817 | 39.1 / 0.0 | 31.9 / 0.0 |
| Haze, AOD (new) | 2,817 | 14.8 / 43.3 | 14.8 / 43.3 |

The false-discovery results barely move: a handful of coastal and border squares join or leave. The animated map's
lower-48 averages move in the second decimal (PM2.5 2025: 8.45 → 8.46). Smoke days rise across a third of the lower 48
and fall nowhere, after the map-wide check; haze falls over twice the area where it rises.
