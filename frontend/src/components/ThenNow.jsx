'use client'
import { useId } from 'react'
import { format } from '../lib/format'
import { niceTicks } from '../lib/ticks'

const GLYPH = { Rising: '↑', Falling: '↓' }

// Then → now for one topic, one row per place in the household's order (an arrow plot: Datawrapper's form for two
// dates). The dot is the 2001–2005 average and the arrow ends at the 2021–2025 one: solid when the trend is clear,
// dashed when it isn't yet, with the word beside it. The pale bar is the last five years' range, the dashed line the
// household's limit. The words carry everything, so the drawing is hidden from screen readers; positions are
// percentages and all text is HTML, so it fits a phone and no label shrinks under 12 px.
export default function ThenNow({ block }) {
  const id = useId()
  const { lo, hi, limit, unit, rows } = block
  const span = hi - lo || 1
  const at = (v) => ((v - lo) / span) * 100
  const pc = (v) => `${at(v)}%`
  return (
    <figure className="tn">
      <figcaption>
        <b>{block.label}</b> <span className="dt-muted">({unit}), 2001–2005 → 2021–2025 · your limit: {limit == null ? 'not clearly rising' : `fewer than ${format(limit)}`}</span>
      </figcaption>
      <ul className="tn-rows">
        {rows.map((r, i) => (
          <li key={r.name} className="tn-row">
            <span className="tn-name">{r.name}</span>
            {r.missing ? <span className="tn-text dt-muted">No data here</span> : (
              <>
                <span className="tn-track">
                  <svg aria-hidden="true" focusable="false">
                    <defs>
                      <marker id={`${id}-${i}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                        <path d="M0,0L10,5L0,10z" className="tn-head" />
                      </marker>
                    </defs>
                    {r.lo != null && <rect x={pc(r.lo)} width={`${Math.max(0.5, at(r.hi) - at(r.lo))}%`} y="7" height="14" rx="3" className="tn-range" />}
                    {limit != null && <line x1={pc(limit)} x2={pc(limit)} y1="1" y2="27" className="tn-limit" />}
                    <circle cx={pc(r.then)} cy="14" r="4" className="tn-then" />
                    {Math.abs(at(r.now) - at(r.then)) < 1.5
                      ? <circle cx={pc(r.now)} cy="14" r="4" className="tn-then" />
                      : <line x1={pc(r.then)} x2={pc(r.now)} y1="14" y2="14" className={`tn-arrow${r.clear ? '' : ' is-unclear'}`} markerEnd={`url(#${id}-${i})`} />}
                  </svg>
                </span>
                <span className="tn-text">
                  {format(r.then)} → {format(r.now)} {unit} · <b>{GLYPH[r.word] || '→'} {r.word}</b>{r.count && <> · {r.count}</>}
                </span>
              </>
            )}
          </li>
        ))}
        <li className="tn-row tn-axis-row" aria-hidden="true">
          <span />
          <span className="tn-axis"><span>{niceTicks(lo, hi, 4).map((t) => <span key={t} style={{ left: pc(t) }}>{format(t)}</span>)}</span></span>
        </li>
      </ul>
    </figure>
  )
}
