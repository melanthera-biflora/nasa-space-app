'use client'
import { useState } from 'react'
import BandChart from '../components/detective/BandChart'
import ChartFrame from '../components/detective/ChartFrame'
import { SelectField } from '../components/ui/Field'
import Skeleton from '../components/ui/Skeleton'
import WeekStrip from '../components/ui/WeekStrip'
import { format } from '../lib/format'
import { startWeek, useWeekly, weeklyFor, weekReadout, weekRows } from '../presenters/weekly'

const YEARS = Array.from({ length: 25 }, (_, i) => 2025 - i)

// "This year, week by week": the daily NASA POWER data behind a card, as 52 weeks against each week's usual range.
// Good for seeing a heat wave or a wet week; never a trend test (weekly values add noise, not evidence).
export default function WeeklySection({ place, variable, years, defaultYear }) {
  const w = weeklyFor(place, variable)
  const [picked, setPicked] = useState({ year: null, week: null, for: '' })
  const scope = `${place.lat},${place.lon}|${variable}`
  const year = (picked.for === scope && picked.year) || defaultYear || 2025
  const { data, error, loading } = useWeekly(w.variable ? { lat: place.lat, lon: place.lon, variable: w.variable, year, period: Math.min(years, 25) } : null)
  const week = (picked.for === scope && picked.week) || startWeek(data)
  const rows = weekRows(data)
  return (
    <section className="dt-chart is-wide" aria-labelledby="weekly-h">
      <h2 id="weekly-h" className="dt-chart-title">Week by week</h2>
      {!w.variable ? <p className="dt-takeaway">{w.why}</p> : (
        <>
          <p className="dt-takeaway">One year as 52 weeks, each against its usual range over {data?.period?.[0] ?? '…'}–{data?.period?.[1] ?? '…'}. For spotting a heat wave or a wet week; the trend test stays on yearly and monthly values.</p>
          <div className="dt-week-controls">
            <SelectField label="Year" value={year} onChange={(e) => setPicked({ year: Number(e.target.value), week: null, for: scope })}
              options={YEARS.map((y) => ({ value: y, label: `${y}` }))} />
          </div>
          {error && <p className="dt-status" role="alert">{error}</p>}
          {loading && <Skeleton height={240} />}
          {data && (
            <>
              <WeekStrip legend={`Week of ${year}`} name="week" blocks={data.blocks} value={week}
                onChange={(wk) => setPicked({ year, week: wk, for: scope })} />
              <p className="dt-week-readout" aria-live="polite">{weekReadout(data, week)}</p>
              <ChartFrame title={`${data.label}, ${year}, week by week`}
                takeaway={`${data.blocks.filter((b) => b.unusual === 'high').length} weeks were above their usual range and ${data.blocks.filter((b) => b.unusual === 'low').length} below it.`}
                table={{ columns: ['Week', 'Dates', `${year} (${data.unit})`, 'Usual (10–90%)'], rows: data.blocks.map((b) => [b.week, `${b.start} to ${b.end}`, format(b.value), `${format(b.p10)}–${format(b.p90)}`]) }}>
                <BandChart rows={rows} selected={rows.findIndex((r) => r.week === week)} />
              </ChartFrame>
            </>
          )}
        </>
      )}
    </section>
  )
}
