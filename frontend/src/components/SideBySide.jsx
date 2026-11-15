'use client'
import { useState } from 'react'
import MultiLine from './MultiLine'
import ThenNow from './ThenNow'
import Dialog from './ui/Dialog'
import Disclosure from './ui/Disclosure'
import Skeleton from './ui/Skeleton'
import StatusLine from './ui/StatusLine'

// The chosen places side by side: the verdict in words, then one then → now arrow plot per topic (the lead: places in
// the household's order on one axis, the limit, the recent range and the trend word), each year's line chart on request
// (a dash per place as a second cue besides colour), and the table of 2021-2025 values with "only rows that differ".
export default function SideBySide({ open, onClose, places, start, verdict, blocks, factors, meta, overlay, rows }) {
  const [onlyDiffer, setOnlyDiffer] = useState(true)
  return (
    <Dialog open={open} onClose={onClose} sheet title="Side by side">
      <ul className="cmp-verdict">{verdict.map((line) => <li key={line}>{line}</li>)}</ul>
      <p className="tn-key dt-muted">Dot: the 2001–2005 average. Arrow: to the 2021–2025 average, solid when the trend is clear and dashed when it isn’t yet. Pale bar: the lowest to highest of 2021–2025. Dashed line: your limit.</p>
      {blocks.map((b) => <ThenNow key={b.key} block={b} />)}
      <Disclosure summary="Each year, 2001–2025" className="cmp-years">
        {factors.map((k) => (
          <figure key={k} className="cmp-overlay">
            <figcaption><b>{meta[k]?.label}</b> <span className="dt-muted">each year, 2001–2025</span></figcaption>
            {overlay.loading ? (
              <div aria-busy="true"><StatusLine delay={0}>Fetching each place’s yearly values…</StatusLine><Skeleton height={180} /></div>
            ) : (
              <MultiLine unit={meta[k]?.unit_short || ''} label={meta[k]?.label} series={places.map((pl) => ({ name: pl.name, points: overlay.byPlace[pl.name]?.[k]?.points || [] }))} />
            )}
          </figure>
        ))}
      </Disclosure>
      <label className="cmp-differ"><input type="checkbox" checked={onlyDiffer} onChange={(e) => setOnlyDiffer(e.target.checked)} /> Show only rows that differ</label>
      <div className="dt-table-wrap cmp-table-wrap">
        <table className="cmp-table">
          <thead><tr><th scope="col">2021–2025</th>{places.map((p) => <th key={p.name} scope="col">{p.name}{start?.name === p.name && <span className="dt-muted"> (start)</span>}</th>)}</tr></thead>
          <tbody>
            {rows.filter((r) => !onlyDiffer || r.differs || r.chosen).map((r) => (
              <tr key={r.key} className={r.chosen ? 'is-chosen' : ''}>
                <th scope="row">{r.label}{!r.chosen && <span className="dt-muted"> (context)</span>}</th>
                {r.cells.map((c, i) => <td key={i}><b>{c.text}</b><span>{c.word}</span></td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Dialog>
  )
}
