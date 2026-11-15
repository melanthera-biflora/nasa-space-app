// Presenter for /compare (SPEC A3, place-compare; owner: a comparison, never a best-place score). Pure functions over
// the 51-city table from the API and the household's own limits. Nothing is weighted or added up: cities are grouped
// by how many of the household's limits they meet, then listed by distance or A to Z. Every sentence is built from the
// numbers; no rank, percentage, star or "best" anywhere.
import { format } from '../lib/format'
import { fitRange } from './cityScatter'

// Each topic counts once (heat is three cards in the report; counting cards would weigh heat three times).
export const TOPICS = [
  { id: 'heat_day', factor: 'hot_days', label: 'Heat by day', icon: 'sun', noun: 'very hot days a year' },
  { id: 'heat_night', factor: 'warm_nights', label: 'Heat at night', icon: 'moon', noun: 'warm nights a year' },
  { id: 'humid', factor: 'muggy_days', label: 'Muggy days', icon: 'droplets', noun: 'muggy days a year' },
  { id: 'cold', factor: 'cold_days', label: 'Cold nights', icon: 'snowflake', noun: 'very cold nights a year' },
  // Model PM2.5 levels read high on coasts (sea salt) and low where nitrate matters, so smoke is a trend limit only.
  { id: 'smoke', factor: 'pm25', label: 'Smoke and fine particles', icon: 'cloud-fog', noun: 'µg/m³ of PM2.5', trendOnly: true },
]
export const CONTEXT = ['heavy_rain_days', 'dry_days', 'no2', 'fires']
export const MAX_TOPICS = 5

// Who in the household cares about what, as in data_pipeline/config/conditions.json priorities (no medical advice:
// it only chooses which topics start selected).
const BY_CONDITION = { asthma: ['smoke'], heart: ['heat_day', 'heat_night'], allergy: ['smoke'], diabetes: ['heat_day'], kidney: ['heat_day'] }
const BY_AGE = (age) => (age.startsWith('65') ? ['heat_night', 'heat_day'] : age.startsWith('Children') ? ['smoke', 'heat_day'] : [])

/** The topics that start selected for this household (up to 4), in a stable order. */
export function topicsFor(household = []) {
  const picked = new Set()
  for (const person of household) {
    BY_AGE(person.age || '').forEach((t) => picked.add(t))
    ;(person.conditions || []).forEach((c) => (BY_CONDITION[c] || []).forEach((t) => picked.add(t)))
  }
  const list = TOPICS.map((t) => t.id).filter((id) => picked.has(id))
  return (list.length ? list : ['heat_day', 'heat_night', 'smoke']).slice(0, 4)
}

/** The 2–3 limit choices for a topic, from the cutoffs the report already uses (no sliders). */
export function limitOptions(topic, meta) {
  if (topic.trendOnly) return [{ value: 'not_rising', label: 'not clearly rising' }]
  const m = meta?.[topic.factor] || {}
  return [m.caution_from, m.high_from].filter((v) => v != null).map((v) => ({ value: v, label: `fewer than ${format(v)}` }))
}

export const defaultLimit = (topic, meta) => limitOptions(topic, meta)[0]?.value

function meets(cell, topic, limit) {
  if (!cell) return null
  if (topic.trendOnly) return !(cell.clear && cell.slope_per_decade > 0)
  return cell.now < limit
}

const yearsUnder = (cell, limit) => (cell?.last5 || []).filter((p) => p.value < limit).length

const km = (a, b) => {
  const r = Math.PI / 180
  const h = Math.sin((b.lat - a.lat) * r / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin((b.lon - a.lon) * r / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}

const topicById = (id) => TOPICS.find((t) => t.id === id)

/** One city against the chosen limits: met and missed, counted, with a line per topic. */
export function judge(city, chosen, meta) {
  const lines = chosen.map(({ topic: id, limit }) => {
    const topic = topicById(id)
    const cell = city.factors[topic.factor]
    const ok = meets(cell, topic, limit)
    const unit = meta?.[topic.factor]?.unit_short || ''
    if (!cell) return { topic, ok: null, text: `${topic.label}: no data here.` }
    const bar = { then: cell.then, unit, clear: Boolean(cell.clear), word: trendWord(cell), limit: topic.trendOnly ? null : limit }
    if (topic.trendOnly) {
      const dir = cell.clear ? (cell.slope_per_decade > 0 ? 'rising' : 'falling') : 'no clear trend yet'
      return { topic, ok, value: cell.now, ...bar, text: `${topic.label}: ${dir} (${format(cell.then)} → ${format(cell.now)} ${unit}, 2001–2005 vs 2021–2025).` }
    }
    const under = yearsUnder(cell, limit)
    return {
      topic, ok, value: cell.now, ...bar,
      text: ok
        ? `${topic.label}: ${format(cell.now)} ${topic.noun} (your limit: fewer than ${format(limit)}).`
        : `${topic.label}: ${format(cell.now)} ${topic.noun}, over your limit of ${format(limit)}. ${under} of the last 5 years ${under === 1 ? 'was' : 'were'} under it.`,
    }
  })
  const met = lines.filter((l) => l.ok === true).length
  return { met, total: chosen.length, lines }
}

/** One scale per chosen topic, shared by all 51 city cards so their bars read alike (display scaling only). Counts
 *  start at zero and keep the limit in view; a rare far-out city sits at the edge (`barAt` says which). */
export function cardScales(table, chosen) {
  return Object.fromEntries(chosen.map(({ topic: id, limit }) => {
    const topic = topicById(id)
    const vals = (table?.cities || []).flatMap((c) => { const f = c.factors[topic.factor]; return f ? [f.then, f.now] : [] })
    let [lo, hi] = fitRange(vals, 'most', 0.04)
    if (!topic.trendOnly) { lo = 0; if (Number.isFinite(limit)) hi = Math.max(hi, limit * 1.05) }
    return [id, { lo, hi }]
  }))
}

/** Where a value sits on its card bar (0–100) and whether it is past an edge (-1 or 1). */
export function barAt({ lo, hi }, v) {
  const p = ((v - lo) / (hi - lo || 1)) * 100
  return { pos: Math.min(100, Math.max(0, p)), off: p < 0 ? -1 : p > 100 ? 1 : 0 }
}

/** Cities grouped by how many limits they meet (most first); inside a group by distance from `start`, or A to Z. */
export function groupCities(table, chosen, meta, start = null) {
  const judged = (table?.cities || []).map((c) => ({ city: c, ...judge(c, chosen, meta), km: start ? km(start, c) : null }))
  const groups = new Map()
  for (const j of judged) {
    if (!groups.has(j.met)) groups.set(j.met, [])
    groups.get(j.met).push(j)
  }
  return [...groups.entries()].sort((a, b) => b[0] - a[0]).map(([met, list]) => ({
    met, total: chosen.length,
    title: groupTitle(met, chosen.length),
    cities: list.sort((a, b) => (start ? a.km - b.km : a.city.name.localeCompare(b.city.name))),
  }))
}

const groupTitle = (met, n) => (n === 1 ? (met ? 'Under your limit' : 'Over your limit')
  : met === n ? `Under all ${n} of your limits` : met === 0 ? `Under none of your ${n} limits` : `Under ${met} of your ${n} limits`)

export const RULE = 'Cities are grouped by how many of your limits they meet. Inside each group they are listed by distance from your starting place, or A to Z. Nothing is weighted or added up.'

/** What changed 2001–2025 for the chosen topics, in the report's words. */
export function changes(city, chosen, meta) {
  return chosen.map(({ topic: id }) => {
    const topic = topicById(id)
    const cell = city.factors[topic.factor]
    if (!cell) return null
    const word = cell.clear ? (cell.slope_per_decade > 0 ? 'Rising' : 'Falling') : 'No clear trend yet'
    return `${topic.label}: ${word}, ${format(cell.then)} → ${format(cell.now)} ${meta?.[topic.factor]?.unit_short || ''}`.trim()
  }).filter(Boolean)
}

/** The lines above a side-by-side comparison: every other place against the anchor (the starting place when it is in the
 *  comparison, else the first), in "less" and "more" words. Never "better", "winner" or a rank (rule 13, D25). */
export function verdict(places, chosen, meta, anchorName = null) {
  if (places.length < 2) return []
  const js = places.map((p) => ({ name: p.name, ...judge(p, chosen, meta) }))
  const anchor = js.find((p) => p.name === anchorName) || js[0]
  // +1: the place has more than the anchor (fewer is better for every topic here; trend-only topics compare "ok")
  const more = (b, line) => {
    const t = anchor.lines[line].topic
    const va = anchor.lines[line].value, vb = b.lines[line].value
    if (t.trendOnly) return (anchor.lines[line].ok ? 1 : 0) - (b.lines[line].ok ? 1 : 0)
    if (va == null || vb == null) return 0
    return Math.sign(vb - va)
  }
  const label = (i) => topicById(chosen[i].topic).label.toLowerCase()
  const list = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`)
  const all = chosen.length === 1 ? label(0) : chosen.length === 2 ? 'both things you chose' : `all ${chosen.length} things you chose`
  return js.filter((b) => b !== anchor).map((b) => {
    const d = chosen.map((_, i) => more(b, i))
    const less = d.flatMap((x, i) => (x < 0 ? [label(i)] : [])), most = d.flatMap((x, i) => (x > 0 ? [label(i)] : []))
    if (!less.length && !most.length) return `${b.name} is about the same as ${anchor.name} on ${all}.`
    const word = (xs, w) => (xs.length === chosen.length && chosen.length > 1 ? `${w} of ${all}` : `${w} ${list(xs)}`)
    return `Compared with ${anchor.name}, ${b.name} has ${[less.length && word(less, 'less'), most.length && word(most, 'more')].filter(Boolean).join(' but ')}.`
  })
}

/** The scatter's dots for one record: today's level across, change per decade up, and whether that change is clear
 *  (unclear ones are drawn faded). A city with no slope has no dot (it used to be drawn at 0). */
export function scatterPoints(table, key, missesOf = {}) {
  return (table?.cities || []).filter((c) => c.factors[key]?.now != null && Number.isFinite(c.factors[key]?.slope_per_decade))
    .map((c) => ({ name: c.name, x: c.factors[key].now, y: c.factors[key].slope_per_decade, clear: Boolean(c.factors[key].clear), misses: missesOf[c.name] ?? 0 }))
}

/** One line over the scatter when no city has a clear trend, so the dots' heights aren't read as change. */
export const scatterNote = (points, label) => (points.length && !points.some((p) => p.clear)
  ? `No city has a clear trend in ${label} yet: how high a dot sits is year-to-year ups and downs, not a change.` : '')

const trendWord = (c) => (c.clear ? (c.slope_per_decade > 0 ? 'Rising' : 'Falling') : 'No clear trend yet')

/** The arrow plot that opens "Side by side": per topic, one row per place in the order given (never sorted by value),
 *  from the 2001–2005 average to the 2021–2025 one, the last five years' range, the trend word and how many of those
 *  years stayed under the limit. The axis holds zero, every value and the limit. Counts and min/max only, no statistic. */
export function thenNow(places, chosen, meta) {
  return chosen.map(({ topic: id, limit }) => {
    const topic = topicById(id)
    const m = meta?.[topic.factor] || {}
    const lim = topic.trendOnly ? null : limit ?? null
    const rows = places.map((p) => {
      const c = p.factors[topic.factor]
      if (!c || !Number.isFinite(c.then) || !Number.isFinite(c.now)) return { name: p.name, missing: true }
      const recent = (c.last5 || []).map((q) => q.value).filter(Number.isFinite)
      return {
        name: p.name, then: c.then, now: c.now, clear: Boolean(c.clear), word: trendWord(c),
        lo: recent.length ? Math.min(...recent) : null, hi: recent.length ? Math.max(...recent) : null,
        count: lim == null || !recent.length ? '' : `${yearsUnder(c, lim)} of the last ${recent.length} years under your limit`,
      }
    })
    const vals = rows.flatMap((r) => (r.missing ? [] : [r.then, r.now, r.lo, r.hi])).filter(Number.isFinite)
    return { key: topic.factor, label: m.label || topic.label, unit: m.unit_short || '', limit: lim, lo: Math.min(0, ...vals), hi: Math.max(...vals, lim ?? 0), rows }
  })
}

/** Rows for the side-by-side table: chosen topics first, then context factors; `differs` for "only rows that differ". */
export function compareRows(places, chosen, meta) {
  const keys = [...chosen.map((c) => topicById(c.topic).factor), ...CONTEXT.filter((k) => !chosen.some((c) => topicById(c.topic).factor === k))]
  return keys.map((k) => {
    const m = meta?.[k] || {}
    const cells = places.map((p) => {
      const c = p.factors[k]
      if (!c) return { text: 'no data', word: '' }
      const word = c.clear ? (c.slope_per_decade > 0 ? 'Rising' : 'Falling') : 'No clear trend yet'
      return { text: `${format(c.now)} ${m.unit_short || ''}`.trim(), word, then: c.then, now: c.now }
    })
    // differs: the trend words differ (rounded numbers nearly always differ, so the filter used to hide nothing)
    return { key: k, label: m.label || k, chosen: chosen.some((c) => topicById(c.topic).factor === k), cells, differs: new Set(cells.map((c) => c.word)).size > 1 }
  })
}

/** Facts that are true almost everywhere, so they don't help choose (e.g. NO₂ fell in most cities). */
export function everywhere(table, meta) {
  const out = []
  for (const k of CONTEXT) {
    const cells = (table?.cities || []).map((c) => c.factors[k]).filter(Boolean)
    if (!cells.length) continue
    const falling = cells.filter((c) => c.clear && c.slope_per_decade < 0).length
    const rising = cells.filter((c) => c.clear && c.slope_per_decade > 0).length
    const label = meta?.[k]?.label || k
    if (falling >= cells.length * 0.8) out.push(`${label} fell clearly in ${falling} of ${cells.length} cities.`)
    if (rising >= cells.length * 0.8) out.push(`${label} rose clearly in ${rising} of ${cells.length} cities.`)
  }
  return out
}

export const metaByKey = (table) => Object.fromEntries((table?.factors || []).map((f) => [f.key, f]))

/** The list item's id for a city, so the map and scatter can scroll to it. */
export const cityId = (name) => `city-${name.replace(/\W+/g, '-')}`
