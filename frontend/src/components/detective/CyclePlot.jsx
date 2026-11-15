'use client'
import { useState } from 'react'
import { useChartWidth } from '../../lib/chartWidth'
import { format, sign } from '../../lib/format'
import { chartIndex } from '../../lib/roving'

const MAX_W = 720, H = 200, T = 14, B = 26, GAP = 6
const NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// Cleveland's cycle plot: one small panel per calendar month, each showing that month across the years, with the
// month's average as a tick. Months with a clear trend (after the 12-test correction) are drawn in the accent.
// Reading it: point at a panel, or tab to the chart and use the arrow keys (Home and End jump); the line under the
// chart says that month's average and trend, and is read out.
export default function CyclePlot({ cycle, unit = '' }) {
  const { months, min, max } = cycle
  const [active, setActive] = useState(null)
  const [ref, W] = useChartWidth(MAX_W)
  const pw = (W - GAP * 11) / 12
  const Y = (v) => T + (1 - (v - min) / (max - min || 1)) * (H - T - B)
  const m = active != null ? months[active] : null
  const readout = m ? `${NAMES[active]}: typical ${format(m.typical)} ${unit}; ${m.slope != null ? `${sign(m.slope)} ${unit} per decade, ` : ''}${m.clear ? 'a clear trend' : 'not clear yet'}.` : ''

  function onPointer(e) {
    const box = e.currentTarget.getBoundingClientRect()
    setActive(Math.max(0, Math.min(11, Math.floor((((e.clientX - box.left) / box.width) * W) / (pw + GAP)))))
  }
  function onKey(e) {
    const next = chartIndex(e.key, active ?? 0, months.length)
    if (next === null) return
    e.preventDefault()
    setActive(next)
  }

  return (
    <div className="dt-chart-live">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="dt-svg dt-cycle dt-interactive" tabIndex={0} role="group"
          aria-label="Cycle plot. Use the arrow keys to read each month."
          onPointerMove={onPointer} onPointerLeave={() => setActive(null)} onKeyDown={onKey}
          onFocus={() => setActive((a) => a ?? 0)} onBlur={() => setActive(null)}>
          {months.map((mo, i) => {
            const x0 = i * (pw + GAP)
            const n = mo.points.length
            const X = (j) => x0 + 4 + (j / Math.max(1, n - 1)) * (pw - 8)
            return (
              <g key={mo.label} className={`${mo.clear ? `is-clear ${mo.slope > 0 ? 'is-up' : 'is-down'}` : ''}${active === i ? ' is-active' : ''}`}>
                <rect x={x0} y={T - 6} width={pw} height={H - T - B + 12} className="dt-cycle-panel" rx="4" />
                {mo.typical != null && <line x1={x0 + 2} x2={x0 + pw - 2} y1={Y(mo.typical)} y2={Y(mo.typical)} className="dt-cycle-mean" />}
                <path d={mo.points.map((p, j) => `${j ? 'L' : 'M'}${X(j).toFixed(1)},${Y(p.value).toFixed(1)}`).join('')} className="dt-cycle-line" />
                <text x={x0 + pw / 2} y={H - 8} textAnchor="middle" className="dt-tick">{pw < 30 ? mo.label.slice(0, 1) : mo.label}</text>
              </g>
            )
          })}
          <text x={2} y={T - 1} className="dt-tick">{format(max)}</text>
      </svg>
      <p className="dt-readout" aria-live="polite">{readout || 'Point at a month, or use the arrow keys, to read it.'}</p>
    </div>
  )
}
