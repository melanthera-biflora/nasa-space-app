'use client'
import { useEffect, useState } from 'react'

// A chart draws at its measured width (capped at `max`, and scaled up past it), so 1 SVG unit is 1 CSS pixel on a
// phone and a 12 px label stays 12 px: a fixed 720-unit viewBox squeezed into a 340 px column drew it at about 6 px
// (rule 7). Returns a callback ref for the <svg> and the width to use in its viewBox and geometry.
export function useChartWidth(max) {
  const [el, ref] = useState(null)
  const [width, setWidth] = useState(max)
  useEffect(() => {
    if (!el) return undefined
    const observer = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width
      if (w > 0) setWidth(Math.min(max, w))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [el, max])
  return [ref, width]
}
