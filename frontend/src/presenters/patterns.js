// Presenter for /patterns (SPEC A4): turns GET /api/v1/patterns into rows for the link web, the pair chart, the
// "more extremes" dumbbells, the signs-of-change sparklines and the compound-extreme bars. Every statistic comes from
// the API (data_pipeline/analysis/patterns.py), the pair chart's lines included; this file only picks, words and scales.
import { useEffect, useState } from 'react'
import { fetchPatternPair, fetchPatterns } from '../api/patterns'
import { format } from '../lib/format'

const SHORT = {
  t2m: 'Temperature', t2m_max: 'Daily high', precip: 'Rain and snow', gwetroot: 'Soil wetness', frost_days: 'Frost days',
  smoke_days: 'Smoke', aod: 'Haze', water_storage: 'Water storage', pm25: 'PM2.5', no2: 'NO₂', fires: 'Fires',
  hot_days: 'Very hot days', warm_nights: 'Warm nights', cold_days: 'Cold nights', heavy_rain_days: 'Heavy rain',
  wettest_day: 'Wettest day', dry_days: 'Dry days', muggy_days: 'Muggy days', humid_heat_days: 'Humid-heat days',
  heat_index_days: 'Heat-index days', frost_free_season: 'Frost-free season',
  rain_sat: 'Satellite rain', surface_heat_5km: 'Ground heat', surface_heat: 'Ground heat (1 km)',
}
export const shortLabel = (key, labels = {}) => SHORT[key] || labels[key] || key

const when = (lag) => (lag === 0 ? 'in the same month' : `${lag} month${lag > 1 ? 's' : ''} later`)
const tenths = (share) => (Math.round(share * 100) / 10).toFixed(1)

/** One row per pair (its strongest lag), in the API's order: clear cross-dataset links first. */
export function linkRows(data, { sameSource = false, unclear = false } = {}) {
  const labels = data?.labels || {}
  return (data?.relations || [])
    .filter((t) => (unclear || t.clear) && (sameSource || !t.same_source))
    .map((t) => {
      const h = t.lead_hits
      const tail = t.r > 0 ? 'highest' : 'lowest'
      return {
        id: `${t.a}|${t.b}`, a: t.a, b: t.b, lag: t.lag, r: t.r, q: t.q, clear: t.clear, sameSource: Boolean(t.same_source),
        nameA: shortLabel(t.a, labels), nameB: shortLabel(t.b, labels),
        strength: Math.min(1, Math.abs(t.r)), together: t.r > 0,
        when: t.lag === 0 ? 'same month' : `${t.lag} mo later`,
        sentence: t.sentence,
        hits: h && {
          ...h,
          text: `After the months when ${shortLabel(t.a, labels).toLowerCase()} ran highest for the time of year (its top 10%), ${shortLabel(t.b, labels).toLowerCase()} ` +
            `was in its ${tail} 10% ${when(t.lag)} ${h.hits} times out of ${h.cases}. Chance alone gives about ${Math.round(h.chance * h.cases)}.`,
        },
      }
    })
}

/** The lede: how many pairs were tested and how many links are clear across different datasets. */
export function headline(data) {
  const all = data?.relations || []
  const cross = all.filter((t) => t.clear && !t.same_source).length
  const vars = Object.keys(data?.labels || {}).length
  if (!vars) return 'There are too few records here to compare.'
  return `${vars} records compared month by month, ${data.relations_tested} pairs in all. ` +
    (cross ? `${cross} pair${cross > 1 ? 's' : ''} from different datasets move together clearly.` : 'None of the pairs from different datasets move together clearly.')
}

/** Nodes on a circle for the variables in the shown links, and one edge per link. */
export function web(rows, size = { w: 440, h: 360, r: 128 }) {
  const keys = [...new Set(rows.flatMap((t) => [t.a, t.b]))]
  const cx = size.w / 2, cy = size.h / 2
  const nodes = keys.map((k, i) => {
    const ang = -Math.PI / 2 + (2 * Math.PI * i) / keys.length
    return { key: k, x: cx + size.r * Math.cos(ang), y: cy + size.r * Math.sin(ang), cos: Math.cos(ang), sin: Math.sin(ang) }
  })
  const at = Object.fromEntries(nodes.map((n) => [n.key, n]))
  const edges = rows.map((t) => {
    const p = at[t.a], q = at[t.b]
    // bend each edge a little toward the centre so crossing lines stay apart
    const mx = (p.x + q.x) / 2 + (cx - (p.x + q.x) / 2) * 0.35, my = (p.y + q.y) / 2 + (cy - (p.y + q.y) / 2) * 0.35
    return { ...t, d: `M${p.x},${p.y} Q${mx},${my} ${q.x},${q.y}` }
  })
  return { nodes, edges, cx, cy }
}

/** "More extremes than before": months a year above the record's top-10% line, the first years against the last. */
export function exceedRows(data) {
  const labels = data?.labels || {}
  return (data?.warnings || []).filter((w) => w.exceedance).map((w) => {
    const e = w.exceedance
    return {
      key: w.key, name: shortLabel(w.key, labels), label: w.label, first: e.first * 10, last: e.last * 10, clear: e.clear, p: e.p,
      span: e.early_years && e.late_years ? `${e.early_years[0]}–${e.early_years[1]} vs ${e.late_years[0]}–${e.late_years[1]}` : '',
      years: Object.entries(e.years).map(([y, v]) => ({ year: Number(y), value: v * 10 })),
      text: `${tenths(e.first)} → ${tenths(e.last)} in 10`,
    }
  }).sort((x, y) => (y.last - y.first) - (x.last - x.first))
}

/** Signs that the ups and downs are changing: rising variance (bigger swings) or memory (spells last longer). */
export function signRows(data) {
  const labels = data?.labels || {}
  const rows = (data?.warnings || []).filter((w) => w.signs).map((w) => ({
    key: w.key, name: shortLabel(w.key, labels), ends: w.signs.ends, window: w.signs.window_years,
    variance: w.signs.variance, memory: w.signs.memory,
    rising: w.signs.variance.rising || w.signs.memory.rising,
  }))
  return { rising: rows.filter((r) => r.rising), steady: rows.filter((r) => !r.rising) }
}

/** Compound extremes: months a year where both were in their unusual 10%, with the trend in words. */
export function compoundRows(data) {
  return (data?.compound || []).map((c) => ({
    id: c.id, label: c.label, total: c.total, clear: c.clear, slope: c.slope_per_decade,
    years: Object.entries(c.counts).map(([y, v]) => ({ year: Number(y), value: v })),
    text: c.clear
      ? `${c.total} such months since ${Object.keys(c.counts)[0]}, ${c.slope_per_decade > 0 ? 'more' : 'fewer'} over time (${format(c.slope_per_decade)} a year per decade).`
      : `${c.total} such months since ${Object.keys(c.counts)[0]}; no clear change over time.`,
  }))
}

/** The pair chart's two lines from GET /patterns/pair: 'YYYY-MM' becomes a fractional year for the x axis; gaps
 *  (null) are left out. */
const PHASES = [['el_nino', 'El Niño'], ['neutral', 'Neither'], ['la_nina', 'La Niña']]

/** El Niño and La Niña winters (D42): one row per record, its winters in three lanes for the dot plot, and the API's
 *  sentences. Display scaling only: each record on a range symmetric around 0 (a usual winter, trend removed). */
export function winterRows(data) {
  const w = data?.winters
  if (!w?.records?.length) return null
  const count = (ph) => w.winters.filter((x) => x.phase === ph).length
  return {
    first: w.first, last: w.last, total: w.winters.length, elNino: count('el_nino'), laNina: count('la_nina'),
    rows: w.records.map((r) => {
      const max = Math.max(...r.values.map((v) => Math.abs(v.value))) || 1
      return {
        key: r.key, name: shortLabel(r.key, data.labels), unit: r.unit || '', max, clear: r.phases.some((p) => p.clear),
        lanes: PHASES.map(([phase, label]) => ({
          phase, label,
          dots: r.values.filter((v) => v.phase === phase).map((v) => ({ year: v.year, value: v.value, at: 50 + (v.value / max) * 46 })),
        })),
        sentences: r.phases.map((p) => ({ phase: p.phase, clear: p.clear, text: p.sentence })),
      }
    }),
  }
}

export function pairSeries(data) {
  const at = (ym) => Number(ym.slice(0, 4)) + (Number(ym.slice(5, 7)) - 1) / 12
  const line = (k) => (data?.months || []).filter((m) => m[k] != null).map((m) => ({ year: Math.round(at(m.month) * 1000) / 1000, value: m[k] }))
  return [line('a'), line('b')]
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const monthOf = (t) => `${MONTHS[Math.round((t % 1) * 12) % 12]} ${Math.floor(t + 1e-6)}`

const placeQuery = (place) => (place?.kind === 'state' ? { region: place.code } : place ? { lat: place.lat, lon: place.lon } : null)
const keyOf = (place) => (place ? (place.kind === 'state' ? place.code : `${place.lat},${place.lon}`) : '')

/** The patterns for the current place: { data, error, loading }. */
export function usePatterns(place) {
  const key = keyOf(place)
  const [state, setState] = useState({ key: '', data: null, error: '' })
  useEffect(() => {
    if (!key) return undefined
    const c = new AbortController()
    fetchPatterns(placeQuery(place), c.signal).then((data) => setState({ key, data, error: '' }))
      .catch((e) => { if (!c.signal.aborted) setState({ key, data: null, error: e.message }) })
    return () => c.abort()
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps -- key stands for place
  return state.key === key ? { ...state, loading: false } : { data: null, error: '', loading: Boolean(key) }
}

/** The two records of the chosen link, as the test saw them (cached by api/http): null while loading, [] on failure. */
export function usePair(place, a, b) {
  const key = a && b ? `${keyOf(place)}|${a}|${b}` : ''
  const [state, setState] = useState({ key: '', lines: null })
  useEffect(() => {
    if (!key) return undefined
    const c = new AbortController()
    fetchPatternPair(placeQuery(place), a, b, c.signal).then((d) => setState({ key, lines: pairSeries(d) }))
      .catch(() => { if (!c.signal.aborted) setState({ key, lines: [] }) })
    return () => c.abort()
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps -- key stands for place, a and b
  return state.key === key ? state.lines : null
}
