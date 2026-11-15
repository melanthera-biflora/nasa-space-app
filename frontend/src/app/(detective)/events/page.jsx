import { Suspense } from 'react'
import EventsView from '../../../views/EventsView'

export const metadata = { title: 'Spike or trend · Climatch' }

export default function Page() {
  return <Suspense fallback={<main className="dt-main"><p className="dt-status">Loading…</p></main>}><EventsView /></Suspense>
}
