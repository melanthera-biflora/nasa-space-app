// Presenter for the friendlier report (SPEC A5): what a household needs to read first, in plain words, with at most
// two numbers per record (the early and recent 5-year averages). The statistics stay on the Look closer pages.
// Pure functions only: every number comes from the report as sent; this file picks, groups and words.
import { format, unitOf } from '../lib/format'
import { cardKeys, profileText, rankedActions } from './report'

// The four themes the records are grouped in, in a fixed order (not by statistical status); unknown keys go last.
export const THEMES = [
  { id: 'heat', label: 'Heat and cold', icon: 'thermometer', keys: ['hot_days', 'warm_nights', 'humid_heat_days', 'muggy_days', 'cold_days', 'frost_days'] },
  { id: 'water', label: 'Rain and water', icon: 'droplets', keys: ['heavy_rain_days', 'wettest_day', 'rain_sat', 'dry_days'] },
  { id: 'air', label: 'Air and smoke', icon: 'wind', keys: ['smoke_days', 'pm25', 'aod', 'no2', 'fires'] },
  { id: 'ground', label: 'Ground', icon: 'layers', keys: ['surface_heat', 'heat_island', 'surface_heat_5km', 'water_storage'] },
]
const ICONS = {
  hot_days: 'sun', warm_nights: 'moon', humid_heat_days: 'droplets', muggy_days: 'droplets', cold_days: 'snowflake', frost_days: 'snowflake',
  heavy_rain_days: 'cloud-rain', wettest_day: 'cloud-rain', rain_sat: 'satellite', dry_days: 'sun', smoke_days: 'cloud-fog',
  pm25: 'haze', aod: 'haze', no2: 'car', fires: 'flame', surface_heat: 'thermometer', heat_island: 'thermometer',
  surface_heat_5km: 'thermometer', water_storage: 'waves',
}
const LEVELS = { caution: 'Caution', high_risk: 'High', suitable: 'Under the limit' }
// Short plain names for the rows and cards (the full label is in the opened record).
const NAMES = { smoke_days: 'Medium or thick smoke days', pm25: 'Fine particles (PM2.5)', no2: 'Traffic pollution (NO₂)', aod: 'Haze', fires: 'Fires nearby',
  rain_sat: 'Rain seen by satellite', surface_heat_5km: 'Ground heat', surface_heat: 'Neighborhood ground heat',
  heat_island: 'Heat island', water_storage: 'Water storage', wettest_day: 'Wettest day of the year' }
export const nameOf = (f) => NAMES[f.key] || f.label

// What each record is made from, so a reader can weigh it: a model estimate (reanalysis) or a measurement, and the size
// of the square it averages over. From the report's data_source lines; the years come from the record itself.
const POWER = { kind: 'Model estimate', grid: '50 km', dataset: 'NASA POWER (MERRA-2 reanalysis)' }
export const QUALITY = {
  hot_days: POWER, warm_nights: POWER, humid_heat_days: POWER, muggy_days: POWER, cold_days: POWER, frost_days: POWER,
  heavy_rain_days: POWER, wettest_day: POWER, dry_days: POWER,
  pm25: { kind: 'Model estimate', grid: '50 km', dataset: 'NASA MERRA-2 aerosols (no nitrate, so it can read low)' },
  aod: { kind: 'Model estimate', grid: '50 km', dataset: 'NASA MERRA-2 aerosols' },
  smoke_days: { kind: 'Satellite outlines', grid: '50 km', dataset: 'NOAA Hazard Mapping System smoke, drawn by analysts' },
  no2: { kind: 'Satellite', grid: '25 km', dataset: 'NASA OMI on Aura' },
  fires: { kind: 'Satellite', grid: '1 km', dataset: 'NASA FIRMS (MODIS)' },
  rain_sat: { kind: 'Satellite', grid: '10 km', dataset: 'NASA GPM IMERG' },
  surface_heat_5km: { kind: 'Satellite', grid: '5 km', dataset: 'NASA MODIS on Terra (MOD11C3)' },
  surface_heat: { kind: 'Satellite', grid: '1 km', dataset: 'NASA MODIS on Terra (MOD11A2)' },
  heat_island: { kind: 'Satellite', grid: '1 km', dataset: 'NASA MODIS on Terra (MOD11A2)' },
  water_storage: { kind: 'Gravity satellites', grid: '300 km', dataset: 'NASA/DLR GRACE and GRACE-FO' },
}

/** "Model estimate · 50 km · 2001–2025": what the record is, how coarse, which years. Empty for an unknown record. */
export function quality(f) {
  const q = QUALITY[f.key]
  return q ? [q.kind, q.grid, f.period?.length === 2 ? `${f.period[0]}–${f.period[1]}` : ''].filter(Boolean).join(' · ') : ''
}

export const iconOf = (key) => ICONS[key] || 'activity'
// Lower-case a name for the middle of a sentence, but keep acronyms ("PM2.5", "NO₂").
const inSentence = (s) => (s.length > 1 && /[a-z]/.test(s[1]) ? s[0].toLowerCase() + s.slice(1) : s)

/** Direction and sureness in words, with the arrow and tone that go with them (colour never alone). */
export function verdict(f) {
  if (f.constant) return { text: 'No change', tone: 'flat', arrow: 'minus', clear: false }
  const arrow = f.slope_per_decade > 0 ? 'trend-up' : f.slope_per_decade < 0 ? 'trend-down' : 'minus'
  if (f.trend_direction === 'worsening') return { text: 'Clearly worse', tone: 'up', arrow, clear: true }
  if (f.trend_direction === 'improving') return { text: 'Clearly better', tone: 'down', arrow, clear: true }
  return { text: 'No clear change yet', tone: 'flat', arrow: 'minus', clear: false,   // no arrow for a change that isn't clear
    why: 'The usual ups and downs between years could explain this change.' }   // so a big jump called "not clear" isn't a puzzle
}

/** "Is it real?" in plain words, from the report's yes/no (the numbers behind it are on /test). */
export function realWords(f) {
  if (f.constant) return 'It was the same in every year of the record, so there is nothing to test.'
  if (!f.significant) return 'Not clear yet: the normal ups and downs between years could explain this change. A longer record may settle it.'
  // how sure, from the leave-one-year-out check the report already runs: holds without any year, or hangs on one
  const flips = f.leave_one_out?.flips || []
  if (!f.leave_one_out) return 'This change is clear: it is too steady across the years to be chance.'
  if (!flips.length) return 'This change is clear: it is too steady across the years to be chance, and it holds without any single year.'
  const years = flips.length === 1 ? String(flips[0]) : `${flips.slice(0, -1).join(', ')} and ${flips.at(-1)}`
  return `This change is clear, but it hangs on ${years}: without ${flips.length === 1 ? 'it' : 'one of them'}, it would not be clear.`
}

// Counts are whole numbers (docs/UX.md "Numbers"), so a row's numbers match the sentence under it.
const COUNT_UNITS = ['days', 'nights', 'detections']
const shown = (f, v) => format(COUNT_UNITS.includes(unitOf(f)) && Number.isFinite(v) ? Math.round(v) : v)

// "0 → 1 day", not "1 days" (the unit follows the recent number)
const oneOf = (unit, text) => (text === '1' && COUNT_UNITS.includes(unit) ? unit.slice(0, -1) : unit)

const span = (yrs) => (yrs?.length === 2 ? `${yrs[0]}–${String(yrs[1]).slice(2)}` : '')

/** One record as a row: name, the two numbers (the budget), the verdict and, where a limit exists, a level word.
 *  `start` is the report's first year: a record that starts later says "since 2011" (smoke). */
export function recordRow(f, start) {
  return {
    since: start && f.period?.[0] > start ? `since ${f.period[0]}` : '',
    key: f.key, name: nameOf(f), label: f.label, icon: iconOf(f.key), unit: oneOf(unitOf(f), shown(f, f.now)),
    then: shown(f, f.then), now: shown(f, f.now), thenYears: span(f.then_years), nowYears: span(f.now_years),
    verdict: verdict(f), level: LEVELS[f.level] || null, priority: Boolean(f.priority_for_user), quality: quality(f),
  }
}

/** The opened record: the row, its yearly points with the two averages marked, and three plain sentences. */
export function recordDetail(f) {
  return {
    ...recordRow(f),
    points: (f.points || []).filter((p) => Number.isFinite(p.value)),
    marks: [
      f.then_years?.length === 2 && { from: f.then_years[0], to: f.then_years[1], value: f.then, label: `${span(f.then_years)} average` },
      f.now_years?.length === 2 && { from: f.now_years[0], to: f.now_years[1], value: f.now, label: `${span(f.now_years)} average` },
    ].filter(Boolean),
    sentences: [f.story?.happened, realWords(f), f.story?.why_it_matters].filter(Boolean),
    meaning: f.story?.what_it_likely_means || '',
    definition: f.definition || '',
    caveat: f.caveat || '',
    source: f.data_source || '',
  }
}

/** Up to `n` records for the big cards: what clearly got worse first (the household's priorities before others), then
 *  the household's other priorities, then what clearly got better. A priority that improved no longer pushes out a record
 *  that clearly got worse (round 3, owner-approved). */
export function topCards(report, n = 3) {
  const factors = report?.factors || {}
  const keys = cardKeys(report).filter((k) => !factors[k].constant)
  const start = report?.period?.[0]
  const rank = (k) => {
    const f = factors[k], mine = Boolean(f.priority_for_user)
    if (f.trend_direction === 'worsening') return mine ? 0 : 1
    if (mine) return f.trend_direction === 'improving' ? 3 : 2      // a priority with no clear change before one that improved
    return f.trend_direction === 'improving' ? 4 : 5
  }
  return keys.map((k, i) => [rank(k), i, k]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).slice(0, n).map(([, , k]) => recordRow(factors[k], start))
}

// A record that was zero in every year ("0 → 0, No change" rows, four of them in Spokane) goes in one line instead.
const never = (f) => f.constant && f.then === 0 && f.now === 0

/** "Never happened here in 2001–2025: very cold nights and muggy days.", or '' when every record happened. */
export function neverHappened(report) {
  const names = cardKeys(report).map((k) => report.factors[k]).filter(never).map((f) => inSentence(nameOf(f)))
  if (!names.length) return ''
  const years = report?.period?.length === 2 ? ` in ${report.period[0]}–${report.period[1]}` : ''
  return `Never happened here${years}: ${names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`}.`
}

/** Every available record, grouped by theme in a fixed order; none is dropped (unknown keys go to "Other") except the
 *  ones that never happened, which `neverHappened` names in one line. */
export function themes(report) {
  const factors = report?.factors || {}
  const keys = cardKeys(report).filter((k) => !never(factors[k]))
  const known = new Set(THEMES.flatMap((t) => t.keys))
  const start = report?.period?.[0]
  const groups = THEMES.map((t) => ({ ...t, rows: t.keys.filter((k) => keys.includes(k)).map((k) => recordRow(factors[k], start)) }))
  const other = keys.filter((k) => !known.has(k))
  if (other.length) groups.push({ id: 'other', label: 'Other', icon: 'activity', rows: other.map((k) => recordRow(factors[k], start)) })
  return groups.filter((g) => g.rows.length)
}

/** The hero: one sentence on what clearly changed over the years analyzed, the records behind it, and the rest. */
export function summary(report) {
  const factors = report?.factors || {}
  const tested = cardKeys(report).filter((k) => !factors[k].constant)
  const worse = tested.filter((k) => factors[k].trend_direction === 'worsening')
  const better = tested.filter((k) => factors[k].trend_direction === 'improving')
  const years = report?.period?.length === 2 ? report.period[1] - report.period[0] + 1 : null
  const over = years ? `In ${years} years, ` : ''
  const thing = (n) => `${n} ${n === 1 ? 'thing' : 'things'}`
  const bits = []
  if (worse.length) bits.push(`${thing(worse.length)} clearly got worse`)
  if (better.length) bits.push(worse.length ? `${better.length} got better` : `${thing(better.length)} clearly got better`)
  const sentence = bits.length ? `${over}${bits.join(' and ')} here.` : `${over}nothing here changed clearly.`
  const chip = (k) => ({ key: k, name: nameOf(factors[k]), verdict: verdict(factors[k]) })
  return {
    sentence: sentence.charAt(0).toUpperCase() + sentence.slice(1),
    chips: [...worse.map(chip), ...better.map(chip)],
    rest: tested.length - worse.length - better.length,
  }
}

/** Who the report is for, and which of its records matter most for them. */
export function householdLine(report, top) {
  const who = inSentence(profileText(report?.user))
  const mine = top.filter((t) => t.priority).map((t) => inSentence(t.name))
  if (!mine.length) return `For ${who}, the records below start with what changed most clearly.`
  const list = mine.length === 1 ? mine[0] : `${mine.slice(0, -1).join(', ')} and ${mine.at(-1)}`
  return `For ${who}, ${list} ${mine.length === 1 ? 'matters' : 'matter'} most.`
}

/** Actions (up to `n`), for the records that got worse first, then in the household's order. */
export function topActions(report, n = 3) {
  const worse = new Set(Object.values(report?.factors || {}).filter((f) => f.available && f.trend_direction === 'worsening').map((f) => f.key))
  const ranked = rankedActions(report)
  return [...ranked.filter((a) => worse.has(a.factor)), ...ranked.filter((a) => !worse.has(a.factor))].slice(0, n)
}

/** The case file's one line, plainly worded (no test names or p-values). */
export function caseLine(report, focus) {
  const f = focus ? report?.factors?.[focus] : null
  if (!f?.available) return 'This record isn’t available for this place.'
  return `${nameOf(f)}: ${shown(f, f.then)} → ${shown(f, f.now)} ${unitOf(f)} (${span(f.then_years)} vs ${span(f.now_years)}). `
    + `${verdict(f).text}. Switch the years analyzed to see how much evidence a change needs.`
}

/** The data sources behind the available records, once each, for "How we know". */
export function sources(report) {
  return [...new Set(cardKeys(report).map((k) => report.factors[k].data_source?.split(',')[0]).filter(Boolean))]
}

/** Every record a household report can hold, for /about: in theme order, with its name, quality badge, definition and
 *  data source, all from a report (a demo city's, which has every record). */
export function aboutRecords(report) {
  const factors = report?.factors || {}
  const order = [...THEMES.flatMap((t) => t.keys), ...Object.keys(factors)]
  return [...new Set(order)].filter((k) => factors[k]?.available).map((k) => {
    const f = factors[k]
    return { key: k, name: nameOf(f), quality: quality(f), definition: f.definition || '', source: f.data_source || '' }
  })
}
