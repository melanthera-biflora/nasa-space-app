import { describe, expect, it } from 'vitest'
import { aboutRecords, caseLine, householdLine, neverHappened, quality, QUALITY, realWords, recordDetail, recordRow, summary, themes, topActions, topCards } from './reportView'

const f = (key, label, extra = {}) => ({
  key, label, available: true, constant: false, unit_short: 'days', then: 10, now: 20, then_years: [2001, 2005], now_years: [2021, 2025],
  trend_direction: 'no_clear_trend', significant: false, slope_per_decade: 1, points: [{ year: 2001, value: 9 }, { year: 2002, value: null }],
  story: { happened: `${label}: 10 then, 20 now.`, why_it_matters: 'It matters.', is_it_real: 'Trend +1 per decade (95% CI 0 to 2), Mann-Kendall p = 0.3.' },
  ...extra,
})
const REPORT = {
  period: [2001, 2025],
  user: { conditions: ['asthma_copd'], age_groups: ['65_plus'] },
  card_order: ['pm25', 'hot_days', 'smoke_days', 'no2', 'frost_days', 'mystery'],
  factors: {
    pm25: f('pm25', 'Fine particle pollution (PM2.5)', { trend_direction: 'worsening', significant: true, priority_for_user: true, level: 'caution', unit_short: 'µg/m³' }),
    hot_days: f('hot_days', 'Very hot days', { priority_for_user: true }),
    smoke_days: f('smoke_days', 'Smoke days', { trend_direction: 'worsening', significant: true }),
    no2: f('no2', 'Nitrogen dioxide (NO₂)', { trend_direction: 'improving', significant: true, slope_per_decade: -1 }),
    frost_days: f('frost_days', 'Frost days', { constant: true }),
    mystery: f('mystery', 'Something new'),
    gone: { key: 'gone', label: 'Gone', available: false, reason: 'no data' },
  },
  actions: [{ factor: 'hot_days', label: 'Heat' }, { factor: 'no2', label: 'Air' }, { factor: 'smoke_days', label: 'Smoke' }, { factor: 'pm25', label: 'PM' }],
}

describe('friendlier report presenter (A5)', () => {
  it('says in one sentence what clearly changed, with the records behind it and the rest', () => {
    const s = summary(REPORT)
    expect(s.sentence).toBe('In 25 years, 2 things clearly got worse and 1 got better here.')
    expect(s.chips.map((c) => c.key)).toEqual(['pm25', 'smoke_days', 'no2'])
    expect(s.rest).toBe(2)                                            // hot days and the new record; frost never varied
    expect(summary({ period: [2016, 2025], factors: { a: f('a', 'A') } }).sentence).toBe('In 10 years, nothing here changed clearly.')
  })

  it('puts what clearly got worse first (household priorities before others), then priorities, in up to 3 cards', () => {
    expect(topCards(REPORT).map((c) => c.key)).toEqual(['pm25', 'smoke_days', 'hot_days'])
    // a priority that improved no longer pushes out a record that clearly got worse (round 3: New York)
    const better = { ...REPORT, factors: { ...REPORT.factors, no2: { ...REPORT.factors.no2, priority_for_user: true } } }
    expect(topCards(better, 2).map((c) => c.key)).toEqual(['pm25', 'smoke_days'])
    expect(householdLine(REPORT, topCards(REPORT))).toBe('For adults 65+ with asthma or COPD, fine particles (PM2.5) and very hot days matter most.')
  })

  it('keeps every available record, grouped by theme in a fixed order', () => {
    const groups = themes(REPORT)
    expect(groups.map((g) => g.id)).toEqual(['heat', 'air', 'other'])
    expect(groups.flatMap((g) => g.rows.map((r) => r.key)).sort()).toEqual(['frost_days', 'hot_days', 'mystery', 'no2', 'pm25', 'smoke_days'])
  })

  it('shows at most two numbers per record, plus words for direction, sureness and the level', () => {
    const row = recordRow(REPORT.factors.pm25)
    const numbers = Object.values(row).filter((v) => typeof v === 'string' && /^\d/.test(v) && !/–/.test(v))
    expect(numbers).toEqual(['10', '20'])
    expect(row.verdict).toMatchObject({ text: 'Clearly worse', tone: 'up', arrow: 'trend-up' })
    expect(row.level).toBe('Caution')
    expect(recordRow(REPORT.factors.no2).verdict.text).toBe('Clearly better')
    const counts = recordRow({ ...REPORT.factors.pm25, unit_short: 'days', then: 4.4, now: 24.2 })
    expect([counts.then, counts.now]).toEqual(['4', '24'])   // counts are whole numbers, as in the sentence below them
    expect(recordRow({ ...REPORT.factors.pm25, period: [2011, 2025] }, 2001).since).toBe('since 2011')   // a record that starts late says so
    expect(recordRow(REPORT.factors.pm25, 2001).since).toBe('')
    expect(recordRow({ ...REPORT.factors.pm25, unit_short: 'days', then: 0, now: 1 }).unit).toBe('day')   // not "1 days"
    expect(recordRow(REPORT.factors.frost_days).verdict.text).toBe('No change')
    expect(recordRow(REPORT.factors.hot_days).verdict).toMatchObject({ text: 'No clear change yet', arrow: 'minus', why: expect.stringMatching(/ups and downs/) })
  })

  it('opens a record with plain words: no test names, intervals or rates', () => {
    const d = recordDetail(REPORT.factors.hot_days)
    expect(d.sentences).toHaveLength(3)
    expect(d.sentences.join(' ')).not.toMatch(/Mann-Kendall|p =|CI|per decade|significant/)
    expect(d.points).toHaveLength(1)                                  // years without a value are left out
    expect(d.marks.map((m) => m.label)).toEqual(['2001–05 average', '2021–25 average'])
  })

  it('offers actions for what got worse first, and words the case file plainly', () => {
    expect(topActions(REPORT).map((a) => a.factor)).toEqual(['pm25', 'smoke_days', 'hot_days'])   // worse first, in the household's order
    expect(caseLine(REPORT, 'pm25')).toMatch(/^Fine particles \(PM2\.5\): 10 → 20 µg\/m³ \(2001–05 vs 2021–25\)\. Clearly worse\./)
    expect(caseLine(REPORT, 'gone')).toMatch(/isn’t available/)
  })
})

describe('how sure, in words (from the leave-one-year-out check the report already runs)', () => {
  const base = { significant: true, constant: false }
  it('says a clear change holds without any single year, or names the year it hangs on', () => {
    expect(realWords({ ...base, leave_one_out: { clear: true, flips: [] } })).toMatch(/holds without any single year/)
    expect(realWords({ ...base, leave_one_out: { clear: true, flips: [2021] } })).toMatch(/hangs on 2021: without it, it would not be clear/)
    expect(realWords({ ...base, leave_one_out: { clear: true, flips: [2020, 2021] } })).toMatch(/hangs on 2020 and 2021: without one of them/)
  })
  it('keeps the plain not-clear sentence', () => {
    expect(realWords({ significant: false, leave_one_out: { clear: false, flips: [] } })).toMatch(/^Not clear yet/)
  })
})

describe('what kind of data each record is (the quality badge)', () => {
  it('says model or satellite, the grid size and the years, from one table', () => {
    expect(quality({ key: 'hot_days', period: [2001, 2025] })).toBe('Model estimate · 50 km · 2001–2025')
    expect(quality({ key: 'surface_heat_5km', period: [2001, 2022] })).toBe('Satellite · 5 km · 2001–2022')
    expect(quality({ key: 'water_storage', period: [2003, 2025] })).toBe('Gravity satellites · 300 km · 2003–2025')
    expect(quality({ key: 'mystery', period: [2001, 2025] })).toBe('')              // never an invented badge
    expect(recordRow({ ...REPORT.factors.hot_days, period: [2001, 2025] }).quality).toBe('Model estimate · 50 km · 2001–2025')
  })
  it('covers every record the report themes list', () => {
    const themed = ['hot_days', 'warm_nights', 'humid_heat_days', 'muggy_days', 'cold_days', 'frost_days', 'heavy_rain_days', 'wettest_day',
      'rain_sat', 'dry_days', 'smoke_days', 'pm25', 'aod', 'no2', 'fires', 'surface_heat', 'heat_island', 'surface_heat_5km', 'water_storage']
    expect(themed.filter((k) => !QUALITY[k])).toEqual([])
  })
})

describe('records that never happened here', () => {
  const zero = (key, label) => f(key, label, { constant: true, then: 0, now: 0 })
  const report = { ...REPORT, card_order: [...REPORT.card_order, 'cold_days', 'muggy_days'],
    factors: { ...REPORT.factors, cold_days: zero('cold_days', 'Very cold nights'), muggy_days: zero('muggy_days', 'Muggy days') } }
  it('merges them into one line instead of a "0 → 0, no change" row each', () => {
    expect(neverHappened(report)).toBe('Never happened here in 2001–2025: very cold nights and muggy days.')
    const keys = themes(report).flatMap((g) => g.rows.map((r) => r.key))
    expect(keys).not.toContain('cold_days')
    expect(keys).toContain('frost_days')                                         // the same every year, but not zero: still a row
    expect(neverHappened(REPORT)).toBe('')
  })
})

describe('the household records on /about', () => {
  it('lists every record in theme order with its name, badge, definition and source', () => {
    const r = { period: [2001, 2025], factors: {
      pm25: { ...f('pm25', 'Fine particle pollution (PM2.5)'), period: [2001, 2025], definition: 'Tiny particles.', data_source: 'NASA MERRA-2' },
      hot_days: { ...f('hot_days', 'Very hot days'), period: [2001, 2025], definition: 'Days of 35 °C or more.', data_source: 'NASA POWER' },
      gone: { key: 'gone', label: 'Gone', available: false },
    } }
    expect(aboutRecords(r)).toEqual([
      { key: 'hot_days', name: 'Very hot days', quality: 'Model estimate · 50 km · 2001–2025', definition: 'Days of 35 °C or more.', source: 'NASA POWER' },
      { key: 'pm25', name: 'Fine particles (PM2.5)', quality: 'Model estimate · 50 km · 2001–2025', definition: 'Tiny particles.', source: 'NASA MERRA-2' },
    ])
  })
})
