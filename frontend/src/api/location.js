import { getJson } from './http'

// Address search (GET /api/v1/places/search: OpenStreetMap Nominatim, US only).
/** @returns {Promise<import('./types').Place>} */
export async function searchLocation(address, signal) {
  const q = address.trim()
  if (!q) {
    throw new Error('Type an address, a city or a ZIP code.')
  }

  const results = await getJson(`/places/search?${new URLSearchParams({ q })}`, signal)
  if (!results.length) {
    throw new Error('No US place found. Try a city and state, for example "Phoenix, AZ".')
  }

  // shortcut: takes the first match; add a pick-list if users often get the wrong place
  const { name, lat, lon } = results[0]
  return { name: name.split(', ').slice(0, 3).join(', '), lat, lon }
}

// Suggestions while typing (GET /api/v1/places/suggest, Photon). Short input returns [] without a request.
/** @returns {Promise<import('./types').Suggestion[]>} */
export function suggestPlaces(q, signal) {
  return q.trim().length < 3 ? Promise.resolve([]) : getJson(`/places/suggest?${new URLSearchParams({ q: q.trim() })}`, signal)
}

/** The place at a spot picked on the map (GET /api/v1/places/reverse, Photon): a named place or "Picked spot". */
export function reversePlace(lat, lon, signal) {
  return getJson(`/places/reverse?${new URLSearchParams({ lat: lat.toFixed(4), lon: lon.toFixed(4) })}`, signal)
}

/** A state's outline for the map ({ code, name, bbox, rings: [[[lon, lat]]] }). */
export function fetchStateOutline(code, signal) {
  return getJson(`/regions/${encodeURIComponent(code)}/outline`, signal)
}
