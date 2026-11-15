import { Suspense } from 'react'
import SiteHeader from '../components/detective/SiteHeader'
import { HomeView } from './flow'

export const metadata = { title: 'Climatch: how the climate changed where your family might live' }

export default function Home() {
  return (
    <>
      <Suspense fallback={<div className="dt-header" />}><SiteHeader /></Suspense>
      <HomeView />
    </>
  )
}
