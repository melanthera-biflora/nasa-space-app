# UX, visualization types and page structure for exploring sub-annual climate and air-quality patterns (Climatch redesign)

Scope note: research for a multi-page redesign of Climatch (NASA Space Apps 2026 "Be An Earth System Trend Detective", US only, students and the public). Sources are research papers, tool sites and help pages, and practitioner guidance. Many findings came from search-result summaries of the source pages rather than full-text reads; where that matters it is flagged. Inferences are my design recommendations built on the cited findings, sized for a small React/Next.js team working for a few days.

## Chart types for seasonality and sub-annual trends, and what perception research says

### Takeaway
Use aligned linear charts (position on a common scale) for anything students must read precisely: a seasonal subseries / cycle plot for "is January warming faster than July?", a "this year vs normal range" band chart for "is now unusual?", and anomaly bars or stripes for the glanceable overview. Treat heatmaps, stripes, horizon charts and spirals as overview or "wow" views, not as the chart where the trend is judged. Radial and spiral layouts read worse than linear ones in every study found.

### Cited Findings
**Perception baseline**
- Cleveland & McGill (1984) ranked elementary encodings by judgment accuracy: position on a common scale first, then position on non-aligned scales, length, angle, area, with color/shading last — [Cornell INFO3312 slides summarizing C&M](https://info3312.infosci.cornell.edu/slides/04-graphical-perception.html); [UW CSE442 Perception lecture](https://courses.cs.washington.edu/courses/cse442/25au/lectures/CSE442-Perception.pdf)
- Heer & Bostock re-ran the C&M experiments on Mechanical Turk (2010) and found the ranking largely held, adding area judgments (bubbles, treemaps) — [summary in C&M search results / UW CSE442 slides](https://courses.cs.washington.edu/courses/cse442/26wi/lectures/CSE442-Perception.pdf)
- NN/g (Laubheimer, dashboards): some attributes are processed preattentively (length, area, angle, 2D position, color), but they are not equal; position and length are strongest for quantity, so line, bar and scatter charts work well for comparison while area and angle are harder; strong color should be rationed (only fragments of the article were retrieved) — [NN/g: Dashboards, preattentive](https://www.nngroup.com/articles/dashboards-preattentive/)

**Seasonal subseries / cycle plot**
- The cycle plot (Cleveland, *The Elements of Graphing Data*, 1985) shows each calendar month as its own mini-series across years, placed in sequence (Jan…Dec), each with a horizontal line at that month's mean, so you can compare a month's level and its change across years — [R DescTools PlotMonth docs](https://search.r-project.org/CRAN/refmans/DescTools/html/PlotMonth.html)
- The modern `gg_subseries()` (feasts/ggtime, used in Hyndman & Athanasopoulos, *Forecasting: Principles and Practice* 3rd ed.) facets the series by each season of the seasonal period; each facet shows only that season's data over years, with mean lines to compare seasons — [ggtime gg_subseries docs](https://rdrr.io/cran/ggtime/man/gg_subseries.html); [feasts reference](https://feasts.tidyverts.org/reference/gg_subseries.html)

**STL decomposition panels**
- STL decomposition is available as `stl()` (single seasonal period); `mstl()` extends it to multiple seasonal periods; fpp3 uses `STL(value ~ season(window = 7))` and `components()` to extract trend, seasonal and remainder panels — [RPubs seasonal decomposition tutorial](https://rstudio-pubs-static.s3.amazonaws.com/1349860_c7d6d4abd98b4a06b008f3a0bde4a586.html); [feasts search result summary](https://search.r-project.org/CRAN/packages/feasts/feasts.pdf)

**Radial / spiral charts**
- Waldner et al. (IEEE VIS 2019, crowdsourced) compared radial and linear charts for daily periodic patterns: linear charts outperformed or matched radial ones on low-level analytic tasks, even for cyclic data, and radial charts generally read worse — [Waldner et al., arXiv 1907.13534](https://ar5iv.arxiv.org/html/1907.13534)
- Goldberg & Helfman (eye-tracking, cited by Waldner et al.) found reading values is clearly harder on radial charts than linear ones — [Waldner et al.](https://ar5iv.arxiv.org/html/1907.13534)
- A timeline-shape study (horizontal, vertical, circle, spiral) found participants preferred linear shapes; some found the spiral confusing, others liked it — [Evaluating the Effect of Timeline Shape (summary)](https://www.bohrium.com/paper-details/evaluating-the-effect-of-timeline-shape-on-visualization-task-performance/867763551001903991-108610)
- Proma, Quadri & Rosen (arXiv Oct 2025) compared aggregated, trellis (small multiples) and spiral line charts against a standard line chart for dense temporal data: aggregated charts performed like standard charts and supported more accurate trend recognition and prediction; trellis and spiral generally did worse; trust in trellis charts leaned toward distrust, trust in spirals varied (abstract only) — [arXiv 2510.11912](https://arxiv.org/abs/2510.11912)

**Horizon charts**
- Heer, Kong & Agrawala ("Sizing the Horizon", CHI 2009 best paper) compared line charts and horizon graphs across chart heights; horizon graphs split a series into uniform value bands layered to save height, with negatives mirrored or offset; they found transition heights where accuracy drops differ between the two chart types, and note banding/mirroring can obscure patterns and reduce estimation accuracy — [UW IDL paper page](https://idl.uw.edu/papers/horizon); [PDF](https://hci.stanford.edu/courses/cs448b/w09/Heer-Horizon.pdf)

**Climate / warming stripes**
- Ed Hawkins designed the stripes as the simplest possible way to show warming; blues and reds were chosen to be inclusive for color-vision deficiencies and to map intuitively to cold/hot — [Reading BAMS paper (Hawkins et al. 2024)](https://centaur.reading.ac.uk/122245/8/bams-BAMS-D-24-0212.1.pdf); [Univ. of Reading blog](https://research.reading.ac.uk/research-blog/showyourstripes-how-climate-data-became-a-cultural-icon/)
- Stripes deliberately break standard chart conventions (no axis, no legend) and commentators argue the message reads without explanation — [Chez Voila analysis](https://www.chezvoila.com/blog/warmingstripes); [Univ. of Reading](https://research.reading.ac.uk/engagement-and-impact/stripes-spark-conversations-on-climate-change/)
- A 2024 BAMS article extends stripes to other parts of the climate system — [Reading BAMS paper](https://centaur.reading.ac.uk/122245/8/bams-BAMS-D-24-0212.1.pdf)
- A Southampton study ("Know Your Stripes?") ran two studies with lay participants on what meaning they take from stripes; results not retrieved — [Southampton accepted manuscript](https://eprints.soton.ac.uk/508259/1/An_Assessment_of_Climate_Warming_Stripes_-_ACCEPTED_MANUSCRIPT.pdf)

**"This year vs normal range" band charts**
- Climate Reanalyzer's Daily 2-m Air Temperature chart draws one line per year over the day of year; users hide/show individual years by clicking the year labels below the chart; anomalies are vs a 1979–2000 day-of-year climatology, chosen to avoid the warm bias of the 1981–2010 normal; the newer ERA5 page's tooltip gives anomalies vs both 1979–2000 and 1991–2020 — [Climate Reanalyzer t2_daily](https://climatereanalyzer.org/clim/t2_daily/)
- NOAA CPC's daily temperature figures plot observed values over a dashed 1979–99 daily mean plus thin lines for daily record max/min — [NOAA CPC bulletin figure](https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/bulletin_1206/figs4.html)
- Weather Spark history pages draw daily high/low over the daily average lines with 25th–75th and 10th–90th percentile bands; its "averages" are a typical year computed over 1980–2016 — [Weather Spark history page example](https://weatherspark.com/h/s/146913/2025/1/Historical-Weather-Summer-2025-at-North-Central-West-Virginia-Airport-West-Virginia-United-States); [Weather Spark data download/definitions](https://weatherspark.com/download/3709/Download-Denver-Colorado-United-States-Weather-Data)
- Readers of similar climate band charts complain when the band's meaning (full range vs interquartile range) is not stated — [Straight Dope forum thread](https://boards.straightdope.com/t/help-me-understand-these-graphs/338613)

### Inferences
Question-to-chart map for Climatch (each is a page section or tab; existing Climatch components in brackets):

| Student question | Primary chart | Why (evidence) | Secondary / overview |
|---|---|---|---|
| "Is it getting warmer/smoggier overall?" | Annual line + OLS trend line + 95% band [existing] | Position on common scale (C&M) | Stripes strip above the chart as a glanceable header (Hawkins) |
| "Which months are changing fastest?" | Cycle plot / seasonal subseries: 12 mini-series Jan–Dec side by side, each with its own trend segment and mean line, shared y-axis | Aligned positions; Cleveland design; a per-month trend slope is directly comparable | A 12-bar "trend per month" chart (slope ± CI), bars faded when not significant |
| "Did the season shift?" (earlier summer, longer ozone/pollen/fire season) | Two-period comparison of the mean annual cycle (e.g., first 10 yrs vs last 10 yrs) as two lines on one Jan–Dec axis with shaded difference | Linear beats radial (Waldner) | Ridgeline of daily distributions by decade (no evidence found; treat as optional) |
| "Is this year/month unusual?" | Band chart: day-of-year or month-of-year x-axis, normal range as 10–90th and 25–75th percentile bands, this year as a bold line, record high/low as thin lines; label the band in plain words | Climate Reanalyzer, CPC, Weather Spark pattern; band meaning must be explicit (forum complaint) | Click-to-toggle other years like Climate Reanalyzer |
| "When in the year do extremes happen?" | Month-by-year heatmap [existing], sorted months on y, years on x | Good overview, but color is the weakest channel (C&M), so pair with hover values and a linked line | Calendar heatmap for daily AQI (one year at a time; no perception evidence found) |
| "What is the weekly rhythm?" (AQI weekday/weekend) | Day-of-week subseries (7 mini-series) or bar of mean by weekday, with CI | Same logic as cycle plot | STL with weekly + yearly seasonality via `mstl` (decomposition panels) for advanced users |
| "Which part is trend vs season vs noise?" | STL 3–4 stacked panels (data, trend, seasonal, remainder), shared x-axis | Standard in fpp3 | Put behind an "Advanced" disclosure; novices find it abstract (inference) |

- Avoid spiral/radial as a primary view; if a "climate spiral" is wanted for engagement, make it a decorative header with a linked linear chart that does the work (Waldner; Proma et al.; Goldberg & Helfman).
- Horizon charts are only worth it for many stacked series in little height (e.g., 30 US cells or many years on a phone); for 1–3 series use plain lines (Heer et al.).
- Note a tension: Proma et al. found trellis/small multiples did worse for trend tasks than standard lines. Their "trellis" splits one long series into chunks, which differs from a seasonal subseries that puts the same month side by side. Keep the cycle plot but always pair it with the plain line, and test it with a few students.
- Stripes are good as a header or thumbnail per variable/place (glanceable, CVD-safe palette) but cannot carry a significance judgment; never use stripes alone on the "test the trend" step.
- Implementation: all of the above are line/area/rect marks; any React chart library with area bands (e.g., Recharts `Area` with `[low, high]`, visx, Observable Plot) can render them in a day each; STL can be precomputed in the Python/data pipeline (statsmodels `STL`/`MSTL`) so the front end only draws arrays.

### Gaps
- Did not retrieve primary-text results for calendar heatmaps, ridgeline plots or month-by-year heatmaps vs line charts for trend detection; no perception study found for these in seasonal climate data.
- Brehmer, Lee, Isenberg & Choe (TVCG 2019, "Visualizing Ranges over Time on Mobile Phones") compared linear and radial temperature-range charts on phones and is directly relevant to the band chart on mobile, but its results were not retrieved — [PDF](https://terpconnect.umd.edu/~choe/download/TVCG-2019-Brehmer-Mobile.pdf)
- Results of the Southampton "Know Your Stripes?" study and the full Heer et al. horizon recommendations (number of bands, height thresholds) were not retrieved.
- Weather Spark's own explanation of its averages-page bands (whether 10–90 or 25–75) was not found; only history pages are confirmed.
- No evidence was found on whether Climate Reanalyzer draws a shaded normal-range band (it uses per-year lines and a mean).

## How reference tools structure exploration (pages, tabs, controls, URL state)

### Takeaway
The leading tools converge on a small, repeated control set (place, variable, time scale/month, period, baseline) with a few view types (time series, map, rankings, table) as tabs or sibling pages, and they put the view state in the URL so any chart is shareable. Each chart carries a "how to read" or info panel, and downloads (CSV/PNG) sit next to the chart.

### Cited Findings
**NOAA Climate at a Glance (CAG)**
- Geographic levels: Globe, Nation, Region, State, Division, County, City; views per level: Mapping, Time Series, Rankings, Haywood plots, Data Info; plus tutorial videos (What & Why, Data Outputs, Geographic Regions, U.S. Navigation, Global Navigation) — [NCEI CAG home](https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/)
- Time series support custom base periods, trend lines and smoothing, interactive zoom and pan; variables include temperature, precipitation, heating/cooling degree days and drought indices — [NOAA Climate Toolkit: Climate at a Glance](https://toolkit.climate.gov/tool/climate-glance); [drought.gov CAG](https://www.drought.gov/data-maps-tools/ncei-climate-glance-cag-temperature-anomalies)
- Time scale picker spans 1 to 60 months or preset periods such as year-to-date; rankings cover 1–12, 18, 24, 36, 48, 60-month and year-to-date periods since 1895 — [NOAA Climate Toolkit](https://toolkit.climate.gov/tool/climate-glance)
- Recent values are preliminary and may change after quality control — [NOAA Climate Toolkit](https://toolkit.climate.gov/tool/climate-glance)
- View state is encoded in the URL path, e.g. `/cag/global/time-series/globe/land_ocean/ann/7/1880-2020` and `/cag/global/time-series/nhem/ocean/12/12/1880-2021` (region / surface / time scale / month / year range) — [CAG global time series URL](https://www.ncdc.noaa.gov/cag/global/time-series/globe/land_ocean/ann/7/1880-2020); [second example](https://www.ncdc.noaa.gov/cag/global/time-series/nhem/ocean/12/12/1880-2021) (segment meanings are my reading of the pattern)

**Our World in Data Grapher**
- Views (Chart, Map, Table) switch via buttons at the upper left; each view's own controls sit at the upper right and show only settings relevant to that view; "Edit countries and regions" opens an entity picker; a Settings menu offers small multiples and "Align axis scales" — [OWID: Redesigning our interactive data visualizations](https://ourworldindata.org/redesigning-our-interactive-data-visualizations)
- Table view: sortable columns; when a year range is selected on the timeline slider it shows summary statistics (change over the range); a toggle limits rows to the entities on the chart — [OWID redesign](https://ourworldindata.org/redesigning-our-interactive-data-visualizations)
- Map view: clicking a country opens its chart view — [OWID redesign](https://ourworldindata.org/redesigning-our-interactive-data-visualizations)
- Downloads (SVG/PNG image, CSV data), share and embed sit at the bottom right; sources shown prominently with a "Learn more about this data" overlay; fullscreen button — [OWID redesign](https://ourworldindata.org/redesigning-our-interactive-data-visualizations)
- Share previews reflect the exact configuration (tab, timespan, entities) — [OWID redesign](https://ourworldindata.org/redesigning-our-interactive-data-visualizations)
- URL parameters: `tab` (chart, map, table, line, scatter…), `country` (ISO codes joined with `~`), `time` (range or single year), `tableFilter`, `tableSearch`, `region` for map focus — [OWID Chart API docs](https://owid-docs.readthedocs.io/projects/etl/api/chart-api/)
- The 2023 redesign did not cover mobile; an optimized mobile experience was listed as future work — [OWID redesign](https://ourworldindata.org/redesigning-our-interactive-data-visualizations)

**Copernicus Climate Pulse**
- Daily, monthly and annual maps plus a global-average time series, for 2 m air temperature and sea surface temperature; toggle between absolute values and anomalies; zoom/pan the globe with mouse or touch; data download and image export; records back to 1940 (air) and 1979 (SST) — [Copernicus: Climate Pulse](https://climate.copernicus.eu/climate-pulse-tool-take-temperature-our-planet-glance); [PreventionWeb summary](https://www.preventionweb.net/news/climate-pulse-c3ss-new-tool-monitor-state-our-climate-glance); [C3S quality assessment](https://ecmwf-projects.github.io/c3s2-eqc-quality-assessment/Applications/application_pulse_extreme-events_q01.html)
- Information panels throughout provide short video tutorials on core features — [PreventionWeb summary](https://www.preventionweb.net/news/climate-pulse-c3ss-new-tool-monitor-state-our-climate-glance)
- Version 2.0 added El Niño monitoring — [Copernicus: new version of Climate Pulse](https://climate.copernicus.eu/new-version-climate-pulse-provides-new-monitoring-el-nino-conditions)

**NOAA Climate Explorer (US Climate Resilience Toolkit)**
- Start by searching a county or city, then choose a card (past, present, projected conditions); graphs show historical observations with hover values; maps can be compared side by side; each graph has "How to read" buttons that reveal explanation below the graph; CSV and PNG download — [drought.gov Climate Explorer](https://www.drought.gov/data-maps-tools/climate-explorer); [toolkit.climate.gov Climate Explorer](https://toolkit.climate.gov/tools/climate-explorer)
- Observed data may lag; users are pointed to Climate at a Glance for current county data — [drought.gov Climate Explorer](https://www.drought.gov/data-maps-tools/climate-explorer)

**EPA Climate Change Indicators (page template)**
- Each indicator page: breadcrumb (Climate Change Indicators > View the Indicators > Weather and Climate), short intro, "Key Points" (3 bullets, e.g., frequency, timing, intensity for heat waves), "About the Indicator" defining each measure (frequency, duration, season length, intensity; 50 metro areas, 1961–2023), figures/maps, references — [EPA Heat Waves indicator](https://www.epa.gov/node/263455); [2025 snapshot](https://19january2025snapshot.epa.gov/climate-indicators/climate-change-indicators-heat-waves)
- Example key points: heat waves now about 6 per year vs 2 per year in the 1960s; heat waves earlier in spring or later in fall catch people off guard; the 1930s still hold the record for the most severe US heat waves (longer record changes the picture) — [EPA Heat Waves](https://www.epa.gov/node/263455)

**Climate Reanalyzer** — one line per year, year toggles below chart, explicit baseline choice in tooltip (see first section) — [Climate Reanalyzer t2_daily](https://climatereanalyzer.org/clim/t2_daily/)

### Inferences
What to borrow (structure and interaction only):
- From CAG: the "same controls, different view" model (Time series / Map / Rankings) and the rankings idea: "Rank this month among all Julys since 19xx" is a strong extreme-events entry point for students. Also its explicit time-scale selector (1-, 3-, 12-month) maps neatly onto "monthly vs seasonal vs annual".
- From OWID: view tabs with per-view controls, a table tab that shows change over the selected range, "click map cell → open that place's chart", download CSV/PNG next to every chart, and full state in query params.
- From Climate Explorer and Climate Pulse: a "How to read this chart" toggle under each chart and short info panels; anomaly vs absolute toggle.
- From EPA: a fixed page template per variable: Key points (3 auto-generated bullets) → definition ("About this variable") → figures → data notes/sources. This directly answers the challenge's "simple definitions" requirement.
- From Climate Reanalyzer: click-to-toggle years on the band chart, and state the baseline period on the chart.
- URL state for Climatch (Next.js `useSearchParams` / App Router `searchParams`): `?place=<lat,lon or cell id>&var=pm25&from=2000&to=2024&month=7&scale=monthly&baseline=1991-2020&tab=season`. This gives shareable demo links (the challenge's "demonstration examples" become just curated URLs) and makes the browser back button work across views.

### Gaps
- NASA Giovanni and Worldview, Berkeley Earth, Google Trends (compare and seasonality views) and NOAA's full CAG time-series control list were not researched in this pass (budget); no cited findings for them.
- CAG URL segment meanings are inferred from example URLs, not documented; no official permalink documentation was found.
- Weather Spark page structure (its long single-page "average weather" layout with many seasonal charts) was not retrieved.
- Climate Pulse 2.0 feature details beyond El Niño monitoring were not verified in the live app.

## Showing events and disasters on a time series

### Takeaway
Mark events with vertical reference lines (single dates) or shaded ranges (spans such as a wildfire season or drought), each with a short numbered label that links to a one-paragraph explanation; on phones, move annotation text below the chart as numbered notes. Pair events with a ranking ("hottest July on record for this place") and a longer-record caveat.

### Cited Findings
- Datawrapper added "range highlights and reference lines" to line, area, column and scatter charts; they are recommended for pointing out a threshold value or a date/timespan, e.g., a date where a policy changed; ranges require a date column — [Datawrapper: range highlights and lines](https://www.datawrapper.de/docs/range-highlights-and-lines); [Datawrapper blog: annotations in bar charts](https://blog.datawrapper.de/annotations-in-bar-charts)
- Datawrapper text annotations call out long-term developments and sudden spikes; on small screens annotations are numbered and moved below the chart to avoid overlap — [Datawrapper blog: responsive annotations](https://blog.datawrapper.de/better-more-responsive-annotations-in-datawrapper-data-visualizations/)
- EPA's heat-wave indicator puts the 1930s Dust Bowl extremes in context with a longer-term record, so an extreme event is shown alongside the trend rather than replacing it — [EPA Heat Waves](https://www.epa.gov/node/263455)
- NOAA CAG offers Rankings as a separate view, ranking any month or multi-month period against the record since 1895 — [NOAA Climate Toolkit: CAG](https://toolkit.climate.gov/tool/climate-glance)
- NOAA CPC daily charts overlay record daily max/min as thin lines so a new extreme is visible against the record envelope — [NOAA CPC figure](https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/bulletin_1206/figs4.html)

### Inferences
- Build an "Events" layer as data, not as drawings: a small JSON list per region `{start, end, type: wildfire|heatwave|hurricane|drought|flood, title, oneLiner, sourceUrl}`; render as shaded spans (multi-day) or tick markers (single day) on every time-series chart; a toggle turns the layer on/off so the trend can be judged without visual bias.
- Event marker interaction: hover/focus shows title; click opens a side panel with 2–3 sentences ("What happened", "What the data shows", "Is one event a trend? No — see the trend test"). This links events to the detective question instead of letting them stand as proof.
- An "Extremes" page per variable: (1) monthly ranking table (this month's rank among all same-months), (2) top-10 extreme months/days list with event links, (3) count of days above a threshold per year (e.g., AQI > 100, Tmax > 95 °F) as bars with trend — the EPA "frequency / season length / intensity" trio is a ready-made structure.
- For air quality, wildfire-smoke spikes will dominate monthly means; showing them as labeled spans prevents students from misreading a 2020/2023 smoke spike as the trend.

### Gaps
- No research found on how annotations change novices' trend judgments (e.g., anchoring on labeled events); the bias risk above is an inference.
- Not researched: authoritative US disaster event lists suitable for the event layer (e.g., NOAA billion-dollar disasters); other researchers may cover data sources.

## Showing uncertainty and significance to novices, and avoiding p-hacking impressions

### Takeaway
Show the trend line with a shaded confidence band (not error bars), state significance in words ("strong evidence / not enough evidence yet"), and for the "is there a trend?" step consider animated hypothetical outcomes, which helped untrained viewers judge weak trends. When testing 12 months (or many map cells), tell users how many tests were run and how many would be "significant" by chance, keep the existing FDR correction, and present it plainly.

### Cited Findings
- Kale, Nguyen, Kay & Hullman (InfoVis 2018 / TVCG 2019): participants judged which of two underlying trends produced a noisy time series; with Hypothetical Outcome Plots (animated frames, each a sample from the distribution of outcomes) untrained observers correctly inferred the trend at lower levels of evidence than with static uncertainty charts — [UW IDL: HOPs trends](https://idl.uw.edu/papers/hops-trends); [Northwestern paper PDF](https://mucollective.northwestern.edu/files/2018-HOPsTrends-InfoVis.pdf); [UW Data Medium summary](https://medium.com/@uwdata/hypothetical-outcome-plots-hops-help-users-separate-signal-from-noise-870d4e2b75d7)
- Kale, Kay & Hullman (VIS 2020/2021): adding the mean to uncertainty visualizations had small biasing effects on effect-size estimation and decisions, consistent with people discounting uncertainty — [UW IDL: effect size judgments](https://idl.uw.edu/papers/effect-size-judgments)
- Correll & Gleicher (TVCG 2014, "Error Bars Considered Harmful"): error bars suffer within-the-bar bias (values inside the bar seem more likely), ambiguity about what whiskers mean, an all-or-nothing reading of the interval, and overconfidence; gradient plots (transparency) and violin plots (width) performed better for inference — [Correll & Gleicher PDF](https://graphics.cs.wisc.edu/Papers/2014/CG14/Error%20Bars%20Considered%20Harmful%20Exploring%20Alternate%20Encodings%20for%20Mean%20and%20Error.pdf); [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC6214189)
- Zgraggen, Zhao, Zeleznik & Kraska (CHI 2018): the probability of spurious insights grows with each visualization examined and comparison made (the multiple comparisons problem); in a study with 28 moderately experienced analysts on synthetic data, a large share of reported insights were false (reported as ~60% by a later CHI 2023 citation and ~75% by a commentary; verify in the original); a confirmatory approach that counts all visual comparisons, including non-insights, approached validation-set results — [MIT DSpace record](https://dspace.mit.edu/handle/1721.1/137892); [UW HCI Medium commentary](https://medium.com/hci-design-at-uw/multiple-perspectives-on-the-multiple-comparisons-problem-in-visual-analysis-df7493818bbd); [Pu & Kay, BELIV 2018 "Garden of forking paths"](https://mucollective.northwestern.edu/files/2018-ForkingPaths-BELIV.pdf)
- Hullman & Gelman argue exploratory interfaces need theories of graphical inference, since free exploration invites false discoveries — [arXiv 2104.02015](https://arxiv.org/pdf/2104.02015)

### Inferences
- Trend chart: draw the OLS (or Sen's slope) line with a soft gradient/shaded 95% band rather than whisker error bars (Correll & Gleicher). Put the slope in words with units per decade.
- Significance copy, three states, never just "p = 0.03":
  - p < 0.05: "Strong evidence of a trend: a slope this large would be unlikely (< 5% chance) if there were no real trend."
  - 0.05 ≤ p < 0.2: "Not enough evidence yet. The direction looks up, but the data are noisy. A longer record might settle it." + button "Try a longer period" that extends the range (the challenge text explicitly says non-significant may just need a longer series).
  - p ≥ 0.2: "No clear trend in this period."
- "Is it real or noise?" mini-activity using HOPs: animate 20 hypothetical series (trend + resampled residuals, or shuffled years) and ask "which one is the real data?" — a line-up style test that is cheap to implement (precompute or bootstrap in the browser) and directly operationalizes Kale et al.
- Because Kale et al. 2020 found means bias people to discount uncertainty, keep the band visible whenever the trend line is visible; do not offer a "hide uncertainty" toggle on the test step.
- Multiple months: on the 12-month trend bar chart, show both raw and FDR-adjusted results, and a sentence such as "We tested 12 months. By chance alone about 1 in 20 tests looks significant, so we adjust for this (FDR). 3 months still show strong evidence." Fade (not hide) non-significant bars. Keep the existing map hatching but explain it in the same words.
- Discourage fishing: let students state a hypothesis before seeing the test ("I think July is warming faster") and log the number of comparisons they made in a "detective notebook" panel (Zgraggen's "count all comparisons" idea, made visible).

### Gaps
- No study found on plain-language significance wording for high school students specifically; the three-state copy is an inference to be user-tested.
- HOPs evidence is for judging trends in ambiguous data in a lab task; no evidence found for climate education settings or for animation on phones.
- Did not verify the exact false-discovery percentage in Zgraggen et al.

## Guided "detective" flows, explorable explanations and worked examples

### Takeaway
Use a "martini glass" structure: a short author-driven worked example (the demo the challenge asks for) that hands off to free exploration with the same controls pre-filled. Make text reactive (numbers in sentences update with the chart), as in Bret Victor's explorable explanations, so the narrative and the student's own analysis are the same object.

### Cited Findings
- Segel & Heer ("Narrative Visualization: Telling Stories with Data", 2010) analyzed 58 examples, identified 7 genres and 3 common structures: martini glass, interactive slideshow, and drill-down story; narrative visualizations balance author-driven flow and reader-driven discovery — [Segel & Heer PDF](https://homes.cs.washington.edu/~jheer/files/narrative.pdf); [UW CSE442 Narrative lecture](https://courses.cs.washington.edu/courses/cse442/21au/lectures/CSE442-Narrative.pdf)
- In the martini glass, the stem is a strongly author-driven opening, then the bowl opens to reader-driven exploration; stem length and exploration width can vary — [UW CSE442 Narrative lecture](https://courses.cs.washington.edu/courses/cse442/21au/lectures/CSE442-Narrative.pdf); [eScience Center blog](https://blog.esciencecenter.nl/posts/2021-06-17---visual-storytelling-for-data-science)
- Bret Victor's "Explorable Explanations" (2011) argues for active reading (asking questions, considering alternatives, questioning assumptions) and proposes reactive documents where readers change assumptions and see text and visuals update, plus "explorable examples" that make abstract systems concrete — [worrydream.com Explorable Explanations](https://worrydream.com/ExplorableExplanations/)
- Tooling in this tradition includes Tangle (Victor), Idyll (reactive documents), and Observable — [awesome-explorables list](https://github.com/blob42/awesome-explorables); [Medium: Exploring Explorable Explanations](https://medium.com/@Max_Goldstein/exploring-explorable-explanations-92f865c8d6ba)
- Copernicus Climate Pulse uses short video tutorials inside info panels; NOAA CAG offers short tutorial videos; NOAA Climate Explorer uses "How to read" toggles under graphs — [PreventionWeb on Climate Pulse](https://www.preventionweb.net/news/climate-pulse-c3ss-new-tool-monitor-state-our-climate-glance); [NCEI CAG](https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/); [drought.gov Climate Explorer](https://www.drought.gov/data-maps-tools/climate-explorer)

### Inferences
Detective workflow mapped to the challenge steps (each step is a route or a stepper state, all sharing URL state):
1. **Case file (choose):** place search + variable picker with one-line definitions and units ("PM2.5: tiny particles from smoke and exhaust, µg/m³"); period presets (last 10 / 20 / all years).
2. **Look (observe):** the time series with stripes header; a prompt "Does it look like it's going up, down, or neither?" with three buttons. Record the guess.
3. **Seasons (pattern):** cycle plot + normal-range band chart; prompt "Which month changed most?"
4. **Test (evidence):** trend + band + plain-language verdict; "not enough evidence yet → try a longer period".
5. **Extremes (events):** rankings and event spans.
6. **Compare / Map:** another place or the US grid.
7. **Report:** auto-generated summary of the student's guesses vs results (reactive text: "You guessed *up*. The data show +0.4 °F/decade, strong evidence."), downloadable PNG/CSV.
- Worked examples (the challenge's "couple of demonstration examples users can watch"): implement as scripted URL sequences that animate through steps 1–5 with captions (e.g., "Phoenix summer nights", "Western wildfire smoke in August", "Northeast ozone season"); end each with "Now try it yourself" that keeps the place/variable and unlocks all controls (martini glass hand-off). A step-through (Next/Back) is easier to build and more accessible than scroll-triggered scrollytelling; use scrolling only for the landing page.
- Reactive sentences: every key number in prose (slope, rank, p-verdict) is bound to the same computed state as the chart, so changing the period updates the sentence (Victor). This is a few React components, no special library needed.
- "Without dumbing down": keep real terms (anomaly, baseline, p-value, FDR) but always paired with a one-line plain definition in a tooltip/glossary, and keep an "Advanced" disclosure for STL panels, method choice (OLS vs Sen's slope) and raw vs adjusted p-values.

### Gaps
- NYT "How the Virus Got Out" and Distill articles were not retrieved; no cited evidence here on scrollytelling vs stepper effectiveness.
- No controlled study found comparing worked-example-then-explore vs free exploration for climate data literacy; the martini glass recommendation rests on Segel & Heer's descriptive analysis, not an effectiveness test.

## Page and navigation patterns, accessibility and phone layouts

### Takeaway
Split the long report into a handful of pages that share one persistent context bar (place, variable, period, baseline) stored in the URL, with tabs for views inside each page. Every chart needs a text summary, a data-table alternative, keyboard access to points and a "how to read" note; sonification is a cheap add-on for long series. On phones, stack controls into a sheet, move annotations below charts and prefer linear charts.

### Cited Findings
- OWID Grapher: view tabs (Chart/Map/Table) with per-view controls; map click → place chart; downloads and sources at fixed positions; state reflected in share links — [OWID redesign](https://ourworldindata.org/redesigning-our-interactive-data-visualizations); [OWID Chart API](https://owid-docs.readthedocs.io/projects/etl/api/chart-api/)
- EPA indicator pages use breadcrumbs and a fixed section order (Key Points → About → Figures → References) — [EPA Heat Waves](https://www.epa.gov/node/263455)
- Climate Explorer starts from place search then cards per data type, with side-by-side map comparison — [drought.gov Climate Explorer](https://www.drought.gov/data-maps-tools/climate-explorer)
- Highcharts accessibility module: keyboard and screen-reader navigation of data points; a "view as data table" option via the export-data module; `accessibility.description` for a screen-reader-only summary; `point.valueDescriptionFormat` for per-point wording; point-level exposure is limited above a threshold for large series (`pointDescriptionEnabledThreshold`) — [Highcharts accessibility module](https://highcharts.com/docs/accessibility/accessibility-module); [feature overview](https://highcharts.com/docs/accessibility/accessibility-module-feature-overview); [advanced configuration](https://www.highcharts.com/docs/accessibility/configure-the-accessibility-module)
- Highcharts recommends sonification for large data series to make trends accessible to screen-reader users; Highcharts Sonification Studio (with Georgia Tech) is free and open source — [Highcharts accessibility docs](https://highcharts.com/docs/accessibility/accessibility-module); [Georgia Tech news](https://cc.gatech.edu/news/649087/new-browser-based-chart-builder-gives-line-graphs-scatterplots-their-own-audio-track)
- A data table is not automatically an equivalent alternative: table use breaks down with nested row/column headers and requires correct markup and screen-reader table skills (conference presentations, not peer-reviewed guidance) — [Elsevier: Making charts accessible](https://www.elsevier.com/connect/making-charts-accessible-for-people-with-visual-impairments); [CSUN 2024 session](https://www.csun.edu/cod/conference/sessions/2024/index.php/public/presentations/view/1733.html)
- W3C WAI Complex Images: charts need a long description unless surrounding text already conveys it; place it near the image or in an appendix with links both ways; reference its location in the alt text; `aria-describedby` can link description to image — [W3C WAI Complex Images tutorial](https://www.w3.org/WAI/tutorials/images/complex)
- Datawrapper moves annotations below the chart as numbered notes on small screens — [Datawrapper blog](https://blog.datawrapper.de/better-more-responsive-annotations-in-datawrapper-data-visualizations/)
- Linear charts read better than radial ones (Waldner et al.), relevant for small screens where radial is sometimes chosen to save space — [Waldner et al.](https://ar5iv.arxiv.org/html/1907.13534)

### Inferences
Proposed page map (Next.js routes; `[place]` can be a cell id or slug; all share `?var=&from=&to=&baseline=`):
- `/` Landing: one-line challenge framing, 2–3 demo case cards (worked examples), "Start your own investigation" (place search). The household questionnaire becomes optional ("Personalize") rather than the gate.
- `/place/[id]` **Overview**: stripes per variable as a compact grid (one row per variable, glanceable), each row with the slope-per-decade and verdict chip; click a row → variable page. Answers "what's changing here?"
- `/place/[id]/[var]` **Trend** (tabs: Chart | Table | About): annual/seasonal line with trend band, verdict copy, period presets, "try a longer period". "About" holds the EPA-style definition and data notes.
- `/place/[id]/[var]/seasons` **Seasons**: cycle plot (12 months), per-month trend bars with FDR explanation, early-vs-late annual-cycle comparison, month-by-year heatmap [existing], weekday pattern for daily air-quality variables.
- `/place/[id]/[var]/extremes` **Extremes and events**: band chart "this year vs normal", rankings table, threshold-day counts, event layer and event detail panel.
- `/compare` **Compare places**: two or three places on the same axes (small multiples with aligned y-scales, as OWID's "Align axis scales").
- `/map` **US map** [existing grid map]: per-cell trend with hatching; click a cell → that place's Trend page (OWID map→chart pattern); month selector to see which regions change in July vs January.
- Persistent context bar (sticky top on desktop, bottom sheet on phone): place, variable, period, baseline; breadcrumb under it (`USA › Phoenix, AZ › PM2.5 › Seasons`). Step tabs (Look → Seasons → Test → Extremes → Compare) double as the detective stepper.
- Accessibility per chart component (build once, reuse): (1) visible one-sentence takeaway generated from the data above the chart (doubles as the long description, W3C), (2) `role="img"` + `aria-label` short summary + `aria-describedby` to the takeaway, (3) a "Show data table" toggle rendering a simple single-header `<table>` (avoid nested headers per CSUN finding), (4) keyboard: chart focusable, arrow keys move a highlighted point with a live region announcing "July 2021: 41.2 µg/m³, 3rd highest July", (5) optional "Play sound" sonification of the series via Web Audio (pitch = value), (6) color: CVD-safe diverging palette for anomalies (stripes palette rationale) and never color alone for significance (use hatching/fading plus text).
- Phone layout: one chart per screen width, controls in a bottom sheet, annotations as numbered notes below the chart, tables scroll horizontally inside their own container (not the page), no radial charts, band chart and cycle plot remain linear (12 mini-series can wrap to 3×4 grid with shared y-axis).
- Scope for a few days: reuse existing chart components; new components are the cycle plot, per-month trend bars, band chart, rankings table, event layer, context bar with URL state, and the step/route shell. STL panels and HOPs line-up are stretch goals.

### Gaps
- NN/g articles on data tables and on dashboard navigation were only partially retrieved (preattentive article fragments); no cited NN/g guidance on multi-page analytics navigation or breadcrumbs.
- No research found on keyboard interaction patterns specific to heatmaps or small multiples; the arrow-key pattern is modeled on Highcharts point navigation.
- Brehmer et al. 2019 (mobile range charts) results not retrieved; phone recommendations rest on Waldner and Datawrapper practice.
- No user-testing evidence for students with this specific page map; recommend a quick hallway test with 3–5 students on the demo flow.
