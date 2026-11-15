'use client'
import { useId } from 'react'
import Icon from './Icon'

// A glossary term: the word stays readable in the sentence, and a small button next to it opens a plain definition
// (a toggletip: click, tap, Enter or Space; Escape or a click elsewhere closes it, via the native popover).
export default function Term({ children, definition, title }) {
  const raw = useId()
  const id = `term${raw.replace(/[^a-zA-Z0-9]/g, '')}`
  return (
    <span className="ui-term">
      {children}
      <button type="button" className="ui-term-btn" popoverTarget={id} aria-label={`What is ${title || children}?`} style={{ anchorName: `--${id}` }}>
        <Icon name="info" size={14} />
      </button>
      <span id={id} popover="auto" className="ui-pop ui-pop-term" style={{ positionAnchor: `--${id}` }}>
        <b>{title || children}</b> {definition}
      </span>
    </span>
  )
}
