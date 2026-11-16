// Presenter for the week-by-week view (SPEC A3 weekly-view): which daily variable fits the card, the 52 rows for the
// band chart, and a plain readout for the chosen week. Numbers come from /api/v1/weekly.
import { useEffect, useState } from 'react'
import { fetchWeekly } from '../api/weekly'
import { format } from '../lib/format'

const BY_CARD = {
  hot_days: 't2m_max', warm_nights: 't2m_min', cold_days: 't2m_min', heavy_rain_days: 'precip', wettest_day: 'precip',
  dry_days: 'precip', muggy_days: 'rh', humid_heat_days: 'wetbulb', heat_index_days: 't2m_max', frost_free_season: 't2m_min',
}
const MONTH_STARTS = { '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec' }
const DATE = (mmdd) => `${MONTH_STARTS[mmdd.slice(0, 2)]} ${Number(mmdd.slice(3))}`

/** The daily variable behind a card, or why there is no weekly view. */
export function weeklyFor(place, variable) {
  if (place?.kind !== 'point') return { variable: null, why: 'Week by week is for an address: state averages are monthly.' }
  const v = BY_CARD[variable]
  return v ? { variable: v, why: '' } : { variable: null, why: 'This one is measured by month, not by day, so there is no week-by-week view.' }
}

/** Rows for the band chart: a tick at the first week of each month. */
export function weekRows(data) {
  let last = ''
  return (data?.blocks || []).map((b) => {
    const m = b.start.slice(0, 2)
    const tick = m !== last ? MONTH_STARTS[m] : ''
    last = m
    return { ...b, label: `Week ${b.week}`, tick, z: b.unusual ? (b.unusual === 'high' ? 3 : -3) : 0 }
  })
}

/** One sentence about the chosen week, from the numbers. */
export function weekReadout(data, week) {
  const b = data?.blocks?.find((x) => x.week === week)
  if (!b) return ''
  if (b.value == null) return `${DATE(b.start)}–${DATE(b.end)}: no data.`
  const where = b.unusual === 'high' ? 'above its usual range' : b.unusual === 'low' ? 'below its usual range' : 'within its usual range'
  return `${DATE(b.start)}–${DATE(b.end)}, ${data.year}: ${format(b.value)} ${data.unit} (${data.about}), ${where} of ${format(b.p10)}–${format(b.p90)} ${data.unit}.`
}

/** The most unusual week of the year, to start on. */
export function startWeek(data) {
  const blocks = data?.blocks || []
  const odd = blocks.filter((b) => b.unusual && b.value != null)
    .sort((a, b) => Math.abs(b.value - b.p50) / (b.p90 - b.p10 || 1) - Math.abs(a.value - a.p50) / (a.p90 - a.p10 || 1))
  return odd[0]?.week || 26
}

export function useWeekly(query) {
  const key = query ? JSON.stringify(query) : ''
  const [state, setState] = useState({ key: '', data: null, error: '' })
  useEffect(() => {
    if (!key) return undefined
    const c = new AbortController()
    fetchWeekly(JSON.parse(key), c.signal).then((data) => setState({ key, data, error: '' }))
      .catch((err) => { if (!c.signal.aborted) setState({ key, data: null, error: err.message }) })
    return () => c.abort()
  }, [key])
  const fresh = state.key === key
  return { data: fresh ? state.data : null, error: fresh ? state.error : '', loading: Boolean(key) && !fresh }
}
