import { describe, expect, it } from 'vitest'
import { compoundRows, exceedRows, headline, linkRows, monthOf, pairSeries, signRows, web, winterRows } from './patterns'

const DATA = {
  place: { kind: 'state', code: 'CA', name: 'California' }, relations_tested: 21,
  labels: { smoke_days: 'Smoke days', water_storage: 'Water storage (ground, soil, snow)', pm25: 'Fine particle pollution (PM2.5)', aod: 'Haze' },
  relations: [
    { a: 'smoke_days', b: 'water_storage', lag: 2, r: -0.5, q: 0.001, clear: true, same_source: false, sentence: 's1',
      lead_hits: { cases: 30, hits: 9, rate: 0.3, chance: 0.1, lift: 3, p: 0.004, clear: true } },
    { a: 'pm25', b: 'aod', lag: 0, r: 0.8, q: 0, clear: true, same_source: true, sentence: 's2' },
    { a: 'pm25', b: 'water_storage', lag: 1, r: 0.05, q: 0.6, clear: false, same_source: false, sentence: 's3' },
  ],
  warnings: [
    { key: 'smoke_days', label: 'Smoke days', exceedance: { early_years: [2006, 2015], late_years: [2016, 2025], years: { 2006: 0.1, 2025: 0.5 }, first: 0.1, last: 0.41, p: 0.01, clear: true },
      signs: { window_years: 10, ends: ['2015-12', '2025-12'], variance: { first: 1, last: 2, tau: 0.8, rising: true, values: [1, 2] }, memory: { first: 0.2, last: 0.2, tau: 0, rising: false, values: [0.2, 0.2] } } },
    { key: 'aod', label: 'Haze', exceedance: { years: { 2001: 0.1 }, first: 0.1, last: 0.14, p: 0.4, clear: false }, signs: null },
  ],
  compound: [{ id: 'hot_dry', label: 'Hot and dry months', counts: { 2001: 0, 2002: 2 }, total: 2, slope_per_decade: 0, p: 0.8, clear: false }],
}

describe('patterns presenter', () => {
  it('shows clear cross-dataset links by default and the rest on request', () => {
    expect(linkRows(DATA).map((r) => r.id)).toEqual(['smoke_days|water_storage'])
    expect(linkRows(DATA, { sameSource: true, unclear: true })).toHaveLength(3)
    const [r] = linkRows(DATA)
    expect(r).toMatchObject({ nameA: 'Smoke', nameB: 'Water storage', when: '2 mo later', together: false, strength: 0.5 })
    expect(r.hits.text).toMatch(/in its lowest 10% 2 months later 9 times out of 30\. Chance alone gives about 3\./)
  })

  it('counts records and clear cross-dataset links in the lede', () => {
    expect(headline(DATA)).toMatch(/^4 records compared month by month, 21 pairs in all\. 1 pair from different datasets/)
    expect(headline({})).toMatch(/too few records/)
  })

  it('places each linked record once on the ring and draws one edge per link', () => {
    const w = web(linkRows(DATA, { sameSource: true }))
    expect(w.nodes.map((n) => n.key).sort()).toEqual(['aod', 'pm25', 'smoke_days', 'water_storage'])
    expect(w.edges).toHaveLength(2)
    expect(w.edges[0].d).toMatch(/^M[\d.]+,[\d.]+ Q/)
  })

  it('sorts "more extremes" by how much the rate grew, in months out of 10', () => {
    const rows = exceedRows(DATA)
    expect(rows.map((r) => r.key)).toEqual(['smoke_days', 'aod'])
    expect(rows[0].text).toBe('1.0 → 4.1 in 10')
    expect(rows[0].span).toBe('2006–2015 vs 2016–2025')
    expect(rows[0].years).toEqual([{ year: 2006, value: 1 }, { year: 2025, value: 5 }])
  })

  it('splits signs of change into rising and steady, and words compound extremes', () => {
    const s = signRows(DATA)
    expect(s.rising.map((r) => r.key)).toEqual(['smoke_days'])
    expect(compoundRows(DATA)[0].text).toBe('2 such months since 2001; no clear change over time.')
  })

  it('draws the pair from the API: months become fractional years and gaps are left out', () => {
    const [a, b] = pairSeries({ months: [{ month: '2005-07', a: 1.2, b: null }, { month: '2005-08', a: 0.4, b: -0.3 }] })
    expect(a).toEqual([{ year: 2005.5, value: 1.2 }, { year: 2005.583, value: 0.4 }])
    expect(b).toEqual([{ year: 2005.583, value: -0.3 }])
    expect(monthOf(2005 + 6 / 12)).toBe('Jul 2005')
    expect(pairSeries(null)).toEqual([[], []])
  })
})

describe('El Niño and La Niña winters', () => {
  const winters = {
    first: 2002, last: 2005,
    winters: [{ year: 2002, phase: 'neutral', index: 0 }, { year: 2003, phase: 'el_nino', index: 0.9 }, { year: 2004, phase: 'la_nina', index: -1 }, { year: 2005, phase: 'la_nina', index: -0.7 }],
    records: [{ key: 'precip', label: 'Rain and snow', unit: 'mm/day',
      values: [{ year: 2002, phase: 'neutral', value: 0 }, { year: 2003, phase: 'el_nino', value: 2 }, { year: 2004, phase: 'la_nina', value: -1 }, { year: 2005, phase: 'la_nina', value: -0.5 }],
      phases: [{ phase: 'la_nina', n: 2, above: 0, below: 2, diff: -1, p: 0.01, q: 0.02, clear: true, sentence: 'Rain and snow: below...' }] }],
  }
  it('puts each winter in its lane on a scale centred on a usual winter, with the API sentences', () => {
    const w = winterRows({ ...DATA, winters })
    expect(w).toMatchObject({ first: 2002, last: 2005, total: 4, elNino: 1, laNina: 2 })
    const [r] = w.rows
    expect(r).toMatchObject({ key: 'precip', name: 'Rain and snow', unit: 'mm/day', clear: true })
    expect(r.lanes.map((l) => l.label)).toEqual(['El Niño', 'Neither', 'La Niña'])
    expect(r.lanes[0].dots[0]).toMatchObject({ year: 2003, at: 96 })      // the furthest winter sits at the edge
    expect(r.lanes[1].dots[0].at).toBe(50)                                 // a usual winter in the middle
    expect(r.sentences[0].text).toBe('Rain and snow: below...')
  })
  it('leaves the section out when the API sent no winters', () => {
    expect(winterRows(DATA)).toBe(null)
    expect(winterRows({ ...DATA, winters: { ...winters, records: [] } })).toBe(null)
  })
})
