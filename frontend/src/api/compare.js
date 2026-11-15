import { getJson } from './http'

/** The 51-city comparison table (static, cached by api/http.js). */
export const fetchCompareTable = (signal) => getJson('/places/compare', signal)
