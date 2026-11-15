import { Suspense } from 'react'
import TestView from '../../../views/TestView'

export const metadata = { title: 'Is the trend real · Climatch' }

export default function Page() {
  return <Suspense fallback={<main className="dt-main"><p className="dt-status">Loading…</p></main>}><TestView /></Suspense>
}
