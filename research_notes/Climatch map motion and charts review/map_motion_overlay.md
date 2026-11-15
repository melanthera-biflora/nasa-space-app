# Smoother years and a tighter fit for the US change map

Research notes, 15 November 2026, for `TimeMap` on /map (and `TrendMap`, which paints the same way). This builds on `research_notes/Map change over time/memo.md` and does not repeat its points.

**In short:** the "jumpy" look comes from the cross-fade, not the frame rate. Both frames fade at once, so the basemap shows through partway. Fade the new year in on top of the old one, keep blocks, and cover everything outside the lower 48 with a crisp vector mask built from the Census outline the backend already serves. The payload is already gzipped by Next.js.

## What exists now

- `TimeMap.jsx:49-65` paints every year with `paint()` into its own `L.imageOverlay` at opacity 0, one every 16 ms.
- `TimeMap.jsx:68-76` sets the old frame to 0 and the new one to `SHOWN` (0.92, line 14) at the same moment. `TimeMap.css:7-9` fades both over `--dur-4` (300 ms) with `--ease-out`. Halfway through, the stack's opacity drops from 0.92 to about 0.71, so the white base shows through 3.6 times more. That is the "breathing" between years.
- `TimeMap.jsx:78-86`: a `setTimeout` per year (`SPEEDS`, `presenters/timeMap.js:20`: 550, 1000 or 1600 ms). At Fast, the fade takes 55% of each step. `TimeMap.jsx:88-92` already stops playback when the tab is hidden.
- `fieldPaint.js:29-66`: 8 px per column; rows are placed by Web Mercator `y()` (line 35) and rounded to whole canvas pixels. The canvas is exported with `toDataURL()`. `TimeMap.css:6` sets `image-rendering: pixelated`.
- `trend_field.py:89-102` `us_mask` guesses the US from FIRMS fire points ("shortcut: no boundary file"). Against the Census outline, its 2,814 cells include 28 with no US land, 210 that are under half US land, and miss 31 cells that touch land.
- A boundary file exists now: `data_pipeline/config/us_states.json` (211 KB, Census `cb_2024_us_state_20m`, rounded to 0.01°, written by `tools/state_shapes.py`). The backend serves it as `GET /regions/{code}/outline` (`backend/services/regions.py:31-36`). The lower 48 plus DC is 49 entries and 11,065 points (165 KB, 40 KB gzipped). The Great Lakes, Chesapeake Bay and Long Island Sound fall outside it; the Great Salt Lake is inside.
- The basemap is drawn above the data and multiplied in (`lib/basemap.js:7-12`, pane z 450) over a white container (`Maps.css:3`).

**Measured on this machine** (Chrome 156, `devicePixelRatio` 1.25, NO₂ with 6,136 cells):
- Repainting every cell: 0.69 ms. Interpolating values and repainting: 0.82 ms.
- Cross-fading two ready canvases: 0.10 ms. `toDataURL`: 3.1 ms.
- Building a `Path2D` of the 49 outlines: 4.5 ms; clipping one draw: 0.4 ms.

None of this is the bottleneck.

**Mercator:** placing rows by Mercator is enough. `ImageOverlay._reset` (leaflet-src.js 9564-9575) stretches the image linearly between the projected corners, which keeps the Mercator rows in place. Rounding leaves rows at most half a canvas pixel out (about 3 km), or about 5 screen pixels at zoom 8. One caveat corrects memo item 11: a PNG with one pixel per cell and rows evenly spaced in latitude would put mid-latitude rows up to 1.19° (about 130 km) out at 37°N. Each row would have to be placed by Mercator.

**Payload:** raw JSON vs gzip: AOD 1,390 → 151 KB, NO₂ 1,297 → 207, PM2.5 1,149 → 144, smoke 468 → 46, fires 252 → 52. Through the Next.js proxy, PM2.5 already arrives gzipped at 145 KB: Next compresses by default. FastAPI has no compression (`backend/app.py:45-51`).

## Options compared

| Option | Pros | Cons | Effort |
|---|---|---|---|
| **Motion** | | | |
| New frame fades in on top; one opacity on a `frames` pane | No see-through dip; keeps the overlays already painted | Needs z-index bookkeeping | S |
| Fade length scaled to speed (Fast 150 ms), slow-in slow-out | At least 70% of each step shows only legend colours | — | S |
| One canvas overlay (`L.svgOverlay(canvas)`), cross-faded with `requestAnimationFrame` | No PNG step; can pause mid-fade | More code; same picture as row 1 | M |
| Interpolating values per cell between years | Cheap (0.8 ms) | Classed map: cells flip class at staggered times and show values never measured | M, **no** |
| Running 12-month means stepped monthly (as NASA SVS does) | Smooth, and every frame is real data | 12 times the frames; pipeline work | L, later |
| **Fit** | | | |
| Inverse white polygon (world minus the lower 48) in a pane between data and basemap | Vector, so sharp at any zoom and DPR; reuses the outline; no projection code | Fetches 40 KB once | S |
| Canvas `clip()` in `paint()` | 0.4 ms | Edge limited to the canvas (about 8 km), so jagged at zoom 6+ | M |
| CSS `clip-path`/`mask` on a pane | — | Must follow Leaflet's pan and zoom transforms; fragile | M, no |
| `us_mask` from the Census outline (cell touches land) | Fills the coast to the edge, then the mask trims it | Rebuild both map tools | S |
| **Smoothing** | | | |
| Keep blocks and say so | Honest at 50 km; shows noise and extremes | Looks coarse | 0 |
| Bilinear/bicubic (`imageSmoothingEnabled`) | Soft look | Mixes class colours into colours not on the legend; implies detail finer than 50 km | S, no |
| Isobands | Smooth bands | Needs a new library or pipeline work; fires per 1° cell are counts, not a surface | L, no |
| **Payload** | | | |
| Nothing (Next.js already gzips) | — | — | 0 |
| `GZipMiddleware` in FastAPI | One line; covers direct calls | No gain behind Next | S, optional |
| Class bytes, PNG frames, deltas | Smaller | Loses the readout's values; PNG needs Mercator rows | M–L, no |

## Recommended approach

**1. Dissolve without the dip** (`TimeMap.jsx`, `TimeMap.css`, `presenters/timeMap.js`).

```js
// init: one opacity for the stack, so a dissolve never shows the base through two half-faded frames
map.createPane('frames').style.opacity = SHOWN
// l.add: L.imageOverlay(img.url, img.bounds, { pane: 'frames', className: 'tl-frame', opacity: 0, alt: '', interactive: false })
// show effect
const image = l.add(i), old = l.current
image.setZIndex(++l.z).setOpacity(1)                 // the new year fades in on top (setZIndex, not bringToFront: a DOM move cancels the transition)
l.current = image
if (!old || old === image) return undefined
const t = setTimeout(() => old.setOpacity(0), fade)  // hidden once it is covered
return () => { clearTimeout(t); old.setOpacity(0) }
```

`SPEEDS` gains `fade` (Slow and Normal 300 = `--dur-4`, Fast 150 = `--dur-2`). `.tl-stage` gets `style={{ '--tl-fade': `${fade}ms` }}`, and the CSS becomes `transition: opacity var(--tl-fade) var(--ease-standard)`, still inside `prefers-reduced-motion: no-preference`. Keep the `setTimeout` clock: transitions are CSS-driven, so `requestAnimationFrame` is only needed if painting moves to a canvas. The year label and slider stay on whole years.

**2. Clip to the lower 48.**
- In `backend/services/regions.py` `outline()`, accept `L48`: every state except AK, HI and PR, with their rings joined and a combined bbox. It uses the same `RegionOutline` model, so the contract does not change. Add one test.
- In `lib/basemap.js`, add `addLandMask(map, rings)`:

```js
const world = [[85, -360], [85, 360], [-85, 360], [-85, -360]]
L.polygon([world, ...rings.map((r) => r.map(([lon, lat]) => [lat, lon]))],
  { pane: 'mask', stroke: false, fillColor: '#fff', fillOpacity: 1, smoothFactor: 0, interactive: false })
```

  The `mask` pane sits at z 420, between the data and the basemap, with no pointer events. Leaflet's default `evenodd` fill makes each state a hole. `smoothFactor: 0` keeps shared state borders identical, so no white hairlines appear. The white must match `Maps.css:3`.
- `TimeMap` and `TrendMap` call `fetchStateOutline('L48')` the way `WhereMap.jsx:53-57` does: on failure, the map works as it does today.
- Move TimeMap's marks to `markerPane`, as TrendMap does.

**3. Mask cells by the outline.** Change `us_mask` in `trend_field.py` to keep cells where any of 5×5 sample points falls inside the lower-48 rings (`sources.power_region.inside`): 2,817 cells. Rerun `tools.trend_field` and `tools.map_frames`. The trend map's false-discovery check will shift slightly.

**4. Keep blocks.** Leave payload alone. Add `GZipMiddleware` only if the backend is ever exposed without Next.

## What to tell the viewer

Under the map: "Each square is one NASA grid box, about 50 km across (fires: 1°, about 100 km), cut at the coast and border. A square is that box's average; finer detail isn't in the data." While playing: "The map changes once a year (or once per 3-year average); the short fade between years is not data."

## Sources

- Battersby & Goldsberry 2010, transitions in dynamic thematic maps. For classed maps, a tween's in-between fills are "undefined according to the legend": https://cartographicperspectives.org/index.php/journal/article/view/cp65-battersby-goldsberry
- Heer & Robertson 2007. Slow-in slow-out; "as long as needed, but no longer"; about 1 s, and less for small movements: https://idl.uw.edu/papers/animated-transitions
- NASA SVS 5450, 900 frames of running 24-month averages: https://svs.gsfc.nasa.gov/5450/
- Eric Firing on `pcolormesh` (blocks, keeps noise and extremes) vs `contourf` (interpolates): https://mail.python.org/pipermail/matplotlib-users/2017-January/000717.html
- Chrome does not call `requestAnimationFrame` in background tabs: https://developer.chrome.com/blog/background_tabs and https://developer.chrome.com/blog/timer-throttling-in-chrome-88
- MDN: https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame · https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API · https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/imageSmoothingEnabled · https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/clip · https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio · https://developer.mozilla.org/en-US/docs/Web/CSS/image-rendering
- Leaflet 1.9 (ImageOverlay, SVGOverlay, Polygon, panes): https://leafletjs.com/reference.html
- Census cartographic boundary files (public domain): https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html · nation 1:20M: https://catalog.data.gov/dataset/2024-cartographic-boundary-file-shp-united-states-1-20000000
- Natural Earth (public domain alternative): https://www.naturalearthdata.com/about/terms-of-use/
- FastAPI `GZipMiddleware`: https://fastapi.tiangolo.com/advanced/middleware/#gzipmiddleware · Next.js `compress`: https://nextjs.org/docs/app/api-reference/config/next-config-js/compress
