import { getJson } from './http'

// One precomputed trend field (pm25, no2 or fires): rate, p and then/now per NASA grid cell over the lower 48.
/** @returns {Promise<import('./types').TrendField>} */
export function fetchTrendField(factor, signal) {
  return getJson(`/maps/${encodeURIComponent(factor)}`, signal)
}

// Every grid cell's value per year on one colour scale (smoke_days, pm25, aod, no2, fires), for the animated map.
export function fetchMapFrames(factor, signal) {
  return getJson(`/maps/${encodeURIComponent(factor)}/frames`, signal)
}
