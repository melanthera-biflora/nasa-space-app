import { useEffect, useId, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { fetchStateOutline } from '../api/location'
import { addBasemap, addLandMask, addStateOutline } from '../lib/basemap'
import { paint } from '../lib/fieldPaint'
import { cooperativeZoom, motionOK, ZOOM_KEY } from '../lib/mapGestures'
import { isMoveKey, panStep, stepSquare } from '../presenters/trendMap'
import { areaOf, AREAS, BOUNDS, caption, fadeFor, fieldsFor, frameField, frameLegend, lineLabel, meanLine, nextFrame, paintView, SPEEDS, squareAt, squareText, switchArea, ticks, useMapFrames, VIEWS, yearLabel } from '../presenters/timeMap'
import Icon from './ui/Icon'
import Segmented from './ui/Segmented'
import './Maps.css'
import './TimeMap.css'

const SHOWN = 0.92
const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

// "How it changed, year by year" (D36): a view. Every frame is painted once into its own image overlay in one pane
// (the pane holds the 0.92 opacity), and the new year fades in ON TOP of the last one, which is hidden once covered:
// fading both at once let the white base show through mid-way, so the map seemed to breathe. Instant with reduced
// motion. Squares stay squares (one NASA grid box each); on the lower-48 map a white mask cuts them at the coast and
// the borders, and the North America map (sea temperature and three records past the border) has no mask.
// Opens paused on the latest year; Play runs from the first. presenters/timeMap.js gives the words, the line, the legend.
export default function TimeMap({ initial = 'pm25', here, region = null, onRecord }) {
  const ref = useRef(null)
  const layersRef = useRef(null)
  // the record follows the page's (URL) record; a chip choice the place can't take stays local (round 3)
  const [pick, setPick] = useState({ for: initial, key: initial })
  const key = pick.for === initial ? pick.key : initial
  const area = areaOf(key)
  const setKey = (k) => { setPick({ for: initial, key: k }); onRecord?.(k) }
  const [view, setView] = useState('level')
  const [speed, setSpeed] = useState(1000)
  const [playing, setPlaying] = useState(false)
  const [played, setPlayed] = useState(false)      // "Replay" only after a run has ended
  const [at, setAt] = useState({ key: '', i: 0 })
  const [hover, setHover] = useState(null)
  const [byKey, setByKey] = useState(false)          // the readout speaks only for keyboard moves, not every mouse move
  const { frames, error } = useMapFrames(key)
  const last = frames ? frames.years.length - 1 : 0
  const i = frames && at.key === key ? Math.min(at.i, last) : last
  const go = (n) => setAt({ key, i: Math.max(0, Math.min(last, n)) })
  const captionId = useId()
  const fade = fadeFor(speed)
  const mapRef = useRef(null)
  const frameRef = useRef([BOUNDS.us, {}])     // the last framing, applied again when the map changes size
  const [mask, setMask] = useState(null)

  useEffect(() => {
    // keyboard: false, because the arrow keys move between squares (see onKeyDown)
    const map = L.map(ref.current, { keyboard: false, zoomSnap: 0.25, zoomDelta: 0.5, minZoom: 3, maxZoom: 8 })
    const stopGestures = cooperativeZoom(map)
    addBasemap(map)
    map.createPane('frames').style.opacity = SHOWN
    map.fitBounds(...frameRef.current)
    layersRef.current = { frames: L.layerGroup().addTo(map), marks: L.layerGroup().addTo(map), images: new Map(), current: null, z: 1 }
    map.on('mousemove click', (e) => { setByKey(false); setHover(e.latlng) })
    map.on('mouseout', () => setHover(null))
    mapRef.current = map
    const c = new AbortController()
    fetchStateOutline('L48', c.signal).then((o) => setMask(addLandMask(map, o.rings))).catch(() => {})   // no outline: squares as before
    // framed again on a new size: a phone lays the map out after the first fit, which left a state at the US zoom
    const observer = new ResizeObserver(() => { map.invalidateSize(); map.fitBounds(...frameRef.current) })
    observer.observe(ref.current)
    return () => { c.abort(); stopGestures(); observer.disconnect(); map.remove() }
  }, [])

  // A state in the URL (region=XX): its outline over the squares, and the lower-48 map framed on it; Home shows the area
  useEffect(() => {
    const map = mapRef.current
    if (!map || !region) return undefined
    const c = new AbortController()
    let outline = null
    fetchStateOutline(region, c.signal).then((o) => {
      const added = addStateOutline(map, o, token('--ink'))
      outline = added.layer
      if (area !== 'us') return              // North America stays framed whole, with the state outlined
      frameRef.current = [added.bounds, { padding: [24, 24], animate: false }]   // framing on load, not a motion
      map.fitBounds(...frameRef.current)
    }).catch(() => {})                       // no outline: the lower 48 as before
    return () => { c.abort(); outline?.remove(); frameRef.current = [BOUNDS.us, {}] }
  }, [region, area])

  // The area: the white land mask only on the lower-48 map, and the map framed on the area (the lower 48 on a state)
  useEffect(() => {
    const map = mapRef.current
    if (mask) { if (area === 'us') mask.addTo(map); else mask.remove() }
    if (!map || (region && area === 'us')) return
    frameRef.current = [BOUNDS[area], {}]
    map.fitBounds(...frameRef.current)
  }, [area, mask, region])

  // New frames or view: drop the old images, then paint the rest one per tick so Play never waits on a frame.
  useEffect(() => {
    const l = layersRef.current
    l.frames.clearLayers(); l.images = new Map(); l.current = null; l.add = null; l.z = 1
    if (!frames) return undefined
    l.add = (k) => {
      if (!l.images.has(k)) {
        const img = paint(frameField(frames, k, view), paintView(view), undefined, frames.area ? 4 : 8)
        l.images.set(k, L.imageOverlay(img.url, img.bounds, { pane: 'frames', className: 'tl-frame', opacity: 0, alt: '', interactive: false }).addTo(l.frames))
      }
      return l.images.get(k)
    }
    let k = 0, timer
    const next = () => { if (k > frames.years.length - 1) return; l.add(k++); timer = setTimeout(next, 16) }
    timer = setTimeout(next, 120)
    return () => clearTimeout(timer)
  }, [frames, view])

  const { label, note } = fieldsFor(area).find((f) => f.key === key) ?? {}
  const across = area === 'na' ? 'across North America' : 'across the lower 48'
  useEffect(() => {
    const l = layersRef.current
    if (!l.add) return undefined
    const image = l.add(i), old = l.current
    image.setZIndex(++l.z).setOpacity(1)      // on top (setZIndex: moving the element in the page would cancel the fade)
    image.getElement()?.setAttribute('alt', `${label}, ${yearLabel(frames, i)}, ${across}`)
    l.current = image
    if (!old || old === image) return undefined
    old.getElement()?.setAttribute('alt', '')
    const wait = motionOK() ? fade : 0
    const timer = setTimeout(() => old.setOpacity(0), wait)       // hidden once the new year covers it
    return () => { clearTimeout(timer); old.setOpacity(0) }
  }, [frames, view, i, label, fade, across])

  useEffect(() => {
    if (!playing || !frames) return undefined
    const timer = setTimeout(() => {
      const n = nextFrame(i, frames.years.length)
      if (n == null) setPlaying(false)
      else setAt({ key, i: n })
    }, speed)
    return () => clearTimeout(timer)
  }, [playing, frames, i, key, speed])

  useEffect(() => {       // a hidden tab stops the film; it doesn't run on unseen
    const stop = () => { if (document.hidden) setPlaying(false) }
    document.addEventListener('visibilitychange', stop)
    return () => document.removeEventListener('visibilitychange', stop)
  }, [])

  const hereLat = here?.lat, hereLon = here?.lon
  const sq = frames && (hover ? squareAt(frames, hover.lat, hover.lng) : Number.isFinite(hereLat) ? squareAt(frames, hereLat, hereLon) : null)
  const sqN = sq?.n
  useEffect(() => {
    const g = layersRef.current.marks
    g.clearLayers()
    const lons = frames?.grid.lons
    const box = sqN != null && squareAt(frames, frames.grid.lats[Math.floor(sqN / lons.length)], lons[sqN % lons.length])
    if (box) L.rectangle(box.bounds, { color: token('--ink'), weight: 1.25, fill: false, interactive: false, pane: 'markerPane' }).addTo(g)
    if (Number.isFinite(hereLat)) L.circleMarker([hereLat, hereLon], { radius: 5, color: token('--ink'), weight: 2, fillColor: token('--surface'), fillOpacity: 1, interactive: false, pane: 'markerPane' }).addTo(g)
  }, [frames, sqN, hereLat, hereLon])

  function onPlay() {
    if (playing) { setPlaying(false); return }
    if (i === last) go(0)
    setPlaying(true)
    setPlayed(true)
  }
  const step = (d) => { setPlaying(false); go(i + d) }

  // Keyboard, like the trend map: arrows move between squares, Shift + arrows pan, + and - zoom, Home shows the US
  function onKeyDown(e) {
    const map = mapRef.current
    if (e.key === 'Home' || e.key === '0') { e.preventDefault(); map.fitBounds(BOUNDS[area], { animate: motionOK() }); return }
    if (['+', '=', '-', '_'].includes(e.key)) { e.preventDefault(); map.setZoom(map.getZoom() + ((e.key === '+' || e.key === '=') ? 1 : -1) * map.options.zoomDelta); return }
    if (e.key === 'Escape') { setHover(null); return }
    if (!isMoveKey(e.key) || !frames) return
    e.preventDefault()
    if (e.shiftKey) { map.panBy(panStep(e.key), { animate: motionOK() }); return }
    const mid = map.getCenter()                       // nothing pointed at: start where the map looks, not Kansas
    const next = stepSquare(frames, sq || squareAt(frames, mid.lat, mid.lng), e.key)
    setByKey(true)
    setHover(L.latLng(next.lat, next.lon))
    map.panInside([next.lat, next.lon], { padding: [48, 48], animate: motionOK() })
  }
  const atEnd = !playing && i === last
  const replay = atEnd && played

  const line = frames && meanLine(frames, i, view)
  const lg = frames && frameLegend(frames, view)
  const read = sq && squareText(frames, sq, i, key, view, hover ? null : here?.name)
  const long = frames && (frames.span > 1 ? `${frames.years[i] - frames.span + 1} to ${frames.years[i]} average` : String(frames.years[i]))

  return (
    <figure className="map-figure tl">
      <div className="tl-toolbar">
        <Segmented legend="Area" hideLegend name="tl-area" size="sm" value={area} options={AREAS}
          onChange={(a) => { setPlaying(false); setKey(switchArea(key, a)) }} />
        <Segmented legend="Record" hideLegend name="tl-field" size="sm" value={key}
          options={fieldsFor(area).map((f) => ({ value: f.key, label: f.label }))} onChange={(k) => { setPlaying(false); setKey(k) }} />
        <Segmented legend="Show" hideLegend name="tl-view" size="sm" value={view} options={VIEWS} onChange={setView} />
      </div>
      <div className="tl-stage" style={{ '--tl-fade': `${fade}ms` }}>
        <div ref={ref} className="map-canvas map-canvas-us" role="region" tabIndex={0} aria-describedby={captionId} onKeyDown={onKeyDown}
          aria-label={`Map of ${label ?? 'the record'} ${across}, one year at a time. Arrow keys move between squares, Shift and arrows pan, plus and minus zoom, Home shows the whole map.`} />
        {frames && (
          <p className="tl-year" aria-hidden="true">
            {yearLabel(frames, i)}
            {frames.span > 1 && <small>{frames.span}-year average</small>}
          </p>
        )}
      </div>
      <figcaption>
        {error && <p className="map-note" role="alert">{error}</p>}
        {!frames && !error && <p className="map-note">Loading the yearly maps…</p>}
        {frames && (
          <>
            <div className="tl-player">
              <div className="tl-buttons">
                <button type="button" className="tl-play" onClick={onPlay} aria-label={playing ? 'Pause' : atEnd ? `${replay ? 'Replay' : 'Play'} ${yearLabel(frames, 0)} to ${yearLabel(frames, last)}` : 'Play'}>
                  <Icon name={playing ? 'pause' : replay ? 'replay' : 'play'} size={18} />
                </button>
                <button type="button" className="tl-step" onClick={() => step(-1)} disabled={i === 0} aria-label="Previous year"><Icon name="chevron-left" size={16} /></button>
                <button type="button" className="tl-step" onClick={() => step(1)} disabled={i === last} aria-label="Next year"><Icon name="chevron-right" size={16} /></button>
              </div>
              <div className="tl-track">
                <p className="tl-spark-head">
                  <span>{lineLabel(frames, view)}</span>
                  <b>{line.current ? `${line.current.text} ${frames.unit}` : '—'}</b>
                </p>
                <div className="tl-spark" aria-hidden="true">
                  <svg viewBox="0 0 100 32" preserveAspectRatio="none">
                    {line.zero != null && <line className="tl-zero" x1="0" x2="100" y1={32 - line.zero * 28 - 2} y2={32 - line.zero * 28 - 2} />}
                    <polyline points={line.points.map((p) => `${p.x * 100},${32 - p.y * 28 - 2}`).join(' ')} />
                  </svg>
                  {line.current && <i className="tl-dot" style={{ left: `${line.current.x * 100}%`, top: `${100 - (line.current.y * 28 + 2) / 0.32}%` }} />}
                </div>
                <input type="range" className="tl-range" min={0} max={last} step={1} value={i} aria-label="Year" aria-valuetext={long}
                  style={{ '--p': last ? i / last : 1 }} onChange={(e) => { setPlaying(false); go(Number(e.target.value)) }} />
                <div className="tl-ticks" aria-hidden="true">
                  {ticks(frames).map((t) => <span key={t.year} style={{ left: `${t.at * 100}%` }}>{t.year}</span>)}
                </div>
              </div>
              <Segmented legend="Speed" hideLegend name="tl-speed" size="sm" value={speed} options={SPEEDS} onChange={setSpeed} />
            </div>
            <p className="tl-caption" id={captionId} aria-live={playing ? 'off' : 'polite'}>{caption(frames, i, key, view)}</p>
            <p className="tl-readout" aria-live={byKey ? 'polite' : 'off'}>{read || <span className="map-muted">Point at the map, or use the arrow keys, to read one square.</span>}</p>
            <div className="tm-legend">
              <p className="tm-legend-title">{lg.title}</p>
              <div className="tm-ramp" style={{ gridTemplateColumns: `repeat(${lg.classes.length}, 1fr)` }} aria-hidden="true">
                {lg.classes.map((c) => <span key={c.k} className="tl-swatch" style={{ background: `var(${c.color})` }} />)}
              </div>
              <div className="tm-ramp-labels" aria-hidden="true">
                {lg.edges.map((e) => <span key={e.text} style={{ left: `${e.at * 100}%` }}>{e.text}</span>)}
              </div>
              <p className="tm-ramp-ends"><span>{lg.ends[0]}</span><span>{lg.ends[1]}</span></p>
            </div>
            <p className="map-note">
              Moving colours aren’t proof of a trend: one unusual year can colour the whole map.{area === 'us' && <> <a href="#trend">See where change is clear</a>.</>}
              {frames.span > 1 && ` ${label} are ${frames.span}-year averages, so one season doesn’t flicker the whole map.`}
              {' '}Same colours for every year. Source: {frames.source}.
            </p>
            <p className="map-note">
              {frames.coverage && `${frames.coverage} `}
              Each square is one grid box, about {key.startsWith('fires') ? '100' : key === 'sst' ? '80' : '50'} km across{area === 'us' ? ', cut at the coast and the border' : ''}: it is that box’s average, and finer detail isn’t in the data. The short fade between years is not data.
              {' '}Wheel zoom: click the map first, or hold <kbd>{ZOOM_KEY}</kbd>.
            </p>
            {note && <p className="map-note">{note}</p>}
          </>
        )}
      </figcaption>
    </figure>
  )
}
