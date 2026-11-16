// Presenter for the detective pages (SPEC amendment A2). Pure functions turn one factor (a report card for an
// address, or a state series in the same shape) into what each page shows; useAnalysis() owns the fetching.
// Every number comes from the API (data_pipeline/analysis/seasonal.py); this file only picks, words and scales.
import { useEffect, useState } from 'react'
import { fetchEvents } from '../api/events'
import { fetchReport } from '../api/report'
import { fetchRegions, fetchRegionSeries } from '../api/regions'
import { format, sign, unitOf } from '../lib/format'

// The detective steps in order (a real sequence, so they are numbered): the side menu, the phone strip and the
// header's "Look closer" menu all read this list.
export const STEPS = [
  { href: '/explore', label: 'Look', hint: 'Every month on one chart' },
  { href: '/seasons', label: 'Seasons', hint: 'Which months changed' },
  { href: '/test', label: 'Is it real?', hint: 'Test the trend' },
  { href: '/events', label: 'Spike or trend?', hint: 'Unusual months and events' },
  { href: '/map', label: 'Where else?', hint: 'The US map' },
  { href: '/patterns', label: 'What moves together?', hint: 'Links and signs of change' },
]

const POINT_LABELS = {
  hot_days: 'Very hot days', warm_nights: 'Warm nights', cold_days: 'Very cold nights', heavy_rain_days: 'Heavy-rain days',
  wettest_day: 'Wettest day', dry_days: 'Dry days', muggy_days: 'Muggy days', humid_heat_days: 'Humid-heat days',
  heat_index_days: 'Dangerous heat-index days', frost_free_season: 'Frost-free season',
  pm25: 'Fine particles (PM2.5)', no2: 'Nitrogen dioxide (NO₂)', fires: 'Fire detections', smoke_days: 'Smoke days',
  aod: 'Haze (aerosol optical depth)', rain_sat: 'Rain seen by satellite', surface_heat_5km: 'Ground heat (MODIS)',
  water_storage: 'Water storage (GRACE)',
}

/** A variable's name for the pickers: a state's from GET /regions, an address's from the report cards' names. */
// One name per record everywhere (menu, heading, notes): the app's own short names first, then the state catalogue's.
export const variableLabel = (place, key, regions) =>
  POINT_LABELS[key] || (place?.kind === 'state' ? regions?.variables?.find((v) => v.key === key)?.label : null) || key

/** A record's name for headings: the report's label, or ours from the URL (before data arrives, and when a
 *  not-available card carries only its key), so a raw key never shows and the heading doesn't change on load. */
export const recordName = (factor, place, variable, regions) => {
  const name = variableLabel(place, variable, regions)
  return name !== variable ? name : (factor?.label || variable)
}

/** One sentence when a link's place or variable was replaced (outside the US, an unknown record); '' for a good link. */
export function linkNote(replaced, variableName = '') {
  const bits = []
  if (replaced?.place) bits.push('This link’s place isn’t in the US, so this shows Wisconsin. Choose a place in the side menu.')
  if (replaced?.variable) bits.push(`This link asks for a record we don’t have here, so this shows ${variableName || 'another record'}.`)
  return bits.join(' ')
}

export const PERIODS = [10, 15, 20, 25]
export const LONGER = 45                                  // 1981-2025: NASA POWER weather for a state only
const POWER_VARS = ['t2m', 't2m_max', 'precip', 'gwetroot', 'frost_days']
// Satellite and analysis grids added in A3/A4: smoke outlines (NOAA HMS), haze (MERRA-2 AOD), satellite rain (IMERG),
// ground heat (MODIS) and water storage (GRACE).
const GRID_VARS = ['smoke_days', 'aod', 'rain_sat', 'surface_heat_5km', 'water_storage']
export const STATE_VARS = [...POWER_VARS, 'pm25', 'no2', ...GRID_VARS]
export const POINT_VARS = ['hot_days', 'warm_nights', 'cold_days', 'heavy_rain_days', 'wettest_day', 'dry_days',
  'muggy_days', 'humid_heat_days', 'heat_index_days', 'frost_free_season', 'pm25', 'no2', 'fires', ...GRID_VARS]
export const DEFAULT_PLACE = { kind: 'state', code: 'WI' }
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October',
  'November', 'December']
const SEASON_LABELS = { winter: 'Winter (Dec–Feb)', spring: 'Spring (Mar–May)', summer: 'Summer (Jun–Aug)', autumn: 'Autumn (Sep–Nov)' }

const round2 = (v) => Math.round(v * 100) / 100

// URL values are user input: only known shapes get through, and numbers are clamped (SPEC A2 boundaries).
export function readPlace({ region, lat, lon, name } = {}) {
  const code = typeof region === 'string' ? region.toUpperCase() : ''
  if (/^[A-Z]{2}$/.test(code)) return { kind: 'state', code }
  if (Number.isFinite(lat) && Number.isFinite(lon) && lat >= 18 && lat <= 72 && lon >= -180 && lon <= -65) {
    return { kind: 'point', lat: round2(lat), lon: round2(lon), name: String(name || '').slice(0, 120) }
  }
  return null
}

export const variablesFor = (place) => (place?.kind === 'point' ? POINT_VARS : STATE_VARS)

export function readVariable(place, variable) {
  const list = variablesFor(place)
  return list.includes(variable) ? variable : 'pm25'
}

// The periods a record can fill: smoke (from 2011) offers 10 and 15 years, NO₂, fires and water storage stop at 20
// (L5: a "25 years" button that changes nothing is a dead control).
export const periodsFor = (place, variable) => (place?.kind === 'state' && POWER_VARS.includes(variable) ? [...PERIODS, LONGER]
  : PERIODS.filter((n) => n === PERIODS[0] || LAST_YEAR - n + 1 >= firstYearFor(place, variable)))

export const LAST_YEAR = 2025
export const MIN_YEARS = 8

const FIRST_YEAR = { pm25: 2010, no2: 2005, fires: 2003, smoke_days: 2011, water_storage: 2002 }

/** The first year with data: NASA POWER weather from 1981 for a state (2001 for an address), PM2.5 2010 (D41), NO₂ 2005,
 *  fires 2003, smoke 2011 (medium and heavy only, D37), water storage 2002. */
export function firstYearFor(place, variable) {
  if (FIRST_YEAR[variable]) return FIRST_YEAR[variable]
  return place?.kind === 'state' && POWER_VARS.includes(variable) ? 1981 : 2001
}

/** A custom From-To from the URL, if it is valid for this place and variable (at least 8 years inside the data). */
export function readRange({ from, to } = {}, place, variable) {
  if (!Number.isInteger(from) || !Number.isInteger(to)) return null
  if (from < firstYearFor(place, variable) || to > LAST_YEAR || to - from + 1 < MIN_YEARS) return null
  return { from, to }
}

/** The years a page covers, as shown in the top strip: a custom range, or the last `years` years but never before the
 *  record's first year (smoke starts in 2011, so 25 years of smoke is 2011–2025). */
export const spanLabel = (place, variable, years, range) => (range ? `${range.from}–${range.to}`
  : `${Math.max(LAST_YEAR - years + 1, firstYearFor(place, variable))}–${LAST_YEAR}`)

export function readYears(years, place, variable) {
  const list = periodsFor(place, variable)
  return list.includes(years) ? years : list.includes(25) ? 25 : Math.max(...list)
}

export const placeLabel = (place, name) =>
  name || (place?.kind === 'point' ? place.name || `${place.lat}, ${place.lon}` : place?.code || '')

const monthLabel = (ym) => `${MONTH_NAMES[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`
// sign() keeps two significant digits below 1 ("−0.004"); a scale description ("0 (dry) to 1 (soaked)") is not a unit.
const rateUnit = (f) => (/\(|\bto\b/.test(unitOf(f) || '') ? '' : unitOf(f))
const perDecade = (f, v) => `${sign(v)} ${rateUnit(f)} per decade`.replace('  ', ' ')
export const pLabel = (p) => (p < 0.001 ? 'p < 0.001' : `p = ${p < 0.1 ? p.toFixed(3) : p.toFixed(2)}`)

/** A link's query string for a place, variable and period (cases and map clicks build these). */
export function detectiveQuery({ region, lat, lon, name, variable, years }) {
  const q = new URLSearchParams()
  if (region) q.set('region', region)
  if (Number.isFinite(lat)) { q.set('lat', lat); q.set('lon', lon); if (name) q.set('name', name) }
  if (variable) q.set('var', variable)
  if (years && years !== 25) q.set('years', years)
  return `?${q}`
}

// ---- Explore -----------------------------------------------------------------------------------------------------

/** Warming-stripes header: one stripe per year, coloured by how far that year sits from the period's average. */
export function stripes(factor) {
  const pts = (factor.points || []).filter((p) => Number.isFinite(p.value))
  if (pts.length < 2) return []
  // the reference is the early-years average the report sends (`then`): no mean is computed in the browser (rule 5)
  const ref = Number.isFinite(factor.then) ? factor.then : pts[0].value
  const span = Math.max(...pts.map((p) => Math.abs(p.value - ref))) || 1
  return pts.map((p) => ({ year: p.year, value: p.value, k: Math.min(9, Math.max(1, Math.round(5 + 4 * (p.value - ref) / span))) }))
}

/** The monthly chart's axis top when a few months tower over the rest (fire smoke on PM2.5): the 98th-percentile month
 *  (nearest rank), so the usual months stay readable, and the months above it, tallest first, to label. Null when no
 *  month passes 1.5 times that, or with under 24 months. It picks an axis, it is not a statistic shown to anyone. */
export function axisCap(monthly) {
  const ms = (monthly || []).filter((m) => Number.isFinite(m.value))
  if (ms.length < 24) return null
  const sorted = ms.map((m) => m.value).sort((a, b) => a - b)
  const top = sorted[Math.ceil(0.98 * sorted.length) - 1]
  if (!(top > 0) || sorted.at(-1) <= 1.5 * top) return null
  const above = ms.filter((m) => m.value > top).sort((a, b) => b.value - a.value)
  return { top, above: above.length, spikes: above.map((m) => ({ ...m, label: `${MONTHS[Number(m.month.slice(5, 7)) - 1]} ${m.month.slice(0, 4)}: ${format(m.value)}` })) }
}

// Water records get brown (drier) and teal (wetter): blue for "below average" read as wet on a rain record (round 3).
const WETTER_UP = ['precip', 'gwetroot', 'rain_sat', 'water_storage', 'heavy_rain_days', 'wettest_day']

/** 'wet' when a rise means wetter, 'dry' when it means drier (very dry days), null for red and blue. */
export const waterSense = (variable) => (WETTER_UP.includes(variable) ? 'wet' : variable === 'dry_days' ? 'dry' : null)

/** The words under the stripes for this record's colours. */
export function stripeKey(variable) {
  const sense = waterSense(variable)
  if (sense === 'wet') return 'Brown: drier than the early years’ average · teal: wetter'
  if (sense === 'dry') return 'Brown: more very dry days than the early years’ average · teal: fewer'
  return 'Blue: below the early years’ average · red: above'
}

/** One sentence that says what the series shows, written from the numbers (also the chart's long description). */
export function takeaway(factor, place) {
  if (!factor?.available) return ''
  const [a, b] = factor.period || []
  // "rose" or "fell" only for a clear change; otherwise the numbers moved, and the sentence says it isn't clear yet
  const dir = !factor.significant ? 'went' : factor.slope_per_decade > 0 ? 'rose' : factor.slope_per_decade < 0 ? 'fell' : 'stayed level'
  return `${factor.label} in ${place} ${dir} from ${format(factor.then)} to ${format(factor.now)} ${unitOf(factor)} ` +
    `(${factor.then_years?.[0]}–${factor.then_years?.at(-1)} vs ${factor.now_years?.[0]}–${factor.now_years?.at(-1)})` +
    `${factor.significant ? ', ' : ', a change that isn’t clear yet, '}` +
    (factor.monthly?.length ? `with ${factor.monthly.length} months of data from ${a} to ${b}.`
      : `with ${factor.n_years} years of data from ${a} to ${b}.`)
}

// ---- Test --------------------------------------------------------------------------------------------------------

/** The two-state verdict for /test: "Clear trend" when the report says so (in a report, q < 0.05 after the correction
 *  across its records, D47; for a state series, p < 0.05). A clear record that years-remembering-years could explain
 *  carries a memory note. */
export function verdict(factor) {
  if (!factor?.available) return { state: 'none', title: 'Not enough data', text: factor?.reason || '' }
  if (factor.constant) return { state: 'none', title: 'Nothing to test', text: `${factor.label} was the same in every year here.` }
  const clear = Boolean(factor.significant)
  const s = factor.seasonal
  const yn = s?.years_needed
  let yearsNeeded = null
  if (!clear && yn) {
    yearsNeeded = yn.even_odds > 100
      ? `More than 100 years: this change is tiny next to the usual ups and downs, so more data alone won't settle it.`
      : `About ${yn.even_odds}–${yn.likely} years of data would give a change this size a fair (50%) to good (90%) chance of showing clearly. This test has ${factor.n_years}.`
  }
  const [lo, hi] = factor.slope_ci95_per_decade || []
  // a clear verdict that hangs on one year says so in the headline, not only further down (round 3)
  const flips = factor.leave_one_out?.flips || []
  const hangs = clear && flips.length ? flips.join(' and ') : ''
  // the test sees a rise but the rate is 0: a count most years had none of (the report holds it back, D47)
  const tested = Number.isFinite(factor.q) ? factor.q : factor.mk_p
  const mostlyNone = !clear && factor.slope_per_decade === 0 && tested < 0.05
  return {
    state: clear ? 'clear' : 'unclear',
    title: hangs ? `Clear trend, but it hangs on ${hangs}` : clear ? 'Clear trend' : 'Not clear yet',
    hangs,
    direction: factor.slope_per_decade > 0 ? 'rising' : factor.slope_per_decade < 0 ? 'falling' : 'level',
    rate: perDecade(factor, factor.slope_per_decade),
    range: Number.isFinite(lo) ? `95% range: ${sign(lo)} to ${sign(hi)}` : '',
    p: factor.p_label,
    q: Number.isFinite(factor.q) ? (factor.q < 0.001 ? 'q < 0.001' : `q = ${factor.q.toFixed(3)}`) : '',
    corrected: factor.records_tested > 1 ? `corrected for the ${factor.records_tested} records checked here` : '',
    memory: clear && factor.memory_sensitive
      ? 'This record remembers the year before: a high year tends to be followed by another, so its 25 years hold less evidence than they seem. Allowing for that, the change isn’t clear yet. Treat it as a lead.'
      : '',
    words: hangs
      ? `With every year in, the test finds a clear change; without ${hangs}, it doesn't. Treat it as a lead, not a settled result.`
      : clear
      ? 'A change this large would rarely happen by chance in a series this long.'
      : mostlyNone
      ? 'The recent years are higher, but most years here had none, so the typical change from one year to the next is zero. That isn’t counted as a clear trend; watch the coming years.'
      : 'Year-to-year ups and downs could explain this change; it may only need a longer record.',
    yearsNeeded,
    monthly: s ? { clear: s.overall.clear, p: s.overall.p_label, text: monthlyWords(clear, s.overall) } : null,
  }
}

// ---- The guess (step 1 → step 3) ---------------------------------------------------------------------------------

export const GUESSES = [['up', 'Going up'], ['down', 'Going down'], ['flat', 'Neither']]
const GUESS_WORDS = { up: 'going up', down: 'going down', flat: 'neither up nor down' }

/** The guess from the URL (`guess=up|down|flat`), allowlisted like every URL value. */
export const readGuess = (v) => (v in GUESS_WORDS ? v : null)

/** /test answers the guess made on /explore: "You guessed going up; the test says …". Null without a guess or a test. */
export function guessAnswer(guess, factor) {
  const v = verdict(factor)
  if (!guess || v.state === 'none') return null
  const said = v.state === 'clear' ? (factor.slope_per_decade > 0 ? 'up' : 'down') : 'flat'
  const words = said === 'flat'
    ? 'there is no clear trend yet: the ups and downs between years could explain this change'
    : `it is clearly ${GUESS_WORDS[said]}${v.hangs ? `, but only with ${v.hangs} in` : ''}`
  return { match: guess === said, text: `You guessed ${GUESS_WORDS[guess]}; the test says ${words}.` }
}

// The monthly test next to the yearly one: four cases, each said plainly.
function monthlyWords(yearlyClear, o) {
  const how = 'comparing each month only with the same month in other years'
  if (yearlyClear && o.clear) return `The monthly test agrees: ${how}, the change is clear (${o.p_label}).`
  if (yearlyClear) return `The monthly test (${how}) is less sure (${o.p_label}): the change shows in the yearly values more than month by month.`
  if (o.clear) return `But the monthly test already finds a clear change (${o.p_label}): ${how} gives it 12 times as many values to work with as the yearly test.`
  return `The monthly test (${how}) doesn't find a clear change either (${o.p_label}).`
}

// ---- Seasons -----------------------------------------------------------------------------------------------------

/** Season and month trend bars. Bars that aren't clear after the multiple-testing correction are faded. */
export function seasonBars(factor) {
  const s = factor?.seasonal
  if (!s) return null
  const shape = (rows, labelOf) => rows.map((r) => ({
    name: r.name, label: labelOf(r.name), available: r.available, value: r.slope_per_decade, clear: Boolean(r.clear),
    q: r.q, text: r.available ? `${r.clear ? (r.slope_per_decade > 0 ? '↑ ' : '↓ ') : ''}${perDecade(factor, r.slope_per_decade)}${r.clear ? ', clear' : ', not clear yet'}` : 'not enough data',
  }))
  const all = [...s.seasons, ...s.months].filter((r) => r.available).map((r) => Math.abs(r.slope_per_decade))
  const clearSeasons = s.seasons.filter((r) => r.clear).map((r) => r.name)
  const clearMonths = s.months.filter((r) => r.clear).map((r) => r.name)
  return {
    seasons: shape(s.seasons, (n) => SEASON_LABELS[n]),
    months: shape(s.months, (n) => n),
    max: Math.max(...all, 1e-9),
    // seasons and single months are separate tests: never put a month in brackets after a season it isn't in
    summary: clearSeasons.length
      ? `As a season, the change is clear in ${listWords(clearSeasons)}. ${clearMonths.length
        ? `Month by month, ${clearMonths.length === 1 ? 'only ' : ''}${listWords(clearMonths.map(monthName))} ${clearMonths.length > 1 ? 'are' : 'is'} clear.`
        : 'No single month is clear on its own.'}`
      : clearMonths.length ? `Only ${listWords(clearMonths.map(monthName))} ${clearMonths.length > 1 ? 'show' : 'shows'} a clear change.`
        : 'No single season or month shows a clear change yet.',
    note: 'We tested 4 seasons and 12 months, so we used a stricter bar (the Benjamini-Hochberg correction): with 12 tests, one would often look "significant" by luck.',
  }
}

const monthName = (m) => MONTH_NAMES[MONTHS.indexOf(m)] || m
const listWords = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`)

/** Cycle plot: each calendar month's values across the years, side by side, with its trend state. */
/** The month grid as a table (the heatmap's Table tab): a row per year, a column per month, a dash where none. */
export function monthTable(factor) {
  const byYear = new Map()
  for (const m of factor.monthly || []) {
    const [y, mo] = m.month.split('-').map(Number)
    if (!byYear.has(y)) byYear.set(y, Array(12).fill('—'))
    if (Number.isFinite(m.value)) byYear.get(y)[mo - 1] = format(m.value)
  }
  return { columns: ['Year', ...MONTHS], rows: [...byYear.keys()].sort((a, b) => a - b).map((y) => [y, ...byYear.get(y)]) }
}

/** The heatmap legend from the report's class edges: each class's colour (an index into the 7-step sequential or 9-step
 *  diverging ramp, exactly as the cells pick it) and the edge after it. Difference edges are on its size, mirrored. */
export function classSteps(edges, diverging = false) {
  const n = edges.length
  if (!n) return []
  if (!diverging) return Array.from({ length: n + 1 }, (_, k) => ({ color: Math.round((k * 6) / n), edge: k < n ? edges[k] : null }))
  return Array.from({ length: 2 * n + 1 }, (_, i) => {
    const k = i - n
    return { color: 4 + Math.sign(k) * Math.round((Math.abs(k) * 4) / n), edge: k === n ? null : k >= 0 ? edges[k] : -edges[-k - 1] }
  })
}

export function cycle(factor) {
  const s = factor?.seasonal
  const byMonth = MONTHS.map(() => [])
  for (const m of factor?.monthly || []) {
    if (Number.isFinite(m.value)) byMonth[Number(m.month.slice(5, 7)) - 1].push({ year: Number(m.month.slice(0, 4)), value: m.value })
  }
  const values = byMonth.flat().map((p) => p.value)
  const normals = s?.normals || []
  return {
    min: Math.min(...values), max: Math.max(...values),
    months: byMonth.map((points, i) => ({
      label: MONTHS[i], points,
      typical: normals.find((n) => n.month === i + 1)?.p50 ?? null,   // the pipeline's median for this month (rule 5)
      clear: Boolean(s?.months?.[i]?.clear), slope: s?.months?.[i]?.slope_per_decade ?? null,
    })),
  }
}

const yearsLabel = ([a, b] = []) => `${a}–${String(b).slice(2)}`

/** The typical year then and now: each calendar month's early and recent 5-year averages (from the pipeline), its usual
 *  range (10th to 90th percentile over every year) and its own corrected trend. Null for a report made before the
 *  pipeline sent the averages, so the page just leaves the chart out. */
export function typicalYear(factor) {
  const s = factor?.seasonal
  if (!s?.windows || !s.months?.some((m) => Number.isFinite(m.then) && Number.isFinite(m.now))) return null
  const thenLabel = yearsLabel(s.windows.then), nowLabel = yearsLabel(s.windows.now)
  const unit = unitOf(factor)
  const months = s.months.map((m, i) => {
    const n = (s.normals || []).find((x) => x.month === i + 1) || {}
    const ok = Number.isFinite(m.then) && Number.isFinite(m.now)
    const trend = m.available ? `${perDecade(factor, m.slope_per_decade)}, ${m.clear ? 'a clear change' : 'not clear yet'}` : 'too few years to test'
    return {
      label: MONTHS[i], then: ok ? m.then : null, now: ok ? m.now : null, lo: n.p10 ?? null, hi: n.p90 ?? null,
      clear: Boolean(m.clear), up: (m.slope_per_decade || 0) > 0,
      text: ok ? `${MONTH_NAMES[i]}: ${thenLabel} average ${format(m.then)}, ${nowLabel} average ${format(m.now)} ${unit}; ${trend}.` : `${MONTH_NAMES[i]}: no average.`,
    }
  })
  const values = months.flatMap((m) => [m.then, m.now, m.lo, m.hi]).filter(Number.isFinite)
  return { thenLabel, nowLabel, months, min: Math.min(...values), max: Math.max(...values) }
}

// ---- Events ------------------------------------------------------------------------------------------------------

const overlaps = (event, ym) => event.start.slice(0, 7) <= ym && ym <= event.end.slice(0, 7)

/** Events whose dates cover this month and that should show in this variable. */
export const eventsFor = (ym, events, variable) =>
  (events || []).filter((e) => overlaps(e, ym) && (!variable || e.variables.includes(variable)))

/** The most unusual months (by z), each with the catalogued events it lines up with. */
const withArticle = (name) => `${/^[AEIOU]/.test(name) ? 'an' : 'a'} ${name}`   // "for an August"
export const UNUSUAL_SD = 2     // the band chart rings months past 2 SD too: about once in 20 years by chance

/** The most unusual months, past 2 SD only (round 3: 1.2 SD was being called "unusual"). "Unusual for a June":
 *  z compares a month with the same calendar month in other years, so a mild-looking value can rank high. */
export function unusualMonths(factor, events, variable, n = 6) {
  return (factor?.monthly || []).filter((m) => Number.isFinite(m.z) && Math.abs(m.z) >= UNUSUAL_SD)
    .sort((a, b) => Math.abs(b.z) - Math.abs(a.z)).slice(0, n)
    .map((m) => ({ month: m.month, label: monthLabel(m.month), monthName: MONTH_NAMES[Number(m.month.slice(5, 7)) - 1], forMonth: withArticle(MONTH_NAMES[Number(m.month.slice(5, 7)) - 1]), z: m.z, value: m.value,
      high: m.z > 0, events: eventsFor(m.month, events, variable),
      strength: Math.abs(m.z) >= 3 ? 'Very unusual' : 'Unusual', gauge: Math.min(1, Math.abs(m.z) / 4) }))   // 4 SD fills the gauge
}

/** "This year vs normal": the month-by-month normal range (from the API) and one year's values. */
export function band(factor, year) {
  const normals = factor?.seasonal?.normals || []
  const values = new Map((factor?.monthly || []).filter((m) => m.month.startsWith(`${year}-`)).map((m) => [Number(m.month.slice(5, 7)), m]))
  return normals.map((n) => ({ ...n, label: MONTHS[n.month - 1], value: values.get(n.month)?.value ?? null, z: values.get(n.month)?.z ?? null }))
}

export function bandYears(factor) {
  return [...new Set((factor?.monthly || []).map((m) => Number(m.month.slice(0, 4))))].sort((a, b) => a - b)
}

/** The year holding the most unusual month: where "this year vs normal" starts. */
export function defaultBandYear(factor) {
  const top = unusualMonths(factor, [], null, 1)[0]
  return top ? Number(top.month.slice(0, 4)) : bandYears(factor).at(-1)
}

/** For each event year inside the period: the yearly test without that year (from the API's leave_one_out). */
export function withoutEventYears(factor, events, variable) {
  const loo = factor?.leave_one_out
  if (!loo) return []
  const years = new Map(loo.years.map((r) => [r.year, r]))
  const seen = new Set()
  const out = []
  for (const e of (events || []).filter((x) => !variable || x.variables.includes(variable))) {
    const y = Number(e.start.slice(0, 4))
    if (!years.has(y) || seen.has(y)) continue
    seen.add(y)
    const r = years.get(y)
    out.push({
      year: y, event: e.title, changes: r.clear !== loo.clear,
      text: `Without ${y}: ${r.clear ? 'clear trend' : 'not clear'} (${pLabel(r.p)}, ${perDecade(factor, r.slope_per_decade)}).`,
    })
  }
  return out
}

/** A sentence on how much the yearly verdict hangs on single years. */
export function fragility(factor) {
  const loo = factor?.leave_one_out
  if (!loo) return ''
  if (!loo.flips.length) return `Leaving out any single year doesn't change the verdict (${loo.clear ? 'clear' : 'not clear'}).`
  return `The verdict hangs on ${listWords(loo.flips.map(String))}: leave ${loo.flips.length > 1 ? 'one of them' : 'it'} out and the trend becomes ${loo.clear ? 'not clear' : 'clear'}.`
}

// ---- Data --------------------------------------------------------------------------------------------------------

/** Fetches the factor for a place and variable: a state series, or the address's report card. */
export function useAnalysis(place, variable, years, range = null) {
  const key = place ? `${place.kind}|${place.code || `${place.lat},${place.lon}`}|${variable}|${range ? `${range.from}-${range.to}` : years}` : ''
  const [state, setState] = useState({ key: '', data: null, error: '' })
  useEffect(() => {
    if (!key) return undefined
    const c = new AbortController()
    const [kind, where] = key.split('|')
    const load = kind === 'state'
      ? fetchRegionSeries(where, variable, years, c.signal, range).then((d) => ({ factor: d.factor, name: d.region.name }))
      : fetchReport({ household: [], location: { lat: Number(where.split(',')[0]), lon: Number(where.split(',')[1]) }, period: Math.min(years, 25), range }, c.signal)
        .then((r) => ({ factor: r.factors?.[variable] || { available: false, label: variable, reason: 'Not measured for this place.' },
          name: null, labels: Object.fromEntries(Object.values(r.factors || {}).map((f) => [f.key, f.label])) }))
    load.then((data) => setState({ key, data, error: '' }))
      .catch((err) => { if (!c.signal.aborted) setState({ key, data: null, error: err.message }) })
    return () => c.abort()
  }, [key])   // eslint-disable-line react-hooks/exhaustive-deps -- `key` holds place, variable and years or range
  const fresh = state.key === key
  return { factor: fresh ? state.data?.factor : null, name: fresh ? state.data?.name : null,
    labels: fresh ? state.data?.labels : null, loading: Boolean(key) && !fresh, error: fresh ? state.error : '' }
}

/** Fetches the curated events for a state or the state of a point. */
export function useEvents(place) {
  const key = place ? (place.kind === 'state' ? place.code : `${place.lat},${place.lon}`) : ''
  const [state, setState] = useState({ key: '', events: [], region: null })
  useEffect(() => {
    if (!key) return undefined
    const c = new AbortController()
    const q = key.includes(',') ? { lat: Number(key.split(',')[0]), lon: Number(key.split(',')[1]) } : { region: key }
    fetchEvents(q, c.signal).then((d) => setState({ key, events: d.events, region: d.region })).catch(() => {})
    return () => c.abort()
  }, [key])
  return state.key === key ? state : { events: [], region: null }
}

/** The states and state variables (labels, definitions, first year) for the pickers; fetched once. */
let regionsOnce = null
/** A demo city's household-neutral report (Phoenix has every record), for the record list on /about; or the error. */
export function useAboutReport() {
  const [state, setState] = useState({ report: null, error: '' })
  useEffect(() => {
    const c = new AbortController()
    fetchReport({ household: [], location: { lat: 33.45, lon: -112.07 }, period: 25 }, c.signal)
      .then((report) => setState({ report, error: '' }))
      .catch((e) => { if (!c.signal.aborted) setState({ report: null, error: e.message }) })
    return () => c.abort()
  }, [])
  return state
}

export function useRegions() {
  const [data, setData] = useState(null)
  useEffect(() => {
    let live = true
    regionsOnce = regionsOnce || fetchRegions().catch((e) => { regionsOnce = null; throw e })
    regionsOnce.then((d) => { if (live) setData(d) }).catch(() => {})
    return () => { live = false }
  }, [])
  return data
}
