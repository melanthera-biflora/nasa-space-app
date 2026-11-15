'use client'
import { useState } from 'react'
import { searchLocation } from '../../api/location'
import { useDetective } from '../../lib/query'
import { firstYearFor, LAST_YEAR, MIN_YEARS, periodsFor, placeLabel, STATE_VARS, POINT_VARS, useRegions, variableLabel } from '../../presenters/detective'
import Icon from '../ui/Icon'
import Term from '../ui/Term'
import YearRange from '../ui/YearRange'
import AddressSearch from '../AddressSearch'

// The detective's three choices, kept in the URL: where (a state or an address), what (a variable) and how long.
// It is the settings panel at the top of the side menu (a drawer on phones and tablets).
export default function ContextBar() {
  const { place, variable, years, range, name, set } = useDetective()
  const [draft, setDraft] = useState(null)   // a From-To being edited; it reaches the URL once it is valid
  const regions = useRegions()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const stateVars = regions?.variables || []
  const labelOf = (k) => variableLabel(place, k, regions)
  const definition = place.kind === 'state' ? stateVars.find((v) => v.key === variable)?.definition : null

  // A state from the search opens the state view; anything else is a point (its name stays in the URL).
  const pickPoint = (p) => {
    setError('')
    if (p.region) set({ region: p.region, lat: null, lon: null, name: null, var: STATE_VARS.includes(variable) ? variable : 'pm25' })
    else set({ region: null, lat: p.lat, lon: p.lon, name: p.name })
  }
  async function search() {
    setBusy(true); setError('')
    try { pickPoint(await searchLocation(text)) } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  return (
    <section className="dt-context" aria-labelledby="dt-context-h">
      <p id="dt-context-h" className="dt-side-title">What you&apos;re looking at</p>
      <div className="dt-field">
        <label htmlFor="dt-state">State</label>
        <span className="ui-select"><select id="dt-state" value={place.kind === 'state' ? place.code : ''}
          onChange={(e) => e.target.value && set({ region: e.target.value, lat: null, lon: null, name: null, var: STATE_VARS.includes(variable) ? variable : 'pm25' })}>
          {place.kind === 'point' && <option value="">{placeLabel(place, name)}</option>}
          {(regions?.regions || (place.kind === 'state' ? [{ code: place.code, name: place.code }] : [])).map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
        </select><Icon name="chevron-down" size={16} /></span>
      </div>
      <div className="dt-field dt-field-search">
        <AddressSearch value={text} onChange={setText} onPick={pickPoint} onSubmit={search} busy={busy} />
        {error && <p className="dt-error" role="alert">{error}</p>}
      </div>
      <div className="dt-field">
        <span className="dt-label-row"><label htmlFor="dt-var">Variable</label>{definition && <Term definition={definition} title={labelOf(variable)} />}</span>
        <span className="ui-select"><select id="dt-var" value={variable} onChange={(e) => set({ var: e.target.value })}>
          {(place.kind === 'state' ? STATE_VARS : POINT_VARS).map((k) => <option key={k} value={k}>{labelOf(k)}</option>)}
        </select><Icon name="chevron-down" size={16} /></span>
      </div>
      <div className="dt-field dt-field-range">
        <YearRange first={firstYearFor(place, variable)} last={LAST_YEAR} minYears={MIN_YEARS}
          from={draft?.from ?? range?.from ?? LAST_YEAR - years + 1} to={draft?.to ?? range?.to ?? LAST_YEAR}
          presets={periodsFor(place, variable).map((n) => ({ label: n === 45 ? 'Since 1981' : `${n} yr`, long: n === 45 ? undefined : `Last ${n} years`, from: LAST_YEAR - n + 1, to: LAST_YEAR }))}
          onChange={({ from, to }) => {
            setDraft({ from, to })
            if (to - from + 1 < MIN_YEARS) return
            setDraft(null)
            const n = to - from + 1
            if (to === LAST_YEAR && periodsFor(place, variable).includes(n)) set({ years: n === 25 ? null : n, from: null, to: null })
            else set({ from, to, years: null })
          }} />
      </div>
    </section>
  )
}
