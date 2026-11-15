'use client'
import dynamic from 'next/dynamic'

// The team's screens use Leaflet and the window, so they render in the browser only. Until their code arrives the
// page shows the dusk background (no white flash).
const placeholder = () => <div className="flow-blank" aria-busy="true" />
export const HomeView = dynamic(() => import('../views/flow/HomeView'), { ssr: false, loading: placeholder })
export const WhereView = dynamic(() => import('../views/flow/WhereView'), { ssr: false, loading: placeholder })
export const ReportView = dynamic(() => import('../views/flow/ReportView'), { ssr: false, loading: placeholder })
