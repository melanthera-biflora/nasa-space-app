import { legend } from '../presenters/trendMap'

// The map's legend, a view: each colour is a button that shows only that class (press again for all).
// presenters/trendMap.js legend() gives the title, the classes with their ranges, and the edge labels.
export default function TrendMapLegend({ field, view, only, onOnly, hasHere }) {
  const lg = legend(field, view)
  const picked = lg.classes.find((c) => c.k === only)
  return (
    <div className="tm-legend">
      <p className="tm-legend-title">{lg.title}</p>
      <div className="tm-ramp" role="group" aria-label="Show only one colour class" style={{ gridTemplateColumns: `repeat(${lg.classes.length}, 1fr)` }}>
        {lg.classes.map((c) => (
          <button key={c.k} type="button" className="tm-swatch" aria-pressed={only === c.k} aria-label={`Only ${c.range}`}
            style={{ background: `var(${c.color})` }} onClick={() => onOnly(only === c.k ? null : c.k)} />
        ))}
      </div>
      <div className="tm-ramp-labels" aria-hidden="true">
        {lg.edges.map((e) => <span key={e.text} style={{ left: `${e.at * 100}%` }}>{e.text}</span>)}
      </div>
      <p className="tm-ramp-ends"><span>{lg.ends[0]}</span><span>{lg.ends[1]}</span></p>
      {picked && <p className="map-note">Showing only {picked.range}. <button type="button" className="tm-link" onClick={() => onOnly(null)}>Show all</button></p>}
      <ul className="map-legend map-legend-row">
        {lg.showsClarity && <li><i className="tm-key" />Coloured: clear trend</li>}
        {lg.showsClarity && <li><i className="tm-key is-unclear" />Grey, hatched: no clear trend</li>}
        {hasHere && <li><i className="tm-key is-own" />This address’s square</li>}
        {hasHere && <li><i className="map-dot is-ring" />This address</li>}
      </ul>
    </div>
  )
}
