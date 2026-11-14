import { useState } from 'react'
import HealthConditionPage from './pages/HealthConditionPage'
import LocationPage from './pages/LocationPage'
import LoadingPage from './pages/LoadingPage'
import ReportPage from './pages/ReportPage'
import './App.css'

const pages = [
  { label: '1. Health', component: HealthConditionPage },
  { label: '2. Location', component: LocationPage },
  { label: '3. Loading', component: LoadingPage },
  { label: '4. Report', component: ReportPage },
]

export default function App() {
  const [activePage, setActivePage] = useState(0)
  const Page = pages[activePage].component

  return (
    <>
      <nav className="preview-nav" aria-label="Page preview">
        {pages.map((page, index) => (
          <button
            key={page.label}
            type="button"
            aria-pressed={activePage === index}
            onClick={() => setActivePage(index)}
          >
            {page.label}
          </button>
        ))}
      </nav>

      <Page />
    </>
  )
}