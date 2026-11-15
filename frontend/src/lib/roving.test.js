import { describe, expect, it } from 'vitest'
import { chartIndex, rovingIndex } from './roving'

describe('roving tabindex', () => {
  it('moves one item per arrow, stops at the ends, jumps with Home and End', () => {
    expect(rovingIndex('ArrowRight', 0, 25)).toBe(1)
    expect(rovingIndex('ArrowLeft', 0, 25)).toBe(0)
    expect(rovingIndex('ArrowDown', 24, 25)).toBe(24)
    expect(rovingIndex('Home', 12, 25)).toBe(0)
    expect(rovingIndex('End', 3, 25)).toBe(24)
  })

  it('reads a chart one step, five steps or to either end', () => {
    expect(chartIndex('ArrowRight', 3, 12)).toBe(4)
    expect(chartIndex('PageUp', 9, 12)).toBe(11)
    expect(chartIndex('PageDown', 2, 12)).toBe(0)
    expect(chartIndex('End', 0, 12)).toBe(11)
    expect(chartIndex('ArrowDown', 0, 12)).toBeNull()
    expect(chartIndex('Home', 0, 0)).toBeNull()
  })

  it('ignores other keys and empty charts', () => {
    expect(rovingIndex('Tab', 3, 25)).toBeNull()
    expect(rovingIndex('ArrowRight', 0, 0)).toBeNull()
  })
})
