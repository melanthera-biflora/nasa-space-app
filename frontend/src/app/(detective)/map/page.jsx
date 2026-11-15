import { Suspense } from 'react'
import MapView from '../../../views/MapView'

export const metadata = { title: 'Where else is it changing · Climatch' }

export default function Page() {
  return <Suspense fallback={<main className="dt-main"><p className="dt-status">Loading…</p></main>}><MapView /></Suspense>
}
