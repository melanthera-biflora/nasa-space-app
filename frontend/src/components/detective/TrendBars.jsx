import { format } from '../../lib/format'
import { waterSense } from '../../presenters/detective'

// Trend per season or month as bars from a centre line, on one scale for seasons and months (the scale row under them).
// A clear change is a solid bar with an arrow in its words; one that isn't clear after the correction is only an
// outline and says "not clear yet" (colour is never the only cue). Water records draw drier in brown, wetter in teal.
export default function TrendBars({ rows, max, label, variable }) {
  const sense = waterSense(variable)
  const tone = (up) => (sense === 'wet' ? (up ? 'is-wetter' : 'is-drier') : sense === 'dry' ? (up ? 'is-drier' : 'is-wetter') : up ? 'is-up' : 'is-down')
  return (
    <ul className="dt-bars" aria-label={label}>
      {rows.map((r) => {
        const w = r.available ? Math.min(50, (Math.abs(r.value) / max) * 50) : 0
        return (
          <li key={r.name} className={r.clear ? 'is-clear' : 'is-faded'}>
            <span className="dt-bar-label">{r.label}</span>
            <span className="dt-bar-track" aria-hidden="true">
              <i style={r.value >= 0 ? { left: '50%', width: `${w}%` } : { left: `${50 - w}%`, width: `${w}%` }}
                className={tone(r.value >= 0)} />
            </span>
            <span className="dt-bar-text">{r.text}</span>
          </li>
        )
      })}
      <li className="dt-bars-scale" aria-hidden="true">
        <span />
        <span className="dt-bar-scale"><span>−{format(max)}</span><span>0</span><span>+{format(max)}</span></span>
      </li>
    </ul>
  )
}
