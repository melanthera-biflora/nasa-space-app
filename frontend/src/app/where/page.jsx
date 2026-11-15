import { Suspense } from 'react'
import SiteHeader from '../../components/detective/SiteHeader'
import { WhereView } from '../flow'

export const metadata = { title: 'Choose a place · Climatch' }

export default function Page() {
  return (
    <>
      <Suspense fallback={<div className="dt-header" />}><SiteHeader /></Suspense>
      <WhereView />
    </>
  )
}
