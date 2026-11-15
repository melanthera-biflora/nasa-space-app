// Presenter for the report page (Model-View-Presenter). It turns an API report (the model, api/types.js) into
// what the page shows: headline, counts, the card list, the open card, missing cards, notable years, actions.
// Pure functions only: no React, no fetching, no statistics (every number comes from the report as sent).
import { direction, format, unitOf } from '../lib/format'

export const STATUS = { high_risk: 'High risk', caution: 'Caution', suitable: 'Suitable' }
export const TITLES = { pm25: 'PM2.5', hot_days: 'Days per year at or above 95°F', heavy_rain_days: 'Days per year with at least 0.8 in of rain', dry_days: 'Very dry days per year' }
const SOURCE_LABELS = { pm25: 'Fine particle pollution (PM2.5)', no2: 'Traffic pollution (NO₂)', fires: 'Fire detections nearby', surface_heat: 'Neighborhood surface heat' }
const AGES = { '65_plus': 'Adults 65+', '18_64': 'Adults 18–64', '5_17': 'Children and teens', under_5: 'Young children' }
const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1)
const CONDITIONS = { asthma_copd: 'asthma or COPD', heart_disease: 'heart disease', allergies: 'allergies', kidney_disease: 'kidney disease' }

const phrase = (n) => (n === 1 ? 'thing is' : 'things are')
export const shortYears = (yrs) => (yrs?.length === 2 ? `${yrs[0]}–${String(yrs[1]).slice(2)}` : '')
export const titleOf = (factor) => TITLES[factor.key] || factor.label

// Every available card, household priorities first (card_order), then any the order doesn't name.
export function cardKeys(report) {
  const factors = report?.factors || {}
  return [...new Set([...(report?.card_order || []), ...Object.keys(factors)])].filter((key) => factors[key]?.available)
}

// "What's changing here": counts of significant trends (Mann-Kendall, from the report) among cards that vary.
export function headline(report, keys = cardKeys(report)) {
  const factors = report?.factors || {}
  const tested = keys.filter((key) => !factors[key].constant)
  const by = (dir) => tested.filter((key) => factors[key].trend_direction === dir)
  const worse = by('worsening'), better = by('improving'), flat = by('no_clear_trend')
  const lead = worse.length ? { count: worse.length, text: `${phrase(worse.length)} getting worse` }
    : better.length ? { count: better.length, text: `${phrase(better.length)} improving` }
      : { count: null, text: 'No clear trends yet' }
  const list = [['Worse', worse], ['Better', better]].filter(([, k]) => k.length)
    .map(([tag, k]) => `${tag}: ${k.map((key) => factors[key].label).join(', ')}`).join(' · ')
  return {
    ...lead,
    list,
    counts: [
      { label: 'Getting worse', n: worse.length, tone: 'up' },
      { label: 'Improving', n: better.length, tone: 'down' },
      { label: 'No clear trend yet', n: flat.length, tone: 'flat' },
    ],
  }
}

// Cards that couldn't be built, and sources that didn't answer, each with its reason (never dropped silently).
export function missingCards(report) {
  const factors = Object.values(report?.factors || {})
  return [
    ...factors.filter((f) => !f.available && !f.parent).map((f) => `${f.label} (${f.reason})`),
    ...Object.entries(report?.data_status || {}).filter(([k, v]) => v !== 'ok' && SOURCE_LABELS[k])
      .map(([k, v]) => `${SOURCE_LABELS[k]} (${v.replace(/^not available:?\s*/, '') || 'no data here yet'})`),
  ]
}

export function profileText(user = {}) {
  const conditions = (user.conditions || [user.condition]).filter((c) => c && c !== 'none').map((c) => CONDITIONS[c] || c.replace(/_/g, ' '))
  const ages = (user.age_groups?.length ? user.age_groups : [user.age_group]).filter(Boolean).map((a) => AGES[a] || a.replace(/_/g, ' '))
  if (!ages.length && !conditions.length) return 'Your household'
  const who = ages.map((a, i) => (i ? lower(a) : a)).join(' and ')
  if (!conditions.length) return who
  // the report has only the combined answers: with several ages, never imply everyone has every condition (L4)
  return ages.length > 1 ? `${who} (someone has ${conditions.join(', ')})` : `${who || 'Your household'} with ${conditions.join(', ')}`
}

// Years when two or more cards were unusually bad together; each card name links to its card when it exists here.
export function notableYears(report, keys = cardKeys(report)) {
  const factors = report?.factors || {}
  const keyByLabel = Object.fromEntries(keys.map((key) => [factors[key].label, key]))
  return (report?.notable_years || []).map((n) => ({ year: n.year, chips: n.factors.map((label) => ({ label, key: keyByLabel[label] || null })) }))
}

// Actions for this household's top cards first (card_order), not at random.
export function rankedActions(report, keys = cardKeys(report)) {
  const rank = (key) => (keys.includes(key) ? keys.indexOf(key) : keys.length)
  return [...(report?.actions || [])].sort((a, b) => rank(a.factor) - rank(b.factor))
}

// The open card: the chosen one if it exists here, else the first.
export function openCard(report, selected, keys = cardKeys(report)) {
  const factors = report?.factors || {}
  const key = factors[selected]?.available ? selected : keys[0]
  const factor = factors[key]
  if (!factor) return { key: null, factor: null }
  const dir = direction(factor)
  return {
    key,
    factor,
    title: titleOf(factor),
    dir,
    change: { then: format(factor.then), now: format(factor.now), unit: unitOf(factor), years: `${shortYears(factor.then_years)} vs ${shortYears(factor.now_years)}` },
    levelText: factor.level ? `Today: ${STATUS[factor.level]}` : 'Trend only (no US health limit)',
  }
}

// The case file's one-line finding, written from the report's own numbers.
export function caseFinding(report, focus) {
  const f = focus ? report?.factors?.[focus] : null
  if (!f?.available) return 'This card isn’t available for this place.'
  return `${f.label}: ${format(f.then)} → ${format(f.now)} ${unitOf(f)} (${f.then_years?.[0]}–${f.then_years?.[1]} vs ${f.now_years?.[0]}–${f.now_years?.[1]}). `
    + `${f.significance_label} (${f.p_label}). Switch the years analyzed to see how much evidence a trend needs.`
}

// The comparison is shown only when it belongs to the chosen place and period; otherwise "loading".
export function comparison(compare, comparePlace, period, key) {
  const ready = Boolean(comparePlace) && compare?.place === comparePlace && compare?.period === period
  const factor = ready && compare.report.factors?.[key]?.available ? compare.report.factors[key] : null
  return { ready, factor }
}

export const compareOptions = (places, comparePlace) => (comparePlace && !places.includes(comparePlace) ? [...places, comparePlace] : places)

// Everything the report page needs, in one view model.
export function presentReport(report, { selected = null, focus = null } = {}) {
  const keys = cardKeys(report)
  const location = report?.location
  const place = location?.name || 'Your selected location'
  const overall = STATUS[report?.overall] ? report.overall : null
  const trendOnly = keys.filter((key) => !report.factors[key].level).length
  return {
    place,
    placeName: place.split(',')[0],
    years: report?.period?.length === 2 ? `${report.period[0]}–${report.period[1]}` : '',
    span: report?.period?.length === 2 ? { first: report.period[0], last: report.period[1] } : null,
    point: Number.isFinite(location?.lat) && Number.isFinite(location?.lon) ? { lat: location.lat, lon: location.lon } : null,
    headline: headline(report, keys),
    benchmark: overall ? `Against US benchmarks today: ${STATUS[overall]}${trendOnly > 0 ? `, ${trendOnly} cards trend only` : ''}.` : '',
    profile: profileText(report?.user),
    ageGroup: report?.user?.age_groups?.[0] || report?.user?.age_group,
    keys,
    open: openCard(report, selected, keys),
    caseFinding: focus ? caseFinding(report, focus) : '',
    missing: missingCards(report),
    notable: notableYears(report, keys),
    actions: rankedActions(report, keys),
    isSample: Boolean(report?._WARNING),
  }
}
