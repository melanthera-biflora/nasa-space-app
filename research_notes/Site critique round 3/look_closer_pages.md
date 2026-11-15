# Look closer pages, round 3

2026-11-15, built-in browser at 1280×900 and 375×812. Places: Spokane (point) and Texas (state). Records: `pm25`, `hot_days`, `warm_nights`, `smoke_days`, `t2m`, `precip` and `water_storage`. Items fixed in earlier rounds or listed in the map-and-charts review are left out. Nothing was changed.

## Findings by page

### `/explore`
- **Medium. The answer comes before the guess.** Spokane hot days reads "a change that isn't clear yet", and the trend line and 95% band are drawn, all above "Your call, detective". The guess step loses its point. **Fix:** until a guess is made, show the months and yearly dots only, with no verdict. `ExploreView.jsx`, `MonthlyLine.jsx`.
- **Medium. The guess is thrown away.** "Noted: 'going up'. Test it" opens a `/test` that never mentions the guess (it lives in `useState`). **Fix:** carry `guess=up` in the URL and answer it on `/test` ("You guessed going up; the test says clear rise").
- **Medium. The Spokane PM2.5 axis runs 0–150 µg/m³** because of three fire months, so the 5 → 12.1 headline sits in the bottom tenth. **Fix:** a Months/Years switch, or cap the axis at the 98th percentile and label the spikes.

### `/test`
- **High. The PM2.5 chart draws only the 15 µg/m³ "high-level cutoff"** (the EPA secondary standard). Spokane's 2021–25 average of 12.1 looks safely under the line, though it is above the EPA health standard of 9 (`caution_from`, already in the config). **Fix:** draw `caution_from` too, labelled "EPA health standard 9". `TrendChart.jsx:21`.
- **High. The headline overstates sureness.** Spokane smoke days: "Clear trend: rising … would rarely happen by chance", then "The verdict hangs on 2011". **Fix:** reuse the report's wording ("clear, but it hangs on 2011") in the headline, and drop "rarely by chance" when `flips` is non-empty. `presenters/detective.js`.
- **Medium. Water storage joins the missing years.** The line runs 2014 → 2016 → 2019 straight across, with no 2015 tick, under "2006–2025, 17 years". **Fix:** break the path at gaps, use continuous ticks, and say which years have no GRACE data. `TrendChart.jsx`.
- **Low. The rate and p-value are printed twice** (the verdict card and the chart chip), once as "95% range" and once as "95% CI".
- **Low. Spokane warm nights reads "Nothing to test. … so there is nothing to test."**

### `/seasons`
- **Medium. Spokane PM2.5 autumn reads "+8 µg/m³ per decade"**, more than any of its months (Sep +4.6, Oct +3.8, Nov +6.9). Ask the data owner to check the seasonal series.
- **Medium. On rain, blue means drier** (Texas precip bars and the stripes key, "Blue: below…"). Readers take blue as wet. **Fix:** a brown/teal pair for water records, keeping the words. `TrendBars.jsx`, `Stripes.jsx`.
- **Low. Smaller problems.**
  - The summary is printed twice.
  - The cycle plot has a single label ("156.5", no unit, no 0).
  - Rates mix "+8", "+1" and "+0.33".

### `/events`
- **High. "Most unusual months" misranks and mislabels.** It ranks by z and calls every top-six month "Unusual".
  - Spokane PM2.5: December 2014 (27.5) ranks above August 2015 (156.5), and June 2023 (8.4 µg/m³) is "Very unusual".
  - Spokane hot days: 1.2 SD is called "Unusual", while the chart rings only months past 2 SD.
  - Six rows in a row say "No catalogued event matches this month".

  **Fix:** label only months past 2 SD; rank skewed records by percentile; collapse the empty matches into one line. `detective.js:256`, `EventsView.jsx:50`.
- **Medium. Texas temperature, August 2011, says no event matches.** The 2011 drought listed below doesn't match because `eventsFor` filters on `e.variables`. **Fix:** tag it for `t2m` and `hot_days` in `events.json`.
- **Low. Spokane warm nights shows an empty "most unusual months" heading.** Use the same never-happens state as `/test`.

### `/map`
- **Medium. Two controls set the record.** The chips switch the year map to Haze while the side menu and the URL still say smoke days. With `var=smoke_days`, the trend map silently shows PM2.5. **Fix:** chips write `var`; say "Smoke days isn't on the trend map yet". `TimeMap.jsx`, `MapView.jsx`.
- **Medium. `region=TX` is ignored:** no outline, zoom or mention, while the strip says "Texas … step 5 of 6". **Fix:** outline and fit the state.
- **Medium (phone). The map and Play sit below the fold.** The map starts at 621 px and Play at about 990 px. The chip controls are 24 px tall, under the 44 px touch floor.
- **Low. Wording.**
  - "0.013 haze (aerosol optical depth) less than in 2001–05".
  - Legends mix "9.3, 10, 12".
  - A square is "about 50 km" in one note and "about 56 km" in the other.

### `/patterns`
- **Medium. Clear rows have no sureness word.** "NO₂ 1.5 → 0.3 in 10" and "Water storage 1.3 → 0.0" show no word, while others say "not clear". Only opacity tells them apart. **Fix:** add ", clear" and a direction. `PatternsView.jsx:138`.
- **Medium. The top pairs measure the same thing twice:** satellite rain with wettest day, haze with smoke, PM2.5 with smoke. **Fix:** group them as an agreement check, and lead with pairs across domains.
- **Low. Jargon.**
  - "r −0.71 … q < 0.001", with q never defined.
  - "Spells steady (0.43 → 0.23)" calls a halving steady.

### Side menu and context bar
- **Medium. The side menu scrolls sideways at 1280.** `.dt-steps` is 316 px inside a 296 px scroll box, so section names are cut. **Fix:** `overflow-x: hidden; scrollbar-gutter: stable` on `.dt-side` (`detective.css:29`).
- **Medium. One record, two names.** Point records use "Fine particles (PM2.5)", "Water storage (GRACE)" and "Ground heat (MODIS)"; the h1 and the state list use "Fine particle pollution (PM2.5)", "Water storage (ground, soil, snow)" and so on. The h1 changes after load, and the LinkNote and the h1 disagree. **Fix:** one label table (`detective.js:24`).
- **Medium. New pages land in the wrong place.** After a "next step" link the h1 sits 16 px under the sticky bar; with focus in the side menu, `/test` opened 331 px down. **Fix:** scroll to 0, then `focus({preventScroll:true})`, in `RouteFocus.jsx`.
- **Low. Smaller context-bar problems.**
  - The "State" select shows "Spokane, WA".
  - The placeholder is cut.
  - The phone drawer has no close button.
  - A point link with `var=t2m` falls back to PM2.5 instead of offering the state.
  - `region=ZZ` gives the h1 "Average temperature in ZZ" and a useless "Try again".
  - Hilo smoke reads "Not measured for this place." with no next step.

## Best things to keep
- `/test`'s "About 25–35 years of data would give a change this size a fair to good chance", and the leave-one-year-out line.
- `/seasons` explains the Benjamini-Hochberg correction in one plain sentence.
- `/events` cites a source for each event, and says "consistent with" doesn't prove cause.
- The year map opens paused, its squares read by arrow keys, it has the land mask, and it says "the fade is not data".
- The phone strip names the place, record, years and step.
- The LinkNote exists for replaced records.

## Top 8 fixes (impact over effort)
1. Draw the EPA 9 µg/m³ health line on `/test` (`TrendChart.jsx`).
2. Put fragility into the `/test` headline (`detective.js`).
3. One name per record across the catalogs and the h1 (`detective.js:24`).
4. Honest `/events` labels: past 2 SD only, percentile ranking, one "no match" line.
5. Close the guess loop: hide the trend until the guess, then answer it on `/test`.
6. Land at the top on page change, and stop the side menu's sideways scroll.
7. One record control on `/map`, and an outline for the chosen state.
8. Sureness words on the `/patterns` clear rows, and break the water-storage line at gaps.

*Not verified:*
- Motion smoothness: the tab was in the background, so frames advanced only on screenshots.
- Phone layout was judged mostly from DOM measurements, because another session kept resizing the pane.
- Offline errors and screen readers were not tested.
