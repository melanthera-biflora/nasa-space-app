import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { addBasemap } from '../lib/basemap'
import { footprints } from '../lib/footprints'
import { cooperativeZoom } from '../lib/mapGestures'
import './Maps.css'

const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

export default function FootprintMap({ lat, lon, name }) {
  const ref = useRef(null)
  const layers = footprints(lat, lon)

  useEffect(() => {
    const map = L.map(ref.current)
    const stopGestures = cooperativeZoom(map)
    addBasemap(map)
    for (const f of footprints(lat, lon)) {
      const style = { color: token(f.color), weight: 2, fillOpacity: 0.06, dashArray: f.dashed ? '6 5' : null }
      if (f.circle) L.circle([lat, lon], { ...style, radius: f.circle }).addTo(map)
      if (f.rect) L.rectangle(f.rect, style).addTo(map)
      if (f.outer) L.rectangle(f.outer, { ...style, dashArray: '4 4', fillOpacity: 0 }).addTo(map)
    }
    L.circleMarker([lat, lon], { radius: 5, color: token('--ink'), fillColor: token('--ink'), fillOpacity: 1 })
      .addTo(map).bindTooltip(name || 'This address')
    map.fitBounds(L.latLng(lat, lon).toBounds(120000))
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(ref.current)
    return () => { stopGestures(); observer.disconnect(); map.remove() }
  }, [lat, lon, name])

  return (
    <figure className="map-figure">
      <div ref={ref} className="map-canvas" role="region"
        aria-label={`Map of the areas each NASA dataset covers around ${name || 'this address'}. ${layers.map((f) => f.label).join('. ')}.`} />
      <figcaption>
        <ul className="map-legend">
          {layers.map((f) => (
            <li key={f.key}><i className={`map-swatch ${f.dashed ? 'is-dashed' : ''}`} style={{ borderColor: `var(${f.color})` }} />{f.label}</li>
          ))}
        </ul>
        <p className="map-note">None of these is your street: each number on this page is an average over its area.</p>
      </figcaption>
    </figure>
  )
}
