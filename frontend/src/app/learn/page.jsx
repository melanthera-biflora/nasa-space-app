import { Suspense } from 'react'
import Footer from '../../components/Footer'
import SiteHeader from '../../components/detective/SiteHeader'
import LearnView from '../../views/LearnView'

export const metadata = { title: 'How a trend detective works · Climatch' }

export default function Page() {
  return (
    <div className="dt-page">
      <Suspense fallback={<div className="dt-header" />}><SiteHeader /></Suspense>
      <LearnView />
      <Footer />
    </div>
  )
}
