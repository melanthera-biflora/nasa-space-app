# Charts and data audit (2026-11-15)

An expert pass over every chart and record within the rules (no browser statistics, no forecasts, no scores, colour with words, hand-drawn SVG). The bugs in `docs/reviews/site-critique-2026-11-15.md` are not repeated. Compare-page design is in `compare_patterns.md`, next to this file.

**Sources:** the code, plus the live app at 1280 px (Denver `/explore` very hot days, `/test` ground heat, `/compare`).

## 1. Charts

**Cross-cutting**

- **Phone text:** SVG text scales with the `viewBox`. A 12 px tick in a 720-unit chart renders at about 6 px on a 375 px phone (`MonthlyLine`, `BandChart`, `CyclePlot`, `TrendChart`, `YearBars`). That breaks the 12 px floor. Draw in CSS pixels from a measured width, or put the labels in HTML (M).
- **Browser statistics:** `stripes()` and `cycle()` (`presenters/detective.js`) compute means in the browser. Use `seasonal.normals` p50, or pipeline classes (S).

| Chart | Page | Question | Encoding · a11y | Weak | Improvement | Effort |
| --- | --- | --- | --- | --- | --- | --- |
| `YearBars` | `/report` | What changed? | Bars from 0, two labelled 5-year means. One tab stop, spoken readout | Zero-based bars on °C hide the change: ground heat 39 → 39.6 °C looks flat | For °C records, draw bars from the early average (config flag) | S |
| `TrendChart` | `/test` | Is it real? | Yearly line, OLS line and band. Roving points | Live: axis 0–46.8 with ticks 11.7/23.4/35.1, so the data sits in the top tenth. OLS CI next to a Mann-Kendall p. "Not significant yet" under "Not clear yet". No table | Data-fit domain with `niceTicks`, a Sen line with its interval, one vocabulary, a `ChartFrame` table | S |
| `MonthlyLine` + `Stripes` | `/explore` | What does the series look like? | Months, yearly dots, band, events, stripes. One tab stop | The y domain ignores yearly points, so count totals fall outside it (live: Denver hot-day dots above the top tick). The OLS mean-line CI is labelled "95% band" | For counts, use two panels (yearly bars, a monthly strip). Rename the band "trend lines that fit" | M |
| `TrendBars` | `/seasons` | Which season or month? | Diverging bars, faded if BH says not clear, with words | No interval | Sen CI whiskers (`theilslopes`) from `seasonal._family` | S |
| `CyclePlot` | `/seasons` | Each month across years | Twelve panels, mean tick, colour when clear. Readout | Only the maximum is labelled, with no unit. Direction is colour only | Minimum and maximum with the unit, normals p50, a slope segment per clear panel | S |
| `MonthHeatmap` | `/seasons` | When did months stand out? | Year × month, equal-count classes | Mouse-only, readout hidden, `role=img`, no table. The legend shows only its ends, but the classes are quantiles | `ChartFrame` table, roving readout, class edges in the legend | M |
| `BandChart`, `WeekStrip` | `/events` | This year vs normal | p10–90 and p25–75 bands. Readout; labelled radios | Rings mark \|z\| ≥ 2, but the band shows percentiles, so a point outside the band can be unringed. Week 52 holds 8–9 days | Ring "outside the usual range"; note week 52 | S |
| Unusual months | `/events` | Spike or trend? | Gauge to 4 SD, event match | z ignores the trend, so late months of a rising record rank high | Rank by detrended z (`patterns._anomalies`) | S |
| `TimeMap` | `/map` | Year by year | One equal-count scale, slider, live caption | Squares readable by mouse only | Arrow-key squares (reuse `stepSquare`) | S |
| `TrendMap` | `/map` | Where is change clear? | FDR colour, hatching, keyboard squares, legend filter | Best chart. But no smoke or AOD, and the readout gives an OLS rate | Add `smoke_days` and `aod` fields, with a Sen rate | M |
| `CityScatter` / `CompareMap` | `/compare` | Level vs change | x level, y slope; the list is the keyboard path | Live: x ticks 35.4/70.7, no y values. Unclear trends plot like clear ones | Hollow dots for not clear; round ticks | S |
| `MultiLine` | compare, `/patterns` | Move together? | Lines, dashes, crosshair | No role, no label, no keyboard; no table on `/patterns` | `role=group`, a `chartIndex` readout | S |
| `LinkWeb` | `/patterns` | What moves together? | Ring, stroke = \|r\|. Roving edges | Arbitrary order, so edges cross | Lead with the ranked list; order nodes by dataset | S |
| Dumbbell, sparks, hit bars | `/patterns` | Extremes, swings, clues | Small multiples with labels | No 0–10 ends; "growing" means τ > 0.5 on overlapping windows; no case counts | Label the ends, show "8 of 23", flag thin windows | S |
| `FootprintMap` | `/about` | What area is averaged? | Outlines with a labelled region | Fixed to Spokane; misses GRACE, IMERG, MODIS 5 km and HMS | Place from the URL; add the missing footprints | S |

## 2. Datasets

**What every record goes through:**
- **Yearly test:** an OLS slope with a t-based CI; Mann-Kendall `original_test`; 5-year then and now; leave-one-out.
- **Seasonal block:** correlated Seasonal Kendall; per-season and per-month Mann-Kendall and Sen with BH; Hamed-Rao; Weatherhead years needed.

**Mismatches:**
- The OLS rate can disagree with the Mann-Kendall verdict.
- For counts, the slope comes from yearly totals but p from the months.
- Ground heat reports a summer (JJA) headline, but its "monthly test" runs on every month.

| Record | Source · grid · years | Caveat | Risk |
| --- | --- | --- | --- |
| Very hot days ≥ 35 °C | POWER T2M_MAX · 50 km · 2001–25 | Highs about 1 °C cool; 0 in cool climates | M |
| Warm nights ≥ 24 °C | POWER T2M_MIN | Misses urban night heat | M |
| Very cold nights | POWER T2M_MIN | Valleys; "fewer = better" is a judgement | L |
| Heavy rain, wettest day | POWER PRECTOTCORR | The model flattens downpours | M |
| Very dry days | POWER RH2M daily **mean** < 20% | Rarely reached | M: false "no change" |
| Muggy days | POWER T2MDEW | Station-like | L |
| Humid-heat days (D27) | POWER T2MWET mean | No daily peak | M |
| PM2.5 | MERRA-2, no nitrate · 2001–25 | Reads low (Buchard et al. 2017); a 5-year model mean is judged against EPA's monitor standard | **H: false "Suitable"** |
| NO₂ | OMI · 25 km · 2005–25 | **Version unverified (D10), yet `thresholds.json` and `map_frames` say v004.** A column; the background rises after 2020 | M–H |
| Fires | FIRMS MODIS · 50 km · 2003–25 | Flares, farm burns, Terra/Aqua drift; never splice VIIRS on | M |
| Smoke days | HMS medium + heavy (D37) · 2011–25 | Smoke may be aloft; GOES-16 from 2017; cloud hides smoke; 15 years | M: low power |
| Haze (AOD) | MERRA-2 · 2001–25 | Column, filled in by the model | L |
| Rain (IMERG) | V07 · 10 km · to Sep 2025 | Inputs change in 2014; snow; the "now" window ends 2024 | M |
| Ground heat 5 km | MOD11C3 · to 2022 | Clear-sky only | M |
| Surface heat, heat island | MOD11A2 · demo cities | Precomputed only | M |
| Water storage | GRACE/GRACE-FO · 300 km · 2002–25 | 2017–18 gap. Years with 9–11 months average silently. `uncertainty` unused. Strong memory | **H: overconfident p** |
| State series | POWER regional · 1981–2025 | A state blend; soil wetness modelled | L |
| Events (15) | `events.json` | Nothing is tagged for smoke days, AOD, IMERG, GRACE or humid heat | M (S fix) |
| Trend fields | `trend_field.py` | Mann-Kendall per cell, no memory correction | L–M |

**Unverified:** whether POWER's 2025 values are final MERRA-2, and whether Aura's late orbit drift touches OMI.

## 3. Analysis improvements, ranked

Ranked by household value, then soundness. All are in the pipeline, adding fields without renaming any.

| # | Idea | Verdict | Effort | Files | Rationale (source) |
| --- | --- | --- | --- | --- | --- |
| 1 | BH across a report's records | Accept | S | `pipeline.py`, `presenters/reportView.js`, TEAM_HANDOFF §5 | 16 tests at 0.05 give about one false "clearly" per report, and the hero counts them. Compare already applies BH (Benjamini & Hochberg 1995) |
| 2 | Confidence wording from existing checks | Accept | S | `reportView.js`, `detective.js` `takeaway` | "Holds without any single year" or "hangs on 2021", from `leave_one_out` and the monthly test. Stop saying "rose" for a change that isn't clear (Mastrandrea et al. 2010) |
| 3 | Data-quality flag per record | Accept | S | `thresholds.json`, `make_factor`, `RecordRow`, `/about` | One badge: "Model estimate · 50 km · until 2022". It fixes the NO₂ label |
| 4 | Season length | Accept | M | `sources/power.py`, `thresholds.json`, `narratives.json` | Frost-free and hot-season length from cached daily data (EPA growing-season indicator; ETCCDI GSL, Zhang et al. 2011) |
| 5 | Heat index days; reject WBGT | Split | M | `power.py`, `thresholds.json` | Rothfusz 1990 from T2M_MAX and T2MDEW gives NWS levels. WBGT needs sub-daily sun and wind (Liljegren et al. 2008) |
| 6 | Afternoon humidity for dry days | Accept | S | `power.py` | Minimum RH via the Magnus formula from T2M_MAX and T2MDEW; Red Flag criteria use minimum RH |
| 7 | Autocorrelation-aware yearly test | Accept | S–M | `analysis/trends.py`, `trend_field.py` | Trend-free pre-whitening (Yue et al. 2002), already in `pymannkendall`, for water storage, soil and PM2.5 |
| 8 | Sen slope and its interval everywhere | Accept | M | `trends.py`, `TrendChart`, `MonthlyLine`, `verdict()`, `compare_export` | Consistent with Mann-Kendall; `scipy.stats.theilslopes(alpha=0.95)` (Sen 1968) |
| 9 | Percentile thresholds | Accept for Look closer | M | `power.py`, `thresholds.json` | TX90p with 1981–2000 base years avoids the in-base bias (Zhang et al. 2005); NWS HeatRisk is percentile-based. Keep fixed cutoffs for levels |
| 10 | Spatial context | Accept for gridded records | M | `trend_field.py`, backend, presenter | "Faster than most of Colorado's squares", with no rank words (Wilks 2016) |
| 11 | Known-break check | Accept as QA; reject user-facing change points | M | new `tools/break_check.py` | SNHT or Pettitt at documented dates (HMS 2022, GOES-16 2017, MODIS 2020, IMERG 2014), feeding #3. A2 excludes change-point panels |
| 12 | PM2.5 level check | Team decision (new data) | M | `tools/`, `thresholds.json` | Compare with ACAG satellite PM2.5 (van Donkelaar et al. 2021) for 51 cities |
| 13 | Return periods | Reject fitting; accept counts | S | `narratives.json` | 25 maxima give wide GEV levels, and a return level reads like a forecast. Count instead, and link NOAA Atlas 14 |

**Not checked:** phone screenshots (text size worked out from the code and CSS); screen readers. #1, #7 and #8 change verdicts, so they need a decision and a `DATA_VERSION` bump.
