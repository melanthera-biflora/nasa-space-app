# Methods for monthly and weekly trends, season effects and pattern finding (Climatch)

Scope: which statistics to compute (Python: numpy / scipy / statsmodels / pymannkendall) on one place's monthly or weekly series (2001–2025), how to explain each to students, and the pitfalls. No forecasting. Target: sub-second per request, or precomputed.

Ground truth about the current code, checked in this session:
- `data_pipeline/analysis/trends.py` already has `monthly_anomaly()` (each month minus that calendar month's mean), runs OLS plus `pymannkendall.original_test` on YEARLY values only, with `min_years=8` — [local file](../../data_pipeline/analysis/trends.py)
- `data_pipeline/tools/trend_field.py` already does BH-FDR with `scipy.stats.false_discovery_control` — [local file](../../data_pipeline/tools/trend_field.py)
- The project `.venv` has pymannkendall 1.4.3, scipy 1.18.1, numpy 2.5.4 and pandas 3.1.1. statsmodels and ruptures are NOT installed, and `data_pipeline/requirements.txt` lists pymannkendall but not statsmodels — [local file](../../data_pipeline/requirements.txt), checked with `.venv/Scripts/python.exe`

Own-computation note: several findings below come from small Monte Carlo runs I did in this session with the project's `.venv` (synthetic Gaussian AR(1) noise, 200–400 replicates, so a rejection rate has a Monte Carlo SE of about ±0.015). The scripts are in the session scratchpad (a local scratch folder (not in the repo), `fp_mk.py`, `years_needed.py`). The scratchpad may be cleared, so the numbers are copied here. They are labelled "own simulation".

---

## 1. Seasonal Mann-Kendall and seasonal Sen's slope vs. plain MK on annual means; per-month trends ("which months are changing")

### Takeaway
For monthly data, use the Seasonal Kendall test. It only compares January with January, February with February, and so on, so the seasonal cycle cannot fake a trend. Use the covariance-corrected version (`correlated_seasonal_test`) because neighbouring months are correlated, and give its seasonal Sen's slope as "change per year". Then add a 12-bar "which months are changing" view (MK plus Sen's slope run separately on each calendar month's 25 values, with BH-FDR across the 12). Plain MK on annual means is still a valid, simple headline, but it hides opposite trends in different seasons.

### Cited Findings
- Hirsch, Slack & Smith (1982) define the Seasonal Kendall test as a nonparametric test "based on the differences between observations in the same month of different years". It runs a Mann-Kendall statistic for each season and then combines them — [USGS OFR 81-488 / search summary](https://pubs.usgs.gov/of/1981/0488/report.pdf); [Helsel et al. 2020, USGS TM 4-A3, ch. 12 "Trend Analysis"](https://pubs.usgs.gov/publication/tm4A3)
- Helsel et al. (2020) ch. 12 has a "Dealing with seasonality" section covering the Seasonal Kendall test, mixture methods and regression with periodic (sine/cosine) terms. The 2020 edition also adds WRTDS for water quality — [USGS TM 4-A3](https://pubs.usgs.gov/publication/tm4A3) (section numbering taken from the 2002 TOC, [EPA copy](https://www.epa.gov/sites/production/files/2015-06/documents/twri4a3-new.pdf))
- pymannkendall exact function names: `original_test(x, alpha)`, `seasonal_test(x, alpha, period)` (Hirsch, Slack & Smith 1982), `correlated_seasonal_test(x, alpha, period)` (Hipel 1994), `multivariate_test`, `regional_test`, `sens_slope(x)` (Theil 1950 / Sen 1968), `seasonal_sens_slope(x, period=12)` (Hipel 1994). `period` is 12 for monthly and 52 for weekly. The tests return a named tuple `(trend, h, p, z, Tau, s, var_s, slope, intercept)`. For seasonal tests "a full period cycle counts as one unit time step", so the slope is per YEAR — [pyMannKendall README](https://github.com/mmhs013/pyMannKendall); package citation Hussain & Mahmud 2019, [JOSS 4(39):1556](https://joss.theoj.org/papers/10.21105/joss.01556)
- Own simulation (n = 300 monthly values, AR(1) noise with no trend, plus a seasonal cycle, α = 0.05): plain `seasonal_test` rejected 11% of the time at month-to-month φ = 0.2 and 21% at φ = 0.5. `correlated_seasonal_test` rejected 6% and 5% (close to the nominal 5%). Cause: the 12 per-month statistics are treated as independent, but adjacent months share weather — own simulation (`fp_mk.py`)
- Own simulation: MK on 25 annual means made from the same monthly AR(1) noise rejected 4.3% (φ = 0.2) and 7.5% (φ = 0.5). Annual averaging mostly removes month-to-month persistence — own simulation (`fp_mk.py`)
- pymannkendall input handling, read from the installed source (`.venv/Lib/site-packages/pymannkendall/pymannkendall.py`):
  - `seasonal_test`, `correlated_seasonal_test` and `seasonal_sens_slope` reshape the series to (years × period) and pad NaN only at the END. The series must therefore START at season 1 (January, or week 1), or the "seasons" will be misaligned.
  - `correlated_seasonal_test` goes through a helper that drops any row with a NaN (`x[~np.isnan(x).any(axis=1)]`), so one missing month removes that whole year.
  - `original_test` silently drops NaNs, which compresses the time axis: Sen's slope then counts per remaining point, not per month — local source read
- Speed on this machine (own benchmark): monthly n = 300 took `seasonal_test` 4 ms, `correlated_seasonal_test` 29 ms and `seasonal_sens_slope` 1.4 ms. Weekly n = 1300 (period 52) took `seasonal_test` 15 ms and `correlated_seasonal_test` 450 ms — own benchmark (`bench_mk.py`)

### Inferences
- When to use what:
  - (a) Annual-mean MK (what the app does now): fine as the one-line headline. It has robust p-values and is easy to explain, but it averages away season-specific change.
  - (b) Seasonal Kendall on monthly data (`correlated_seasonal_test` p + `seasonal_sens_slope`): a better "overall" test for strongly seasonal, skewed or gappy variables (AOD, PM2.5, NO2, fire counts). It is rank-based, needs no deseasonalizing step, and tolerates missing months. Its slope is the median of all same-month year-to-year slopes, i.e. "typical change per year".
  - (c) Plain MK on raw monthly values: never use it. The seasonal cycle dominates the ranks.
  - (d) MK on deseasonalized monthly anomalies: valid only with an autocorrelation correction (see §4).
- Heterogeneity pitfall: the Seasonal Kendall test assumes all seasons trend in the same direction. If summer rises and winter falls, the S values cancel and the overall test says "no trend". Always show the 12-month view beside it. The classic check is the van Belle & Hughes (1984) homogeneity chi-square, χ²_homog = Σ Z_m² − 12·Z̄², with 11 df. It is NOT in pymannkendall, takes about 5 lines of numpy, and I did not re-verify it from a primary source in this session.
- "Which months are changing" view (fast, about 12 × 1 ms):
  - For m in 1..12, run `mk.original_test(series[month==m])` and `mk.sens_slope(...)` on that month's ~25 yearly values.
  - Apply BH (`scipy.stats.false_discovery_control(p, method='bh')`) across the 12.
  - Plot a 12-bar chart of slope per decade, with bars coloured only when q < 0.05.
  - With n ≈ 25 per month, lag-1 year-to-year autocorrelation within a month is usually small, so `original_test` is acceptable here (supported by the annual-means simulation above). For fire counts and NO2, check it anyway.
- Seasons (DJF/MAM/JJA/SON) instead of 12 months: 4 tests means fewer multiple-testing problems and less noise per test (each value averages 3 months). This is probably the better default for students, with the 12-month view as a "zoom in".
- Units: seasonal Sen's slope is per year. Multiply by 10 for "per decade", which matches the existing `slope_per_decade`.
- For skewed, positive variables (AOD, PM2.5, NO2, fire counts), report a relative change: Sen's slope ÷ the median of the series × 100 = "% per year". Students compare places more fairly this way.

### Gaps
- Could not open the Helsel et al. (2020) ch. 12 text itself (458-page PDF). Its exact recommendations (minimum years per season, when to use the covariance-corrected SK, how to handle multiple values per season) are unverified here.
- Hirsch & Slack (1984), the covariance correction for serial dependence in SK, was not fetched. pymannkendall attributes its correlated version to Hipel (1994).
- The van Belle & Hughes homogeneity test formula is from memory, not verified this session.

---

## 2. Deseasonalizing: monthly-climatology anomalies vs. STL / MSTL; showing trend, seasonal and remainder to students

### Takeaway
For the statistics, the existing `monthly_anomaly()` (value minus that calendar month's average) is enough and is the easiest to explain ("how much warmer than a normal July"). Use STL (`statsmodels.tsa.seasonal.STL`, Cleveland et al. 1990) only for the picture: three stacked panels (smooth trend, seasonal pattern that can slowly change, leftover noise). That picture visually teaches "signal vs. noise", and with a long seasonal window it can show a seasonal cycle whose shape is changing. STL needs statsmodels added to requirements.

### Cited Findings
- STL signature: `STL(endog, period=None, seasonal=7, trend=None, low_pass=None, seasonal_deg=1, trend_deg=1, low_pass_deg=1, robust=False, seasonal_jump=1, trend_jump=1, low_pass_jump=1)`. `seasonal` must be odd and "should normally be >= 7". If not given, `trend` defaults to the "smallest odd integer greater than 1.5 * period / (1 - 1.5 / seasonal)". `robust=True` uses a weighted version that resists outliers. `period` must be supplied for ndarray input. The docs example fills missing values (ffill) before decomposing. Reference: Cleveland, Cleveland, McRae & Terpenning (1990), J. Official Statistics 6:3–73 — [statsmodels STL docs](https://www.statsmodels.org/stable/generated/statsmodels.tsa.seasonal.STL.html)
- MSTL signature: `MSTL(endog, periods=None, windows=None, lmbda=None, iterate=2, stl_kwargs=None)`. It handles multiple seasonal periods. `windows` defaults to `7 + 4*np.arange(1, n+1)`. `lmbda="auto"` applies a Box-Cox transform first. The docs example uses hourly data with periods 24 and 24*7. Reference: Bandara, Hyndman & Bergmeir (2021) arXiv:2107.13462 — [statsmodels MSTL docs](https://www.statsmodels.org/stable/generated/statsmodels.tsa.seasonal.MSTL.html)
- The existing code already computes climatology anomalies: `monthly - monthly.groupby(monthly.index.month).transform("mean")` — [local trends.py](../../data_pipeline/analysis/trends.py)

### Inferences
- Climatology anomalies vs. STL:
  - Anomalies assume a FIXED seasonal shape. They are transparent, exact, have no tuning knobs and handle NaN natively (groupby mean skips NaN). Use them as the input to all tests.
  - STL lets the seasonal shape evolve. `seasonal` = number of years in the seasonal smoother; a large odd value such as `seasonal=13` is close to fixed, and `seasonal=7` lets it drift. STL also gives a smooth, nonlinear trend line. Downsides: tuning choices, no NaN support (gaps must be filled), and edge effects in the first and last ~year of the trend.
  - Do NOT run significance tests on the STL trend component. It is a smoothed curve, heavily autocorrelated by construction, so a MK test on it would almost always come out "significant".
- What to show students (3 stacked panels, shared x-axis):
  - Trend: "the slow change, after removing the yearly rhythm and the random wiggles"
  - Seasonal: "the repeating yearly rhythm (cold winters, hot summers)"
  - Remainder: "everything else — weather, measurement noise, unusual events"
  - A visual ratio of the remainder's spread to the trend's total rise is an intuitive "signal-to-noise" lesson that feeds straight into the "years needed" calculation (§3).
- MSTL is for series with 2+ periods (e.g., hourly with daily + weekly cycles). Natural Earth variables in daily POWER data have a yearly cycle but no physical 7-day cycle. MSTL is only relevant if hourly data or human-driven pollutants (daily NO2 with a weekday/weekend cycle) are added. The app's NO2 is monthly, so MSTL is not needed.
- For daily data, STL with `period=365` on 9,000+ days is heavier. Compute it once per location and cache it, or decompose the monthly series instead. (STL runtime was not measured because statsmodels is not installed.)
- Anomaly baseline choice: the full-period mean (2001–2025) is what `monthly_anomaly()` does. That is fine for trends (the slope does not depend on the baseline), but for "how unusual is this month" language a fixed baseline (e.g., 2001–2020) should be stated explicitly.

### Gaps
- STL runtime on 300 monthly or 9,000 daily points was not benchmarked (statsmodels absent from the venv).
- The `DecomposeResult` attribute names (`.trend`, `.seasonal`, `.resid`, `.weights`) were not confirmed on the fetched docs page. They are standard in statsmodels but should be checked on install.

---

## 3. Weekly series from daily data; is a weekly trend meaningful over 25 years; minimum record length (Weatherhead et al. 1998)

### Takeaway
Weekly series are good for LOOKING at the data (seeing heat waves, smoke events, fire bursts), but they do not make a long-term trend easier to detect than monthly or annual averages of the same days: the information content is the same, and weekly values are just noisier and more autocorrelated. Use the Weatherhead et al. (1998) formula to tell students how many years a trend of a given size needs. With realistic monthly noise, a 0.3 °C/decade warming at a single US location needs roughly 25–45 years for a 90% chance of reaching p < 0.05. That is exactly the challenge's "sometimes all a trend needs is a longer series".

### Cited Findings
- Weatherhead et al. (1998), JGR 103(D14):17149–17161, doi:10.1029/98JD00995. The years needed to detect a trend "is strongly dependent on, and increases with, the magnitude of variance (σN²) and autocorrelation coefficient (φ) of the noise". For a 5%/decade trend in their environmental examples, the record needed ranged from ~10 to >20 years. The paper also gives formulas for the effect of interventions (level shifts) on trend detection — [UCAR impacts abstract page](https://impacts.ucar.edu/en/publications/factors-affecting-the-detection-of-trends-statistical-considerati/) (summarised via search)
- Primary statement by Weatherhead (2006 NASA CERES slides): number of years needed ≈ n = { (2·σN / |ω0|) · sqrt((1+φ)/(1−φ)) }^(2/3), "assuming that detection is declared at the 95% confidence level", and "this estimate allows for 50% likelihood of detection". The slides list what improves detection: where, how frequently and how accurately we monitor, and how well we understand the data. They also note that "one point can make a large difference on seven year trends" — [Weatherhead & Hinkelman 2006, CERES STM slides](https://ceres.larc.nasa.gov/documents/STM/2006-05/weatherhead_CER0605.pdf) (text extracted locally from the PDF)
- The commonly used 90%-power version replaces 2 with 3.3: n* = [ (3.3·σN/|ω0|)·sqrt((1+φ)/(1−φ)) ]^(2/3). A search snippet states "the constant 3.3 ensures a 90% probability of detecting the trend at the 95% confidence" level; it was used in Henson et al. (2010) to show ~40 years of satellite chlorophyll are needed to separate a climate trend from natural variability (20–30 years at the equator) — [Henson et al. 2010, Biogeosciences 7:621](https://bg.copernicus.org/articles/7/621/2010/) (the 3.3 sentence came from search results, see Gaps)
- The general power derivation gives the same structure: n = [ (z₁₋α + z₁₋β)·(σ/β)·sqrt((1+φ)/(1−φ)) ]^(2/3). The standard error of an OLS slope under AR(1) noise is σ_β ≈ (σ/n^(3/2))·sqrt((1+φ)/(1−φ)); the 2/3 exponent comes from that n^(3/2). Large-sample approximation; simulate for small samples — [Holbert, power derivation under AR(1)](https://www.cfholbert.com/blog/mann-kendall-power-deriavation/). (1.96 + 1.28 = 3.24 ≈ 3.3 for 90% power; 1.96 + 0 ≈ 2 for 50% power.)
- Own computation of n* (3.3 version) for a trend of 0.3 units/decade, where σN = SD of deseasonalized monthly noise and φ = lag-1 autocorrelation (`years_needed.py`):

  | σN (monthly) | φ = 0 | φ = 0.2 | φ = 0.5 |
  |---|---|---|---|
  | 0.5 | 14.5 yr | 16.6 yr | 20.9 yr |
  | 1.0 | 23.0 yr | 26.3 yr | 33.1 yr |
  | 1.5 | 30.1 yr | 34.4 yr | 43.4 yr |
  | 2.0 | 36.4 yr | 41.7 yr | 52.6 yr |

  With the 50%-chance constant (2), φ = 0.2: 11.9 / 18.8 / 24.7 / 29.9 yr for σN = 0.5 / 1 / 1.5 / 2.
- Own simulation checking the units and the aggregation question: daily AR(1) noise (φ_daily = 0.7, SD 3 °C, 25 years × 364 days, 400 runs) was aggregated to daily, weekly, 28-day "monthly" and annual means, and an OLS slope fitted. The SD of the fitted slope was 0.101 per decade at EVERY aggregation level. The Weatherhead SE with monthly σN = 1.29 and n = 25 years predicts 1.29/25^1.5 = 0.0103/yr = 0.103/decade, which matches. In the same run, weekly means had SD 2.11 with lag-1 autocorrelation 0.26, and monthly means had SD 1.29 with autocorrelation ≈ 0 — own simulation (`years_needed.py`)

### Inferences
- Is weekly trend detection meaningful over 25 years? For a trend in the MEAN, weekly data give no extra power over monthly or annual means (same days, same slope precision; see the simulation). They add autocorrelation and 52 "seasons" with noisy climatologies (~25 values each). A weekly Seasonal Kendall (`period=52`) also has strongly correlated adjacent weeks: the plain test is inflated, and the corrected one costs ~450 ms.
- Recommended split:
  - Weekly = exploration and visualization: the weekly anomaly line, weekly extreme-day counts, the timing of seasonal events.
  - Trend numbers = monthly (Seasonal Kendall / per-month) or annual.
  - If a weekly trend number is shown, compute it with a lag-limited modified MK on weekly anomalies (§4) and caption it "same answer as monthly, just noisier".
- Real data are worse than the simulation. It had no interannual or decadal variability (ENSO, drought years), which inflates σN at low frequencies, so the real years needed are larger than the table.
- Weekly aggregation choices:
  - ISO weeks (`pd.Series.index.isocalendar().week`): standard, but some years have 53 weeks and weeks straddle years. That breaks `period=52` reshaping.
  - Fixed 7-day blocks from Jan 1 (`week = min((dayofyear-1)//7, 51)`, putting day 365/366 into week 52): always 52 per year and aligned across years. Recommended for any seasonal or week-of-year statistic.
  - Rolling 7-day means: smooth, but overlapping windows create strong autocorrelation. Use them for display only, never for tests.
  - Counts of extreme days per week (e.g., days above the local 90th percentile for that week-of-year): an integer 0–7, very noisy. Aggregate to month or season before testing.
- Precipitation weekly sums are zero-inflated and skewed. Use counts of wet days or heavy-rain days, or rank tests; never OLS on raw weekly totals.
- App feature that directly serves the challenge: compute and show "years needed" from the user's own series:
  - σN = SD of the monthly anomaly residuals after removing a linear trend
  - φ = lag-1 autocorrelation of those residuals
  - ω0 = either the observed slope or a student-chosen "change I care about"
  - Show: "With this much natural up-and-down, a change this size needs about N years to show up clearly 9 times out of 10. You have 25."
  - Cost: a few numpy lines, microseconds.
  - Caveats: n* is uncertain because σN and φ are themselves estimated. Weatherhead (1998) gives an uncertainty factor (not retrieved). Present the result rounded ("about 30–40 years").

### Gaps
- Could not retrieve the full Weatherhead et al. (1998) paper (403 at the Harvard mirror; the 2000 JGR follow-up PDF is a scanned image). Not verified first-hand: the exact 90%-power constant 3.3 wording, the uncertainty bounds on n*, and the level-shift (intervention) formula. The 2-constant / 50% version is verified from Weatherhead's own slides. The 3.3 / 90% version is consistent with the generic power formula (z-values) but its exact attribution sentence came from a search snippet.
- No source found giving typical σN and φ for monthly US temperature, AOD, NO2 or PM2.5 anomalies. The app should estimate them from the data rather than assume them.

---

## 4. Serial autocorrelation in monthly/weekly data: modified MK (Hamed & Rao 1998; Yue & Wang 2004), prewhitening / TFPW, block bootstrap; effect on p-values

### Takeaway
Positive autocorrelation makes p-values too small: in my runs, monthly anomalies with φ = 0.5 gave the plain MK test a 23% false-alarm rate instead of 5%. The safest fast choices for monthly or weekly anomalies are:
- `hamed_rao_modification_test(x, lag=3)`, or
- `pre_whitening_modification_test`, or (for raw monthly data) `correlated_seasonal_test`.

Do NOT use pymannkendall's `yue_wang_modification_test` with its default `lag=None` (about 50% false alarms in my runs) or TFPW (inflated). For annual means, plain MK is roughly fine.

### Cited Findings
- pymannkendall modified tests: `hamed_rao_modification_test(x, alpha, lag)` (Hamed & Rao 1998), `yue_wang_modification_test(x, alpha, lag)` (Yue & Wang 2004), `pre_whitening_modification_test(x, alpha)` and `trend_free_pre_whitening_modification_test(x, alpha)` (Yue & Wang 2002). The README says the original test assumes no serial correlation — [pyMannKendall README](https://github.com/mmhs013/pyMannKendall)
- Implementation details read from the installed pymannkendall 1.4.3 source:
  - Hamed-Rao: detrends with Sen's slope, ranks the detrended series, then sums only autocorrelations of ranks that fall outside ±z/√n. The variance is multiplied by n/n*_s = 1 + 2/(n(n−1)(n−2)) · Σ (n−k)(n−k−1)(n−k−2)·ρ_k. With `lag=None` it scans ALL lags up to n.
  - Yue-Wang: detrends, then multiplies Var(S) by 1 + 2·Σ (1 − k/n)·ρ_k over ALL lags up to n, with NO significance screening when `lag=None`.
  - Prewhitening: x_t − r₁·x_{t−1} on the raw series.
  - TFPW: detrend, prewhiten, then add the trend back.
  
  Source: local file `.venv/Lib/site-packages/pymannkendall/pymannkendall.py`, lines ~287–470.
- Own simulation, false-alarm rate at α = 0.05 with no true trend, n = 300 monthly anomalies, 200 runs (`fp_mk.py`):

  | test | φ = 0.2 | φ = 0.5 |
  |---|---|---|
  | `original_test` | 0.105 | 0.230 |
  | `hamed_rao_modification_test` (default all lags) | 0.110 | 0.140 |
  | `hamed_rao_modification_test(lag=3)` | 0.060 | 0.060 |
  | `yue_wang_modification_test` (default all lags) | 0.490 | 0.520 |
  | `yue_wang_modification_test(lag=1)` | 0.050 | 0.110 |
  | `pre_whitening_modification_test` | 0.045 | 0.060 |
  | `trend_free_pre_whitening_modification_test` | 0.115 | 0.320 |
  | `seasonal_test` (raw series) | 0.110 | 0.210 |
  | `correlated_seasonal_test` (raw series) | 0.060 | 0.050 |

- In one benchmark run, `hamed_rao_modification_test` (default lag) returned p = NaN with "RuntimeWarning: invalid value encountered in sqrt". The corrected variance went negative. Guard for this — own benchmark (`bench_mk.py`)
- Serinaldi & Kilsby (2016, SERRA):
  - Autocorrelation causes "a general increase of the rejection rate" of no-change tests even when no change is present.
  - Prewhitening gives "rejection rates reasonably close to the nominal values".
  - Deterministic (gradual or abrupt) changes "strengthen the autocorrelation", which biases the correction parameters.

  Source: [Serinaldi & Kilsby 2016, Stoch. Environ. Res. Risk Assess.](https://link.springer.com/article/10.1007/s00477-015-1041-5)
- Under AR(1) noise the slope SE is inflated by sqrt((1+φ)/(1−φ)): ×1.22 at φ = 0.2 and ×1.73 at φ = 0.5 — [Holbert derivation, Eq. 10](https://www.cfholbert.com/blog/mann-kendall-power-deriavation/)

### Inferences
- Recommended defaults per series type:
  - Annual (25 values): `original_test`, as now. Optionally report lag-1 autocorrelation and switch to `hamed_rao_modification_test(lag=1)` if it is above ~0.3.
  - Monthly anomalies: `hamed_rao_modification_test(x, lag=3)`. If p is NaN, fall back to `pre_whitening_modification_test`. Report `sens_slope` × 12 × 10 = per decade.
  - Monthly raw: `correlated_seasonal_test(x, period=12)` + `seasonal_sens_slope`.
  - Weekly anomalies: `hamed_rao_modification_test(x, lag=3)` (~30 ms). Prefer the monthly result for the headline.
- Why the default Yue-Wang fails: the sample autocorrelations of a mean-removed series over all lags sum to about −½. Including every lag drives the variance factor toward 0, which makes the p-value tiny. Always pass `lag` explicitly (1–3).
- Plain prewhitening removes part of the trend along with the autocorrelation. It has good false-alarm control but lower power, so it can say "not significant" for a real trend. That is acceptable for an honest student tool: false "significant" claims are worse.
- Block bootstrap (not in pymannkendall; a numpy-only option for a CI on the slope):
  - Resample the detrended anomaly residuals in contiguous blocks (12-month blocks for monthly data keep a year's persistence together).
  - Add them back to the fitted line, refit OLS, and repeat ~1,000×.
  - Fully vectorized, this is a few ms. Gives a slope CI that respects autocorrelation.
  - Good as an "advanced" toggle. Not needed if Hamed-Rao is used for p.
- The existing OLS 95% CI in `trend_stats` assumes independent residuals. On monthly data it would be too narrow by about sqrt((1+φ)/(1−φ)). Either inflate it by that factor (simple, explainable) or bootstrap.
- Student explanation: "Weather has memory — a warm month is often followed by another warm month. That makes random runs look like trends, so we use a version of the test that accounts for this memory. It's harder to pass, on purpose."

### Gaps
- Did not fetch Hamed & Rao (1998) or Yue & Wang (2002, 2004) originals. The formulas above come from the pymannkendall implementation, not the papers. Literature critiques of TFPW (e.g., inflated type I error) were not retrieved; the inflation here is from my own simulation only.
- No source retrieved for block-length rules for the block bootstrap (e.g., Künsch 1989; Wilks 1997).

---

## 5. Season effects: change in seasonal-cycle amplitude, shifts in timing, season-specific trends; how to measure a timing shift

### Takeaway
Turn each year into a few "season shape" numbers, then trend-test those 25 numbers with plain MK + Sen's slope:
- (a) seasonal amplitude: the first-harmonic amplitude, or summer-mean minus winter-mean
- (b) timing: the first-harmonic phase converted to days, or a threshold-crossing date (last spring frost / first fall frost from daily T2M_MIN), or a percentile/centroid date for fires
- (c) season length: e.g., frost-free days, hot-season length, fire-season length
- (d) season-specific means: DJF, MAM, JJA, SON

These are the most "pattern-finding" and student-engaging results ("spring's last frost is coming X days earlier per decade").

### Cited Findings
- Stine, Huybers & Fung (2009, Nature 457:435–440) measured the phase and amplitude of the annual cycle of surface temperature. The phase over extratropical land shifted "towards earlier seasons by 1.7 days between 1954 and 2007", with significant amplitude changes too. Small changes in the annual cycle can matter "even if they do not change the annual mean temperature". The data were CRU gridded monthly temperatures — [IDEAS/RePEc abstract](https://ideas.repec.org/a/nat/nature/v457y2009i7228d10.1038_nature07675.html); [Berkeley press release](https://newsarchive.berkeley.edu/news/media/releases/2009/01/21_seasons.shtml); [PDF](https://phuybers.sites.fas.harvard.edu/Doc/Stine_Nature2009.pdf)
- EPA "Length of Growing Season" indicator, updated June 2024 with data through 2023:
  - The season is defined as the period between the last frost of spring and the first frost of fall, when air temperature drops below freezing.
  - The contiguous-48 average has grown more than two weeks since the early 1900s, with a "particularly large and steady increase" since the 1970s, faster in the West than in the East.
  - The last spring frost is now earlier than at any time since 1895.
  - The season has become slightly shorter in Georgia.
  - The indicator is shown as 11-year moving averages, and its analysis comes from Kunkel et al. (2004) and updates.

  Source: [EPA indicator](https://epa.gov/climate-indicators/climate-change-indicators-length-growing-season); [technical documentation](https://www.epa.gov/system/files/documents/2024-06/growing-season_documentation.pdf)
- Jolly et al. (2015, Nature Communications 6:7537) defined fire weather season length as "the number of days each year when fire danger is above half its value range". Globally it increased 18.7% from 1979 to 2013, and the burnable area affected by long fire-weather seasons doubled (+108.1%) — [IDEAS/RePEc](https://ideas.repec.org/a/nat/natcom/v6y2015i1d10.1038_ncomms8537.html); [PDF](https://courses.seas.harvard.edu/climate/eli/Courses/global-change-debates/Sources/Forest-fires/global/Jolly-etal-2015-global-fires.pdf)
- EPA has a broader report on climate change and seasonality — [EPA 2021 seasonality report](https://www.epa.gov/system/files/documents/2021-12/30339_epa_report_climate_change_and_seasonality_v12_release_508.pdf) (not read in detail)

### Inferences
Metrics with numpy recipes. All are per-year scalars, followed by `mk.original_test` + `mk.sens_slope` on 25 values, each <1 ms.

1. **Amplitude and phase (first harmonic), from monthly values in year y:**
   - Monthly values x_m at t_m = (m − 0.5)/12, for m = 1..12.
   - a = (2/12)·Σ x_m cos(2π t_m) and b = (2/12)·Σ x_m sin(2π t_m).
   - Amplitude A = √(a²+b²) (half the peak-to-trough swing of a pure sine).
   - Peak timing t_peak = atan2(b, a)/(2π) as a year fraction, then × 365.25 = day of year. Unwrap across years before trending.
   - Works from monthly data with sub-monthly precision because it uses all 12 months (the Stine et al. approach).
   - Pitfalls: (i) if spring and fall change differently, the phase moves even without a literal "earlier season"; (ii) a bimodal cycle (two fire seasons, some precipitation regimes) makes the first harmonic meaningless. Check what share of the seasonal variance the first harmonic explains and only show the phase if it is high (e.g., >80%).
2. **Simple amplitude:** JJA mean − DJF mean per year (or warmest-month − coldest-month). Easier to explain ("the gap between summer and winter is shrinking by X °C per decade").
3. **Threshold-crossing dates from daily POWER data:**
   - Last spring frost = last day before Jul 1 with T2M_MIN ≤ 0 °C.
   - First fall frost = first day after Jul 1 with T2M_MIN ≤ 0 °C.
   - Frost-free season = the difference between the two (EPA definition).
   - Hot season: first and last day with T2M_MAX ≥ a threshold (e.g., 32 °C / 90 °F, or the local 90th percentile), plus the count of such days.
   - Pitfalls: these dates are noisy (single-day events), undefined where frost never or always happens (Miami, high mountains), so return "not applicable" rather than NaN, which matches the existing constant-series handling. Also, the 0 °C threshold applies to air temperature at 2 m; MERRA-2 grid-cell means are smoother than station minima, so frost dates will differ from local station records.
4. **Fire season from FIRMS daily detections:**
   - Per year, the dates by which 10%, 50% and 90% of that year's detections occurred.
   - Season length = d90 − d10. Centroid = 50% date, or the circular mean of day-of-year weighted by counts.
   - Require a minimum annual count (e.g., ≥20 detections) or the dates are meaningless.
   - Bimodal regions (Southeast spring burning + fall) need the percentile method rather than the first harmonic.
   - FIRMS counts depend on satellite overpasses and cloud cover; detections are a proxy, not burned area.
5. **Season-specific trends:**
   - DJF/MAM/JJA/SON means per year, each MK + Sen's slope, with BH across 4.
   - To test "summer warming faster than winter", run MK on the per-year series (JJA − DJF), not a comparison of two p-values. "One significant and one not" does not mean they differ.
   - December belongs to the following winter. With data starting Jan 2001, the first DJF is incomplete; drop it.
6. **Season-of-maximum view for pollutants:** per year, the month with the highest NO2 or PM2.5. Show it as a strip; a trend test on an integer month is weak, so present it descriptively.
- Month × year heatmap (already in the app): add a third view, "anomaly heatmap". Colour each cell by its z-score for that calendar month (see §7) so students can spot seasons that changed: e.g., a column band of red Julys in recent years.

### Gaps
- No source fetched with a US-specific, recent (2001–2025) measured shift in temperature phase or in FIRMS-based fire season length. The Stine et al. result is extratropical-land-wide (1954–2007), Jolly et al. is global (1979–2013), and EPA covers 1895–2023.
- The ">80% variance explained" cutoff for showing the harmonic phase is my rule of thumb, not sourced.

---

## 6. Change points and regime shifts: Pettitt, PELT / ruptures, BFAST; when they mislead

### Takeaway
Change-point tests are easy to compute but easy to misread. A gradual trend, autocorrelation, or a change in instrument or data stream can all produce a "change point". If offered at all, present a single Pettitt test (numpy only, ~1 ms) on deseasonalized anomalies as "the year when the average shifted most". Show it next to the MK trend, use cautious language, and include an explicit note that satellite record changes (sensor degradation, product versions) can cause jumps. PELT/ruptures and BFAST add dependencies and tuning (penalty) that are hard to explain to students. Skip them or keep them for precomputed exploration.

### Cited Findings
- Serinaldi & Kilsby (2016): serial correlation affects the Pettitt test "more than tests for slowly varying monotonic trends such as the MK test", both for short-range and long-range persistence. Prewhitening improves type-I error control. Deterministic gradual or abrupt changes strengthen the apparent autocorrelation — [Serinaldi & Kilsby 2016](https://link.springer.com/article/10.1007/s00477-015-1041-5)
- The same literature notes that conventional trend and change-point tests do not adequately distinguish gradual from abrupt change. Rougé et al. (2013) proposed combining MK and Pettitt statistics to classify a change as gradual or abrupt — [via search summary of Serinaldi & Kilsby / related work](https://link.springer.com/article/10.1007/s00477-015-1041-5) (Rougé et al. not fetched directly)
- A Federal Reserve Bank of Cleveland working paper found the Pettitt test performed less favourably than alternatives, especially in small samples — [FRB Cleveland WP 1995-17](https://fraser.stlouisfed.org/files/docs/historical/frbclev/wp/frbclv_wp1995-17.pdf)
- ruptures PELT: `rpt.Pelt(model="l1"|"l2"|"rbf", min_size=..., jump=...).fit(signal).predict(pen=...)`. `min_size` = minimum distance between change points, `jump` = candidate grid spacing. Average cost is O(CKn) under conditions on change-point placement. The page gives no guidance on choosing `pen`. Reference: Killick, Fearnhead & Eckley (2012), JASA 107:1590–1598 — [ruptures PELT docs](https://centre-borelli.github.io/ruptures-docs/user-guide/detection/pelt/)

### Inferences
- Pettitt (1979), standard form, not re-verified this session: U_t = Σ_{i≤t} Σ_{j>t} sign(x_j − x_i), K = max_t |U_t|, approximate p ≈ 2·exp(−6K²/(n³ + n²)). It is O(n²) in numpy, trivial for 300 monthly or 25 annual values. Run it on anomalies and apply the same autocorrelation caution as MK (prewhiten first, or treat p as optimistic).
- When change points mislead:
  - (1) A steady trend always yields a "most likely break" near the middle of the series, so Pettitt "detects" a step in a pure trend. Never show a change point without the trend alongside, and never use it alone as evidence of a "regime shift".
  - (2) Autocorrelated noise produces spurious breaks (cited above).
  - (3) Data-stream changes create real-looking jumps unrelated to the Earth: instrument degradation, MERRA-2 production-stream or observing-system changes, OMI row anomaly effects, the MODIS Terra + Aqua combination in FIRMS. Treat these as possible explanations to check, not as conclusions; verify against product documentation.
  - (4) Near the ends of a 25-year series, breaks are poorly constrained.
- PELT needs a penalty (e.g., BIC-like pen ≈ 2σ²·ln n for the l2 cost, again not sourced). Results depend strongly on it, which is a poor fit for a "press a button" student tool. ruptures is also not installed.
- BFAST (breaks for additive season and trend) is mainly an R package. I found no well-maintained, documented Python equivalent in this session. Not recommended for this app.
- Student wording: "The biggest shift in the average happened around 2012 (p = 0.03). This might be a real change in the environment — or a change in the satellite or model data. A steady rise can also look like a jump to this test."

### Gaps
- Pettitt formula and p-approximation are from memory (Pettitt 1979, Applied Statistics). Rougé et al. (2013) and BFAST (Verbesselt et al. 2010) papers not fetched. No source checked for specific known discontinuities in MERRA-2, OMI NO2 or FIRMS over 2001–2025.

---

## 7. Anomalies and extremes as patterns: z-scores per calendar month, percentiles, extreme-day counts, record-breaking frequency

### Takeaway
Calendar-month standardized anomalies (z-scores) and percentile-based extreme-day counts turn raw values into "how unusual" numbers that are comparable across seasons and places. They power the anomaly heatmap and simple statements ("this July was the 3rd hottest of 25"). Record-breaking counts are a striking, theory-backed pattern: without a trend, the chance that year t sets a record is 1/t, and record highs and lows occur about equally often. The US 2000s showed ~2 record highs per record low.

### Cited Findings
- Meehl et al. (2009): from Jan 2000 to Sep 2009 the contiguous US set 291,237 daily record highs and 142,420 record lows (~2:1). The ratio was >2:1 in the West and ~1.5:1 in the East. Without warming the counts "would be approximately even". The imbalance came more from few record lows (night-time warming) than from many record highs — [AGU press release](https://news.agu.org/press-release/daily-record-high-temperatures-occurred-twice-as-often-as-record-lows-over-past-decade/)
- A 2016 follow-up found the earlier model overstated the recent ratio; observed ≈ 2:1 over the prior decade — [UCAR news 2016](https://news.ucar.edu/124082/days-record-breaking-heat-ahead)

### Inferences
- Z-score per calendar month: z_{y,m} = (x_{y,m} − mean_m)/sd_m, with mean_m and sd_m computed over a stated baseline (e.g., all 2001–2025 years, or 2001–2020).
  - Pitfalls: (i) with a trend inside the baseline, recent z-scores shrink. State the baseline and consider an early baseline for "how unusual vs. the early 2000s". (ii) sd_m from 25 values is noisy. (iii) For skewed variables (AOD, PM2.5, NO2, fire counts) z-scores mislead. Use percentile ranks within the calendar month instead (`scipy.stats.percentileofscore` or rank / (n+1)), or z-scores of log values.
- Extreme-day counts from daily POWER:
  - Threshold = the local 90th percentile of T2M_MAX for that calendar month (or a ±7-day window around the calendar day), over the baseline.
  - Per month, count the days exceeding it. Under no change the expected count is ~10% of days (~3 per month), a nice built-in "null" for students.
  - Trend-test the monthly or seasonal counts with Seasonal Kendall, or the annual counts with MK.
  - Fixed absolute thresholds (days ≥ 32 °C, frost days ≤ 0 °C, wet days ≥ 1 mm) are easier to explain but are zero in many places and months (the existing code already handles constant series).
  - (This mirrors ETCCDI-style indices like TX90p; that definition was not fetched this session.)
- Records:
  - For a stationary, independent series, P(year t is a record high) = 1/t, and the expected number of records in n years is H_n = Σ 1/k ≈ ln n + 0.577 (≈3.8 for n = 25).
  - For daily records: with 25 years of data, each calendar day has about a 1/25 = 4% chance of a new record high (and 4% of a record low) in the final year under no change.
  - Student activity: per year, count the calendar days that set a new record high and a new record low (within this dataset), plot the ratio, and compare with the "equal" line. Use a burn-in (count records only from year ~11), since early years are records by default.
  - Caution: these are dataset records over 25 years of reanalysis grid values, not official station records. Say so.
- Patterns students can find with these tools: the anomaly heatmap (month × year, z or percentile), the "top-5 most unusual months" list, extreme-day counts by month (which months gained hot days), the record-high / record-low ratio by year, and smoke-season PM2.5 / AOD spikes in fire years (cross-linking FIRMS).

### Gaps
- No source fetched for ETCCDI index definitions, NOAA anomaly baseline conventions (e.g., 1991–2020 normals), or record statistics theory (1/t). The theory is standard probability but not cited here.

---

## 8. Multiple testing for 12 monthly trends or many weeks (BH-FDR) and "field significance"

### Takeaway
Showing 12 monthly p-values at α = 0.05 gives a 46% chance that at least one month looks "significant" by luck alone (93% for 52 weeks). Apply Benjamini-Hochberg FDR across the set being shown (12 months, 4 seasons, or grid cells), reusing the `scipy.stats.false_discovery_control` already in the codebase. Also report a single overall test (Seasonal Kendall) as the "field" answer: "is anything changing at all?"

### Cited Findings
- Wilks (2016), "'The stippling shows statistically significant grid points': How research results are routinely overstated and overinterpreted, and what to do about it", BAMS 97(12):2263–2273, doi:10.1175/BAMS-D-15-00267.1. It reviews the multiple-testing problem in atmospheric science and recommends controlling the false discovery rate as "principled" and computationally easy — [AMS 2016 conference abstract](https://ams.confex.com/ams/96Annual/webprogram/Paper276937.html); [bibliographic record](https://bibsonomy.org/bibtex/282b206c5e7233eadc201d54af6279d72/pbett)
- FDR control limits the fraction of significant grid-point results that are spurious, which makes the spatial pattern interpretable. FDR-based field significance is nearly equivalent to (slightly more powerful than) judging field significance by the minimum local p-value — [AMS abstract](https://ams.confex.com/ams/96Annual/webprogram/Paper276937.html) and related field-significance work (via search summary)
- In practice: sort the p-values, find the largest p_(i) ≤ (i/N)·α_global, and mask points above that critical value. An example implementation used a global level of 0.05 — [NOAA PMEL Ferret users list, 2016](https://pmel.noaa.gov/maillists/tmap/ferret_users/fu_2016/msg00346.html)
- The app already computes BH q-values for the US grid map with `scipy.stats.false_discovery_control` — [local trend_field.py](../../data_pipeline/tools/trend_field.py)

### Inferences
- Arithmetic: P(≥1 false positive among k independent nulls) = 1 − 0.95^k = 46% for k = 12, 19% for k = 4 and 93% for k = 52. Expected false positives = 0.6 (12 months) or 2.6 (52 weeks).
- Practical rule for the UI: colour a month or season bar as "clear trend" only if its BH q < 0.05. Show the raw p in a tooltip. Add a small caption: "We checked 12 months, so we used a stricter bar."
- BH remains valid under positive dependence between tests (neighbouring months, neighbouring grid cells). That property is from Benjamini & Yekutieli (2001), not fetched.
- The family should be what the student sees at once. Per-month tests on one variable at one place = 12. If several variables are shown side by side, either correct per variable (simpler, explainable) or across all tests on screen (stricter). Pick one and state it.
- Weekly: do not show 52 per-week trend significances to students. The multiple-testing burden plus noise makes them nearly useless. Show the weekly picture and test at month or season level.
- Field significance for the map: the existing BH map already answers "which cells are changing". Add one sentence: "Of N grid cells, X% show a clear trend after correcting for testing many places at once."

### Gaps
- Could not fetch the Wilks (2016) full text (403). The recommendation I recall, using α_FDR = 2·α_global when spatial correlation is moderate to strong, and the paper's survey statistics on how often papers ignore multiple testing, are UNVERIFIED and should not be quoted without checking.

---

## 9. Honest plain-language explanations for students

### Takeaway
Every result card should say four things in plain words: (1) the size and direction of change with units and a range, (2) whether it is distinguishable from natural ups and downs, with "not clear yet" instead of "no trend", (3) the period covered and the caveat that this is a description, not a forecast, and (4) for non-significant results, roughly how many years such a change needs (Weatherhead). That last point directly operationalizes the challenge's "a longer series may be needed".

### Cited Findings
- Weatherhead's own framing: "Can we distinguish between cases where there are no trends and cases where we haven't monitored long enough?" Detection improves with where, how often and how accurately we monitor, and how well we understand the data — [Weatherhead & Hinkelman 2006 slides](https://ceres.larc.nasa.gov/documents/STM/2006-05/weatherhead_CER0605.pdf)
- "Without warming, record highs and lows would be about even" is a concrete, published null expectation that students can test themselves — [AGU 2009](https://news.agu.org/press-release/daily-record-high-temperatures-occurred-twice-as-often-as-record-lows-over-past-decade/)
- Small changes in timing can matter "even if they do not change the annual mean" — [Berkeley 2009 press release on Stine et al.](https://newsarchive.berkeley.edu/news/media/releases/2009/01/21_seasons.shtml)
- The existing app already uses the honest label "Not significant yet" — [local trends.py](../../data_pipeline/analysis/trends.py)

### Inferences
Templates (fill-in fields in {braces}). All are my drafting; adjust tone in user testing.
- **Overall (Seasonal Kendall):** "From {2001}–{2025}, {NO2} over {Wisconsin} fell by about {2.1%} per year ({range}). Comparing each month only with the same month in other years, a steady change this large would show up by chance less than {1 in 100} times (p = {0.008})."
- **Per-month view:** "July is warming about {0.5 °C} per decade — a clear trend even after checking all 12 months. January's change ({−0.2 °C} per decade) is smaller than its normal year-to-year swings, so we can't call it a trend yet."
- **Not significant + years needed:** "Not clear yet. This place's {AOD} jumps around a lot from month to month, and a change of this size usually needs about {35} years of data to stand out reliably. We have {25}. This doesn't mean nothing is changing — it means the data can't tell yet."
- **Autocorrelation caveat (tooltip):** "Weather has memory: a smoky month is often followed by another one. We used a version of the test that accounts for this, so it is harder to pass on purpose."
- **Season timing:** "The last spring frost now comes about {4} days earlier per decade (2001–2025). The frost-free season grew by about {9} days per decade."
- **Amplitude:** "The gap between the hottest and coldest months is shrinking by {0.3 °C} per decade: winters are warming faster than summers here."
- **Extremes:** "In 2001–2005, July had on average {3} 'unusually hot' days (hotter than 90% of July days in this record). In 2021–2025 it had {7}."
- **Records:** "If the climate were steady, new record highs and record lows would be about equally common. Here, from 2011–2025 there were {1.8} record-high days for every record-low day."
- **Change point:** "The biggest shift in the average was around {2012}. This could be a real environmental change, a change in the satellite/model data, or simply what a steady rise looks like to this test."
- **Multiple testing:** "We tested 12 months. With 12 tries, one month can look 'significant' by luck, so we used a stricter bar."

Wording rules:
- Say "no clear trend" or "not clear yet", never "no trend" or "no change".
- Never say a p-value is "the chance the trend is real". Say "how often chance alone would give a change this big".
- Always give the period.
- Never extend the line beyond the data (the app already enforces "never extends the line").
- Give relative (%) change for skewed pollutant and fire variables, absolute change for temperatures.
- Use "per decade" consistently.
- Label reanalysis (MERRA-2) values as model-plus-observation estimates, not measurements.

Recommended minimal computation set per location request (all sub-second with existing deps; total well under 100 ms from the benchmarks above):
1. `monthly_anomaly()` (exists)
2. `correlated_seasonal_test(raw_monthly, period=12)` + `seasonal_sens_slope` → overall
3. 12 × (`original_test` + `sens_slope`) per calendar month + BH → which months
4. 4 seasons the same way
5. `hamed_rao_modification_test(anom, lag=3)` with NaN fallback to `pre_whitening_modification_test`
6. Weatherhead n* from σN and φ of the detrended anomalies
7. Per-year season-shape scalars (amplitude, phase, frost dates, fire percentile dates, extreme-day counts) → MK + Sen's slope
8. Optional Pettitt on anomalies

STL (needs statsmodels) and record counts on daily data are better precomputed per location.

### Gaps
- No user testing or education-research source was found on how high-school students interpret p-values or "not significant" labels. The templates are unvalidated drafts.
- Not verified: typical noise levels for each Climatch dataset (POWER T2M, MERRA-2 PM2.5, OMI NO2, MODIS LST, FIRMS) at US locations, which determine how many of the per-month or seasonal results will reach significance in 25 years. Compute them from the app's data before finalizing the UI.
