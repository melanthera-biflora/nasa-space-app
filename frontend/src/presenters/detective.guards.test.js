import { describe, expect, it } from 'vitest'
import { detectiveQuery, pLabel, readPlace, readRange, readVariable, readYears } from './detective'

// URL values are user input (frontend/AGENTS.md rule 12): what a tampered or hand-typed URL can reach.
describe('readPlace on a tampered URL', () => {
  it('accepts the edges of the US box and nothing past them', () => {
    for (const [lat, lon] of [[18, -100], [72, -150], [40, -65], [52, -180]]) expect(readPlace({ lat, lon })?.kind).toBe('point')
    for (const [lat, lon] of [[17.99, -100], [72.01, -150], [40, -64.99], [52, -180.01], [-40, 100]]) expect(readPlace({ lat, lon })).toBeNull()
  })

  it('needs both coordinates as finite numbers', () => {
    expect(readPlace({ lat: '43.07', lon: '-89.4' })).toBeNull()
    expect(readPlace({ lat: NaN, lon: -89.4 })).toBeNull()
    expect(readPlace({ lat: 43.07, lon: -Infinity })).toBeNull()
    expect(readPlace({ lat: 43.07, lon: null })).toBeNull()
    expect(readPlace({ lat: 43.07 })).toBeNull()
    expect(readPlace()).toBeNull()
  })

  it('reads a state only from exactly two letters, any case', () => {
    expect(readPlace({ region: 'tx' })).toEqual({ kind: 'state', code: 'TX' })
    for (const region of ['WIS', 'W', 'W1', ' WI', 'W I', '', 42, ['WI']]) expect(readPlace({ region })).toBeNull()
  })

  it('prefers a valid state over a point, and falls back to the point when the state is not valid', () => {
    expect(readPlace({ region: 'WI', lat: 30.27, lon: -97.74 })).toEqual({ kind: 'state', code: 'WI' })
    expect(readPlace({ region: 'W1', lat: 30.27, lon: -97.74 })).toMatchObject({ kind: 'point', lat: 30.27, lon: -97.74 })
  })

  it('rounds the point to about 1 km and caps the name at 120 characters', () => {
    const p = readPlace({ lat: 30.26715, lon: -97.74306, name: 'x'.repeat(500) })
    expect(p).toMatchObject({ lat: 30.27, lon: -97.74 })
    expect(p.name).toHaveLength(120)
    expect(readPlace({ lat: 30.27, lon: -97.74, name: null }).name).toBe('')
  })
})

describe('readVariable, readYears and readRange on a tampered URL', () => {
  it('falls back to PM2.5 for anything not on the place\'s list', () => {
    for (const v of [undefined, null, '', 'PM25', 'lava', '__proto__', 'constructor', 'toString']) {
      expect(readVariable({ kind: 'point' }, v)).toBe('pm25')
    }
    expect(readVariable({ kind: 'point' }, 't2m')).toBe('pm25')          // a state-only record on an address
    expect(readVariable(null, 'hot_days')).toBe('pm25')                  // no place: the state list
  })

  it('keeps only the preset periods, as integers', () => {
    expect([10, 15, 20, 25].map((y) => readYears(y, { kind: 'point' }, 'hot_days'))).toEqual([10, 15, 20, 25])
    for (const y of ['10', 10.5, NaN, null, undefined, 0, -25, 30, Infinity]) expect(readYears(y, { kind: 'point' }, 'hot_days')).toBe(25)
  })

  it('rejects a reversed, fractional, too-late or too-early From-To', () => {
    const point = { kind: 'point' }
    expect(readRange({ from: 2015, to: 2006 }, point, 'hot_days')).toBeNull()
    expect(readRange({ from: 2006.5, to: 2015 }, point, 'hot_days')).toBeNull()
    expect(readRange({ from: '2006', to: '2015' }, point, 'hot_days')).toBeNull()
    expect(readRange({ from: 2018, to: 2026 }, point, 'hot_days')).toBeNull()
    expect(readRange({ from: 2004, to: 2015 }, point, 'no2')).toBeNull()                 // NO₂ starts in 2005
    expect(readRange({ from: 2018, to: 2025 }, point, 'hot_days')).toEqual({ from: 2018, to: 2025 })   // exactly 8 years
    expect(readRange(undefined, point, 'hot_days')).toBeNull()
  })
})

describe('links between the detective pages', () => {
  it('carry only the place, the variable and the years, never the household', () => {
    const q = detectiveQuery({ lat: 47.66, lon: -117.43, name: 'Spokane', variable: 'pm25', years: 15,
      conditions: ['asthma_copd'], age_groups: ['under_5'], household: [{ age: '65 and older' }] })
    expect([...new URLSearchParams(q).keys()]).toEqual(['lat', 'lon', 'name', 'var', 'years'])
  })

  it('leave out the default period and an unnamed point\'s name', () => {
    expect(detectiveQuery({ region: 'WI', variable: 't2m', years: 25 })).toBe('?region=WI&var=t2m')
    expect(detectiveQuery({ lat: 43.07, lon: -89.4 })).toBe('?lat=43.07&lon=-89.4')
  })
})

it('words a p-value like the pipeline\'s p_label (analysis/trends.py)', () => {
  expect([0.0004, 0.001, 0.0123, 0.0999, 0.1, 0.456].map(pLabel))
    .toEqual(['p < 0.001', 'p = 0.001', 'p = 0.012', 'p = 0.100', 'p = 0.10', 'p = 0.46'])
})
