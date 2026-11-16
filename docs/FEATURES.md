# Climatch features (for the slides)

**Climatch: Earth System Trend Detective.** Pick a place in the US and see what really changed there from 2001 to
2025 in NASA data, which changes are real and not chance, and what matters for the people who live there.

## The numbers

| | |
| --- | --- |
| Years of data | 25 (2001–2025) |
| Records in a report | Up to 20 per address (heat, heat index, cold, the frost-free season, rain, humidity, smoke, air pollution, fires, ground heat, water) |
| Datasets | 11 NASA and NOAA datasets in the app (sea temperature joins for the North America map), plus OpenStreetMap for places |
| Places | Any US address, ZIP or city; 50 states and DC as state averages; 51 cities side by side |
| Maps | About 2,800 NASA grid squares over the lower 48, animated year by year; North America with its seas (sea temperature, smoke, PM2.5, fires in Canada and Mexico) |
| Statistical tests | Mann-Kendall trend test with a Theil-Sen rate, a false-discovery correction across each report's records and each map's squares, a memory check, seasonal Kendall, years-needed estimate, single-year check |
| Tests in the code | About 480 automated tests (frontend, backend, data pipeline) |

## 1. A report for your household

- **Who lives here:** add each person with an age group and health conditions (asthma, heart disease, pregnancy…). It
  only changes which records come first, never the numbers. It stays in the browser tab: never in a link, a log or the
  database.
- **Where:** type an address, city or ZIP and pick from suggestions as you type, or click the map.
- **One-sentence answer:** "In 25 years, 4 things clearly got worse and 1 got better here."
- **Most important for you:** the top cards put what got worse first, then what matters for this household.
- **Every record in plain words:** a verdict (rising, falling, no clear trend yet), the early and recent averages, a
  yearly bar chart and a quality badge ("Model estimate · 50 km · 2001–2025").
- **Choose the years:** 10, 15, 20 or 25 years, or any start and end year.
- **Compare with another place** and **what this household can do** (with sources), plus what each dataset can't see.

## 2. Compare places

- **51 US cities** against the household's own limits ("fewer than 30 very hot days a year", "smoke not clearly
  rising"). Choose up to 5 topics.
- **Grouped, never ranked:** cities sit in groups by how many limits they meet. No score, no "best city".
- **Then → now bars on every city card**, on one shared scale, so cards compare at a glance.
- **Map and chart side by side:** pointing at a card lights its dot on the map and on the chart, and back.
- **All 51 cities on one chart:** today's level against how fast it changes. Drag, zoom with Ctrl + scroll or buttons,
  keyboard keys; a far-out city (Anchorage's water loss) is named at the edge instead of squashing the rest.
- **Side by side for up to 3 places:** a then → now arrow chart per topic, "4 of the last 5 years under your limit",
  and a table that can show only the rows that differ.
- **Starting place:** list each group by distance from where you live now.

## 3. Look closer: the detective steps

| Step | Page | What it does |
| --- | --- | --- |
| 1. Look | `/explore` | Every month on one chart with climate stripes. **Guess first** (up, down or flat) before the trend line appears |
| 2. Seasons | `/seasons` | Which seasons and months are changing, as a month heatmap (also a table, keyboard friendly) and a cycle chart |
| 3. Is it real? | `/test` | The trend test answers your guess: rate per decade with its range, corrected for the other records checked at the same place, a note when years that remember the year before make the evidence thinner, how many years a trend needs, and whether one disaster year carries it |
| 4. Spike or trend? | `/events` | The unusual months, matched with documented disasters (heat waves, wildfire smoke, floods) and their sources |
| 5. Where else? | `/map` | An animated map of the lower 48 (PM2.5, NO₂, fires, smoke days, haze) or North America (sea temperature, smoke days, PM2.5, fires), year by year, then where change is clear |
| 6. What moves together? | `/patterns` | Links between records with lead times (one record moving a few months before another), early-clue hit rates, signs of change, more extremes, hot-and-dry months, and **El Niño and La Niña winters** |

- Works for an address or a whole state; the place, record and years ride in the link, so any view can be shared.
- **Case files** (`/learn`): guided examples such as Phoenix nights, Houston heat and Spokane smoke.

## 4. Honest by design

- **Describes the past, never forecasts.** No medical advice, no advice to buy, sell or move.
- **"Clear" means a statistical test passed** (p < 0.05, with corrections when many things are tested at once);
  otherwise it says "no clear trend yet".
- **Says what it can't see:** each dataset's square size (10–300 km), years and known problems, with fixes such as
  PM2.5 from 2010 and medium and heavy smoke only.
- **New analysis:** El Niño and La Niña winters, 2002–2025 (8 El Niño and 12 La Niña winters). Texas and Florida
  show the known wet El Niño and dry La Niña winters clearly.

## 5. Built for everyone

- **Accessible:** keyboard paths through maps and charts, screen-reader text, reduced motion respected, 12 px minimum
  chart text, colour never the only cue.
- **Phones:** every page works at 375 px; compare switches between list, map and chart.
- **Fast under load:** data is compressed (the animated map's data drops from 737 KB to 99 KB), cached in the browser,
  retried when the server is busy, and every wait shows the page's shape instead of a blank screen.

## 6. Under the hood

- **Frontend:** Next.js 16, React 19, Leaflet maps, hand-drawn SVG charts.
- **Backend:** FastAPI with a versioned, typed API (`/api/v1`) and an optional Postgres cache.
- **Data pipeline:** Python (pandas, xarray, SciPy, pymannkendall) turning NASA files into reports and maps.

## Suggested slide order

1. The question: "Is it really getting hotter, smokier or drier where I live?"
2. A household report (one sentence, top cards)
3. Is it real? The guess, then the test
4. The animated US map
5. Compare places for a household (groups, bars, the 51-city chart)
6. What moves together, and El Niño and La Niña winters
7. Honest by design: data limits, no forecasts, privacy
8. The data: NASA POWER, MERRA-2, OMI, FIRMS, IMERG, MODIS, GRACE-FO, NOAA HMS
