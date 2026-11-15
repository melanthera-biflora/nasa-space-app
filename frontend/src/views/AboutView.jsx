'use client'
import dynamic from 'next/dynamic'
import { useAboutReport, useRegions } from '../presenters/detective'
import { aboutRecords } from '../presenters/reportView'
import { Waiting } from './common'

// Leaflet needs the browser: the map loads there only (A2 boundary).
const FootprintMap = dynamic(() => import('../components/FootprintMap'), { ssr: false, loading: () => <div className="map-canvas" /> })

// Methods, data and honest limits: the "simple definitions" the challenge asks for, in one place.
export default function AboutView() {
  const regions = useRegions()
  const about = useAboutReport()
  return (
    <main className="dt-main dt-about" id="main">
      <h1 tabIndex={-1}>About the data and the tests</h1>
      <section aria-labelledby="recs-h">
        <h2 id="recs-h">Records in a household report</h2>
        <p className="dt-muted">Each record says what it is made from: a model estimate (NASA's MERRA-2 reanalysis, which blends weather
          observations into a model) or a satellite measurement, how big a square it averages over, and which years it covers.</p>
        <Waiting error={about.error} waiting={!about.report} subject="the record list" shape="list" />
        {about.report && (
          <dl className="dt-defs">
            {aboutRecords(about.report).map((r) => (
              <div key={r.key}><dt>{r.name} <span className="dt-muted">· {r.quality}</span></dt><dd>{r.definition} <span className="dt-muted">Data: {r.source}.</span></dd></div>
            ))}
          </dl>
        )}
      </section>
      <section aria-labelledby="vars-h">
        <h2 id="vars-h">Variables for a state</h2>
        <dl className="dt-defs">
          {(regions?.variables || []).map((v) => (
            <div key={v.key}><dt>{v.label} <span className="dt-muted">· {v.unit.replace(/ \(([^()]+)\)$/, ', $1')} · from {v.first_year}</span></dt><dd>{v.definition}</dd></div>
          ))}
        </dl>
        <p className="dt-muted">For an address, the weather variables are counts of days from NASA POWER's daily data (very hot days, warm nights, heavy rain…), defined on each card.</p>
      </section>
      <section aria-labelledby="tests-h">
        <h2 id="tests-h">The tests</h2>
        <ul>
          <li><b>Trend and its significance:</b> Mann-Kendall test on yearly values (p &lt; 0.05 = “clear trend”); rate per decade with a 95% range.</li>
          <li><b>Monthly test:</b> Seasonal Kendall, corrected for months that remember the month before (Hirsch 1982; Hipel 1994). In our simulations the uncorrected version gave false alarms 11–21% of the time; this one 5–6%.</li>
          <li><b>Seasons and months:</b> each season and calendar month tested on its own, then a Benjamini-Hochberg correction, because with 12 tests one would often look significant by luck.</li>
          <li><b>Years needed:</b> Weatherhead et al. (1998), from the noise and memory of the monthly values.</li>
          <li><b>Unusual months:</b> how many standard deviations a month sits from the same month in other years. Months that are zero in most years (frost in June) get none.</li>
          <li><b>Single years:</b> the yearly test is rerun without each year, so you can see whether one disaster year carries a trend.</li>
          <li><b>US map:</b> the same test on every grid square, with a false-discovery correction across the map (Wilks 2016).</li>
        </ul>
      </section>
      <section aria-labelledby="data-h">
        <h2 id="data-h">Data</h2>
        <ul>
          <li>NASA POWER (MERRA-2 reanalysis): weather, soil wetness and frost days, about 50 km squares; state averages use the Census 2024 state outlines.</li>
          <li>MERRA-2 aerosols (GES DISC): fine particles (PM2.5) and haze (aerosol optical depth), 2001–2025. PM2.5 is rebuilt without nitrate, so it can read low. OMI (Aura): nitrogen dioxide, 2005–2025. FIRMS (MODIS): fire detections, 2003–2025.</li>
          <li>NOAA Hazard Mapping System: smoke outlines drawn by analysts from satellite images, medium and thick smoke only, 2011–2025.</li>
          <li>NASA GPM IMERG: rain seen by satellites, about 10 km squares, 2001 to September 2025.</li>
          <li>NASA MODIS on Terra: how hot the ground gets (MOD11C3, about 5 km, and MOD11A2, 1 km); trends stop in 2022, when Terra's orbit drift starts to cool the readings.</li>
          <li>NASA/DLR GRACE and GRACE-FO: water stored in the ground, soil and snow, from tiny changes in gravity, about 300 km; no data from mid-2017 to mid-2018.</li>
          <li>Events: a hand-picked list of well-documented US events, each with its source (NOAA, NASA, state agencies, peer-reviewed studies).</li>
        </ul>
      </section>
      <section aria-labelledby="sees-h">
        <h2 id="sees-h">What NASA sees around an address</h2>
        <p>Each dataset averages over its own area, so no number in a report is one street. The map shows those areas around
          one example address, downtown Spokane, WA; a report says the same in one line.</p>
        <FootprintMap lat={47.66} lon={-117.43} name="Downtown Spokane, WA" />
      </section>
      <section aria-labelledby="limits-h">
        <h2 id="limits-h">What the data can't tell you</h2>
        <ul>
          <li>A state average blends cities, farms and mountains; a 50 km square smooths the worst local storm or the hottest street.</li>
          <li>“Consistent with an event” means the dates line up; it doesn't prove cause.</li>
          <li>Climatch describes the past. It makes no forecasts and gives no medical advice.</li>
        </ul>
      </section>
    </main>
  )
}
