import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchEvents } from './events'
import { clearCache } from './http'
import { fetchStateOutline, reversePlace, searchLocation, suggestPlaces } from './location'
import { fetchPatternPair, fetchPatterns } from './patterns'
import { fetchRegionSeries } from './regions'
import { fetchReport, householdToQuery } from './report'
import { fetchMapFrames } from './trendField'

// Every request goes through http.js's one fetch: capture the URLs it asks for.
let urls, inits
beforeEach(() => {
  clearCache()
  urls = []
  inits = []
  vi.stubGlobal('fetch', vi.fn((url, init) => { urls.push(url); inits.push(init); return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([{ name: 'x', lat: 1, lon: 2 }]) }) }))
})
afterEach(() => { vi.unstubAllGlobals() })

const query = (url) => Object.fromEntries(new URL(url, 'http://x').searchParams)

describe('householdToQuery: health answers to backend keys (the one place, frontend/AGENTS.md rule 4)', () => {
  it('maps every health page condition to its conditions.json key', () => {
    const one = (c) => householdToQuery([{ age: 'Adults (18–64)', conditions: [c] }]).conditions
    expect(['asthma', 'heart', 'allergy', 'diabetes', 'kidney'].map(one))
      .toEqual([['asthma_copd'], ['heart_disease'], ['allergies'], ['diabetes'], ['kidney_disease']])
  })

  it('maps every health page age group to its conditions.json key', () => {
    const one = (age) => householdToQuery([{ age, conditions: [] }]).ages
    expect(['Children (0–12)', 'Teens (13–17)', 'Adults (18–64)', '65 and older'].map(one))
      .toEqual([['under_5'], ['5_17'], ['18_64'], ['65_plus']])
  })

  it('drops "other" and unknown answers, and counts a shared one once', () => {
    const q = householdToQuery([
      { age: '65 and older', conditions: ['heart', 'other', 'cancer'] },
      { age: '65 and older', conditions: ['heart', 'asthma'] },
    ])
    expect(q).toEqual({ conditions: ['heart_disease', 'asthma_copd'], ages: ['65_plus'] })
  })

  it('asks for the neutral household when nobody answered', () => {
    expect(householdToQuery()).toEqual({ conditions: ['none'], ages: ['18_64'] })
    expect(householdToQuery([])).toEqual({ conditions: ['none'], ages: ['18_64'] })
    expect(householdToQuery([{ age: 'Adults (18–64)', conditions: ['other'] }]).conditions).toEqual(['none'])
  })
})

describe('the report request', () => {
  const household = [{ age: 'Children (0–12)', conditions: ['asthma', 'other'], otherText: 'my own words', answer: 'not-sure' }]
  const location = { lat: 47.66, lon: -117.43, name: 'Spokane, WA' }

  const body = () => JSON.parse(inits[0].body)

  it('keeps the household out of the address: a POST with the point, the backend keys and the period in its body (D38)', async () => {
    await fetchReport({ household, location, period: 15 })
    expect(urls[0]).toBe('/api/v1/reports')
    expect(inits[0].method).toBe('POST')
    expect(body()).toEqual({ lat: 47.66, lon: -117.43, conditions: ['asthma_copd'], age_groups: ['under_5'], period: 15 })
  })

  it('never sends free text, the raw answers or the place name', async () => {
    await fetchReport({ household, location })
    for (const bit of ['own', 'words', 'not-sure', 'Children', 'other', 'Spokane']) expect(urls[0] + inits[0].body).not.toContain(bit)
  })

  it('adds start and end for a custom From-To', async () => {
    await fetchReport({ household: [], location, range: { from: 2006, to: 2015 } })
    expect(body()).toMatchObject({ start: 2006, end: 2015, conditions: ['none'], age_groups: ['18_64'] })
  })

  it('shares one answer between views asking for the same report and household', async () => {
    await Promise.all([fetchReport({ household, location }), fetchReport({ household, location })])
    await fetchReport({ household: [], location })
    expect(urls).toHaveLength(2)
  })
})

describe('other request URLs', () => {
  it('escapes path values so a tampered code cannot change the route', async () => {
    await fetchStateOutline('../reports', undefined)
    await fetchRegionSeries('W/I', 't2m', 25)
    await fetchMapFrames('pm25/../x')
    expect(urls).toEqual(['/api/v1/regions/..%2Freports/outline', '/api/v1/regions/W%2FI/series?variable=t2m&period=25',
      '/api/v1/maps/pm25%2F..%2Fx/frames'])
  })

  it('names a picked spot to about 10 m, not to the full precision of the click', async () => {
    await reversePlace(47.6601234, -117.4302987)
    expect(query(urls[0])).toEqual({ lat: '47.6601', lon: '-117.4303' })
  })

  it('asks for a state or a point, never both', async () => {
    await fetchEvents({ region: 'WI', lat: 43, lon: -89 })
    await fetchEvents({ lat: 43, lon: -89 })
    await fetchEvents({ lat: Number.NaN })
    await fetchPatterns({ region: 'WI', lat: 43, lon: -89 })
    await fetchPatternPair({ lat: 43, lon: -89 }, 'hot_days', 'rain_sat')
    expect(urls.map(query)).toEqual([{ region: 'WI' }, { lat: '43', lon: '-89' }, {}, { region: 'WI' },
      { lat: '43', lon: '-89', a: 'hot_days', b: 'rain_sat' }])
  })

  it('skips the request for blank or short typing', async () => {
    await expect(searchLocation('   ')).rejects.toThrow('Type an address, a city or a ZIP code.')
    expect(await suggestPlaces('  bo  ')).toEqual([])
    expect(urls).toEqual([])
    await suggestPlaces('  Boise  ')
    expect(query(urls[0])).toEqual({ q: 'Boise' })
  })
})
