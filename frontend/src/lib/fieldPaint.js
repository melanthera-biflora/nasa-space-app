// Drawing helpers for the US trend map (data from tools/trend_field.py). Display only: every number is precomputed.
const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()
const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))

export const CHANGE_RAMP = Array.from({ length: 9 }, (_, i) => `--div-${i + 1}`)   // strongest fall (1) … strongest rise (9)
export const LEVEL_RAMP = Array.from({ length: 7 }, (_, i) => `--seq-${i + 1}`)    // lowest (1) … highest (7)

// Class edges per view: symmetric rates for "change", one shared set of levels for "then" and "now".
export const edgesFor = (field, view) => (view === 'change'
  ? [-field.breaks[3], -field.breaks[2], -field.breaks[1], -field.breaks[0], ...field.breaks]
  : field.level_breaks)

// Colour token for class k of a view (levels may have fewer classes when edges collapse).
export const colorFor = (field, view, k) => (view === 'change'
  ? CHANGE_RAMP[k]
  : LEVEL_RAMP[Math.round((k * (LEVEL_RAMP.length - 1)) / Math.max(1, field.level_breaks.length))])

export function classOf(v, edges) {
  let k = 0
  while (k < edges.length && v >= edges[k]) k++
  return k
}

const valueOf = (field, view, n) => (view === 'change' ? field.slope[n] : field[view][n])

// One block per grid cell, rows placed in Web Mercator so each square sits on its true latitude.
// Change view: only squares that pass the map-wide check get colour; the rest are grey and hatched (IPCC AR6 style).
// `only` (a class index) fades every other class, so the legend works as a filter.
export function paint(field, view, only) {
  const { lats, lons, dlat, dlon } = field.grid
  const edges = edgesFor(field, view)
  const S = 8
  const top = lats[lats.length - 1] + dlat / 2, bottom = lats[0] - dlat / 2
  const height = Math.round(lats.length * S * 1.3)
  const y = (lat) => Math.round(((mercY(top) - mercY(lat)) / (mercY(top) - mercY(bottom))) * height)
  const canvas = document.createElement('canvas')
  canvas.width = lons.length * S
  canvas.height = height
  const ctx = canvas.getContext('2d')
  const tile = document.createElement('canvas')
  tile.width = tile.height = 6
  const t = tile.getContext('2d')
  t.strokeStyle = token('--flat')
  t.lineWidth = 1
  t.beginPath(); t.moveTo(0, 6); t.lineTo(6, 0); t.stroke()
  const hatch = ctx.createPattern(tile, 'repeat')
  const unclear = token('--surface-sunken')
  const colors = new Map()
  const color = (k) => colors.get(k) ?? colors.set(k, token(colorFor(field, view, k))).get(k)
  lats.forEach((lat, i) => {
    const y0 = y(lat + dlat / 2), y1 = y(lat - dlat / 2)
    lons.forEach((_, j) => {
      const n = i * lons.length + j
      const v = valueOf(field, view, n)
      if (v == null) return
      const clear = view !== 'change' || field.fdr[n]
      const k = clear ? classOf(v, edges) : null
      ctx.globalAlpha = only == null || k === only ? 1 : 0.12
      ctx.fillStyle = clear ? color(k) : unclear
      ctx.fillRect(j * S, y0, S, y1 - y0)
      if (clear) return
      ctx.fillStyle = hatch
      ctx.fillRect(j * S, y0, S, y1 - y0)
    })
  })
  return { url: canvas.toDataURL(), bounds: [[bottom, lons[0] - dlon / 2], [top, lons[lons.length - 1] + dlon / 2]] }
}

// The grid square under a point (null outside the grid); hasData is false for blank squares.
export function cellAt(field, lat, lon) {
  if (!field) return null
  const { lats, lons, dlat, dlon } = field.grid
  const i = Math.round((lat - lats[0]) / dlat), j = Math.round((lon - lons[0]) / dlon)
  if (i < 0 || j < 0 || i >= lats.length || j >= lons.length) return null
  const n = i * lons.length + j
  return {
    i, j, n, lat: lats[i], lon: lons[j], hasData: field.slope[n] != null,
    bounds: [[lats[i] - dlat / 2, lons[j] - dlon / 2], [lats[i] + dlat / 2, lons[j] + dlon / 2]],
  }
}
