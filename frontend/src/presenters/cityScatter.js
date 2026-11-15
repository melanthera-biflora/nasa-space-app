// Presenter for the 51-city scatter's view (round 4): which part of the data is on screen, which cities are off the
// scale, and the zoom and pan steps. Display scaling only: the values come from places_compare.json as sent.
import { format, sign } from '../lib/format'

const quantile = (sorted, q) => {
  const i = (sorted.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo)
}

/** The range to draw: every value ('all'), or most of them ('most': inside Tukey's far-out fences, 3 × the middle
 *  half's spread beyond it), padded a little. One far-out city (Anchorage's glacier water loss) no longer squashes 50. */
export function fitRange(values, mode = 'most', pad = 0.06) {
  const v = values.filter(Number.isFinite).sort((a, b) => a - b)
  if (!v.length) return [0, 1]
  let lo = v[0], hi = v.at(-1)
  if (mode === 'most' && v.length >= 8) {
    const q1 = quantile(v, 0.25), q3 = quantile(v, 0.75), iqr = q3 - q1
    // snap to the furthest city inside the fences, so the axis ends at real data, not at an empty fence
    if (iqr > 0) { const inside = v.filter((x) => x >= q1 - 3 * iqr && x <= q3 + 3 * iqr); lo = inside[0]; hi = inside.at(-1) }
  }
  const p = (hi - lo) * pad || 1
  return [lo - p, hi + p]
}

/** The view for one record: level across (with the household's limit in view), change up with zero in view (fitted,
 *  not mirrored: a mirrored axis left half the chart empty when every city was falling). */
export function scatterFrame(points, limit, mode = 'most') {
  let x = fitRange(points.map((p) => p.x), mode)
  if (Number.isFinite(limit)) x = [Math.min(x[0], limit), Math.max(x[1], limit)]
  const [y0, y1] = fitRange(points.map((p) => p.y), mode)
  const view = { x, y: [Math.min(y0, -(y1 - y0) * 0.06), Math.max(y1, (y1 - y0) * 0.06)] }
  return { view, off: offScale(points, view) }
}

export const offScale = (points, view) =>
  points.filter((p) => p.x < view.x[0] || p.x > view.x[1] || p.y < view.y[0] || p.y > view.y[1])

/** One sentence naming the cities off the scale (or how many), with "Show all" as the way to see them. */
export function offNote(off, unit) {
  if (!off.length) return ''
  if (off.length > 3) return `${off.length} cities are off the scale. Choose “Show all” to see them.`
  const named = off.map((p) => `${p.name} (${format(p.x)} ${unit}, ${sign(p.y)} per decade)`)
  const list = named.length < 2 ? named[0] : `${named.slice(0, -1).join(', ')} and ${named.at(-1)}`
  return `${list} ${off.length === 1 ? 'is' : 'are'} off the scale. Choose “Show all” to see ${off.length === 1 ? 'it' : 'them'}.`
}

/** Zoom a range by `factor` (under 1 zooms in) around `at` (the middle by default). */
export function zoom([a, b], factor, at = (a + b) / 2) {
  return [at - (at - a) * factor, at + (b - at) * factor]
}

/** Move a range by a share of its width (positive: towards higher values). */
export function pan([a, b], share) {
  const d = (b - a) * share
  return [a + d, b + d]
}
