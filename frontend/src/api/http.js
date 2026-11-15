// The model's only door to the backend: JSON from the versioned API (contract: backend/openapi.v1.json; Next.js
// rewrites /api to the FastAPI backend). Every failure becomes one plain sentence, with the API's stable `code`.
//
// Responses are cached in memory (SPEC A3, data-client): a fresh copy (under 5 minutes) is served without asking
// again; a stale copy is served at once and refreshed in the background; two views asking for the same thing share
// one request; a failed refresh never throws away good data.
// shortcut: in-memory only, cleared on reload; move to SWR if pages need to re-render when a background refresh lands.
const BASE = '/api/v1'
const FRESH_MS = 5 * 60_000
const MAX_ENTRIES = 50
const TIMEOUT_MS = 30_000
// Two more tries, a little apart (with jitter, so many tabs don't knock at once), when Climatch is busy (429, 503,
// 504), the line drops, or something in front of the API failed (a 5xx without the API's error body). The API's own
// errors (a NASA source that didn't answer, a bad input) come back at once: asking again wouldn't change them.
// Every call here is a read (POST /reports only keeps the household out of URLs), so repeating one is safe.
const RETRY_MS = [700, 2000]
const BUSY = new Set([429, 503, 504])

const cache = new Map()   // path -> { data, at, promise }

const fail = (message, code, cause, extra = {}) => Object.assign(new Error(message, cause ? { cause } : undefined), { code, ...extra })
const aborted = () => Object.assign(new Error('The request was cancelled.'), { name: 'AbortError' })

async function request(path, payload) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await once(path, payload)
    } catch (err) {
      if (!err.retry || attempt >= RETRY_MS.length) throw err
      await new Promise((r) => setTimeout(r, err.retryAfter ?? RETRY_MS[attempt] * (0.75 + Math.random() * 0.5)))
    }
  }
}

async function once(path, payload) {
  const init = payload === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
  let response
  try {
    response = await fetch(`${BASE}${path}`, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) })
  } catch (err) {
    if (err.name === 'TimeoutError') throw fail('NASA data is taking too long to arrive. Try again, or choose another place.', 'timeout', err)
    throw fail("We can't reach Climatch right now. Check your connection and try again.", 'offline', err, { retry: true })
  }
  if (response.ok) return response.json()

  const body = await response.json().catch(() => ({}))
  const code = body?.error?.code || 'http_error'
  const after = Number(response.headers?.get?.('Retry-After'))
  const extra = { retry: BUSY.has(response.status) || (!body?.error && response.status >= 500),
    ...(after > 0 ? { retryAfter: Math.min(5000, after * 1000) } : {}) }
  if (body?.error?.message) throw fail(body.error.message, code, undefined, extra)
  throw fail("Climatch didn't answer. Try again in a moment.", code, undefined, extra)
}

// key: the path, plus the body for a POST (the household stays in this tab's memory, never in a URL)
function load(key, path, body) {
  const hit = cache.get(key)
  if (hit?.promise) return hit.promise
  const promise = request(path, body)
    .then((data) => { cache.set(key, { data, at: Date.now() }); return data })
    .finally(() => { const h = cache.get(key); if (h?.promise === promise) delete h.promise })
  cache.set(key, { ...hit, promise })
  if (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value)   // oldest first
  return promise
}

/** The cached answer for a path, if any (for drawing a revisited page at once). */
export const peek = (path) => cache.get(path)?.data

export function clearCache() { cache.clear() }

export const getJson = (path, signal) => cached(path, path, undefined, signal)

/** POST JSON and read JSON back, cached like a GET (for reads whose input must stay out of the URL: the household). */
export const postJson = (path, body, signal) => cached(`${path} ${JSON.stringify(body)}`, path, body, signal)

async function cached(key, path, body, signal) {
  if (signal?.aborted) throw aborted()
  const hit = cache.get(key)
  if (hit?.data !== undefined) {
    if (Date.now() - hit.at >= FRESH_MS) load(key, path, body).catch(() => {})   // refresh quietly; keep serving what we have
    return hit.data
  }
  const shared = load(key, path, body)
  if (!signal) return shared
  // a view that leaves stops waiting, but the shared request finishes for anyone else
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(aborted())
    signal.addEventListener('abort', onAbort, { once: true })
    shared.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort))
  })
}

/** Warm the cache when someone shows intent (hover, focus) on a link to this data. Errors are ignored. */
export function prefetch(path) {
  if (cache.get(path)?.data === undefined) load(path, path).catch(() => {})
}
