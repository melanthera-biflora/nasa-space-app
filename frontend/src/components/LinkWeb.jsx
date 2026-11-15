'use client'
import { useState } from 'react'
import { moveFocus } from '../lib/roving'
import { web } from '../presenters/patterns'

const W = 520, H = 360

// The links as a web: each record is a dot on a ring, each clear link a line between two. Thicker = stronger; solid =
// unusual together, dashed = one high while the other is low; an arrowhead marks the one that follows. Hovering a dot
// keeps only its lines; hovering a line lights it and its row in the list, and a click picks it. By keyboard the web is
// one tab stop: the arrow keys, Home and End move from line to line (lib/roving.js) and each line is picked as it takes focus.
export default function LinkWeb({ rows, selected, hovered, onSelect, onHover, nameOf }) {
  const [focus, setFocus] = useState(null)
  const { nodes, edges } = web(rows, { w: W, h: H, r: 128 })
  const touches = (e) => !focus || e.a === focus || e.b === focus
  const stop = edges.some((e) => e.id === selected) ? selected : edges[0]?.id
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="dt-svg pt-web" role="group" aria-label="Links as a web. Arrow keys move from link to link."
      onPointerLeave={() => setFocus(null)}>
      <defs>
        <marker id="pt-arrow" viewBox="0 0 10 10" refX="19" refY="5" markerWidth="10" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto">
          <path d="M0,1 L9,5 L0,9 z" className="pt-arrow" />
        </marker>
      </defs>
      {edges.map((e) => (
        <g key={e.id} className={`pt-edge${e.id === selected ? ' is-on' : ''}${e.id === hovered ? ' is-hot' : ''}${touches(e) ? '' : ' is-dim'}`}
          role="button" aria-pressed={e.id === selected} aria-label={`${nameOf(e.a)} and ${nameOf(e.b)}, ${e.when}, r ${e.r > 0 ? 'plus' : 'minus'} ${Math.abs(e.r).toFixed(2)}`}
          tabIndex={e.id === stop ? 0 : -1} data-roving data-id={e.id} onFocus={() => onSelect(e.id)}
          onKeyDown={(ev) => { if (moveFocus(ev)) onSelect(document.activeElement?.dataset.id) }}
          onPointerEnter={() => onHover(e.id)} onPointerLeave={() => onHover(null)} onClick={() => onSelect(e.id)}>
          <path d={e.d} className="pt-edge-hit" />
          <path d={e.d} className={`pt-edge-line${e.together ? '' : ' is-opposite'}`} style={{ strokeWidth: 1 + e.strength * 7 }}
            markerEnd={e.lag > 0 ? 'url(#pt-arrow)' : undefined} />
        </g>
      ))}
      {nodes.map((n) => {
        const right = n.cos > 0.2, left = n.cos < -0.2
        return (
          <g key={n.key} className={`pt-node${focus === n.key ? ' is-on' : ''}`} aria-hidden="true" onPointerEnter={() => setFocus(n.key)}>
            <circle cx={n.x} cy={n.y} r="7" />
            <text x={n.x + n.cos * 14} y={n.y + n.sin * 14 + 4} textAnchor={right ? 'start' : left ? 'end' : 'middle'}>{nameOf(n.key)}</text>
          </g>
        )
      })}
    </svg>
  )
}
