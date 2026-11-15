'use client'
import { MotionConfig, motion } from 'motion/react'

// A small set of mutually exclusive choices (years analyzed, chart view): native radios styled as segments, so Tab
// enters the group once and the arrow keys move and select, with no script. The chosen segment's background slides
// to a new choice (Motion; instant with reduced motion).
export default function Segmented({ legend, name, options, value, onChange, hideLegend = false, size, tone }) {
  return (
    <MotionConfig reducedMotion="user">
    <fieldset className={`ui-seg${size === 'sm' ? ' is-sm' : ''}${tone === 'dark' ? ' is-dark' : ''}`}>
      <legend className={hideLegend ? 'sr-only' : 'ui-label'}>{legend}</legend>
      <div className="ui-seg-row">
        {options.map((o) => (
          <label key={o.value} className="ui-seg-opt">
            <input type="radio" name={name} value={o.value} checked={o.value === value} onChange={() => onChange(o.value)} disabled={o.disabled} />
            <span>{o.label}</span>
            {o.value === value && <motion.span layoutId={`seg-${name}`} className="ui-seg-thumb" transition={{ type: 'spring', stiffness: 520, damping: 40 }} />}
          </label>
        ))}
      </div>
    </fieldset>
    </MotionConfig>
  )
}
