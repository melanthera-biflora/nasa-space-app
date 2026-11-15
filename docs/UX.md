# UI and UX rules

Every screen answers one question in plain words and says how sure we are. The audience is high-school and college students and the curious public: the finding comes first, the numbers second and the method third.

## Principles

1. **One question per screen:** Who lives here? Where? (Loading.) What's changing here, and is it real?
2. **Words, then numbers, then method.** The headline sentence is first. The rate and CI follow. "How we tested this" opens on request (card Details).
3. **Honest by default.** Show the dataset, grid size and period. Label sample data "illustrative". A missing card says why.
4. **No dead ends.** Every error or empty state offers a next step: try again, choose another place, or try a demo city.
5. **Colour means direction, not good or bad.** Words carry the judgement; colour never does it alone.

## Layout

- One column on phones. No horizontal scroll at 375 px. Touch targets at least 44 px.
- The report reads top to bottom: "What's changing here" headline → household profile → cards → trend chart → what people do about it.
- Each page keeps its own CSS file; reuse the colours and spacing already in that file rather than adding new ones.
- **Detective pages (D29):**
  - **Top bar:** the site's main navigation, sticky from 1024 px.
  - **Side menu, left, 312 px:** first the numbered steps (the current one shows what it does), then the settings panel (state or address, variable with a "?" for its definition, years). It scrolls on its own and should fit a 1440×900 window without scrolling.
  - **The page:** up to 1080 px wide.
  - **Scrolling (D30):**
    - The side menu runs the full height and can fold to a rail of step numbers.
    - The open step lists the page's sections and marks the one in view; jumps land below the sticky bars and move focus there.
    - A thin bar on the top bar shows how far down the page you are.
    - Give every new section's `h2` an id (`ChartFrame` does it for charts), or it won't be listed.
  - **Below 1024 px:** the side menu is a drawer from the left (a native popover: Escape or a tap outside closes it, and picking a step closes it). A strip under the top bar says what you're looking at and which step you're on, and opens the drawer.

## Charts

- **One y axis with units, years on the x axis.** Only horizontal gridlines.
- **Marks:** yearly values as a thin line; the trend line and its 95% band; the first and last 5-year averages as short bars with their values written on them.
- **Above every chart:** the significance badge ("Significant" or "Not significant yet"), the rate per decade with its 95% CI, and the Mann-Kendall p-value.
- **Under every chart:** dataset · grid size · period, and the cutoff line's source when the card has a level.
- **Never draw beyond the last year of data.** No forecast lines.
- **Text alternative:** a one-sentence summary (from → to, rate, p-value, verdict).

## Cards

In this order:

1. The factor name and today's value with its unit.
2. The trend: arrow and word ("Rising", "Falling", "No clear trend yet"), never colour alone.
3. The rate per decade with its 95% CI, and "Significant" or "Not significant yet" with p written as "p = 0.004" or "p < 0.001".
4. Then vs now: "2001–2005: 77 nights → 2021–2025: 93 nights".
5. The health sentence; Details adds the definition, the `caveat` ("What the data can't see") and the dataset and grid size.
6. Trend-only cards say "Trend only (no US health limit)" instead of a level.
7. A card that can't be shown is still named under the cards, with the reason ("not precomputed for this place", "not enough years of data").

## Numbers

- Round for people: temperatures and rates to 1 decimal, counts to whole numbers, p-values to 3 decimals or "< 0.001".
- Always show units, and "per decade" on rates. US readers also get °F next to °C where a cutoff is named (95 °F, 75 °F, 10 °F).
- Periods as "2001–2025" (en dash).

## Words

- Sentence case. No "please", no "successfully", no "!".
- Plain words first: "rising" before "positive trend"; "seasons removed" before "deseasonalized". Define "significant" the first time it appears.
- Errors say what happened, then what to do: "NASA POWER didn't answer. Try again in a minute, or pick a demo city."
- Buttons start with a verb: "Search another place", "Try again".
- No medical advice and no forecasts. Prefer explaining over telling people what to buy or where to live.

## States

| State | Rule |
| --- | --- |
| Loading | Status text in an `aria-live="polite"` region; no layout jump when data arrives |
| Error | The plain sentence plus a way forward; keep the user's household and place |
| Not available | Say why ("not precomputed for this place", "needs more years of data") |
| Sample | An "illustrative numbers" label |

## Motion

- **Animated maps (D36):** open paused on the latest year, never autoplay; one colour scale for every frame; a slider and step buttons reach every year without playing; playing stops on a hidden tab; the live region speaks on pause, step or slider moves, not every frame; frames cross-fade only under `prefers-reduced-motion: no-preference`. A note under the map says moving colours aren't a tested trend and links to the trend map.

- Short ease-out transitions (tokens `--ease-out`, `--dur-*`); no counting-up numbers. One small pop is allowed on the headline number, a ticked checkbox and the notable-year markers (D14).
- Entrances and ambient loops (float, drift, sway, draw, reveal, spinners) run only under `prefers-reduced-motion: no-preference`, so reduced motion shows the end state. With reduced motion the analyzing screen runs 3 seconds instead of 8: its steps are read, not watched.

## Accessibility checklist

- Tab order follows the flow; a visible focus ring on everything that can be focused. "Skip to content" is the first stop on every page and jumps to `#main`.
- A chart with a `table` shows Chart and Table tabs (the kit's Tabs: arrow keys, one tab stop); the table scrolls under a sticky header.
- Each chart that reads values is one tab stop: arrows, Page Up/Down, Home and End (`chartIndex` in `lib/roving.js`), with a visible and spoken readout. Its frame is a `group`, not an `img`, so its parts stay reachable.
- Every input has a label; icon-only buttons have an `aria-label`.
- The map has a keyboard alternative: the search box.
- The page works at 200% zoom without losing content.

## Before calling UI work done

- [ ] Desktop and 375 px checked, no horizontal scroll
- [ ] Whole flow done by keyboard only
- [ ] Loading, error and not-available states each triggered once
- [ ] No console errors or warnings
- [ ] Every number traced to the report JSON; units, dataset and caveat shown
- [ ] Screenshot in the PR
