'use client'
import { useEffect, useState } from 'react'

// "What is happening" in plain words, announced politely. The live region is always in the page; its text appears
// only after `delay` ms, so fast answers don't flash a message.
export default function StatusLine({ children, delay = 400, busy = true }) {
  const [shown, setShown] = useState(delay === 0)
  useEffect(() => {
    if (delay === 0) return undefined
    const t = setTimeout(() => setShown(true), delay)
    return () => clearTimeout(t)
  }, [delay])
  return (
    <p className="ui-status" role="status" aria-live="polite">
      {shown && children && <>{busy && <span className="ui-dot" aria-hidden="true" />}{children}</>}
    </p>
  )
}
