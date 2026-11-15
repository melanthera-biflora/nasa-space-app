'use client'
// The household (who lives there: ages and health conditions) stays in this browser tab only (SPEC A3, D25): never
// in a page URL, never stored by the backend. sessionStorage clears when the tab closes.
import { useSyncExternalStore } from 'react'

const KEY = 'climatch.household'
const EMPTY = []
const listeners = new Set()
let raw = null
let cached = EMPTY

function read() {
  try {
    const now = sessionStorage.getItem(KEY)
    if (now !== raw) { raw = now; cached = now ? JSON.parse(now) : EMPTY }
  } catch { cached = EMPTY }   // storage blocked or bad JSON: start empty
  return cached
}

export function saveHousehold(people) {
  try { sessionStorage.setItem(KEY, JSON.stringify(people || [])) } catch { /* storage blocked: keep going */ }
  listeners.forEach((l) => l())
}

const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l) }

/** The saved household ([] before anyone answers). */
export function useHousehold() {
  return useSyncExternalStore(subscribe, read, () => EMPTY)
}
