'use client'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ButtonLink } from '../ui/Button'
import Disclosure from '../ui/Disclosure'
import Icon from '../ui/Icon'
import Verdict from './Verdict'
import YearBars from './YearBars'

// One record in "Everything we checked": a button row (name, the two numbers, the verdict) that slides open to show
// one chart, three plain sentences, what the data can't see, and the Look closer pages for the same record.
export default function RecordRow({ row, detail, open, onToggle, lookCloser }) {
  const still = useReducedMotion()
  const panel = `rec-${row.key}-panel`
  const q = lookCloser ? lookCloser(row.key) : null
  return (
    <li className={`rp-row${open ? ' is-open' : ''}`} id={`rec-${row.key}`}>
      <button type="button" className="rp-row-btn" aria-expanded={open} aria-controls={panel} onClick={() => onToggle(row.key)}>
        <span className="rp-icon"><Icon name={row.icon} size={16} /></span>
        <span className="rp-row-name">{row.name}{row.quality && <small className="rp-quality">{row.quality}</small>}</span>
        <span className="rp-row-numbers">{row.then} → {row.now} <small>{row.unit}{row.since && `, ${row.since}`}</small></span>
        <Verdict verdict={row.verdict} level={row.level} />
        <Icon name="chevron-down" size={16} className="rp-chev" />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={panel} className="rp-detail" key="detail"
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: still ? 0 : 0.26, ease: [0.2, 0, 0, 1] }}>
            <div className="rp-detail-inner">
              <YearBars points={detail.points} marks={detail.marks} unit={detail.unit} label={detail.name} />
              <div className="rp-words">
                <p><b>What happened.</b> {detail.sentences[0]}</p>
                <p><b>Is it real?</b> {detail.sentences[1]}</p>
                {detail.sentences[2] && <p><b>Why it matters.</b> {detail.sentences[2]}</p>}
                {detail.meaning && <p className="rp-meaning">{detail.meaning}</p>}
                <Disclosure summary="What the data can't see">
                  {detail.caveat && <p>{detail.caveat}</p>}
                  {detail.definition && <p><b>{detail.label}:</b> {detail.definition}</p>}
                  {detail.source && <p className="dt-muted">Data: {detail.source}</p>}
                </Disclosure>
              </div>
              {q && (
                <nav className="rp-closer" aria-label={`Look closer at ${row.name}`}>
                  <ButtonLink size="sm" variant="secondary" icon="calendar" href={`/seasons${q}`}>Which months changed</ButtonLink>
                  <ButtonLink size="sm" variant="secondary" icon="info" href={`/test${q}`}>Is it real? The numbers</ButtonLink>
                  <ButtonLink size="sm" variant="secondary" icon="warning" href={`/events${q}`}>Spikes and disasters</ButtonLink>
                  <ButtonLink size="sm" variant="ghost" icon="map" href={`/map${q}`}>Where else</ButtonLink>
                  <ButtonLink size="sm" variant="ghost" icon="link" href={`/patterns${q}`}>What moves with it</ButtonLink>
                </nav>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}
