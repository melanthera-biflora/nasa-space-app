// Presenter for the US trend map. Pure functions turn a trend field (api/types.js TrendField) and the map's UI
// state into what the view shows: which layer, the readout of a square, the legend, the summary sentence, the next
// square for the arrow keys. useTrendField() fetches and keeps fields. Drawing (Leaflet, canvas) stays in the view.
import { useEffect, useState } from 'react'
import { fetchTrendField } from '../api/trendField'
import { colorFor, edgesFor } from '../lib/fieldPaint'
import { format, sign } from '../lib/format'

// The gridded fields tools/trend_field.py builds. Weather cards come from a point API, so they have no map.
export const FIELDS = [
  { key: 'pm25', label: 'PM2.5' },
  { key: 'no2', label: 'NO₂' },
  { key: 'fires', label: 'Fires' },
  { key: 'smoke_days', label: 'Smoke days' },
  { key: 'aod', label: 'Haze' },
]
const LAYER_NOTES = {
  pm25: ' Starts in 2010, when the model changed how it adds fire smoke. Coastal squares read high partly because the model counts sea salt in PM2.5.',
  smoke_days: ' Counts days with medium or thick smoke only, from 2011; smoke can be high above the ground.',
  aod: ' Haze is the whole air column, so smoke high overhead counts as much as smoke at the ground.',
}

const shortYears = (yrs) => `${yrs[0]}–${String(yrs[1]).slice(2)}`
export const where = (lat, lon) => `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(2)}°${lon < 0 ? 'W' : 'E'}`
const pText = (p) => (p < 0.001 ? 'p < 0.001' : `p = ${p.toFixed(3)}`)

// The layer follows the open card when it has a map; a manual choice lasts until the card changes.
export function chooseLayer(factorKey, pick) {
  const mapped = FIELDS.some((f) => f.key === factorKey)
  const key = pick?.for === factorKey ? pick.key : mapped ? factorKey : 'pm25'
  return { key, mapped, label: FIELDS.find((f) => f.key === key).label }
}

export const viewOptions = (field) => [['change', 'Change'], ['then', shortYears(field.then_years)], ['now', shortYears(field.now_years)]]

// The square the readout describes: under the pointer, else pinned, else the address's own square.
export function activeSquare({ hover, pinned, here }) {
  if (hover?.hasData) return { cell: hover, kind: 'hover' }
  if (pinned) return { cell: pinned, kind: 'pin' }
  if (here?.hasData) return { cell: here, kind: 'here' }
  return { cell: null, kind: null }
}

export function readout(field, { cell, kind }, { hereName = 'This address', layerKey, hasHere }) {
  if (!cell) return { empty: hasHere ? 'This address is outside the lower 48 map.' : 'Point at a square to read it.' }
  if (!cell.hasData) {
    return { empty: `Pinned square · ${where(cell.lat, cell.lon)}: no data here (outside the US outline${layerKey === 'fires' ? ', or too few fires for a trend' : ''}).` }
  }
  const n = cell.n
  return {
    title: kind === 'hover' ? 'Under the pointer' : kind === 'pin' ? 'Pinned square' : `${hereName}'s square`,
    where: where(cell.lat, cell.lon),
    change: `${format(field.then[n])} → ${format(field.now[n])} ${field.unit}`,
    years: `(${shortYears(field.then_years)} vs ${shortYears(field.now_years)})`,
    rate: `${sign(field.slope[n])} per decade · ${pText(field.p[n])}`,
    verdict: field.fdr[n] ? 'Significant, also after the map-wide check'
      : field.sig[n] ? 'Significant on its own, but not after the map-wide check' : 'No clear trend',
    strong: Boolean(field.fdr[n]),
  }
}

export function summary(field, view) {
  const s = field.summary
  return [
    `${field.label}, ${field.period[0]}–${field.period[1]}, lower 48 states, one square per NASA grid cell.`,
    `Clearly rising over ${s.rising_fdr_pct}% of the area${s.strongest_rise ? ` (strongest ${s.strongest_rise.where}, ${sign(s.strongest_rise.slope_per_decade)} per decade)` : ''},`,
    `clearly falling over ${s.falling_fdr_pct}%${s.strongest_fall ? ` (strongest ${s.strongest_fall.where}, ${sign(s.strongest_fall.slope_per_decade)} per decade)` : ''}.`,
    view !== 'change' ? `Showing the ${shortYears(field[`${view}_years`])} average; darker means higher.` : '',
  ].join(' ').trim()
}

export function footnote(field, layerKey) {
  const km = Math.round(field.grid.dlat * 111)
  return `Each square is one grid cell, about ${km} km across, so it can’t show a street. “Clear” means Mann-Kendall p < 0.05 and still `
    + `significant after a false-discovery check across all ${field.summary.cells.toLocaleString('en-US')} squares, because testing thousands of `
    + 'squares makes some look significant by chance. Colour shows direction or level, not good or bad.'
    + `${LAYER_NOTES[layerKey] || ''} Source: ${field.source}.`
}

// The legend: one colour per class (each a filter button), labels on the edges between them, and the two ends.
export function legend(field, view) {
  const edges = edgesFor(field, view)
  const change = view === 'change'
  const edgeText = (v) => `${change ? (v > 0 ? '+' : '−') : ''}${Math.abs(Number(v.toPrecision(3)))}`
  const range = (k) => {
    const lo = k > 0 ? edgeText(edges[k - 1]) : null
    const hi = k < edges.length ? edgeText(edges[k]) : null
    return lo && hi ? `${lo} to ${hi}` : lo ? `${lo} or more` : `below ${hi}`
  }
  return {
    title: change ? `Change per decade · ${field.unit}` : `Average ${shortYears(field[`${view}_years`])} · ${field.unit}`,
    classes: Array.from({ length: edges.length + 1 }, (_, k) => ({ k, color: colorFor(field, view, k), range: range(k) })),
    edges: edges.map((e, k) => ({ text: edgeText(e), at: (k + 1) / (edges.length + 1) })),
    ends: change ? ['← Falling', 'Rising →'] : ['Lower', 'Higher'],
    showsClarity: change,
  }
}

const MOVES = { ArrowUp: [1, 0], ArrowDown: [-1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }
export const isMoveKey = (key) => key in MOVES

// The square one arrow-key step away, kept on the grid. Starts from the pinned square, the address, or the middle.
export function stepSquare(field, from, key) {
  const { lats, lons } = field.grid
  const start = from || { i: lats.length >> 1, j: lons.length >> 1 }
  const [di, dj] = MOVES[key]
  const i = Math.min(lats.length - 1, Math.max(0, start.i + di))
  const j = Math.min(lons.length - 1, Math.max(0, start.j + dj))
  return { lat: lats[i], lon: lons[j] }
}

export const panStep = (key, px = 160) => [MOVES[key][1] * px, -MOVES[key][0] * px]

// Fetch each layer once and keep it; errors are per layer.
export function useTrendField(key) {
  const [fields, setFields] = useState({})
  const [error, setError] = useState({ key: null, message: '' })
  useEffect(() => {
    if (fields[key]) return undefined
    const controller = new AbortController()
    fetchTrendField(key, controller.signal)
      .then((data) => setFields((all) => ({ ...all, [key]: data })))
      .catch((err) => { if (!controller.signal.aborted) setError({ key, message: err.message }) })
    return () => controller.abort()
  }, [key, fields])
  return { field: fields[key] || null, error: error.key === key ? error.message : '' }
}
