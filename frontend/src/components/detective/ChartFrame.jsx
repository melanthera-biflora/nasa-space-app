'use client'
import { useId, useState } from 'react'
import Tabs from '../ui/Tabs'

// A heading id from the title, so the side menu can list and jump to each chart ("Trend by month" -> chart-trend-by-month).
const slug = (t) => `chart-${String(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`

// Every chart: a heading, one sentence that says what it shows (also its long description for screen readers), and
// the drawing. With a `table`, Chart and Table tabs sit above it (the kit's Tabs: arrow keys, one tab stop), so the
// numbers are one step away for anyone who can't or doesn't want to read the drawing. A `live` chart has focusable
// parts or controls (a keyboard readout, a year picker), so it is a group, not an image that would hide them.
export default function ChartFrame({ title, takeaway, table, children, wide = false, live = false }) {
  const id = useId()
  const [view, setView] = useState('chart')
  const drawing = (
    <div className="dt-chart-draw" role={live ? 'group' : 'img'} aria-label={title} aria-describedby={takeaway ? id : undefined}>{children}</div>
  )
  return (
    <figure className={wide ? 'dt-chart is-wide' : 'dt-chart'}>
      <figcaption>
        <h2 className="dt-chart-title" id={slug(title)}>{title}</h2>
        {takeaway && <p className="dt-takeaway" id={id}>{takeaway}</p>}
      </figcaption>
      {table ? (
        <Tabs label={`${title}: chart or table`} value={view} onChange={setView} tabs={[
          { id: 'chart', label: 'Chart', content: drawing },
          {
            id: 'table', label: 'Table', content: (
              <div className="dt-data dt-table-wrap" tabIndex={0} aria-label={`${title}, table`}>
                <table>
                  <thead><tr>{table.columns.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
                  <tbody>{table.rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j}>{v}</td>)}</tr>)}</tbody>
                </table>
              </div>
            ),
          },
        ]} />
      ) : drawing}
    </figure>
  )
}
