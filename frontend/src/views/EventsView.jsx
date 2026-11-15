'use client'
import { useState } from 'react'
import BandChart from '../components/detective/BandChart'
import ChartFrame from '../components/detective/ChartFrame'
import Icon from '../components/ui/Icon'
import { format, unitOf } from '../lib/format'
import Term from '../components/ui/Term'
import { band, bandYears, defaultBandYear, fragility, unusualMonths, useEvents, withoutEventYears } from '../presenters/detective'
import { useCurrent } from '../lib/query'
import { NextStep, Status } from './common'
import WeeklySection from './WeeklySection'

// Step 4: spike or trend? Unusual months, the catalogued events they line up with, and the trend without them.
export default function EventsView() {
  const c = useCurrent()
  const { events, region } = useEvents(c.place)
  const f = c.factor
  const [picked, setPicked] = useState({ for: '', year: null })
  const key = `${c.place.code || c.place.lat}|${c.variable}|${c.years}`
  const year = picked.for === key ? picked.year : f?.available ? defaultBandYear(f) : null
  const top = f?.available ? unusualMonths(f, events, c.variable) : []
  const without = f?.available ? withoutEventYears(f, events, c.variable) : []
  const rows = f?.available && year ? band(f, year) : []
  return (
    <main className="dt-main" id="main">
      <h1 tabIndex={-1}>{c.label} in {c.placeName}: which months were unusual, and why?</h1>
      <Status current={c}>
        {f?.available && (
          <>
            <p className="dt-lede">A disaster makes a spike: one month far from its usual (we measure “far” in <Term title="standard deviations (SD)" definition="the usual spread of that calendar month across the years. 2 SD away happens about once in 20 years by chance.">standard deviations</Term>). A trend is a slow shift over many years. Here are the most unusual months, the catalogued events they line up with, and whether the trend survives without those years.</p>
            <section aria-labelledby="odd-h">
              <h2 id="odd-h" className="dt-chart-title">The most unusual months</h2>
              <ol className="dt-odd">
                {top.map((m) => (
                  <li key={m.month} className={m.high ? 'is-high' : 'is-low'}>
                    <button type="button" className="dt-odd-month" onClick={() => setPicked({ for: key, year: Number(m.month.slice(0, 4)) })}
                      aria-label={`${m.label}: show this year against normal`}>
                      <span className="dt-odd-when">{m.label}</span>
                      <span className="dt-odd-value">{format(m.value)} <small>{unitOf(f)}</small></span>
                      <span className="dt-odd-how">
                        <span className="dt-odd-gauge" aria-hidden="true"><i style={{ width: `${m.gauge * 100}%` }} /></span>
                        {m.strength} for {m.forMonth}: {format(Math.abs(m.z))} SD {m.high ? 'above' : 'below'} usual
                      </span>
                    </button>
                    {m.events.map((e) => (
                      <p key={e.id} className="dt-match"><Icon name="link" size={14} />
                        <span><span className="dt-match-title">{e.title}.</span> {e.summary} <a href={e.source.url} target="_blank" rel="noreferrer">{e.source.name}</a></span>
                      </p>))}
                  </li>
                ))}
              </ol>
              {top.length === 0 && <p className="dt-muted">No month here was more than 2 standard deviations from its usual: no spikes to explain.</p>}
              {top.length > 0 && !top.some((m) => m.events.length) && <p className="dt-match is-none">None of these months lines up with a catalogued event.</p>}
            </section>
            {rows.length > 0 && (
              <ChartFrame wide live title={`${year} against the normal range`}
                takeaway={`Grey bands are each month's usual range over ${f.period?.[0]}–${f.period?.[1]} (light: 8 in 10 years, dark: half of years). The line is ${year}; ringed months were more than 2 standard deviations from usual.`}
                table={{ columns: ['Month', `${year}`, 'Usual (median)', 'Usual range (10–90%)'], rows: rows.map((r) => [r.label, format(r.value), format(r.p50), `${format(r.p10)}–${format(r.p90)}`]) }}>
                <label className="dt-inline-field">Year{' '}
                  <span className="ui-select"><select value={year} onChange={(e) => setPicked({ for: key, year: Number(e.target.value) })}>
                    {bandYears(f).map((y) => <option key={y} value={y}>{y}</option>)}
                  </select><Icon name="chevron-down" size={16} /></span>
                </label>
                <BandChart rows={rows} readable unit={unitOf(f)} />
              </ChartFrame>
            )}
            <WeeklySection place={c.place} variable={c.variable} years={c.years} defaultYear={year} />
            <section className="dt-chart is-wide" aria-labelledby="robust-h">
              <h2 id="robust-h" className="dt-chart-title">Does the trend survive without the event years?</h2>
              <p className="dt-takeaway">{fragility(f)}</p>
              {without.length > 0 ? (
                <ul className="dt-without">{without.map((w) => <li key={w.year} className={w.changes ? 'is-changes' : ''}><b>{w.event}</b> · {w.text}{w.changes && ' The verdict changes.'}</li>)}</ul>
              ) : <p className="dt-muted">No catalogued event for this variable falls inside the years analyzed here.</p>}
            </section>
            <section aria-labelledby="cat-h">
              <h2 id="cat-h" className="dt-chart-title">Catalogued events {region ? `in ${region}` : ''}</h2>
              {events.length ? (
                <ul className="dt-events">
                  {events.map((e) => (
                    <li key={e.id} className={e.variables.includes(c.variable) ? 'is-relevant' : ''}>
                      <span className={`dt-event-type is-${e.type}`}>{e.type}</span>
                      <div><b>{e.title}</b> <span className="dt-muted">{e.start}{e.end !== e.start ? ` to ${e.end}` : ''}</span>
                        <p>{e.summary} <a href={e.source.url} target="_blank" rel="noreferrer">{e.source.name}</a></p></div>
                    </li>
                  ))}
                </ul>
              ) : <p className="dt-muted">No events in our short list for this state yet.</p>}
              <p className="dt-note">A hand-picked list of well-documented events, not a full catalogue. “Consistent with” means the dates line up; it doesn't prove the event caused the value.</p>
            </section>
            <nav className="dt-next-row" aria-label="Next steps"><NextStep href="/map">Is it happening elsewhere?</NextStep></nav>
          </>
        )}
      </Status>
    </main>
  )
}
