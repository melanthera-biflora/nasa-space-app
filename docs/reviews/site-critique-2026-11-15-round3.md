# Site critique, round 3 (2026-11-15)

Two fresh reviews of every page, in a browser at 1280×900 and 375×812, after the earlier fixes (`docs/reviews/site-critique-2026-11-15.md`) and the map and charts work (`reports/Climatch map motion and charts review.md`, D39). The full notes, with what was seen and where:
- `research_notes/Site critique round 3/household_pages.md`
- `research_notes/Site critique round 3/look_closer_pages.md`

**Keep:**
- the one-sentence answer with chips;
- honest captions ("since 2011", the ~50 km square, "Not available here" with a reason);
- a failed year switch keeps the report;
- `/test`'s "years needed" and leave-one-year-out lines;
- the plain Benjamini-Hochberg sentence on `/seasons`;
- sourced events;
- the year map's keyboard squares, land mask and "the fade is not data";
- the phone strip.

## Building now (this round): built on 2026-11-15

All 16 rows below are fixed and checked in the browser. Checks: frontend 166, backend 155, pipeline 117, lint, build.

| # | Severity | Page | Finding | Fix |
| --- | --- | --- | --- | --- |
| 1 | High | `/test` | The PM2.5 chart draws only the 15 µg/m³ line; Spokane's 12.1 looks safe though it is above EPA's health standard of 9 | Draw `caution_from` too, labelled as the health standard (`TrendChart.jsx`) |
| 2 | High | `/test` | "Clear trend … would rarely happen by chance" while the same page says the verdict hangs on 2011 | Fragility in the headline words, as on the report (`presenters/detective.js`) |
| 3 | High | `/events` | Every top-six month is "Unusual", even at 1.2 SD; six "no event matches" lines in a row | Label only months past 2 SD, say "for a December", and give one "no match" line (`detective.js`, `EventsView.jsx`) |
| 4 | Medium | Look closer | One record has two names (menu vs heading); the heading changes after load | One name: the catalogue label everywhere (`recordName`) |
| 5 | Medium | Report | "Change place" goes to the household form | Go to `/where` |
| 6 | Medium | Report | A fresh tab shows an invented household ("Adults 18–64", "For your household") | Say "a general household" and offer "Tell us who lives here"; an example says "Example household" |
| 7 | Medium | `/` | Every new person defaults to "65 and older"; the privacy promise is invisible | Default to "Adults (18–64)"; add "Your answers stay in this browser tab" |
| 8 | Medium | `/` (a11y) | People's controls share names, with no fieldset or legend | A fieldset and legend per person |
| 9 | Medium | Report (a11y) | The h1 and headline sit outside `<main>`, so "Skip to content" skips the answer | Open `<main>` before the hero |
| 10 | Medium | Report | Row sentences are 13 px and the household pill 11 px (rule 7, 65+ readers) | 16 px sentences, 12 px pill |
| 11 | Medium | `/compare` | A fourth city silently drops the first | At the cap, Add is disabled with "Up to 3 places: remove one first" |
| 12 | Medium | Look closer | The side menu scrolls sideways at 1280; a new page lands under the sticky bar or far down | `overflow-x: hidden`; scroll to the top before focusing the h1 (`RouteFocus.jsx`) |
| 13 | Medium | `/test` | Water storage is drawn straight through the years with no GRACE data | Break the line at gaps |
| 14 | Medium | `/patterns` | Clear rows carry no sureness word; "q" is undefined; "steady" for a halving | Words on every row; define q in plain words |
| 15 | Medium | `/map` | The record chips and the side menu disagree; the trend map silently shows PM2.5 for smoke | Chips write the URL's record; a note when a record has no trend map |
| 16 | Low | Several | "1 days"; "SELECTED LOCATION"; `/about` prints "0, dry) to 1 (soaked"; "Nothing to test … nothing to test"; Texas August 2011 has no event | One-line fixes; tag the 2011 drought for temperature |

## Needs a decision

*Household priorities: decided and built (D40).*

- **Household priorities miss smoke and humid heat (High).** For a 65+ person with asthma in Spokane, smoke days (15 → 34, clearly worse) aren't in "Most important for you". In New York, two records that got better fill the cards. `data_pipeline/config/conditions.json` lists `smoke_days` and `humid_heat_days` for no condition or age. Proposal:
  - add `smoke_days` to asthma/COPD, heart disease, pregnancy, under 5 and 65+;
  - add `humid_heat_days` to heart disease, 65+ and under 5;
  - point the Spokane case at smoke days;
  - in `topCards`, rank a clearly worse record above a priority that improved.
- **Spokane PM2.5 autumn rate (+8 per decade) is larger than any autumn month's.** Ask the data owner to check the seasonal series.

## Next round: built on 2026-11-15 (T106)

All nine are built and checked in the browser at 1280 and 375 px (frontend 184 tests, lint, build).

- [x] The guess-first detective loop: `/explore` hides the trend line, band and verdict until the guess (`guess=up|down|flat` in the URL); `/test` answers it; a new place or record clears it.
- [x] The report chart at phone width: drawn at its measured width (12 px text at 375), about 640 × 200 at desktop widths.
- [x] `/map` honouring a state: both maps outline and zoom to `region=XX` (framed again when the map changes size), and the arrow keys start inside the state.
- [x] Rain colours: brown and teal for water records in the stripes and the season bars, with the words kept.
- [x] The PM2.5 axis on `/explore`: it stops near the 98th-percentile month, clips the spikes there and names the tallest ones, with a note.
- [x] `/compare` length: "True almost everywhere" first, every group after the first folded, compact cards (12,700 → 6,200 px at 1280; 17,400 → 9,800 px at 375).
- [x] The `/where` phone layout: Search under the box, "See the report" only after a pick, 2-decimal coordinates, a map pick named by its town.
- [x] Merging "never happened here" rows into one line.
- [x] A complete `/about`: every household record with its quality badge and definition, and every dataset (NOAA HMS, GRACE, IMERG, MODIS, MERRA-2 haze).
