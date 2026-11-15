import { describe, expect, it } from 'vitest'
import { barAt, cardScales, changes, compareRows, everywhere, groupCities, judge, limitOptions, metaByKey, RULE, scatterNote, scatterPoints, thenNow, topicsFor, verdict } from './compare'

const cell = (now, p = 0.5, clear = false, slope = 1, last5 = [now - 2, now - 1, now, now + 1, now + 2]) =>
  ({ now, then: now - 5, slope_per_decade: slope, p, clear, last5: last5.map((v, i) => ({ year: 2021 + i, value: v })) })
const meta = metaByKey({ factors: [
  { key: 'hot_days', label: 'Very hot days', unit_short: 'days', caution_from: 30, high_from: 60 },
  { key: 'warm_nights', label: 'Warm nights', unit_short: 'nights', caution_from: 30, high_from: 90 },
  { key: 'pm25', label: 'Fine particles (PM2.5)', unit_short: 'µg/m³', caution_from: 9, high_from: 15 },
  { key: 'no2', label: 'Nitrogen dioxide', unit_short: '×10¹⁵' },
] })
const city = (name, lat, lon, f) => ({ name, state: 'XX', lat, lon, factors: f })
const table = { cities: [
  city('Cooltown', 45, -93, { hot_days: cell(5), warm_nights: cell(2), pm25: cell(8, 0.01, true, -0.5), no2: cell(2, 0.001, true, -1) }),
  city('Hotville', 33, -112, { hot_days: cell(140), warm_nights: cell(93, 0.005, true, 7.5), pm25: cell(10), no2: cell(3, 0.001, true, -1) }),
  city('Smokeburg', 47, -117, { hot_days: cell(12), warm_nights: cell(4), pm25: cell(9, 0.001, true, 3.8), no2: cell(1, 0.001, true, -0.2) }),
] }
const chosen = [{ topic: 'heat_day', limit: 30 }, { topic: 'heat_night', limit: 30 }, { topic: 'smoke', limit: 'not_rising' }]

describe('topics for a household', () => {
  it('pre-fills from ages and conditions, each topic once', () => {
    expect(topicsFor([{ age: '65 and older', conditions: ['heart'] }, { age: 'Children (0–12)', conditions: ['asthma'] }]))
      .toEqual(['heat_day', 'heat_night', 'smoke'])
    expect(topicsFor([])).toEqual(['heat_day', 'heat_night', 'smoke'])
  })
  it('offers limit presets from the report cutoffs, and smoke as a trend only', () => {
    expect(limitOptions({ factor: 'hot_days' }, meta).map((o) => o.value)).toEqual([30, 60])
    expect(limitOptions({ factor: 'pm25', trendOnly: true }, meta)).toEqual([{ value: 'not_rising', label: 'not clearly rising' }])
  })
})

describe('grouping', () => {
  it('groups by limits met, most first, with no score', () => {
    const groups = groupCities(table, chosen, meta)
    expect(groups.map((g) => [g.met, g.cities.map((c) => c.city.name)])).toEqual([[3, ['Cooltown']], [2, ['Smokeburg']], [1, ['Hotville']]])
    expect(groups[0].title).toBe('Under all 3 of your limits')
  })
  it('words a single limit naturally', () => {
    const g = groupCities(table, [{ topic: 'heat_day', limit: 30 }], meta)
    expect(g.map((x) => x.title)).toEqual(['Under your limit', 'Over your limit'])
  })
  it('lists a group by distance from the starting place when there is one', () => {
    const two = { cities: [table.cities[0], { ...table.cities[2], name: 'Coolcity', factors: table.cities[0].factors, lat: 44.9, lon: -93.1 }] }
    const g = groupCities(two, chosen, meta, { lat: 44.98, lon: -93.27 })
    expect(g[0].cities.map((c) => c.city.name)).toEqual(['Coolcity', 'Cooltown'])
  })
  it('spells out misses with the last five years', () => {
    const j = judge(table.cities[1], chosen, meta)
    expect(j.lines[0].text).toBe('Heat by day: 140 very hot days a year, over your limit of 30. 0 of the last 5 years were under it.')
    const close = judge(city('Edge', 0, 0, { hot_days: cell(31) }), [{ topic: 'heat_day', limit: 30 }], meta)
    expect(close.lines[0].text).toMatch(/1 of the last 5 years was under it\.$/)   // 29, 30, 31, 32, 33 vs under 30
    expect(j.lines[2].text).toMatch(/^Smoke and fine particles: no clear trend yet/)
  })
})

describe('comparing places', () => {
  it('compares every place with the anchor in less/more words, never ranking words', () => {
    expect(verdict([table.cities[0], table.cities[1]], chosen, meta)).toEqual(['Compared with Cooltown, Hotville has more heat by day and heat at night.'])
    const a = city('Dryton', 40, -100, { hot_days: cell(12), warm_nights: cell(25) })
    const b = city('Bayside', 40, -80, { hot_days: cell(20), warm_nights: cell(10) })
    const c = city('Coolville', 40, -90, { hot_days: cell(5), warm_nights: cell(5) })
    const two = [{ topic: 'heat_day', limit: 30 }, { topic: 'heat_night', limit: 30 }]
    expect(verdict([a, b], two, meta)).toEqual(['Compared with Dryton, Bayside has less heat at night but more heat by day.'])
    // a third and fourth place are never dropped; the starting place is the anchor when it is in the comparison
    expect(verdict([a, b, c], two, meta, 'Bayside')).toEqual([
      'Compared with Bayside, Dryton has less heat by day but more heat at night.',
      'Compared with Bayside, Coolville has less of both things you chose.',
    ])
    expect(verdict([a, { ...a, name: 'Twin' }], two, meta)).toEqual(['Twin is about the same as Dryton on both things you chose.'])
  })
  it('marks the rows that differ and lists what changed', () => {
    const rows = compareRows([table.cities[0], table.cities[1]], chosen, meta)
    // "differs" means the trend words differ (rounded numbers almost always differ, so the filter hid nothing)
    expect(rows[0]).toMatchObject({ key: 'hot_days', chosen: true, differs: false })
    expect(rows.find((r) => r.key === 'warm_nights').differs).toBe(true)
    expect(rows.find((r) => r.key === 'no2').differs).toBe(false)
    expect(rows.find((r) => r.key === 'no2').chosen).toBe(false)
    expect(changes(table.cities[1], chosen, meta)[1]).toBe('Heat at night: Rising, 88 → 93 nights')
  })
  it('builds scatter dots with whether each trend is clear, and says when no city has one', () => {
    const pts = scatterPoints(table, 'hot_days', { Hotville: 2 })
    expect(pts.map((p) => [p.name, p.clear, p.misses])).toEqual([['Cooltown', false, 0], ['Hotville', false, 2], ['Smokeburg', false, 0]])
    expect(scatterNote(pts, 'very hot days')).toMatch(/^No city has a clear trend in very hot days yet/)
    expect(scatterNote(scatterPoints(table, 'no2'), 'NO₂')).toBe('')
    const gap = { cities: [city('Gap', 1, 1, { hot_days: { ...cell(5), slope_per_decade: null } })] }
    expect(scatterPoints(gap, 'hot_days')).toEqual([])            // no slope: no dot (it was drawn at 0)
  })
  it('notes facts that are true almost everywhere', () => {
    expect(everywhere(table, meta)).toEqual(['Nitrogen dioxide fell clearly in 3 of 3 cities.'])
  })
})

describe('bars on the city cards', () => {
  it('gives each line then, now, the unit, the trend word and the limit it is judged against', () => {
    const { lines } = judge(table.cities[1], chosen, meta)
    expect(lines[1]).toMatchObject({ then: 88, value: 93, unit: 'nights', clear: true, word: 'Rising', limit: 30, ok: false })
    expect(lines[2]).toMatchObject({ limit: null, word: 'No clear trend yet' })          // smoke: a trend, no level limit
  })
  it('shares one scale per topic across every city, from zero for counts, with the limit in view', () => {
    const s = cardScales(table, chosen)
    expect(s.heat_day.lo).toBe(0)
    expect(s.heat_day.hi).toBeGreaterThanOrEqual(140)
    expect(s.smoke.lo).toBeGreaterThan(0)                // a level, not a count: fitted
    expect(cardScales(table, [{ topic: 'heat_day', limit: 300 }]).heat_day.hi).toBeGreaterThanOrEqual(300)
  })
  it('places a value on the bar and flags one past the edge', () => {
    expect(barAt({ lo: 0, hi: 200 }, 50)).toEqual({ pos: 25, off: 0 })
    expect(barAt({ lo: 0, hi: 200 }, 260)).toEqual({ pos: 100, off: 1 })
  })
})

describe('then and now (the arrow plot)', () => {
  it('keeps the places in the order given, never sorted by value, one block per topic', () => {
    const t = thenNow([table.cities[1], table.cities[0]], chosen, meta)
    expect(t.map((b) => b.key)).toEqual(['hot_days', 'warm_nights', 'pm25'])
    expect(t[0].rows.map((r) => r.name)).toEqual(['Hotville', 'Cooltown'])
  })
  it('gives each row then, now, the last five years range, a trend word and the years under the limit', () => {
    const [heat, nights, smoke] = thenNow([table.cities[1], table.cities[0]], chosen, meta)
    expect(nights.rows[0]).toMatchObject({ then: 88, now: 93, lo: 91, hi: 95, clear: true, word: 'Rising', count: '0 of the last 5 years under your limit' })
    expect(heat.rows[0]).toMatchObject({ clear: false, word: 'No clear trend yet' })
    expect(heat.rows[1].count).toBe('5 of the last 5 years under your limit')
    expect(heat).toMatchObject({ limit: 30, lo: 0, hi: 142, unit: 'days' })     // zero, every value and the limit
    expect(smoke.limit).toBe(null)                                              // a trend-only topic has no level limit
    expect(smoke.rows[1]).toMatchObject({ word: 'Falling', count: '' })
  })
  it('names a place with no data instead of drawing it', () => {
    const [heat] = thenNow([city('Nowhere', 0, 0, {})], [{ topic: 'heat_day', limit: 30 }], meta)
    expect(heat.rows[0]).toMatchObject({ name: 'Nowhere', missing: true })
  })
})

it('never writes a score, rank, percentage or "best"', () => {
  const text = [RULE, ...groupCities(table, chosen, meta).flatMap((g) => [g.title, ...g.cities.flatMap((c) => c.lines.map((l) => l.text))]),
    verdict([table.cities[0], table.cities[1]], chosen, meta)].join(' ')
  expect(text).not.toMatch(/\bbest\b|\bscore|\brank|%|★/i)
})
