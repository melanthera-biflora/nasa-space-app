'use client'
import { useEffect, useId, useRef, useState } from 'react'

// A short visual label for an icon-only control. Appears on hover (after 400 ms) and on keyboard focus (at once),
// Escape hides it without moving focus, and it stays while the pointer is over it (WCAG 1.4.13). Never essential:
// the control carries its own accessible name.
export default function Tooltip({ label, children, side = 'top' }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const timer = useRef(null)
  const show = (ms) => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(true), ms) }
  const hide = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(false), 100) }
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])
  useEffect(() => () => clearTimeout(timer.current), [])
  return (
    <span className="ui-tip-wrap" onPointerEnter={() => show(400)} onPointerLeave={hide} onFocus={() => show(0)} onBlur={hide}>
      {children}
      <span role="tooltip" id={id} className={`ui-tip is-${side}${open ? ' is-open' : ''}`} aria-hidden="true">{label}</span>
    </span>
  )
}
