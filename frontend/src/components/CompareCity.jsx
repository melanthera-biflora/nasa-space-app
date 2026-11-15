'use client'
import { motion } from 'motion/react'
import { memo } from 'react'
import Button, { ButtonLink } from './ui/Button'
import Disclosure from './ui/Disclosure'
import Icon from './ui/Icon'
import { format } from '../lib/format'
import { barAt, changes, cityId } from '../presenters/compare'

const reportHref = (c) => `/report?${new URLSearchParams({ lat: c.lat, lon: c.lon, name: `${c.name}, ${c.state}` })}`

// The word beside each bar: the household's limit for a count, the trend for a trend-only topic (never colour alone).
const wordFor = (l) => (l.ok == null ? 'no data' : l.topic.trendOnly ? l.word.toLowerCase() : l.ok ? 'under your limit' : 'over your limit')

// Then → now on a topic's shared scale: hollow dot 2001–2005, filled dot 2021–2025, a solid line when the trend is
// clear (dashed when not yet), the dashed tick the household's limit. The words beside it carry the same, so it's hidden.
function CardBar({ scale, l }) {
  const a = barAt(scale, l.then), b = barAt(scale, l.value)
  return (
    <span className="cb" aria-hidden="true">
      {l.limit != null && <i className="cb-limit" style={{ left: `${barAt(scale, l.limit).pos}%` }} />}
      <i className={`cb-span${l.clear ? '' : ' is-unclear'}`} style={{ left: `${Math.min(a.pos, b.pos)}%`, width: `${Math.abs(b.pos - a.pos)}%` }} />
      <i className="cb-then" style={{ left: `${a.pos}%` }} />
      <i className={`cb-now${b.off ? ' is-off' : ''}`} style={{ left: `${b.pos}%` }} />
    </span>
  )
}

// One city in the comparison list: a then → now bar per topic against the household's limits, why it sits in its
// group, and what changed. Hover and focus light it on the scatter and map; the list reorders smoothly.
// memo: a hover elsewhere passes the same props, so only the cards whose state changed redraw
export default memo(function CompareCity({ entry, chosen, meta, scales, hot, on, full = false, onHover, onToggle }) {
  const c = entry.city
  return (
    <motion.li layout="position" transition={{ type: 'spring', stiffness: 260, damping: 30 }} id={cityId(c.name)}
      className={`cmp-city${hot ? ' is-hover' : ''}`}
      onPointerEnter={() => onHover(c.name)} onPointerLeave={() => onHover(null)} onFocus={() => onHover(c.name)} onBlur={() => onHover(null)}>
      <div className="cmp-city-head">
        <b>{c.name}<span className="dt-muted">, {c.state}</span>{entry.km != null && <span className="dt-muted"> · {Math.round(entry.km * 0.621).toLocaleString('en-US')} mi away</span>}</b>
        <div className="cmp-actions">
          <Button size="sm" variant={on ? 'primary' : 'secondary'} icon={on ? 'check' : 'scale'} aria-pressed={on} onClick={() => onToggle(c.name)}
            disabled={full && !on} title={full && !on ? 'Up to 3 places: remove one first' : undefined}>
            {on ? 'In comparison' : full ? 'Up to 3 places' : 'Add to comparison'}
          </Button>
          <ButtonLink size="sm" variant="ghost" href={reportHref(c)} iconEnd="chevron-right">Open full report</ButtonLink>
        </div>
      </div>
      <ul className="cmp-bars">
        {entry.lines.map((l) => (
          <li key={l.topic.id} className={`cmp-bar${l.ok === true ? ' is-met' : l.ok === false ? ' is-missed' : ''}`}>
            <span className="cmp-bar-label"><Icon name={l.topic.icon} size={16} />{l.topic.label}</span>
            {l.ok != null && scales?.[l.topic.id] ? <CardBar scale={scales[l.topic.id]} l={l} /> : <span />}
            <span className="cmp-bar-text">
              {l.ok != null && <>{format(l.then)} → <b>{format(l.value)}</b> {l.unit}</>}
              <em>{wordFor(l)}</em>
            </span>
          </li>
        ))}
      </ul>
      <Disclosure lazy summary="Why this group, and what changed">
        <ul className="cmp-why">{entry.lines.map((l) => <li key={l.topic.id}>{l.ok === true ? '✓ ' : l.ok === false ? '✗ ' : ''}{l.text}</li>)}</ul>
        <p className="cmp-why-h">Changes 2001–2025</p>
        <ul className="cmp-why">{changes(c, chosen, meta).map((t) => <li key={t}>{t}</li>)}</ul>
        <p className="dt-muted">NASA POWER and MERRA-2, ~50 km squares: a regional picture, not one street.</p>
      </Disclosure>
    </motion.li>
  )
})
