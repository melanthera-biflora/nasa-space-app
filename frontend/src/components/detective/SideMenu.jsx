'use client'
import { MotionConfig } from 'motion/react'
import { useSyncExternalStore } from 'react'
import Icon from '../ui/Icon'

// The side menu: the steps (with the open page's sections), then the settings panel. From 1024 px it is a full-height
// column that can fold to a narrow rail of step numbers, giving charts more room; the choice is a convenience kept in
// this browser only (localStorage; the household itself lives in sessionStorage, lib/household.js). Below 1024 px it is
// the drawer.
const KEY = 'climatch.side'
const listeners = new Set()
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l) }
let folded = null          // this page view's choice, which also works when storage is blocked
const read = () => {
  if (folded !== null) return folded
  try { return localStorage.getItem(KEY) === 'rail' } catch { return false }
}

export default function SideMenu({ children }) {
  const rail = useSyncExternalStore(subscribe, read, () => false)
  const toggle = () => {
    folded = !rail
    try { localStorage.setItem(KEY, folded ? 'rail' : 'open') } catch { /* storage blocked: kept in memory only */ }
    listeners.forEach((l) => l())
  }
  return (
    <aside id="dt-side" className={`dt-side${rail ? ' is-rail' : ''}`} popover="auto" aria-label="Steps and settings">
      <button type="button" className="dt-side-fold" onClick={toggle} aria-pressed={rail} aria-label="Fold the side menu"
        title={rail ? 'Show the side menu' : 'Fold the side menu'}>
        <Icon name={rail ? 'panel-open' : 'panel-close'} size={18} />
      </button>
      <div id="dt-side-body" className="dt-side-body"><MotionConfig reducedMotion="user">{children}</MotionConfig></div>
    </aside>
  )
}
