# Site critique and test pass, 2026-11-15

A full pass over the Climatch web app on branch `feat/a2-seasonal-nextjs` (uncommitted work). It covers every use case and control in a real browser, a privacy trace, the quality checks (widths, keyboard, motion, console, layout shift) and new automated tests. Nothing in `frontend/src` or `backend/` was edited. The only new files are tests and this report.

## How it was tested

- **Servers:** the shared Next.js dev server (http://localhost:5173) and FastAPI (http://127.0.0.1:8000, Postgres store). Neither was restarted, and nothing was written to the database.
- **Browser:** the desktop app's built-in browser at 1024×768.
  - Most page × place × variable combinations ran in same-origin iframes, with a script reading the DOM, the busy and alert regions, console errors and `scrollWidth`.
  - Width checks used iframes of 1440, 1024, 768, 375 and 320 px.
  - Offline was simulated by making `fetch` reject for `/api/*` only.
- **Households:** made up only. For example, a person aged 65+ with asthma and "Other: Migraines (made-up test)", plus a child with no answer.
- **Places:**
  - Points: Denver CO, Spokane WA, Phoenix AZ, a map-picked spot in Russell County KS, the Empire State Building, Anchorage and Hilo.
  - States: Texas, plus the unknown code `ZZ`.
- **Backend restart:** the backend restarted during the run with data version `2026-11-15-a5` (D37: smoke days count medium and heavy smoke only, from 2011).
  - No page in this pass failed during the restart.
  - Every smoke observation below was re-checked on the new data: New York, Denver and Russell County, KS.
- **Caveat:** the browser pane was hidden during the run, so `requestAnimationFrame` didn't fire (checked: `raf blocked`).
  - Smooth scrolling, scroll-spy and transitions only advanced when a screenshot forced a frame.
  - Layout shift was measured with forced frames, not continuous rendering.
  - Phone-width screenshots came out clipped, so layout at 375 and 320 px was judged from DOM measurements, not pictures.

## Fixed on 2026-11-15 (after this review)

All high and medium items below are fixed, plus two from the time map (the fires change scale and "Replay" before any run). The low items (L1–L11) and the design and UX critique are still open.

| Item | Fix |
| --- | --- |
| H1 | The household moved into a `POST /api/v1/reports` body; `GET` ignores household keys (D38). Tests: `backend/test_api.py`, `backend/test_api_edges.py`, `frontend/src/api/requests.test.js` |
| M1, M2 | The form starts from the saved household; an example uses its own household and never saves it (`HomeView.jsx`, `HealthConditionPage.jsx`, `ReportView.jsx`) |
| M3 | `recordName` gives every heading and the not-available line the record's name, from the URL before data arrives (`presenters/detective.js`) |
| M4 | The report heading takes focus when it replaces the loading screen; "See the details" moves focus to the opened row (`ReportPage.jsx`) |
| M5 | `lib/ticks.js` `niceTicks`: round ticks inside the data range, one tick for a flat series (`MonthlyLine`, `BandChart`, `MultiLine`) |
| M6 | Seasons and single months are worded as separate results |
| M7 | Plain offline wording; a failed year switch keeps the report with "Couldn't load … Still showing … Try again" |
| M8 | "Open this square in Explore", and the place reads "the square at …" |
| M9 | A note when a link's place or record was replaced (`LinkNote`); errors offer "Choose another place" |
| M10 | The access log decodes query keys before hiding household values (`backend/app.py`) |
| M11 | Compare says "has the same or less … than" and "Each has less of something"; one-limit groups read "Under your limit" |
| Time map | Change-scale edges at the 40/70/90/97th percentiles of the changes (`tools/map_frames.py` `change_edges`); "Play" until a run has ended |

## Second round, 2026-11-15: low items and the design critique

| Item | Fix |
| --- | --- |
| L1 | Text a map click writes into the search box is `quiet`: no suggestion requests (checked: one reverse lookup, no suggest calls) |
| L2 | Rates use two significant digits ("−0.004 AOD per decade"); a scale description is not printed as a unit |
| L3 | `format` uses the real minus sign and never prints "-0" |
| L4 | A mixed household reads "Adults 65+ and young children (someone has asthma or COPD)" |
| L5 | Smoke rows read "Medium or thick smoke days … since 2011"; detective pages offer only the periods a record can fill (smoke: 10 and 15 years) |
| L6 | No "Please"; "Kidney disease"; "Step 1 of 2"; no capital eyebrows (sentence case everywhere) |
| L7 | Footer: "NASA Space Apps Challenge 2026" (the team name is still for the team to add) |
| L8 | Smoke days and humid-heat days have actions, reusing the project's EPA smoke and CDC heat guidance, each cited to that health source (`actions_source_*` in `narratives.json`) |
| L9 | Patterns carry `complete`; the page says when some NASA data didn't arrive and the counts may change |
| L10 | Input errors are plain sentences per field; `/events` returns 404 for an unknown state |
| L11 | Comments: the side menu's storage note corrected; Vietnamese comments translated; `/learn` point cases link to the household report with their record open |
| Design | `/where` has its own short heading; the household pill sits above card titles; the "Other" box fills its row; shorter placeholder; the state outline stays clear of the map card; round axis ticks with the unit; a stripes key; one colour meaning on `/seasons`; count axes stop at zero; `/test` says "nothing to test" for a record that never changes; compare shows a single limit as text, "No starting place (A to Z)", "See the report for …", a loading line, end labels nudged apart; one name per record ("Muggy days", "Humid-heat days", "Traffic pollution (NO₂)"); "No clear change yet" carries its reason; whole-number counts; `/about` units without nested brackets; one ambient loop on the home and `/where` art |

**Still open:** the phone header is 114 px (was 130): the links lose their icons, but Learn and About have nowhere else to go yet. The open record's chart measured 248 px at 1024 px, not the 600 px noted above, so it was left as is.

## Top 10 issues

1. **Health answers leave the browser in the request URL.** `GET /api/v1/reports?…&conditions=asthma_copd&age_groups=65_plus,under_5` (`api/report.js:31`). This is by design (D26), but it breaks the brief's rule: never in a URL or a network request.
2. **Going back to `/` shows a blank household form.** Pressing "Next step" then overwrites the saved household with "65 and older, no conditions" (`screens/HealthConditionPage.jsx:208`).
3. **The example buttons silently replace the visitor's household** (`views/flow/HomeView.jsx:18`).
4. **The access log leaks percent-encoded household keys.** For example `%63onditions=asthma_copd` (`backend/app.py`, `RedactHousehold`).
5. **Focus drops to `<body>` when the report replaces the loading screen.** "See the details" also doesn't move focus into the row it opens (`views/flow/ReportView.jsx`, `screens/ReportPage.jsx`).
6. **A flat series breaks the charts.** Four identical y-ticks give a React duplicate-key console error and a collapsed axis (`components/detective/MonthlyLine.jsx:30`, `BandChart.jsx:38`, `MultiLine.jsx:29`). Seen on `/explore` and `/events` for warm nights, muggy days and humid-heat days in Denver.
7. **The seasons summary is misleading.** It says "clearest in autumn (months: Dec)" or "in winter (months: May)" (`presenters/detective.js:190`).
8. **The not-available state shows a raw key.** For example "smoke_days in Hilo, HI" and "smoke_days isn't available here" (`views/ExploreView.jsx:25`, `views/common.jsx` `Status`).
9. **The offline error blames the server and tells the visitor to "Start the backend (see README)"** (`api/http.js:24`). A failed year switch also throws away the report already on screen.
10. **Bad detective links fail quietly.**
    - A place outside the US silently becomes Wisconsin, and an unknown variable becomes PM2.5.
    - An unknown state shows an error whose only button reloads the same bad link (`presenters/detective.js` `readPlace`/`readVariable`, `views/common.jsx` `Waiting`).

## Use case × result matrix

Pass = works as specified. Issue = works, with a problem listed under Bugs or Critique. Fail = doesn't do what the spec says.

### Household flow

| Use case | Result | Notes |
| --- | --- | --- |
| `/` each condition checkbox | Pass | All 5 conditions and Other toggle; Other enables its text box |
| `/` None / Not sure / Prefer not to say | Pass | Mutually exclusive with the conditions and with each other |
| `/` each age group, Add another person | Pass | Panel says "Got answers for 1 of 2 people" |
| `/` Next with one person unanswered | Issue | Goes ahead with no nudge, though the panel asked to "Answer for everyone" |
| `/` return after answering | **Fail** | The form resets to 65+ with nothing ticked (bug M1) |
| `/` example buttons (Phoenix, Houston, Spokane) | Issue | They open the case report, but overwrite the household (bug M2) |
| `/where` city ("Denver") | Pass | Suggestions, arrow keys and Enter, pin and ~50 km square |
| `/where` partial ZIP "9810", then "98101" | Pass | "Keep typing: a ZIP code has 5 digits", then "98101, Seattle, WA" |
| `/where` state ("Texas") | Pass | Outline, the "whole state" card, "Check your result" disabled |
| `/where` street address ("350 5th Ave, New York") | Pass | Resolves to the Empire State Building |
| `/where` recent places | Pass | An empty box lists the last 4 picks, by type |
| `/where` click on the map | Issue | Pin and name work. It also fires 2 needless Photon suggestion calls (bug L1) |
| `/report` years 10/15/20/25 | Pass | URL `years=` updates; dims with "Updating…" for 2.7–3.1 s, then swaps |
| `/report` top cards and "See the details" | Issue | Opens the row and scrolls, but focus stays on the card button (bug M4) |
| `/report` each of 16 theme rows, open and close | Pass | `aria-expanded`, a year chart (one tab stop) and 5 Look closer links that keep the place and years |
| `/report` "Not available here" | Pass | "Neighborhood surface heat (not precomputed for this place)." |
| `/report` case file (Spokane) | Pass | `case=spokane` opens the PM2.5 row with the one-line finding |
| `/learn` case files | Issue | All 5 open detective pages, not the report. A5 says a case file opens the report (critique) |
| `/compare` topic chips, limits, starting place | Issue | Works. Wording problems in the group titles and the verdict (bug L4); "Humid heat" means *muggy days* |
| `/compare` add cities, side by side, Escape | Issue | Dialog works and focus returns. The chart is an empty grey box for ~4 s with no status, and its end labels overlap |

### Look closer pages

Every page loaded for a point (Denver) and a state (Texas) with **every** variable in the context bar: 16 point variables × 6 pages and 12 state variables × 6 pages, 168 loads. Each settled in 1.5–7.5 s with no error state.

| Page | Point, all 16 variables | State, all 12 variables | Problems found |
| --- | --- | --- | --- |
| `/explore` | Pass, 3 with console errors | Pass | Duplicate-key error on flat series (bug M5); y-axis ticks like 33.1/66.3/99.4 with no unit (critique) |
| `/seasons` | Issue | Issue | Misleading season summary (bug M6); "clearest in winter, spring, summer and autumn" |
| `/test` | Issue | Issue | "0 nights per decade (95% range: 0 to 0)" for a record that never happens; "−0.00 AOD per decade"; soil wetness rate reads "−0.01 0 (dry) to 1 (soaked) per decade" (bugs L2, L3) |
| `/events` | Pass, 3 with console errors | Pass | Same flat-series error |
| `/patterns` | Pass (ignores `var`) | Pass | Denver read "308 pairs" on one load and "301 pairs" on the next; Texas "7 pairs" then "8" (bug L9) |
| `/map` | Pass | Pass (ignores `region`) | See below |

### `/map`

- **Animated map:** all 5 records × "Each year" and "Change from the start" passed. Opens paused on 2025 (smoke and fires: "2023 to 2025 average"), with Next disabled at the end.
- **Play, pause, previous, next:** pass. Play runs from 2001; pausing holds the frame.
- **Slider:** mouse and keys pass. Home goes to 2001, three right arrows to 2004, End to 2025; `aria-valuetext` is the year.
- **Speeds:** pass. In 3 s, Slow moved 1 frame, Normal 2 and Fast 5 (nominal 1600, 1000 and 550 ms per frame).
- **Live region:** pass. It is `polite` when paused and `off` while playing, as D36 asks.
- **Hover readout:** pass. "Near 39.50°N, 97.50°W: 7.9 µg/m³ … (8.2 in 2001)."
- **Household-place readout:** pass. "Near Denver, CO: 4.9 µg/m³ of fine particles in 2025 (5.7 in 2001)."
- **Trend map:** layers PM2.5, NO₂ and Fires × views Change, early and late all pass. The legend filter's "Only +0.625 to +1.25" toggles and offers "Show all".
- **Pin by keyboard:** pass. Arrows move between squares; Enter opens "Pinned square · 40.00°N, 103.75°W".
- **Compare:** issue. "Compare this square on the chart" replaces the place with the square on `/explore`; nothing is compared (bug M8).

### Side menu

- **Fold to rail and back:** pass. 64 px, `aria-pressed`, remembered in `localStorage` as `climatch.side`.
- **Section highlight while scrolling:** pass. `aria-current="location"` follows the section in view.
- **Clicking the last section:** pass. It marks the last item, sets the hash to `#heat-h` and moves focus to it.
- **Back to top:** pass. It scrolls to 0 and focuses the `h1`.
- **Drawer below 1024 px:** pass. The strip reads "Texas: Average temperature · 2001–2025, step 2 of 6 (Seasons)"; the popover opens, Escape closes it, and picking a step closes it.

### Other pages

| Page | Result | Notes |
| --- | --- | --- |
| `/learn` | Pass | 5 case files, the 5 challenge steps |
| `/about` | Issue | Lists state variables only, nothing for an address; "Hottest day of the month (°C (hottest day of the year)…" |
| `/kit` | Pass | 11 sections, `noindex` |

### The four states

| Page | Loading | Error | Not available | Data |
| --- | --- | --- | --- | --- |
| `/report` | Pass (analyzing screen) | Issue: offline message and the old report is lost (bug M7) | Pass ("Not available here") | Pass |
| `/report` with a bad place (`lat=abc`, London, none) | — | Pass: "Pick a place first. This link has no US place in it." with "Choose a place" | — | — |
| Detective pages | Pass (skeleton and status line) | Issue: only "Try again", which reloads the same URL (bug M9) | Issue: raw key (bug M3) | Pass |
| `/compare` | Issue: grey box without a status line in the dialog | Not triggered | — | Pass |

**Tampered URLs:**
- `/explore?lat=95&lon=-100` silently shows Wisconsin.
- `/explore?region=TX&var=bogus` silently shows PM2.5.
- `/seasons?…&var=frost_days` (a state-only variable) for a point silently shows PM2.5.
- `years=99`, `from=2030&to=2040` and `from=1990&to=1992` silently fall back to 25 years. That one is fine.
- `region=ZZ` gives the error state on explore, events and patterns; `/map` ignores it.

### Quality checks

**Widths.** No sideways scroll on 14 pages × 1440/1024/768/375/320. That covers the report after its loading screen and with a record open. `scrollWidth` equalled `clientWidth` everywhere.
- The header uses 130 px of a 812 px phone screen (3 rows of nav links).
- A5's "records open as a bottom sheet" on phones isn't built: rows open inline.

**Keyboard.**
- "Skip to content" is the first stop on all 12 pages checked; `#main` exists; no positive tabindex.
- Every SVG chart is at most one tab stop.
- Every Leaflet map is 5 stops: the map plus zoom in, zoom out and 2 attribution links.
- Focus is visible (`:focus-visible` 2 px outline).
- Focus is lost after the report loads, and "See the details" doesn't move it (bug M4).

**`prefers-reduced-motion`** (checked in the stylesheets; there is no emulation in this browser):
- Every infinite animation is guarded, either inside `no-preference` or cancelled in a `reduce` block (`LoadingPage.css:271–326`).
- The global net (`index.css:148`) shortens durations but doesn't set `animation-iteration-count: 1`, so any future unguarded loop would flicker.

**Console errors.** The only app errors are React duplicate keys (bug M5). The 404s came from the deliberate `ZZ` probes.

**Layout shift.** 0.000 on a cached `/report` (Spokane), with frames forced by screenshots. Not a substitute for a visible-pane measurement; re-check with the pane visible.

### Privacy

| Check | Result |
| --- | --- |
| Household in a page URL | Pass. Report, compare and detective URLs carry only the place, the variable and the years |
| Household in browser storage | Pass. `sessionStorage` `climatch.household` (including the "Other" free text) and `climatch.recent`; `localStorage` holds only `climatch.side` |
| Household in a network request | **Fail** against the brief. `/api/v1/reports` sends `conditions` and `age_groups` in the query string (bug H1). `/compare` and `/patterns` send none, or `conditions=none` |
| "Other" free text | Pass. Never sent (`requests.test.js` locks this) |
| Household in the access log | Issue. Plain keys are hidden, percent-encoded keys are not (bug M10) |
| Household in the database | Pass by code and tests: the store key, params and stored report hold no household (`test_api_edges.py`). The live database was not read |

## Bugs, ranked

### High

**H1. Health answers travel in the report request URL.**
- **Steps:** answer the household (asthma, 65+), pick a place, open the network panel.
- **Expected (the brief):** health answers never appear in a URL or a network request.
- **Actual:** `GET /api/v1/reports?lat=39.04&lon=-98.89&conditions=asthma_copd&age_groups=65_plus%2Cunder_5&period=25`. A query string is the part of a request most often logged by proxies, dev servers and browser extensions.
- **Files:** `frontend/src/api/report.js:31`, `backend/api/v1/reports.py`.
- **Note:** this follows D26 (the backend applies the household per request). Fixing it needs a decision.
  - Fetch the household-neutral report and apply `card_order` / `priority_for_user` in a presenter. It's ordering, not a statistic.
  - Or send the household in a POST body. It's still a request, but out of URLs and access logs.

### Medium

**M1. Returning to `/` loses the household, and "Next step" then overwrites it.**
- **Steps:** answer 2 people with conditions → Next → on `/where` press "Change your household".
- **Expected:** the form shows the saved answers ("keep the user's household").
- **Actual:** person 1, "65 and older", nothing ticked. `sessionStorage` still holds the old answers until "Next step" overwrites them.
- **File:** `screens/HealthConditionPage.jsx:208` (`useState(() => [newPerson()])` ignores `useHousehold()`); default age `'65 and older'` at line 59.

**M2. The example buttons overwrite the household without asking.**
- **Steps:** answer the household → `/` → "Spokane smoke".
- **Expected:** the visitor's household is kept, or they are told the example uses its own.
- **Actual:** `sessionStorage` becomes `[{"age":"Children (0–12)","conditions":["asthma"]}]`. The visitor's answers are gone for every later report.
- **File:** `views/flow/HomeView.jsx:18`.

**M3. The not-available state shows the raw variable key.**
- **Steps:** `/explore?lat=19.72&lon=-155.08&name=Hilo%2C+HI&var=smoke_days`.
- **Expected:** "Smoke days in Hilo, HI" and "Smoke days isn't available here: NOAA's smoke maps don't cover Hawaii."
- **Actual:** h1 "smoke_days in Hilo, HI"; status "smoke_days isn't available here: Not measured for this place."
- **Files:** `views/ExploreView.jsx:25` (`f?.label`), `views/common.jsx` `Status` (`current.factor.label`). The not-available factor has no label; fall back to `variableLabel(place, key)`.

**M4. Focus is lost on the report.**
- **Steps:**
  - (a) On `/where`, pick a place by keyboard, press Enter on "Check your result", and wait for the report.
  - (b) On the report, Tab to a top card's "See the details" and press Enter.
- **Expected:** focus lands on the report heading (a), and on the opened row (b).
- **Actual:**
  - (a) `RouteFocus` focuses the loading screen's `h1#loading-title` on the change from `/where` to `/report`. When the report replaces the loading screen, focus falls to `<body>`. The path doesn't change at that point, so nothing moves focus again.
  - (b) The row opens and scrolls into view, but focus stays on the card's button, now off screen.
- **Files:** `views/flow/ReportView.jsx` / `screens/ReportPage.jsx` (focus the `h1` when the report arrives if focus was on the loading title; focus the row's button after "See the details").

**M5. A flat series produces duplicate React keys and a collapsed axis.**
- **Steps:** `/explore?lat=39.74&lon=-104.99&name=Denver%2C+CO&var=warm_nights` (also `muggy_days`, `humid_heat_days`, and the same on `/events`).
- **Expected:** no console errors, and a readable axis.
- **Actual:** 3× "Encountered two children with the same key, `0`". With `lo === hi`, `[0,1,2,3].map(i => lo + (hi - lo) * i / 3)` gives `[0,0,0,0]`.
- **Files:** `components/detective/MonthlyLine.jsx:30`, `components/detective/BandChart.jsx:38`, `components/MultiLine.jsx:29`.
- **Fix:** key by index, and give a flat series a one-unit range.
- **Failing-test sketch** (after extracting a pure `yTicks(lo, hi)` helper into a presenter):
  ```js
  it('gives a flat series distinct ticks', () => {
    const t = yTicks(0, 0)
    expect(new Set(t).size).toBe(t.length)
  })
  ```

**M6. The seasons summary puts months in the wrong season.**
- **Steps:** `/seasons?region=TX&var=t2m` → "The change is clearest in autumn (months: Dec)." Also Denver `wettest_day` → "clearest in winter (months: May)", and Texas `aod` → "summer and autumn (months: Mar and Aug)".
- **Expected:** the clear seasons and the clear months worded as separate results, for example "Clear in autumn as a season. Of single months, only December."
- **Actual:** the parentheses read as "the months of that season".
- **File:** `presenters/detective.js:190`.
- **Failing-test sketch:**
  ```js
  it('does not present a month as part of a season it is not in', () => {
    const row = (name, clear) => ({ name, available: true, slope_per_decade: clear ? 1 : 0.1, clear, q: clear ? 0.01 : 0.5 })
    const factor = { unit: '°C', seasonal: {
      seasons: ['winter', 'spring', 'summer', 'autumn'].map((n) => row(n, n === 'autumn')),
      months: MONTHS.map((m) => row(m, m === 'Dec')) } }
    expect(seasonBars(factor).summary).not.toMatch(/autumn \(months: Dec\)/)
  })
  ```

**M7. The offline error blames the server and the report is thrown away.**
- **Steps:** on `/report`, go offline (or block `/api/*`), then switch to 20 years.
- **Expected:** "We can't reach Climatch. Check your connection and try again", with the old report still visible and dimmed. That fits A5 and "no dead ends".
- **Actual:**
  - The whole report is replaced by "We couldn't build this report. The Climatch server is not running. Start the backend (see README) and try again."
  - Detective pages show the same sentence.
- **Files:** `frontend/src/api/http.js:24` (one message for every network failure), `views/flow/ReportView.jsx` (error replaces data).

**M8. "Compare this square on the chart" doesn't compare.**
- **Steps:** `/map?…Denver…`, pin a square, press "Compare this square on the chart".
- **Expected:** the square compared with Denver.
- **Actual:** navigates to `/explore?lat=40&lon=-103.75&name=Square+at+40.00°N…`. Denver is gone, and the h1 reads "… in Square at 40.00°N" (capital S).
- **File:** `components/TrendMap.jsx:130`. Rename it to "Open this square", or pass the household place as a comparison.

**M9. Bad detective links fail quietly, or into a dead end.**
- **Steps:**
  - `/explore?lat=95&lon=-100` shows Wisconsin.
  - `/explore?region=TX&var=bogus` shows PM2.5.
  - `/seasons?lat=39.74&lon=-104.99&var=frost_days` shows PM2.5 for "39.74, -104.99".
  - `/explore?region=ZZ` gives an error whose only action is "Try again".
- **Expected:** a short note when the link's place or variable was replaced ("This link's place isn't in the US, so here is Wisconsin"), and "Choose another place" on errors.
- **Actual:** silent replacement; "Try again" reloads the same bad URL.
- **Files:** `presenters/detective.js:51` (`readPlace` accepts any two letters) and `:62`; `views/common.jsx` `Waiting` (add the `/where` link that the "stuck" state already has).

**M10. The access log shows percent-encoded household keys.** Found by the new backend tests.
- **Steps:** `GET /api/v1/reports?lat=40&lon=-100&%63onditions=asthma_copd&age%5Fgroups=under_5`.
- **Expected:** the uvicorn access line shows `conditions=[hidden]`.
- **Actual:** the API decodes and applies the keys, but the log line prints them.
- **File:** `backend/app.py` `RedactHousehold`. Redact the parsed query, not the raw text.
- **Failing-test sketch:**
  ```python
  def test_access_log_hides_encoded_household_keys():
      line = access_line("/api/v1/reports?lat=1&lon=-100&%63onditions=asthma_copd")
      assert "asthma" not in line
  ```

**M11. The compare page's wording breaks its own rules.**
- **Steps:** `/compare`, choose only "Humid heat", add Denver and Midland, then "Compare side by side".
- **Actual:**
  - Group titles read "Under all 1 of your limits" and "Under 0 of your 1 limits".
  - The dialog says "Denver is equal or better than Midland on all 1 things you chose." That is a ranking word ("better") on a page whose rule is "no score, rank or best".
- **File:** `presenters/compare.js:94`, `:125–126`.
- **Failing-test sketch:**
  ```js
  it('words a single limit naturally', () => {
    const g = groupCities(table, ['humid'], meta)
    expect(g.map((x) => x.title)).not.toContainEqual(expect.stringMatching(/all 1 of|0 of your/))
  })
  ```

### Low

- **L1. A map click sends needless suggestion requests.**
  - After a click on `/where`, the app calls Photon's suggest with `q=Picked spot near 39.041, -98.890` and then `q=Fairport Road, Russell County, KS`. Photon is rate-limited and shared.
  - **Cause:** `LocationPage.handlePickSpot` sets the box text, but not `AddressSearch`'s `picked`.
  - **Files:** `screens/LocationPage.jsx:41–48`, `components/AddressSearch.jsx:20`.
- **L2. Rates near zero and unitless rates print badly.**
  - `/test?…Denver…&var=aod` shows "−0.00 AOD per decade". `signSmall` uses `toFixed(2)` for |v| < 0.1; use 2 significant digits like `format`.
  - `/test?region=TX&var=gwetroot` shows "−0.01 0 (dry) to 1 (soaked) per decade": the unit's description is used as a unit.
  - **File:** `presenters/detective.js:97–98`.
  - **Sketch:** `expect(verdict({ ...factor, slope_per_decade: -0.004 }).rate).not.toMatch(/−0\.00 /)`.
- **L3. Negative numbers render with an ASCII hyphen, and `format(-0)` prints "-0".**
  - On the report, "Water storage -1.8 → -7.2 cm", while `sign()` uses U+2212.
  - `phoenix_10y.json` has `heat_island.then = -0.0`.
  - **File:** `lib/format.js`. Sketch: `expect(format(-0)).toBe('0'); expect(format(-1.8)).toBe('−1.8')`.
- **L4. The "who lives here" line misreads a mixed household.**
  - A 65+ adult with asthma plus a child with no conditions becomes "Adults 65+ and Young children with asthma or COPD". The capital Y comes from `inSentence` lowercasing only the first word, and the wording implies everyone has every condition.
  - **Files:** `presenters/report.js:9` and `:54–57`, `presenters/reportView.js:29`.
  - **Sketch:** `expect(householdLine(reportWith({ conditions: ['asthma_copd'], age_groups: ['65_plus', 'under_5'] }), top)).not.toMatch(/ Young/)`.
- **L5. Smoke wording on the new smoke record (D37, data version `2026-11-15-a5`).** Smoke now starts in 2011 everywhere I re-checked, so the earlier mismatch between 2006 and 2011 is gone. Three wording points remain:
  - **"Medium or thick" is hidden on the report.** It appears only behind "What the data can't see". The row, the top card and "What happened" just say "Smoke days: 4 days a year". The time map already says "days of medium or thick smoke a year": use the same words on the report row (`unit` holds "days / year with medium or thick smoke overhead"; the report uses `unit_short`).
  - **The comparison years aren't shown for smoke.** New York's row reads "3.8 → 24.2 days" with no years, under an intro that says every record compares "the first five years with the last five". For smoke those are 2011–15, while most rows start in 2001. The hero "In 25 years, 4 things clearly got worse" counts smoke, which covers 15 years. Show "since 2011" on rows whose record starts late.
  - **The year buttons don't fit late-starting records.** On `/test?…Denver…&var=smoke_days`, "Last 25 years" stays pressed while the test reads "2011–2025, 15 years". 20 and 25 can't change anything for smoke. The same applies to NO₂ (2005), fires (2003) and water storage (2002). Disable or relabel the periods a record can't fill (`periodsFor` in `presenters/detective.js:67`).
- **L6. Copy against `docs/UX.md` and frontend rule 13.**
  - "Please pick a place in the United States." (`api/http.js:31`; it's also used for every 422, even `period=25.5`).
  - "Please enter an address." (`api/location.js:8`).
  - "Kidney Disease" (`screens/HealthConditionPage.jsx:11`).
  - Capital eyebrows: "CLIMATE TREND REPORT, 2001–2025", "WHAT CHANGED HERE", "WHO LIVES HERE", "SELECTED LOCATION", "CHECK YOUR RESULT", "STEP 02 / 02", "ANALYZING".
- **L7. A placeholder ships in the footer:** "Hackathon 2026 · [Team name]" (`components/Footer.jsx:11`).
- **L8. Smoke days and five other records have no actions.**
  - In New York (data `a5`), smoke days are clearly worse (3.8 → 24.2), but "What people do about it" lists only PM2.5 and heavy rain.
  - `data_pipeline/config/narratives.json` has `actions` for 10 records. Smoke days, humid-heat days, haze, satellite rain, ground heat and water storage have none, so when one of these is the record that got worse, the list skips it.
  - Fix: add sourced, general actions for at least smoke days (AirNow) and humid-heat days.
- **L9. Pattern counts differ between two loads of the same URL.** `/patterns` for Denver read "308 pairs" and then "301 pairs"; Texas read "7 pairs … clearly" and then "8". Probably the first load used an incomplete report (D31 says those aren't cached). Worth confirming that the page says when a report is incomplete.
- **L10. API errors read like a validator.** "lat: Input should be less than or equal to 72", "factor: Input should be 'pm25', 'no2', …". `/events?region=ZZ` returns 200 with no events, while `/regions/ZZ/*` returns 404.
- **L11. Small doc and code mismatches.**
  - `components/detective/SideMenu.jsx:8` says the household is in `localStorage` (it's `sessionStorage`).
  - `screens/LoadingPage.css` has Vietnamese comments in an English codebase.
  - `/learn` case files don't open the report as A5 describes.

### Data plausibility (for the data owner, not bugs in this pass)

- The Russell County, KS report shows **very dry days 0 → 0** (days with average humidity below 20%). No such days in 25 years in central Kansas is worth a sanity check against the RH2M definition.
  - An earlier smoke figure from this pass (21 → 143.2 a year, 2006–10 baseline) came from the old smoke record.
  - With D37 (medium and heavy only, from 2011) the same spot reads 13 → 32.8, no clear change.
- Time map, fires, "Change from the start": the legend runs −500 to +500 detections while typical cells change by about 6. Almost every square sits in the palest band, so the colours carry little information.

## Design and UX critique

What works: a calm, consistent token palette; one font; generous card radii; Look closer pages with a clear numbered spine; and honest captions under every chart (dataset, grid, period). The household report answers its three questions above the fold at 1024 px. The rough edges:

### Spacing and layout

- **`/where` repeats the home hero.** "Thinking about a new home? Investigate its climate trends." is the h1 again, pushing the search box to y ≈ 420 at 1024×768. One question per screen says this page's h1 should be "Where is the home?"; drop the hero art here, or shrink it to a band.
- **Top cards wrap their titles.** At 1024 px, "Fine particles (PM2.5)" breaks onto 3 lines next to the "For your household" pill. Put the pill above the title, or use a dot plus a tooltip.
- **The phone header takes 130 px** (3 rows of links). Collapse the nav into the existing "Look closer"-style menu below 600 px.
- **The "Other" text box is 90 px wide**, so typed text is hidden at once. Let it take the row's remaining width.
- **Placeholders are truncated** in narrow boxes ("e.g. 1600 Pe" in the side menu, "e.g. 1600 Pennsylvania Ave, W" on `/where`). Use a shorter example ("e.g. 80202 or Denver").
- **The state card on the location map covers the state.** For Texas it hides Houston and the coast. Dock it under the map, or offset the fit bounds.

### Type and weight

- **Capital eyebrows everywhere on the household flow** (listed in L6). They break rule 13 and feel shouty next to the 500-weight body. Use sentence case at the small size, in the muted colour.
- **The open record's chart is very tall** at 1024 px (about 600 px for one bar chart). Cap it near 220 px; the two labelled averages carry the story.

### Controls

- **The "Smoke and fine particles" limit on `/compare` is a disabled select with one option** ("not clearly rising"). A disabled control reads as broken. Show it as plain text: "Limit: not clearly rising".
- **"Starting place (optional)" has "A to Z instead" as its first option.** As a select label it reads oddly. Use "No starting place (A to Z)".
- **"Check your result"** is vague, and "result" isn't a word used anywhere else. Use "See the report for Denver".
- **The side-by-side chart shows an empty grey block for about 4 s with no status.** Use the shared `Waiting` (status line plus skeleton) the other pages use. Its end labels ("Denver", "Midland") overlap when two lines end at the same value: nudge them apart or put them in a legend.
- **"Replay 2001 to 2025" is the first label on the animated map's play button,** before anything has played. Say "Play 2001 to 2025" until the first run ends.

### Charts

- **`/explore`** draws monthly counts (0–31) and yearly totals (77–99) on one unlabelled y axis with ticks 0 / 33.1 / 66.3 / 99.4. Use round ticks and a unit label ("nights"), or split monthly and yearly into two panels. The stripes above have no key.
- **Two colour meanings on one page.** On `/seasons`, warming months are red bars while the cycle plot's warming December panel is green. Use the same colour for "rising" on both.
- **Count axes run below zero.** The `/test` smoke chart for Denver has a y tick at −7.4 days, from the band chart's padding. Clamp the axis at 0 for counts (`BandChart.jsx:16`).
- **Legend tick labels have too many digits:** "−0.00625 / +0.00625" (haze), "−0.625" (PM2.5). Round to 2 significant digits.
- **On `/test`, a record that never happens here** (Denver warm nights: 0 every year) is tested and shown as "0 nights per decade (95% range: 0 to 0)". Say "No warm nights in 25 years here, so there's nothing to test", as a not-available state.

### Wording

- **Plain-language names for households.**
  - The report shows "×10¹⁵ molec/cm²" and "AOD". Keep the units, but lead with words ("NO₂ from traffic: down by about a quarter") or tuck the unit behind the existing glossary toggletip.
  - "Humid heat" (the compare chip), "Muggy days" and "Humid-heat days" (the report) are three names for two records. Use one name per record across pages.
  - "Traffic pollution (NO₂)" on the report becomes "Traffic & industry pollution (NO₂)" on compare. Pick one.
- **"No clear change yet" with no reason.** "Very hot days 24.2 → 39.6 days, No clear change yet" will puzzle a household: a 60% jump called "no change". Add the existing plain reason from the report ("too few years to tell apart from the usual ups and downs").
- **Rounding differs within one row.** New York's smoke row says "3.8 → 24.2 days" while its sentence says "4 days … 24 days". Round counts to whole numbers everywhere (UX "Numbers").
- **Odd parentheses on `/about`:** "Average temperature (°C (yearly average); from 1981)" and "Hottest day of the month (°C (hottest day of the year)…". Use "Average temperature · °C, yearly average · from 1981".

### Motion

- **Entrances behave, and reduced motion is respected everywhere** (stylesheet scan).
- **The home and `/where` art loops are busy behind the form.** The drifting glow, stars, floating house and cloud all run at once. Keep one ambient loop, or stop them once the visitor starts typing.
- **The detective `h1` changes after data arrives** ("Explore in Phoenix, AZ" becomes "Warm nights in Phoenix, AZ"). A screen reader that focused the old text never hears the new one. Render the variable name from the URL at once; it's known before the data.

## Automated tests added

New files only. Both suites are green.

| File | Tests | What it locks in |
| --- | --- | --- |
| `frontend/src/lib/format.test.js` | 10 | 1-decimal rounding, whole counts, 2 significant digits below 1, a dash for non-finite input, `sign` with U+2212, units, an arrow and a word for each direction |
| `frontend/src/lib/household.test.js` | 7 | One `sessionStorage` key each for the household and recent places, never `localStorage`; recent places newest first, deduplicated, at most 5; bad JSON or blocked storage don't throw |
| `frontend/src/api/requests.test.js` | 11 | Every health answer maps to its backend key; "other" and its free text never leave; the exact parameters of each request (lat, lon, conditions, age_groups, period, start/end); path values escaped |
| `frontend/src/presenters/detective.guards.test.js` | 11 | `readPlace` / `readVariable` / `readYears` / `readRange` against tampered values (edges of the US box, NaN, Infinity, `__proto__`, reversed or fractional years); `detectiveQuery` drops household keys |
| `frontend/src/presenters/weekly.edges.test.js` | 4 | Empty data, below and within the usual range, a zero-width range, no place |
| `backend/test_api_edges.py` | 84 cases | 59 tampered inputs across every `/api/v1` route return exactly `{"error":{code,message}}` with no internals and no call to the build, the geocoder or the store; edges of the US box and the 8-year range are accepted; a crash in any service is a plain 500; no household in the store's key, params, report, headers or error bodies; `RedactHousehold` on repeated, comma-encoded, leading and lookalike keys |

Results on 2026-11-15:
- `npm --prefix frontend test`: 20 files, 150 tests passed. The baseline was 15 files and 106 tests; one test came from the other session during the run.
- `npm --prefix frontend run lint`: clean.
- `.venv/Scripts/python -m pytest -q backend`: 145 passed, 1 skipped. The baseline was 61 passed, 1 skipped.

The real bugs these tests found (M10, L3) are written up above with sketches, not left as red tests.

**Gaps left:**
- The hooks (`useHousehold`, `useCompareTable`, `useAnalysis`) need a React renderer, which isn't installed.
- The `trendMap`, `patterns` and `compare` presenters got no new cases.
- The flat-series tick logic lives in components, so it can't be unit-tested until it moves to a presenter.

## Not verified

- **A visible browser pane.** Smooth scrolling, cross-fades, continuous layout-shift measurement and screenshots at 375/320 px. The pane was hidden, so `requestAnimationFrame` didn't run.
- **Real reduced-motion emulation.** Checked through the stylesheets and the code instead.
- **Real devtools offline.** Simulated by rejecting `/api/*` fetches.
- **The live Supabase tables.** Not read: no `DATABASE_URL` access by design.
- **The Next.js dev server's own log** (does the rewrite log query strings?). That terminal belongs to the other session.
- **`npm --prefix frontend run build`.** Not run; only test files changed.
- **Screen readers.** Live-region behaviour was read from the DOM, not heard.
