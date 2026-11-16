'use client'
import TrendChart from '../components/TrendChart'
import Term from '../components/ui/Term'
import { fragility, guessAnswer, LONGER, periodsFor, verdict } from '../presenters/detective'
import { useCurrent } from '../lib/query'
import { NextStep, Status } from './common'

// Step 3: test the trend for significance. "Not clear yet" says how many years it may need, and can try them.
export default function TestView() {
  const c = useCurrent()
  const f = c.factor
  const v = f?.available ? verdict(f) : null
  const answer = f?.available ? guessAnswer(c.guess, f) : null
  const canGoLonger = periodsFor(c.place, c.variable).includes(LONGER) && c.years !== LONGER
  return (
    <main className="dt-main" id="main">
      <h1 tabIndex={-1}>{c.label} in {c.placeName}: is the change real?</h1>
      <Status current={c}>
        {v?.state === 'none' && <div className="dt-status"><p><b>{v.title}.</b> {v.text}</p></div>}
        {v && v.state !== 'none' && (
          <>
            <section className={`dt-verdict is-${v.state}`} aria-labelledby="verdict-h">
              <p className="dt-verdict-kicker">{f.period?.[0]}–{f.period?.[1]}, {f.n_years} years, tested with Mann-Kendall{v.corrected ? `, ${v.corrected}` : ''}</p>
              <h2 id="verdict-h">{v.title}{v.state === 'clear' && !v.hangs ? `: ${v.direction}` : ''}</h2>
              {answer && <p className="dt-guess-answer"><b>{answer.text}</b> {answer.match ? 'Your eye and the test agree.' : 'Your eye and the test disagree: that is why we test a pattern before trusting it.'}</p>}
              <p className="dt-verdict-rate">{v.rate} <span className="dt-muted">(<Term title="95% range" definition="the rates that fit the data. If it includes zero, the data can't yet rule out no change.">{v.range}</Term>; <Term title="p-value" definition="how often a change this big would appear by chance if nothing were really changing.">{v.p}</Term>{v.q && <>; <Term title="q" definition="the p-value adjusted for testing every record of this place at once (Benjamini-Hochberg). Under 0.05 counts as a clear trend.">{v.q}</Term></>})</span></p>
              <p>{v.words}</p>
              {v.memory && <p className="dt-link-note">{v.memory}</p>}
              {v.monthly && <p>{v.monthly.text}</p>}
              {v.yearsNeeded && <p className="dt-years-needed"><b>How long would it take?</b> {v.yearsNeeded}</p>}
              {v.state === 'unclear' && canGoLonger && (
                <button type="button" className="dt-button" onClick={() => c.set({ years: LONGER, from: null, to: null })}>Try a longer series: 1981–2025</button>
              )}
              {v.state === 'unclear' && !canGoLonger && c.place.kind === 'point' && (
                <p className="dt-muted">Longer records (from 1981) are available for state averages of weather: pick a state above.</p>
              )}
            </section>
            <figure className="dt-chart is-wide">
              <figcaption><h2 className="dt-chart-title" id="yearly-h">Yearly values and the trend</h2>
                <p className="dt-takeaway">{fragility(f)}</p></figcaption>
              <TrendChart factor={f} placeName={c.placeName} />
            </figure>
            <details className="dt-method">
              <summary>How this test works</summary>
              <p>Mann-Kendall asks: across every pair of years, does the later year come out higher more often than chance allows? A report tests about 16 records at once, so a few would look clear by luck; the Benjamini-Hochberg correction turns each p into a q, and a trend is clear when q is under 0.05. The rate is Sen’s slope, the middle of the slopes between every pair of years, so one wild year barely moves it; the 95% range and the band on the chart come from the same slopes. A memory check runs beside the test: when a year tends to repeat the one before, the record holds less evidence, and the page says so. The monthly test (Seasonal Kendall) compares each month only with the same month in other years, and corrects for months that remember the month before.</p>
              <p>“How long would it take” uses Weatherhead et al. (1998): from how noisy the months are and how much they remember, the years a change this size needs for a 50% and a 90% chance of a clear result.</p>
            </details>
            <nav className="dt-next-row" aria-label="Next steps">
              <NextStep href="/events">Does one disaster year drive it?</NextStep>
              <NextStep href="/map">Is it happening elsewhere?</NextStep>
            </nav>
          </>
        )}
      </Status>
    </main>
  )
}
