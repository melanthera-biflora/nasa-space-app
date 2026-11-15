import { Suspense } from 'react'
import PatternsView from '../../../views/PatternsView'

export const metadata = { title: 'What moves together · Climatch' }

export default function Page() {
  return <Suspense fallback={<main className="dt-main"><p className="dt-status">Loading…</p></main>}><PatternsView /></Suspense>
}
