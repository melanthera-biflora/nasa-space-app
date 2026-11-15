// Contrast of the token pairs the UI actually uses (WCAG 2): 4.5:1 for text, 3:1 for focus rings and chart marks.
// Reads the tokens straight from index.css, so a token edit that breaks contrast fails here (SPEC A3, S39).
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8')
const token = (name) => {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))
  if (!m) throw new Error(`no hex token --${name}`)
  return m[1]
}
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

const TEXT = [
  ['ink', 'surface'], ['ink', 'bg'], ['ink-muted', 'surface'], ['ink-muted', 'bg'], ['ink-muted', 'surface-sunken'],
  ['accent', 'surface'], ['accent', 'accent-soft'], ['flat', 'bg'], ['rising', 'surface'], ['falling', 'surface'],
  ['compare-text', 'bg'], ['brand', 'surface'], ['brand', 'brand-soft'], ['on-brand', 'brand'], ['on-brand-muted', 'brand'],
  ['n-11', 'surface'], ['sage-11', 'sage-3'], ['brand-11', 'brand-3'],
]
const MARKS = [['focus', 'surface'], ['focus', 'bg'], ['highlight', 'brand'], ['compare', 'surface'], ['drier', 'surface'], ['wetter', 'surface']]

describe('token contrast', () => {
  it.each(TEXT)('%s text on %s is at least 4.5:1', (fg, bg) => {
    expect(ratio(token(fg), token(bg))).toBeGreaterThanOrEqual(4.5)
  })
  it.each(MARKS)('%s mark on %s is at least 3:1', (fg, bg) => {
    expect(ratio(token(fg), token(bg))).toBeGreaterThanOrEqual(3)
  })
  it('white on the primary button fill passes', () => {
    expect(ratio('#ffffff', token('accent'))).toBeGreaterThanOrEqual(4.5)
  })
})
