import { describe, expect, it } from 'vitest'
import { presentAnalyzing } from './analyzing'

const states = (vm) => vm.steps.map((s) => s.state)

describe('analyzing presenter', () => {
  it('walks the steps in order with the matching note', () => {
    expect(states(presentAnalyzing(0, false))).toEqual(['active', 'todo', 'todo'])
    expect(states(presentAnalyzing(0.5, false))).toEqual(['done', 'active', 'todo'])
    expect(presentAnalyzing(0.5, false).note).toMatch(/usual swing/)
  })

  it('never ticks the last step before the report arrives, and says it is still waiting', () => {
    const waiting = presentAnalyzing(1, false)
    expect(states(waiting)).toEqual(['done', 'done', 'active'])
    expect(waiting).toMatchObject({ waiting: true, leaving: false, note: 'Still fetching NASA data for this place…' })
  })

  it('leaves only when the animation has played and the report is ready', () => {
    expect(presentAnalyzing(0.6, true).leaving).toBe(false)          // report early: keep playing
    const done = presentAnalyzing(1, true)
    expect(states(done)).toEqual(['done', 'done', 'done'])
    expect(done).toMatchObject({ leaving: true, waiting: false, note: 'Done. Opening the report…', percent: 100 })
  })

  it('cross-fades the four seasons behind the card', () => {
    const start = presentAnalyzing(0, false)
    expect(start.season.id).toBe('spring')
    expect(start.layerOpacity).toEqual([1, 0, 0, 0])
    const mid = presentAnalyzing(0.5, false)                         // t = 2: autumn arriving over summer
    expect(mid.season.id).toBe('autumn')
    expect(mid.layerOpacity[2]).toBeCloseTo(0.5)
    expect(mid.weatherOpacity[1]).toBeCloseTo(0.5)                  // summer's weather fading out
  })
})
