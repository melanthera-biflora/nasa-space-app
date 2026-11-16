'use client'
import { useState } from 'react'
import { useChartWidth } from '../../lib/chartWidth'
import { format } from '../../lib/format'
import { chartIndex } from '../../lib/roving'
import { niceTicks } from '../../lib/ticks'
import { waterSense } from '../../presenters/detective'

const MAX_W = 720, H = 250, L = 44, R = 12, T = 14, B = 30

// The typical year, then and now: each calendar month's early average (dashed, hollow) and recent average (solid) over
// its usual range (the grey band: most years fall inside it). Months whose own trend is clear get a coloured link
// between the two and an arrow under the month: red up and blue down (brown drier, teal wetter for water records),
// always with the arrow and the words, never colour alone. Point at a month, or tab in and use the arrow keys.
export default function TypicalYear({ data, unit = '', variable }) {
  const [ref, W] = useChartWidth(MAX_W)
  const [active, setActive] = useState(null)
  const { months, min, max, thenLabel, nowLabel } = data
  const sense = waterSense(variable)
  const tone = (up) => (sense === 'wet' ? (up ? 'is-wetter' : 'is-drier') : sense === 'dry' ? (up ? 'is-drier' : 'is-wetter') : up ? 'is-up' : 'is-down')
  const pad = (max - min) * 0.08 || 1
  const lo = min >= 0 ? Math.max(0, min - pad) : min - pad, hi = max + pad
  const step = (W - L - R) / 12
  const X = (i) => L + (i + 0.5) * step
  const Y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B)
  const line = (key) => months.map((m, i) => (Number.isFinite(m[key]) ? `${X(i)},${Y(m[key])}` : null)).filter(Boolean).join(' ')
  const banded = months.every((m) => Number.isFinite(m.lo) && Number.isFinite(m.hi))
  const band = banded ? `M${months.map((m, i) => `${X(i)},${Y(m.hi)}`).join('L')}L${[...months].reverse().map((m, k) => `${X(11 - k)},${Y(m.lo)}`).join('L')}Z` : ''

  function onPointer(e) {
    const box = e.currentTarget.getBoundingClientRect()
    setActive(Math.max(0, Math.min(11, Math.floor((((e.clientX - box.left) / box.width) * W - L) / step))))
  }
  function onKey(e) {
    const next = chartIndex(e.key, active ?? 0, 12)
    if (next === null) return
    e.preventDefault()
    setActive(next)
  }

  return (
    <div className="dt-chart-live">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="dt-svg ty-svg dt-interactive" tabIndex={0} role="group"
        aria-label={`The typical year, ${thenLabel} and ${nowLabel}, month by month. Use the arrow keys to read each month.`}
        onPointerMove={onPointer} onPointerLeave={() => setActive(null)} onKeyDown={onKey}
        onFocus={() => setActive((a) => a ?? 0)} onBlur={() => setActive(null)}>
        <text x={L} y={T - 2} className="dt-tick dt-axis-unit">{unit}</text>
        {niceTicks(lo, hi, 4).map((v) => (
          <g key={v}><line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} className="dt-grid" /><text x={L - 6} y={Y(v) + 4} textAnchor="end" className="dt-tick">{format(v)}</text></g>
        ))}
        {active != null && <rect x={L + active * step} y={T} width={step} height={H - T - B} className="ty-col" />}
        {band && <path d={band} className="ty-band" />}
        {months.map((m, i) => (m.clear && Number.isFinite(m.then) && Number.isFinite(m.now)
          ? <line key={`c${i}`} x1={X(i)} x2={X(i)} y1={Y(m.then)} y2={Y(m.now)} className={`ty-link ${tone(m.up)}`} /> : null))}
        <polyline points={line('then')} className="ty-then-line" />
        <polyline points={line('now')} className="ty-now-line" />
        {months.map((m, i) => (
          <g key={m.label}>
            {Number.isFinite(m.then) && <circle cx={X(i)} cy={Y(m.then)} r="4" className="ty-then" />}
            {Number.isFinite(m.now) && <circle cx={X(i)} cy={Y(m.now)} r="4.5" className="ty-now" />}
            <text x={X(i)} y={H - 10} textAnchor="middle" className={`dt-tick${m.clear ? ' ty-clear' : ''}`}>
              {step < 34 ? m.label.slice(0, 1) : m.label}{m.clear ? (m.up ? ' ↑' : ' ↓') : ''}
            </text>
          </g>
        ))}
      </svg>
      <p className="dt-readout" aria-live="polite">{active != null ? months[active].text : 'Point at a month, or use the arrow keys, to read it.'}</p>
      <ul className="dt-legend ty-legend" aria-hidden="true">
        <li><i className="ty-k-then" />{thenLabel} average</li>
        <li><i className="ty-k-now" />{nowLabel} average</li>
        {band && <li><i className="ty-k-band" />Usual range (most years)</li>}
        <li><i className="ty-k-link" />Clear change that month (↑ or ↓)</li>
      </ul>
    </div>
  )
}
