import { describe, expect, it } from 'vitest'
import { kindIcon, nextActive, rowText, splitMatch, splitName, suggestionView, townOf } from './search'

describe('search presenter', () => {
  it('finds the typed text inside a suggestion, ignoring case', () => {
    expect(splitMatch('Spokane County', 'spok')).toEqual(['', 'Spok', 'ane County'])
    expect(splitMatch('White House', 'house')).toEqual(['White ', 'House', ''])
    expect(splitMatch('Boise', 'denver')).toBeNull()
  })

  it('wraps the highlighted row both ways', () => {
    expect(nextActive(-1, 1, 3)).toBe(0)
    expect(nextActive(2, 1, 3)).toBe(0)
    expect(nextActive(-1, -1, 3)).toBe(2)
    expect(nextActive(0, -1, 3)).toBe(2)
    expect(nextActive(0, 1, 0)).toBe(-1)
  })

  it('splits a place into its name and the rest', () => {
    expect(splitName('Spokane, Washington')).toEqual({ main: 'Spokane', rest: 'Washington' })
    expect(splitName('Boise')).toEqual({ main: 'Boise', rest: '' })
  })

  it('shows only results for the current text, and nothing for what a pick wrote', () => {
    const result = { query: 'spok', items: [{ name: 'Spokane, Washington' }], error: '' }
    expect(suggestionView({ query: 'spok ', picked: '', open: true, result })).toMatchObject({ show: true, loading: false })
    expect(suggestionView({ query: 'spoka', picked: '', open: true, result })).toMatchObject({ show: false, loading: true, items: [] })
    expect(suggestionView({ query: 'sp', picked: '', open: true, result })).toMatchObject({ show: false, loading: false })
    expect(suggestionView({ query: 'Spokane, Washington', picked: 'Spokane, Washington', open: true, result }).loading).toBe(false)
    expect(suggestionView({ query: 'spok', picked: '', open: false, result }).show).toBe(false)
    const failed = { query: 'spok', items: [], error: 'Suggestions aren’t available right now.' }
    expect(suggestionView({ query: 'spok', picked: '', open: true, result: failed }).error).toMatch(/aren’t available/)
  })

  it('offers recent places in an empty box and nudges a partial ZIP code', () => {
    const recent = [{ name: 'Spokane, WA', main: 'Spokane', secondary: 'WA', kind: 'City' }]
    const empty = { query: '', items: [], error: '' }
    expect(suggestionView({ query: '  ', picked: '', open: true, result: empty, recent })).toMatchObject({ show: true, recent: true, items: recent })
    expect(suggestionView({ query: '', picked: '', open: false, result: empty, recent }).show).toBe(false)
    expect(suggestionView({ query: '981', picked: '', open: true, result: empty }).hint).toMatch(/5 digits/)
    expect(suggestionView({ query: '98101', picked: '', open: true, result: empty }).hint).toBe('')
  })

  it('uses the two lines the API sends, and an icon per kind of place', () => {
    expect(rowText({ name: '98101, Seattle, WA', main: '98101', secondary: 'Seattle, WA' })).toEqual({ main: '98101', rest: 'Seattle, WA' })
    expect(rowText({ name: 'Spokane, Washington' })).toEqual({ main: 'Spokane', rest: 'Washington' })
    expect([kindIcon('ZIP code'), kindIcon('State'), kindIcon('Small place')]).toEqual(['hash', 'map', 'map-pin'])
  })
})

describe('a spot picked on the map', () => {
  it('goes by its town, not its street (the report h1 read "Southwest Daisy Street")', () => {
    const spot = { name: '4152 38th Avenue Southwest, Seattle, WA', main: '4152 38th Avenue Southwest', secondary: 'Seattle, WA', kind: 'Picked spot', lat: 47.565, lon: -122.38 }
    expect(townOf(spot)).toEqual({ ...spot, name: 'Seattle, WA', main: 'Seattle', secondary: 'WA' })
    const rural = { name: 'County Road 12, WY', main: 'County Road 12', secondary: 'WY', kind: 'Picked spot' }
    expect(townOf(rural)).toBe(rural)                     // no town to name: keep what the geocoder gave
  })
})
