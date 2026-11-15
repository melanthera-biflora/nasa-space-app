import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// A tiny Web Storage stand-in (Vitest runs in Node, which has no sessionStorage).
function memoryStorage(seed = {}) {
  const data = new Map(Object.entries(seed))
  return {
    data,
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => { data.set(k, String(v)) },
    removeItem: (k) => { data.delete(k) },
  }
}
const blocked = () => ({ getItem: () => { throw new Error('SecurityError') }, setItem: () => { throw new Error('QuotaExceededError') } })

let session, local
beforeEach(() => {
  vi.resetModules()                      // each module keeps its last read in memory: start every test clean
  session = memoryStorage()
  local = memoryStorage()
  vi.stubGlobal('sessionStorage', session)
  vi.stubGlobal('localStorage', local)
})
afterEach(() => { vi.unstubAllGlobals() })

describe('the household stays in this tab (SPEC A3, D25)', () => {
  const people = [{ age: '65 and older', conditions: ['heart', 'other'], otherText: 'my own words', answer: null }]

  it('is saved under one sessionStorage key and nowhere else', async () => {
    const { saveHousehold } = await import('./household')
    saveHousehold(people)
    expect([...session.data.keys()]).toEqual(['climatch.household'])
    expect(JSON.parse(session.data.get('climatch.household'))).toEqual(people)
    expect(local.data.size).toBe(0)
  })

  it('saves nobody as an empty list', async () => {
    const { saveHousehold } = await import('./household')
    saveHousehold(null)
    expect(session.data.get('climatch.household')).toBe('[]')
  })

  it('keeps going when storage is blocked or missing', async () => {
    vi.stubGlobal('sessionStorage', blocked())
    const { saveHousehold } = await import('./household')
    expect(() => saveHousehold(people)).not.toThrow()
    vi.stubGlobal('sessionStorage', undefined)
    expect(() => saveHousehold(people)).not.toThrow()
    expect(local.data.size).toBe(0)       // no fallback to storage that outlives the tab
  })
})

describe('recent places', () => {
  const place = (name, extra = {}) => ({ name, main: name, secondary: 'WA', kind: 'City', lat: 47.66, lon: -117.43, ...extra })
  const saved = () => JSON.parse(session.data.get('climatch.recent'))

  it('keeps only the place fields, in sessionStorage only', async () => {
    const { rememberPlace } = await import('./recentPlaces')
    rememberPlace(place('Spokane, WA', { household: [{ conditions: ['asthma'] }], otherText: 'x', extent: [1, 2, 3, 4], region: 'WA' }))
    expect(Object.keys(saved()[0]).sort()).toEqual(['extent', 'kind', 'lat', 'lon', 'main', 'name', 'region', 'secondary'])
    expect([...session.data.keys()]).toEqual(['climatch.recent'])
    expect(local.data.size).toBe(0)
  })

  it('lists the newest first, once each, at most five', async () => {
    const { rememberPlace } = await import('./recentPlaces')
    for (const n of ['A', 'B', 'C', 'D', 'E', 'F', 'B']) rememberPlace(place(n))
    expect(saved().map((p) => p.name)).toEqual(['B', 'F', 'E', 'D', 'C'])
  })

  it('starts a fresh list when what is stored is not JSON', async () => {
    session.data.set('climatch.recent', '{not json')
    const { rememberPlace } = await import('./recentPlaces')
    expect(() => rememberPlace(place('Boise, ID'))).not.toThrow()
    expect(saved().map((p) => p.name)).toEqual(['Boise, ID'])
  })

  it('does not throw when storage is blocked', async () => {
    vi.stubGlobal('sessionStorage', blocked())
    const { rememberPlace } = await import('./recentPlaces')
    expect(() => rememberPlace(place('Boise, ID'))).not.toThrow()
  })
})
