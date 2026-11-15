import { Suspense } from 'react'
import Footer from '../../components/Footer'
import SiteHeader from '../../components/detective/SiteHeader'
import AboutView from '../../views/AboutView'

export const metadata = { title: 'About the data and the tests · Climatch' }

export default function Page() {
  return (
    <div className="dt-page">
      <Suspense fallback={<div className="dt-header" />}><SiteHeader /></Suspense>
      <AboutView />
      <Footer />
    </div>
  )
}
