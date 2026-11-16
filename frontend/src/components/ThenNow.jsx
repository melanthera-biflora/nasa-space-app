'use client'
import { useChartWidth } from '../lib/chartWidth'
import { format } from '../lib/format'
import { placeColor } from '../lib/placeColors'

const GLYPH = { Rising: '↑', Falling: '↓' }
const MAX_W = 620, H = 210, T = 30, B = 14, LEFT = 56, LABEL = 150, GAP = 15

// Spread labels at least GAP px apart, top to bottom, inside the chart (end labels of lines that finish close together).
function spread(items) {
  const out = [...items].sort((a, b) => a.y - b.y)
  out.forEach((it, k) => { if (k) it.y = Math.max(it.y, out[k - 1].y + GAP) })
  const over = out.length ? out.at(-1).y - (H - B) : 0
  if (over > 0) out.forEach((it) => { it.y = Math.max(T, it.y - over) })
  return Object.fromEntries(out.map((it) => [it.name, it.y]))
}

// Then → now for one topic as a slope chart: one line per place, from its 2001–2005 average (left) to its 2021–2025
// average (right), each place in its own colour (the same in every chart of Side by side) and named at the line's end.
// Solid when the trend is clear, dashed when it isn't yet. A thin bar past the right end is the last five years' range;
// the shaded band is under the household's limit. Rows below repeat everything in words, so the drawing is hidden from
// screen readers. Places keep the household's order (never sorted by value).
export default function ThenNow({ block }) {
  const [ref, W] = useChartWidth(MAX_W)
  const { lo, limit, unit, rows } = block
  const drawn = rows.map((r, i) => ({ ...r, i })).filter((r) => !r.missing)
  // a limit far above every value squeezed the lines to the bottom: then the chart fits the data and says so
  const dataHi = Math.max(lo, ...drawn.flatMap((r) => [r.then, r.now, r.hi]).filter(Number.isFinite))
  const above = limit != null && limit > dataHi * 1.6 + 1
  const hi = above ? dataHi : block.hi
  const pad = (hi - lo) * 0.06 || 1
  const Y = (v) => T + (1 - (v - lo) / (hi - lo + pad || 1)) * (H - T - B)
  const x0 = LEFT, x1 = Math.max(LEFT + 120, W - LABEL)
  const barX = (i) => x1 + 8 + i * 6
  const labelX = x1 + 14 + drawn.length * 6
  const right = spread(drawn.map((r) => ({ name: r.name, y: Y(r.now) + 4 })))
  const left = spread(drawn.map((r) => ({ name: r.name, y: Y(r.then) + 4 })))
  return (
    <figure className="tn">
      <figcaption>
        <b>{block.label}</b> <span className="dt-muted">({unit}) · your limit: {limit == null ? 'not clearly rising' : `fewer than ${format(limit)}`}</span>
      </figcaption>
      {drawn.length > 0 && (
        <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="dt-svg tn-svg" aria-hidden="true" focusable="false">
          {above && (
            <g>
              <rect x={x0} width={x1 - x0} y={T} height={Y(lo) - T} className="tn-under" />
              <text x={(x0 + x1) / 2} y={T + 12} textAnchor="middle" className="tn-note">↑ your limit {format(limit)} is above this scale</text>
            </g>
          )}
          {!above && limit != null && limit > lo && (
            <g>
              <rect x={x0} width={x1 - x0} y={Y(Math.min(limit, hi))} height={Y(lo) - Y(Math.min(limit, hi))} className="tn-under" />
              <line x1={x0} x2={x1} y1={Y(limit)} y2={Y(limit)} className="tn-limit" />
              <text x={(x0 + x1) / 2} y={Y(limit) - 6} textAnchor="middle" className="tn-note">your limit {format(limit)}</text>
            </g>
          )}
          <line x1={x0} x2={x0} y1={T - 6} y2={H - B} className="tn-col" />
          <line x1={x1} x2={x1} y1={T - 6} y2={H - B} className="tn-col" />
          <text x={x0} y={T - 14} textAnchor="middle" className="tn-head-label">2001–05</text>
          <text x={x1} y={T - 14} textAnchor="middle" className="tn-head-label">2021–25</text>
          {drawn.map((r) => (
            <g key={r.name} style={{ '--place': placeColor(r.i) }}>
              {r.lo != null && <rect x={barX(r.i) - 2} width="4" y={Y(r.hi)} height={Math.max(2, Y(r.lo) - Y(r.hi))} rx="2" className="tn-range" />}
              <line x1={x0} x2={x1} y1={Y(r.then)} y2={Y(r.now)} className={`tn-line${r.clear ? '' : ' is-unclear'}`} />
              <circle cx={x0} cy={Y(r.then)} r="4.5" className="tn-then" />
              <circle cx={x1} cy={Y(r.now)} r="5" className="tn-now" />
              <text x={x0 - 10} y={left[r.name]} textAnchor="end" className="tn-value">{format(r.then)}</text>
              <text x={labelX} y={right[r.name]} className="tn-end">
                <tspan className="tn-end-name">{r.name}</tspan> {format(r.now)}
              </text>
            </g>
          ))}
        </svg>
      )}
      <ul className="tn-rows">
        {rows.map((r, i) => (
          <li key={r.name} className="tn-row">
            <i className="tn-swatch" style={{ background: placeColor(i) }} aria-hidden="true" />
            <span className="tn-name">{r.name}</span>
            {r.missing ? <span className="dt-muted">No data here</span> : (
              <span className="tn-text">
                {format(r.then)} → {format(r.now)} {unit} · <b>{GLYPH[r.word] || '→'} {r.word}</b>{r.count && <> · {r.count}</>}
              </span>
            )}
          </li>
        ))}
      </ul>
    </figure>
  )
}
