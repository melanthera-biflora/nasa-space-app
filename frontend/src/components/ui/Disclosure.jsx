'use client'
import { useState } from 'react'
import Icon from './Icon'

// Show and hide secondary detail (methods, caveats). Native <details>: Enter or Space toggles, no script.
// `lazy`: draw the body only once it is first opened (a folded list of 20 city cards costs nothing until then).
export default function Disclosure({ summary, children, open = false, lazy = false, className = '' }) {
  const [seen, setSeen] = useState(open || !lazy)
  return (
    <details className={`ui-disclosure ${className}`} open={open} onToggle={seen ? undefined : (e) => { if (e.currentTarget.open) setSeen(true) }}>
      <summary><Icon name="chevron-right" size={16} className="ui-disclosure-chev" />{summary}</summary>
      <div className="ui-disclosure-body">{seen && children}</div>
    </details>
  )
}
