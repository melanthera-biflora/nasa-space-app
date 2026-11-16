'use client'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { format, sign } from '../lib/format'
import { useChartWidth } from '../lib/chartWidth'
import { niceTicks } from '../lib/ticks'
import { offNote, pan, scatterFrame, zoom } from '../presenters/cityScatter'
import Button from './ui/Button'
import Segmented from './ui/Segmented'

const MAX_W = 720, H = 380, L = 56, R = 16, T = 20, B = 44
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

// All 51 cities at once for one record: across is today's level (2021–2025), up is the change per decade. The dashed
// line is the household's limit; the shaded side is under it. Dots by group in one neutral hue (filled = under all
// limits, ring = misses one, small = misses more; faded = no clear trend yet). Hover lights the city in the list and on
// the map (and back); a click adds it to the comparison.
//
// The view (round 4): it opens fitted to most cities, so one far-out value no longer squashes the rest; cities off the
// scale sit at the edge as named markers, and "Show all" fits everyone. Drag to pan, Ctrl/⌘ + wheel or the buttons to
// zoom (a plain wheel scrolls the page, as on the maps); by keyboard: + and − zoom, the arrows pan, 0 resets.
export default function CityScatter({ points, limit, unit, xLabel, hovered, selected, onHover, onToggle, resetKey = '', note: lead = '' }) {
  const still = useReducedMotion()
  const clipId = useId()
  const [ref, W] = useChartWidth(MAX_W)
  const [node, setNode] = useState(null)
  const svgRef = useCallback((el) => { ref(el); setNode(el) }, [ref])   // stable: a new ref callback each render would loop
  const [mode, setMode] = useState('most')
  const frame = scatterFrame(points, limit, mode)
  const key = `${resetKey}|${mode}`
  const [custom, setCustom] = useState({ for: '', x: null, y: null })      // a zoom or pan, until the record or fit changes
  const view = custom.for === key ? custom : frame.view
  const setView = (x, y) => setCustom({ for: key, x, y })
  const drag = useRef(null)
  const moved = useRef(false)
  const plotW = W - L - R, plotH = H - T - B
  const X = (v) => L + ((v - view.x[0]) / (view.x[1] - view.x[0])) * plotW
  const Y = (v) => T + (1 - (v - view.y[0]) / (view.y[1] - view.y[0])) * plotH
  const inView = (p) => p.x >= view.x[0] && p.x <= view.x[1] && p.y >= view.y[0] && p.y <= view.y[1]
  const off = points.filter((p) => !inView(p))
  const note = offNote(mode === 'most' && custom.for !== key ? frame.off : off, unit)
  const hot = points.find((p) => p.name === hovered && inView(p))
  const spring = still ? { duration: 0 } : { type: 'spring', stiffness: 170, damping: 24 }
  const xTicks = niceTicks(view.x[0], view.x[1], 5)
  const yTicks = niceTicks(view.y[0], view.y[1], 5)
  const side = off.some((p) => X(p.x) < L) ? { x: W - R - 6, a: 'end' } : { x: L + 6, a: 'start' }   // clear of a left-edge marker
  const zoomBy = (f, at) => setView(zoom(view.x, f, at?.x), zoom(view.y, f, at?.y))

  // Ctrl/⌘ + wheel zooms at the pointer (a native listener, so it can stop the page from zooming); a plain wheel scrolls
  useEffect(() => {
    if (!node) return undefined
    const onWheel = (e) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const box = node.getBoundingClientRect(), sx = W / box.width
      const at = { x: view.x[0] + (((e.clientX - box.left) * sx - L) / plotW) * (view.x[1] - view.x[0]),
        y: view.y[1] - (((e.clientY - box.top) * sx - T) / plotH) * (view.y[1] - view.y[0]) }
      zoomBy(e.deltaY < 0 ? 0.8 : 1.25, at)
    }
    node.addEventListener('wheel', onWheel, { passive: false })
    return () => node.removeEventListener('wheel', onWheel)
  })

  function onPointerDown(e) {
    drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y }
    moved.current = false
  }
  function onPointerMove(e) {
    const d = drag.current
    if (!d || !e.buttons) { drag.current = null; return }
    const dx = e.clientX - d.x, dy = e.clientY - d.y
    if (!moved.current && Math.hypot(dx, dy) < 4) return        // a click, not a drag
    moved.current = true
    const box = node.getBoundingClientRect(), sx = W / box.width
    setView(pan(d.vx, (-dx * sx) / plotW), pan(d.vy, (dy * sx) / plotH))
  }
  function onKeyDown(e) {
    const step = { ArrowLeft: [-0.1, 0], ArrowRight: [0.1, 0], ArrowUp: [0, 0.1], ArrowDown: [0, -0.1] }[e.key]
    if (step) { e.preventDefault(); setView(pan(view.x, step[0]), pan(view.y, step[1])); return }
    if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomBy(0.8) }
    else if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomBy(1.25) }
    else if (e.key === '0' || e.key === 'Home') { e.preventDefault(); setCustom({ for: '', x: null, y: null }) }
  }

  return (
    <div className="cs-wrap">
      <div className="cs-tools">
        {(frame.off.length > 0 || mode === 'all') ? (
          <Segmented legend="Fit" hideLegend name={`cs-fit-${clipId}`} size="sm" value={mode} onChange={setMode}
            options={[{ value: 'most', label: 'Fit most cities' }, { value: 'all', label: 'Show all' }]} />
        ) : <span />}
        <span className="cs-zoom" role="group" aria-label="Zoom">
          <Button size="sm" variant="icon" icon="plus" onClick={() => zoomBy(0.8)} aria-label="Zoom in" />
          <Button size="sm" variant="icon" icon="minus" onClick={() => zoomBy(1.25)} aria-label="Zoom out" />
          <Button size="sm" variant="icon" icon="replay" onClick={() => setCustom({ for: '', x: null, y: null })} aria-label="Reset the view"
            disabled={custom.for !== key} />
        </span>
      </div>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="dt-svg cs-svg dt-interactive" tabIndex={0} role="group"
        onPointerLeave={() => { onHover(null); drag.current = null }} onPointerDown={onPointerDown} onPointerMove={onPointerMove}
        onPointerUp={() => { drag.current = null }} onKeyDown={onKeyDown}
        aria-label={`${points.length} cities: ${xLabel} (${unit}) across, change per decade up. Plus and minus zoom, the arrows move the view, 0 resets. The list has every city, by keyboard too.`}>
        <defs><clipPath id={clipId}><rect x={L} y={T} width={plotW} height={plotH} /></clipPath></defs>
        {limit != null && <rect x={L} y={T} width={clamp(X(limit) - L, 0, plotW)} height={plotH} className="cs-under" />}
        {view.y[0] < 0 && view.y[1] > 0 && <line x1={L} x2={W - R} y1={Y(0)} y2={Y(0)} className="cs-zero" />}
        {limit != null && X(limit) >= L && X(limit) <= W - R && (
          <g>
            <line x1={X(limit)} x2={X(limit)} y1={T} y2={H - B} className="cs-limit" />
            <text x={X(limit) + 6} y={T + 12} className="cs-note">your limit: {format(limit)}</text>
          </g>
        )}
        {view.y[1] > 0 && <text x={side.x} y={T + 12} textAnchor={side.a} className="cs-note">rising</text>}
        {view.y[0] < 0 && <text x={side.x} y={H - B - 6} textAnchor={side.a} className="cs-note">falling</text>}
        {xTicks.map((v) => <text key={v} x={X(v)} y={H - B + 18} textAnchor="middle" className="dt-tick">{format(v)}</text>)}
        {yTicks.map((v) => <text key={v} x={L - 6} y={Y(v) + 4} textAnchor="end" className="dt-tick">{sign(v)}</text>)}
        <text x={(L + W - R) / 2} y={H - 6} textAnchor="middle" className="cs-axis">{xLabel} ({unit}) →</text>
        <text x={14} y={(T + H - B) / 2} textAnchor="middle" className="cs-axis" transform={`rotate(-90 14 ${(T + H - B) / 2})`}>change per decade →</text>
        {limit != null && X(limit) > L + 170 && X(limit) <= W - R && <text x={X(limit) - 6} y={T + 12} textAnchor="end" className="cs-note cs-under-label">← under your limit</text>}
        <g clipPath={`url(#${clipId})`}>
          {points.filter(inView).map((p) => {
            const on = selected.includes(p.name), isHot = hovered === p.name
            const r = p.misses === 0 ? 7 : p.misses === 1 ? 6 : 4
            return (
              <motion.circle key={p.name} className={`cs-dot is-m${Math.min(p.misses, 2)}${p.clear ? '' : ' is-unclear'}${on ? ' is-on' : ''}${isHot ? ' is-hot' : ''}`}
                initial={false} animate={{ cx: X(p.x), cy: Y(p.y), r: isHot ? r + 3 : r }} transition={spring}
                onPointerEnter={() => onHover(p.name)} onClick={() => { if (!moved.current) onToggle(p.name) }} />
            )
          })}
        </g>
        {/* cities off the scale: a marker at the edge, pointing out, named when there are few; a click shows everyone */}
        {off.map((p) => {
          const cx = clamp(X(p.x), L + 6, W - R - 6), cy = clamp(Y(p.y), T + 6, H - B - 6)
          const dx = X(p.x) < L ? -1 : X(p.x) > W - R ? 1 : 0, dy = Y(p.y) < T ? -1 : Y(p.y) > H - B ? 1 : 0
          const angle = (Math.atan2(dy, dx || (dy ? 0 : 1)) * 180) / Math.PI
          return (
            <g key={p.name} className="cs-offmark" transform={`translate(${cx} ${cy})`} onClick={() => setMode('all')} onPointerEnter={() => onHover(p.name)}>
              <path d="M6,0 L-4,-5 L-4,5 Z" transform={`rotate(${angle})`} />
              {off.length <= 3 && <text x={dx > 0 ? -10 : 10} y={dy > 0 ? -10 : 16} textAnchor={dx > 0 ? 'end' : 'start'} className="cs-note">{p.name} ({format(p.x)} {unit})</text>}
            </g>
          )
        })}
        <AnimatePresence>
          {hot && (
            <motion.g key={hot.name} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: still ? 0 : 0.12 }} pointerEvents="none"
              transform={`translate(${Math.min(W - R - 236, Math.max(L, X(hot.x) - 118))}, ${Math.max(T, Y(hot.y) - 72)})`}>
              <rect width="236" height="56" rx="6" className="cs-tip" />
              <text x="10" y="18" className="cs-tip-title">{hot.name}</text>
              <text x="10" y="34" className="cs-tip-text">{format(hot.x)} {unit} now, {sign(hot.y)} per decade, {hot.clear ? 'clear' : 'not clear yet'}</text>
              <text x="10" y="48" className="cs-tip-text">{selected.includes(hot.name) ? 'In your comparison (click to remove)' : 'Click to compare'}</text>
            </motion.g>
          )}
        </AnimatePresence>
      </svg>
      {(lead || note) && <p className="cs-notes" role="status">{[lead, note].filter(Boolean).join(' ')}</p>}
      <p className="cs-hint">Drag to move · Ctrl + scroll or the buttons to zoom · by keyboard: arrows move, + and − zoom, 0 resets</p>
    </div>
  )
}
