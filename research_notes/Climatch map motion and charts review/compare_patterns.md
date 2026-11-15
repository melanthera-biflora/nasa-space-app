# Compare page: how other tools put places side by side, and what to change

**Status:** research notes, 2026-11-15. No code was changed.
**Builds on:** `docs/reviews/site-critique-2026-11-15.md` (wording, loading box, end labels, single limit; not repeated here) and `research_notes/Climatch UI and place finder/place_finder.md` (survey of home-choice tools).
**Reliability:** *(coverage)* marks a finding from press or blog write-ups, not from reading the tool itself.

## 1. What Climatch has now

- **`views/CompareView.jsx`:** topics and limits, then the 51-city scatter (`CityScatter`: level across, change per decade up, the limit dashed), the grouped list and map, and a tray of up to 4 places.
- **`components/SideBySide.jsx`** (a dialog): a verdict, "Show only rows that differ", one `MultiLine` per topic and a table of 2021–2025 values. The data comes from `presenters/compare.js` over `places_compare.json`.

**New gaps (from the code and data):**
- **The verdict skips places.** `verdict()` reads only `places[0]` and `places[1]`; a third or fourth place is ignored.
- **The "differ" filter hides little.** `compareRows().differs` compares rounded text, so almost every row differs and the toggle hides almost nothing.
- **The scatter suggests trends that aren't clear.** Very hot days and very cold nights have **no clear trend in 51 of 51 cities** (muggy days 50, warm nights 43), yet the dots spread under "rising" and "falling", and the tooltip says "+4.7 per decade" with no trend word.
- **Text and dots shrink on phones.** Both SVGs scale a 720-unit viewBox to the column, so at about 340 px, 12 px labels render at 5–6 px (rule 7) and scatter dots at a 2–3 px radius.
- **`MultiLine` isn't accessible.** It has no role, label or keyboard readout (rule 11).

## 2. What the reference tools do

| Tool | Layout | Change or level | Uncertainty | Ranking | Criticism |
| --- | --- | --- | --- | --- | --- |
| Weather Spark compare | Places drawn on the same charts, 2–4 *(coverage)* | Level (averages) | Comfort words with °F edges | None | No change over time |
| NYT, "How much hotter is your hometown" | One place: very hot days a year as a line, your birth year marked | Your birth year vs now, then a projection | A projection range *(coverage)* | None | Rests on an emissions assumption; it's a forecast |
| First Street, Redfin's climate tab | One card per hazard, 1–10 with a word | Today plus 30 years | Not shown | The score itself | Accuracy disputes; Zillow dropped it (Dec 2025); a lawsuit says uncertainty isn't disclosed |
| ClimateCheck | 1–100 per hazard | To 2050 | Not shown | Relative to other US places | None found |
| Climate Central | One city's yearly line with a trend line | Warming since 1970 | Attribution in words | Fastest-warming lists | The list becomes the headline |
| NOAA Climate Explorer | One county: observed bars over a modeled band | Past and projections | Shaded ranges | None | Projection-heavy; one place at a time |
| Our World in Data | Picked countries on the same axes; chart, map and table tabs | Start and end years chosen on a timeline | Rarely | A sortable table | None found |
| FEMA National Risk Index | Map of a combined score | Level | Not shown | Percentile bands | GAO (2026): users' needs not considered; rankings look counterintuitive |

**What this shows:** the scored tools draw the disputes, while the tools people compare with put places on one axis and leave the judgement to the reader. The NYT anchors on the reader's own past; Climatch's starting place could do the same, but now it mostly orders the list.

## 3. Chart forms

- **Common axis first.** Cleveland and McGill: position on a common scale is read best, shading worst. One axis per record, places as rows; no heat grid.
- **Arrow plot first.** Datawrapper uses it for exactly two dates. It fits 2001–05 vs 2021–25 with the limit on the same axis, answering both of FT's "change over time" and "deviation" without its ranking family.
- **Slope chart: no.** Crossing lines read as rank changes; the USAID note prefers dot plots or small multiples.
- **Small multiples second.** Tufte: one design repeated within the eye span. Honest about yearly swings, on a shared scale.

## 4. Clear vs not clear, without p-values

- **Pair words with numbers.** Budescu found that readers take "very likely" as much less sure than meant, and adding numbers narrowed the gap.
- **Show sureness two ways:** a solid arrow and "Rising" when clear; a dashed arrow and "No clear trend yet" when not. The dashed arrow still shows a 24 → 40 move.
- **Show the noise, not a cliff.** Helske et al. (2021): a bare p-value or plain interval makes readers see a cliff; richer pictures soften it. Draw the last five years' range (`last5`, min and max of sent values) as a pale bar behind the "now" dot; a move shorter than the bar explains itself.
- **Count years instead of giving odds:** "4 of the last 5 years under your limit" (`yearsUnder` exists).

## 5. Phones

- **Sticky headings and hidden identical rows** (Baymard); a pinned label column, because people miss sideways scrolling.
- **No swipe cards:** one place at a time defeats comparing. Use one card per topic, places as rows.

## 6. What a household needs first

Climate is one input among many: over 80% of buyers consider it, but only 23% looked in lower-risk areas (Zillow 2023). Answer quickly, in this order:
1. Which places stay under our limits? (Exists.)
2. Is there more or less than where we start?
3. How often has each place gone over our limit lately?
4. What changed, and is it clear?
5. What is the same everywhere? (Exists.)

## 7. Recommended changes, ranked

| # | Change | Impact / effort | Files | Rules |
| --- | --- | --- | --- | --- |
| 1 | **Start Side by side with a then → now arrow plot per topic.** One row per place, in the user's order; a limit line, a last-5-year range bar and the trend word on each row. It needs no fetch. `MultiLine` moves under "Each year". | High / medium | New `components/ThenNow.jsx`; `compare.js` `thenNow()` and a test; `SideBySide.jsx`; `compare.css` | Never sorted by value; direction shown by the arrowhead and a word; ends at 2025 |
| 2 | **Write a verdict line for every place, against the start:** "Compared with Denver: Boise has less of 2 of 3, and more muggy days." | High / low | `compare.js` `verdict` and its test | "Less" and "more" in pairs, never "better" |
| 3 | **Make the scatter honest about trends.** Put the trend word in the tooltip. When no city has a clear trend, say so above the chart. Add "Fade cities with no clear trend yet", and the axis unit. Drop `?? 0`. | High / low | `CityScatter.jsx`; `CompareView.jsx`; `compare.js` | Words carry sureness; fill keeps one meaning across the page |
| 4 | **Fix the phone layout.** Below 600 px, one card per topic. Draw the SVGs at their measured width so text stays 12 px. Put the scatter behind a disclosure. | High on phones / medium | `SideBySide.jsx`; `compare.css`; `MultiLine.jsx`; `CityScatter.jsx` | Rule 7, 44 px targets |
| 5 | **Add the limit line to `MultiLine`**, and "4 of the last 5 years under your limit" to each cell. | Medium / low | `MultiLine.jsx`; `SideBySide.jsx` | A count, not a statistic |
| 6 | **Make "Only rows that differ" mean something:** keep a context row only if its trend words differ. | Medium / low | `compare.js` `compareRows` | Matches "True almost everywhere" |
| 7 | **Make `MultiLine` one tab stop:** `role="group"`, a label and a `chartIndex` readout. | Medium / medium | `MultiLine.jsx` | Rule 11 |
| 8 | **Put one result sentence first,** built from the group counts, such as "Under all 3 of your limits: 9 cities". | Medium / low | `CompareView.jsx`; `compare.js` | Counts, no rank |
| 9 | **Label PM2.5 and haze levels in the scatter** "model level, reads high on coasts". | Low / low | `CityScatter.jsx` | Repeats the existing caveat |

- **Privacy:** everything here uses data already in the tab. Topics and limits never go in the URL, since choosing smoke can hint at asthma.
- **Left out on purpose:** scores, percentiles, winner badges, colour grids and projections.
- **Not verified:**
  - No browser was used; the phone sizes are worked out from the code.
  - Details on Weather Spark, the NYT and Redfin come from press coverage.

## Sources

- **Weather Spark:**
  - https://weatherspark.com/compare/y/545/Comparison-of-the-Average-Weather-in-Palo-Alto
  - https://grandavehousing.calpoly.edu/blog/weatherspark-compare-weather-data-easily-1764805807
- **NYT:**
  - https://www.nytimes.com/interactive/2018/08/30/climate/how-much-hotter-is-your-hometown.html
  - https://www.journalism.co.uk/nyt-uses-data-visualisation-to-bring-climate-change-home-literally/
- **First Street and the listing sites:**
  - https://www.housingwire.com/articles/first-street-climate-risk-lawsuit/
  - https://ace.rismedia.com/2025/12/02/zillow-removes-climate-risk-scores/
  - https://investors.redfin.com/news-events/press-releases/detail/1048/redfin-publishes-air-factor-data-from-first-street-to-show
- **ClimateCheck:** https://climatecheck.com/our-methodologies
- **Climate Central:** https://www.climatecentral.org/climate-matters/summer-package
- **NOAA Climate Explorer:** https://toolkit.climate.gov/tool/climate-explorer-0
- **Our World in Data:**
  - https://ourworldindata.org/owid-grapher
  - https://ourworldindata.org/redesigning-our-interactive-data-visualizations
- **FEMA National Risk Index:**
  - https://files.gao.gov/reports/GAO-26-107894/index.html
  - https://support.regrid.com/docs/risk-rating-faq
- **Cleveland and McGill, in course notes:** https://info3312.infosci.cornell.edu/slides/04-graphical-perception.html
- **Tufte:** https://www.edwardtufte.com/notebook/sparkline-theory-and-practice-edward-tufte/
- **Datawrapper Academy:**
  - https://www.datawrapper.de/academy/how-to-create-an-arrow-plot
  - https://www.datawrapper.de/academy/how-to-create-a-range-plot
- **FT Visual Vocabulary:** https://github.com/Financial-Times/chart-doctor/blob/main/visual-vocabulary/README.md
- **Urban Institute and the USAID note:**
  - https://urbaninstitute.github.io/graphics-styleguide
  - https://usaid-oha-si.github.io/data%20viz/2022/04/18/mdv-slope-chart-small-multiples.html
- **Helske et al. (2021):** https://arxiv.org/abs/2002.07671
- **Budescu:** https://www.ipcc.ch/site/assets/uploads/2016/02/Budescu_IPCC_Communication_Meeting_OSLO_February_2016.pdf
- **Baymard:** https://baymard.com/blog/user-friendly-comparison-tools
- **Mobile tables:** https://ninjatables.com/sticky-headers-vs-fixed-columns/
- **Surveys:**
  - https://www.fox6now.com/news/buyers-consider-climate-risk-looking-for-new-home-zillow-study
