# US data research before backend and data work

**Date:** 2026-11-14 · **Status:** research notes. No code in this repo was changed.
**What was run:**
- The team's own `pipeline.build_report()` (POWER cards only, current `thresholds.json`) on 22 US cities.
- NASA's public catalog (CMR) for the NO2 and PM2.5 products.
- FIRMS file checks.
- MODIS Terra vs Aqua surface heat for Phoenix.
- The team test suite.

No Earthdata login was used, so the PM2.5 and NO2 builds themselves were not run.

## Fix before building (ranked)

| # | Issue | Evidence | Fix | Effort |
| --- | --- | --- | --- | --- |
| 1 | The root ignore file is named `gitignore`, without the dot, so Git ignores it. `data/`, `cache/`, `.env` and `*.nc` are **not** ignored | `git ls-files` shows `gitignore` | Rename it to `.gitignore` | 1 min |
| 2 | **NO2 versions get mixed.** `search_data(short_name="OMNO2d")` returns both v003 and v004. The code keeps whichever file comes last for each day | CMR: 62 files for July 2024 (31 per version). v003 has 0 files after March 2026; v004 covers 2004-10 to now (31 files in Jan 2005 and Jan 2015) | Add `version="004"` to `search_data` in `sources/no2_omi.py`. Mixing versions puts artificial jumps into a trend | 1 line |
| 3 | **Cutoffs turn the US red.** Under the `TEAM_TODO` values, **16 of 22 US cities are "High risk", 5 "Caution", only Seattle "Suitable"**, from POWER cards alone. PM2.5, fires and surface heat can only add red | Table below | Use the US cutoffs proposed below | Edit `thresholds.json` |
| 4 | **The PM2.5 build downloads ~24 GB** | CMR: `M2TMNXAER` is 80 MB per monthly file × 300 months, and only 5 variables are used | Read with `earthaccess.open()` plus `xarray` (only the 5 variables), as `no2_omi.py` already does. Crop to a US box before saving. Time 1 month first | Small; needs an Earthdata login to test |
| 5 | **The test suite fails to collect** | `test/test_story_writer.py` imports `ai.story_writer`, but `ai/` was never committed. The other **31 tests pass** | Commit `ai/`, or skip that test until it lands | Small |
| 6 | **The demo cities aren't US** | `tools/compare_cities.py` and the handoff use Hanoi, Delhi and Ho Chi Minh City | Use the US set below | Small |
| 7 | **The handoff overstates POWER wait times** | 25 years of daily data took **1.2–1.7 s per city** cold (22 cities, 3 in parallel). The handoff says 10–60 s | POWER can be live for any address. Only MODIS needs precompute | Doc |
| 8 | Unpinned `requirements.txt`; pandas 3 deprecates `dayofyear` | pytest warnings at `sources/power.py:82` and `test/conftest.py:20` | Use `day_of_year`; pin versions | Small |

## Cutoffs: what the current values do to US cities

POWER cards, "now" = 2021–25 average. Current levels: **H** = high risk, **C** = caution.

| City | Hot days ≥ 35 °C | Warm nights ≥ 20 °C | Frost days < 0 °C | Heavy rain ≥ 20 mm | Muggy (dew ≥ 21 °C) |
| --- | --- | --- | --- | --- | --- |
| Phoenix AZ | 141 H | 131 H | 4 | 2 | 1 |
| Houston TX | 79 H | 156 H | 12 | 12 C | 118 H |
| Miami FL | 0 | 335 H | 0 | 5 | 234 H |
| New York NY | 0 | **63 H** | 44 | 19 C | 36 C |
| Atlanta GA | 22 | **65 H** | 51 | 14 C | 27 |
| Chicago IL | 0 | 41 C | 80 C | 8 | 15 |
| Denver CO | 5 | 0 | **159 H** | 2 | 0 |
| Minneapolis MN | 3 | 11 | **156 H** | 8 | 8 |
| Seattle WA | 1 | 0 | 25 | 9 | 0 |

Problems:
- **Warm nights ≥ 20 °C** is the global climate index (ETCCDI TR20). In the US it marks a normal New York or Atlanta summer as high risk.
- **Frost days** marks every northern city as high risk for having winter.

### Proposed US cutoffs (tested on the same 22 cities)

| Card | Current | Proposed | Result (2021–25 days a year) |
| --- | --- | --- | --- |
| `hot_days` | ≥ 35 °C (95 °F), caution 30 / high 60 | **Keep** | High: Phoenix 141, Las Vegas 118, Fresno 108, Midland 91, Houston 79. Caution: Boise 32. Others OK |
| `warm_nights` | ≥ 20 °C, 30 / 60 | **≥ 24 °C (75 °F), caution 30 / high 90** | High: Miami 236, New Orleans 124, Phoenix 93. Caution: Houston 73, Las Vegas 66. OK: New York 6, Atlanta 1 |
| `cold_days` | frost < 0 °C, 60 / 120 | **Very cold nights ≤ −12 °C (10 °F), caution 10 / high 30.** Rename the card "Very cold nights" | High: Fairbanks 136, Minneapolis 51, Missoula 38. Caution: Des Moines 24, Salt Lake City 14, Denver 11. Others OK |

These proposals are team-defined, like the current values. Write the reason in `cutoff_source`. One honest line works: "75 °F nights and 10 °F nights mark the warmest and coldest US climates in NASA POWER's 50 km grid." Re-run `compare_cities` with the US list after changing them.

## Period options: 10 and 15 years rarely detect anything

Share of the 22 cities with a significant trend (Mann-Kendall p < 0.05):

| Card | 25 years | 10 years |
| --- | --- | --- |
| Warm nights | 41% | 0% |
| Frost days | 18% | 5% |
| Dry days | 14% | 5% |
| Muggy days | 14% | 5% |
| Hot days | 9% | 9% |
| Heavy rain days | 9% | 0% |
| Wettest day | 5% | 0% |

The challenge says a non-significant trend is still interesting, and that it may only need more years. So either default to 25 years and explain this on the 10-year view, or drop the 10 and 15 options.

## Data sources: size and access

| Source | Login | Size / time | Use |
| --- | --- | --- | --- |
| NASA POWER daily | None | 1.2–1.7 s per address, 25 years | Live, per request |
| FIRMS US country files | None | 3.6 MB (2001) to 10 MB (2024) per year, so ~200 MB for 2001–2025. 2025 is available | Build `modis_United_States.parquet` once |
| MERRA-2 `M2TMNXAER` (PM2.5) | Earthdata | 80 MB × 300 files if downloaded. Much less if only 5 variables are streamed (untested) | Build once, crop to the US |
| OMI `OMNO2d` v004 (NO2) | Earthdata | ~11 MB × ~7,700 daily files streamed ("several hours" per the code notes) | Build once, crop to the US. Pin v004 |
| MODIS LST (ORNL web service) | None | See below | Precompute demo cities |

**Backend consequence:** after a US crop, the PM2.5 and NO2 monthly files are small enough to ship with the backend. That removes the Google Drive dependency for deployment. Only MODIS for a new address is slow.

## MODIS surface heat: end the trend in 2022, and precompute

**Terra's orbit drift shows up in the data.** Phoenix, 3×3 km summer (Jun–Aug) daytime LST from MOD11A2:
- **2001–2022:** flat at about 50 °C (Sen +0.03 °C per decade, p = 1.0).
- **2023–2025:** averages 48.3 °C, vs 50.2 °C for 2018–22.
  - 2025 reads 46.6 °C.
  - 2024 reads 48.4 °C, even though summer 2024 was Phoenix's hottest on record in air temperature.
- **Including 2023–25 flips the trend to −0.23 °C per decade.**

Terra's morning overpass has drifted more than an hour earlier since 2020, so recent years see cooler ground. Fit `surface_heat` on 2001–2022 only. A Terra-vs-Aqua comparison is still downloading; add it here when it finishes.

**The ORNL web service is the schedule risk.**
- On 2026-11-14 it returned 502 and 503 errors and took 28–61 s per call.
- `fetch_lst` caches only after all ~115 requests succeed, so one failure throws away the whole place.
- Fetching only the June–August composites took about 35 minutes for one place. Chunk the requests within each summer: the 10-composite limit applies to the date *range*, not just the dates you ask for.
- Precompute the demo cities in hour 0, and don't promise surface heat for new addresses.

**Heat island in a desert reads negative.** Phoenix came out at −0.2 °C in summer 2024; irrigated city areas are cooler than bare desert. Atlanta read +2.4 °C. MODIS leaves water pixels empty, so lower Manhattan returns no data.

## Full research report

The deep research (cutoffs with sources, PM2.5 and NO2 streaming recipes, backend and hosting, ground-truth caveats, and a 16-step change list) is kept outside the repo. A few highlights beyond this note:
- `pm25.high_source` mislabels 15 µg/m³ as WHO interim target 4. It is target 3.
- Several `narratives.json` sources don't support their sentences.
- Fire trends should start in 2003, when Aqua joined.
- Hugging Face Docker Spaces are no longer free; use Render.

## US demo cities (mapped from the US trend research)

| City | Lat, lon | Strongest cards |
| --- | --- | --- |
| Phoenix AZ | 33.45, −112.07 | Hot days 141 a year, warm nights, surface heat, heat island. Station check (NOAA USW00023183): nights ≥ 90 °F rose from 1.8 to 23.4 a year (1981–85 vs 2021–25) |
| Houston TX | 29.76, −95.37 | Hot days, warm nights, muggy days: the strongest live POWER trends |
| New York NY | 40.71, −74.01 | Heavy rain days (significant), wettest day |
| Boise ID | 43.62, −116.20 | Wildfire smoke rising: summer haze +121% (2001–05 → 2021–25, POWER AOD_55), fires card |
| Atlanta GA | 33.75, −84.39 | The opposite of Boise: summer haze −30%; PM2.5 likely falling |
| Midland TX | 31.99, −102.08 | NO2 from the Permian oil boom rising (literature: +3%/yr 2010–15), soil drying |

## Still open (needs a login or a team decision)

- [ ] Create a free Earthdata Login account. Then time (a) one month of PM2.5 with `earthaccess.open` and (b) one year of NO2 v004.
- [ ] Decide whether to adopt the proposed cutoffs.
- [ ] Decide on the period options: keep 10 and 15 with an explanation, or offer 20 and 25 only.
- [ ] Commit `ai/story_writer.py`, or remove its test.
- [ ] Re-check MERRA-2 PM2.5 for Boise vs Atlanta once the build exists. POWER's summer AOD shows West up and East down, but annual-mean PM2.5 may hide the smoke season.
