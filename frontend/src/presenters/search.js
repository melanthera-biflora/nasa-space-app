// Presenter for the address box: which suggestions to show, whether we're still looking, which one is highlighted,
// and which part of a name matched. useSuggestions() fetches as you type (debounced, cancelled when you keep typing).
import { useEffect, useState } from 'react'
import { suggestPlaces } from '../api/location'

export const MIN_CHARS = 3
export const DEBOUNCE_MS = 250
const ZIP_PARTIAL = /^\d{3,4}$/

// The icon for each kind of place the API names (components/ui/iconPaths.jsx).
const KIND_ICON = { State: 'map', County: 'map', City: 'building', Town: 'building', Village: 'building', 'ZIP code': 'hash',
  Address: 'home', Street: 'route', 'Picked spot': 'pointer' }
export const kindIcon = (kind) => KIND_ICON[kind] || 'map-pin'

// A row's two lines: the API's own when it sent them, else the name split at its first comma.
export const rowText = (s) => (s.main ? { main: s.main, rest: s.secondary || '' } : splitName(s.name))

// [before, match, after] of the first case-insensitive match, or null when the text doesn't contain the query.
export function splitMatch(text, query) {
  const q = query.trim()
  const at = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1
  return at < 0 ? null : [text.slice(0, at), text.slice(at, at + q.length), text.slice(at + q.length)]
}

// The highlighted row after an arrow key: wraps both ways; -1 (nothing) steps to the first or last row.
export function nextActive(index, step, count) {
  if (!count) return -1
  return index + step < 0 ? count - 1 : (index + step) % count
}

// "Spokane, Washington" → main "Spokane", rest "Washington".
export function splitName(name) {
  const [main, ...rest] = name.split(', ')
  return { main, rest: rest.join(', ') }
}

// What the list shows for the current text. An empty box offers the recent places; results for older text are never
// shown, and nothing is looked up for text a pick just wrote into the box. 3-4 digits get a nudge to finish the ZIP.
export function suggestionView({ query, picked, open, result, recent = [] }) {
  const q = query.trim()
  if (!q) return { items: recent, show: open && recent.length > 0, loading: false, error: '', hint: '', recent: true }
  const fresh = result.query === q && q.length >= MIN_CHARS
  const items = fresh ? result.items : []
  return {
    items,
    show: open && items.length > 0,
    loading: open && q.length >= MIN_CHARS && !fresh && q !== picked,
    error: fresh ? result.error : '',
    hint: ZIP_PARTIAL.test(q) ? 'Keep typing: a ZIP code has 5 digits.' : '',
    recent: false,
  }
}

export function useSuggestions(query, picked) {
  const [result, setResult] = useState({ query: '', items: [], error: '' })
  const q = query.trim()
  useEffect(() => {
    if (q.length < MIN_CHARS || q === picked) return undefined
    const controller = new AbortController()
    const timer = setTimeout(() => {
      suggestPlaces(q, controller.signal)
        .then((items) => setResult({ query: q, items, error: '' }))
        .catch((err) => { if (!controller.signal.aborted) setResult({ query: q, items: [], error: err.message }) })
    }, DEBOUNCE_MS)
    return () => { clearTimeout(timer); controller.abort() }
  }, [q, picked])
  return result
}

/** A spot picked on the map, named by its town ("Seattle, WA") rather than its street: a ~50 km square is not one street,
 *  and the report's heading used to read "Southwest Daisy Street". Without a town, the place is kept as it came. */
export function townOf(place) {
  const parts = (place.secondary || '').split(',').map((s) => s.trim())
  if (parts.length < 2) return place
  return { ...place, name: place.secondary, main: parts[0], secondary: parts.slice(1).join(', ') }
}
