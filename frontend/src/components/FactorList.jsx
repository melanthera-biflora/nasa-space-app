import { DIRECTION_WORDS, direction, format, unitOf } from '../lib/format'
import './FactorList.css'

const ARROWS = { up: '↑', down: '↓', flat: '→' }

// Yearly values as a tiny line, so the list shows the shape of each trend. Drawing only, no statistics.
function Sparkline({ points }) {
  const values = (points || []).filter((p) => Number.isFinite(p.value))
  if (values.length < 2) return null
  const lo = Math.min(...values.map((p) => p.value)), hi = Math.max(...values.map((p) => p.value))
  const x = (i) => 2 + (i * 76) / (values.length - 1)
  const y = (v) => 22 - (hi === lo ? 10 : ((v - lo) / (hi - lo)) * 20)
  const d = values.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ')
  const last = values[values.length - 1]
  return (
    <svg className="fl-spark" viewBox="0 0 80 24" aria-hidden="true">
      <path d={d} />
      <circle cx={x(values.length - 1)} cy={y(last.value)} r="2.5" />
    </svg>
  )
}

// Every available card, household priorities first. Picking one drives the chart, the map and the details.
export default function FactorList({ factors, keys, current, titles = {}, onSelect }) {
  return (
    <ul className="fl">
      {keys.map((key, i) => {
        const f = factors[key]
        const dir = direction(f)
        return (
          <li key={key} className="rise-in" style={{ '--i': Math.min(i, 10) }}>
            <button type="button" className={`fl-item fl-${dir}`} aria-pressed={key === current} onClick={() => onSelect(key)}>
              <span className="fl-title">{titles[key] || f.label}</span>
              <span className={`fl-arrow dir-${dir}`} aria-hidden="true">{ARROWS[dir]}</span>
              <span className="fl-value"><strong>{format(f.now)}</strong> {unitOf(f)}</span>
              <Sparkline points={f.points} />
              <span className="fl-meta">
                <span className={`dir-${dir}`}>{DIRECTION_WORDS[dir].slice(2)}</span>
                <span className={`sig ${f.significant ? 'is-significant' : ''}`}>{f.significance_label}</span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
