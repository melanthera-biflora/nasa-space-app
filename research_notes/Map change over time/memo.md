# Showing change over time on the Climatch map

Research memo, November 2026, for the /map page: yearly ~50 km grids of PM2.5, NO2, smoke days, haze and fire detections.

**In short:** animation catches the eye but people read change from it poorly. Let people start, stop and step it, keep colours fixed, show the year and a national line, and leave "is it really changing?" to the existing static trend map.

## What the research says

- In a trend-display study, animation was the least effective form for analysis: static views were faster and small multiples more accurate, though people found animation more fun. The authors suggest analysing with static views and presenting with animation ([Robertson et al. 2008](https://faculty.cc.gatech.edu/~stasko/papers/infovis08-anim.pdf)).
- On animated choropleth maps, readers miss changes between frames and overestimate what they noticed. Tweening (blending between frames) changes how readable the change is ([Fish, Goldsberry & Battersby 2011](https://doi.org/10.1559/15230406384350); summary in [Penn State GEOG 486](https://courses.ems.psu.edu/geog486/book/export/html/916)).
- Animation is not always worse: for spotting clusters in space and time, people were faster and found more patterns than with small multiples, and pace mattered ([Griffin et al. 2006](https://doi.org/10.1111/j.1467-8306.2006.00514.x)).
- Harrower: users get frustrated with maps they cannot control, so allow looping, stopping, stepping and speed changes; smooth noisy data with running averages; put exact numbers in a linked chart; make controls quicker to learn than the animation is to watch ([Harrower 2003](https://cartographicperspectives.org/index.php/journal/article/download/cp44-harrower/pdf/2665)).

## What strong public examples do

- NASA's temperature animation shows difference from a fixed 1951–1980 baseline (white normal, red warmer, blue cooler), each frame a 24-month average ([SVS 5450](https://svs.gsfc.nasa.gov/5450/)); an older one used five-year averages ([SVS 3817](https://svs.gsfc.nasa.gov/3817)).
- NASA's NO2 "human fingerprint" release mapped 2005-to-2014 change instead of animating: blue down, orange up ([SVS 12096](https://svs.gsfc.nasa.gov/12096)).
- Our World in Data maps can "play" through years ([OWID](https://ourworldindata.org/new-features-better-maps)) and show two chosen years side by side ([OWID](https://ourworldindata.org/you-can-now-view-two-maps-showing-different-years-side-by-side)).
- The Washington Post's "2°C: Beyond the limit" mapped one number per county, warming since 1895 ([methods](https://washingtonpost.github.io/data-2C-beyond-the-limit-usa/analysis/model_temperature_change.html)).

## Encoding

- Use one set of colour breaks for every year "so that the colors always refer to the same numbers on any map" ([Axis Maps](https://www.axismaps.com/guide/choropleth)).
- Sequential data suits a palette even in lightness; diverging palettes with a neutral middle suit data with a meaningful centre, such as change from a baseline ([Simmon, NASA](https://science.nasa.gov/blogs/earth-matters/2013/08/19/subtleties-of-color-part-4-of-6/)).
- Rainbow and red–green colour maps distort data and fail for colour-blind readers ([Crameri et al. 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7595127)).
- Not every layer starts in 2001. The NOAA smoke archive starts in 2005 ([NOAA HMS](https://satepsanone.nesdis.noaa.gov/pub/FIRE/web/HMS/Smoke_Polygons/Shapefile/)); Climatch's own config uses smoke from 2006, NO2 from 2005 and fire trends from 2003 (`data_pipeline/config/thresholds.json`).

## Accessibility and performance

- WCAG 2.2.2 (level A): motion that starts by itself, lasts over five seconds and sits beside other content needs pause, stop or hide, and pausing should resume where it stopped ([W3C](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide)). `prefers-reduced-motion: reduce` means the user asked for less motion ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)).
- Sliders step with arrow keys, jump with Home and End, and use `aria-valuetext` when the raw number is unfriendly ([W3C APG](https://www.w3.org/WAI/ARIA/apg/patterns/slider/)). `aria-live="polite"` speaks when the user is idle ([MDN](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions)).
- `img.decode()` resolves once an image is ready, avoiding blank flashes on swap ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/decode)). `requestAnimationFrame` pauses in background tabs; pace it by its timestamp or it runs faster on 120 Hz screens ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)). Leaflet image overlays have `setOpacity`, `setUrl` and an `alt` option ([Leaflet](https://leafletjs.com/reference.html#imageoverlay)).

## Recommendations for the Climatch map

1. Open paused on 2025, no autoplay. A "Play" button runs from the layer's first year to 2025, stops, and becomes "Replay".
2. One control row: Play/Pause toggle, previous and next year buttons, and a year slider (ticks every 5 years, `aria-valuetext` set to the year). About 1 second per year, with Slow, Normal and Fast. Dragging or stepping pauses; Play resumes from the current year.
3. Show the year large on the map; for smoothed layers, the span ("2023–2025 average").
4. Under the slider, a small line chart of the lower-48 average on the same years, with a dot and value at the current year. Clicking a year jumps there.
5. One fixed scale and legend per variable, top colour capped across all years with an "or more" end so one extreme fire year does not wash out the rest. Sequential, colour-blind-safe, light low to dark high.
6. A "Show change" toggle: difference from each layer's first five years with data (PM2.5 and haze 2001–2005, fires 2003–2007, NO2 2005–2009, smoke 2006–2010), diverging, grey for no change, blue better, orange worse. Years before a layer starts show "No data yet", never zero.
7. Smoke days and fire detections as 3-year running means by default, labelled by span. PM2.5 and NO2 as single years. Smooth haze only if it flickers.
8. Compute frames, smoothing, change and the national average in the pipeline (`tools/`), not the browser, so every number comes from the data files.
9. Beside the player, link to the trend map: "Moving colours aren't proof of a trend. See where change is clear."
10. Give the overlay `alt` text. A polite live region updates on pause, step or slider change, not every frame: "2014. Smoke days. Lower-48 average 12, 4 more than 2006–2010." Under reduced motion, no fade.
11. Precompute each frame as a small PNG (about one pixel per cell). Preload the layer's frames and await `decode()` before enabling Play. Add each once as an overlay at opacity 0 and show only the current one. Advance by `requestAnimationFrame` timestamps.

## Not recommended

- Autoplay on load, or endless looping.
- Rescaling colours each year.
- Tweened in-between frames; the data are yearly, so cut or fade briefly.
- Rainbow or red–green palettes.
- Raw single-year smoke and fire frames as the default.
- Announcing every frame to screen readers, or `aria-live="assertive"`.
- Advancing one frame per animation callback instead of by elapsed time.
