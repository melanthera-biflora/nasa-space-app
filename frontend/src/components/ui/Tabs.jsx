'use client'
import { MotionConfig, motion } from 'motion/react'
import { useId, useRef } from 'react'

// Sibling views of the same thing (Chart / Table). Arrow keys move and activate, Home and End jump, one tab stop.
export default function Tabs({ label, tabs, value, onChange }) {
  const base = useId()
  const refs = useRef([])
  const i = Math.max(0, tabs.findIndex((t) => t.id === value))
  function onKey(e) {
    const n = tabs.length
    const next = { ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 }[e.key]
    if (next === undefined) return
    e.preventDefault()
    onChange(tabs[next].id)
    refs.current[next]?.focus()
  }
  return (
    <MotionConfig reducedMotion="user">
    <div className="ui-tabs">
      <div role="tablist" aria-label={label} className="ui-tablist" onKeyDown={onKey}>
        {tabs.map((t, k) => (
          <button key={t.id} ref={(el) => { refs.current[k] = el }} role="tab" type="button" id={`${base}-${t.id}`}
            aria-selected={k === i} aria-controls={`${base}-${t.id}-panel`} tabIndex={k === i ? 0 : -1}
            className="ui-tab" onClick={() => onChange(t.id)}>
            {t.label}
            {k === i && <motion.span layoutId={`${base}-ink`} className="ui-tab-ink" transition={{ type: 'spring', stiffness: 520, damping: 40 }} />}
          </button>
        ))}
      </div>
      {tabs.map((t, k) => (
        <div key={t.id} role="tabpanel" id={`${base}-${t.id}-panel`} aria-labelledby={`${base}-${t.id}`} hidden={k !== i} className="ui-tabpanel">
          {k === i && t.content}
        </div>
      ))}
    </div>
    </MotionConfig>
  )
}
