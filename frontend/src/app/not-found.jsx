import Link from 'next/link'
import { Suspense } from 'react'
import Footer from '../components/Footer'
import SiteHeader from '../components/detective/SiteHeader'

export const metadata = { title: 'Page not found · Climatch' }

// Any address the app doesn't have: the site's own header, one plain sentence and the ways back in (was Next.js's bare
// "404 | This page could not be found").
export default function NotFound() {
  return (
    <div className="dt-page">
      <Suspense fallback={<div className="dt-header" />}><SiteHeader /></Suspense>
      <main className="dt-main" id="main">
        <h1 tabIndex={-1}>This page doesn&apos;t exist</h1>
        <p className="dt-lede">The link may be mistyped or out of date. Start from one of these instead.</p>
        <nav className="dt-next-row" aria-label="Where to go">
          <Link className="dt-next" href="/">Check a place for your household</Link>
          <Link className="dt-next" href="/compare">Compare places</Link>
          <Link className="dt-next" href="/learn">How to read a climate trend</Link>
        </nav>
      </main>
      <Footer />
    </div>
  )
}
