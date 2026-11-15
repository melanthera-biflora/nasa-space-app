'use client'
// The analysis lives in the URL (place, variable, years), so any view can be shared or reloaded as it is.
import { parseAsFloat, parseAsInteger, parseAsString, useQueryStates } from 'nuqs'
import { DEFAULT_PLACE, placeLabel, readGuess, readPlace, readRange, readVariable, readYears, recordName, useAnalysis, useRegions } from '../presenters/detective'

const PARSERS = { region: parseAsString, lat: parseAsFloat, lon: parseAsFloat, name: parseAsString, var: parseAsString, years: parseAsInteger, from: parseAsInteger, to: parseAsInteger, guess: parseAsString }

export function useDetective() {
  const [q, set] = useQueryStates(PARSERS, { history: 'push', scroll: false })
  const asked = readPlace(q)
  const place = asked || DEFAULT_PLACE
  const variable = readVariable(place, q.var)
  const range = readRange({ from: q.from, to: q.to }, place, variable)
  const years = range ? range.to - range.from + 1 : readYears(q.years ?? 25, place, variable)
  // what the link asked for but didn't get (a place outside the US, an unknown record): the page says so (M9)
  const replaced = { place: !asked && (q.region != null || q.lat != null || q.lon != null), variable: q.var != null && q.var !== variable }
  // a guess is about one record in one place: a new place or record asks for a new guess
  const setQ = (v) => set(['region', 'lat', 'var'].some((k) => k in v) ? { guess: null, ...v } : v)
  return { place, variable, years, range, name: q.name, guess: readGuess(q.guess), replaced, set: setQ }
}

/** The URL's place, variable and period, plus the fetched factor for them. */
export function useCurrent() {
  const d = useDetective()
  const a = useAnalysis(d.place, d.variable, d.years, d.range)
  const regions = useRegions()
  const stateName = d.place.kind === 'state' ? regions?.regions.find((r) => r.code === d.place.code)?.name : null
  return { ...d, ...a, placeName: placeLabel(d.place, a.name || stateName || d.name), label: recordName(a.factor, d.place, d.variable, regions) }
}
