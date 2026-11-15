// JSDoc shapes of the /api/v1 responses, mirroring backend/schemas.py (the contract is backend/openapi.v1.json).
// Only what the frontend reads is listed; the API may send more.

/** @typedef {{ name: string, lat: number, lon: number }} Place */
/** @typedef {Place & { kind: string }} Suggestion */
/** @typedef {{ year: number, value: number | null }} YearValue */
/**
 * @typedef {object} Factor
 * @property {string} key
 * @property {string} label
 * @property {boolean} available
 * @property {string} [reason]
 * @property {number} [then]
 * @property {number} [now]
 * @property {number[]} [then_years]
 * @property {number[]} [now_years]
 * @property {number} [slope_per_decade]
 * @property {number} [mk_p]
 * @property {boolean} [significant]
 * @property {string} [significance_label]
 * @property {string} [p_label]
 * @property {'worsening' | 'improving' | 'no_clear_trend'} [trend_direction]
 * @property {string | null} [level]
 * @property {YearValue[]} [points]
 * @property {{ month: string, value: number | null, anomaly: number | null }[]} [monthly]
 * @property {{ value: number[], anomaly: number[] }} [monthly_classes]
 */
/**
 * @typedef {object} Report
 * @property {{ lat: number, lon: number, name?: string }} location
 * @property {object} user
 * @property {number[]} period
 * @property {string[]} card_order
 * @property {Object<string, Factor>} factors
 * @property {{ year: number, factors: string[], text: string }[]} notable_years
 * @property {{ factor: string, label: string, actions: string[], source?: { name: string, url: string } }[]} actions
 * @property {Object<string, string>} data_status
 */
/**
 * @typedef {object} TrendField
 * @property {'pm25' | 'no2' | 'fires'} factor
 * @property {string} label
 * @property {string} unit
 * @property {{ lats: number[], lons: number[], dlat: number, dlon: number }} grid
 * @property {Array<number | null>} slope
 * @property {Array<number | null>} p
 * @property {Array<number | null>} then
 * @property {Array<number | null>} now
 * @property {number[]} sig
 * @property {number[]} fdr
 * @property {number[]} breaks
 * @property {number[]} level_breaks
 * @property {object} summary
 */

export {}
