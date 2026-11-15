import { describe, expect, it } from 'vitest'
import { fitRange, offNote, offScale, pan, scatterFrame, zoom } from './cityScatter'

const city = (name, x, y) => ({ name, x, y })
const MANY = Array.from({ length: 20 }, (_, i) => city(`C${i}`, i, (i % 5) - 2))
const WITH_OUTLIER = [...MANY, city('Anchorage', -400, -250)]

describe('the 51-city scatter view', () => {
  it('fits most cities by default, leaving a far-out value off the scale; "all" takes every city', () => {
    const [lo, hi] = fitRange(WITH_OUTLIER.map((p) => p.x), 'most')
    expect(lo).toBeGreaterThan(-30)                 // the -400 city doesn't stretch the axis
    expect(hi).toBeGreaterThanOrEqual(19)
    expect(fitRange(WITH_OUTLIER.map((p) => p.x), 'all')[0]).toBeLessThan(-400)
  })

  it('keeps zero and the household limit in view, and ends the axis at real data', () => {
    const f = scatterFrame(MANY, 40, 'most')
    expect(f.view.y[0]).toBeLessThan(0)
    expect(f.view.y[1]).toBeGreaterThan(0)
    expect(f.view.x[1]).toBeGreaterThanOrEqual(40)
    const falling = scatterFrame(MANY.map((p) => ({ ...p, y: -5 - p.x })), null)
    expect(falling.view.y[1]).toBeLessThan(5)               // all falling: no mirrored empty half
    expect(fitRange(WITH_OUTLIER.map((p) => p.x))[0]).toBeGreaterThan(-2)   // snaps to 0, the lowest city inside
  })

  it('names the cities off the scale, so a squashed chart never hides one silently', () => {
    const f = scatterFrame(WITH_OUTLIER, null, 'most')
    expect(offScale(WITH_OUTLIER, f.view).map((p) => p.name)).toEqual(['Anchorage'])
    expect(offNote(f.off, 'cm')).toMatch(/^Anchorage \(−400 cm, −250 per decade\) is off the scale/)
    expect(offNote([], 'cm')).toBe('')
  })

  it('zooms around a point and pans by a share of the view', () => {
    expect(zoom([0, 10], 0.5)).toEqual([2.5, 7.5])
    expect(zoom([0, 10], 0.5, 0)).toEqual([0, 5])
    expect(pan([0, 10], 0.1)).toEqual([1, 11])
  })
})
