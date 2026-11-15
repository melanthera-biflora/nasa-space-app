# Household pages, critique round 3 (2026-11-15)

Checked in the built-in browser at 1280×900 and 375×812 with made-up households: two 65+ adults (one with asthma), and a fresh tab with no answers. I opened reports only for Spokane and New York; I also searched ZIP 98101 and picked a spot on the map near Seattle. Items in the earlier critique's "Fixed" tables and the map review's "Next" list are left out unless they regressed or I measured something new.

## `/`: who lives here

- **Medium.** Every new person defaults to "65 and older". When I added Person 2 and pressed Next, the tab saved two 65+ adults, and the report read "Adults 65+ with asthma or COPD". **Fix:** start with no age and require a choice, or default added people to Adults (18–64). `screens/HealthConditionPage.jsx:59`.
- **Medium.** The form asks about health but never says where the answers go, so D38's privacy isn't visible. **Fix:** under "Who will be living here?", add "Your answers stay in this browser tab and are never stored."
- **Medium.** The call to action is below the fold. "Next step" sits at y = 939 at 1280×900. At 375, the first condition is at y = 834 and Next at y = 1625, after the 114 px header, the examples strip and a four-line h1. **Fix:** move the examples under the form, and use a one-sentence 28 px h1 on phones. `HomeView.jsx`.
- **Medium (a11y).** The form has no `fieldset` or `legend`, so Person 2's ten controls are named exactly like Person 1's. The multi-select boxes are drawn as circles (`border-radius: 50%`), so they look like radio buttons. **Fix:** wrap each person in a fieldset with a legend, and draw square boxes. `HealthConditionPage.css:162`.
- **Low.**
  - At 375, several touch targets are under 44 px: the age select (30 px), "Add another person" (30), the Other box (25) and the condition rows (34).
  - Next still goes ahead with an unanswered person.
  - The right panel (an orb, art, "Waiting for your answers...", "Step 1 of 2" printed twice) feels templated. Show real content instead: "Your report will start with: fine particles, NO₂, very hot days", from `conditions.json`.

## `/where`

- **Medium (L6 regression).** "SELECTED LOCATION" is hard-coded in capitals in `screens/LocationPage.jsx:144`. **Fix:** change it to "Selected place".
- **Low.**
  - The same instruction appears four times: in the h1 subtitle, the card subtitle, the helper text and the map caption. Keep the h1 subtitle.
  - At 375, the box is 204 px wide, so the placeholder reads "e.g. 80202 or Der" and a picked place shows as "98101, Seattle, W".
  - An empty band sits above a disabled "See the report" button that gives no reason. Put Search under the box on phones, and show the button only after a pick.
  - Coordinates use 4 decimals ("47.6107° N") for a 50 km square.
  - A map pick names a street, so the report's h1 becomes "Southwest Daisy Street". Use the town.
  - At 375, the map caption covers the bottom third of the map.
  - The first view includes Mexico.

## `/report`

- **High.** "Most important for you" leaves out the worst changes.
  - **Spokane (65+, asthma):** the cards are PM2.5, NO₂ (clearly better) and very hot days (no clear change). Smoke days rose from 15 to 34 and are clearly worse, but they aren't there.
  - **New York:** smoke days (4 → 24) and humid-heat days (5 → 14) are clearly worse but left out, while two "better" records take cards.
  - **The "Spokane smoke" example** answers "Is wildfire smoke changing the air?" with PM2.5.
  - **Cause:** `conditions.json` lists `smoke_days` and `humid_heat_days` for no condition and no age group, and `topCards` ranks a priority record that improved above a non-priority record that clearly got worse.
  - **Fix (team decision):** add those two keys to the asthma, heart, allergy, pregnancy, under-5 and 65+ priorities, and set the Spokane case's `focus` to `smoke_days` (`cases.js:27`).
- **High (new numbers for Next #9).** The year chart in an open row is 310×87 px at 375, with labels about 6 px tall, so it can't be read. At 1280 it is 1114×313 px with 19 px labels next to 13 px body text. **Fix:** cap it near 640×200 px on desktop, and draw it at its measured width with HTML labels on phones.
- **Medium.** "Change place" goes to `/` (the household form), not `/where`. **Fix:** `router.push('/where')` in `views/flow/ReportView.jsx:90`.
- **Medium.** The report invents a household. In a fresh tab it says "Who lives here: Adults 18–64" and puts "For your household" pills on the cards. Example reports also call the example's child "your household". `/compare` already gets this right ("These start from a general household. Tell us who lives here"). **Fix:** reuse that line. In an example, say "Example household: a child with asthma" and offer "See it for your household".
- **Medium (a11y).** The h1 and "What changed here" sit in a `<header>` outside `<main id="main">`. "Skip to content" jumps past the answer, and the page has two banner landmarks. **Fix:** open `<main>` before the hero (`ReportPage.jsx:54–106`).
- **Medium.** Level words appear without saying which limit they mean: "Caution" on very cold nights (no clear change), and "Under the limit" on muggy days and on Heat island. **Fix:** show a level only where `cutoff_source` names an official limit, and name that limit in a `Term` toggletip (`Verdict.jsx`, `reportView.js:20`).
- **Medium.** One record goes by several names.
  - New York's Ground theme lists "Neighborhood ground heat", "Heat island" and "Ground heat".
  - The not-available line says "Neighborhood surface heat", and "Summer ground heat (5 km)" for the row named "Ground heat".
  - "What happened" and the actions say "Fine particle pollution (PM2.5)".
  - **Fix:** use the row's `nameOf` everywhere (`presenters/report.js`).
- **Medium.** The row's answer sentences are 13 px and the "For your household" pill is 11 px, which breaks rule 7. That is small for 65+ readers. **Fix:** 16 px, as on the top cards (`report.css`).
- **Low.**
  - "0 → 1 days" and "1 → 1 nights" use plurals after 1.
  - Spokane has four "0 → 0, No change" rows. Merge them into one line: "Never happened here: …".
  - The report ends with nothing to do next. Add "Compare Spokane with other places".
  - After a failed year switch, "15 years" stays pressed and the URL says `years=15`, while the page still shows 2001–2025.
  - The year pills are 24 px tall and the Look closer links 28 px.
  - "Holds without any single year" is unclear. Say "still holds if we leave out any one year".
  - `ReportPage.jsx` ships a 234 KB fake `SAMPLE_REPORT` as a default prop that no caller uses. Delete it.

## `/compare`

- **Medium.** A fourth city silently drops the first (`MAX_COMPARE = 3`, `slice(-3)`, `CompareView.jsx:19,47`). I added Spokane, Seattle, Denver, New York and Boise; the tray kept "Denver, New York, Boise", and Spokane's button went back to "Add". **Fix:** at the cap, disable Add with "Up to 3 places: remove one first", and give each city in the tray a remove button.
- **Medium.** The page is 12,700 px long at 1280 and 17,400 px at 375. Each of the 51 cards is about 210 px tall and repeats "Smoke and fine particles: under your limit". The "True almost everywhere" finding sits at the very end. **Fix:** compact rows, fold every group after the first, and move that finding up.
- **Medium.** The trend-only topic is worded as a level. Cards and group titles say "under your limit" when the limit is "not clearly rising", and "Boise has more of all 3 things" means "Boise's is rising". **Fix:** say "rising" or "not clearly rising" (`presenters/compare.js` `verdict`).
- **Low.**
  - The chips say "Heat by day" and "Smoke and fine particles", while the scatter tabs say "Very hot days" and "Smoke days".
  - NO₂ is called "Traffic & industry pollution" here (from `thresholds.json`) but "Traffic pollution" on the report.
  - Compare says "No clear trend yet" where the report says "No clear change yet".
  - The side-by-side table shows "4.6 days" where the card shows 5.
  - "More heat at night" comes from 1.4 nights against 0.
  - The scatter key uses five marks across fill, size and fade, and hollow now means "misses one", not "unclear".
  - The h1 is 20 px at weight 500, against 40 px bold on the flow pages.

## `/learn`, `/about`, header and footer

- **Medium.** `/about` garbles a unit: "Soil wetness · 0, dry) to 1 (soaked". The regex `/ \((.+)\)$/` is greedy. **Fix:** `/ \(([^()]+)\)$/` in `AboutView.jsx:18`. Also, "Hottest day of the month" is followed by "hottest day of the year".
- **Medium.** `/about` defines only the state variables, not the household records (muggy, humid-heat, smoke, water storage, heat island). Its Data list leaves out NOAA smoke, GRACE, IMERG, MODIS surface heat and MERRA-2 haze, which the report uses.
- **Low.**
  - The two smoke cases on `/learn` open PM2.5.
  - "Start your own investigation" opens Wisconsin, not the household's place.
  - "Check a place" in the header is never marked current on `/where` or `/report` (`SiteHeader.jsx:17`).
  - The footer could carry the privacy line.

## Best things to keep

- The one-sentence answer, with chips that open the matching row.
- Honest captions: "since 2011", the "~50 km square" note, and "Not available here" with its reason.
- A failed year switch keeps the report on screen and words the failure plainly.
- The "Keep typing: a ZIP code has 5 digits" hint, and suggestions that can be chosen by keyboard.
- `/compare`'s "These start from a general household" line.
- Focus moves to the h1 when the report loads, and to the opened row after "See the details".
- No sideways scroll at 375.

## Top 8 fixes (impact over effort)

1. Add `smoke_days` and `humid_heat_days` to the household priorities, and point the Spokane case at smoke (a config change for the team to decide).
2. Send "Change place" to `/where` (one line).
3. Add the privacy line to the household form (one line).
4. Drop the "65 and older" default (a few lines).
5. Compare: stop silently dropping a city at the cap (a few lines).
6. Say "general household" or "example household" on the report when it isn't the visitor's own (a small presenter change).
7. Three one-liners: the `/about` regex, "SELECTED LOCATION", and "1 days".
8. Accessibility: put the report hero inside `<main>`, and give each person a fieldset and legend.

After these, the next fix is the report chart at phone width (High, but more effort; it is the same work as Next #9).

*Not checked:* screen readers, reduced-motion emulation and smooth scrolling. My tab was in the background, so `requestAnimationFrame` was paused. Desktop screenshots were scaled down by the pane, so desktop layout was judged from DOM measurements.
