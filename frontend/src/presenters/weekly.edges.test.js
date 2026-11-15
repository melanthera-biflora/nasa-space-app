import { expect, it } from 'vitest'
import { startWeek, weeklyFor, weekReadout, weekRows } from './weekly'

const block = (week, start, end, value, unusual = null, p10 = 5, p50 = 8, p90 = 11) => ({ week, start, end, value, p10, p50, p90, unusual })

it('has no rows, readout or odd week before the data arrives', () => {
  expect(weekRows(null)).toEqual([])
  expect(weekRows({})).toEqual([])
  expect(weekReadout(null, 1)).toBe('')
  expect(weekReadout({ blocks: [block(1, '01-01', '01-07', 8)] }, 53)).toBe('')
  expect(startWeek(null)).toBe(26)
  expect(startWeek({ blocks: [block(1, '01-01', '01-07', 8)] })).toBe(26)
})

it('says "below" for a cold week and "within" for an ordinary one', () => {
  const data = { year: 2021, unit: '°C', about: 'x', blocks: [block(7, '02-12', '02-18', -12.4, 'low'), block(8, '02-19', '02-25', 6)] }
  expect(weekReadout(data, 7)).toMatch(/below its usual range of 5–11 °C\.$/)
  expect(weekReadout(data, 8)).toMatch(/within its usual range/)
})

it('starts on the most unusual week, skipping weeks with no value and a zero-width usual range', () => {
  const data = { blocks: [
    block(3, '01-15', '01-21', null, 'high'),
    block(10, '03-05', '03-11', 20, 'high', 8, 8, 8),        // p90 = p10: no division by zero
    block(30, '07-23', '07-29', 40, 'high', 20, 25, 30),
  ] }
  expect(startWeek(data)).toBe(10)
  expect(weekRows(data).map((r) => r.z)).toEqual([3, 3, 3])
})

it('has no weekly view without a place', () => {
  expect(weeklyFor(null, 'hot_days').variable).toBeNull()
  expect(weeklyFor({ kind: 'point' }, 'lava').variable).toBeNull()
})
