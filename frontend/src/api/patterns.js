import { getJson } from './http'

/** What moves together at a place, signs of change, more extremes than before and compound extremes (SPEC A4).
 *  A state ({ region }) or an address ({ lat, lon }); always the full 25 years, which the indicators need. */
export function fetchPatterns({ region, lat, lon } = {}, signal) {
  const q = region ? { region } : { lat, lon }
  return getJson(`/patterns?${new URLSearchParams(q)}`, signal)
}

/** The two records of one link as the test saw them ({ a, b, months: [{ month, a, b }] }), for the pair chart. */
export function fetchPatternPair({ region, lat, lon } = {}, a, b, signal) {
  return getJson(`/patterns/pair?${new URLSearchParams({ ...(region ? { region } : { lat, lon }), a, b })}`, signal)
}
