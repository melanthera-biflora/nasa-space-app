import { useState } from 'react'
import { useChartWidth } from '../lib/chartWidth'
import { format, sign, unitOf } from '../lib/format'
import { moveFocus } from '../lib/roving'
import './TrendChart.css'
import { niceTicks } from '../lib/ticks'

const MAX_W = 800, H = 272, LEFT = 52, RIGHT = 18, TOP = 42, BOTTOM = 36
const pathOf = (rows, x, y, key) => rows.map((r, i) => `${i ? 'L' : 'M'} ${x(r.year)} ${y(r[key])}`).join(' ')
// yearly values: a missing year breaks the line (GRACE has gaps), instead of a straight line across it
const gappedPath = (rows, x, y, key) => rows.map((r, i) => `${i && r.year - rows[i - 1].year === 1 ? 'L' : 'M'} ${x(r.year)} ${y(r[key])}`).join(' ')

// Yearly values (a dot a year), the trend with its 95% band (indigo when the trend is clear, grey and dashed when it
// isn't yet), the first and last 5-year averages on a light tint, unusual years ringed in orange, and any limit named
// where it is drawn (its source under the chart). Optional second place in orange. Never draws past the last year.
export default function TrendChart({ factor, compare = null, compareName = '', placeName = '' }) {
  const [hover, setHover] = useState(null)
  const [svgRef, W] = useChartWidth(MAX_W)
  const [stop, setStop] = useState(null)   // the year that takes Tab (default: the latest); arrows move from there
  const points = (factor.points || []).filter((p) => Number.isFinite(p.value))
  if (!points.length) return <p className="tc-empty">No yearly data for this factor.</p>

  const line = (factor.line || []).filter((l) => Number.isFinite(l.trend))
  const cPoints = (compare?.points || []).filter((p) => Number.isFinite(p.value))
  const cLine = (compare?.line || []).filter((l) => Number.isFinite(l.trend))
  const limit = factor.limits?.high_from
  const hasLimit = Number.isFinite(limit) && factor.level != null
  // the health standard too (PM2.5: EPA's 9 µg/m³), so a recent 12.1 doesn't look safe under the 15 line alone
  const caution = factor.limits?.caution_from
  const hasCaution = Number.isFinite(caution) && factor.level != null && caution !== limit
  const values = [...points.map((p) => p.value), ...line.flatMap((l) => [l.lo95, l.hi95]),
    ...cPoints.map((p) => p.value), ...cLine.map((l) => l.trend)]
  // °C is not a count: an axis from 0 squeezed a 39 → 39.6 °C change into the top tenth, so temperatures fit the data
  const temperature = /°C/.test(factor.unit_short || factor.unit || '')
  const dataLo = Math.min(...values), dataHi = Math.max(...values, hasLimit ? limit : -Infinity, hasCaution ? caution : -Infinity)
  const pad = (dataHi - dataLo) * 0.08 || 1
  const min = temperature ? dataLo - pad : Math.min(0, ...values)
  const max = temperature ? dataHi + pad : Math.max(...values, hasLimit ? limit : 0, hasCaution ? caution : 0, min + 1) * 1.12
  const years = [...points, ...cPoints].map((p) => p.year)
  const y0 = Math.min(...years), y1 = Math.max(...years)
  const x = (yr) => LEFT + ((yr - y0) * (W - LEFT - RIGHT)) / Math.max(1, y1 - y0)
  const y = (v) => TOP + ((max - v) / (max - min)) * (H - TOP - BOTTOM)

  const band = line.length
    ? `${pathOf(line, x, y, 'hi95')} ${[...line].reverse().map((l) => `L ${x(l.year)} ${y(l.lo95)}`).join(' ')} Z`
    : ''
  const windows = [['then', factor.then_years, factor.then], ['now', factor.now_years, factor.now]]
    .filter(([, yrs, v]) => yrs?.length === 2 && Number.isFinite(v))
  const unusual = new Set((factor.timeline?.unusual_years || []).map((u) => u.year))
  const worst = factor.timeline?.highlights?.worst_year
  const unit = unitOf(factor)
  const [lo, hi] = factor.slope_ci95_per_decade || []
  const active = hover === null ? null : points[hover]
  const summary = `${factor.label}: ${format(factor.then)} to ${format(factor.now)} ${unit}. Trend ${sign(factor.slope_per_decade)} ${unit} per decade, ${factor.p_label}, ${factor.significance_label}.`
    + (worst ? ` Worst year ${worst.year}: ${format(worst.value)}.` : '')
    + (compare ? ` ${compareName}: ${format(compare.then)} to ${format(compare.now)}, ${compare.p_label}, ${compare.significance_label}.` : '')

  return (
    <figure className="tc">
      <div className="tc-stats">
        {compare && <b>{placeName}</b>}
        <span className={`sig ${factor.significant ? 'is-significant' : ''}`}>{factor.significance_label}</span>
        <span>
          {sign(factor.slope_per_decade)} {unit} per decade
          {Number.isFinite(lo) && Number.isFinite(hi) && <span className="tc-muted"> (95% CI {sign(lo)} to {sign(hi)})</span>}
        </span>
        <span className="tc-muted">Mann-Kendall {factor.p_label}</span>
      </div>
      {compare && (
        <div className="tc-stats tc-stats-compare">
          <b>{compareName}</b>
          <span className={`sig ${compare.significant ? 'is-significant' : ''}`}>{compare.significance_label}</span>
          <span>{format(compare.then)} → {format(compare.now)} {unit} · {sign(compare.slope_per_decade)} per decade</span>
          <span className="tc-muted">{compare.p_label}</span>
        </div>
      )}
      <svg ref={svgRef} className="tc-svg" viewBox={`0 0 ${W} ${H}`} role="group" aria-label={`${summary} Arrow keys move between years.`}>
        {niceTicks(min, max, 5).map((v) => {
          return (
            <g key={v}>
              <line className="tc-grid" x1={LEFT} x2={W - RIGHT} y1={y(v)} y2={y(v)} />
              <text className="tc-axis" x={LEFT - 10} y={y(v) + 4} textAnchor="end">{format(v)}</text>
            </g>
          )
        })}
        <text className="tc-axis tc-unit" x={LEFT - 10} y={TOP - 4} textAnchor="end">{unit}</text>
        {windows.map(([key, [a, b], v]) => (
          <g key={key}>
            <rect className="tc-window" x={x(a)} y={TOP} width={Math.max(2, x(b) - x(a))} height={H - TOP - BOTTOM} />
            <line className="tc-window-mean" x1={x(a)} x2={x(b)} y1={y(v)} y2={y(v)} />
            {/* anchored at the outer edges, so neither label runs off a narrow chart */}
            <text className="tc-window-label" x={key === 'then' ? x(a) : x(b)} y={TOP - 4} textAnchor={key === 'then' ? 'start' : 'end'}>
              {a}–{String(b).slice(2)} average <tspan className="tc-window-value">{format(v)}</tspan>
            </text>
          </g>
        ))}
        {band && <path className={`tc-band${factor.significant ? '' : ' is-unclear'}`} d={band} />}
        {hasLimit && (
          <g>
            <line className="tc-limit" x1={LEFT} x2={W - RIGHT} y1={y(limit)} y2={y(limit)} />
            <text className="tc-limit-label" x={W - RIGHT} y={y(limit) - 5} textAnchor="end">High level {format(limit)}</text>
          </g>
        )}
        {hasCaution && (
          <g>
            <line className="tc-limit is-health" x1={LEFT} x2={W - RIGHT} y1={y(caution)} y2={y(caution)} />
            <text className="tc-limit-label is-health" x={W - RIGHT} y={y(caution) - 5} textAnchor="end">Health standard {format(caution)}</text>
          </g>
        )}
        <path className="tc-values" pathLength="1" d={gappedPath(points, x, y, 'value')} />
        {/* pathLength 1 drives the draw-in, but it would stretch an unclear trend's dashes over the whole line */}
        {line.length > 0 && <path className={`tc-trend${factor.significant ? '' : ' is-unclear'}`} pathLength={factor.significant ? 1 : undefined} d={pathOf(line, x, y, 'trend')} />}
        {cPoints.length > 0 && <path className="tc-compare-values" pathLength="1" d={pathOf(cPoints, x, y, 'value')} />}
        {cLine.length > 0 && <path className="tc-compare-trend" d={pathOf(cLine, x, y, 'trend')} />}
        {points.map((p) => <circle key={`d${p.year}`} className="tc-dot" cx={x(p.year)} cy={y(p.value)} r="2.75" />)}
        {points.filter((p) => unusual.has(p.year)).map((p) => (
          <circle key={`u${p.year}`} className="tc-record" cx={x(p.year)} cy={y(p.value)} r="6" />
        ))}
        {worst && Number.isFinite(worst.value) && (
          <text className="tc-record-label" x={Math.max(LEFT + 60, Math.min(W - RIGHT - 60, x(worst.year)))}
            y={Math.max(TOP + 12, y(worst.value) - 10)} textAnchor="middle">
            {worst.year}: {format(worst.value)} (worst year)
          </text>
        )}
        {points.map((p, i) => (
          <g key={p.year}>
            {(i === 0 || i === points.length - 1 || p.year % 5 === 0) && (
              <text className="tc-axis" x={x(p.year)} y={H - 10} textAnchor="middle">{p.year}</text>
            )}
            <circle className="tc-hit" cx={x(p.year)} cy={y(p.value)} r="9" data-roving
              tabIndex={i === (stop ?? points.length - 1) ? 0 : -1}
              aria-label={`${p.year}: ${format(p.value)} ${factor.unit}`}
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
              onFocus={() => { setHover(i); setStop(i) }} onBlur={() => setHover(null)} onKeyDown={moveFocus} />
          </g>
        ))}
        {active && (() => {
          const at = line.find((l) => l.year === active.year)?.trend
          const bx = Math.max(LEFT, Math.min(W - RIGHT - 168, x(active.year) - 84))
          const by = y(active.value) - 58 < TOP ? y(active.value) + 14 : y(active.value) - 58
          return (
            <g pointerEvents="none">
              <line className="tc-guide" x1={x(active.year)} x2={x(active.year)} y1={TOP} y2={H - BOTTOM} />
              <circle className="tc-active" cx={x(active.year)} cy={y(active.value)} r="5" />
              <g transform={`translate(${bx} ${by})`}>
                <rect className="tc-tip" width="168" height={Number.isFinite(at) ? 44 : 28} rx="6" />
                <text className="tc-tip-title" x="10" y="18">{active.year}: {format(active.value)} {unit}</text>
                {Number.isFinite(at) && <text className="tc-tip-text" x="10" y="35">trend line at {format(at)}</text>}
              </g>
            </g>
          )
        })()}
      </svg>
      <figcaption className="tc-legend">
        <span><i className="tc-key tc-key-dot" />Each year ({factor.unit})</span>
        <span><i className={`tc-key tc-key-trend${factor.significant ? '' : ' is-unclear'}`} />Trend with 95% band{factor.significant ? '' : ' (dashed: not clear yet)'}</span>
        <span><i className="tc-key tc-key-window" />First and last 5-year averages</span>
        {unusual.size > 0 && <span><i className="tc-key tc-key-record" />Unusual years (worse than 9 in 10)</span>}
        {compare && <span><i className="tc-key tc-key-compare" />{compareName} (dashed: its trend)</span>}
        {hasCaution && <span><i className="tc-key tc-key-limit is-health" />Health standard</span>}
        {hasLimit && <span><i className="tc-key tc-key-limit" />High level</span>}
      </figcaption>
      {(hasCaution || hasLimit) && (
        <p className="tc-sources">
          {hasCaution && <>Health standard {format(caution)}: {factor.limits.source}. </>}
          {hasLimit && <>High level {format(limit)}: {factor.limits.high_source || factor.limits.source}.</>}
        </p>
      )}
    </figure>
  )
}
