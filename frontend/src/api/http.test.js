import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearCache, getJson, peek } from './http'

const ok = (body) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) })
const fail = () => Promise.resolve({ ok: false, status: 502, json: () => Promise.resolve({ error: { code: 'upstream_unavailable', message: 'NASA POWER didn’t answer.' } }) })

describe('asking again when Climatch is busy', () => {
  beforeEach(() => { clearCache(); vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })
  const busy = (status) => Promise.resolve({ ok: false, status, json: () => Promise.reject(new Error('not JSON')) })

  it('tries twice more, a little apart, when the server is busy or the line drops', async () => {
    const fetch = vi.fn().mockReturnValueOnce(busy(503)).mockImplementationOnce(() => Promise.reject(new TypeError('reset'))).mockReturnValueOnce(ok({ n: 1 }))
    vi.stubGlobal('fetch', fetch)
    const answer = getJson('/busy')
    await vi.advanceTimersByTimeAsync(4000)
    expect(await answer).toEqual({ n: 1 })
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  it('gives up after three tries with a plain sentence', async () => {
    vi.stubGlobal('fetch', vi.fn(() => busy(504)))
    const answer = getJson('/down').catch((e) => e)
    await vi.advanceTimersByTimeAsync(4000)
    expect(await answer).toMatchObject({ message: "Climatch didn't answer. Try again in a moment." })
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  it("doesn't repeat the API's own answers: a NASA source that failed, or a bad input", async () => {
    vi.stubGlobal('fetch', vi.fn(() => fail()))
    await expect(getJson('/nasa')).rejects.toMatchObject({ code: 'upstream_unavailable' })
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, status: 400, json: () => Promise.resolve({ error: { code: 'invalid_input', message: 'x' } }) })))
    await expect(getJson('/bad')).rejects.toMatchObject({ code: 'invalid_input' })
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})

describe('the response cache', () => {
  beforeEach(() => { clearCache(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-15T12:00:00Z')) })
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

  it('serves a fresh copy without asking again', async () => {
    const fetch = vi.fn(() => ok({ n: 1 }))
    vi.stubGlobal('fetch', fetch)
    expect(await getJson('/a')).toEqual({ n: 1 })
    expect(await getJson('/a')).toEqual({ n: 1 })
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(peek('/a')).toEqual({ n: 1 })
  })

  it('answers with the stale copy at once and refreshes it in the background', async () => {
    const fetch = vi.fn().mockReturnValueOnce(ok({ n: 1 })).mockReturnValueOnce(ok({ n: 2 }))
    vi.stubGlobal('fetch', fetch)
    await getJson('/a')
    vi.setSystemTime(new Date('2026-11-15T12:06:00Z'))      // past the 5-minute freshness
    expect(await getJson('/a')).toEqual({ n: 1 })
    await vi.waitFor(() => expect(peek('/a')).toEqual({ n: 2 }))
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('asks once when two views want the same thing at the same time', async () => {
    const fetch = vi.fn(() => ok({ n: 1 }))
    vi.stubGlobal('fetch', fetch)
    const [a, b] = await Promise.all([getJson('/a'), getJson('/a')])
    expect(a).toEqual(b)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('keeps good data when a refresh fails, and reports a first failure plainly', async () => {
    const fetch = vi.fn().mockReturnValueOnce(ok({ n: 1 })).mockReturnValueOnce(fail()).mockReturnValueOnce(fail())
    vi.stubGlobal('fetch', fetch)
    await getJson('/a')
    vi.setSystemTime(new Date('2026-11-15T12:06:00Z'))
    expect(await getJson('/a')).toEqual({ n: 1 })
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
    expect(peek('/a')).toEqual({ n: 1 })
    await expect(getJson('/b')).rejects.toMatchObject({ code: 'upstream_unavailable', message: 'NASA POWER didn’t answer.' })
  })

  it('lets one view cancel without cancelling the shared request', async () => {
    let release
    vi.stubGlobal('fetch', vi.fn(() => new Promise((r) => { release = () => r({ ok: true, status: 200, json: () => Promise.resolve({ n: 1 }) }) })))
    const c = new AbortController()
    const first = getJson('/a', c.signal)
    const second = getJson('/a')
    c.abort()
    await expect(first).rejects.toMatchObject({ name: 'AbortError' })
    release()
    expect(await second).toEqual({ n: 1 })
  })
})
