'use client'
import MonthHeatmap from '../components/MonthHeatmap'
import ChartFrame from '../components/detective/ChartFrame'
import CyclePlot from '../components/detective/CyclePlot'
import TrendBars from '../components/detective/TrendBars'
import TypicalYear from '../components/detective/TypicalYear'
import { format, sign, unitOf } from '../lib/format'
import { cycle, monthTable, MONTHS, seasonBars, typicalYear } from '../presenters/detective'
import { useCurrent } from '../lib/query'
import { NextStep, Status } from './common'

// Step 2: find the pattern. Which part of the year carries the change?
export default function SeasonsView() {
  const c = useCurrent()
  const f = c.factor
  const bars = f?.available ? seasonBars(f) : null
  const cyc = f?.available ? cycle(f) : null
  const typical = f?.available ? typicalYear(f) : null
  return (
    <main className="dt-main" id="main">
      <h1 tabIndex={-1}>{c.label} in {c.placeName}: when in the year is it changing?</h1>
      <Status current={c}>
        {f && !bars && <p className="dt-status">{(f.monthly || []).length
          ? 'This variable has too few complete years for a month-by-month test (surface heat, for example, is summer only).'
          : 'This record is one number a year, so it has no months or seasons to compare. Its yearly change is on the next step.'}</p>}
        {bars && (
          <>
            <p className="dt-lede"><b>{bars.summary}</b></p>
            {typical && (
              <ChartFrame wide live title="The typical year, then and now"
                takeaway={`Each month's ${typical.thenLabel} average against its ${typical.nowLabel} average. Months with an arrow changed clearly on their own; the grey band is where most years fall.`}
                table={{ columns: ['Month', `${typical.thenLabel} average`, `${typical.nowLabel} average`, 'Clear change?'], rows: typical.months.map((m) => [m.label, format(m.then), format(m.now), m.clear ? (m.up ? 'yes, up' : 'yes, down') : 'not yet']) }}>
                <TypicalYear data={typical} unit={unitOf(f)} variable={c.variable} />
              </ChartFrame>
            )}
            <div className="dt-grid-2">
              <ChartFrame title="Trend by season" takeaway="Each season tested on its own, across the years."
                table={{ columns: ['Season', 'Change per decade', 'q', 'Clear?'], rows: bars.seasons.map((s) => [s.label, sign(s.value), s.q ?? '—', s.clear ? 'yes' : 'not yet']) }}>
                <TrendBars rows={bars.seasons} max={bars.max} label="Trend by season" variable={c.variable} />
              </ChartFrame>
              <ChartFrame title="Trend by month" takeaway="Each calendar month tested on its own, across the years."
                table={{ columns: ['Month', 'Change per decade', 'q', 'Clear?'], rows: bars.months.map((s) => [s.label, sign(s.value), s.q ?? '—', s.clear ? 'yes' : 'not yet']) }}>
                <TrendBars rows={bars.months} max={bars.max} label="Trend by month" variable={c.variable} />
              </ChartFrame>
            </div>
            <p className="dt-note">{bars.note}</p>
            <ChartFrame wide live title="Each month across the years (cycle plot)"
              takeaway="Each small panel is one calendar month from the first year to the last; the flat tick is that month's average. Panels in colour have a clear trend."
              table={{ columns: ['Month', 'Typical (median)', 'Change per decade', 'Clear?'], rows: cyc.months.map((m) => [m.label, format(m.typical), sign(m.slope), m.clear ? 'yes' : 'not yet']) }}>
              <CyclePlot cycle={cyc} unit={unitOf(f)} />
            </ChartFrame>
            <ChartFrame wide live title="Every month of every year" table={monthTable(f)}
              takeaway={`Rows are years, columns are ${MONTHS[0]}–${MONTHS[11]}. Switch to “difference from usual” to see which months stood out.`}>
              <MonthHeatmap factor={f} />
            </ChartFrame>
            <nav className="dt-next-row" aria-label="Next steps">
              <NextStep href="/test">Is the overall change real?</NextStep>
              <NextStep href="/events">Were the odd months disasters?</NextStep>
            </nav>
          </>
        )}
      </Status>
    </main>
  )
}
