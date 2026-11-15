import { useId } from 'react'
import Icon from './Icon'

// Form fields in GOV.UK order: label, hint, error, control. A placeholder is never the label or the hint (A3 contract).
function described(id, hint, error) {
  return [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
}

function Frame({ id, label, hint, error, children, className = '' }) {
  return (
    <div className={`ui-field${error ? ' is-invalid' : ''} ${className}`}>
      <label className="ui-label" htmlFor={id}>{label}</label>
      {hint && <p className="ui-hint" id={`${id}-hint`}>{hint}</p>}
      {error && <p className="ui-error" id={`${id}-error`}><Icon name="info" size={16} />{error}</p>}
      {children}
    </div>
  )
}

export function TextField({ label, hint, error, id, className, ...input }) {
  const auto = useId()
  const fid = id || auto
  return (
    <Frame id={fid} label={label} hint={hint} error={error} className={className}>
      <input className="ui-input" id={fid} aria-describedby={described(fid, hint, error)} aria-invalid={error ? true : undefined} {...input} />
    </Frame>
  )
}

/** Native select (type-ahead, the phone's own picker) with a quiet chevron. options: [{ value, label }] */
export function SelectField({ label, hint, error, id, options, className, ...select }) {
  const auto = useId()
  const fid = id || auto
  return (
    <Frame id={fid} label={label} hint={hint} error={error} className={className}>
      <span className="ui-select">
        <select id={fid} aria-describedby={described(fid, hint, error)} aria-invalid={error ? true : undefined} {...select}>
          {options.map((o) => <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>)}
        </select>
        <Icon name="chevron-down" size={16} />
      </span>
    </Frame>
  )
}
