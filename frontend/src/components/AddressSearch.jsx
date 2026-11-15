import { useId, useState } from 'react'
import { rememberPlace, useRecentPlaces } from '../lib/recentPlaces'
import { kindIcon, nextActive, rowText, splitMatch, suggestionView, useSuggestions } from '../presenters/search'
import Icon from './ui/Icon'
import './AddressSearch.css'

// The typed text in bold inside a suggestion, so people see why it matched.
function Highlight({ text, query }) {
  const parts = splitMatch(text, query)
  return parts ? <>{parts[0]}<mark>{parts[1]}</mark>{parts[2]}</> : text
}

// Address box with suggestions below it (ARIA 1.2 combobox), a view: presenters/search.js fetches the suggestions
// and decides what the list shows. Picking a suggestion places the pin at once; Search still runs the full search.
// An empty box offers the places picked recently in this tab; each row says what kind of place it is.
export default function AddressSearch({ value, onChange, onPick, onSubmit, busy = false, quiet = '' }) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [picked, setPicked] = useState('')   // the text a pick wrote into the box: don't suggest for it again
  // `quiet`: text the page wrote into the box (a spot clicked on the map) is treated like a pick: no suggestion request
  const silent = quiet && value === quiet ? quiet : picked
  const query = value.trim()
  const result = useSuggestions(value, silent)
  const recentPlaces = useRecentPlaces()
  const { items, show, loading, error, hint, recent } = suggestionView({ query: value, picked: silent, open, result, recent: recentPlaces })

  function pick(place) {
    rememberPlace(place)
    setPicked(place.name)
    setOpen(false)
    setActive(-1)
    onPick(place)
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!items.length) return
      e.preventDefault()
      setOpen(true)
      setActive((i) => nextActive(i, e.key === 'ArrowDown' ? 1 : -1, items.length))
      return
    }
    if (e.key === 'Enter' && show && active >= 0) { e.preventDefault(); pick(items[active]); return }
    if (e.key === 'Escape' && show) { e.preventDefault(); setOpen(false); setActive(-1) }
  }

  return (
    <form className="addr" role="search" onSubmit={(e) => { e.preventDefault(); setOpen(false); onSubmit() }}>
      <label htmlFor="home-address">Address or place</label>
      <div className="addr-box">
        <div className="addr-row">
          <div className="addr-field">
            <input
              id="home-address"
              type="search"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={show}
              aria-controls={listId}
              aria-activedescendant={show && active >= 0 ? `${listId}-${active}` : undefined}
              autoComplete="off"
              value={value}
              placeholder="e.g. 80202 or Denver"
              onChange={(e) => { setPicked(''); setActive(-1); setOpen(true); onChange(e.target.value) }}
              onFocus={() => setOpen(true)}
              onBlur={() => setOpen(false)}
              onKeyDown={onKeyDown}
              required
            />
            {loading && <span className="addr-spinner" aria-hidden="true" />}
          </div>
          <button type="submit" disabled={busy || !query}>{busy ? 'Finding…' : 'Search'}</button>
        </div>
        {show && (
          <ul id={listId} role="listbox" className="addr-list" aria-label={recent ? 'Recent places' : 'Suggested places'}>
            {recent && <li role="presentation" className="addr-group">Recent places</li>}
            {items.map((s, i) => {
              const { main, rest } = rowText(s)
              return (
                <li key={`${s.name}-${s.lat}`} id={`${listId}-${i}`} role="option" aria-selected={i === active}
                  className={i === active ? 'addr-option is-active' : 'addr-option'}
                  onMouseDown={(e) => e.preventDefault()} onMouseEnter={() => setActive(i)} onClick={() => pick(s)}>
                  <Icon name={recent ? 'history' : kindIcon(s.kind)} size={18} className="addr-pin" />
                  <span className="addr-text">
                    <span className="addr-main"><Highlight text={main} query={query} /></span>
                    {rest && <span className="addr-rest">{rest}</span>}
                  </span>
                  {s.kind && <span className="addr-kind">{s.kind}</span>}
                </li>
              )
            })}
          </ul>
        )}
      </div>
      <p className={`addr-hint${error ? ' is-error' : ''}`}>
        {error || hint || 'US addresses, cities or ZIP codes. Pick a suggestion, or press Search.'}
      </p>
      <p className="sr-only" aria-live="polite">{show ? `${items.length} ${recent ? 'recent places' : 'suggestions'}. Use the up and down arrows, then Enter.` : ''}</p>
    </form>
  )
}
