import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import QuestionnaireLayout from '../components/QuestionnaireLayout'
import { searchLocation } from '../api/location'
import './LocationPage.css'

function LocationMap({ location }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)

  useEffect(() => {
    const map = L.map(containerRef.current).setView(
      [39.5, -98.35],
      4
    )

    L.tileLayer(
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }
    ).addTo(map)

    mapRef.current = map

    // Giúp bản đồ nhận đúng kích thước khi trang vừa xuất hiện.
    const observer = new ResizeObserver(() => {
      map.invalidateSize()
    })
    observer.observe(containerRef.current)

    return () => {
      observer.disconnect()
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !location) return

    if (markerRef.current) {
      markerRef.current.remove()
    }

    const pin = L.divIcon({
      className: 'location-pin-wrapper',
      html: '<span class="location-pin"></span>',
      iconSize: [30, 38],
      iconAnchor: [15, 38],
      tooltipAnchor: [0, -38],
    })

    // Dùng textContent để tên địa điểm được hiển thị như văn bản.
    const label = document.createElement('span')
    label.textContent = location.name

    markerRef.current = L.marker(
      [location.lat, location.lon],
      {
        icon: pin,
        keyboard: true,
        title: location.name,
      }
    )
      .addTo(map)
      .bindTooltip(label, {
        permanent: true,
        direction: 'top',
        className: 'location-pin-label',
      })

    map.setView([location.lat, location.lon], 13)
  }, [location])

  return (
    <div
      ref={containerRef}
      className="location-map"
      aria-label="Map showing the selected location"
    />
  )
}

function formatCoordinates({ lat, lon }) {
  const latitude = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`
  const longitude = `${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`

  return `${latitude}, ${longitude}`
}

export default function LocationPage({ onCheckResult }) {
  const [address, setAddress] = useState('')
  const [location, setLocation] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState('')
  const requestRef = useRef(null)

  useEffect(() => {
    return () => requestRef.current?.abort()
  }, [])

  async function handleSearch(event) {
    event.preventDefault()

    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller

    setIsSearching(true)
    setError('')
    setLocation(null)

    try {
      const result = await searchLocation(
        address,
        controller.signal
      )

      if (!controller.signal.aborted) {
        setLocation(result)
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err.message || 'Could not find the location.')
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsSearching(false)
      }
    }
  }

  function handleAddressChange(event) {
    requestRef.current?.abort()
    setAddress(event.target.value)
    setLocation(null)
    setError('')
    setIsSearching(false)
  }

  return (
    <QuestionnaireLayout
      illustration={
        <section className="location-map-card" aria-label="Selected location map">
          <LocationMap location={location} />
        </section>
      }
    >
      <section className="questionnaire-card location-card">
        <div className="questionnaire-card-heading">
          <h2>Location information</h2>
          <span>STEP 02 / 02</span>
        </div>

        <form className="location-form" onSubmit={handleSearch}>
          <h3>Where is the home you’re considering?</h3>
          <p className="location-description">
            Enter an address to find it on the map.
          </p>

          <label htmlFor="home-address">
            Address or place
          </label>

          <div className="location-search">
            <input
              id="home-address"
              type="search"
              value={address}
              onChange={handleAddressChange}
              placeholder="e.g. Phoenix, Arizona"
              required
            />

            <button
              type="submit"
              disabled={isSearching || !address.trim()}
            >
              {isSearching ? 'Finding…' : 'Search'}
            </button>
          </div>

          <p className="location-demo-note">
            Demo mode: searches return the location from
            the sample report, regardless of the address entered.
          </p>

          <div aria-live="polite" aria-atomic="true">
            {isSearching && (
              <p className="location-message">
                Finding your location…
              </p>
            )}

            {error && (
              <p className="location-error" role="alert">
                {error}
              </p>
            )}

            {location && (
              <div className="location-selected">
                <span>SELECTED LOCATION · SAMPLE DATA</span>
                <strong>{location.name}</strong>
                <p>{formatCoordinates(location)}</p>
              </div>
            )}
          </div>

          <div className="location-action">
            <button
              className="location-result-button"
              type="button"
              disabled={
                !location ||
                isSearching ||
                !onCheckResult
              }
              onClick={() => onCheckResult?.(location)}
            >
              CHECK YOUR RESULT
            </button>

            {!onCheckResult && (
              <p className="location-demo-note">
                Report navigation will be connected next.
              </p>
            )}
          </div>
        </form>
      </section>
    </QuestionnaireLayout>
  )
}
