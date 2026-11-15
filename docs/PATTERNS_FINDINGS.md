# Patterns across variables: what the data shows (Nov 2026)

An experiment run with `python -m tools.patterns_scan` (in `data_pipeline/`) on 8 cities and 5 states, 2001–2025. It uses the same analysis as
`GET /api/v1/patterns` (`analysis/patterns.py`). Rerun the scan to refresh the numbers; the full output is
`data_pipeline/output/patterns_scan.json`.

> **Correction, 2026-11-15.** The first version of this page overstated "more extremes", for example "1.0 → 4.1 in 10"
> smoky months in Spokane. The line for "top 10%" was set on the first 10 years and then used to judge those same
> years. That makes later years look more extreme even when nothing changes: 21% of simulated records with no change
> came out "clear". Now one line from the whole record judges every year (3.5% false alarms, about the 5% the test
> allows). A code review also found that lags were counted in rows rather than calendar months for records with gaps,
> and that early-clue p-values treated runs of unusual months as independent. All three are fixed, and the numbers
> below come from the corrected code.

## How it works, in short

- **Links:**
  - The unusual months of two records are correlated, at the same time and with one record leading by 1–3 calendar months.
    - A month is unusual only against the same calendar month in other years.
    - The long-term trend is taken out first.
    - Gaps stay gaps.
  - A link counts only if it survives two corrections (q < 0.05) and |r| ≥ 0.2:
    - one for month-to-month memory (Bretherton et al. 1999);
    - one for every test run (Benjamini-Hochberg).
  - Links inside one dataset are partly built in, so the scan leaves them out. Examples: two NASA POWER weather records,
    PM2.5 and haze (both MERRA-2), or two MODIS land-temperature records.
- **More extremes:**
  - The whole record sets a top-10% line for each calendar month.
  - The first 10 complete years are compared with the last 10.
  - With no change, both read about 1 in 10 (less for records that are often zero).
  - A Mann-Kendall test on the yearly counts says whether the change is clear.
- **Early clues:**
  - For a clear link where one record leads: after the leader's top-10% months, how often was the follower in its
    matching top or bottom 10%?
  - Chance is measured by shifting the follower around the calendar by a year or more, which keeps each record's runs.
  - The link was picked on these same months, so the hit rates flatter it a little.
- **Warning signs:**
  - The rolling 10-year variance and lag-1 memory of the unusual months, and whether they rise (Kendall τ > 0.5).
  - These are standard indicators that a system is losing its usual balance (Scheffer et al. 2009; Dakos et al. 2012).
  - They describe the past and do not predict a disaster. Overlapping windows make them look surer than they are.

## What stood out

1. **Thicker smoke is up in the North and Northwest, and three records agree.**
   - Smoke days count medium and heavy smoke only, from 2011 (D37). An earlier run counted light smoke too and found
     smoke rising almost everywhere; most of that was light smoke, which jumped from 2022 in every season and is
     usually high above the ground (Liu et al. 2024).
   - The yearly rise is clear in Wisconsin (13.8 → 41.3 days a year, first and last five years of 2011–2025),
     Washington (11.7 → 26.7) and Spokane (15.2 → 34.0). California's rise (5.3 → 13.8) is not clear.
   - Wisconsin's worst smoke months became more frequent: 0.2 → 1.4 in 10, the only place where that is clear.
   - Month by month, the smoke outlines move with MERRA-2 PM2.5 (r = +0.39 to +0.70) and MERRA-2 haze
     (r = +0.29 to +0.74): three different records telling the same story, more closely than when light smoke was
     counted.
2. **Heat extremes are more common.**
   - Months above the record's top-10% temperature line: Texas 0.3 → 2.2 in 10, California and Arizona 0.6 → 1.9.
   - Summer ground heat seen by MODIS: Sacramento 0.5 → 2.4, Phoenix 0.8 → 2.1.
   - Humid heat: Houston 0.2 → 1.0 and Miami 0.3 → 1.1. Muggy months in Miami went 0.3 → 1.2.
3. **The wettest water-storage months have stopped in the dry West, but not in Florida.**
   - GRACE storage fell: California +2.5 → −16.9 cm, Spokane −0.1 → −12.8 cm (yearly trends, both clear).
   - Months in storage's top 10% went to zero:
     - Arizona 2.9 → 0.0;
     - Sacramento 2.9 → 0.0;
     - Texas 2.4 → 0.0;
     - Spokane 1.3 → 0.0;
     - Washington 1.2 → 0.0.
   - Miami went the other way: 0.0 → 2.5.
4. **Rain feeds the soil, the soil feeds storage.**
   - Root-zone soil wetness leads GRACE water storage by about a month: Wisconsin r = +0.73, Texas +0.68, Arizona +0.44.
   - Rain leads storage by 1–2 months: Washington +0.43, Texas +0.43, California +0.31.
   - NASA POWER's land model and the GRACE gravity satellites agree, which is a good check on both.
5. **The air got cleaner while smoke grew.**
   - NO₂'s worst months went from about 2 in 10 to 0.0–0.3 in 10 in every city.
   - Haze's worst months fell in Houston (1.9 → 0.5) and Texas (1.6 → 0.7).
   - Thicker smoke rose anyway in the North and Northwest: cleaner traffic and industry, more wildfire smoke.
6. **Warning signs worth a closer look:**
   - Swings in smoke days are growing in Texas and Arizona.
   - In Wisconsin, swings in soil wetness and water storage roughly tripled (0.40 → 1.34 and 0.29 → 1.19).

## Could any of this warn us? Mostly not on its own

- **The strongest clues are water moving through the ground.**
  - Very wet soil was followed by very high water storage a month later:
    - Wisconsin: 19 of 27 cases, where chance gives about 1;
    - Texas: 17 of 24.
  - It's real, but it's plumbing, not a warning.
- **Useful but weak clues, 3–5 times chance.** Each case out of about 23–30:
  - rain, then high storage a month or two later: Washington 10, Texas 10, California 8;
  - a hot month, then low storage the next month: Washington 9;
  - high PM2.5, then drier soil: California 8.
- **A curious one:** in Miami, high-NO₂ months were followed 3 months later by more fire detections nearby in 8 of 23
  cases (chance about 2). It's worth a look; it may be the dry season's burning following the winter air.
- **Strong links, no clue:** smoky months are followed by low water storage in Wisconsin and Milwaukee (r −0.48 to
  −0.55). But the smokiest months were followed by the lowest storage only 1 of 17 and 3 of 17 times, no better than
  chance. The link lives in ordinary months, not in the extremes, so it can't flag a coming extreme.
- **What it means for the app:** `/patterns` shows these hit rates beside each lagged link, with "That could still be
  chance" when the shift test doesn't pass, and never calls them a forecast. A real warning system would need daily data,
  a held-out test period and false-alarm rates, which is beyond a 25-year monthly record.

## What this can't say

- **Correlation is not cause.** A link says two things tend to be unusual together, not that one causes the other.
  Lead times (one record leading by 1–3 months) are a reason to look, not proof.
- **Scale:** grid squares are 10–300 km across depending on the dataset, so a city's street-level story can differ.
- **Record length:** 25 years is short for variability indicators. Treat warning signs as questions, not answers.
- **Coverage:** the smoke grid covers the lower 48 states only. Alaska, Hawaii and Puerto Rico show "not available".
