'use client'
import { useDetective } from '../../lib/query'
import { linkNote, variableLabel } from '../../presenters/detective'

// One line at the top of a detective page when the link asked for something we replaced (a place outside the US, a
// record we don't have), so a bad link never changes the page silently.
export default function LinkNote() {
  const d = useDetective()
  const text = linkNote(d.replaced, variableLabel(d.place, d.variable))
  return text ? <p className="dt-link-note" role="status">{text}</p> : null
}
