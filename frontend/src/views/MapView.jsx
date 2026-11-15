'use client'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useDetective } from '../lib/query'
import { detectiveQuery, variableLabel, variablesFor } from '../presenters/detective'
import { FRAME_FIELDS } from '../presenters/timeMap'

// Leaflet needs the browser, so the maps load only on the client.
// the map's own size in a placeholder while its code arrives, so the page doesn't jump (round 5)
const loading = () => <div className="map-canvas map-canvas-us ui-skel" aria-hidden="true" />
const TimeMap = dynamic(() => import('../components/TimeMap'), { ssr: false, loading })
const TrendMap = dynamic(() => import('../components/TrendMap'), { ssr: false, loading })
const MAPPED = { pm25: 'Fine particles (PM2.5)', no2: 'Nitrogen dioxide (NO₂)', fires: 'Fire detections', smoke_days: 'Smoke days', aod: 'Haze' }

// Step 5: where else? First the records year by year (D36), then the trend test on every square; "compare" on a
// square opens it in Explore.
export default function MapView() {
  const d = useDetective()
  const router = useRouter()
  const here = d.place.kind === 'point' ? { lat: d.place.lat, lon: d.place.lon, name: d.name } : null
  const region = d.place.kind === 'state' ? d.place.code : null
  const framed = FRAME_FIELDS.some((f) => f.key === d.variable) ? d.variable : 'pm25'
  return (
    <main className="dt-main" id="main">
      <h1 tabIndex={-1}>Where else in the US is it changing?</h1>
      <p className="dt-lede">Watch a record change across the lower 48, year by year, then see where the change passes the trend test.</p>
      <section className="dt-chart" aria-labelledby="years">
        <h2 id="years" className="dt-chart-title">Year by year</h2>
        <p className="dt-takeaway">Press play to run from the first year to the latest. Every year uses the same colours; “Change from the start” shows each year against the record’s first five.</p>
        <TimeMap initial={framed} here={here} region={region} onRecord={(k) => { if (variablesFor(d.place).includes(k)) d.set({ var: k }) }} />
      </section>
      <section className="dt-chart" aria-labelledby="trend">
        <h2 id="trend" className="dt-chart-title">Where the change is clear</h2>
        <p className="dt-takeaway">The same test on every ~50 km square. Squares are coloured only where the trend passes a map-wide check for false discoveries; the rest are grey and hatched. Pick a square, then “Open this square in Explore” to look closer.</p>
        <TrendMap factorKey={d.variable} factorLabel={MAPPED[d.variable] || variableLabel(d.place, d.variable)} here={here} region={region}
          onPickPlace={(p) => router.push(`/explore${detectiveQuery({ lat: p.lat, lon: p.lon, name: p.name, variable: p.variable })}`)} />
      </section>
    </main>
  )
}
