import { useState } from 'react'
import { useChartWidth } from '../lib/chartWidth'
import { classOf } from '../lib/fieldPaint'
import { format, sign, unitOf } from '../lib/format'
import { classSteps } from '../presenters/detective'
import './MonthHeatmap.css'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const LEVEL = Array.from({ length: 7 }, (_, i) => `var(--seq-${i + 1})`)
const DIFF = Array.from({ length: 9 }, (_, i) => `var(--div-${i + 1})`)
const MAX_W = 800, LEFT = 48, TOP = 22, ROW = 16

// Every month of every year as one square: rows are years, columns months. "Value" shows when in the year
// it happens (a longer season shows up as wider colour); "Difference from usual" uses the report's anomaly
// (each month minus that calendar month's average), so a trend shows as blue rows turning red.
// Colours use the report's monthly_classes (equal-count steps, so one smoke August doesn't wash out the rest);
// older reports without them fall back to square-root steps, and the legend names the edges. Nothing is fitted here.
// Reading it: point at a square, or tab to the grid and use the arrow keys (Up and Down a year, Page Up and Page Down
// five, Home and End the row's ends); the line above it says that month, and is read out. The Table tab has every value.
export default function MonthHeatmap({ factor }) {
  const [mode, setMode] = useState('value')
  const [hover, setHover] = useState(null)
  const [ref, W] = useChartWidth(MAX_W)
  const rows = new Map()
  for (const m of factor.monthly || []) {
    const v = mode === 'value' ? m.value : m.anomaly
    if (!Number.isFinite(v)) continue
    const [y, mo] = m.month.split('-').map(Number)
    if (!rows.has(y)) rows.set(y, [])
    rows.get(y)[mo - 1] = { y, mo, value: m.value, anomaly: m.anomaly, v }
  }
  const years = [...rows.keys()].sort((a, b) => a - b)
  if (years.length < 3) return <p className="note">No monthly values for this card.</p>

  const all = years.flatMap((y) => rows.get(y).filter(Boolean))
  const max = Math.max(...all.map((c) => c.value))
  const maxAbs = Math.max(...all.map((c) => Math.abs(c.anomaly))) || 1
  const classes = factor.monthly_classes
  const root = (v, top) => Math.sign(v) * Math.sqrt(Math.abs(v) / top)
  const levelOf = (v) => {
    const edges = classes?.value
    if (!edges) return max > 0 ? Math.max(0, Math.min(6, Math.floor(root(v, max) * 7))) : 0
    return edges.length ? Math.round((classOf(v, edges) * 6) / edges.length) : 0
  }
  const diffOf = (a) => {
    const edges = classes?.anomaly
    if (!edges) return Math.max(0, Math.min(8, Math.round(root(a, maxAbs) * 4) + 4))
    if (!edges.length) return 4
    return 4 + Math.sign(a) * Math.round((classOf(Math.abs(a), edges) * 4) / edges.length)
  }
  const fill = (c) => (mode === 'value' ? LEVEL[levelOf(c.value)] : DIFF[diffOf(c.anomaly)])
  const steps = classes ? 'equal-count steps' : 'square-root steps'
  const unit = unitOf(factor)
  const cw = (W - LEFT) / 12
  const H = TOP + years.length * ROW + 4
  const peak = all.reduce((a, b) => (b.value > a.value ? b : a))
  const label = (c) => (c.v == null ? `${MONTHS[c.mo - 1]} ${c.y}: no data`
    : `${MONTHS[c.mo - 1]} ${c.y}: ${format(c.value)} ${unit} (${sign(c.anomaly)} vs a usual ${MONTHS[c.mo - 1]})`)
  const short = cw < 30   // a phone: month initials, so the labels stay 12 px and apart
  const steps2 = classes ? classSteps((mode === 'value' ? classes.value : classes.anomaly) || [], mode !== 'value') : []
  function onKey(e) {
    const cur = hover || all.at(-1)
    const r = years.indexOf(cur.y), m = cur.mo - 1
    const to = { ArrowLeft: [r, m - 1], ArrowRight: [r, m + 1], ArrowUp: [r - 1, m], ArrowDown: [r + 1, m], PageUp: [r - 5, m], PageDown: [r + 5, m], Home: [r, 0], End: [r, 11] }[e.key]
    if (!to) return
    e.preventDefault()
    const y = years[Math.max(0, Math.min(years.length - 1, to[0]))], mo = Math.max(0, Math.min(11, to[1])) + 1
    setHover(rows.get(y)[mo - 1] || { y, mo, v: null })
  }
  const summary = `${factor.label} by month, ${years[0]}–${years[years.length - 1]}. Highest month: ${label(peak)}.`

  return (
    <figure className="mh">
      <div className="mh-head">
        <div className="segmented" role="group" aria-label="Colour by">
          <button type="button" aria-pressed={mode === 'value'} onClick={() => setMode('value')}>Value</button>
          <button type="button" aria-pressed={mode === 'diff'} onClick={() => setMode('diff')}>Difference from usual</button>
        </div>
        <p className="mh-readout" aria-live="polite">{hover ? label(hover) : 'Point at a month, or use the arrow keys, to read it.'}</p>
      </div>
      <svg ref={ref} className="mh-svg dt-interactive" viewBox={`0 0 ${W} ${H}`} role="group" tabIndex={0}
        aria-label={`${summary} Use the arrow keys to read each month.`} onMouseLeave={() => setHover(null)}
        onKeyDown={onKey} onFocus={() => setHover((h) => h ?? all.at(-1))} onBlur={() => setHover(null)}>
        {MONTHS.map((m, k) => <text key={m} className="mh-axis" x={LEFT + cw * k + cw / 2} y={14} textAnchor="middle">{short ? m[0] : m}</text>)}
        {years.map((y, r) => (
          <g key={y}>
            {(r % 5 === 0 || r === years.length - 1) && <text className="mh-axis" x={LEFT - 8} y={TOP + r * ROW + ROW - 4} textAnchor="end">{y}</text>}
            {rows.get(y).map((c) => c && (
              <rect key={c.mo} className={hover?.y === c.y && hover?.mo === c.mo ? 'mh-cell is-active' : 'mh-cell'} x={LEFT + cw * (c.mo - 1) + 1} y={TOP + r * ROW + 1}
                width={cw - 2} height={ROW - 2} rx="2" style={{ fill: fill(c) }} onMouseEnter={() => setHover(c)} />
            ))}
          </g>
        ))}
      </svg>
      <figcaption className="mh-legend">
        {steps2.length > 0 ? (
          <>
            <span className="mh-steps">
              {steps2.map((st, i) => <span key={i}><i style={{ background: (mode === 'value' ? LEVEL : DIFF)[st.color] }} />{st.edge != null && format(st.edge)}</span>)}
            </span>
            <span>{mode === 'value' ? `${unit} in a month` : 'vs a usual month'}; each colour holds about the same number of months, and a number is where the next colour starts</span>
          </>
        ) : mode === 'value' ? (
          <><span>0</span><span className="mh-ramp">{LEVEL.map((c) => <i key={c} style={{ background: c }} />)}</span><span>{format(max)} {unit} in a month ({steps})</span></>
        ) : (
          <><span>{sign(-maxAbs)}</span><span className="mh-ramp">{DIFF.map((c) => <i key={c} style={{ background: c }} />)}</span><span>{sign(maxAbs)} vs a usual month ({steps})</span></>
        )}
      </figcaption>
    </figure>
  )
}
