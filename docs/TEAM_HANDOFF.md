# Climatch: team handoff (v3: detect, don't predict)

## 1. What the product does now
For any address, each factor answers four questions, all from real 2001–2025 NASA data:
1. **What happened:** then (first 5 years) → now (last 5 years)
2. **Is it real:** trend per decade, 95% CI, Mann-Kendall significance
3. **Why it matters:** one health sentence plus one source
4. **What it likely means:** wording depends on the test (getting worse / improving / no clear direction). **No future numbers.**

Cards are ordered by the user's health condition and age (`conditions.json`).

## 2. Cards

| Card | Data | Level (red/yellow/green)? |
|---|---|---|
| Very hot days (≥ 95 °F) | NASA POWER, ~50 km | yes |
| Warm nights (≥ 75 °F) | NASA POWER | yes |
| Very cold nights (≤ 10 °F; was "frost days") | NASA POWER | yes |
| Heavy rain days (+ sub-line: wettest day) | NASA POWER | **trend only** |
| Very dry days (+ sub-line: muggy days, which keeps colors) | NASA POWER | **trend only** |
| PM2.5 | MERRA-2, ~50 km | yes (US EPA 9 / EPA secondary standard and WHO interim target 3: 15) |
| NO₂: traffic & industry | OMI v004, ~25 km | **trend only** (no official limit for satellite NO₂) |
| Fire detections nearby | FIRMS, 1 km | **trend only**, from 2003 |
| Neighborhood surface heat (+ sub-line: heat island, which keeps colors) | MODIS, **1 km** | **trend only**, 2001–2022 (Terra orbit drift) |

Cutoffs were set on 2026-11-14 from US evidence; reasons are in `cutoff_source` and in `docs/US_DATA_RESEARCH.md`.

**Other checks** (links only, no score): radon (EPA), flood map (FEMA), local safety statistics.
We deliberately don't score crime: it isn't Earth-science data, and rating neighborhoods by crime can unfairly steer buyers.

## 3. Files

| File | Who uses it | Job |
|---|---|---|
| `pipeline.py` | backend | `build_report()`: the whole report |
| `thresholds.json` | backend + website | all limits, units, data source text |
| `narratives.json` | backend + website | definitions, health sentences, actions, sources, other checks |
| `conditions.json` | backend + website | condition and age dropdown options, card priority |
| `pm25_merra2.py`, `no2_omi.py`, `fires_firms.py`, `modis_lst.py` | data person builds; backend imports | each data source |
| `data/*.nc`, `data/fires/` | backend | built data files (Google Drive, not GitHub) |
| `tools/compare_cities.py`, `explore.ipynb` | data person / team meeting | checking and choosing cutoffs |

## 4. Backend

```python
import sys
sys.path.insert(0, "../data_pipeline")   # from backend/; points to the folder with pipeline.py
from pipeline import build_report

rep = build_report(lat, lon,
                   condition="asthma_copd",   # key from conditions.json
                   age_group="65_plus",       # key from conditions.json
                   period_years=25)           # 10, 15, 20 or 25 (page 1 "period to analyze")
```
- The first request for a new place downloads NASA POWER (10–60 s) and MODIS (2–6 min!). Both are then cached.
  - **For the demo: pre-run all demo cities.**
  - For unknown places, consider `sources=("pm25", "no2", "fires")` first (fast), and load MODIS in the background.
- `data_status` in the response says which sources worked. Show "not available" on cards that failed.
- The dropdown options come from `conditions.json` (`label` for display, key for the request).

## 5. Website: what changes

| Where | Change |
|---|---|
| Page 1 | Age group + health condition from `conditions.json`; replace "years ahead" with **"Period to analyze: 10 / 15 / 20 / 25 years"** |
| Overall box | `overall`, `overall_drivers`, `worsening_factors`, `verdict_rule` |
| Card order | `card_order` (★ `priority_for_user` cards first) |
| Card header | `label`, `level` (or "Trend only" if `null`), `trend_direction` arrow: ↑ worse / ↓ better / → no clear trend |
| Card body | `story.happened`, `story.is_it_real`, `story.why_it_matters`, `story.what_it_likely_means` |
| Card caveat | `caveat`: one honest sentence about the data's limits, shown under the numbers |
| Card numbers | `then` (`then_years`) → `now` (`now_years`), `slope_per_decade`, `slope_ci95_per_decade`, `significance_label`, `p_label` |
| Chart | `points` (dots), `line` (trend + `lo95`/`hi95` band). **Ends in 2025, no dashed extension** |
| Month heatmap and two-year comparison | `monthly` (`value` and `anomaly`), coloured by `monthly_classes` (`value`: 6 equal-count edges; `anomaly`: 4 edges of anomaly size, used on both sides of zero) |
| **How unusual a month is** (A2) | `monthly[].z`: the month's distance from its calendar month's mean in SD units (`null` when that month never varies). Months with abs(z) ≥ 2 are the "unusual" ones (event matching, anomaly heatmap) |
| **Seasons and the monthly test** (A2) | `seasonal` (`null` with fewer than 8 complete years, e.g. summer-only surface heat): `overall` (Seasonal Kendall corrected for month-to-month memory: `p`, `p_label`, `clear`, `slope_per_decade` in the headline's unit, `n_years` complete years), `seasons[4]` and `months[12]` (each `slope_per_decade`, `p`, `q` = Benjamini-Hochberg within its 4 or 12, `clear` = q < 0.05, or `available: false`), `anomaly_test` (Hamed-Rao on monthly anomalies, `method` says if it fell back to pre-whitening), `years_needed` (`even_odds` and `likely`: years of data for a 50% and 90% chance of a clear result, Weatherhead 1998; `null` when the rate is 0), `season_agg` (`sum` for counts, `mean` for levels, `max` for wettest day), `normals[12]` (each calendar month's `p10`, `p25`, `p50`, `p75`, `p90` over the period: the "normal range" bands). Built by `analysis/seasonal.py` |
| **One year's weight** (A2) | `leave_one_out` (`null` under 9 years): `clear` (yearly Mann-Kendall verdict), `years[]` (`year`, `p`, `clear`, `slope_per_decade` with that year left out), `flips` (years whose removal changes the verdict) |
| **Timeline: smooth line** | `timeline.rolling_5yr` (5-year average, less noisy than the dots) |
| **Timeline: decade bars** | `timeline.decades` (2000s / 2010s / 2020s averages; simplest chart for the public) |
| **Timeline: markers** | `timeline.highlights` (worst / best year, top 3 worst) and `timeline.unusual_years` (worse than 9 in 10 years) |
| **"Years that stood out"** | `notable_years`: years when several factors were unusually bad together, with ready-made `text` |
| **Compare places** (A3, `GET /api/v1/places/compare`) | `cities[]` (`name`, `state`, `lat`, `lon`, `factors{key: now, then, slope_per_decade, p, q, clear, level, direction, last5[]}`) and `factors[]` (labels, units, cutoffs). `q` is Benjamini-Hochberg across the 51 cities; `clear` = q < 0.05. Built by `python -m tools.compare_export` |
| **Week by week** (A3, `GET /api/v1/weekly`) | `blocks[52]` (`week`, `start`, `end`, `value`, `p10`–`p90`, `unusual`): one year of a daily POWER variable against each week's usual range. No p-values |
| **New factors** (A4) | `humid_heat_days` (wet-bulb ≥ 24 °C, D27), `smoke_days` (NOAA HMS, medium and heavy smoke only, from 2011, D37), `aod` (MERRA-2 haze), `rain_sat` (GPM IMERG, under heavy rain), `surface_heat_5km` (MODIS monthly, to 2022), `water_storage` (GRACE, from 2002; higher is better). All trend only, with `caveat` and `data_source`; states get the five grid ones from `/regions/{code}/series` |
| **Patterns** (A4, `GET /api/v1/patterns?lat&lon` or `?region`) | `relations[]` (`a` leads `b` by `lag` calendar months, `r`, `p`, `q`, `clear`, `same_source`, `sentence`, `lead_hits` {`cases`, `hits`, `rate`, `chance` from a circular-shift test, `p`, `clear`}), `relations_tested` (tests in the correction), `labels`, `units`, `warnings[]` (`signs`: rolling `variance`/`memory` with `rising`; `exceedance`: months a year above the record's top-10% line, `first` vs `last` over `early_years`/`late_years`), `compound[]` (per-year counts, trend). The pair chart's lines: `GET /api/v1/patterns/pair?a&b&region` (or `lat`/`lon`). Say "describes the past"; never a forecast |
| **Place search** (D34) | `GET /places/suggest` rows have `kind` (State, City, Town, ZIP code, Village, County, Address, Street, Neighborhood, Small place, Landmark), `main`/`secondary` (two lines), `extent` (west, south, east, north) and, for a state, `region`. Map clicks: `GET /places/reverse`. State outlines: `GET /regions/{code}/outline` |
| **Custom years** (A3) | `/reports` and `/regions/{code}/series` accept `start` and `end` (at least 8 years, inside the data) instead of `period` |
| **US map** (separate file, `GET /api/v1/maps/{factor}`) | `grid` (`lats`, `lons`, `dlat`, `dlon`), per-cell `slope`, `p`, `then`, `now`, `sig` (p < 0.05), `fdr` (also passes Benjamini-Hochberg at 0.10), `breaks` (change colours), `level_breaks` (Then/Now colours), `summary`, `period`, `then_years`, `now_years`, `unit`, `source`. Built by `python -m tools.trend_field` |
| **Animated map** (separate file, `GET /api/v1/maps/{factor}/frames`) | `grid`, `years` (each frame's last year), `span` (3 = trailing 3-year mean), `base_years`, `level_breaks`, `change_breaks`, `values` and `change` ([frame][cell]), `us_mean`, `us_change`, `unit`, `source`. Built by `python -m tools.map_frames` (D36) |
| Limits bar | `limits.caution_from`, `limits.high_from`, `limits.source`, `limits.reference_only` |
| Data line | `data_source` |
| Always-the-same cards | `constant: true` (e.g. 0 frost days every year in a hot city): show the card small or collapsed with `story.happened`; `significance_label` is "No change". These are sorted last |
| Sub-lines | factors with `parent` (muggy under dry, wettest day under heavy rain, heat island under surface heat) |
| Actions | `actions` (each has `label`, `actions`, `source`) |
| Other checks box | `other_checks` |
| Remove | every "2046", "if the trend continues", projection band, "where a single year could land" |

## 5b. Files the frontend can use right now
- The sample report inside `frontend/src/pages/ReportPage.jsx`: **fake numbers**, real structure, used only when no report is passed in.
- `demo_reports/` (`python -m tools.export_demo`): real reports for Phoenix, Houston, Miami, New York, Atlanta, Boise and Minneapolis, for 10 and 25 years; `demo_reports/trend_fields/` holds the US map files and `demo_reports/map_frames/` the animated map's frames.

## 6. Team decisions still open

1. **Cutoffs** were set on 2026-11-14 (see `docs/US_DATA_RESEARCH.md`). Still open: switch `tools/compare_cities.py` to US cities and rerun it to confirm the verdict spread.
   - To change a cutoff: edit `thresholds.json` → rerun `python -m tools.compare_cities` → update the one-line reason in `cutoff_source`.
2. **Sources** in `narratives.json` were checked on 2026-11-14. Open each `source_url` once more before the demo.
3. **Which countries to download fires for** (demo cities' countries at minimum).
4. **Team name** in the footer.

## 7. Honest limits (say them if judges ask)
- POWER and MERRA-2 are ~50 km averages, so they show the regional trend, not one street. MODIS heat (1 km) is the neighborhood-level card.
- Satellite NO₂ is the whole air column, so we show the trend only, with no health level.
- MERRA-2 PM2.5 has no nitrate and can read lower than city monitors.
- FIRMS fires: only downloaded countries; cross-border fires aren't counted.
- "What it likely means" describes persistence of the past trend in words. It is **not** a forecast.
