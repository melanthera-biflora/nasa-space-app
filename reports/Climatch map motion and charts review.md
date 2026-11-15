# Climatch map motion and charts review

*Desk research and expert review, 2026-11-15. Notes behind it: `research_notes/Climatch map motion and charts review/`.*

## Summary

**The map.** It looks jumpy because of how the years are swapped, not because of the frame rate. Both years fade at the same moment, so the white base shows through mid-swap and the map seems to breathe every year. Fading the new year in on top of the old one fixes it in a few lines. The overlay can fit the coast and borders using the Census outline the backend already serves, drawn as a white mask over everything outside the lower 48. The squares should stay as squares: blending years or blurring cells would show values and detail the data doesn't have.

**The compare page.** Tools that score or rank places draw the disputes (Zillow dropped First Street's scores; GAO criticised FEMA's index). Tools people actually compare with put places on one axis and leave the judgement to the reader. Climatch's side-by-side should open with an arrow per place from its early to its recent average, with the household's limit and a word for whether the change is clear.

**Charts across the app.**
- Axis labels shrink on phones, to about half the 12 px floor.
- Temperature charts start at 0, which flattens real change.
- Two charts have no keyboard path.
- Two presenters compute averages in the browser, against the project's own rule.

**Data.** Two records can mislead in a way that matters:
- **PM2.5** (MERRA-2 has no nitrate and reads low) can say "under the limit" wrongly.
- **Water storage** looks surer than it is, because its yearly test ignores strong year-to-year memory.

Three statistical fixes would change verdicts, so they need a team decision and a new data version.

## What we found

### 1. Map motion and precision (`research_notes/…/map_motion_overlay.md`)

- **Why it breathes.** `TimeMap.jsx` fades the old year out and the new year in together over 300 ms (`TimeMap.css`). Halfway through, the stack's opacity falls from 0.92 to about 0.71, so the white base shows through 3.6 times more. At Fast speed, the fade takes 55% of each year.
- **The fix.** Put the frames in one Leaflet pane at opacity 0.92. Fade the new year in on top (`setZIndex`, not `bringToFront`, because moving it in the page cancels the transition), and hide the old year once it is covered. Use a shorter fade at Fast (150 ms) and slow-in, slow-out easing.
- **Don't blend values between years.** On a map with colour classes, cells would change class at different moments and show values that were never measured (Battersby & Goldsberry 2010). Smooth motion that is still real data would mean monthly running means, as NASA SVS does, at 12 times the frames. That is a later project.
- **Fit to the land.** `us_mask` guesses the US from fire points. It includes 28 cells with no US land and misses 31 that touch land. The fix has two parts:
  - **A mask on the map.** `GET /regions/L48/outline` reuses the state rings (40 KB gzipped) in a white "world minus the lower 48" polygon, drawn in a pane between the data and the basemap with `smoothFactor: 0`. It stays sharp at every zoom.
  - **The data mask.** Rebuild `us_mask` from the outline and rerun both map tools. The trend map's false-discovery check will shift slightly.
- **Keep blocks, and say so.** Bilinear smoothing makes colours that aren't on the legend and implies detail finer than 50 km. Under the map: *"Each square is one NASA grid box, about 50 km across, cut at the coast and border. The short fade between years is not data."*
- **Already fine:** Mercator placement is correct. Next.js already gzips the frames (PM2.5 1.15 MB → 145 KB). Repainting about 6,100 cells takes 0.7 ms.

### 2. The compare page (`research_notes/…/compare_patterns.md`)

**Gaps the critique missed:**
- The verdict reads only the first two places; a third or fourth is never mentioned.
- "Only rows that differ" compares rounded text, so it hides almost nothing.
- Very hot days and very cold nights have no clear trend in 51 of 51 cities, yet the scatter spreads them under "rising" and "falling", and the tooltip gives a rate with no trend word.
- `MultiLine` has no role or keyboard path.

**What to build:**
- **The lead chart.** An arrow plot per topic: one row per place, in the household's order and never sorted by value. Each row has the limit as a dashed line and the last five years' range as a pale bar. A solid arrow means "Rising"; a dashed arrow means "No clear trend yet". It uses data already loaded, and no p-values appear on screen.
- **Count years instead of giving odds:** "4 of the last 5 years under your limit". Words paired with counts are read more accurately than words alone (Budescu).
- **Anchor on the starting place,** as the NYT anchors on the reader's own past: "Compared with Denver: Boise has less of 2 of 3, and more muggy days".
- **Phones:** one card per topic, places as rows, a pinned label column. No swipe cards: they show one place at a time, which defeats comparing.

### 3. Charts across pages (`research_notes/…/charts_data_audit.md`)

| Theme | What we saw | Where |
| --- | --- | --- |
| Text shrinks on phones | SVG labels scale with the drawing: a 12 px tick shows at about 6 px on a 375 px phone | `MonthlyLine`, `BandChart`, `CyclePlot`, `TrendChart`, `YearBars`, `CityScatter`, `MultiLine` |
| Axes hide change | `TrendChart` and `YearBars` start at 0 for °C (Denver ground heat: 0–46.8 with the data in the top tenth). `MonthlyLine`'s domain leaves out the yearly totals, so dots sit above the top tick | `/test`, `/report`, `/explore` |
| One method, two numbers | The rate and its 95% range come from a straight-line fit, but the verdict comes from Mann-Kendall, so they can disagree | `TrendChart`, `verdict()` |
| Keyboard and screen reader | `MonthHeatmap` and `MultiLine` have no keyboard path; the animated map reads squares by mouse only | `/seasons`, `/compare`, `/patterns`, `/map` |
| Statistics in the browser | `stripes()` and `cycle()` compute means | `presenters/detective.js` |
| Small honesty gaps | The band chart rings mark more than 2 standard deviations while the band shows percentiles; unusual months ignore the trend; the patterns sparks say "growing" from overlapping windows | `/events`, `/patterns` |

### 4. Data and analysis

| Record | Risk | Why |
| --- | --- | --- |
| PM2.5 (MERRA-2) | **High** | No nitrate, reads low, and a 5-year model mean is judged against EPA's monitor standard. It can say "under the limit" wrongly |
| Water storage (GRACE) | **High** | Strong year-to-year memory makes the yearly test overconfident; years with 9–11 months average silently |
| NO₂ (OMI) | Medium–high | The version is unverified (D10), yet `thresholds.json` and the map sources say v004 |
| Smoke days (D37) | Medium | 15 years, so less power to detect change. Smoke may be aloft, and cloud hides it |
| Very dry days | Medium | Uses the daily mean humidity below 20%, which is rarely reached, so a false "no change" is likely |
| Events | Medium | Nothing tagged for smoke days, haze, IMERG, GRACE or humid heat |

## Priorities

Scored by how much it helps a household or the demo, against build effort. "Decision" means it changes verdicts or adds data, so the team should agree and bump `DATA_VERSION`.

### Do now (high impact, small effort): built on 2026-11-15 (D39)

| # | Change | Files |
| --- | --- | --- |
| 1 | Map: fade the new year in on top, with the fade scaled to speed | `TimeMap.jsx`, `TimeMap.css`, `presenters/timeMap.js` |
| 2 | Map: a lower-48 mask from the Census outline, plus the "one square = one 50 km box" note | `backend/services/regions.py` (`L48`), `lib/basemap.js`, `TimeMap`, `TrendMap` |
| 3 | Compare: a verdict for every place against the start; "differs" by trend words; the scatter honest about unclear trends (hollow dots, a trend word in the tooltip, a note when no city has a clear trend) | `presenters/compare.js`, `CityScatter.jsx`, `CompareView.jsx` |
| 4 | Charts: data-fit axes for °C (`niceTicks`), and `MonthlyLine`'s domain to include the yearly points | `TrendChart.jsx`, `YearBars.jsx`, `MonthlyLine.jsx` |
| 5 | Keyboard: arrow-key squares on the animated map; `MultiLine` as one tab stop with a readout | `TimeMap.jsx`, `MultiLine.jsx` |
| 6 | Rules and labels: `stripes()` and `cycle()` use pipeline normals; NO₂ says "version unverified"; events tagged for the new records | `presenters/detective.js`, `thresholds.json`, `map_frames.py`, `events.json` |
| 7 | Confidence words from checks we already run: "holds without any single year" or "hangs on 2021" | `presenters/reportView.js`, `detective.js` |

### Next (high impact, medium effort): built on 2026-11-15 (#8, #9, #11, #13 in T106; #10, #12 in T104)

| # | Change | Files |
| --- | --- | --- |
| 8 ✓ | Compare: an arrow plot opens "Side by side", with the limit line and "4 of the last 5 years under your limit" | new `components/ThenNow.jsx`, `compare.js` `thenNow()` with a test, `SideBySide.jsx` |
| 9 ✓ | Phones: draw SVGs at their measured width, or put labels in HTML, so text stays 12 px; compare as one card per topic | the chart components, `compare.css` |
| 10 ✓ | `us_mask` from the outline; rerun the trend map and the frames | `tools/trend_field.py`, `tools/map_frames.py` |
| 11 ✓ | `MonthHeatmap`: a table, a roving readout, class edges in the legend | `MonthHeatmap.jsx` |
| 12 ✓ | Trend map gains smoke days and haze, with a Sen rate (T104 added the two maps; no Sen rate found in `trend_field.py`) | `trend_field.py`, `TrendMap.jsx` |
| 13 ✓ | A data-quality badge per record: "Model estimate · 50 km · until 2022" (built as a presenter table, no pipeline change: "Satellite · 5 km · 2001–2022") | `presenters/reportView.js`, `RecordRow.jsx`, `TopCard.jsx`, `/about` |

### Needs a team decision (changes verdicts or adds data)

| # | Change | Why |
| --- | --- | --- |
| 14 | Correct for testing about 16 records per report (Benjamini-Hochberg across a report's records) | At p < 0.05, about one "clearly" per report is expected by chance, and the hero counts it |
| 15 | A memory-aware yearly test (trend-free pre-whitening, Yue et al. 2002) for water storage, soil and PM2.5 | Stops overconfident verdicts |
| 16 | Sen slope and its interval everywhere | One method for the number and the verdict |
| 17 | A PM2.5 level check against ACAG satellite PM2.5 (van Donkelaar et al. 2021) for the 51 cities, or a clearer "model reads low" warning now | Avoids a false "under the limit" |
| 18 | New records: season length (frost-free, hot season), heat-index days, afternoon humidity for dry days | Questions households ask; built from data already cached |

### Rejected on purpose

- **Map:** blending values between years; smoothing or isobands; PNG or class-index payloads (they lose the readout and need Mercator rows).
- **Compare:** slope charts (crossing lines read as rank changes); colour heat grids; scores, percentiles or winner badges.
- **Statistics:** return-level fitting (25 maxima give wide intervals and read like a forecast; use counts instead); WBGT (needs sub-daily sun and wind); user-facing change-point panels (A2 excludes them; keep break checks as quality control only).

### Not verified

- Phone text sizes were worked out from the code and CSS, not from phone screenshots.
- Next.js gzip was measured under `next dev`, not `next start`.
- Screen readers were not tested.
- Some details of reference tools come from press coverage, not from using them.

## Research plan: checking this with real households

The findings above are from desk research and an expert review of the code and data, not from people using Climatch. Before the demo, a small round of testing would show which of them matter most. This plan fits a hackathon week.

### Objectives

1. **The animated map.** Can people read where and how much a record changed? Do smoothing or in-between frames make them think the data is finer, or more measured, than it is?
2. **The compare page.** Can a household compare 2–4 places for its own limits? Does it read the groups as a ranking or a "best" place?
3. **The report and the Look closer charts.** Do people understand "clearly worse" vs "no clear change yet", and can they find when in the year a place is changing?

### Methods

| Method | Who | How many | Time |
| --- | --- | --- | --- |
| Moderated usability test, think-aloud, with a short interview | Households considering a move | 5–6 per round, 2 rounds | 45 min each |
| Preference and comprehension test of three map treatments (blocks; blocks clipped to land; smoothed and clipped) | Anyone over 18, unmoderated | 15–30 | 10 min |
| Expert walkthrough | 1–2 climate or remote-sensing people (a stand-in for the judges) | 2 | 30 min |

The first round tests the current build. The second round tests the top fixes from the priorities above. Sessions can run remotely over a shared screen; the app runs locally on the moderator's machine.

### Participants

- **Who:** adults thinking about moving in the next two years (renting or buying), on phone and laptop. Include:
  - at least one person 65+;
  - one parent of a child under 5;
  - one person who has, or cares for someone with, asthma, COPD or heart disease;
  - one screen-reader user if possible.
- **Mix:** people who are used to reading maps and charts, and people who are not.
- **Privacy:** made-up households only; no real health information is collected. Recordings stay with the team and are deleted after synthesis.
- **Screener:** "Are you thinking about moving in the next two years?" (yes); "How often do you read charts or maps for work or study?" (to balance the mix); device used most.

### Timeline

| Day | Work |
| --- | --- |
| 1 | Recruit (friends of friends, a community board), pilot the script once, fix the script |
| 2–3 | Round 1 sessions; affinity notes after each one |
| 4 | Synthesis; pick the top fixes; build them |
| 5 | Round 2 on the fixes; final notes for the submission |

### Usability tasks (scenario first, no hints about where to click)

| # | Scenario | Success looks like | Watch for |
| --- | --- | --- | --- |
| T1 | "You might move to Spokane with your mother, who has COPD. What changed most there, and is it real?" | Names the clearly worse records, opens one, reads "is it real" in words | Reading "no clear change yet" as "no change"; number budget |
| T2 | "On the US map, play the years. Where did thick smoke increase most since the start?" | Uses Play or the slider, switches to "Change from the start", points to the region | Reading in-between frames as measured years; believing block edges are town-level |
| T3 | "Compare Denver and Phoenix for your household. Which would you look at more closely, and why?" | Sets limits, reads the groups, explains a trade-off in their own words | Calling a group "the winner"; missing the "clear trend" distinction |
| T4 | "Is the rise in very hot days in Houston real, or could it be chance?" | Finds the test page, reads the verdict in words | Confusion about p-values or the 95% range |
| T5 | "When in the year is Phoenix changing most?" | Finds the seasons page and names a season or month | Reading the cycle plot's colours |

**Measures:**
- task success (yes, with help, no);
- time on task;
- misreadings (the "watch for" column);
- a 1–7 ease rating after each task (Single Ease Question);
- confidence in the answer (1–5);
- quotes.

### Interview guide (wrapped around the tasks)

1. **Warm-up (5 min).** Explain the session: we test the app, not you; think aloud; nothing is wrong. Ask about their current move: where, when, who lives with them.
2. **Context (10 min).**
   - "How are you choosing where to live?"
   - "Have you looked at climate or weather for a place before? Where, and what did you look at?"
   - "What would make you rule a place out?"
   - Probe: heat, smoke, flooding, cost of cooling, health.
3. **Deep dive (20 min).** Tasks T1–T5, in an order rotated between participants. After each:
   - "What does this tell you?"
   - "How sure are you?"
   - "What would you do next?"
4. **Reaction (10 min).** Show the three map treatments (blocks, clipped, smoothed) side by side:
   - "Which looks most trustworthy, and why?"
   - "How big is one coloured square?"

   Then show the compare page:
   - "If a friend asked which place is better, what would you say?" This checks the no-ranking rule.
5. **Wrap-up (5 min).**
   - "What was most useful? Most confusing?"
   - "Anything you expected to see but didn't?"
   - Thank them.

### Synthesis

- **Affinity map.** One note per observation, grouped into themes, e.g. "map precision", "trust", "ranking reading", "jargon".
- **Impact/effort matrix.** Score each theme's fix by how many participants it affected and how badly, against build effort. Do the high-impact, low-effort fixes first.
- **Report back.** Add a short "what we tested and changed" section to `docs/SUBMISSION.md`, with 3–5 anonymous quotes.
