'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useDetective } from '../../lib/query'
import { placeLabel, spanLabel, STEPS, useRegions, variableLabel } from '../../presenters/detective'
import Icon from '../ui/Icon'

const WIDE = '(min-width: 1024px)'

// Phones and tablets: one line that says what you're looking at and which step you're on, and opens the side menu
// as a drawer. From 1024 px the side menu is always shown and this strip is hidden (CSS).
export default function ContextStrip() {
  const { place, variable, years, range, name } = useDetective()
  const regions = useRegions()
  const path = usePathname()
  const step = STEPS.findIndex((s) => s.href === path)
  const where = place.kind === 'state' ? regions?.regions?.find((r) => r.code === place.code)?.name || place.code : placeLabel(place, name)
  const span = spanLabel(place, variable, years, range)

  useEffect(() => {          // a drawer left open when the window grows would float over the page
    const mq = window.matchMedia(WIDE)
    const shut = () => { const side = document.getElementById('dt-side'); if (mq.matches && side?.matches(':popover-open')) side.hidePopover() }
    mq.addEventListener('change', shut)
    return () => mq.removeEventListener('change', shut)
  }, [])

  return (
    <div className="dt-strip">
      <button type="button" className="dt-strip-btn" popoverTarget="dt-side" aria-controls="dt-side">
        <Icon name="menu" size={18} />
        <span className="dt-strip-text">
          <b>{where}: {variableLabel(place, variable, regions)}</b>
          <small>{span}{step >= 0 ? `, step ${step + 1} of ${STEPS.length} (${STEPS[step].label})` : ''}</small>
        </span>
        <span className="dt-strip-change">Change</span>
      </button>
      <span className="dt-progress" aria-hidden="true" />
    </div>
  )
}
