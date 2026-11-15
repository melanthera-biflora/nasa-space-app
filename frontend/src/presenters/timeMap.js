// Presenter for the animated US map on /map (D36): which year is shown, the words for it, the US-average line and the
// legend. Frames come precomputed from GET /api/v1/maps/{factor}/frames (tools/map_frames.py): the yearly values, their
// change from the record's first five years, and the US averages of both. Nothing is computed here beyond picking a
// frame and wording it.
import { useEffect, useState } from 'react'
import { fetchMapFrames } from '../api/trendField'
import { colorFor, edgesFor } from '../lib/fieldPaint'
import { format, sign } from '../lib/format'
import { where } from './trendMap'

export const FRAME_FIELDS = [
  { key: 'smoke_days', label: 'Smoke days', noun: 'days of medium or thick smoke a year',
    note: 'Counts medium and thick smoke only, from 2011. Light smoke is left out: it is usually high above the ground, NOAA changed how it labels it in 2022, and counting it greatly overstates smoke days and their trend (Liu et al. 2024, International Journal of Wildland Fire).' },
  { key: 'pm25', label: 'Fine particles', noun: 'µg/m³ of fine particles' },
  { key: 'aod', label: 'Haze', noun: 'haze (aerosol optical depth)' },
  { key: 'no2', label: 'Nitrogen dioxide', noun: '×10¹⁵ molecules/cm² of NO₂' },
  { key: 'fires', label: 'Fires', noun: 'fire detections per 1° square' },
]
export const VIEWS = [{ value: 'level', label: 'Each year' }, { value: 'change', label: 'Change from the start' }]
export const SPEEDS = [{ value: 1600, label: 'Slow' }, { value: 1000, label: 'Normal' }, { value: 550, label: 'Fast' }]
/** How long the new year takes to fade in over the last one: short at Fast, so most of each step shows only legend colours. */
export const fadeFor = (speed) => (speed < 800 ? 150 : 300)

const nounOf = (frames, key) => FRAME_FIELDS.find((f) => f.key === key)?.noun || frames.unit
const span = (a, b) => (a === b ? `${a}` : `${a}–${String(b).slice(2)}`)

/** The years a frame covers: "2021", or "2023–25" for a 3-year mean. */
export const yearLabel = (frames, i) => span(frames.years[i] - (frames.span || 1) + 1, frames.years[i])
export const baseLabel = (frames) => span(...frames.base_years)

/** The field-shaped object lib/fieldPaint.paint() draws for one frame: levels on the shared scale, or change (every
 *  square coloured: these are differences, not tested trends, so nothing is hatched). */
export const frameField = (frames, i, view) => (view === 'change'
  ? { grid: frames.grid, breaks: frames.change_breaks, slope: frames.change[i], fdr: frames.change[i].map(() => true) }
  : { grid: frames.grid, level_breaks: frames.level_breaks, now: frames.values[i] })
export const paintView = (view) => (view === 'change' ? 'change' : 'now')

/** The next frame while playing; null at the end (playing stops on the last year instead of looping). */
export const nextFrame = (i, count) => (i + 1 < count ? i + 1 : null)

const moreOrLess = (v, noun, base) => (v === 0 ? `about the same ${noun} as in ${base}` : `${format(Math.abs(v))} ${noun} ${v > 0 ? 'more' : 'less'} than in ${base}`)

/** One sentence for the frame on screen (the live region reads it on pause, step or slider move, not while playing). */
export function caption(frames, i, key, view) {
  const noun = nounOf(frames, key), when = yearLabel(frames, i)
  if (frames.us_mean[i] == null) return `${when}: no complete year of data.`
  if (view === 'change') return `${when}: across the lower 48, ${moreOrLess(frames.us_change[i], noun, baseLabel(frames))}.`
  const was = i > 0 ? ` (${format(frames.us_mean[0])} in ${yearLabel(frames, 0)})` : ''
  return `${when}: across the lower 48, an average of ${format(frames.us_mean[i])} ${noun}${was}.`
}

/** The US-average line under the map, scaled 0-1 for drawing; in the change view it also places the zero line. */
export function meanLine(frames, i, view) {
  const series = view === 'change' ? frames.us_change : frames.us_mean
  const pts = frames.years.map((year, k) => ({ k, value: series[k] })).filter((p) => p.value != null)
  const values = pts.map((p) => p.value).concat(view === 'change' ? [0] : [])
  const lo = Math.min(...values), hi = Math.max(...values), height = hi - lo || 1
  const x = (k) => k / Math.max(1, frames.years.length - 1), y = (v) => (v - lo) / height
  return {
    points: pts.map((p) => ({ x: x(p.k), y: y(p.value) })),
    current: series[i] == null ? null : { x: x(i), y: y(series[i]), text: view === 'change' ? sign(series[i]) : format(series[i]) },
    zero: view === 'change' ? y(0) : null,
  }
}

/** Slider ticks every 5 years (by the frame's last year), placed 0-1 along the track. */
export const ticks = (frames) => frames.years.map((year, k) => ({ year, at: k / Math.max(1, frames.years.length - 1) })).filter((t) => t.year % 5 === 0)

/** The colour key, the same for every frame: a colour per class and the edges as labels along the ramp. */
export function frameLegend(frames, view) {
  const field = frameField(frames, 0, view), pv = paintView(view)
  const edges = edgesFor(field, pv), change = view === 'change'
  const text = (e) => `${change && e > 0 ? '+' : ''}${change && e < 0 ? '−' : ''}${Math.abs(Number(e.toPrecision(3)))}`
  return {
    title: change ? `Change from ${baseLabel(frames)} · ${frames.unit}` : `${frames.span > 1 ? `${frames.span}-year average` : 'Yearly average'} · ${frames.unit}`,
    classes: Array.from({ length: edges.length + 1 }, (_, k) => ({ k, color: colorFor(field, pv, k) })),
    edges: edges.map((e, k) => ({ text: text(e), at: (k + 1) / (edges.length + 1) })),
    ends: change ? ['Less', 'More'] : ['Lower', 'Higher'],
  }
}

/** The grid square under a point, or null off the grid. */
export function squareAt(frames, lat, lon) {
  const { lats, lons, dlat, dlon } = frames.grid
  const i = Math.round((lat - lats[0]) / dlat), j = Math.round((lon - lons[0]) / dlon)
  if (i < 0 || j < 0 || i >= lats.length || j >= lons.length) return null
  return { i, j, n: i * lons.length + j, lat: lats[i], lon: lons[j], bounds: [[lats[i] - dlat / 2, lons[j] - dlon / 2], [lats[i] + dlat / 2, lons[j] + dlon / 2]] }
}

/** One line for a square in the frame on screen (named after the household's place when it is theirs); null if the
 *  square never has a value. */
export function squareText(frames, sq, i, key, view, name) {
  const first = frames.values.findIndex((row) => row[sq.n] != null)
  if (first < 0) return null
  const noun = nounOf(frames, key), head = `Near ${name || where(sq.lat, sq.lon)}: `, when = yearLabel(frames, i)
  if (view === 'change') {
    const d = frames.change[i][sq.n]
    return d == null ? `${head}no early years to compare with.` : `${head}${moreOrLess(d, noun, baseLabel(frames))} (${when}).`
  }
  const now = frames.values[i][sq.n]
  if (now == null) return `${head}no value in ${when}.`
  const was = first < i ? ` (${format(frames.values[first][sq.n])} in ${yearLabel(frames, first)})` : ''
  return `${head}${format(now)} ${noun} in ${when}${was}.`
}

/** The frames for one field: { frames, error }, null frames while loading. */
export function useMapFrames(key) {
  const [state, setState] = useState({ key: '', frames: null, error: '' })
  useEffect(() => {
    const c = new AbortController()
    fetchMapFrames(key, c.signal).then((frames) => setState({ key, frames, error: '' }))
      .catch((e) => { if (!c.signal.aborted) setState({ key, frames: null, error: e.message }) })
    return () => c.abort()
  }, [key])
  return state.key === key ? state : { frames: null, error: '' }
}
