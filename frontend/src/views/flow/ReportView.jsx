'use client'
import '../../App.css'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchReport } from '../../api/report'
import Button, { ButtonLink } from '../../components/ui/Button'
import { CASES } from '../../cases'
import { useHousehold } from '../../lib/household'
import { detectiveQuery, readPlace } from '../../presenters/detective'
import LoadingPage from '../../screens/LoadingPage'
import ReportPage from '../../screens/ReportPage'

const PERIODS = [10, 15, 20, 25]

// Step 3: the personal report on its own URL (place and years only; the household comes from this tab). A report
// that comes back within 400 ms (already built) opens at once; a new place plays the team's analyzing screen while
// NASA data is fetched, and keeps it until both the animation and the report are done.
export default function ReportView() {
  const router = useRouter()
  const params = useSearchParams()
  const saved = useHousehold()
  const place = readPlace({ lat: Number(params.get('lat')), lon: Number(params.get('lon')), name: params.get('name') })
  const period = PERIODS.includes(Number(params.get('years'))) ? Number(params.get('years')) : 25
  const theCase = CASES.find((c) => c.id === params.get('case'))
  const household = theCase ? theCase.household : saved   // an example uses its own household and never saves it
  const key = place ? `${place.lat},${place.lon}|${period}|${JSON.stringify(household)}` : ''

  const [state, setState] = useState({ key: '', report: null, error: '' })
  const [attempt, setAttempt] = useState(0)
  const [analyzing, setAnalyzing] = useState(false)
  const [animationDone, setAnimationDone] = useState(false)
  const shownOnce = useRef(false)
  const loading = Boolean(key) && state.key !== key && !state.error

  useEffect(() => {
    if (!key) return undefined
    const c = new AbortController()
    // only the first load of this page gets the analyzing screen; later changes keep the report with "Updating…"
    const slow = shownOnce.current ? null : setTimeout(() => setAnalyzing(true), 400)
    fetchReport({ household, location: place, period }, c.signal)
      .then((rep) => {
        shownOnce.current = true
        setState({ key, report: { ...rep, location: { ...rep.location, name: place.name } }, error: '' })
      })
      .catch((err) => { if (!c.signal.aborted) setState((s) => ({ ...s, key, error: err.message })) })
      .finally(() => clearTimeout(slow))
    return () => { c.abort(); clearTimeout(slow) }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` covers place, period and household
  }, [key, attempt])

  const done = useCallback(() => setAnimationDone(true), [])
  const setPeriod = (p) => {
    const q = new URLSearchParams(params)
    if (p === 25) q.delete('years'); else q.set('years', p)
    router.replace(`/report?${q}`, { scroll: false })
  }
  const lookCloser = (variable) => detectiveQuery({ lat: place.lat, lon: place.lon, name: place.name, variable, years: period })

  if (!place) {
    return (
      <main className="app-error" id="main">
        <h1 tabIndex={-1}>Pick a place first</h1>
        <p>This link has no US place in it.</p>
        <div><ButtonLink href="/where" variant="primary" icon="search">Choose a place</ButtonLink></div>
      </main>
    )
  }
  const failed = state.error && state.key === key ? state.error : ''
  const retry = () => { setState((s) => ({ ...s, key: '', error: '' })); setAttempt((n) => n + 1) }
  if (failed && !state.report) {
    return (
      <main className="app-error" id="main" role="alert">
        <h1 tabIndex={-1}>We couldn’t build this report</h1>
        <p>{state.error}</p>
        <div>
          <Button variant="primary" onClick={() => { setState({ key: '', report: null, error: '' }); setAttempt((n) => n + 1) }}>Try again</Button>
          <ButtonLink href="/where" variant="secondary">Choose another place</ButtonLink>
        </div>
      </main>
    )
  }
  const report = state.report
  if (!report || (analyzing && !animationDone)) {
    if (!analyzing) return <main className="flow-blank" id="main" aria-busy="true" />
    return <LoadingPage location={place.name || `${place.lat}, ${place.lon}`} onComplete={done} ready={Boolean(report)} />
  }
  return (
    <ReportPage report={report} focus={theCase?.focus || params.get('focus')} question={theCase?.question || ''}
      period={period} onPeriodChange={setPeriod} updating={loading} failed={failed} onRetry={retry}
      household={theCase ? 'example' : saved.length ? 'own' : 'general'}
      onHome={() => router.push('/where')} lookCloser={lookCloser} />
  )
}
