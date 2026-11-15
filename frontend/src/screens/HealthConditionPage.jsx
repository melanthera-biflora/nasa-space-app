import { useEffect, useRef, useState } from 'react'
import QuestionnaireLayout from '../components/QuestionnaireLayout'
import { AGE_GROUPS, CONDITIONS, faceFor, isAnswered, OTHER_ANSWERS, personSummary } from '../presenters/householdForm'
import './HealthConditionPage.css'

// What the report checks, shown one at a time in the panel's top chip (real content, not alerts).
const TOPICS = [
  { title: 'Heat', meta: 'very hot days, warm nights, surface heat' },
  { title: 'Cold and rain', meta: 'very cold nights, heavy rain' },
  { title: 'Air', meta: 'fine particles (PM2.5) and NO₂' },
  { title: 'Fire', meta: 'satellite fire detections within 50 km' },
]

function TopicTicker() {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const timer = setInterval(() => setIndex((i) => (i + 1) % TOPICS.length), 3200)
    return () => clearInterval(timer)
  }, [])
  return (
    <div className="health-status" aria-hidden="true">
      <span className="health-status-dot" />
      <span className="health-status-label">NASA 2001–2025</span>
      <div className="health-feed">
        {TOPICS.map((t, i) => (
          <span key={t.title} className={i === index ? 'health-feed-item is-on' : 'health-feed-item'}>
            <b>{t.title}</b>
            <i>{t.meta}</i>
          </span>
        ))}
      </div>
    </div>
  )
}

let nextId = 1
function newPerson() {
  return {
    id: nextId++,
    age: 'Adults (18–64)',     // not 65+: a default shouldn't change the report's priorities unasked
    conditions: [], // ids of the chosen conditions, e.g. ['asthma', 'other']
    otherText: '',
    special: null, // 'none' | 'not-sure' | 'no-answer' | null
  }
}



function AddPersonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" />
      <path d="M19 8v6M16 11h6" />
    </svg>
  )
}

function Chevron() {
  return <svg className="health-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
}

// One person (round 6): an accordion row. Only the person being edited is open; the others fold to one line (face,
// name, age group and answers), so adding people no longer stretches the card. With one person there is nothing
// to fold, so the row is a plain heading.
function PersonFields({ person, index, total, open, onToggle, onChange, onRemove }) {
  const prefix = `person-${person.id}`
  const single = total === 1

  function toggleCondition(id) {
    const has = person.conditions.includes(id)
    onChange({
      ...person,
      special: null,
      conditions: has ? person.conditions.filter((c) => c !== id) : [...person.conditions, id],
    })
  }

  function chooseSpecial(id) {
    if (person.special === id) {
      onChange({ ...person, special: null })
    } else {
      onChange({ ...person, special: id, conditions: [], otherText: '' })
    }
  }

  const head = (
    <>
      <img className="health-face" src={faceFor(person.age, person.id)} alt="" width="40" height="40" />
      <span className="health-person-text">
        <span className="health-person-title" id={`${prefix}-title`}>Person {index + 1}</span>
        <span className="health-person-sum">{person.age} · {personSummary(person)}</span>
      </span>
    </>
  )

  return (
    <section className={`health-person${open ? ' is-open' : ''}`} role="group" aria-labelledby={`${prefix}-title`}>
      <div className="health-person-head">
        {single ? <div className="health-person-row">{head}</div> : (
          <button type="button" className="health-person-row" aria-expanded={open} aria-controls={`${prefix}-body`} onClick={onToggle}>
            {head}
            <Chevron />
          </button>
        )}
      </div>

      {open && (
        <div className="health-person-body" id={`${prefix}-body`}>
          <div className="health-age">
            <label htmlFor={`${prefix}-age`} className="health-label">
              Age group
            </label>
            <div className="health-select-wrap">
              <select
                id={`${prefix}-age`}
                className="health-select"
                value={person.age}
                onChange={(e) => onChange({ ...person, age: e.target.value })}
              >
                {AGE_GROUPS.map((age) => (
                  <option key={age} value={age}>
                    {age}
                  </option>
                ))}
              </select>
              <svg className="health-select-arrow" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 10l5 5 5-5" />
              </svg>
            </div>
          </div>

          <p className="health-label health-label-conditions" id={`${prefix}-conditions`}>
            {single ? 'Your health condition' : 'Health condition'}
          </p>

          <div className="health-conditions" role="group" aria-labelledby={`${prefix}-conditions`}>
            {CONDITIONS.map((c) => (
              <label className="health-check-label" key={c.id}>
                <input
                  type="checkbox"
                  checked={person.conditions.includes(c.id)}
                  onChange={() => toggleCondition(c.id)}
                />
                <span className="health-box" aria-hidden="true" />
                {c.label}
              </label>
            ))}

            <label className="health-check-label">
              <input
                type="checkbox"
                checked={person.conditions.includes('other')}
                onChange={() => toggleCondition('other')}
              />
              <span className="health-box" aria-hidden="true" />
              <span className="health-other">
                Other:
                <input
                  type="text"
                  className="health-other-input"
                  aria-label={`Other health condition for person ${index + 1}`}
                  value={person.otherText}
                  onChange={(e) => {
                    const text = e.target.value
                    const conditions =
                      text && !person.conditions.includes('other')
                        ? [...person.conditions, 'other']
                        : person.conditions
                    onChange({ ...person, otherText: text, conditions, special: null })
                  }}
                />
              </span>
            </label>
          </div>

          <div className="health-special">
            {OTHER_ANSWERS.map((item) => (
              <label className="health-check-label" key={item.id}>
                <input
                  type="checkbox"
                  checked={person.special === item.id}
                  onChange={() => chooseSpecial(item.id)}
                />
                <span className="health-box" aria-hidden="true" />
                {item.label}
              </label>
            ))}
          </div>

          {/* inside the open person only: folded rows stay quiet, and nobody is removed by a stray tap */}
          {!single && (
            <button type="button" className="health-remove" onClick={onRemove}>
              Remove person {index + 1}
            </button>
          )}
        </div>
      )}
    </section>
  )
}

export default function HealthConditionPage({ onNext, initial = [] }) {
  // the saved household when there is one (each person gets a fresh id), else one new person
  const [people, setPeople] = useState(() => (initial.length ? initial.map((p) => ({ ...newPerson(), ...p, id: nextId++ })) : [newPerson()]))
  const [openId, setOpenId] = useState(() => people[0].id)
  const [leaving, setLeaving] = useState(false)
  const timerRef = useRef(null)
  const focusRef = useRef(null)     // after adding someone, their age group takes focus; after removing, the add button
  const addRef = useRef(null)

  useEffect(() => () => clearTimeout(timerRef.current), [])
  useEffect(() => {
    if (focusRef.current == null) return
    const target = focusRef.current === 'add' ? addRef.current : document.getElementById(`person-${focusRef.current}-age`)
    focusRef.current = null
    target?.focus()
  })

  function updatePerson(updated) {
    setPeople((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
  }

  // a new person opens and the others fold to one line each
  function addPerson() {
    const person = newPerson()
    setPeople((prev) => [...prev, person])
    setOpenId(person.id)
    focusRef.current = person.id
  }

  function removePerson(id) {
    const rest = people.filter((p) => p.id !== id)
    setPeople(rest)
    if (openId === id) setOpenId(rest.at(-1).id)
    focusRef.current = 'add'
  }

  const answeredCount = people.filter(isAnswered).length
  const hasAnswers = answeredCount > 0
  const allAnswered = answeredCount === people.length

  let statusTitle = 'Waiting for your answers'
  let statusSub = 'Pick any health conditions on the left.'
  let hintTitle = 'Next: choose a place'
  let hintSub = 'Then we test 25 years of NASA data for it.'
  if (hasAnswers) {
    statusTitle = allAnswered
      ? 'All set'
      : `Got answers for ${answeredCount} of ${people.length} people`
    statusSub = allAnswered
      ? 'Their factors come first in the report; the numbers are the same for everyone.'
      : 'Answer for everyone so the report puts their factors first.'
    hintTitle = 'Ready when you are'
    hintSub = 'Continue to choose a place.'
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (leaving) return

    // What goes to the next step: each person's age group and conditions
    const household = people.map((p) => ({
      age: p.age,
      conditions: p.conditions,
      otherText: p.conditions.includes('other') ? p.otherText : '',
      answer: p.special,
    }))

    const go = () => (onNext ? onNext(household) : console.log('Household:', household))

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      go()
      return
    }

    setLeaving(true)
    timerRef.current = setTimeout(go, 550) // matches the CSS animation length
  }

  return (
    <QuestionnaireLayout
      illustration={
        <section className={`health-illustration rise-in${leaving ? ' is-leaving' : ''}`} style={{ '--i': 2 }} aria-labelledby="investigate-title">
          <div className="health-panel">
            <TopicTicker />
            <h2 id="investigate-title" className="sr-only">What we’ll investigate</h2>
            <ul className="sr-only">
              {TOPICS.map((t) => <li key={t.title}>{t.title}: {t.meta}</li>)}
              <li>NASA records from 2001 to 2025; each change is tested to see whether it is real.</li>
            </ul>

            <div className="health-rings" aria-hidden="true">
              <span />
              <span />
            </div>

            <div className="health-core">
              <div className={hasAnswers ? 'health-orb has-answers' : 'health-orb'} aria-hidden="true" />
              <div className="health-msg" role="status" aria-live="polite">
                <strong>
                  {statusTitle}
                  {!hasAnswers && (
                    <span className="health-dots" aria-hidden="true">
                      <span>.</span>
                      <span>.</span>
                      <span>.</span>
                    </span>
                  )}
                </strong>
                <small>{statusSub}</small>
              </div>
            </div>

            {/* The team's illustration: a person hugging the Earth, on the purple panel */}
            <img className="health-art" src="/images/earth-hug.webp" alt="" aria-hidden="true" />

            <div className="health-hint">
              {/* who lives here, one face each: a new person pops in, an answered one gets a ring */}
              <ul className="health-family" aria-hidden="true">
                {people.map((p) => (
                  <li key={p.id} className={isAnswered(p) ? 'is-answered' : ''}><img src={faceFor(p.age, p.id)} alt="" width="36" height="36" /></li>
                ))}
              </ul>
              <div className="health-hint-text">
                <strong>{hintTitle}</strong>
                <span>{hintSub}</span>
              </div>
              <div className="health-progress" aria-hidden="true">
                <i style={{ width: hasAnswers ? '75%' : '50%' }} />
              </div>
              <span className="health-hint-step">Step 1 of 2</span>
            </div>
          </div>
        </section>
      }
    >
      <form className={`questionnaire-card health-card rise-in${leaving ? ' is-leaving' : ''}`} style={{ '--i': 1 }} onSubmit={handleSubmit}>
        <div className="questionnaire-card-heading">
          <h2>About your family</h2>
          <span>Step 1 of 2</span>
        </div>

        <p className="health-question">Who will be living here?</p>
        <p className="health-instruction">Add household members to personalize your results. Your answers stay in this browser tab and are never stored.</p>

        <div className="health-people">
          {people.map((person, i) => (
            <PersonFields
              key={person.id}
              person={person}
              index={i}
              total={people.length}
              open={people.length === 1 || openId === person.id}
              onToggle={() => setOpenId(openId === person.id ? null : person.id)}
              onChange={updatePerson}
              onRemove={() => removePerson(person.id)}
            />
          ))}
          <button type="button" className="health-add" ref={addRef} onClick={addPerson}>
            <AddPersonIcon />
            Add another person
          </button>
        </div>

        <button type="submit" className="health-next" disabled={leaving}>
          Next step
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </form>
    </QuestionnaireLayout>
  )
}
