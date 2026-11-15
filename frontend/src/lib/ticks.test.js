import { describe, expect, it } from 'vitest'
import { niceTicks } from './ticks'

describe('niceTicks: round axis values inside the data range', () => {
  it('picks round steps close to four ticks', () => {
    expect(niceTicks(0, 99.4)).toEqual([0, 25, 50, 75])
    expect(niceTicks(77, 99)).toEqual([80, 85, 90, 95])
    expect(niceTicks(0.104, 0.162)).toEqual([0.12, 0.14, 0.16])
  })

  it('never repeats a value: a flat series gets one tick (no duplicate React keys)', () => {
    expect(niceTicks(0, 0)).toEqual([0])
    const t = niceTicks(3.2, 3.2000001)
    expect(new Set(t).size).toBe(t.length)
  })

  it('keeps negative ranges and never goes below the data', () => {
    expect(niceTicks(-12.8, 2.5)).toEqual([-10, -5, 0])
    expect(Math.min(...niceTicks(1.3, 48))).toBeGreaterThanOrEqual(1.3)
  })
})
