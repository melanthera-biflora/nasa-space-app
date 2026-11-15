import { getJson } from './http'

/** States, the variables a state can be averaged for, and the periods (45 = 1981-2025, weather only). */
export const fetchRegions = (signal) => getJson('/regions', signal)

/** One variable averaged over a state: { region, variable, period_years, factor } (factor = a report card). */
export const fetchRegionSeries = (code, variable, period, signal, range = null) =>
  getJson(`/regions/${encodeURIComponent(code)}/series?${new URLSearchParams({ variable, period, ...(range ? { start: range.from, end: range.to } : {}) })}`, signal)
