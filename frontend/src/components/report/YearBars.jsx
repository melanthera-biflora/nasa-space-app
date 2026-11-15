'use client'
import { useState } from 'react'
import { useChartWidth } from '../../lib/chartWidth'
import { format } from '../../lib/format'
import { chartIndex } from '../../lib/roving'

// One bar per year, with the early and recent 5-year averages drawn as labelled lines over their own years: the
// whole story of a record without a trend line, band or test (those are on /test). Full size is one tab stop: point
// at a bar or use the arrow keys, and the line under the chart reads that year. Compact is a picture for the cards.
export default function YearBars({ points, marks = [], unit = '', compact = false, label = '' }) {
  const [active, setActive] = useState(null)
  const [ref, fullW] = useChartWidth(640)
  if (points.length < 2) return compact ? null : <p className="dt-empty">No yearly values to draw.</p>
  const W = compact ? 240 : fullW, H = compact ? 56 : 200, T = compact ? 4 : 26, B = compact ? 2 : 22, L = compact ? 0 : 4, R = compact ? 0 : 4
  // Counts and amounts grow from 0. °C isn't a count: its bars rise or fall from the early-years average, so the change
  // shows instead of a row of near-equal bars (39 → 39.6 °C looked flat from 0).
  const base = /°C/.test(unit) ? (marks[0]?.value ?? Math.min(...points.map((p) => p.value))) : 0
  const values = [...points.map((p) => p.value), ...marks.map((m) => m.value), base]
  const lo = Math.min(...values), hi = Math.max(...values), range = hi - lo || 1
  const Y = (v) => T + (1 - (v - lo) / range) * (H - T - B)
  const step = (W - L - R) / points.length
  const X = (i) => L + i * step
  const first = points[0].year
  const xOfYear = (y) => { const i = points.findIndex((q) => q.year === y); return X(i === -1 ? y - first : i) }
  const bars = points.map((p, i) => {
    const top = Math.min(Y(p.value), Y(base)), h = Math.max(1, Math.abs(Y(p.value) - Y(base)))
    const zone = marks.findIndex((m) => p.year >= m.from && p.year <= m.to)
    return <rect key={p.year} x={X(i) + step * (compact ? 0.18 : 0.24)} width={step * (compact ? 0.64 : 0.52)} y={top} height={h} rx={compact ? 1 : 1.5}
      className={`yb-bar${zone === 0 ? ' is-early' : zone === 1 ? ' is-late' : ''}${active === i ? ' is-active' : ''}`} />
  })
  const lines = marks.map((m, k) => {
    const x1 = xOfYear(m.from), x2 = xOfYear(m.to) + step, y = Y(m.value)
    return (
      <g key={m.label} className={`yb-mark ${k === 0 ? 'is-early' : 'is-late'}`}>
        <line x1={x1} x2={x2} y1={y} y2={y} />
        {!compact && <circle cx={k === 0 ? x1 : x2} cy={y} r="3" className="yb-dot" />}
        {!compact && <text x={k === 0 ? x1 : x2} y={y - 8} textAnchor={k === 0 ? 'start' : 'end'}>{m.label} {format(m.value)} {unit}</text>}
      </g>
    )
  })
  if (compact) {
    return <svg viewBox={`0 0 ${W} ${H}`} className="yb yb-compact" aria-hidden="true" preserveAspectRatio="none">{bars}{lines}</svg>
  }
  const p = active != null ? points[active] : null
  function onKey(e) {
    const next = chartIndex(e.key, active ?? points.length - 1, points.length)
    if (next === null) return
    e.preventDefault()
    setActive(next)
  }
  return (
    <div className="yb-wrap">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="yb dt-interactive" tabIndex={0} role="group"
        aria-label={`${label}, one bar a year. Use the arrow keys to read each year.`}
        onPointerMove={(e) => {
          const box = e.currentTarget.getBoundingClientRect()
          setActive(Math.max(0, Math.min(points.length - 1, Math.floor((((e.clientX - box.left) / box.width) * W - L) / step))))
        }}
        onPointerLeave={() => setActive(null)} onKeyDown={onKey} onFocus={() => setActive((a) => a ?? points.length - 1)} onBlur={() => setActive(null)}>
        <line x1={L} x2={W - R} y1={Y(base)} y2={Y(base)} className="yb-base" />
        {bars}
        {lines}
        <text x={L} y={H - 4} className="yb-tick">{first}</text>
        <text x={W - R} y={H - 4} textAnchor="end" className="yb-tick">{points.at(-1).year}</text>
      </svg>
      <p className="yb-readout" aria-live="polite">{p ? `${p.year}: ${format(p.value)} ${unit}` : 'Point at a year, or use the arrow keys, to read it.'}</p>
    </div>
  )
}
