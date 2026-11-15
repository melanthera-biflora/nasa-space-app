import { getJson } from './http'

/** Curated, sourced US events for a state ({ region }) or the state of a point ({ lat, lon }). */
export function fetchEvents({ region, lat, lon } = {}, signal) {
  const q = region ? { region } : Number.isFinite(lat) ? { lat, lon } : {}
  return getJson(`/events?${new URLSearchParams(q)}`, signal)
}
