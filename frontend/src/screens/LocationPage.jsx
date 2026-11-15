import { useEffect, useRef, useState } from 'react'
import AddressSearch from '../components/AddressSearch'
import QuestionnaireLayout from '../components/QuestionnaireLayout'
import WhereMap from '../components/WhereMap'
import { reversePlace, searchLocation } from '../api/location'
import { townOf } from '../presenters/search'
import './LocationPage.css'

// 2 decimals (about 1 km): the data's squares are ~50 km, so 4 decimals claimed a precision nothing here has
function formatCoordinates({ lat, lon }) {
  const latitude = `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}`
  const longitude = `${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? 'E' : 'W'}`

  return `${latitude}, ${longitude}`
}

export default function LocationPage({ onCheckResult }) {
  const [address, setAddress] = useState('')
  const [mapText, setMapText] = useState('')     // the box text a map click wrote (no suggestions for it, L1)
  const [location, setLocation] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState('')
  const [leaving, setLeaving] = useState(false)
  const requestRef = useRef(null)
  const leaveTimerRef = useRef(null)

  useEffect(() => {
    return () => {
      requestRef.current?.abort()
      clearTimeout(leaveTimerRef.current)
    }
  }, [])

  // A click on the map: pin the spot at once, then ask for its name (Photon reverse). Outside the US it says so.
  function handlePickSpot({ lat, lng }) {
    requestRef.current?.abort()
    if (lat < 18 || lat > 72 || lng < -180 || lng > -65) {
      setLocation(null)
      setError('Pick a spot in the United States.')
      return
    }
    const controller = new AbortController()
    requestRef.current = controller
    const spot = { name: `Picked spot near ${lat.toFixed(3)}, ${lng.toFixed(3)}`, main: 'Picked spot', kind: 'Picked spot',
      lat: Number(lat.toFixed(4)), lon: Number(lng.toFixed(4)) }
    setLocation(spot)
    setAddress(spot.name)
    setMapText(spot.name)
    setError('')
    setIsSearching(false)
    reversePlace(lat, lng, controller.signal)
      .then((found) => {
        if (controller.signal.aborted) return
        const place = townOf(found)                    // the town, not the street: the report is about the area
        setLocation(place); setAddress(place.name); setMapText(place.name)
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        if (err.code === 'invalid_input') { setLocation(null); setError(err.message) }   // otherwise the plain pin stays
      })
  }

  // Fade the page out, then go to the loading page (instantly under reduced motion)
  function handleCheckResult() {
    if (leaving || !location) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onCheckResult?.(location)
      return
    }

    setLeaving(true)
    leaveTimerRef.current = setTimeout(() => onCheckResult?.(location), 500) // matches questionnaire-out
  }

  // A picked suggestion already has coordinates: pin it without another search
  function handlePick(place) {
    requestRef.current?.abort()
    setAddress(place.name)
    setLocation(place)
    setError('')
    setIsSearching(false)
  }

  async function handleSearch() {
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

  function handleAddressChange(text) {
    requestRef.current?.abort()
    setAddress(text)
    setLocation(null)
    setError('')
    setIsSearching(false)
  }

  return (
    <QuestionnaireLayout
      leaving={leaving}
      title="Where is the home?"
      description="Search an address, a city or a ZIP code, or click a spot on the map."
      illustration={
        <section className="location-map-card rise-in" style={{ '--i': 2 }} aria-label="Selected location map">
          <WhereMap location={location} onPickSpot={handlePickSpot} />
        </section>
      }
    >
      <section className="questionnaire-card location-card rise-in" style={{ '--i': 1 }}>
        <div className="questionnaire-card-heading">
          <h2>Location information</h2>
          <span>Step 2 of 2</span>
        </div>

        <div className="location-form">
          <h3>Where is the home you’re considering?</h3>
          <p className="location-description">Start typing an address, city or ZIP code.</p>

          <AddressSearch value={address} onChange={handleAddressChange} onPick={handlePick} onSubmit={handleSearch} busy={isSearching} quiet={mapText} />

          <div aria-live="polite" aria-atomic="true">
            {isSearching && <p className="location-message">Finding your location…</p>}
            {error && <p className="location-error" role="alert">{error}</p>}
            {location && (
              <div className="location-selected">
                <span>Selected place</span>
                <strong>{location.name}</strong>
                <p>{location.kind === 'State' ? 'A whole state: pick one spot in it for the household report.' : formatCoordinates(location)}</p>
              </div>
            )}
          </div>

          {/* only after a pick: a disabled button with no reason sat under an empty band (round 3) */}
          {location && location.kind !== 'State' && (
            <div className="location-action">
              <button
                className="location-result-button"
                type="button"
                disabled={isSearching || leaving || !onCheckResult}
                onClick={handleCheckResult}
              >
                {`See the report for ${location.name.split(',')[0]}`}
              </button>
            </div>
          )}
        </div>
      </section>
    </QuestionnaireLayout>
  )
}
