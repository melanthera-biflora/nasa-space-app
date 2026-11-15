import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { fetchStateOutline } from '../api/location'
import { addBasemap } from '../lib/basemap'
import { footprints } from '../lib/footprints'
import { cooperativeZoom } from '../lib/mapGestures'
import { ButtonLink } from './ui/Button'
import Icon from './ui/Icon'
import './Maps.css'

const US = [[24.5, -125], [49.5, -66.9]]
const AREA_KINDS = new Set(['County', 'City', 'Town', 'Village'])
const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()
const bboxBounds = ([w, s, e, n]) => [[s, w], [n, e]]

// The map beside the address box. It frames a pick the way the report will use it: a whole state shows its outline
// (a household report needs one spot inside it, so the card offers the state view instead); a city, ZIP code or
// address shows its pin and the ~50 km square most of the report's numbers are averaged over. Clicking the map picks
// that spot; the search box does the same by keyboard.
export default function WhereMap({ location, onPickSpot }) {
  const ref = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)
  const pickRef = useRef(onPickSpot)
  const frameRef = useRef([US, {}])            // the last framing, applied again when the map changes size
  useEffect(() => { pickRef.current = onPickSpot })

  useEffect(() => {
    const map = L.map(ref.current, { minZoom: 3 }).fitBounds(US)
    map.frame = (bounds, options = {}) => { frameRef.current = [bounds, options]; map.fitBounds(bounds, options) }
    addBasemap(map)
    layerRef.current = L.layerGroup().addTo(map)
    map.on('click', (e) => pickRef.current?.(e.latlng))
    mapRef.current = map
    const stopGestures = cooperativeZoom(map)   // the wheel scrolls the page unless the map is clicked or Ctrl/⌘ is held
    const observer = new ResizeObserver(() => { map.invalidateSize(); map.fitBounds(...frameRef.current) })
    observer.observe(ref.current)
    return () => { stopGestures(); observer.disconnect(); map.remove(); mapRef.current = null }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map) return undefined
    layer.clearLayers()
    if (!location) { map.frame(US); return undefined }
    const ink = token('--brand-9')
    if (location.kind === 'State' && location.region) {
      // the card below-left explains a state: keep the outline clear of it
      const clear = { paddingTopLeft: [24, 24], paddingBottomRight: [24, 170] }
      if (location.extent) map.frame(bboxBounds(location.extent), clear)
      const c = new AbortController()
      fetchStateOutline(location.region, c.signal).then((o) => {
        L.polygon(o.rings.map((ring) => ring.map(([x, y]) => [y, x])), { color: ink, weight: 2, fillColor: ink, fillOpacity: 0.08, interactive: false }).addTo(layer)
        map.frame(bboxBounds(o.bbox), clear)
      }).catch(() => {})                       // no outline: the frame on the state is enough
      return () => c.abort()
    }
    const cell = footprints(location.lat, location.lon)[0]       // the NASA POWER / MERRA-2 grid square
    L.rectangle(cell.rect, { color: ink, weight: 2, dashArray: '6 4', fillColor: ink, fillOpacity: 0.06, interactive: false }).addTo(layer)
    const pin = L.divIcon({ className: 'location-pin-wrapper', html: '<span class="location-pin"></span>', iconSize: [30, 38], iconAnchor: [15, 38], tooltipAnchor: [0, -38] })
    const label = document.createElement('span')   // textContent: a place name is shown as text, never as HTML
    label.textContent = location.main || location.name
    L.marker([location.lat, location.lon], { icon: pin, keyboard: false, title: location.name })
      .addTo(layer).bindTooltip(label, { permanent: true, direction: 'top', className: 'location-pin-label' })
    let bounds = L.latLngBounds(cell.rect)
    if (location.extent && AREA_KINDS.has(location.kind)) bounds = bounds.extend(bboxBounds(location.extent))
    map.frame(bounds, { padding: [32, 32], maxZoom: 11 })
    return undefined
  }, [location])

  const isState = location?.kind === 'State' && location.region
  const place = location?.main || location?.name
  return (
    <div className="where-map">
      <div ref={ref} className="location-map" role="region"
        aria-label="Map. Click a spot to choose it; the address box does the same by keyboard." />
      <div className="where-map-card" aria-live="polite">
        {!location && <p className="where-map-key"><Icon name="pointer" size={16} />Search for a place, or click the map to pick a spot.</p>}
        {isState && (
          <>
            <b>{place} is a whole state.</b>
            <p>A household report looks at one spot. Pick a city, ZIP code or address in {place}, or look at the state as a whole.</p>
            <ButtonLink href={`/explore?region=${location.region}`} size="sm" variant="secondary" icon="map">Look at {place} as a whole</ButtonLink>
          </>
        )}
        {location && !isState && (
          <p className="where-map-key"><i className="where-map-swatch" aria-hidden="true" />Most numbers in the report are averages over this ~50 km square (the NASA POWER and MERRA-2 grid), not one street.</p>
        )}
      </div>
    </div>
  )
}
