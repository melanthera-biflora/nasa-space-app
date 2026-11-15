import { Suspense } from 'react'
import Footer from '../../components/Footer'
import ContextBar from '../../components/detective/ContextBar'
import ContextStrip from '../../components/detective/ContextStrip'
import LinkNote from '../../components/detective/LinkNote'
import SideMenu from '../../components/detective/SideMenu'
import SiteHeader from '../../components/detective/SiteHeader'
import StepNav from '../../components/detective/StepNav'

// The detective pages: the top bar, a full-height side menu (the steps with the open page's sections, then the
// settings panel) and the page, which ends with the footer. From 1024 px the side menu sits on the left and can fold to
// a rail; below that it is a drawer (a native popover: Escape and a tap outside close it) opened from the strip under
// the top bar. Everything that reads the URL sits inside Suspense, or the build fails.
export default function DetectiveLayout({ children }) {
  return (
    <div className="dt-page has-side">
      <Suspense fallback={<div className="dt-header" />}><SiteHeader /></Suspense>
      <Suspense fallback={<div className="dt-strip" />}><ContextStrip /></Suspense>
      <div className="dt-shell">
        <SideMenu>
          <Suspense fallback={<nav className="dt-steps" />}><StepNav /></Suspense>
          <Suspense fallback={<div className="dt-context" />}><ContextBar /></Suspense>
        </SideMenu>
        <div className="dt-content">
          <Suspense fallback={null}><LinkNote /></Suspense>
          {children}
          <Footer />
        </div>
      </div>
    </div>
  )
}
