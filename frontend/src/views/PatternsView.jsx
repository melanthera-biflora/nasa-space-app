'use client'
import { useState } from 'react'
import LinkWeb from '../components/LinkWeb'
import MultiLine from '../components/MultiLine'
import { SparkBars, SparkLine } from '../components/Spark'
import Disclosure from '../components/ui/Disclosure'
import Icon from '../components/ui/Icon'
import Skeleton from '../components/ui/Skeleton'
import Term from '../components/ui/Term'
import { format } from '../lib/format'
import { useDetective } from '../lib/query'
import { placeLabel } from '../presenters/detective'
import { compoundRows, exceedRows, headline, linkRows, monthOf, shortLabel, signRows, usePair, usePatterns, winterRows } from '../presenters/patterns'
import { NextStep, Waiting } from './common'
import './patterns.css'

// Step 6: what moves together, and is anything changing in how it behaves? Describes the past record; no forecast.
export default function PatternsView() {
  const { place, name } = useDetective()
  const { data, error, loading } = usePatterns(place)
  const [opts, setOpts] = useState({ sameSource: false, unclear: false })
  const [picked, setPicked] = useState(null)      // the pair in the detail: set by a click, a tap or the keyboard
  const [hovered, setHovered] = useState(null)    // only highlights; moving the pointer never changes the detail
  const where = data?.place?.name || placeLabel(place, name)
  const rows = linkRows(data, opts)
  const sel = rows.find((r) => r.id === picked) || rows[0]
  const nameOf = (k) => shortLabel(k, data?.labels)

  return (
    <main className="dt-main" id="main">
      <h1 tabIndex={-1}>What moves together in {where}?</h1>
      <Waiting error={error} waiting={loading} subject={where} shape="sections" />
      {data && (
        <>
          <p className="dt-lede">{headline(data)} Uses the full record (2001–2025); this page describes the past and does not forecast.</p>
          {data.complete === false && (
            <p className="dt-link-note" role="status">Some NASA data didn’t arrive this time, so a few records are missing and these counts may change on your next visit.</p>
          )}

          <section className="dt-chart is-wide" aria-labelledby="pt-links-h">
            <h2 id="pt-links-h" className="dt-chart-title">Things that move together</h2>
            <p className="dt-takeaway">Each record is compared with its own usual for that calendar month, with its long-term trend taken out.
              A line joins two records whose unusual months line up. Thicker is stronger; dashed means one runs high while the other runs low.</p>
            <div className="pt-toggles">
              <label><input type="checkbox" checked={opts.sameSource} onChange={(e) => setOpts({ ...opts, sameSource: e.target.checked })} /> Include pairs from one dataset</label>
              <label><input type="checkbox" checked={opts.unclear} onChange={(e) => setOpts({ ...opts, unclear: e.target.checked })} /> Include pairs that aren&apos;t clear</label>
            </div>
            {rows.length === 0 ? <p className="dt-empty">No clear links here between records from different datasets. Try including pairs from one dataset.</p> : (
              <div className="pt-links">
                <LinkWeb rows={rows.filter((r) => r.clear)} selected={sel?.id} hovered={hovered} onSelect={setPicked} onHover={setHovered} nameOf={nameOf} />
                <ol className="pt-list" aria-label="Pairs, strongest first">
                  {rows.map((r) => (
                    <li key={r.id}>
                      <button type="button" className={`pt-row${r.id === sel?.id ? ' is-on' : ''}${r.id === hovered ? ' is-hover' : ''}${r.clear ? '' : ' is-faint'}`}
                        aria-pressed={r.id === sel?.id} onClick={() => setPicked(r.id)}
                        onPointerEnter={() => setHovered(r.id)} onPointerLeave={() => setHovered(null)}>
                        <span className="pt-pair">{r.nameA}<Icon name={r.lag ? 'chevron-right' : 'link'} size={14} />{r.nameB}</span>
                        <span className="pt-meter" aria-hidden="true"><span className={r.together ? '' : 'is-opposite'} style={{ width: `${r.strength * 100}%` }} /></span>
                        <span className="pt-r">r {r.r > 0 ? '+' : '−'}{Math.abs(r.r).toFixed(2)}</span>
                        <span className="pt-when">{r.when}{r.sameSource ? ', one dataset' : ''}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {sel && <PairDetail sel={sel} place={place} />}
          </section>

          <Extremes rows={exceedRows(data)} />
          <Signs {...signRows(data)} />
          <Together rows={compoundRows(data)} />
          <Winters w={winterRows(data)} />

          <Disclosure summary="How this works, and what it can't say">
            <ul className="pt-method">
              <li>Links: Spearman correlation of unusual months, at once and with one leading by 1–3 months. A link counts when it survives a correction for month-to-month memory (Bretherton et al. 1999) and for all {data.relations_tested} tests (every pair, both directions and each lag; Benjamini-Hochberg, q &lt; 0.05), and |r| ≥ 0.2. A gap in a record stays a gap, so a lag is always counted in calendar months.</li>
              <li>Pairs from one dataset (two NASA POWER weather records, or PM2.5 and haze from MERRA-2) share a model, so part of their link is built in. They are hidden unless you include them.</li>
              <li>More extremes: the whole record sets one top-10% line for each calendar month, and we count how many months a year pass it, early years against recent ones (Mann-Kendall test on the yearly counts). A line set on the early years alone would make later years look more extreme even with no change (Zhang et al. 2005).</li>
              <li>Early clues: a hit rate in the past record. Chance is measured by shifting one record around the calendar by a year or more, which keeps each record&apos;s runs of unusual months. The link was picked on these same months, so the rate flatters it a little.</li>
              <li>Signs of change: variance and lag-1 memory of the unusual months in rolling 10-year windows, flagged when Kendall&apos;s τ &gt; 0.5 (Scheffer et al. 2009; Dakos et al. 2012). Overlapping windows make these look surer than they are; treat them as a reason to look.</li>
              <li>El Niño and La Niña winters: December to February, named by January. A winter counts as El Niño when NOAA&apos;s Relative Oceanic Niño Index for those months is +0.5 or more, La Niña at −0.5 or less. Each record&apos;s straight-line trend is taken out first, then each phase&apos;s winters are compared with the other winters (Mann-Whitney U, Benjamini-Hochberg across the {data.winters?.tested ?? 0} tests). With this few winters of each kind, only strong differences show as clear.</li>
              <li>Correlation is not cause. A lead of a few months is a reason to look, not proof. Grid squares are 10–300 km across depending on the dataset.</li>
            </ul>
          </Disclosure>

          <nav className="dt-next-row" aria-label="Next steps">
            <NextStep href="/events">Were the unusual months disasters?</NextStep>
            <NextStep href="/map">Where else is it changing?</NextStep>
          </nav>
        </>
      )}
    </main>
  )
}

function PairDetail({ sel, place }) {
  const lines = usePair(place, sel.a, sel.b)
  return (
    <div className="pt-detail" aria-live="polite">
      <p className="pt-sentence"><b>{sel.sentence}</b> <span className="pt-q"><Term title="q" definition="a p-value adjusted for testing many pairs at once: under 0.05 counts as a clear link.">{sel.q < 0.001 ? 'q < 0.001' : `q = ${format(sel.q)}`}</Term></span></p>
      {sel.hits && (
        <div className="pt-hits">
          <p>{sel.hits.text}{sel.hits.clear ? ' Fewer than 1 in 20 shifted copies did as well.' : ' That could still be chance.'}</p>
          <div className="pt-hitbars" role="img" aria-label={`${Math.round(sel.hits.rate * 100)}% after unusual months, ${Math.round(sel.hits.chance * 100)}% by chance`}>
            <span className="pt-hitbar"><em>{Math.round(sel.hits.rate * 100)}% after unusual {sel.nameA.toLowerCase()} months</em><span className="pt-track"><span style={{ width: `${sel.hits.rate * 100}%` }} /></span></span>
            <span className="pt-hitbar is-chance"><em>{Math.round(sel.hits.chance * 100)}% by chance</em><span className="pt-track"><span style={{ width: `${sel.hits.chance * 100}%` }} /></span></span>
          </div>
        </div>
      )}
      <figure className="pt-pairchart">
        <figcaption>
          <span className="pt-key"><i className="is-a" />{sel.nameA}</span>
          <span className="pt-key"><i className="is-b" />{sel.nameB}{sel.lag ? ` (follows ${sel.when.replace(' later', '')})` : ''}</span>
          <span className="pt-axis-note">Unusual months, trend removed, 3-month average. 0 is usual for that month.</span>
        </figcaption>
        {lines === null ? <Skeleton height={200} /> : lines.length === 2 && lines[0].length && lines[1].length
          ? <MultiLine series={[{ name: sel.nameA, points: lines[0] }, { name: sel.nameB, points: lines[1] }]} unit="" xFormat={monthOf} endLabels={false} zero />
          : <p className="dt-empty">The monthly series for this pair didn&apos;t load.</p>}
      </figure>
    </div>
  )
}

function Extremes({ rows }) {
  if (!rows.length) return null
  return (
    <section className="dt-chart is-wide" aria-labelledby="pt-ex-h">
      <h2 id="pt-ex-h" className="dt-chart-title">More extremes than before?</h2>
      <p className="dt-takeaway">For each calendar month, the whole record sets a top-10% line. If nothing changed, about 1 month in 10 would pass it early and late alike. How often did months pass it in the first years, and how often lately?</p>
      <ul className="pt-ex">
        {rows.map((r) => (
          <li key={r.key} className={r.clear ? '' : 'is-faint'}>
            <span className="pt-ex-name">{r.name}</span>
            <svg className="pt-dumbbell" viewBox="0 0 200 20" role="img" aria-label={`${r.name}: ${r.text}`}>
              <line x1="4" x2="196" y1="10" y2="10" className="pt-db-axis" />
              <line x1={4 + r.first * 19.2} x2={4 + r.last * 19.2} y1="10" y2="10" className="pt-db-span" />
              <circle cx={4 + r.first * 19.2} cy="10" r="4" className="pt-db-then" />
              <circle cx={4 + r.last * 19.2} cy="10" r="5" className="pt-db-now" />
            </svg>
            <span className="pt-ex-text" title={r.span}>{r.text}{r.clear ? `, clearly ${r.last > r.first ? 'more often' : 'less often'}` : ', not clear'}</span>
            <SparkBars points={r.years} max={10} mark={1} label={`${r.name}: months past the line each year`} unit=" in 10" />
          </li>
        ))}
      </ul>
      <p className="dt-note">Dot on the left: the first 10 complete years. Dot on the right: the last 10. Bars: each year, with the dashed 1-in-10 line where no change would sit.</p>
    </section>
  )
}

function Signs({ rising, steady }) {
  if (!rising.length && !steady.length) return null
  return (
    <section className="dt-chart is-wide" aria-labelledby="pt-sg-h">
      <h2 id="pt-sg-h" className="dt-chart-title">Signs of change in how things swing</h2>
      <p className="dt-takeaway">Bigger swings, or unusual spells that last longer, are what scientists watch for when a system is losing its usual balance.
        These describe the past 25 years; they are not a forecast.</p>
      {rising.length === 0 ? <p className="dt-empty">No record here shows clearly growing swings or longer spells.</p> : (
        <ul className="pt-signs">
          {rising.map((r) => (
            <li key={r.key}>
              <span className="pt-ex-name">{r.name}</span>
              <span className="pt-sign"><SparkLine values={r.variance.values} labels={r.ends} rising={r.variance.rising} label={`Size of swings, ${r.variance.first} to ${r.variance.last}`} />
                <span>Swings {r.variance.rising ? <b>growing</b> : 'no clear rise'} ({format(r.variance.first)} → {format(r.variance.last)})</span></span>
              <span className="pt-sign"><SparkLine values={r.memory.values} labels={r.ends} rising={r.memory.rising} label={`Memory, ${r.memory.first} to ${r.memory.last}`} />
                <span>Spells {r.memory.rising ? <b>lasting longer</b> : 'no clear rise'} ({format(r.memory.first)} → {format(r.memory.last)})</span></span>
            </li>
          ))}
        </ul>
      )}
      {steady.length > 0 && <p className="dt-note">No clear rise in swings or spells: {steady.map((r) => r.name).join(', ')}.</p>}
    </section>
  )
}

function Together({ rows }) {
  if (!rows.length) return null
  return (
    <section className="dt-chart is-wide" aria-labelledby="pt-tg-h">
      <h2 id="pt-tg-h" className="dt-chart-title">Extremes together</h2>
      <p className="dt-takeaway">Months when both were in their most unusual 10% for that time of year. Two extremes at once are harder on people, crops and water supplies than either alone.</p>
      <ul className="pt-ex">
        {rows.map((r) => (
          <li key={r.id} className={r.clear ? '' : 'is-faint'}>
            <span className="pt-ex-name">{r.label}</span>
            <SparkBars points={r.years} max={Math.max(3, ...r.years.map((y) => y.value))} label={`${r.label} per year`} unit=" months" />
            <span className="pt-ex-text">{r.text}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

// El Niño and La Niña winters (D42): each dot is one winter, trend removed; lanes by phase, labelled, so colour is
// never the only cue. The sentences carry the result; the drawing is hidden from screen readers.
function Winters({ w }) {
  if (!w) return null
  return (
    <section className="dt-chart is-wide" aria-labelledby="pt-wn-h">
      <h2 id="pt-wn-h" className="dt-chart-title">El Niño and La Niña winters</h2>
      <p className="dt-takeaway">El Niño and La Niña are swings in the tropical Pacific that shift winter weather across the US. Of the {w.total} winters
        from {w.first} to {w.last}, {w.elNino} were El Niño and {w.laNina} La Niña. Were this place&apos;s winters different in them? Each dot is one
        winter with the long-term trend taken out: the middle line is a usual winter.</p>
      <ul className="pt-wn">
        {w.rows.map((r) => (
          <li key={r.key} className={r.clear ? '' : 'is-faint'}>
            <span className="pt-ex-name">{r.name}</span>
            <div className="pt-wn-plot" aria-hidden="true">
              {r.lanes.map((l) => (
                <div key={l.phase} className="pt-wn-lane">
                  <span className="pt-wn-lab">{l.label}</span>
                  <span className="pt-wn-track">{l.dots.map((d) => <i key={d.year} className={`pt-wn-dot is-${l.phase}`} style={{ left: `${d.at}%` }} title={`Winter ${d.year}: ${d.value > 0 ? '+' : ''}${format(d.value)} ${r.unit}`} />)}</span>
                </div>
              ))}
              <div className="pt-wn-lane pt-wn-axis"><span /><span className="pt-wn-track"><span>−{format(r.max)}</span><span>usual</span><span>+{format(r.max)} {r.unit}</span></span></div>
            </div>
            <ul className="pt-wn-text">{r.sentences.map((s) => <li key={s.phase}>{s.text}</li>)}</ul>
          </li>
        ))}
      </ul>
      <p className="dt-note">A winter is December to February, named by its January. This describes past winters only. It is not a seasonal outlook: those come from NOAA.</p>
    </section>
  )
}

