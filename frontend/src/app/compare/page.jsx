import { Suspense } from 'react'
import Footer from '../../components/Footer'
import SiteHeader from '../../components/detective/SiteHeader'
import CompareView from '../../views/CompareView'

export const metadata = { title: 'Compare places for your household · Climatch' }

export default function Page() {
  return (
    <div className="dt-page">
      <Suspense fallback={<div className="dt-header" />}><SiteHeader /></Suspense>
      <CompareView />
      <Footer />
    </div>
  )
}
