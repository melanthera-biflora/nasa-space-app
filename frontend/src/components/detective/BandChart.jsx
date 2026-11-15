'use client'
import { useState } from 'react'
import { useChartWidth } from '../../lib/chartWidth'
import { format } from '../../lib/format'
import { chartIndex } from '../../lib/roving'
import { niceTicks } from '../../lib/ticks'

const MAX_W = 720, H = 240, L = 44, R = 12, T = 12, B = 28

// "This year vs normal": each month's usual range (10-90% light, 25-75% darker, median dashed), with one year on
// top. Months more than 2 standard deviations from their usual are ringed. With `readable`, the chart is one tab stop:
// point at a month or use the arrow keys, and the line under it reads the value against its usual range. (The weekly
// view leaves it off: its week picker does the reading.)
export default function BandChart({ rows, selected = null, readable = false, unit = '' }) {
  const [active, setActive] = useState(null)
  const [ref, W] = useChartWidth(MAX_W)
  const vals = rows.flatMap((r) => [r.p10, r.p90, r.value]).filter(Number.isFinite)
  if (!vals.length) return <p className="dt-empty">No monthly normals for this variable.</p>
  const lo = Math.min(...vals), hi = Math.max(...vals), pad = (hi - lo) * 0.06 || 1
  const X = (i) => L + (i + 0.5) * ((W - L - R) / rows.length)
  const short = (W - L - R) / rows.length < 30   // a phone: month initials, so labels stay 12 px and apart
  const dense = rows.length > 12   // weekly: month ticks instead of a label per row, smaller dots
  const floor = lo >= 0 ? Math.max(0, lo - pad) : lo - pad   // a count axis never dips below zero
  const Y = (v) => T + (1 - (v - floor) / (hi + pad - floor)) * (H - T - B)
  const area = (a, b) => `M${rows.map((r, i) => `${X(i)},${Y(r[b])}`).join('L')}L${[...rows].reverse().map((r) => `${X(rows.indexOf(r))},${Y(r[a])}`).join('L')}Z`
  const year = rows.map((r, i) => (Number.isFinite(r.value) ? [X(i), Y(r.value)] : null))
  const yearPath = year.reduce((d, p, i) => (p ? `${d}${d && year[i - 1] ? 'L' : 'M'}${p[0]},${p[1]}` : d), '')
  const a = active != null ? rows[active] : null
  const readout = !a ? '' : !Number.isFinite(a.value) ? `${a.label}: no data.`
    : `${a.label}: ${format(a.value)} ${unit}; usual ${format(a.p10)}–${format(a.p90)} ${unit} (median ${format(a.p50)})${Math.abs(a.z ?? 0) >= 2 ? `, ${format(Math.abs(a.z))} SD ${a.z > 0 ? 'above' : 'below'} usual` : ''}.`
  const live = readable ? {
    tabIndex: 0, role: 'group', 'aria-label': 'Monthly values against the usual range. Use the arrow keys to read each month.',
    onPointerMove: (e) => {
      const box = e.currentTarget.getBoundingClientRect()
      setActive(Math.max(0, Math.min(rows.length - 1, Math.floor(((((e.clientX - box.left) / box.width) * W) - L) / ((W - L - R) / rows.length)))))
    },
    onPointerLeave: () => setActive(null),
    onKeyDown: (e) => { const next = chartIndex(e.key, active ?? 0, rows.length); if (next !== null) { e.preventDefault(); setActive(next) } },
    onFocus: () => setActive((v) => v ?? 0), onBlur: () => setActive(null),
  } : {}
  const svg = (
    <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className={`dt-svg${readable ? ' dt-interactive' : ''}`} {...live}>
      {niceTicks(lo, hi).map((v) => (
        <g key={v}><line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} className="dt-grid" /><text x={L - 6} y={Y(v) + 4} textAnchor="end" className="dt-tick">{format(v)}</text></g>
      ))}
      <path d={area('p10', 'p90')} className="dt-normal-outer" />
      <path d={area('p25', 'p75')} className="dt-normal-inner" />
      <path d={`M${rows.map((r, i) => `${X(i)},${Y(r.p50)}`).join('L')}`} className="dt-normal-median" />
      <path d={yearPath} className="dt-year-line" />
      {rows.map((r, i) => Number.isFinite(r.value) && (
        <circle key={r.label} cx={X(i)} cy={Y(r.value)} r={Math.abs(r.z ?? 0) >= 2 ? (dense ? 4 : 6) : (dense ? 2 : 3.5)} className={Math.abs(r.z ?? 0) >= 2 ? 'dt-year-dot is-unusual' : 'dt-year-dot'} />
      ))}
      {selected != null && rows[selected] && <line x1={X(selected)} x2={X(selected)} y1={T} y2={H - B} className="dt-selected" />}
      {a && <line x1={X(active)} x2={X(active)} y1={T} y2={H - B} className="dt-cursor-line" />}
      {rows.map((r, i) => (dense ? r.tick : r.label) && <text key={r.label} x={X(i)} y={H - 8} textAnchor="middle" className="dt-tick">{dense ? r.tick : short ? r.label.slice(0, 1) : r.label}</text>)}
    </svg>
  )
  if (!readable) return svg
  return (
    <div className="dt-chart-live">
      {svg}
      <p className="dt-readout" aria-live="polite">{readout || 'Point at a month, or use the arrow keys, to read it.'}</p>
    </div>
  )
}
