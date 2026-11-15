import { describe, expect, it } from 'vitest'
import { activeSquare, chooseLayer, footnote, legend, readout, stepSquare, summary, viewOptions } from './trendMap'

// A 2 x 3 grid: row-major cells n = i * 3 + j
const field = {
  factor: 'pm25', label: 'Fine particle pollution (PM2.5)', unit: 'µg/m³', source: 'NASA MERRA-2',
  period: [2001, 2025], then_years: [2001, 2005], now_years: [2021, 2025],
  grid: { lats: [40, 40.5], lons: [-100, -99.375, -98.75], dlat: 0.5, dlon: 0.625 },
  breaks: [0.625, 1.25, 2.5, 5], level_breaks: [5, 6, 8],
  slope: [1.2, -0.4, null, 3, 0, 0.1], p: [0.0004, 0.2, null, 0.03, 0.9, 0.5],
  then: [5, 6, null, 4, 7, 7], now: [7.9, 5.5, null, 6, 7, 7.1],
  sig: [1, 0, 0, 1, 0, 0], fdr: [1, 0, 0, 0, 0, 0],
  summary: { cells: 5, rising_pct: 40, falling_pct: 0, rising_fdr_pct: 20, falling_fdr_pct: 0,
    strongest_rise: { lat: 40, lon: -100, slope_per_decade: 1.2, where: 'near Denver' }, strongest_fall: null },
}
const cell = (i, j, hasData = true) => ({ i, j, n: i * 3 + j, lat: field.grid.lats[i], lon: field.grid.lons[j], hasData })

describe('trend map presenter', () => {
  it('follows the open card when it has a map, keeps a manual pick for that card only', () => {
    expect(chooseLayer('no2', null)).toMatchObject({ key: 'no2', mapped: true })
    expect(chooseLayer('hot_days', null)).toMatchObject({ key: 'pm25', mapped: false, label: 'PM2.5' })
    expect(chooseLayer('pm25', { for: 'pm25', key: 'fires' }).key).toBe('fires')
    expect(chooseLayer('no2', { for: 'pm25', key: 'fires' }).key).toBe('no2')
  })

  it('reads the square under the pointer first, then the pinned one, then the address', () => {
    expect(activeSquare({ hover: cell(0, 0), pinned: cell(1, 0), here: cell(0, 1) }).kind).toBe('hover')
    expect(activeSquare({ hover: cell(0, 2, false), pinned: cell(1, 0), here: cell(0, 1) }).kind).toBe('pin')
    expect(activeSquare({ hover: null, pinned: null, here: cell(0, 1) }).kind).toBe('here')
  })

  it('writes the readout with the map-wide verdict', () => {
    const r = readout(field, { cell: cell(0, 0), kind: 'here' }, { hereName: 'Spokane', layerKey: 'pm25', hasHere: true })
    expect(r).toMatchObject({ title: "Spokane's square", where: '40.00°N, 100.00°W', change: '5 → 7.9 µg/m³', strong: true })
    expect(r.rate).toBe('+1.2 per decade · p < 0.001')
    expect(readout(field, { cell: cell(1, 0), kind: 'pin' }, { layerKey: 'pm25' }).verdict).toBe('Significant on its own, but not after the map-wide check')
    expect(readout(field, { cell: cell(0, 2, false), kind: 'pin' }, { layerKey: 'fires' }).empty).toMatch(/too few fires/)
    expect(readout(field, { cell: null }, { hasHere: true }).empty).toBe('This address is outside the lower 48 map.')
  })

  it('summarises the map in words for screen readers and the caption', () => {
    expect(summary(field, 'change')).toBe('Fine particle pollution (PM2.5), 2001–2025, lower 48 states, one square per NASA grid cell. '
      + 'Clearly rising over 20% of the area (strongest near Denver, +1.2 per decade), clearly falling over 0%.')
    expect(summary(field, 'now')).toMatch(/Showing the 2021–25 average; darker means higher\.$/)
    expect(footnote(field, 'pm25')).toMatch(/about 56 km across.*all 5 squares.*sea salt/)
  })

  it('builds a symmetric change legend and a level legend for then/now', () => {
    const change = legend(field, 'change')
    expect(change.classes).toHaveLength(9)
    expect(change.edges.map((e) => e.text)).toEqual(['−5', '−2.5', '−1.25', '−0.625', '+0.625', '+1.25', '+2.5', '+5'])
    expect(change.classes[0].range).toBe('below −5')
    expect(change.classes[8].range).toBe('+5 or more')
    const level = legend(field, 'then')
    expect(level).toMatchObject({ title: 'Average 2001–05 · µg/m³', ends: ['Lower', 'Higher'], showsClarity: false })
    expect(level.classes.map((c) => c.range)).toEqual(['below 5', '5 to 6', '6 to 8', '8 or more'])
    expect(viewOptions(field).map(([v]) => v)).toEqual(['change', 'then', 'now'])
  })

  it('steps one square per arrow key and stays on the grid', () => {
    expect(stepSquare(field, cell(0, 0), 'ArrowRight')).toEqual({ lat: 40, lon: -99.375 })
    expect(stepSquare(field, cell(0, 0), 'ArrowDown')).toEqual({ lat: 40, lon: -100 })      // already the bottom row
    expect(stepSquare(field, cell(0, 0), 'ArrowUp')).toEqual({ lat: 40.5, lon: -100 })
  })
})
