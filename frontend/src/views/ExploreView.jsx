'use client'
import ChartFrame from '../components/detective/ChartFrame'
import MonthlyLine from '../components/detective/MonthlyLine'
import Stripes from '../components/detective/Stripes'
import Icon from '../components/ui/Icon'
import { format, unitOf } from '../lib/format'
import { GUESSES, stripes, takeaway, useEvents } from '../presenters/detective'
import { useCurrent } from '../lib/query'
import { NextStep, Status } from './common'

// Step 1 of the challenge's detective steps: look, guess, then test. The trend line, its band and the verdict stay hidden
// until the guess, so the eye decides first; the guess rides in the URL (guess=up|down|flat) and /test answers it.
export default function ExploreView() {
  const c = useCurrent()
  const { events } = useEvents(c.place)
  const guess = c.guess
  const f = c.factor
  const spans = (events || []).filter((e) => e.variables.includes(c.variable)).map((e) => ({
    id: e.id, from: Number(e.start.slice(0, 4)) + (Number(e.start.slice(5, 7)) - 1) / 12,
    to: Number(e.end.slice(0, 4)) + Number(e.end.slice(5, 7)) / 12,
  }))
  return (
    <main className="dt-main" id="main">
      <h1 tabIndex={-1}>{c.label} in {c.placeName}</h1>
      <Status current={c}>
        {f && (
          <>
            <p className="dt-lede">{f.definition}</p>
            <ChartFrame wide live title={`Every month, ${f.period?.[0]}–${f.period?.[1]}`}
              takeaway={guess ? takeaway(f, c.placeName) : `Every month from ${f.period?.[0]} to ${f.period?.[1]}, with the yearly values as dots. The trend line and the verdict appear once you make your call below.`}
              table={{ columns: ['Year', `Yearly value (${unitOf(f)})`], rows: (f.points || []).map((p) => [p.year, format(p.value)]) }}>
              <Stripes stripes={stripes(f)} variable={c.variable} />
              <MonthlyLine factor={f} spans={spans} trend={Boolean(guess)} />
              <ul className="dt-legend" aria-hidden="true">
                <li><i className="k-month" />Each month</li><li><i className="k-year" />Yearly value</li>
                {guess && <li><i className="k-trend" />Trend with 95% band</li>}{spans.length > 0 && <li><i className="k-event" />Catalogued event</li>}
              </ul>
              <p className="dt-source"><Icon name="info" size={14} />Data: {f.data_source}.</p>
            </ChartFrame>
            <section className="dt-guess" aria-labelledby="guess-h">
              <h2 id="guess-h">Your call, detective: does it look like a trend?</h2>
              <p>Decide before you test. People see patterns in noise, so a guess first keeps the test honest.</p>
              <div className="segmented" role="group" aria-label="Your guess">
                {GUESSES.map(([k, label]) => <button key={k} type="button" aria-pressed={guess === k} onClick={() => c.set({ guess: k })}>{label}</button>)}
              </div>
              <p className="dt-guess-next" aria-live="polite">
                {guess && <>Noted: “{GUESSES.find((g) => g[0] === guess)[1].toLowerCase()}”. The trend line and its band are now on the chart. <NextStep href="/test">Test it</NextStep></>}
              </p>
            </section>
            <nav className="dt-next-row" aria-label="Next steps">
              <NextStep href="/seasons">Which seasons are changing?</NextStep>
              <NextStep href="/events">Which spikes were disasters?</NextStep>
            </nav>
          </>
        )}
      </Status>
    </main>
  )
}
