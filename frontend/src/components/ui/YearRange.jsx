import { useId } from 'react'
import Icon from './Icon'

// The analysis period (the challenge's step 3): presets for the usual windows, or any From / To with at least
// `minYears` years. Two native selects: accessible everywhere, the phone's own picker on touch. A preset may carry a
// short `label` for narrow panels and a `long` name for screen readers.
export default function YearRange({ first, last, from, to, presets = [], minYears = 8, onChange, legend = 'Years analyzed' }) {
  const id = useId()
  const years = Array.from({ length: last - first + 1 }, (_, i) => first + i)
  const short = to - from + 1 < minYears
  const pick = (f, t) => onChange({ from: f, to: t })
  return (
    <fieldset className={`ui-range${short ? ' is-invalid' : ''}`}>
      <legend className="ui-label">{legend}</legend>
      {presets.length > 0 && (
        <div className="ui-range-presets" role="group" aria-label="Quick choices">
          {presets.map((p) => {
            const on = p.from === from && p.to === to
            return <button key={p.label} type="button" className="ui-chip" aria-pressed={on} aria-label={p.long} onClick={() => pick(p.from, p.to)}>{p.label}</button>
          })}
        </div>
      )}
      <div className="ui-range-row">
        <label className="ui-range-part" htmlFor={`${id}-from`}>From
          <span className="ui-select"><select id={`${id}-from`} value={from} onChange={(e) => pick(Number(e.target.value), to)} aria-describedby={short ? `${id}-err` : undefined}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select><Icon name="chevron-down" size={16} /></span>
        </label>
        <span className="ui-range-dash" aria-hidden="true">–</span>
        <label className="ui-range-part" htmlFor={`${id}-to`}>To
          <span className="ui-select"><select id={`${id}-to`} value={to} onChange={(e) => pick(from, Number(e.target.value))} aria-describedby={short ? `${id}-err` : undefined}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select><Icon name="chevron-down" size={16} /></span>
        </label>
      </div>
      {short && <p className="ui-error" id={`${id}-err`}><Icon name="info" size={16} />A trend needs at least {minYears} years. Pick an earlier From or a later To.</p>}
    </fieldset>
  )
}
