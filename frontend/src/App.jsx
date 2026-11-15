import { useCallback, useState } from 'react'
import HealthConditionPage from './pages/HealthConditionPage'
import LocationPage from './pages/LocationPage'
import LoadingPage from './pages/LoadingPage'
import ReportPage from './pages/ReportPage'
import './App.css'

const PAGES = [
  { label: '1. Health' },
  { label: '2. Location' },
  { label: '3. Loading' },
  { label: '4. Report' },
]

export default function App() {
  const [activePage, setActivePage] = useState(0)
  const [household, setHousehold] = useState([])
  const [location, setLocation] = useState(null)

  const goTo = useCallback((index) => {
    setActivePage(index)
    window.scrollTo({ top: 0 })
  }, [])

  // useCallback để LoadingPage không bị reset bộ đếm mỗi lần App render lại
  const handleLoadingComplete = useCallback(() => goTo(3), [goTo])

  let page
  switch (activePage) {
    case 0:
      page = (
        <HealthConditionPage
          onNext={(data) => {
            setHousehold(data)
            goTo(1)
          }}
        />
      )
      break
    case 1:
      page = (
        <LocationPage
          onCheckResult={(loc) => {
            setLocation(loc)
            goTo(2)
          }}
        />
      )
      break
    case 2:
      page = (
        <LoadingPage
          location={location?.name}
          onComplete={handleLoadingComplete}
        />
      )
      break
    default:
      page = <ReportPage household={household} location={location} />
  }

  return (
    <>
      <nav className="preview-nav" aria-label="Page preview">
        {PAGES.map((p, index) => (
          <button
            key={p.label}
            type="button"
            aria-pressed={activePage === index}
            onClick={() => goTo(index)}
          >
            {p.label}
          </button>
        ))}
      </nav>

      {page}
    </>
  )
}