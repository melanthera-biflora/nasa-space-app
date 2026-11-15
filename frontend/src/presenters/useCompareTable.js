import { useEffect, useState } from 'react'
import { fetchCompareTable } from '../api/compare'
import { fetchReport } from '../api/report'

/** The comparison table, or the error sentence. */
export function useCompareTable() {
  const [state, setState] = useState({ table: null, error: '' })
  useEffect(() => {
    const c = new AbortController()
    fetchCompareTable(c.signal).then((table) => setState({ table, error: '' }))
      .catch((err) => { if (!c.signal.aborted) setState({ table: null, error: err.message }) })
    return () => c.abort()
  }, [])
  return state
}

/** Yearly points of the chosen factors for the places in a side-by-side comparison (household-neutral reports). */
export function useComparePoints(places, factorKeys) {
  const key = JSON.stringify([places.map((p) => [p.name, p.lat, p.lon]), factorKeys])
  const [state, setState] = useState({ key: '', byPlace: {}, loading: false })
  useEffect(() => {
    const [list] = JSON.parse(key)
    if (!list.length) return undefined
    const c = new AbortController()
    Promise.all(list.map(([name, lat, lon]) => fetchReport({ household: [], location: { lat, lon }, period: 25 }, c.signal)
      .then((r) => [name, r.factors]).catch(() => [name, null])))
      .then((rows) => { if (!c.signal.aborted) setState({ key, byPlace: Object.fromEntries(rows), loading: false }) })   // a closed view keeps no half answer
    return () => c.abort()
  }, [key])
  return state.key === key ? state : { byPlace: {}, loading: places.length > 0 }
}
