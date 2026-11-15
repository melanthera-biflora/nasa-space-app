'use client'
import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { addBasemap } from '../lib/basemap'
import { cooperativeZoom } from '../lib/mapGestures'
import './Maps.css'

const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

// The comparison map: one dot per city, drawn by group in one neutral hue (filled = under all limits, ring = misses
// one, small dot = misses more). No red or green: words carry the judgement. Hovering a dot highlights its row and
// hovering a row outlines its dot; the list is the keyboard path (dots are not focusable on purpose).
export default function CompareMap({ cities, hovered, onHover, onPick }) {
  const ref = useRef(null)
  const mapRef = useRef(null)
  const layer = useRef(null)
  const markers = useRef(new Map())

  useEffect(() => {
    const map = L.map(ref.current, { zoomSnap: 0.25, minZoom: 2, maxZoom: 8 })
    const stop = cooperativeZoom(map)
    addBasemap(map)
    map.fitBounds([[24, -125], [50, -66]])
    layer.current = L.layerGroup().addTo(map)
    mapRef.current = map
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(ref.current)
    return () => { stop(); observer.disconnect(); map.remove() }
  }, [])

  useEffect(() => {
    const ink = token('--brand-12'), surface = token('--surface')
    layer.current.clearLayers()
    markers.current.clear()
    for (const c of cities) {
      const misses = c.total - c.met
      const style = misses === 0 ? { radius: 8, color: ink, weight: 1.5, fillColor: ink, fillOpacity: 0.9 }
        : misses === 1 ? { radius: 7, color: ink, weight: 2, fillColor: surface, fillOpacity: 1 }
          : { radius: 4, color: ink, weight: 1, fillColor: ink, fillOpacity: 0.35 }
      const m = L.circleMarker([c.lat, c.lon], { ...style, pane: 'markerPane' })
        .bindTooltip(`${c.name}: under ${c.met} of ${c.total}`, { direction: 'top', offset: [0, -6] })
        .on('mouseover', () => onHover(c.name)).on('mouseout', () => onHover(null)).on('click', () => onPick(c.name))
      m.baseStyle = style
      m.addTo(layer.current)
      markers.current.set(c.name, m)
    }
  }, [cities, onHover, onPick])

  useEffect(() => {
    for (const [name, m] of markers.current) {
      if (name === hovered) { m.setStyle({ weight: 3, radius: m.baseStyle.radius + 3 }); m.bringToFront() }
      else m.setStyle(m.baseStyle)
    }
  }, [hovered, cities])

  return <div ref={ref} className="map-canvas cmp-map" role="region" aria-label="Map of the 51 cities, marked by how many of your limits each meets. The list beside it has the same information." />
}
