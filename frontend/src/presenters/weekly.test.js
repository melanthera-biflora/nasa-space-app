import { expect, it } from 'vitest'
import { startWeek, weeklyFor, weekReadout, weekRows } from './weekly'

const data = { year: 2021, unit: '°C', about: 'the average of the 7 daily highs', blocks: [
  { week: 1, start: '01-01', end: '01-07', value: 8, p10: 5, p50: 8, p90: 11, unusual: null },
  { week: 26, start: '06-25', end: '07-01', value: 38.2, p10: 22, p50: 26, p90: 30, unusual: 'high' },
  { week: 27, start: '07-02', end: '07-08', value: null, p10: 22, p50: 27, p90: 31, unusual: null },
] }

it('picks the daily variable behind a card, or says why there is none', () => {
  expect(weeklyFor({ kind: 'point' }, 'warm_nights').variable).toBe('t2m_min')
  expect(weeklyFor({ kind: 'point' }, 'pm25').why).toMatch(/by month/)
  expect(weeklyFor({ kind: 'state' }, 't2m').why).toMatch(/for an address/)
})

it('ticks the first week of each month and starts on the most unusual week', () => {
  expect(weekRows(data).map((r) => r.tick)).toEqual(['Jan', 'Jun', 'Jul'])
  expect(startWeek(data)).toBe(26)
})

it('reads a week in plain words', () => {
  expect(weekReadout(data, 26)).toBe('Jun 25–Jul 1, 2021: 38.2 °C (the average of the 7 daily highs), above its usual range of 22–30 °C.')
  expect(weekReadout(data, 27)).toBe('Jul 2–Jul 8: no data.')
})
