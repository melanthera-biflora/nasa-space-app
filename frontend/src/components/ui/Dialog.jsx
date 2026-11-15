'use client'
import { useEffect, useId, useRef } from 'react'
import Button from './Button'

// Modal dialog (or a bottom sheet on phones with sheet): native <dialog> gives focus containment, Escape and focus
// return. A click on the backdrop also closes it (Safari lacks closedby="any").
export default function Dialog({ open, onClose, title, children, sheet = false, footer }) {
  const ref = useRef(null)
  const titleId = useId()
  useEffect(() => {
    const d = ref.current
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog ref={ref} className={`ui-dialog${sheet ? ' is-sheet' : ''}`} aria-labelledby={titleId}
      onClose={() => onClose?.()} onClick={(e) => { if (e.target === ref.current) onClose?.() }}>
      <div className="ui-dialog-inner">
        <header className="ui-dialog-head">
          <h2 id={titleId}>{title}</h2>
          <Button variant="icon" icon="x" aria-label="Close" onClick={() => onClose?.()} />
        </header>
        <div className="ui-dialog-body">{children}</div>
        {footer && <footer className="ui-dialog-foot">{footer}</footer>}
      </div>
    </dialog>
  )
}
