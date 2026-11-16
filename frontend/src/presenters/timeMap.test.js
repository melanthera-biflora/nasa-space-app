import { describe, expect, it } from 'vitest'
import { areaOf, caption, fadeFor, fieldsFor, frameField, frameLegend, lineLabel, meanLine, nextFrame, squareAt, squareText, switchArea, ticks, yearLabel } from './timeMap'

const FRAMES = {
  unit: 'days', grid: { lats: [40], lons: [-100, -99], dlat: 0.5, dlon: 1 }, level_breaks: [10, 20], change_breaks: [1, 2, 5, 10],
  years: [2008, 2009, 2010], span: 3, base_years: [2006, 2010],
  values: [[5, 12], [null, 30], [8, 25]], change: [[0, 2], [null, 20], [-3, 15]],
  us_mean: [16.2, null, 87.1], us_change: [0, null, 71],
}
const SINGLE = { ...FRAMES, span: 1, years: [2001, 2002, 2003], base_years: [2001, 2005] }

describe('animated map presenter', () => {
  it('hands paint() one frame: levels on the shared scale, or change with every square coloured', () => {
    expect(frameField(FRAMES, 1, 'level')).toEqual({ grid: FRAMES.grid, level_breaks: [10, 20], now: [null, 30] })
    expect(frameField(FRAMES, 2, 'change')).toEqual({ grid: FRAMES.grid, breaks: [1, 2, 5, 10], slope: [-3, 15], fdr: [true, true] })
  })

  it('labels a frame by the years it covers', () => {
    expect(yearLabel(FRAMES, 2)).toBe('2008–10')
    expect(yearLabel(SINGLE, 2)).toBe('2003')
  })

  it('fades the new year in faster at Fast speed, so most of each step shows only legend colours', () => {
    expect([1600, 1000, 550].map(fadeFor)).toEqual([300, 300, 150])
  })

  it('stops on the last year instead of looping', () => {
    expect(nextFrame(0, 3)).toBe(1)
    expect(nextFrame(2, 3)).toBeNull()
  })

  it('words the frame against the first one, or against the early years in the change view', () => {
    expect(caption(FRAMES, 2, 'smoke_days', 'level')).toBe('2008–10: across the lower 48, an average of 87.1 days of medium or thick smoke a year (16.2 in 2006–08).')
    expect(caption(SINGLE, 0, 'smoke_days', 'level')).toBe('2001: across the lower 48, an average of 16.2 days of medium or thick smoke a year.')
    expect(caption(FRAMES, 1, 'smoke_days', 'level')).toMatch(/no complete year/)
    expect(caption(FRAMES, 2, 'smoke_days', 'change')).toBe('2008–10: across the lower 48, 71 days of medium or thick smoke a year more than in 2006–10.')
    expect(caption(FRAMES, 0, 'smoke_days', 'change')).toBe('2006–08: across the lower 48, about the same days of medium or thick smoke a year as in 2006–10.')
  })

  it('draws the US average as a line scaled 0-1, skipping empty years; the change view keeps zero in range', () => {
    const line = meanLine(FRAMES, 2, 'level')
    expect(line.points).toEqual([{ x: 0, y: 0 }, { x: 1, y: 1 }])
    expect(line.current).toEqual({ x: 1, y: 1, text: '87.1' })
    expect(meanLine(FRAMES, 1, 'level').current).toBeNull()
    expect(meanLine(FRAMES, 0, 'change').zero).toBe(0)
    expect(meanLine(FRAMES, 2, 'change').current.text).toBe('+71')
  })

  it('puts a tick on every fifth year', () => {
    expect(ticks(FRAMES)).toEqual([{ year: 2010, at: 1 }])
  })

  it('gives one legend for every frame, levels or change', () => {
    const lg = frameLegend(FRAMES, 'level')
    expect(lg.classes.map((c) => c.k)).toEqual([0, 1, 2])
    expect(lg.edges.map((e) => e.text)).toEqual(['10', '20'])
    const ch = frameLegend(FRAMES, 'change')
    expect(ch.classes).toHaveLength(9)
    expect(ch.edges.map((e) => e.text)).toEqual(['−10', '−5', '−2', '−1', '+1', '+2', '+5', '+10'])
    expect(ch.title).toBe('Change from 2006–10 · days')
  })

  it('finds the square under the pointer and words it for the frame on screen', () => {
    expect(squareAt(FRAMES, 40.1, -99.1)).toMatchObject({ i: 0, j: 1, n: 1, lat: 40, lon: -99 })   // i, j: arrow keys step from here
    expect(squareAt(FRAMES, 45, -99)).toBeNull()
    const sq = squareAt(FRAMES, 40, -99)
    expect(squareText(SINGLE, sq, 2, 'smoke_days', 'level')).toBe('Near 40.00°N, 99.00°W: 25 days of medium or thick smoke a year in 2003 (12 in 2001).')
    expect(squareText(FRAMES, sq, 2, 'smoke_days', 'change')).toBe('Near 40.00°N, 99.00°W: 15 days of medium or thick smoke a year more than in 2006–10 (2008–10).')
    expect(squareText(SINGLE, sq, 0, 'smoke_days', 'level', 'Spokane')).toBe('Near Spokane: 12 days of medium or thick smoke a year in 2001.')
    expect(squareText(FRAMES, squareAt(FRAMES, 40, -100), 1, 'smoke_days', 'level')).toBe('Near 40.00°N, 100.00°W: no value in 2007–09.')
  })
})

describe('the North America map', () => {
  it('lists its own records and keeps the record when the area changes', () => {
    expect(fieldsFor('na').map((f) => f.key)).toEqual(['sst', 'smoke_days_na', 'pm25_na', 'fires_na'])
    expect(areaOf('sst')).toBe('na') && expect(areaOf('pm25')).toBe('us')
    expect(switchArea('fires', 'na')).toBe('fires_na')
    expect(switchArea('fires_na', 'us')).toBe('fires')
    expect(switchArea('no2', 'na')).toBe('sst')                   // no North America NO2: the sea instead
    expect(switchArea('sst', 'us')).toBe('pm25')
  })
  it('says where its line is averaged', () => {
    const sea = { years: [2001, 2002], span: 1, base_years: [2001, 2001], unit: '°C', us_mean: [26, 27], us_change: [0, 1], mean_area: 'the Gulf of Mexico' }
    expect(caption(sea, 1, 'sst', 'level')).toBe('2002: across the Gulf of Mexico, an average of 27 °C at the sea surface (26 in 2001).')
    expect(lineLabel(sea, 'level')).toBe('Gulf of Mexico average')
    expect(lineLabel({ base_years: [2001, 2005] }, 'change')).toBe('Lower-48 average, change from 2001–05')
  })
})
