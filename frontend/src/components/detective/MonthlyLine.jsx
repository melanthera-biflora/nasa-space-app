'use client'
import { useId, useState } from 'react'
import { useChartWidth } from '../../lib/chartWidth'
import { format, unitOf } from '../../lib/format'
import { chartIndex } from '../../lib/roving'
import { niceTicks } from '../../lib/ticks'
import { axisCap } from '../../presenters/detective'

const MAX_W = 720, H = 260, L = 44, R = 12, B = 28

// Every month as a thin line, the yearly averages as dots, and the trend with its shaded 95% band (all from the
// API). Event months are shaded behind, so a spike can be read against its cause. A yearly-only record (the frost-free
// season) shows its yearly dots alone.
// Reading it (SPEC A3, S45): the pointer snaps a crosshair to the nearest year; the chart is one tab stop where Left and
// Right step a year, Page Up and Page Down five, Home and End jump; a polite line reads the year out.
export default function MonthlyLine({ factor, spans = [], trend = true }) {
  const [svg, W] = useChartWidth(MAX_W)
  const [active, setActive] = useState(null)        // index into the yearly points
  const clip = useId()
  const months = (factor.monthly || []).filter((m) => Number.isFinite(m.value))
  const points = (factor.points || []).filter((p) => Number.isFinite(p.value))
  const yearly = months.length < 2
  if (yearly && points.length < 2) return <p className="dt-empty">No data for this variable.</p>
  const t = (ym) => Number(ym.slice(0, 4)) + (Number(ym.slice(5, 7)) - 0.5) / 12
  const x0 = yearly ? points[0].year : t(months[0].month), x1 = yearly ? points.at(-1).year + 1 : t(months.at(-1).month)
  // a few towering months (fire smoke on PM2.5) squashed the rest: the axis stops near the 98th percentile, the line is
  // clipped there, and the tallest months are named above it
  const cap = yearly ? null : axisCap(months)
  const T = cap ? 42 : 24
  const line = trend ? (factor.line || []).filter((p) => Number.isFinite(p.trend)) : []   // hidden until the guess on /explore
  // the yearly dots are on the same axis, so they are in its range too (count totals sat above the top tick)
  const ys = [...months.map((m) => (cap ? Math.min(m.value, cap.top) : m.value)), ...points.map((p) => p.value), ...line.flatMap((p) => [p.lo95, p.hi95]).filter(Number.isFinite)]
  const lo = Math.min(...ys), hi = Math.max(...ys), pad = (hi - lo) * 0.05 || 1
  const X = (v) => L + ((v - x0) / (x1 - x0 || 1)) * (W - L - R)
  const floor = lo >= 0 ? Math.max(0, lo - pad) : lo - pad   // a count axis never dips below zero
  const Y = (v) => T + (1 - (v - floor) / (hi + pad - floor)) * (H - T - B)
  const path = yearly ? '' : months.map((m, i) => `${i ? 'L' : 'M'}${X(t(m.month)).toFixed(1)},${Y(m.value).toFixed(1)}`).join('')
  const band = line.length > 1 && line.every((p) => Number.isFinite(p.lo95))
    ? `M${line.map((p) => `${X(p.year + 0.5)},${Y(p.hi95)}`).join('L')}L${[...line].reverse().map((p) => `${X(p.year + 0.5)},${Y(p.lo95)}`).join('L')}Z` : ''
  const firstYear = Math.ceil(x0), lastYear = Math.floor(x1)
  const step = lastYear - firstYear > 30 ? 10 : 5
  const yTicks = niceTicks(lo, hi)
  const unit = unitOf(factor)
  const named = []                                    // up to 3 spike labels, at least 110 px apart so none overlap
  for (const s of cap?.spikes || []) {
    if (named.length === 3) break
    const x = Math.max(L + 55, Math.min(W - R - 55, X(t(s.month))))
    if (named.every((n) => Math.abs(n.x - x) >= 110)) named.push({ ...s, x, at: X(t(s.month)) })
  }
  const p = active != null ? points[active] : null
  const trendAt = p ? line.find((l) => l.year === p.year)?.trend : null
  const readout = p ? `${p.year}: ${format(p.value)} ${unit}${Number.isFinite(trendAt) ? `; the trend line is at ${format(trendAt)}` : ''}.` : ''

  function onPointer(e) {
    const box = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - box.left) / box.width) * W
    let best = 0
    points.forEach((q, i) => { if (Math.abs(X(q.year + 0.5) - x) < Math.abs(X(points[best].year + 0.5) - x)) best = i })
    setActive(best)
  }
  function onKey(e) {
    const next = chartIndex(e.key, active ?? points.length - 1, points.length)
    if (next === null) return
    e.preventDefault()
    setActive(next)
  }

  return (
    <div className="dt-chart-live">
      <svg ref={svg} viewBox={`0 0 ${W} ${H}`} className="dt-svg dt-interactive" tabIndex={0} role="group"
        aria-label={`Chart: ${factor.label}. Use the arrow keys to read each year.`}
        onPointerMove={onPointer} onPointerLeave={() => setActive(null)} onKeyDown={onKey} onFocus={() => setActive((a) => a ?? points.length - 1)} onBlur={() => setActive(null)}>
        {spans.map((s) => (
          <rect key={s.id + s.from} x={X(s.from)} width={Math.max(3, X(s.to) - X(s.from))} y={T} height={H - T - B} className="dt-event-span" />
        ))}
        <text x={L} y={12} className="dt-tick dt-axis-unit">{unit}</text>
        {yTicks.map((v) => (
          <g key={v}><line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} className="dt-grid" /><text x={L - 6} y={Y(v) + 4} className="dt-tick" textAnchor="end">{format(v)}</text></g>
        ))}
        {Array.from({ length: lastYear - firstYear + 1 }, (_, i) => firstYear + i).filter((y) => y % step === 0).map((y) => (
          <text key={y} x={X(y)} y={H - 8} className="dt-tick" textAnchor="middle">{y}</text>
        ))}
        {band && <path d={band} className="dt-band" />}
        <clipPath id={clip}><rect x={L} y={T} width={W - L - R} height={H - T - B} /></clipPath>
        {path && <path d={path} className="dt-month-line" clipPath={cap ? `url(#${clip})` : undefined} />}
        {named.map((s) => (
          <g key={s.month} className="dt-spike">
            <path d={`M${s.at - 4},${T + 1}L${s.at + 4},${T + 1}L${s.at},${T - 5}Z`} />
            <text x={s.x} y={T - 9} textAnchor="middle" className="dt-tick">{s.label}</text>
          </g>
        ))}
        {points.map((q) => <circle key={q.year} cx={X(q.year + 0.5)} cy={Y(q.value)} r="3.2" className="dt-year-dot" />)}
        {line.length > 1 && <path d={`M${line.map((q) => `${X(q.year + 0.5)},${Y(q.trend)}`).join('L')}`} className="dt-trend-line" />}
        {p && (
          <g className="dt-cursor" aria-hidden="true">
            <line x1={X(p.year + 0.5)} x2={X(p.year + 0.5)} y1={T} y2={H - B} />
            <circle cx={X(p.year + 0.5)} cy={Y(p.value)} r="6" />
            <g transform={`translate(${Math.min(W - R - 150, Math.max(L, X(p.year + 0.5) - 75))}, ${T})`}>
              <rect width="150" height="34" rx="4" />
              <text x="10" y="14" className="dt-cursor-year">{p.year}</text>
              <text x="10" y="28">{format(p.value)} {unit}</text>
            </g>
          </g>
        )}
      </svg>
      {cap && <p className="dt-note">The axis stops at {format(cap.top)} {unit} so the usual months stay readable; {cap.above} {cap.above === 1 ? 'month went' : 'months went'} higher, and the tallest are named at the top.</p>}
      <p className="sr-only" aria-live="polite">{readout}</p>
    </div>
  )
}
