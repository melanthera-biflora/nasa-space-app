# Submission draft: Climatch (T35)

**Status:** draft for the Product owner, updated 2026-11-15 after amendments A2–A4. Adjust the headings to the Space Apps project form. Every claim here is backed by a doc named next to it. Numbers were checked live on 2026-11-15 (see the demo script in `docs/TREND_DETECTIVE_PLAN.md` and `docs/PATTERNS_FINDINGS.md`).

## Project name and one line

**Climatch, an Earth System Trend Detective.** Pick a US home and say who lives there: Climatch tests 25 years of NASA data for that spot and shows what changed, how fast, whether the change is real, which months and seasons carry it, whether a spike was a disaster or part of a trend, what moves together, and where else in the country the same thing is happening.

## Challenge: Be An Earth System Trend Detective

| The challenge asks for | Where Climatch does it |
| --- | --- |
| Choose variables of interest, with plain definitions | 16 records for any US address (18 in the six cities with neighborhood heat): heat, cold, rain, humidity, humid heat, smoke, haze, PM2.5, NO₂, fires, ground heat, water storage and more. 12 for a state. Each has a one-line definition and a "what the data can't see" caveat |
| Get data for a region | An address, with search suggestions, or a whole US state (area-weighted averages). Each record names its dataset and grid size |
| Monthly and weekly trends | Every month on one chart; a cycle plot of each calendar month across the years; a year against its normal range; a week-by-week view of daily NASA POWER data |
| Seasonal effects | A trend for each season and each month (seasonal Kendall test, corrected for 12 tests), with the months that carry the change named in words |
| Rate of change and significance | Rate per decade with its 95% interval, Mann-Kendall p, "clear trend" or "not clear yet", and roughly how many years would settle it |
| "Not significant yet" may need more years | Any From–To period of 8+ years. Phoenix warm nights are significant over 25 years (p = 0.005) and not over 10 (p = 0.32) |
| Disasters vs trends | The most unusual months, matched to a curated, sourced list of US events, plus "does the trend survive without the event years?" |
| Patterns and relationships | `/patterns`: which records' unusual months move together, with lead times, past "early clue" hit rates against chance, more extremes than before, and signs that swings are growing. It describes the past and makes no forecast |
| Same process, opposite trends in different places | Compare 51 cities against the household's own limits, with no score or ranking; a US map of every grid cell's trend, coloured only where it passes a map-wide false-discovery check |
| Demonstration examples | Case files: Phoenix nights, Houston heat, Spokane smoke |

## How it works

1. **Data:**
   - NASA POWER daily weather (MERRA-2, 2001–2025, per place and per state), including wet-bulb temperature.
   - MERRA-2 aerosols: PM2.5 and haze (aerosol optical depth).
   - OMI tropospheric NO₂ (2005–2025).
   - FIRMS MODIS fire detections (2003–2025).
   - MODIS land surface temperature (MOD11A2 for six cities; MOD11C3 monthly on a 5 km grid, to 2022).
   - GPM IMERG satellite rain.
   - GRACE/GRACE-FO water storage (2002–2025).
   - NOAA's Hazard Mapping System smoke outlines, medium and heavy smoke (2011–2025; light smoke is left out, D37).
2. **Statistics (Python):**
   - Yearly trends: ordinary least squares for the rate and its 95% interval, Mann-Kendall for significance.
   - Monthly and seasonal trends: seasonal Kendall with a correction for month-to-month memory, and a test per month and per season with a Benjamini-Hochberg false-discovery correction.
   - Unusual months: calendar-month z-scores and normal ranges.
   - Links between records: Spearman correlation of detrended monthly anomalies, an effective sample size for memory, and a Benjamini-Hochberg correction.
   - Early-clue hit rates: tested by circular shifts.
   - Early-warning indicators: rolling variance and lag-1 memory.
   - US map: the same trend test on every grid cell plus a map-wide false-discovery check (Wilks 2016).
   - An independent code review found and fixed a bias in "more extremes" (D31).
3. **API.** A versioned, typed FastAPI service (`/api/v1`) with a reviewed OpenAPI contract. Household-neutral reports are stored in Postgres (Supabase) so repeats are instant and shared. The household's health choices never reach a URL, log or database.
4. **App.** Next.js 16 with React 19, built as Model-View-Presenter: presenters turn API data into what each screen shows and are unit tested, and the views only render. It works by keyboard and screen reader (skip link, chart readouts, a step menu with each page's sections) and on a phone (no sideways scroll at 320 px).

## Honest limits (from `docs/TEAM_HANDOFF.md` section 7)

- Weather and PM2.5 are ~50 km grid averages: regional trends, not one street. Surface heat (1 km) is the neighborhood card, precomputed for six cities.
- Satellite NO₂ is the whole air column, so it is shown as a trend only, with no health level. The version of the team's NO₂ files is unverified (D10).
- MERRA-2 PM2.5 has no nitrate and can read lower than city monitors; coastal squares read high partly because sea salt counts.
- Fire detections count only the US files, and fire trends start in 2003: before mid-2002 only one of the two MODIS satellites (Terra) flew, so earlier counts are too low.
- The last sentence on each card describes the record: how recent years compare with the early ones. Climatch makes no forecasts and gives no medical advice; a test bans forecast wording in the app.
- Links on `/patterns` are correlations, not causes. "Early clue" rates are measured on the same months that picked the link, so they flatter it a little. A 25-year monthly record is too short for a warning system.
- The smoke grid covers the lower 48 states only. GRACE water storage is regional (~300 km), and IMERG and MODIS 5 km are coarser than a street.

## Data and credits

- NASA POWER (including T2MWET), NASA GES DISC (MERRA-2, including M2TMNXAER v5.12.4; OMI OMNO2d; GPM IMERG Final V07 `GPM_3IMERGM`), NASA FIRMS, NASA ORNL DAAC (MODIS MOD11A2 v061), NASA LP DAAC (MODIS MOD11C3 v061), NASA JPL (GRACE/GRACE-FO mascon RL06.3 v04 with CRI).
- NOAA NESDIS/OSPO Hazard Mapping System smoke polygons.
- "We acknowledge the use of data and/or imagery from NASA's Fire Information for Resource Management System (FIRMS), part of NASA's Earth Science Data and Information System (ESDIS)."
- Maps: © OpenStreetMap contributors. Address search: OpenStreetMap Nominatim; suggestions: Photon by komoot.
- This project is not endorsed by NASA; it uses no NASA logo.

## Use of AI

Fill in as the Space Apps project form asks: the AI tools the team used and what for, and which images were made by people.

## Team

Team name and roles: still open (`docs/DECISIONS.md`, open questions).
