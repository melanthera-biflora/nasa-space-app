'use client'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

// After a page change, move focus to the new page's heading (each page's <h1> has tabIndex={-1}) so keyboard and
// screen-reader users start there. The new page can mount a moment after the path changes (it sits in Suspense),
// so look again a few times. Only a real path change counts (not the first load, not a dev-mode effect re-run).
export default function RouteFocus() {
  const path = usePathname()
  const prev = useRef(null)
  useEffect(() => {
    if (prev.current === null || prev.current === path) { prev.current = path; return undefined }
    prev.current = path
    const timers = [0, 120, 400, 900].map((ms) => setTimeout(() => {
      const h1 = document.querySelector('main h1') || document.querySelector('h1')
      const active = document.activeElement
      if (!h1 || active === h1) return
      if (active && active !== document.body && !active.closest('nav, .leaflet-container')) return   // the user moved on
      if (!h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1')   // the team's screens render in the browser only, so no hydration clash
      window.scrollTo(0, 0)                // land at the top, not under the sticky bar or halfway down (round 3)
      h1.focus({ preventScroll: true })
    }, ms))
    return () => timers.forEach(clearTimeout)
  }, [path])
  return null
}
