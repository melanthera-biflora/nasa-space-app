import L from 'leaflet'

export const motionOK = () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches
export const ZOOM_KEY = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? '⌘' : 'Ctrl'

// Cooperative map gestures, so a map never traps the page's scroll:
// - Ctrl/⌘ + wheel (a trackpad pinch arrives the same way) always zooms the map;
// - after a click inside the map, the plain wheel zooms it too, until the pointer leaves;
// - otherwise the page scrolls on and a short hint over the map says how to zoom;
// - on touch screens one finger scrolls the page and two fingers pinch and move the map.
// Returns a cleanup function.
export function cooperativeZoom(map) {
  const el = map.getContainer()
  const hint = L.DomUtil.create('div', 'map-hint', el)
  hint.setAttribute('aria-hidden', 'true')
  let active = false
  let acc = 0
  let timer = null
  map.scrollWheelZoom.disable()
  if (L.Browser.mobile) map.dragging.disable()

  const show = (text) => {
    hint.textContent = text
    hint.classList.add('is-on')
    clearTimeout(timer)
    timer = setTimeout(() => hint.classList.remove('is-on'), 1400)
  }
  const activate = () => { active = true; el.classList.add('is-map-active'); hint.classList.remove('is-on') }
  const deactivate = () => { active = false; acc = 0; el.classList.remove('is-map-active') }
  const onWheel = (e) => {
    if (!(e.ctrlKey || e.metaKey || active)) {
      show(`Hold ${ZOOM_KEY} and scroll to zoom, or click the map first`)
      return
    }
    e.preventDefault()
    acc += e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY   // lines to pixels
    if (Math.abs(acc) < 60) return                         // trackpads send many small steps
    const step = map.options.zoomDelta || 1
    map.setZoomAround(map.mouseEventToContainerPoint(e), map.getZoom() + (acc < 0 ? step : -step))
    acc = 0
  }
  const onTouchMove = (e) => { if (L.Browser.mobile && e.touches.length === 1) show('Use two fingers to move the map') }

  el.addEventListener('wheel', onWheel, { passive: false })
  el.addEventListener('mousedown', activate)
  el.addEventListener('mouseleave', deactivate)
  el.addEventListener('touchmove', onTouchMove, { passive: true })
  return () => {
    clearTimeout(timer)
    hint.remove()                    // the container can be reused (React mounts effects twice in development)
    el.classList.remove('is-map-active')
    el.removeEventListener('wheel', onWheel)
    el.removeEventListener('mousedown', activate)
    el.removeEventListener('mouseleave', deactivate)
    el.removeEventListener('touchmove', onTouchMove)
  }
}
