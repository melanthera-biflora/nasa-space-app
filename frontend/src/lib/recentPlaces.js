'use client'
// Places picked in the address box, newest first, so the box can offer them again when it is empty (a convenience,
// like a real app's recent searches). Kept in this tab only (sessionStorage), like the household (lib/household.js).
import { useSyncExternalStore } from 'react'

const KEY = 'climatch.recent'
const MAX = 5
const EMPTY = []
const listeners = new Set()
let raw = null
let cached = EMPTY

function read() {
  try {
    const now = sessionStorage.getItem(KEY)
    if (now !== raw) { raw = now; cached = now ? JSON.parse(now) : EMPTY }
  } catch { cached = EMPTY }   // storage blocked or bad JSON: no recent places
  return cached
}

export function rememberPlace(place) {
  const keep = (({ name, main, secondary, kind, lat, lon, extent, region }) => ({ name, main, secondary, kind, lat, lon, extent, region }))(place)
  const list = [keep, ...read().filter((p) => p.name !== place.name)].slice(0, MAX)
  try { sessionStorage.setItem(KEY, JSON.stringify(list)) } catch { /* storage blocked: nothing to remember */ }
  listeners.forEach((l) => l())
}

const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l) }

/** Recently picked places in this tab, newest first ([] at first). */
export function useRecentPlaces() {
  return useSyncExternalStore(subscribe, read, () => EMPTY)
}
