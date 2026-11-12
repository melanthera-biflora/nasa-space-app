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
| Very hot days | NASA POWER, ~50 km | yes |
| Warm nights | NASA POWER | yes |
| Frost days (new) | NASA POWER | yes |
| Heavy rain days (+ sub-line: wettest day) | NASA POWER | yes |
| Very dry days (+ sub-line: muggy days) | NASA POWER | yes |
| PM2.5 | MERRA-2, ~50 km | yes (US EPA 9 / WHO 15) |
| NO₂: traffic & industry (new) | OMI, ~25 km | **trend only** (no official limit for satellite NO₂) |
| Wildfire activity nearby (new) | FIRMS, 1 km | yes |
| Neighborhood surface heat (+ sub-line: heat island) (new) | MODIS, **1 km** | yes |

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
| Card numbers | `then` (`then_years`) → `now` (`now_years`), `slope_per_decade`, `slope_ci95_per_decade`, `significance_label`, `p_label` |
| Chart | `points` (dots), `line` (trend + `lo95`/`hi95` band). **Ends in 2025, no dashed extension** |
| Technical charts | `monthly` (`value` and `anomaly`) |
| **Timeline: smooth line** | `timeline.rolling_5yr` (5-year average, less noisy than the dots) |
| **Timeline: decade bars** | `timeline.decades` (2000s / 2010s / 2020s averages; simplest chart for the public) |
| **Timeline: markers** | `timeline.highlights` (worst / best year, top 3 worst) and `timeline.unusual_years` (worse than 9 in 10 years) |
| **"Notable years" strip** | `notable_years`: years when several factors were unusually bad together, with ready-made `text` |
| Limits bar | `limits.caution_from`, `limits.high_from`, `limits.source`, `limits.reference_only` |
| Data line | `data_source` |
| Always-the-same cards | `constant: true` (e.g. 0 frost days every year in a hot city): show the card small or collapsed with `story.happened`; `significance_label` is "No change". These are sorted last |
| Sub-lines | factors with `parent` (muggy under dry, wettest day under heavy rain, heat island under surface heat) |
| Actions | `actions` (each has `label`, `actions`, `source`) |
| Other checks box | `other_checks` |
| Remove | every "2046", "if the trend continues", projection band, "where a single year could land" |

## 5b. Files the frontend can use right now
- `SAMPLE_REPORT_FAKE.json`: **fake numbers**, real structure. Build the whole page and all charts from it today.
- `demo_reports/` (made by the data person with `python -m tools.export_demo`): real reports for Phoenix, Seattle, Miami and Hanoi, for 10 and 25 years. The backend can also serve these during the demo if NASA is slow.

## 6. Team decisions still open

1. **Cutoffs** marked `TEAM_TODO` in `thresholds.json`: hot days, warm nights, frost, heavy rain, wettest day, dry, muggy, fires, surface heat, heat island.
   - Process: run `python -m tools.compare_cities` → look → adjust → rerun → write a one-line reason in `cutoff_source` → delete `TEAM_TODO`.
2. **Sources to verify** (`TEAM_CHECK` in `narratives.json`): wildfire link, and a cold-weather health source.
3. **Which countries to download fires for** (demo cities' countries at minimum).
4. **Team name** in the footer.

## 7. Honest limits (say them if judges ask)
- POWER and MERRA-2 are ~50 km averages, so they show the regional trend, not one street. MODIS heat (1 km) is the neighborhood-level card.
- Satellite NO₂ is the whole air column, so we show the trend only, with no health level.
- MERRA-2 PM2.5 has no nitrate and can read lower than city monitors.
- FIRMS fires: only downloaded countries; cross-border fires aren't counted.
- "What it likely means" describes persistence of the past trend in words. It is **not** a forecast.

## 8. AI story (optional, `ai/story_writer.py`)
- **What:** one Claude call per report turns the analysis into a short story: `headline`, `summary`, `factor_sentences` (one per card), `looking_ahead`, `caveat`.
- **Backend:** `from ai.story_writer import write_story` then `rep["ai_story"] = write_story(rep)`. It needs `ANTHROPIC_API_KEY` set on the server (from platform.claude.com). **Never put the key in code or GitHub.**
- **Safety:** the AI only sees the finished facts, never calculates, and every number it writes is checked against the analysis. If anything is off, or there's no key or no internet, `write_story` returns the template sentences instead (`source: "template"` plus `reason`). The page never breaks.
- **Cost and speed:** a few seconds per new report, cached in `cache/stories/`. Pre-run the demo cities.
- **Website:** show `ai_story` at the top of the report. If `ai_story.source == "ai"`, add a small "Written with AI from NASA data" label.
- **Still check by eye:** the number check can't catch wrong *words* (e.g. calling a non-significant change a trend). Read the demo-city stories once before presenting.
