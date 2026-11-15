# Showing trends on a map: design note for "Where else is it changing?"

Research note, 14 Nov 2026. Scope: the US trend map (PM2.5, NO2, fires, weather counts). It builds on what the pipeline already makes:
`data_pipeline/tools/trend_field.py` writes `demo_reports/trend_fields/<factor>.json` with, for each grid cell, slope per decade, Mann-Kendall p,
then/now 5-year means, `sig` (p < 0.05), `fdr` (passes Benjamini-Hochberg at 0.10), symmetric `breaks` and area-weighted shares.
Built: `pm25` (2,814 cells), `no2` (13,446) and `fires` (867 one-degree cells). Status: recommendation 1 is built (D13); 2–4 are open (T26).

## Ranked recommendation

1. **Primary view: gridded trend field.** Each grid cell is coloured by its rate per decade on a binned, zero-centred diverging palette (4 rising + 4 falling classes).
   Only cells that pass the false-discovery check get colour. Every other cell is pale grey with a fine diagonal hatch ("no clear trend").
   Add a "you are here" ring plus an outline of the user's own cell, a hover or tap readout, and a click that loads that cell's yearly values into a side chart.
   This is the IPCC AR6 rule for observed trends (colour where the trend is clear, mark where it isn't), simplified the way VSUPs simplify it.
2. **Secondary view: Then vs Now.** Show the first and last 5-year means for each cell on one shared sequential scale.
   Use two small maps side by side on desktop and a "Change | 2001–05 | 2021–25" toggle on mobile.
   It is the plain-English proof behind the slope map, and NASA SVS used the same pattern for OMI NO2 (2005 vs 2011).
   The `then`/`now` arrays are already in the JSON.
3. **Keep the city circles only for point-only factors** (hot days, warm nights): add ▲/▼ glyphs so direction is not colour-only, and never interpolate them into a surface.
4. **Later, if time allows:** a swipe compare, a "show only clear trends" filter (it comes free with the legend), and a sparkline in the readout.
5. **Skip for this demo:** animated year slider, value-by-alpha, hexbins, per-cell arrows, sparklines drawn on the map, full multi-level VSUP. Reasons are in the table below.

**A 3-minute demo path:** the map opens zoomed to the user's region with their cell outlined ("your area = one 55 × 53 km box").
Hover it to read then → now and the rate. Zoom out: "red = rising, blue = falling, hatched = can't tell". Flip to Then/Now.
Click a western cell and its yearly chart appears. End on one line: "colour only where the trend survives a check across all 2,814 boxes".

## 1. Encodings compared

| Encoding | Works when | Misleads when | Leaflet 1.9 effort |
| --- | --- | --- | --- |
| **Gridded slope raster, diverging palette** | Data is already gridded (PM2.5, NO2): it shows regional coherence at a glance | Every cell is coloured regardless of significance; it is smoothed to look finer than the grid | 2–3 h as one canvas `ImageOverlay` (section 6) |
| **Significance overlay (hatch/stipple)** | It marks the *unclear* cells, leaving the clear ones as clean colour (IPCC AR6) | Dots mark the *significant* cells and naive p < 0.05 is used per cell (Wilks 2016) | 15 min: a canvas pattern fill |
| **VSUP / bivariate trend + certainty** | Uncertainty is shown as fading toward neutral: viewers weigh it more than on a 2-D bivariate grid (Correll et al. 2018) | A full 2-D legend is shown to non-experts; it is hard to read | 2-level version: free. Full VSUP: needs d3 (`uwdata/vsup`), skip |
| **Value-by-alpha** | A second variable (e.g. population) should mute empty areas (Roth et al. 2010) | It sits on a light basemap: transparency reads as "lighter = smaller change" on a diverging ramp | Easy, but wrong fit here |
| **Hexbin / aggregated grid** | The data are scattered points (raw fire detections) | The data are already on a grid: re-binning resamples and blurs it | Fires are already counted per 1° cell, so skip |
| **Arrow / glyph map** | Few locations, as a shape cue (▲▼) next to colour | Thousands of cells: a 0.5° cell is about 6 px wide at zoom 4 | ▲▼ on city markers only |
| **Small multiples (then/now, by decade)** | Comparing states: static side-by-side beats animation for accuracy (Robertson et al. 2008) | The panels use different colour scales | 1 h: two maps or one toggle |
| **Sparkline glyphs on the map** | A handful of places at high zoom | 51 cities at US scale: glyphs overlap | Put the sparkline in the readout instead |
| **Animated time slider** | Engaging "attract mode" | Analysis: animation was the slowest and least accurate in Robertson et al. 2008, and single years are noisy | Needs yearly data per cell, 2 h. Skip |
| **Swipe then/now** | Spotting where change happened on one map | Users compare across the seam with different scales | 1–2 h, no plugin (section 6) |
| **City circles (today)** | Point-only factors, labelled anchors | They are the only view: 51 dots hide the regional pattern | Exists |

**What the IPCC marks mean (AR6 WGI, Cross-Chapter Box Atlas.1).**
- *Approach A, observed trends:* colour with no overlay where the trend is significant, and a cross where it is not. The test is typically two-sided at the 0.1 level.
- *Approach B, simple, for projections:* diagonal hatching where fewer than 80% of models agree on the sign.
- *Approach C, advanced:* no overlay means a robust change (66% of models show a signal and 80% agree on sign). Reverse diagonal hatching means no change or no robust signal. Crossed lines mean conflicting signals.

The Atlas says hatching was chosen because stippling is commonly read as "significant". Hatching obscures the problem areas and leaves the robust colour clean.
AR5 SPM Fig. SPM.8 used both marks with opposite meanings (stippling = robust, hatching = small change), so always say in the legend what the mark means.
**Our rule:** hatch the unclear cells. Never stipple the significant ones. Use hatching rather than crosses, because crosses turn into noise on 3–6 px cells.

## 2. Primary vs secondary for non-experts

The slope field answers "where is it changing?" in one look, and the readout answers "how much, here?". Then/Now answers "is that real?" without statistics.
Small multiples beat animation for comparison (Robertson et al. 2008). The NYT's "How Much Hotter Is Your Hometown" (2018) shows the pattern that works: personal place first, then the wider context.
The Washington Post's "2°C: Beyond the Limit" (2019) did the same at county level, with a red-to-blue diverging map of change and a fixed scale.

## 3. Colour

- **Palette:** ColorBrewer **RdBu**, 8 classes. ColorBrewer flags it as colour-blind safe. IPCC AR6's `temp_div` is the same red–blue ramp (IPCC-WG1/colormaps).
  - Rising: `#fddbc7 #f4a582 #d6604d #b2182b`. Falling: `#d1e5f0 #92c5de #4393c3 #2166ac`.
  - Put them in `index.css` as tokens (frontend rule 6). They match the app's existing red = rising, blue = falling.
- **Avoid red = danger for pollutants?** IPCC AR6 has a chemistry diverging map, `chem_div`: teal (decrease) to purple (increase), near-white centre. Use it if the team wants neutral hues.
  Either way, never use green (it reads "good"), rainbow or red–green (Crameri et al. 2020). Kelly's 22 colours are for categories, not magnitudes.
  Other perceptually uniform options are cmocean `balance` (Thyng et al. 2016), Crameri `vik` and Paul Tol's `sunset`/`BuRd`.
- **Centre and clip:** zero is a class edge, with the same number of classes on each side.
  - Clip symmetrically at a "nice" number near the 95th percentile of |slope|. `nice_breaks` already does this, giving top = 5 µg/m³/decade for PM2.5.
  - Use the edges 0, ¼, ½, 1 × top, with an open-ended "≥ top" class. Label the classes, e.g. "▲ 2.5–5", "▲ 5 or more".
  - Fix the scale per variable. Never re-stretch it to the current view or zoom.
- **Binned, not continuous:** 4 classes per side. Classed scales are easier to read as ranges and to use as a legend filter. Unclassed shows more nuance and suits experts (Datawrapper, Muth).
- **Three "nothing" states must look different:**
  - Clear trend: colour.
  - No clear trend: light grey `#e4e4e4` with a 1 px hatch.
  - No data: transparent. White means no data; the IPCC and Earth Observatory use a light neutral midpoint.
- **Then/Now panels:** use one single-hue sequential ramp shared by both panels (e.g. ColorBrewer Purples or IPCC `chem_seq`), never the red/blue ramp, so a level is never read as a change.
- **Words:** say "Rising / Falling / No clear trend" plus units per decade and ▲/▼. The map never says better or worse; the card already handles `higher_is_worse`.
- **Check:** Chrome DevTools › Rendering › "Emulate vision deficiencies" on the finished map (no new tool).

## 4. Interaction and UX

- **You are here:** an ink ring at the address plus a 2 px outline of its grid cell, with the caption "Your area: one 55 × 53 km grid box". Open at zoom 5–6 on that cell, with a "Show all US" button.
- **Readout panel** (beside the map, not a floating tooltip), filled on hover and on tap:
  - nearest city and the box's coordinates
  - "2001–05 average → 2021–25 average, in µg/m³"
  - "▼ rate per decade · p · clear after the US-wide check" (or "not clear")
  - the source line
  - A single reusable `L.rectangle` highlights the hovered cell.
- **Click a cell:** it becomes the selected cell, and its yearly values and the then/now bars draw in the side chart. Add a button "Open the full report for this place" that reuses the existing report flow with the cell centre.
- **Legend = filter:** 9 buttons (`aria-pressed`), one per class plus "No clear trend". Each shows a small bar of its area share.
  Click to show only that class; add a "Show only clear trends" switch. Counting cells per class is fine; fitting statistics in the browser is not (frontend rule 4).
- **Layer and opacity:** a "Change | Then | Now" segmented control and an opacity slider (`<input type=range>`, default 80%).
- **Basemap:** calm and unlabelled under the field; state lines and about 12 city labels *above* it, in a custom pane with `pointer-events: none` (options in section 6).
- **Limit zoom:** `maxBounds` = lower 48 plus a margin, `minZoom` 3, `maxZoom` 8 (a 0.5° cell is about 90 px there). Deeper zoom implies street-level precision the data doesn't have.
- **Keyboard and screen readers:**
  - Keep Leaflet's default keyboard support (arrows pan, +/- zoom).
  - (Fixed in D13.) The old `TrendMap` put `role="img"` on an interactive Leaflet container, which hides its controls from assistive tech. Use `role="region"` plus `aria-label`, and keep the summary sentence in the `<figcaption>`.
  - Give the overlay an `alt` (the summary sentence).
  - Add "Fastest rising / falling areas" buttons that select a cell and pan to it, and a "Show as table" disclosure with the 51 cities as a real `<table>`.
  - Announce *selection* in an `aria-live="polite"` region, never hover (it would flood the screen reader).
  - Relevant WCAG 2.2 criteria: 1.1.1, 1.4.1, 1.4.11, 2.1.1, 2.5.8 (24 px targets).
- **Touch:**
  - Tap selects; nothing needs hover.
  - To avoid trapping page scroll, set `dragging: !L.Browser.mobile` and keep pinch zoom plus the buttons.
  - Use `setView` instead of `flyTo` under `prefers-reduced-motion`.

## 5. Honesty rules

1. **Multiple testing.** With 2,814 PM2.5 cells tested at 0.05, about 140 would come out "significant" by chance even with no trend anywhere.
   - Colour only cells that pass Benjamini-Hochberg at α_FDR = 0.10. Wilks (2016): "choosing α_FDR = 2α_global" gives about the right global level for spatially correlated grids. The pipeline already does this (`fdr`).
   - Current PM2.5 numbers: rising 28.3% of area at p < 0.05 → 27.2% after FDR; falling 10.0% → 9.7%. The pattern survives, which is a good demo line.
   - **Fix the domain (lower 48) in advance.** Never recompute FDR for the visible area or one state: shrinking the domain can raise the threshold (Schutte et al. 2026, preprint).
   - If few cells pass, say "no clear US-wide pattern" instead of pointing at the scattered survivors.
2. **Neighbouring cells are not independent.** A red blob is one finding, not 500 confirmations, and MERRA-2 is a smooth model field. Quote area shares (cos-latitude weighted, as the pipeline does), not cell counts.
3. **Serial autocorrelation.** Yearly means reduce it but don't remove it, and positive lag-1 autocorrelation inflates Mann-Kendall significance (Hamed & Rao 1998; Yue et al. 2002).
   Check a few cells with `pymannkendall.hamed_rao_modification_test` (already installed) and report whether any flip.
4. **One estimator, one name.** The pipeline colours by the OLS slope but tests with Mann-Kendall. In noisy cells the two can disagree in sign.
   Either mark disagreeing cells "not clear", or switch the field to Sen's slope (`pymannkendall` returns it as `.slope`). Label it with the estimator actually used (the brief says "Sen's slope", the code says OLS).
5. **Grid size is the real resolution.**
   - PM2.5 cells are 55 × 53 km at 40°N (55 × 46 km at 49°N). NO2 cells are 28 × 21 km.
   - Draw cells as hard-edged blocks (`image-rendering: pixelated`): no blur, no bilinear smoothing.
   - Cap zoom at 8 and outline the box under the pointer.
   - Never turn the 51 city points into a heat map or interpolated surface.
6. **Instruments and products change.**
   - MERRA-2 PM2.5 is a reanalysis (model plus assimilated satellite AOD), not a measurement. It has no nitrate, and changes in the observing system can shift analysed aerosol (Randles et al. 2017).
   - OMI has the "row anomaly" since June 2007: flagged rows are dropped, so sampling changes over the record.
   - MODIS orbits drift after about 2020 (the team's `fire_check` found no US-wide step).
   - Put the source and years on each map. The periods differ (PM2.5 2001–25, NO2 2005–25, fires 2003–25), so never compare rates across layers by colour.
7. **Web Mercator distorts area.** A cell at 49°N is drawn about 1.9× the area of one at 25°N, so northern changes look bigger. Put area shares in the text.
   The overlay must also be warped (section 6); otherwise rows land up to 1.1° (~127 km) off.
8. **Then/Now uses 5-year means on one shared scale.** One extreme year (e.g. a 2020–21 smoke season) can dominate a window, and the click-to-chart view shows it.

## 6. Implementation in Leaflet 1.9 (no new dependencies)

| Approach | ~3k cells (PM2.5) | ~10–11k cells (NO2) | Hover |
| --- | --- | --- | --- |
| `L.rectangle` per cell, SVG (default) | Usable; pan/zoom gets heavy | Sluggish: 10k DOM paths | Per element |
| `L.rectangle` + `L.canvas()` | OK | Draw OK, but hover lags: Leaflet's canvas `_handleMouseHover` loops over every layer on each mousemove | O(n) per move |
| GeoJSON rectangles | Same as above, bigger payload | Same | Same |
| **One canvas → `L.imageOverlay`** | **1 element** | **1 element** | **O(1) index math** |

Leaflet 1.9.4's `ImageOverlay` takes a URL or an `<img>`, plus `alt`, `className`, `opacity` and `interactive`.
An image is stretched *linearly* in Mercator y, so place each row at its Mercator position when painting:

```js
const merc = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))
// f = trend_fields/<factor>.json; arrays are row-major: k = i * lons.length + j, lats ascending
function fieldOverlay(f, colorFor, S = 6) {
  const { lats, lons, dlat, dlon } = f.grid
  const s = lats[0] - dlat / 2, n = lats.at(-1) + dlat / 2, w = lons[0] - dlon / 2, e = lons.at(-1) + dlon / 2
  const W = lons.length * S, H = Math.round((W * (merc(n) - merc(s))) / (((e - w) * Math.PI) / 180))
  const y = (lat) => Math.round(((merc(n) - merc(lat)) / (merc(n) - merc(s))) * H)
  const c = Object.assign(document.createElement('canvas'), { width: W, height: H }), ctx = c.getContext('2d')
  const tile = Object.assign(document.createElement('canvas'), { width: 6, height: 6 }), t = tile.getContext('2d')
  t.strokeStyle = '#9a9a9a'; t.beginPath(); t.moveTo(0, 6); t.lineTo(6, 0); t.stroke()
  const hatch = ctx.createPattern(tile, 'repeat')
  lats.forEach((lat, i) => {
    const y0 = y(lat + dlat / 2), h = y(lat - dlat / 2) - y0
    lons.forEach((_, j) => {
      const k = i * lons.length + j, v = f.slope[k]
      if (v == null) return                                   // no data stays transparent
      ctx.fillStyle = f.fdr[k] ? colorFor(v, f.breaks) : '#e4e4e4'
      ctx.fillRect(j * S, y0, S, h)
      if (!f.fdr[k]) { ctx.fillStyle = hatch; ctx.fillRect(j * S, y0, S, h) }
    })
  })
  return L.imageOverlay(c.toDataURL(), [[s, w], [n, e]], { opacity: 0.8, className: 'trend-field', alt: f.summaryText })
}
// CSS: .trend-field { image-rendering: pixelated; }
// Hover/click: i = Math.round((lat - lats[0]) / dlat), j = Math.round((lng - lons[0]) / dlon); bounds-check, then k = i * lons.length + j
```

- **Legend filter:** redraw with the hidden classes skipped. It costs milliseconds and needs only a `setUrl` on the same overlay.
- **Crisp hatch at every zoom (upgrade):** a small custom `L.Layer` that repaints a screen-space canvas on `moveend`/`zoomend` using `map.latLngToContainerPoint`. About 40 lines; it also removes the Mercator maths.
- **Swipe:** put Then and Now overlays in two panes and set `clip-path: inset(0 0 0 X px)` on the top pane from a range input, about 20 lines. (`leaflet-side-by-side` targets tile layers.)
- **Linked chart data:** add a per-cell `annual` array (1 decimal) to the field JSON: about 70k numbers for PM2.5, under 1 MB gzipped for NO2.
  Draw yearly dots plus the then/now bars; no fitted line in the browser.
- **Basemap options** (checked Nov 2026):

| Option | Key | Terms in short | Fit |
| --- | --- | --- | --- |
| **No tiles: US state outlines** (Census cartographic boundary or Natural Earth, public domain) via `L.geoJSON` in a top pane | None | Public domain | **Recommended**: calmest, no false precision, works on bad venue Wi-Fi |
| OSM standard tiles (today), muted with `.leaflet-tile-pane { filter: grayscale(1) opacity(.55) }` | None | Visible attribution, valid Referer, no prefetch or offline use; can be blocked without notice | Fallback |
| CARTO Positron `light_nolabels` + `light_only_labels`, `https://{s}.basemaps.cartocdn.com/{style}/{z}/{x}/{y}{r}.png?key=…` | **Required since 2026** (keyless requests may be watermarked) | Free: 5M tiles/month non-commercial, 1M commercial. Credit OSM and CARTO. Terms updated 29 Sep 2026 | The key would sit in a public `VITE_` variable, which the frontend's rules forbid. Ask the team |
| Stadia `alidade_smooth`, `https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png` | None on localhost; deployed sites use domain auth (no key in code) | Free plan: 200k credits/month, **non-commercial only**. Credit Stadia, OpenMapTiles and OSM | OK for the demo, but no unlabelled variant |

**Effort:** overlay, legend filter and readout 3–4 h; Then/Now toggle 1 h; per-cell `annual` in the pipeline 30 min; accessibility (region, table, live region) 1 h; swipe 1–2 h, optional.

## Sources

- IPCC AR6 WGI Atlas, Cross-Chapter Box Atlas.1 (hatching, crosses, thresholds): https://www.ipcc.ch/report/ar6/wg1/chapter/atlas/
- IPCC AR6 WGI Fig. 10.14 caption (robust / conflicting / no-robust categories): https://www.ipcc.ch/report/ar6/wg1/figures/chapter-10/figure-10-14
- IPCC AR5 WGI SPM (Fig. SPM.8 stippling vs hatching): https://www.ipcc.ch/report/ar5/wg1/summary-for-policymakers/
- IPCC AR6 WGI Visual Style Guide (2022): https://www.ipcc.ch/site/assets/uploads/2022/09/IPCC_AR6_WGI_VisualStyleGuide_2022.pdf
- IPCC-WG1 colour maps (`temp_div`, `chem_div`, `chem_seq`): https://github.com/IPCC-WG1/colormaps
- Wilks 2016, "The stippling shows statistically significant grid points", BAMS 97(12): https://doi.org/10.1175/BAMS-D-15-00267.1 (author preprint: https://ams.confex.com/ams/96Annual/webprogram/Manuscript/Paper276937/FDRpaper2cols.pdf)
- Benjamini & Hochberg 1995, JRSS-B: https://doi.org/10.1111/j.2517-6161.1995.tb02031.x
- Ventura, Paciorek & Risbey 2004, FDR for climate fields, J. Climate: https://www.stat.berkeley.edu/~paciorek/files/jclim/vent.etal.2004.pdf
- Schutte et al. 2026, (Mis)uses of FDR correction for geospatial data, EGUsphere preprint: https://egusphere.copernicus.org/preprints/2026/egusphere-2026-2203/
- Hamed & Rao 1998, modified MK test, J. Hydrology: https://doi.org/10.1016/S0022-1694(97)00125-X; Yue et al. 2002, Hydrol. Processes: https://doi.org/10.1002/hyp.1095; pyMannKendall: https://github.com/mmhs013/pyMannKendall
- Correll, Moritz & Heer 2018, Value-Suppressing Uncertainty Palettes, CHI: https://idl.cs.washington.edu/papers/uncertainty-palettes/ (code: https://github.com/uwdata/vsup)
- MacEachren et al. 2012, Visual semiotics and uncertainty visualization, IEEE TVCG: https://doi.org/10.1109/TVCG.2012.279
- Roth, Woodruff & Johnson 2010, Value-by-alpha maps, Cartographic J.: https://doi.org/10.1179/000870410X12658023467367
- Robertson et al. 2008, Effectiveness of animation in trend visualization, IEEE TVCG: https://faculty.cc.gatech.edu/~stasko/papers/infovis08-anim.pdf
- Harrower & Brewer 2003, ColorBrewer.org: https://doi.org/10.1179/000870403235002042 and https://colorbrewer2.org
- Thyng et al. 2016, cmocean, Oceanography: https://doi.org/10.5670/oceanog.2016.66
- Crameri, Shephard & Heron 2020, The misuse of colour in science communication, Nat. Commun.: https://doi.org/10.1038/s41467-020-19160-7
- Paul Tol, colour schemes: https://personal.sron.nl/~pault/
- NASA Earth Observatory (R. Simmon), Subtleties of Color part 3: https://science.nasa.gov/blogs/earth-matters/2013/08/12/subtleties-of-color-part-3-of-6/
- NASA SVS 11572, NO2 reduction across the US (then/now pair): https://svs.gsfc.nasa.gov/11572/
- Datawrapper (L. C. Muth), classed vs unclassed colour scales: https://www.datawrapper.de/blog/classed-vs-unclassed-color-scales
- NYT 2018, How much hotter is your hometown: https://www.nytimes.com/interactive/2018/08/30/climate/how-much-hotter-is-your-hometown.html
- Washington Post 2019, 2°C: Beyond the limit: https://www.washingtonpost.com/graphics/2019/national/climate-environment/climate-change-america/ (data: https://github.com/washingtonpost/data-2C-beyond-the-limit-usa)
- Randles et al. 2017, MERRA-2 aerosol reanalysis, J. Climate: https://pmc.ncbi.nlm.nih.gov/articles/PMC5859955/
- OMI row anomaly (KNMI TEMIS): https://www.temis.nl/tropomi/no2scd/omi_rowanomaly.php
- CARTO basemap terms and styles: https://carto.com/legal/basemap-terms/ and https://github.com/CartoDB/basemap-styles
- OSM tile usage policy: https://operations.osmfoundation.org/policies/tiles/
- Stadia Maps auth and pricing: https://docs.stadiamaps.com/authentication/ and https://stadiamaps.com/pricing/
- Leaflet 1.9.4 reference and accessibility guide: https://leafletjs.com/reference-1.9.4.html and https://leafletjs.com/examples/accessibility/
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- US Census cartographic boundary files: https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html; Natural Earth terms: https://www.naturalearthdata.com/about/terms-of-use/
