'use client'
import { useState } from 'react'
import { useChartWidth } from '../lib/chartWidth'
import { format } from '../lib/format'
import { chartIndex } from '../lib/roving'
import { placeColor } from '../lib/placeColors'
import { niceTicks } from '../lib/ticks'

const MAX_W = 720, H = 240, L = 48, T = 14, B = 26

// Up to four places on one set of axes (Weather Spark's compare pattern): lines labelled at their right end, a
// crosshair on hover that reads every place's value for that year, and dashes as a second cue besides colour.
// x may be fractional (monthly points); xFormat words it in the readout. endLabels=false leaves naming to a legend.
// Keyboard: one tab stop; Left and Right step a year (Page Up/Down five, Home/End the ends) and a line reads it out.
export default function MultiLine({ series, unit, xFormat = String, endLabels = true, zero = false, label = '' }) {
  const [ref, W] = useChartWidth(MAX_W)
  const R = endLabels ? Math.min(120, Math.round(W * 0.28)) : 16
  const [year, setYear] = useState(null)
  const all = series.flatMap((s) => s.points)
  if (!all.length) return <p className="dt-empty">No yearly data to draw.</p>
  const years = [...new Set(all.map((p) => p.year))].sort((a, b) => a - b)
  const v = all.map((p) => p.value)
  const lo = Math.min(...v), hi = Math.max(...v), pad = (hi - lo) * 0.08 || 1
  const X = (y) => L + ((y - years[0]) / Math.max(1, years.at(-1) - years[0])) * (W - L - R)
  const Y = (x) => T + (1 - (x - (lo - pad)) / (hi - lo + 2 * pad)) * (H - T - B)
  const onMove = (e) => {
    const box = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - box.left) / box.width) * W
    setYear(years.reduce((b, y) => (Math.abs(X(y) - x) < Math.abs(X(b) - x) ? y : b), years[0]))
  }
  // end labels: sorted by height and nudged at least 13 px apart, so two lines ending at the same value stay readable
  const labelY = {}
  series.map((s) => [s.name, s.points.filter((p) => Number.isFinite(p.value)).at(-1)]).filter(([, p]) => p)
    .map(([name, p]) => [name, Y(p.value) + 4]).sort((a, b) => a[1] - b[1])
    .forEach(([name, y], k, all) => { labelY[name] = k ? Math.max(y, labelY[all[k - 1][0]] + 13) : y })
  const readout = year == null ? '' : `${xFormat(year)}: ${series.map((s) => {
    const p = s.points.find((q) => q.year === year)
    return `${s.name} ${p && Number.isFinite(p.value) ? `${format(p.value)} ${unit}`.trim() : 'no value'}`
  }).join('; ')}.`
  function onKey(e) {
    const next = chartIndex(e.key, year == null ? years.length - 1 : years.indexOf(year), years.length)
    if (next === null) return
    e.preventDefault()
    setYear(years[next])
  }
  return (
    <>
    <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="dt-svg ml-svg dt-interactive" onPointerMove={onMove} onPointerLeave={() => setYear(null)}
      role="group" tabIndex={0} onKeyDown={onKey} onFocus={() => setYear((y) => y ?? years.at(-1))} onBlur={() => setYear(null)}
      aria-label={`${label || series.map((s) => s.name).join(', ')}: each year. Left and right arrows read one year at a time.`}>
      {niceTicks(lo, hi).map((t) => (
        <g key={t}><line x1={L} x2={W - R} y1={Y(t)} y2={Y(t)} className="dt-grid" /><text x={L - 6} y={Y(t) + 4} textAnchor="end" className="dt-tick">{format(t)}</text></g>
      ))}
      {zero && lo < 0 && hi > 0 && <line x1={L} x2={W - R} y1={Y(0)} y2={Y(0)} className="cs-zero" />}
      {years.filter((y) => Number.isInteger(y) && y % 5 === 0).map((y) => <text key={y} x={X(y)} y={H - 6} textAnchor="middle" className="dt-tick">{y}</text>)}
      {series.map((s, i) => {
        const pts = s.points.filter((p) => Number.isFinite(p.value))
        if (!pts.length) return null
        const last = pts.at(-1)
        return (
          <g key={s.name}>
            <path d={pts.map((p, j) => `${j ? 'L' : 'M'}${X(p.year)},${Y(p.value)}`).join('')} fill="none" stroke={placeColor(i)} strokeWidth="2"
              strokeDasharray={i === 0 ? undefined : ['', '6 3', '2 3', '8 3 2 3'][i]} />
            {endLabels && <text x={X(last.year) + 6} y={labelY[s.name]} className="ml-label" fill={placeColor(i)}>{s.name}</text>}
          </g>
        )
      })}
      {year != null && (
        <g pointerEvents="none">
          <line x1={X(year)} x2={X(year)} y1={T} y2={H - B} className="dt-cursor-line" />
          <rect x={Math.min(X(year) + 8, W - R - 150)} y={T} width="150" height={18 + series.length * 15} rx="4" className="cs-tip" />
          <text x={Math.min(X(year) + 16, W - R - 142)} y={T + 14} className="cs-tip-title">{xFormat(year)}</text>
          {series.map((s, i) => {
            const p = s.points.find((q) => q.year === year)
            return <text key={s.name} x={Math.min(X(year) + 16, W - R - 142)} y={T + 29 + i * 15} className="cs-tip-text">{s.name}: {p ? `${format(p.value)} ${unit}` : '—'}</text>
          })}
        </g>
      )}
    </svg>
    <p className="ml-readout" aria-live="polite">{readout}</p>
    </>
  )
}
