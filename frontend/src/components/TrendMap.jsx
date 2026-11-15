import { useEffect, useId, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { fetchStateOutline } from '../api/location'
import { addBasemap, addLandMask, addStateOutline } from '../lib/basemap'
import { cellAt, paint } from '../lib/fieldPaint'
import { cooperativeZoom, motionOK, ZOOM_KEY } from '../lib/mapGestures'
import { activeSquare, chooseLayer, FIELDS, footnote, isMoveKey, panStep, readout, stepSquare, summary, useTrendField, viewOptions, where } from '../presenters/trendMap'
import TrendMapLegend from './TrendMapLegend'
import './Maps.css'

const LOWER_48 = [[24, -125], [50, -66]]
const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

// "Where else is it changing?": a view (Model-View-Presenter). It draws the field with Leaflet and handles the
// pointer and keys; presenters/trendMap.js decides the layer, the readout, the legend and the words.
export default function TrendMap({ factorKey, factorLabel, here, region = null, onPickPlace }) {
  const ref = useRef(null)
  const mapRef = useRef(null)
  const frameRef = useRef([LOWER_48, {}])      // the last framing, applied again when the map changes size
  const groupRef = useRef(null)
  const [pick, setPick] = useState({ for: null, key: null })
  const layer = chooseLayer(factorKey, pick)
  const [view, setView] = useState('change')
  const [filter, setFilter] = useState({ for: '', only: null })   // legend filter, reset when layer or view changes
  const only = filter.for === `${layer.key}:${view}` ? filter.only : null
  const [hover, setHover] = useState(null)
  const [pinned, setPinned] = useState(null)
  const { field, error } = useTrendField(layer.key)
  const summaryId = useId()

  useEffect(() => {
    // keyboard: false, because the arrow keys move between squares instead of panning (see onKeyDown).
    // maxZoom 8: past it the squares imply detail the data doesn't have.
    const map = L.map(ref.current, { keyboard: false, zoomSnap: 0.25, zoomDelta: 0.5, minZoom: 3, maxZoom: 8 })
    const stopGestures = cooperativeZoom(map)
    addBasemap(map)
    map.fitBounds(...frameRef.current)
    groupRef.current = { image: L.layerGroup().addTo(map), marks: L.layerGroup().addTo(map) }
    map.on('mousemove', (e) => setHover(e.latlng))
    map.on('mouseout', () => setHover(null))
    map.on('click', (e) => setPinned(e.latlng))
    mapRef.current = map
    const c = new AbortController()
    fetchStateOutline('L48', c.signal).then((o) => addLandMask(map, o.rings)).catch(() => {})   // squares cut at the coast
    // framed again on a new size: a phone lays the map out after the first fit, which left a state at the US zoom
    const observer = new ResizeObserver(() => { map.invalidateSize(); map.fitBounds(...frameRef.current) })
    observer.observe(ref.current)
    return () => { c.abort(); stopGestures(); observer.disconnect(); map.remove() }
  }, [])

  // A state in the URL (region=XX): its outline and the map framed on it, as on the year-by-year map; Home shows the US
  useEffect(() => {
    const map = mapRef.current
    if (!map || !region) return undefined
    const c = new AbortController()
    let outline = null
    fetchStateOutline(region, c.signal).then((o) => {
      const added = addStateOutline(map, o, token('--ink'))
      outline = added.layer
      frameRef.current = [added.bounds, { padding: [24, 24], animate: false }]   // framing on load, not a motion
      map.fitBounds(...frameRef.current)
    }).catch(() => {})                       // no outline: the lower 48 as before
    return () => { c.abort(); outline?.remove(); frameRef.current = [LOWER_48, {}] }
  }, [region])

  const image = useMemo(() => field && paint(field, view, only), [field, view, only])
  useEffect(() => {
    const group = groupRef.current.image
    group.clearLayers()
    if (image) L.imageOverlay(image.url, image.bounds, { className: 'tm-field', opacity: 0.92 }).addTo(group)
  }, [image])

  const hereLat = here?.lat, hereLon = here?.lon, hereName = here?.name
  useEffect(() => {
    const group = groupRef.current.marks
    group.clearLayers()
    const own = Number.isFinite(hereLat) && cellAt(field, hereLat, hereLon)
    if (own?.hasData) L.rectangle(own.bounds, { color: token('--ink'), weight: 1.5, dashArray: '4 3', fill: false, pane: 'markerPane' }).addTo(group)
    const cell = pinned && cellAt(field, pinned.lat, pinned.lng)
    if (cell) L.rectangle(cell.bounds, { color: token('--ink'), weight: 2.5, fill: false, pane: 'markerPane' }).addTo(group)
    if (Number.isFinite(hereLat)) {
      L.circleMarker([hereLat, hereLon], { radius: 7, color: token('--ink'), weight: 2.5, fillColor: token('--surface'), fillOpacity: 1, pane: 'markerPane' })
        .addTo(group).bindTooltip(hereName || 'This address')
    }
  }, [field, pinned, hereLat, hereLon, hereName])

  const hereCell = here ? cellAt(field, here.lat, here.lon) : null
  const pinCell = pinned ? cellAt(field, pinned.lat, pinned.lng) : null
  const square = activeSquare({ hover: hover ? cellAt(field, hover.lat, hover.lng) : null, pinned: pinCell, here: hereCell })
  const read = field ? readout(field, square, { hereName: here?.name, layerKey: layer.key, hasHere: Boolean(here) }) : null
  const canCompare = Boolean(onPickPlace && pinCell?.hasData)
  // the layer on screen, not the page's record: a smoke-days square opens smoke days in Explore
  const compare = () => onPickPlace({ name: `the square at ${where(pinCell.lat, pinCell.lon)}`, lat: pinCell.lat, lon: pinCell.lon, variable: layer.key })

  function onKeyDown(e) {
    const map = mapRef.current
    if (e.key === 'Home' || e.key === '0') { e.preventDefault(); map.fitBounds(LOWER_48, { animate: motionOK() }); return }
    if (['+', '=', '-', '_'].includes(e.key)) {
      e.preventDefault()
      const around = pinCell ? L.latLng(pinCell.lat, pinCell.lon) : map.getCenter()
      map.setZoomAround(around, map.getZoom() + ((e.key === '+' || e.key === '=') ? 1 : -1) * map.options.zoomDelta)
      return
    }
    if (isMoveKey(e.key) && e.shiftKey) { e.preventDefault(); map.panBy(panStep(e.key), { animate: motionOK() }); return }
    if (!field) return
    if (e.key === 'Escape') { setPinned(null); return }
    if (e.key === 'Enter' && canCompare) { e.preventDefault(); compare(); return }
    if (!isMoveKey(e.key)) return
    e.preventDefault()
    const mid = map.getCenter()                       // nothing pinned: start where the map looks (a state's middle), not Kansas
    const next = stepSquare(field, pinCell || (hereCell?.hasData && hereCell) || cellAt(field, mid.lat, mid.lng), e.key)
    setPinned(L.latLng(next.lat, next.lon))
    map.panInside([next.lat, next.lon], { padding: [48, 48], animate: motionOK() })
  }

  return (
    <figure className="map-figure">
      <div className="tm-toolbar">
        <div className="segmented" role="group" aria-label="Map layer">
          {FIELDS.map((f) => (
            <button key={f.key} type="button" aria-pressed={f.key === layer.key} onClick={() => setPick({ for: factorKey, key: f.key })}>{f.label}</button>
          ))}
        </div>
        {field && (
          <div className="segmented" role="group" aria-label="Show">
            {viewOptions(field).map(([v, label]) => <button key={v} type="button" aria-pressed={v === view} onClick={() => setView(v)}>{label}</button>)}
          </div>
        )}
        {here && hereCell?.hasData && (
          <button type="button" className="tm-zoom" onClick={() => mapRef.current.flyTo([here.lat, here.lon], 6, { animate: motionOK() })}>Zoom to address</button>
        )}
      </div>
      {!layer.mapped && <p className="map-note">{factorLabel} isn’t on the trend map yet. Showing {layer.label}.</p>}
      <div ref={ref} className="map-canvas map-canvas-us" role="region" aria-label="Map of trends across the lower 48 states. Arrow keys move between squares, Shift and arrows pan, plus and minus zoom, Home shows the whole country."
        aria-describedby={summaryId} tabIndex={0} onKeyDown={onKeyDown} />
      <figcaption>
        {error && <p className="map-note" role="alert">{error}</p>}
        {!field && !error && <p className="map-note">Loading the map…</p>}
        {field && (
          <>
            <div className="tm-readout" aria-live="polite">
              {read.empty ? <p className="map-muted">{read.empty}</p> : (
                <>
                  <p className="tm-readout-head"><b>{read.title}</b> · {read.where}</p>
                  <p>{read.change}<span className="map-muted"> {read.years}</span>{' · '}{read.rate}</p>
                  <p className={read.strong ? 'tm-verdict is-strong' : 'tm-verdict'}>{read.verdict}</p>
                </>
              )}
              {pinCell && (
                <div className="tm-actions">
                  {canCompare && <button type="button" onClick={compare}>Open this square in Explore</button>}
                  <button type="button" className="is-quiet" onClick={() => setPinned(null)}>Unpin</button>
                </div>
              )}
            </div>
            <p className="map-note map-keys">
              <span><kbd>←</kbd><kbd>↑</kbd><kbd>→</kbd><kbd>↓</kbd> move between squares</span>
              <span><kbd>Shift</kbd> + arrows pan</span>
              <span><kbd>+</kbd><kbd>−</kbd> zoom</span>
              <span><kbd>Home</kbd> whole US</span>
              <span><kbd>Enter</kbd> open in Explore</span>
              <span><kbd>Esc</kbd> unpin</span>
              <span>Wheel: click the map first, or hold <kbd>{ZOOM_KEY}</kbd></span>
            </p>
            <TrendMapLegend field={field} view={view} only={only} hasHere={Boolean(here)}
              onOnly={(k) => setFilter({ for: `${layer.key}:${view}`, only: k })} />
            <p className="map-summary" id={summaryId}>{summary(field, view)}</p>
            <p className="map-note">{footnote(field, layer.key)}</p>
          </>
        )}
      </figcaption>
    </figure>
  )
}
