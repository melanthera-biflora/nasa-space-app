'use client'
import '../../App.css'
import { useRouter } from 'next/navigation'
import { CASES } from '../../cases'
import { saveHousehold, useHousehold } from '../../lib/household'
import HealthConditionPage from '../../screens/HealthConditionPage'

const caseHref = (c) => `/report?${new URLSearchParams({ lat: c.place.lat, lon: c.place.lon, name: c.place.name, case: c.id })}`

// Step 1, the front door (SPEC A3): who lives here. The answer is kept in this tab only, then the visitor picks a place.
// Coming back shows the saved answers (the form remounts once they are read). An example opens its report with its own
// household and leaves the visitor's alone (ReportView reads it from the case).
export default function HomeView() {
  const router = useRouter()
  const saved = useHousehold()
  return (
    <>
      <nav className="app-nav" aria-label="Examples">
        <span>New here? Open an example:</span>
        {CASES.map((c) => (
          <button key={c.id} type="button" onClick={() => router.push(caseHref(c))}>{c.label}</button>
        ))}
      </nav>
      <HealthConditionPage key={saved.length ? 'saved' : 'new'} initial={saved} onNext={(people) => { saveHousehold(people); router.push('/where') }} />
    </>
  )
}
