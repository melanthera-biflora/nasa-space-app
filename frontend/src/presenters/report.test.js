import { describe, expect, it } from 'vitest'
import { cardKeys, caseFinding, comparison, compareOptions, headline, missingCards, notableYears, presentReport, profileText, rankedActions } from './report'

const card = (key, extra = {}) => ({
  key, label: key.toUpperCase(), available: true, then: 1, now: 2, unit: 'days', then_years: [2001, 2005], now_years: [2021, 2025],
  slope_per_decade: 1, significance_label: 'Significant', p_label: 'p = 0.01', trend_direction: 'worsening', level: null, ...extra,
})

const report = {
  location: { lat: 33.45, lon: -112.07, name: 'Phoenix, Maricopa County, Arizona' },
  user: { conditions: ['heart_disease'], age_groups: ['65_plus'] },
  period: [2001, 2025],
  overall: 'caution',
  card_order: ['warm_nights', 'pm25', 'gone'],
  factors: {
    hot_days: card('hot_days', { trend_direction: 'no_clear_trend', level: 'caution' }),
    warm_nights: card('warm_nights'),
    pm25: card('pm25', { trend_direction: 'improving', slope_per_decade: -1 }),
    frost: card('frost', { constant: true, trend_direction: 'no_clear_trend' }),
    gone: { key: 'gone', label: 'Surface heat', available: false, reason: 'not enough years of data in this period' },
    sub: { key: 'sub', label: 'Muggy', available: false, parent: 'dry_days', reason: 'x' },
  },
  data_status: { power: 'ok', no2: 'not available', surface_heat: 'not available: not precomputed for this place' },
  notable_years: [{ year: 2020, factors: ['WARM_NIGHTS', 'Somewhere else'], text: '' }],
  actions: [{ factor: 'hot_days', label: 'Heat' }, { factor: 'pm25', label: 'Air' }, { factor: 'warm_nights', label: 'Nights' }],
}

describe('report presenter', () => {
  it('orders cards by household priority, then the rest, available only', () => {
    expect(cardKeys(report)).toEqual(['warm_nights', 'pm25', 'hot_days', 'frost'])
  })

  it('leads with what is getting worse and counts only cards that vary', () => {
    const h = headline(report)
    expect(h.count).toBe(1)
    expect(h.text).toBe('thing is getting worse')
    expect(h.list).toBe('Worse: WARM_NIGHTS · Better: PM25')
    expect(h.counts.map((c) => c.n)).toEqual([1, 1, 1])          // frost is constant: not counted
  })

  it('says "No clear trends yet" when nothing moved', () => {
    const calm = { ...report, factors: { a: card('a', { trend_direction: 'no_clear_trend' }) }, card_order: ['a'] }
    expect(headline(calm)).toMatchObject({ count: null, text: 'No clear trends yet' })
  })

  it('names missing cards and sources with their reason, but not sub-cards', () => {
    expect(missingCards(report)).toEqual([
      'Surface heat (not enough years of data in this period)',
      'Traffic pollution (NO₂) (no data here yet)',
      'Neighborhood surface heat (not precomputed for this place)',
    ])
  })

  it('describes the household in words', () => {
    expect(profileText(report.user)).toBe('Adults 65+ with heart disease')
    expect(profileText({ conditions: ['none'], age_groups: [] })).toBe('Your household')
    // a mixed household: the report only has the combined answers, so it never says everyone has every condition
    expect(profileText({ conditions: ['asthma_copd'], age_groups: ['65_plus', 'under_5'] })).toBe('Adults 65+ and young children (someone has asthma or COPD)')
  })

  it('links notable-year chips to cards that exist here', () => {
    expect(notableYears(report)).toEqual([{ year: 2020, chips: [{ label: 'WARM_NIGHTS', key: 'warm_nights' }, { label: 'Somewhere else', key: null }] }])
  })

  it('ranks actions by the household card order', () => {
    expect(rankedActions(report).map((a) => a.factor)).toEqual(['warm_nights', 'pm25', 'hot_days'])
  })

  it('writes the case finding from the report numbers', () => {
    expect(caseFinding(report, 'warm_nights')).toBe('WARM_NIGHTS: 1 → 2 days (2001–2005 vs 2021–2025). Significant (p = 0.01). Switch the years analyzed to see how much evidence a trend needs.')
    expect(caseFinding(report, 'gone')).toBe('This card isn’t available for this place.')
  })

  it('shows a comparison only for the chosen place and period', () => {
    const place = { name: 'Seattle' }
    const compare = { place, period: 25, report: { factors: { pm25: card('pm25') } } }
    expect(comparison(compare, place, 25, 'pm25').factor).toBeTruthy()
    expect(comparison(compare, place, 10, 'pm25')).toEqual({ ready: false, factor: null })     // still loading the new period
    expect(comparison(compare, place, 25, 'hot_days')).toEqual({ ready: true, factor: null })  // no such card there
    expect(compareOptions([place], { name: 'Square' })).toHaveLength(2)
  })

  it('builds one view model with the open card falling back to the first', () => {
    const vm = presentReport(report, { selected: 'gone' })
    expect(vm.placeName).toBe('Phoenix')
    expect(vm.years).toBe('2001–2025')
    expect(vm.point).toEqual({ lat: 33.45, lon: -112.07 })
    expect(vm.open.key).toBe('warm_nights')
    expect(vm.open.change).toEqual({ then: '1', now: '2', unit: 'days', years: '2001–05 vs 2021–25' })
    expect(vm.open.levelText).toBe('Trend only (no US health limit)')
    expect(vm.benchmark).toBe('Against US benchmarks today: Caution, 3 cards trend only.')
  })
})
