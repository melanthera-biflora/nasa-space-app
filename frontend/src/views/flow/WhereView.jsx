'use client'
import '../../App.css'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Icon from '../../components/ui/Icon'
import LocationPage from '../../screens/LocationPage'

// Step 2: where. A place in mind (the team's search and map), or compare places for this household.
export default function WhereView() {
  const router = useRouter()
  const open = (place) => router.push(`/report?${new URLSearchParams({ lat: place.lat, lon: place.lon, name: place.name || '' })}`)
  return (
    <>
      <nav className="app-nav flow-paths" aria-label="Ways to choose a place">
        <Link href="/" className="flow-back"><Icon name="chevron-right" size={16} className="flip" />Change your household</Link>
        <span className="flow-or">Not sure where yet?</span>
        <Link href="/compare" className="flow-compare"><Icon name="scale" size={16} />Compare places for your household</Link>
      </nav>
      <LocationPage onCheckResult={open} />
    </>
  )
}
