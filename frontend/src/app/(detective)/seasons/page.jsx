import { Suspense } from 'react'
import SeasonsView from '../../../views/SeasonsView'

export const metadata = { title: 'Which seasons are changing · Climatch' }

export default function Page() {
  return <Suspense fallback={<main className="dt-main"><p className="dt-status">Loading…</p></main>}><SeasonsView /></Suspense>
}
