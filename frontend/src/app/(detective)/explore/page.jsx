import { Suspense } from 'react'
import ExploreView from '../../../views/ExploreView'

export const metadata = { title: 'Look at the series · Climatch' }

export default function Page() {
  return <Suspense fallback={<main className="dt-main"><p className="dt-status">Loading…</p></main>}><ExploreView /></Suspense>
}
