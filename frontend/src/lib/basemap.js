import L from 'leaflet'

// Grey OpenStreetMap drawn ABOVE the data and multiplied in (see .basemap-multiply in Maps.css):
// borders, roads and names stay readable over the colours, and no tile key is needed.
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

export function addBasemap(map) {
  const pane = map.createPane('basemap')
  pane.classList.add('basemap-multiply')
  pane.style.zIndex = 450              // above data overlays (400), below markers (600)
  pane.style.pointerEvents = 'none'
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { pane: 'basemap', maxZoom: 19, attribution: ATTRIBUTION }).addTo(map)
}

// White over everything outside the lower 48 (a world polygon with each state's rings as holes), between the data and
// the basemap: the grid squares stop at the coast and the borders, and stay sharp at any zoom. `smoothFactor: 0` keeps
// shared state borders identical, so no white hairlines show between states. The white matches .map-canvas (Maps.css).
export function addLandMask(map, rings) {
  const pane = map.getPane('mask') || map.createPane('mask')
  pane.style.zIndex = 420              // above data overlays (400), below the multiplied basemap (450)
  pane.style.pointerEvents = 'none'
  const world = [[85, -360], [85, 360], [-85, 360], [-85, -360]]
  return L.polygon([world, ...rings.map((r) => r.map(([lon, lat]) => [lat, lon]))],
    { pane: 'mask', stroke: false, fillColor: '#fff', fillOpacity: 1, smoothFactor: 0, interactive: false }).addTo(map)
}

// A state picked in the URL (region=XX): its outline over the squares. Returns the layer and the state's bounds.
export function addStateOutline(map, outline, color) {
  const layer = L.polygon(outline.rings.map((r) => r.map(([lon, lat]) => [lat, lon])),
    { color, weight: 2, fill: false, interactive: false, pane: 'markerPane' }).addTo(map)
  const [w, s, e, n] = outline.bbox
  return { layer, bounds: [[s, w], [n, e]] }
}
