import { Suspense } from 'react'
import SiteHeader from '../../components/detective/SiteHeader'
import { ReportView } from '../flow'

export const metadata = { title: 'Your climate report · Climatch' }

export default function Page() {
  return (
    <>
      <Suspense fallback={<div className="dt-header" />}><SiteHeader /></Suspense>
      <Suspense fallback={<div className="flow-blank" aria-busy="true" />}><ReportView /></Suspense>
    </>
  )
}
