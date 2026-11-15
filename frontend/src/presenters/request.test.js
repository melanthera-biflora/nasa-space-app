import { expect, it } from 'vitest'
import { waitStage } from './request'

it('names the wait the way people feel it', () => {
  expect([0, 399, 400, 2999, 3000, 9999, 10000, 25000].map(waitStage))
    .toEqual(['quiet', 'quiet', 'waiting', 'waiting', 'slow', 'slow', 'stuck', 'stuck'])
})
