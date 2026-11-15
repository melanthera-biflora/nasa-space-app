import { describe, expect, it } from 'vitest'
import { DIRECTION_WORDS, direction, format, sign, unitOf } from './format'

describe('format: numbers rounded for people (docs/UX.md "Numbers", D33)', () => {
  it('rounds temperatures and rates to 1 decimal, with thousands separators', () => {
    expect(format(31.46)).toBe('31.5')
    expect(format(-3.24)).toBe('−3.2')   // a real minus sign (U+2212), like sign()
    expect(format(-0)).toBe('0')
    expect(format(1234.56)).toBe('1,234.6')
  })

  it('keeps whole counts whole', () => {
    expect(format(12)).toBe('12')
    expect(format(1)).toBe('1')
    expect(format(0)).toBe('0')
  })

  it('shows numbers below 1 with two significant digits, so small values do not round away', () => {
    expect(format(0.1349)).toBe('0.13')
    expect(format(0.046)).toBe('0.046')
    expect(format(-0.046)).toBe('−0.046')
    expect(format(0.0012)).toBe('0.0012')
  })

  it('shows a dash for anything that is not a finite number', () => {
    expect([null, undefined, NaN, Infinity, -Infinity, '12', {}].map(format)).toEqual(['—', '—', '—', '—', '—', '—', '—'])
  })
})

describe('sign: a change with its direction', () => {
  it('puts a plus on rises and a true minus (U+2212) on falls', () => {
    expect(sign(2.54)).toBe('+2.5')
    expect(sign(-2.54)).toBe('−2.5')
    expect(sign(-0.046)).toBe('−0.046')
  })

  it('gives no sign to zero, negative zero included', () => {
    expect(sign(0)).toBe('0')
    expect(sign(-0)).toBe('0')
  })

  it('shows a dash for a missing change', () => {
    expect([null, undefined, NaN].map(sign)).toEqual(['—', '—', '—'])
  })
})

describe('cards', () => {
  it('prefers the short unit', () => {
    expect(unitOf({ unit: 'micrograms per cubic metre', unit_short: 'µg/m³' })).toBe('µg/m³')
    expect(unitOf({ unit: 'days' })).toBe('days')
  })

  it('calls a card flat unless its trend is clear, whatever the slope', () => {
    expect(direction({ trend_direction: 'no_clear_trend', slope_per_decade: 9 })).toBe('flat')
    expect(direction({ trend_direction: 'rising', slope_per_decade: 0.4 })).toBe('up')
    expect(direction({ trend_direction: 'falling', slope_per_decade: -0.4 })).toBe('down')
  })

  it('never uses colour alone: every direction has an arrow and a word', () => {
    for (const words of Object.values(DIRECTION_WORDS)) expect(words).toMatch(/^[↑↓→] [A-Z][a-z]/)
  })
})
