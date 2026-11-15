# Place finder for households: how tools help people choose where to live by climate, and a design for Climatch

**Status:** research notes, as of 2026-11-15. US only. No code was changed.
**Scope:** how existing tools present climate and environment for home choice, transparent ranking methods, plain wording, comparison UI, household sensitivities, and which Climatch variables support a fair 51-city (later ~100-city) comparison.
**How these notes were made:** web search plus page reads. Many findings come from search-engine summaries of a page rather than a full read; those are marked *(summary only)*. Claims I could not confirm are marked **(unverified)**. Team data facts come from `data_pipeline/output/us_scan.csv` (51 cities x 10 factors, 2001–2025), `config/thresholds.json` (version 2026-11-14), `config/conditions.json`, and `docs/US_DATA_RESEARCH.md`. All scan numbers below were computed from those files on 2026-11-15.

---

## 0. Short answer (what to build)

1. **Keep the single-address report as the main product.** Add a "Compare places" page that starts from the household and their current (or target) city and lists the 51 scan cities by **how many of the household's limits each one meets**. No combined score, no "#1 best place", no weights.
2. **Ranking rule: limits, then counts, then neutral order.** The household picks 2-5 factors (pre-filled from `conditions.json`). Each factor with a US cutoff gets a limit (default = the `caution_from` value). Cities are grouped "Meets all 4", "Meets 3 of 4", and so on. Inside a group, order by distance from the start city, or A-Z. Every row names what it misses and by how much.
3. **"What changes might affect our decision" = past trends, labeled honestly.** For each city, list each chosen factor as "Rising", "Falling" or "No clear trend yet" (the words in `docs/UX.md`) over 2001–2025, with then -> now numbers. When many cities are scanned at once, apply a false-discovery correction (section 6.2, item 5): 123 of 510 city-factor trends pass p < 0.05, only 79 survive Benjamini-Hochberg.
4. **Do not filter on MERRA-2 PM2.5 levels yet.** In a test household (65+ and asthma, limits at the caution cutoffs), **no** city met all 4 limits, and 18 of the 26 cities meeting 3 of 4 missed only on PM2.5. MERRA-2 PM2.5 counts sea salt and has no nitrate, so levels are least comparable across coasts and inland. Show PM2.5 as context plus trend until checked against EPA design values.
5. **Compare view: 2-4 columns** (your place now + up to 3), rows grouped by factor family, "show only rows that differ", and one data-built verdict line: "meets more of your limits", "better or equal on every factor you chose" (dominance), or "No single winner".
6. **List first, map second, linked.** Desktop: split view with hover and selection linked. Mobile: list by default, map behind a toggle.
7. **Wording:** past tense, numbers with units, agencies named as the source of any sensitivity statement, no "safe", "best", "risk score", "AI", or advice. Put the limits text on the page, not only on a methods page.
8. **Never put household health choices in a URL or send them to the server for the finder.** It can run in the browser from one static JSON file.
9. **Fits the team's own rules in `docs/UX.md`:** "prefer explaining over telling people what to buy or where to live" (so groups and reasons, never a recommendation), and "colour means direction, not good or bad" (so the map and chips don't use red/green for fit; words and icons carry it).

---

## 1. Existing tools: what they show, what they get right and wrong

### 1.1 First Street (Risk Factor) and the listing portals

**Timeline (US, 2020-2026)**
- 2020: Realtor.com adds First Street flood risk to listings. 2022: wildfire. March 2024: heat, wind and air quality, each scored 1-10 — [Real Estate News, 2024-03-13](https://www.realestatenews.com/2024/03/13/realtor-com-listings-now-display-5-climate-risk-factors); [Inman](https://inman.com/2024/03/13/realtor-com-the-latest-portal-to-include-climate-risk-data) *(summary only)*
- February 2024: Redfin adds First Street "Air Factor" to a Climate tab — [Redfin investor release](https://investors.redfin.com/news-events/press-releases/detail/1048/redfin-publishes-air-factor-data-from-first-street-to-show) *(summary only)*
- September 2024: Zillow adds First Street scores. **November 2025: Zillow removes them from 1M+ listings**, leaving a link to First Street's site. The trigger was the California Regional MLS (CRMLS), whose CEO doubted that places dry for 40-50 years would flood in the next five. Agents said the scores cost sales. First Street said the risk moves from a pre-purchase decision to a post-purchase liability, and that its methods are public and peer-reviewed — [TechCrunch, 2025-12-01](https://techcrunch.com/2025/12/01/zillow-drops-climate-risk-scores-after-agents-complained-of-lost-sales); [The Real Deal](https://therealdeal.com/national/2025/12/01/zillow-drops-climate-risk-scores-after-industry-pushback); [RISMedia](https://www.rismedia.com/2025/12/02/zillow-removes-climate-risk-scores/)
- CRMLS also asked Realtor.com, Redfin and Homes.com to remove predictive numbers and flood layers — same sources. A December 2025 spot check reportedly still found First Street data on Homes.com **(unverified; one property, secondary report)**.
- **January 2026 (WSJ, syndicated):** Realtor.com kept the scores but **stopped showing flood percentages**. Realtor.com and Redfin **remove a home's scores at the seller's request**. A New York couple sued First Street and Zillow over a high flood rating; **Zillow argued the score is a forecast, not a verifiable fact** (case ongoing at the time). For one New Hampshire home, First Street said "severe" flood risk, Guidewire HazardHub said "extremely low" and ClimateCheck gave 56/100. A Rice University hydrologist said accurate property-level flood estimates are not possible with current knowledge — [WSJ via Tiger Brokers, 2026-01-18](https://www.itiger.com/news/2604906355)
- **July 2026:** Redfin adds **historical weather averages** (temperature, precipitation, snowfall, humidity, UV; ZIP level; The Weather Company) to every for-sale listing. It states they are averages for the ZIP, not a forecast, and not measured at the home — [The Close, 2026-07-17](https://theclose.com/news-redfin-weather-data-listings/)
- **July 2026:** a Redfin/Ipsos survey (n = 4,000, May 2026) found better weather the most cited reason among people planning an out-of-state move (22%), with climate concern close behind (21% in one release; another summary gives 14% on a different base) — [Business Wire, 2026-07-15](https://www.businesswire.com/news/home/20260715329523/en/) *(summary only; the two climate figures use different bases)*
- **August 2026:** conservative groups (Consumers' Research, American Energy Institute) ask Congress to examine private climate scores and to give homeowners a way to challenge ratings. No policy change was enacted — [The National Desk via CNY Central, 2026-08-03](https://cnycentral.com/news/nation-world/climate-risk-scores-on-home-listings-draw-scrutiny-from-conservative-groups-fema-property-cosumers). That article still lists Zillow as showing First Street data, which conflicts with the November 2025 removal; treat it as stale on that point.
- No report found of Zillow restoring the scores as of November 2026 **(absence of evidence, not confirmed)**.

**How First Street presents it** (Redfin methodology page): five "Factors" (flood, fire, wind, air, heat), each 1-10 and banded minimal (1), minor (2), moderate (3-4), major (5-6), severe (7-8), extreme (9-10). They cover now and the next 30 years under emissions scenarios. Heat Factor 1 = annual maximum below 80 °F, 10 = above 110 °F, plus a *local* hot-day threshold. Air Factor counts expected AQI 100+ days from PM2.5 and ozone (1 = zero, 10 = 21 or more) — [Redfin methodology](https://redfin.com/guides/climate-change-housing-impact/methodology). The basic report is free for homes; full reports are paid — [First Street help](https://help.firststreet.org/hc/en-us/articles/9680921204759) *(summary only)*.

**What it gets right**
- Separate hazards, not one grand total. Named bands next to the number.
- The data sits where the decision happens (the listing).
- Methods are published.

**What it gets wrong, or what critics say**
- **False precision.** Property-level probabilities shown to 1 percentage point. Fathom's Oliver Wing: accuracy falls the more you zoom in (WSJ). Fiedler et al. (2021, *Nature Climate Change*) warn that climate-model outputs used at business or asset scale can overstate confidence and misstate risk — [IDEAS/RePEc record](https://ideas.repec.org/a/nat/natcli/v11y2021i2d10.1038_s41558-020-00984-6.html) *(abstract only)*
- **Vendors disagree.** Same house, three answers (severe, extremely low, 56/100).
- **Projections presented like facts**, which drives the liability fight. Zillow's own court argument (the score is a forecast) is the clearest sign.
- **Category edges move prices.** A difference-in-regression-discontinuity study found homes labeled Flood Factor 9 ("extreme") sold about 3.3% below otherwise similar Flood Factor 8 ("severe") homes, about 11% on the coast, and stayed about 7 days longer on the market — [Altiorem summary](https://altiorem.org/research/the-price-and-distributional-impact-of-flood-risk-disclosure-evidence-from-us-housing-platforms/) *(summary only; venue and authors not confirmed)*. The label alone changes behavior, so any Climatch band words carry weight.
- **Paywalls and opacity.** One state attorney-general court filing alleges key details sit behind a paywall — [Nebraska AG filing](https://ago.nebraska.gov/sites/default/files/doc/Court%20filing.pdf) *(party allegation; summary only)*

**Lesson for Climatch:** Climatch's position is the opposite of First Street's weak spots. It uses past observations, not projections. It works at grid scale, not parcel scale. It has no composite. It states the place, the period and the source. Say so plainly, and never show more decimals than the grid supports.

### 1.2 ClimateCheck
- Each hazard (heat, precipitation, drought, flooding, fire) gets a 1-100 rating **relative to the coverage area**, projected to about 2050. Heat counts projected days above the place's own hottest 2% of 1980-2005 days — [ClimateCheck methodology](https://climatecheck.com/our-methodologies)
- **Right:** per-hazard; documents baselines.
- **Wrong for our use:** a relative 1-100 hides the absolute level (two cities can both be "90" and feel very different). It is a projection.

### 1.3 BestPlaces (Sperling) climate and comfort
- The "Summer Comfort Index" combines 7 variables: precipitation, daily highs and lows, extremes, dew point, and rainy days. Earlier versions explicitly added **nighttime lows** because cool nights let people recover — [BestPlaces study](https://www.bestplaces.net/docs/studies/most_comfortable_summer_cities.aspx) *(summary only)*; [NatGeo 2013 coverage](https://www.nationalgeographic.com/science/article/130719-coolest-summer-weather-cities-united-states-science)
- **Right:** supports Climatch's choice of warm nights and muggy (dew point) days as household factors.
- **Wrong:** one index hides trade-offs; 30-year averages, no trend; weights not shown. A live side-by-side climate page was not reachable (redirect) **(unverified)**.

### 1.4 Weather Spark "compare"
- Compares 2-4 places in **one overlaid graph per variable** (unified graphs, not side-by-side tables). Named temperature bands from "frigid" to "sweltering". Muggy shown as "% of time". A "tourism score" sets the best time to visit. Seasonal and monthly views are paid — [Weather Spark compare](https://weatherspark.com/compare/y/1/Comparison-of-the-Average-Weather); [Chicago page](https://weatherspark.com/y/14091/Average-Weather-in-Chicago-Illinois-United-States-Year-Round)
- **Right:** overlaid series on one axis is the easiest way to compare places; plain band words; up to 4 places.
- **Wrong for our use:** climatology only (no change over time); the fetched pages did not show the data source or the muggy definition **(unverified whether they appear elsewhere on the page)**.

### 1.5 ProPublica / NYT Magazine "Great Climate Migration" (2020)
- County maps of projected heat, humidity, crop and economic damage, sea level and fire (Rhodium Group plus USFS wildfire projections). A county table ranks counties "if all perils were combined" and can also be sorted by single peril — [ProPublica interactive](https://projects.propublica.org/climate-migration) *(the combination formula was not found on the page)*
- **Right:** sortable by a single factor; strong maps.
- **Wrong:** the combined ranking's math is not on the page; projections; county ranks invite "move here" readings.

### 1.6 "Climate twin" / analog tools
- UMCES Future Urban Climates (Fitzpatrick and Dunn, *Nature Communications*, 2019): for 540 North American cities, finds today's place whose climate best matches the city's projected ~2080 climate, under two emissions scenarios. It **shows poor matches honestly**: bigger circles mean poorer matches, and it says no city has an identical match. About 42% of cities may get climates with no present-day analog. The baseline is 1960-1990 WorldClim — [UMCES tool page](https://www.umces.edu/futureurbanclimates); [UMCES release](https://www.umces.edu/news/climate-north-american-cities-will-shift-hundreds-miles-one-generation); [Smithsonian](https://www.smithsonianmag.com/smart-news/map-predicts-how-climate-change-will-feel-city-where-you-live-180971487/)
- ClimateData.ca spatial analogues (Canada) gives explicit feedback on how good or poor each match is — [climatedata.ca](https://climatedata.ca/?p=12652) *(summary only)*
- **Lesson:** if Climatch ever does "places like yours", show match quality and say when nothing is close. Climatch must not project, so a "today's twin" (past 25 years) is the only honest version.

### 1.7 AARP Livability Index
- 0-100 overall, the average of 7 category scores (housing, neighborhood, transportation, environment, health, engagement, opportunity), 61 indicators. **Scores are relative: the average community scores 50 and 100 is not possible.** Larger areas regress toward 50. A Community Finder quiz matches places to priorities. The 2025 update added FEMA National Risk Index hazards as context **outside** the score — [AARP scoring](https://livabilityindex.aarp.org/scoring); [AARP Livability Index](https://livabilityindex.aarp.org/) *(2025 details: summary only)*
- **Right:** tells you what 50 means; keeps context separate from the score; a priorities quiz instead of sliders.
- **Wrong:** one 0-100 number; relative scores hide absolute levels; environment is a small share.

### 1.8 AreaVibes and Niche
- AreaVibes "Health & Safety" = 50% median air quality + 50% access to facilities, scored against the national average; weights shown, not adjustable — [AreaVibes methodology](https://www.areavibes.com/methodology/)
- Niche: a **Weather grade** (sunny days, precipitation, average temperature) weighted 5%, and an Outdoor Activities grade that includes air quality, also 5% — [Niche methodology](https://www.niche.com/places-to-live/rankings/methodology/best-zip-codes-to-live/) *(summary only)*. The 2026 #1 city (Naperville) got a C+ for weather *(summary only)*.
- **Lesson:** in general livability rankings, climate is a small hidden weight. A household that cares about heat or air cannot see or change that.

### 1.9 Federal health and environment tools (and what disappeared)
- **CDC Heat & Health Tracker:** county and ZIP heat information, heat-related ED visit rates, and forecasts; it combines temperature with ED surveillance — [CDC fact sheet](https://stacks.cdc.gov/view/cdc/130390) *(summary only)*. The 2026 season had about 145,000 heat-related ED visits by 2026-09-10 — [MMWR 75(36), 2026](https://www.cdc.gov/mmwr/volumes/75/wr/mm7536a2.htm) *(summary only)*. Current live status of the tracker app **(unverified; the old URL returned 404)**.
- **CDC/ATSDR Heat and Health Index (2024):** ZIP (ZCTA) **percentile ranks** across four modules (historical heat burden, sensitivity, sociodemographics, natural and built environment). Its heat-day indicator uses each ZCTA's own 95th percentile — [HHI overview PDF](https://www.atsdr.cdc.gov/place-health/media/pdfs/2024/09/06127-053-CDC-ATSDR-HHI-Overview-v2c-FINAL-CDC-CLEARED-EXTERNAL.pdf) *(summary only)*
- **NWS HeatRisk:** levels 0-4 (Little to None, Minor, Moderate, Major, Extreme). Thresholds are **relative to each place and date** (the warmest 5%) and CDC heat-health data. **Overnight lows decide whether heat stress eases or builds into the next day.** The top level is described as heat "with no overnight relief" — [WPC HeatRisk](https://www.wpc.ncep.noaa.gov/heatrisk/); [What's in HeatRisk](https://www.wpc.ncep.noaa.gov/heatrisk/whatsinheatrisk.html); [NWS fact sheet](https://www.weather.gov/media/aly/FactSheets/Whats-in-HeatRisk.pdf)
- **Removed or changed:** EPA took **EJScreen** offline on 2025-02-05. A suit (Sierra Club v. EPA) was dismissed for lack of standing on 2026-03-13. Public Environmental Data Partners hosts rebuilds of EJScreen and copies of CDC's SVI and Environmental Justice Index — [EDGI](https://envirodatagov.org/?p=11456); [Harvard EELP tracker](https://eelp.law.harvard.edu/tracker/epa-added-environmental-health-indicators-to-ejscreen/) *(summary only)*. **climate.gov** was shut and redirected in 2025; former staff relaunched it as climate.us — [climate.org](https://climate.org/news/one-of-the-nations-most-trusted-public-climate-resources-climate-gov-has-been-quietly-taken-offline) *(summary only)*. heat.gov's status is unclear; the National Heat Strategy was taken offline — [FAS](https://fas.org/publication/summer-heating-up-underprepared/) **(heat.gov status unverified)**.
- **Lesson:** agencies rank places with **percentiles and modules**, and judge heat **against local normal** (people get used to their climate). Climatch uses **fixed absolute thresholds** (95 °F days, 75 °F nights), which is the right choice for a household **moving** to a climate they are not used to. Say this in one line. Check every federal link before the demo; prefer AirNow, NWS and CDC pages that are live.

### 1.10 Steering, fair housing and the "climate haven" myth
- 2021-2022: Realtor.com, Redfin and Trulia dropped crime maps over racial-steering concerns — [NAR magazine](https://www.nar.realtor/magazine/real-estate-news/realtorcom-redfin-remove-crime-data-on-listings) *(summary only)*. On 2026-04-24, HUD issued a letter saying agents do not violate the Fair Housing Act merely by discussing crime or school data shared equally with all clients, and that intent decides steering — [HousingWire](https://www.housingwire.com/articles/hud-says-agents-can-discuss-crime-and-school-data/); [HUD letter](https://www.hud.gov/sites/default/files/hudclips/documents/AS-Trainor's-DCL-on-Neighborhood-Crime-Data-and-School-Quality.pdf). Nothing found on environmental data specifically.
- **"There's no such thing as a climate haven"** (Jesse Keenan, Tulane), after Hurricane Helene flooded Asheville in 2024, a town marketed as one — [Science Friday](https://www.sciencefriday.com/segments/asheville-climate-haven-climate-risk/); [Scientific American](https://www.scientificamerican.com/article/hurricane-helene-signals-the-end-of-the-climate-haven/)
- **Lesson:** compare cities, not neighborhoods. Use only physical data, never demographics. Show the same information to every user. Never call a place "safe" or a "haven".

### 1.11 Cross-tool pattern summary

| Pattern | Who does it | Keep or avoid for Climatch |
| --- | --- | --- |
| One number per hazard on a 1-10 / 1-100 scale | First Street, ClimateCheck | Avoid: Climatch shows real units (days a year, µg/m³) |
| One overall livability score | AARP, AreaVibes, Niche, BestPlaces | Avoid |
| Relative scores (average = 50, percentiles) | AARP, ClimateCheck, CDC HHI | Avoid as the main display; at most "higher than most of the 51 cities" as context |
| Projections to 2050/2080 | First Street, ClimateCheck, ProPublica, UMCES | Avoid (hard limit: no forecasts) |
| Overlaid series for 2-4 places | Weather Spark | **Keep** |
| Sort by a single factor | ProPublica table | **Keep** |
| Explicit "not a forecast, not at your home" caveat | Redfin weather (2026) | **Keep** |
| Show match quality / "no close match" | UMCES, ClimateData.ca | **Keep** |
| Context kept outside the score | AARP (FEMA NRI) | **Keep** (trend maps as background, not ranking inputs) |
| Seller opt-out, removal on request | Realtor.com, Redfin | Not applicable (no parcels), but it explains why cities, not homes |

---

## 2. Ranking and matching that stay transparent

### 2.1 What the research says
- **People screen first, then compare a few.** Marketing science's "consider-then-choose" work finds two-stage models (non-compensatory screening such as must-haves, then trade-offs among the survivors) fit real choices better than one weighted sum. Consideration sets are small — [Hauser, Ding and Gaskin review](https://stuff.mit.edu/~hauser/Papers/Ding_Gaskin_Hauser_Consideration_Review_Sawtooth_2009.pdf) *(summary only)*
- **Laypeople making big personal decisions** start with fuzzy goals, fix on easily counted attributes and yes/no filters, and often eliminate options step by step. Visual "probes" made them compare more systematically and surfaced criteria they had skipped — Oral, Chatzimparmpas, Zhang, van Dijk, Võeras and Dimara, *Information Visualization* (2026), [author PDF](https://www.projects.science.uu.nl/ics-vig/uploads/Bibtex/oral2026exploring.pdf), DOI 10.1177/14738716261455686 (abstract and introduction read)
- **Weights from laypeople are unreliable:**
  - Direct "how important is X" ratings ignore the range of the attribute (Fischer 1995) — [Duke record](https://scholars.duke.edu/publication/771230) *(summary only)*
  - **Splitting bias:** an attribute split into sub-attributes gets more total weight (Weber, Eisenführ and von Winterfeldt 1988; Jacobi and Hobbs 2007) — [Decision Analysis](https://pubsonline.informs.org/doi/10.1287/deca.1070.0100) *(summary only)*. **This hits Climatch directly:** heat appears as very hot days + warm nights + muggy days (+ surface heat), and rain as heavy-rain days + wettest day. Equal weight per card would quietly make heat count 3 times.
- **Composite ranks are fragile.** Ranks can reverse under other plausible weights, normalizations or aggregations. A comparison is robust only if it holds for every weight in a plausible set, which is **dominance** (Foster, McGillivray and Seth) — [OPHI WP-26](https://ophi.org.uk/publication/WP-26). The OECD-JRC guidance asks every composite to publish a sensitivity analysis — [EC JRC step 8](https://knowledge4policy.ec.europa.eu/composite-indicators/10-step-guide/step-8-sensitivity-analysis_en) *(summary only)*
- **Choice overload** grows with choice-set complexity, task difficulty, preference uncertainty and an effort-minimizing goal (meta-analysis of 99 observations, N = 7,202) — [Chernev, Böckenholt and Goodman 2015](https://www.kellogg.northwestern.edu/faculty/research/detail/2015/when-product-assortment-leads-to-choice-overload-a-conceptual) *(abstract)*. Picking a city has all four, so keep the visible shortlist short and the comparison at most 4 wide.
- **Decision-aid standards** (IPDAS 5.0): show the good and bad of each option in a balanced, non-directive way, make side-by-side comparison possible, and use an explicit values-clarification step — [IPDAS 5.0](https://decisionaid.ohri.ca/ipdas/IPDAS%205.0%20English.pdf) *(summary only)*. A "what matters to your household" step is that values-clarification step.
- **Explanations** serve different aims: transparency (how it works), scrutability (let users say it is wrong), trust, effectiveness, persuasiveness and efficiency, and these can conflict. For example, transparency that is hard to understand does not build trust — Tintarev and Masthoff 2012, *UMUAI* *(summary only)*. Climatch should aim for transparency and scrutability, not persuasion.
- **Visual ranking tools** such as LineUp (InfoVis 2013 best paper) show each attribute's share of a weighted score as a stacked bar, and use slope graphs to compare rankings — [Harvard VCG](https://vcg.seas.harvard.edu/publications/20130101-lineup-visual-analysis-of-multi-attribute-rankings). Good for experts. For families, the weights are the problem, not the drawing.
- **Evaluating decision visualizations:** measure whether people's choices match their *own stated* preferences — Dimara, Bezerianos and Dragicevic 2018, *IEEE TVCG* — [HAL](https://hal.archives-ouvertes.fr/hal-01584729) (**which display won was not verified**). This suggests a usability test for the place finder (section 7.9).
- **Uncertainty:** giving a number with a numeric range lowered trust in that number only slightly and left trust in the source about the same. Verbal hedges cost more trust — van der Bles et al. 2020, *PNAS* — [ScienceDaily](https://sciencedaily.com/releases/2020/03/200323152106.htm) *(summary only)*. So show the then -> now numbers and the 95% band, not "may possibly".
- **"Not significant" is often read as "no change"**, even by researchers — [THE on a 2026 PNAS paper](https://www.timeshighereducation.com/news/flawed-use-non-significant-data-killing-further-research) *(summary only)*. Readers also treat "significant" as "large"; reporting the size of a change fixes much of that — Michal and Shah 2024, [Psychological Science](https://www.psychologicalscience.org/journals/psychological-science/09567976241231506/) *(summary only)*. Keep the team's "No clear trend yet" wording and always show the size of a change.

### 2.2 Methods compared for Climatch

| Method | Transparent? | Needs weights? | Robust to data bias? | Verdict |
| --- | --- | --- | --- | --- |
| Weighted sum / 0-100 "fit score" | No (one number) | Yes (unreliable from families) | No | **Reject** |
| Percentile rank among 51 cities | Partly | Yes, to combine | No; relative to a hand-picked set | Reject as main; ok as a context phrase |
| Hard filters (show only cities under every limit) | Yes | No | No; one biased factor empties the list | Use as the first step only, with "almost" shown |
| **Count of limits met, grouped** ("Meets 3 of 4") | Yes | No | Better; one bad factor costs one point, and it is named | **Use** |
| Pareto / dominance ("better or equal on everything you chose") | Yes | No | Yes for chosen factors | **Use** in the compare view as a sentence, not as a chart |
| Lexicographic (sort by most important factor first) | Yes | Needs an order | Medium | Offer as "Sort by one factor" |
| Similarity to current city ("climate twin") | Medium | Needs distance weights | No | Later, and only with match quality shown |

---

## 3. Wording for families: plain, specific, not alarming, not medical

### 3.1 Rules taken from public-sector style guides
- **GOV.UK:** plain English is mandatory for all of GOV.UK; address the user as "you"; avoid metaphors because they slow comprehension; write numbers as numerals (except "one"). Words to avoid include agenda, deliver, deploy, empower, facilitate, focus, foster, impact, key, leverage, robust, streamline, tackle and transform — [GOV.UK A to Z style guide](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/style-guides/a-to-z-style-guide/); [writing guidelines](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/writing-guidelines/). Front-load: put the most important content first, because that is the part most people read — [GDS style handout](https://insidegovuk.blog.gov.uk/wp-content/uploads/sites/24/2014/02/SprintGO_Standards_Style_handout1.pdf)
- **CDC Clear Communication Index:** state one main message early; use numbers that support it; for risk, explain what the number means for the reader, in words and numbers — [CDC CCI](https://www.cdc.gov/ccindex/) *(summary only)*
- **EPA AirNow structure:** category name, then "Who needs to be concerned?", then "What should I do?". Sensitive groups are named plainly ("people with heart or lung disease, older adults, children and teenagers, pregnant women...") — [AirNow particle pollution guide, EPA-452/F-23-002, Feb 2023](https://document.airnow.gov/air-quality-guide-for-particle-pollution.pdf) (read in full); [AQI basics](https://www.airnow.gov/aqi/aqi-basics/). **Climatch keeps the first two columns ("who this matters for") and drops "what should I do"**: that is advice and belongs to the agency, so link to it.
- **NWS HeatRisk:** short "who is affected" lines per level, keyed to cooling and hydration, not to diagnoses — [WPC HeatRisk](https://www.wpc.ncep.noaa.gov/heatrisk/)

### 3.2 Climatch house rules for this page
1. Lead with the place and the number: "Phoenix: 141 very hot days a year (2021–2025 average)."
2. Past tense for trends, with dates: "rose from 77 to 93 nights a year between 2001–2005 and 2021–2025."
3. Name the source of every sensitivity statement: "EPA lists children and teenagers as a sensitive group for particle pollution." Never "your child is at risk."
4. Compare to a named line: "EPA's yearly standard is 9 µg/m³." Never "unhealthy air" as a verdict about a city.
5. Use "fits your limits", never "best", "safest", "healthiest", "ideal", "perfect", "climate haven".
6. Say what is missing: "We don't have pollen data."
7. No AI tone: no "insights", "unlock", "dive in", "journey", "tailored just for you", "powered by", "smart", "let's explore", no emojis, no exclamation marks, no rhetorical questions. Sentences under about 20 words.
8. One idea per sentence; units every time; round to what the grid supports (whole days; PM2.5 to 1 decimal; NO2 as "higher/lower than most cities checked" plus the value).

### 3.3 Copy examples (all numbers below come from `us_scan.csv` or `thresholds.json`)

| Situation | Avoid | Use |
| --- | --- | --- |
| Page title | "Find your perfect climate!" / "Best places for your family" | **Compare places for your household** |
| Intro | "Our AI analyzes 25 years of NASA data to find your ideal home." | **Pick what matters to your household. We show which of 51 US cities stay under those limits, using NASA data from 2001 to 2025. This is a record of the past, not a forecast or medical advice.** |
| Factor picker | "How important is heat to you? (slider 1-10)" | **Fewer very hot days (95 °F or more)** · limit: **fewer than 30 a year** / fewer than 60 a year |
| Pre-filled from household | "Because you're 65+, heat is dangerous for you." | **Pre-selected because your household includes someone 65 or older. CDC lists people 65 and older among those most affected by heat. You can change this.** |
| Group header | "Top matches" | **Meets all 3 of your limits (18 cities)** |
| Empty top group | "No safe places found." | **No city meets all 4 limits. These 26 meet 3 of 4. Each one says which limit it misses.** |
| Row explanation | "Denver scores 92/100" | **Denver meets 3 of 4. Very hot days: 5 a year (limit: fewer than 30). Warm nights: 0. PM2.5: 5.5 µg/m³ (limit: under 9). Misses: very cold nights, 11 a year (limit: fewer than 10).** |
| Close call (needs annual values, see 7.3) | "Borderline" | **Very cold nights: 11 a year on average. 2 of the last 5 years were under your limit.** *(illustrative wording; compute the real count)* |
| Clear rise | "Phoenix nights are getting dangerously hot." | **Warm nights (75 °F or warmer) rose from 77 to 93 a year (2001–05 vs 2021–25), about 7.5 more per decade. The rise is larger than normal year-to-year ups and downs.** |
| Clear fall | "Air is now clean in DC." | **PM2.5 fell from 14.4 to 12.6 µg/m³ (2001–05 vs 2021–25). It is still above EPA's yearly standard of 9.** |
| Not clear | "No trend" / "Stable" | **No clear trend yet: very hot days went from 138 to 141 a year, but that is within normal ups and downs. More years may settle it.** |
| Same everywhere | (silence) | **NO₂ from traffic and industry fell clearly in 47 of the 51 cities we checked. It rose clearly in one: Midland, Texas. So it says little about choosing between cities.** |
| Trade-off verdict | "Seattle wins!" | **No single winner. Seattle has fewer very hot days (1 vs 11 a year). Washington, DC has had falling PM2.5, while Seattle's rose (7.8 to 10.1 µg/m³).** |
| Dominance verdict | "Clearly better" | **Denver is equal or better than Phoenix on all 4 things you chose.** (only when true for every chosen factor) |
| Older adults | "Seniors face deadly heat." | **CDC lists people 65 and older among those at highest risk from heat. Warm nights matter because the body gets less chance to cool down overnight (NWS HeatRisk).** |
| Young children | "Kids' lungs are in danger." | **EPA counts children and teenagers as a sensitive group for particle pollution. Their lungs are still developing and they breathe more air for their body weight.** |
| Asthma / COPD | "High asthma risk here." | **EPA lists people with lung disease, including asthma and COPD, as a sensitive group for particle pollution. For daily air quality, see AirNow.gov.** |
| Heart disease | "This city is bad for your heart." | **EPA lists people with heart disease as a sensitive group for particle pollution. CDC suggests people with heart disease make a heat plan with their doctor.** |
| Kidney disease / diabetes | "Heat can damage your kidneys." | **WHO names people with heart, lung or kidney conditions among those most affected by heat.** (CDC's exact diabetes wording not verified; see 5.) |
| Allergies | "Pollen will be terrible." | **We don't have pollen or mold data. Muggy days count how often outdoor air is humid (dew point 70 °F or more); they don't measure allergens. For pollen, check a local pollen count.** |
| Fires | "Wildfire danger: high." | **Fire detections within 50 km: 213 a year in Midland, mostly oil-field gas flares. A detection is a hot satellite pixel, not a wildfire, and smoke travels much farther than 50 km.** |
| Starting city | "Upgrade your life" | **Compared with your place now (Houston): 74 fewer very hot days a year (79 vs 5).** |
| Footer | "Powered by AI" | **Data: NASA POWER (MERRA-2), MERRA-2 aerosols, OMI NO₂, FIRMS. Cutoffs: EPA where one exists; others set by the team and labeled.** |

---

## 4. Interaction design for comparing places

### 4.1 Findings
- **List vs map:** in NN/g testing of mobile location search, people struggled to scroll past a map placed above the list and preferred the list. NN/g recommends the list as the default view, with a map on request; once distance is shown, people chose happily from the list — [NN/g mobile maps](https://www.nngroup.com/articles/mobile-maps-locations/) *(summary only)*. On desktop, Airbnb uses a split view: hovering a list item highlights its pin — [ClickZ](https://clickz.com/?p=94783) *(summary only)*.
- **Comparison tables:** highlight the attributes that differ, or move them to the top — [NN/g explicit differences](https://www.nngroup.com/articles/explicit-differences/). Baymard: 67% of test users used compare features on spec-driven sites. Compare controls must be visible without hover. Group attributes and keep item names visible while scrolling. **Hiding identical rows beat highlighting differences** in testing. Tools show up to about 5 products — [Baymard: user-friendly comparison tools](https://baymard.com/blog/user-friendly-comparison-tools); [Baymard: provide comparison features](https://baymard.com/research-articles/provide-comparison-features) *(summary only)*. "Most dynamic tables accept 3-4 items" is attributed to NN/g **(unverified)**.
- **Overlaid series for 2-4 places** read faster than separate charts (Weather Spark pattern, 1.4). The team's earlier notes favor position on a common scale (Cleveland and McGill) — see `research_notes/Climatch monthly trends and redesign/ux_visualization.md`.
- **Explanations and scrutability:** let people see and change why a city is where it is (2.1).

### 4.2 Recommended interaction (summary; full spec in section 7)
- **Start:** "Where do you live now?" (reuse `AddressSearch`) or "Pick a city you're considering". That place becomes the pinned **baseline row and the first compare column**, so every number reads as "vs your place now".
- **Desktop:** list (60%) + map (40%). Hover a row to highlight its dot; click a dot to scroll to and select its row. Selection = "Add to compare" (max 3 plus the baseline).
- **Mobile (< 768 px):** list only; a "Map" toggle opens the map full-screen; a sticky "Compare (2)" bar.
- **Shortlist:** checkboxes on rows and in map popups, always visible. Store the shortlist in `localStorage` (wrapped in try/catch). A share link carries **city IDs and factor keys only**, never conditions or age groups.
- **From any row:** "Open full report" -> the existing personalized single-place report (the main experience stays the main experience).

---

## 5. What a household cares about, by member (agency phrasing, no advice)

Factor lists come from the team's `config/conditions.json`. The phrasing is the agency's, paraphrased short, with the source named on screen.

| Member / condition | Factors to surface first (current config) | What agencies say (source) | Gaps / notes |
| --- | --- | --- | --- |
| 65+ | hot days, warm nights, very cold nights, heavy rain | CDC: people 65+ and children under 2 are among those at highest heat risk — [CDC extreme heat](https://www.cdc.gov/nceh/features/extremeheat) *(summary only)*. WHO: over 65, and those with heart, lung or kidney conditions, a disability, or living alone; long hot days **and nights** build up stress on the body — [WHO fact sheet](https://www.who.int/news-room/fact-sheets/detail/climate-change-heat-and-health). NWS: overnight lows decide whether heat stress eases — [What's in HeatRisk](https://www.wpc.ncep.noaa.gov/heatrisk/whatsinheatrisk.html). EPA: older adults are a sensitive group for particle pollution — [AirNow PM guide](https://document.airnow.gov/air-quality-guide-for-particle-pollution.pdf) | Cold: risk for older adults (thinner skin, medicines, indoor cold) is from AARP/AHA/NIH summaries; **CDC's own cold wording not verified**. The team's `cutoff_source` cites JAMA Netw Open 2025 on cold deaths (not re-checked here) |
| Under 5 | NO₂, PM2.5, hot days, fires | CDC: children under 2 at highest heat risk (above). EPA: children are a sensitive group for particles, and **all** children, even healthy ones, are sensitive to wildfire smoke; they breathe more air per pound of body weight — [EPA wildfire smoke course](https://www.epa.gov/wildfire-smoke-course/which-populations-experience-greater-risks-adverse-health-effects-resulting); [CDC wildfire smoke and children](https://www.cdc.gov/wildfires/risk-factors/wildfire-smoke-and-children.html) *(summary only)* | Climatch has no smoke-day count; PM2.5 is an annual mean, which hides smoke spikes. Fires = detections, not smoke |
| 5-17 | NO₂, PM2.5 | EPA: "children and teenagers" are a sensitive group for particle pollution, lungs still developing (AirNow PM guide). Archived EPA pages name people with asthma, children and older adults as susceptible to near-road NO₂ — [archived EPA NO₂ health page](https://webarchive.library.unt.edu/web/20120927135214/http://www.epa.gov/airquality/nitrogenoxides/health.html) *(archived; summary only)*; [AirNow NO₂ guide](https://document.airnow.gov/air-quality-guide-for-nitrogen-dioxide.pdf) | OMI NO₂ is a ~13x24 km column, so it cannot see near-road exposure (section 6) |
| Asthma / COPD | PM2.5, NO₂, fires, dry days, muggy days, hot days | EPA: people with lung disease, including asthma and COPD, are a sensitive group for particles (AirNow PM guide). People with asthma face more emergency visits during smoke (AirNow at-risk fact sheet) — [AirNow at-risk groups](https://document.airnow.gov/at-risk-groups-of-people-fact-sheet.pdf) *(summary only)* | Linking dry days and muggy days to asthma is the team's choice, not an agency statement. Present them as comfort and air-moisture facts, not triggers |
| Heart disease | hot days, warm nights, surface heat, PM2.5, cold nights | CDC: heat can be especially dangerous with chronic conditions; with heart disease, make a heat plan with your doctor — [CDC heat and chronic conditions](https://www.cdc.gov/heat-health/risk-factors/heat-and-chronic-conditions.html) (read). EPA: people with heart disease are a sensitive group for particles (AirNow PM guide) | Surface heat exists for 6 cities only; leave it out of the finder |
| Diabetes | hot days, warm nights, surface heat | CDC general chronic-condition heat line (above). **No CDC diabetes-specific sentence verified** | Use the general line plus WHO; avoid mechanisms |
| Kidney disease | hot days, surface heat, warm nights | WHO: kidney conditions (above). Kidney disease raises dehydration risk (Harvard Health summary) **(not an agency source)** | — |
| Allergies | muggy days, PM2.5, fires | CDC: climate change **may** raise pollen levels and lengthen pollen seasons; people with asthma may be more sensitive to pollen — [CDC allergens and pollen](https://www.cdc.gov/climate-health/php/effects/allergens-and-pollen.html) *(summary only)*. EPA: keep *indoor* humidity below 60%, ideally 30-50%, against mold; dust mites thrive in damp, warm places — [EPA mold course (Jan 2025 snapshot)](https://19january2025snapshot.epa.gov/mold/mold-course-chapter-2/index.html) *(summary only)* | **No pollen or mold data in Climatch.** Outdoor dew point is not indoor humidity. Say so; don't imply allergen levels |
| Pregnancy | hot days, PM2.5, fires | EPA lists pregnant women as a sensitive group for particles (AirNow PM guide). WHO's heat page does not mention pregnancy (read) | — |
| Limited mobility | heavy rain, hot days, cold nights | WHO: disability among those most affected by heat | Heavy rain is trend-only (no national cutoff) |

**Phrasing pattern that stays non-medical:** "[Agency] lists [group] among those more affected by [exposure]. [City] had [value] [unit] ([period])." Then link to the agency page. No "you should", no symptoms, no "your risk".

---

## 6. Which Climatch variables support a fair cross-city comparison

### 6.1 Variable by variable (51-city scan, "now" = 2021–2025 mean, trend = Mann-Kendall over 2001–2025)

| Factor (card) | Data, grid | Cutoff in `thresholds.json` | Scan facts | Level fair across cities? | Trend fair? | Caveat that must travel with it |
| --- | --- | --- | --- | --- | --- | --- |
| Very hot days (Tmax ≥ 35 °C / 95 °F) | NASA POWER (MERRA-2), ~50 km | Caution 30, high 60 (95 °F from US environmental health tracking; 30/60 team-defined) | median 9 a year, max 141 (Phoenix); 11 cities high, 5 caution; 6 trends p < 0.05, **0 survive BH** | **Yes**, broadly. Houston grid vs NOAA airport station agree (36 -> 79 vs 35 -> 73) | Weak across many cities | "~50 km average; cities and valleys can run hotter than the grid square." Fixed 95 °F suits movers; agencies' HeatRisk uses local normal |
| Warm nights (Tmin ≥ 24 °C / 75 °F) | same | 30 / 90, team-defined | median 2.4, max 236 (Miami); 12 clear rises, 0 falls; 8 survive BH | **Partly.** The grid misses city night heat (Atlanta station 1 -> 12 vs grid 0 -> 1). Coastal squares include ocean, so levels run high (Miami grid 236 vs station 138) | Yes; most consistent signal | "The grid square can miss city heat at night, and coastal squares include sea." |
| Very cold nights (Tmin ≤ -12 °C / 10 °F) | same | 10 / 30, team-defined | median 0.6, max 52 (Minneapolis); **0 significant trends** | Yes | **Uninformative** (no clear trends anywhere) | Show the level; say "no clear change in any city we checked" |
| Muggy days (dew point ≥ 21 °C / 70 °F) | same | 30 / 90, comfort cutoffs, team-defined | median 10.6, max 234 (Miami); 8 rises, 1 survives BH | Yes (comfort, not health) | Weak | "Comfort measure, not a health limit." |
| Heavy rain days (≥ 20 mm) / wettest day | POWER PRECTOTCORR, ~50 km | none (trend only) | 4 trends each, few survive BH | Rough only. The grid smooths downpours; US agencies define heavy rain against local history | Weak | "Flooding depends on streets, drainage and rivers, which this can't show." |
| Very dry days (RH < 20%) | POWER RH2M | none, team-defined | median 0; desert cities only | Context only | Weak | — |
| PM2.5 (annual mean) | MERRA-2 M2TMNXAER rebuilt (dust, sea salt, sulfate, BC, OC; **no nitrate**), ~50 km | Caution 9 (EPA 2024 primary annual), high 15 | median 10.8, range 3.7-14.6; **41 of 51 at or above 9**; 18 trends (9 up, all Northwest; 9 down, East); 10 survive BH | **No, not yet.** Sea salt raises coastal squares (San Francisco 11.9, Boston 11.1, Miami 11.4); missing nitrate lowers others. A US evaluation of the earlier MERRAero matched rural IMPROVE monitors better than city AQS monitors and blamed missing nitrate and low carbon emissions in the West — [Buchard et al. 2016](https://eld.bl.uk/catalog/100030388162_0x000001) *(summary only)* | Yes, with care (reanalysis input changes can shift values) | "Model estimate, not a monitor. Counts sea salt, misses nitrate. Check EPA monitor data for a city." **Validate against EPA design values before using as a limit** |
| NO₂ (tropospheric column) | OMI OMNO2d v004, 0.25° grid from ~13x24 km pixels | none (trend only) | **47 of 51 fell clearly**; 1 rose (Midland) | Relative only ("higher than most cities checked") | Yes, but it moves the same way almost everywhere, so it **does not separate cities** | "A column through the whole lower atmosphere, not the air at street level. Pixels of about 13x24 km smear city cores (20-30% bias) and miss roads" — [Kim et al. 2016, GMD](https://gmd.copernicus.org/articles/9/1111/2016/) *(summary only)* |
| Fire detections within 50 km | FIRMS MODIS (Terra + Aqua), 1 km | none (trend only) | 20 trends (16 down, 4 up); Midland 19 -> 213 = gas flares; Cleveland and Detroit drops after 2020 unexplained | **No.** Counts farm burns, prescribed burns, flares and industrial heat | Context only | "Hot pixels, not wildfires; smoke travels much farther than 50 km." The team found no US-wide step from orbit drift (`tools/fire_check.py`) |
| Surface heat / heat island | MODIS LST 1 km, 2001-2022 | heat island +2 / +4 °C, team-defined | 6 cities only | **Not available for all cities** | — | Leave out of the finder; keep it in the single-place report |

### 6.2 Cross-cutting caveats (put the short form on the page and the long form on the methods page)
1. **One point per city.** Each city is one grid square around one coordinate. A metro spans several squares, and a 50 km square smooths valleys, coasts, mountains and city heat.
2. **The city list is a choice.** 51 cities picked by the team, not a sample of the US. "Meets 3 of 4" is out of these 51, not out of all places.
3. **Cutoffs:** only PM2.5 (EPA 9 µg/m³) and the 95 °F hot-day level come from US agencies. The rest are team-defined; label them so.
4. **Period:** "now" is the 2021–2025 average. Trends depend on the window (Phoenix warm nights: p = 0.005 over 25 years, 0.32 over 10).
5. **Many tests at once.** The scan runs 510 trend tests. If nothing were changing, about 25 would still pass p < 0.05 by chance. 123 pass, so most are real, but a single city's lone "clear" flag may not be. Benjamini-Hochberg at 5% keeps 79 (46 NO₂, 13 fires, 10 PM2.5, 8 warm nights, 1 muggy, 1 heavy rain). **All 6 hot-day flags drop out**, including Houston (p = 0.040), even though Houston's airport station independently shows a strong rise (p = 0.002). So: in the multi-city finder, label borderline results plainly or use BH; in the one-place report, the single test is fine.
6. **Same direction everywhere = no help choosing** (NO₂). Say it once as context instead of repeating it on 51 rows.
7. **Past is not future.** No forecast, and no "this will continue".

### 6.3 Going from 51 to ~100 cities
- POWER is a live point API (1.2-1.7 s per city for 25 years, per `docs/US_DATA_RESEARCH.md`). PM2.5 and NO₂ are already gridded US files, and FIRMS is a local file. So 100 cities is a re-run of `tools/us_scan.py`; MODIS surface heat is the only part that doesn't scale (leave it out).
- Pick cities by a stated rule (for example, the largest city in each state plus the top 50 metros) and print the rule on the page.
- The test household result (no city meets all 4) suggests more cities alone won't fix the PM2.5 problem; the data choice will.

---

## 7. Recommended place-finder design for Climatch

### 7.1 Inputs
- **Household** (already collected): age groups and conditions -> pre-select factor families from `conditions.json`, deduplicated, capped at 4 visible picks (user can add up to 5).
- **Factor families** (each counted once, which fixes the splitting bias): Heat by day (very hot days) · Heat at night (warm nights) · Humid air (muggy days) · Cold nights (very cold nights) · Fine particles (PM2.5) · Plus trend-only context: Heavy rain, Dry air, Traffic pollution (NO₂), Fires nearby.
- **Limit per family:** 2-3 preset choices tied to the `thresholds.json` cutoffs (for example, very hot days: fewer than 30 / fewer than 60 a year). **No free sliders, no importance weights.**
- **Optional rule:** "Leave out cities where any chosen factor rose clearly" (off by default; uses the BH-corrected flag in the multi-city view).
- **Start place:** current address (live report data) or one of the cities. Optional.

### 7.2 Ranking rule (deterministic, explainable in one sentence)
> "Cities are grouped by how many of your limits they meet. Inside each group they are listed by distance from your starting place (or A to Z). Nothing is weighted or added up."

1. For each city and each chosen limit: met if the 2021–2025 mean is under the limit.
2. Group by number met (k of n). Show every group; collapse groups below n-2 behind "Show more".
3. Inside a group: by distance from the start place (if given), else A-Z. The user can switch to "Sort by one factor" (lexicographic), which mirrors the ProPublica table.
4. **PM2.5 until validated:** PM2.5 is offered as "Fine particles: avoid cities where PM2.5 is Rising", **not** as a 9 µg/m³ limit, and the level shows as context with the "model estimate" note. Evidence: in the 65+ and asthma test, the PM2.5 limit was the only miss for 18 of 26 cities, with coastal sea salt inflating several. Revisit once compared with EPA design values ([EPA design values](https://www.epa.gov/air-trends/air-quality-design-values), link from memory, check).
5. Never show a rank number, a percentage fit or a star rating.

### 7.3 Outputs per city (list row)
- Name, group ("Meets 3 of 4"), distance from start.
- One chip per chosen factor: icon + value + unit + met/missed (icon **and** text, not color only).
- **Misses spelled out:** "Misses: very cold nights, 11 a year (limit: fewer than 10)."
- **Close-call line (data-built, not a fudge band):** "2 of the last 5 years were under your limit." This needs the city's annual values (2021–2025), which the pipeline already computes. Add five numbers per factor to the export.
- **Changes 2001–2025** (the owner's second question), for chosen factors first: "Rising", "Falling", "No clear trend yet", each with then -> now.
- Link: "Open full report".

### 7.4 "Why this place" explanation pattern
Template, filled only from data; no generated prose, no LLM:
1. **Headline:** "[City] meets [k] of your [n] limits."
2. **Met:** "✓ [Factor]: [value] [unit] a year (your limit: [limit])." one line each.
3. **Missed:** "✗ [Factor]: [value] (your limit: [limit]). [m] of the last 5 years were under it."
4. **Changes:** "[Factor]: Rising, [then] -> [now] (2001–2005 vs 2021–2025)." / "Falling, ..." / "No clear trend yet."
5. **What this can't show:** the per-factor caveat lines that apply (coastal square, gas flares, no pollen data).
6. **Source:** "NASA POWER, ~50 km grid, 2001–2025. [How we did this]"

This covers transparency (how it works) and scrutability (change a limit and see the city move) without persuasion.

### 7.5 Comparison view (2-4 columns)
- **Columns:** your place now (pinned) + up to 3 cities. Sticky header with names.
- **Verdict line at the top** (choose the first that is true):
  1. Dominance: "[A] is equal or better than [B] on all [n] things you chose."
  2. Count: "[A] meets [k] of your limits; [B] meets [j]."
  3. Otherwise: "No single winner. [A] has [better factor, numbers]. [B] has [better factor, numbers]."
- **Rows:** chosen factors first, grouped by family; other factors under "Other factors (not used for grouping)". A **"Show only rows that differ"** toggle, on by default (Baymard).
- **Each cell:** 2021–2025 value with unit · band word vs cutoff (where one exists) · then -> now · trend label.
- **Charts:** one overlaid line chart per chosen factor, all places on one y-axis, 2001–2025 (Weather Spark pattern; reuse `TrendChart`). Not more than 4 lines.
- **Context row:** the "changing everywhere" facts (NO₂ fell in 47 of 51).

### 7.6 Map and list interaction
- **Map:** 51 dots on the existing basemap (`TrendMap`/`MapView`), each labeled with its count ("3/4") and drawn by group with shape or fill (filled = meets all, ring = misses 1, small dot = misses 2+) in one neutral hue. No red/green: `docs/UX.md` reserves colour for direction, and the words carry the judgement. Hover = highlight row; click = select and scroll. Your place now = a distinct marker.
- **Background layers** (off by default, labeled as context, never used for grouping): the team's US grid maps of PM2.5, NO₂ and fire trends. Title them "How [X] changed 2001–2025".
- Don't color the whole country by a combined value. There is none.
- Mobile: list default, map toggle (NN/g).

### 7.7 Smallest build (hackathon scope)
- **Data:** one static JSON exported from `us_scan.csv`, plus the five 2021–2025 annual values per city-factor, plus lat/lon, plus a BH flag. Generated by `tools/us_scan.py`; no backend change, no new dependency.
- **Logic:** one pure presenter (for example, `presenters/placeFinder.js`: limits -> groups, misses, verdict, dominance) with a small test file, following the existing `presenters/*.test.js` pattern.
- **UI:** reuse `AddressSearch`, `FactorList`, `TrendChart`, `TrendMap` and the existing one-place compare in `ReportPage` (extend from 1 to 3 places).
- **Skipped on purpose:** weights, sliders, composite scores, climate twins, neighborhood ranking, projections, AI-written explanations, accounts.

### 7.8 Copy for the page frame
- H1: **Compare places for your household**
- Sub: **Choose up to 5 things that matter. We show which of 51 US cities stay under your limits, from NASA data for 2001–2025.**
- Under the list: **Grouped by how many of your limits each city meets. Nothing is weighted or added up. [How this works]**
- Before results: **This is a record of the past, not a forecast. It is not medical advice, and it is not advice to buy, sell or move.**

### 7.9 How to test it (cheap, before the demo)
- 3-5 people, think-aloud: give a household ("grandmother 70 with heart disease, child 4 with asthma, now in Houston"). Ask them to pick 3 cities and say why. Check: can they say why a city is in its group? Do their picks match the limits they set (Dimara et al.'s consistency idea)? Do they read "No clear trend yet" as "no change"?

---

## 8. Risks and honest limits

### 8.1 Risks

| Risk | Where it comes from | Mitigation |
| --- | --- | --- |
| False precision | 50 km grid shown as if it were a street; decimals | Whole days; 1 decimal for PM2.5; "~50 km" on every card; no parcel or neighborhood view |
| Biased factor dominates the result | MERRA-2 PM2.5 levels (sea salt, no nitrate) | PM2.5 as trend + context until validated (7.2) |
| Hidden weighting through split factors | Heat appears 3 times | Count families, not cards (7.1) |
| Chance "clear" flags across 510 tests | Multiple testing | BH flag in the finder (6.2) |
| Reading "best place" or "safe place" | Ranked lists invite it; "climate haven" marketing | Groups, not ranks; banned words; Asheville lesson |
| Medical advice creep | Condition-based preselection | Agency-attributed sensitivity lines only; link out; no "you should" |
| Personal health risk score | Combining household + place into a number | Never compute one; the household only changes which factors are pre-picked and their order (as the report does today) |
| Steering / fair housing | Place rankings | City scale, physical data only, same output for everyone, no demographics, prices, schools or crime |
| Liability / disputes | First Street lawsuit; Zillow "forecast, not fact" | Past observations only; source and period on every number; "not advice to buy, sell or move" |
| Dead federal links | EJScreen, climate.gov, heat.gov changes | Check links before the demo; prefer AirNow, NWS, CDC pages that are live |
| Privacy of health choices | Share links, server cache | Finder runs in the browser; share links carry city and factor keys only. Note: the existing `report_cache` key in `SPEC.md` includes conditions and age groups with a 2-decimal location; consider hashing or dropping them |
| Pollen and mold gaps | Allergies mapped to muggy days | Say "no pollen or mold data" on the allergy line |
| Fire counts misread as wildfire | Gas flares, farm burns | Caveat on the card; context only |

### 8.2 Honest-limits text (ready to paste)

**Short (on the page, under the results):**
> These results describe 2001–2025, not the future. Each city is one ~50 km grid square, so a neighborhood can differ. Only the PM2.5 and 95 °F limits come from US agencies; the others are set by our team and labeled. This is not medical advice and not advice to buy, sell or move.

**Long (methods page):**
> **What this shows.** For 51 US cities, how often very hot days, warm nights, very cold nights, muggy days and heavy rain happened from 2001 to 2025, plus fine-particle pollution (PM2.5), nitrogen dioxide (NO₂) and satellite fire detections. "Now" is the 2021–2025 average. A trend is called clear when a Mann-Kendall test finds it larger than normal year-to-year ups and downs (p < 0.05). When we compare many cities at once, we also correct for the number of tests, so a few borderline changes are marked "no clear trend yet".
>
> **What it can't show.** The future. Your street or building: weather data are ~50 km averages, which can miss city heat at night and include sea in coastal squares. Pollen, mold, ozone, flood zones, insurance, or prices. PM2.5 is a NASA model estimate, not a monitor reading: it counts sea salt and leaves out nitrate, so check EPA monitor data for a city you are serious about. NO₂ is measured through the whole lower atmosphere, not at street level. A fire detection is a hot satellite pixel, which may be a farm burn or a gas flare.
>
> **How cities are listed.** By how many of your limits each city meets, then by distance or A to Z. Nothing is weighted or added up. The 51 cities were chosen by our team and are not every place in the US.
>
> **Health.** Where we mention a group (for example, older adults and heat), we repeat what CDC, EPA, NWS or WHO say and link to them. We don't assess anyone's personal health risk. For daily conditions, use AirNow.gov and your local NWS forecast.

---

## 9. Unverified or open items
- Zillow restoring scores in 2026: none found. Homes.com's current First Street display is unconfirmed.
- WSJ details (Realtor.com flood % removal, seller opt-outs, the lawsuit) come from a syndicated copy; dates of the platform changes aren't given.
- The flood-disclosure price study: venue and authors not confirmed (Altiorem summary).
- Weather Spark: the data source and the muggy definition were not visible on the fetched pages.
- BestPlaces: a live climate comparison page was not reached; Summer Comfort Index details come from summaries.
- CDC Heat & Health Tracker app: current URL and status unconfirmed (old URL 404). heat.gov status unclear.
- CDC wording for diabetes and heat, and CDC's own cold-weather wording for older adults: not verified.
- Dimara et al. 2018: which visualization performed best not verified.
- The "3-4 items" comparison-table guidance attributed to NN/g: not confirmed on nngroup.com.
- EPA PM2.5 annual standard of 9 µg/m³ "upheld by the D.C. Circuit in June 2026" is taken from the team's `thresholds.json`, not re-checked here.
- MERRA-2 (not MERRAero) PM2.5 vs EPA AQS statistics for US cities: not retrieved. The PM2.5 recommendation rests on the scan pattern plus the team's own sea-salt and nitrate notes (`docs/SUBMISSION.md`).
- The EPA design-values URL is from memory; check it.
- Example copy lines with "2 of the last 5 years" are illustrative wording; compute the real counts.
