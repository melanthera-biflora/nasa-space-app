import { useEffect, useState } from 'react'
import QuestionnaireLayout from '../components/QuestionnaireLayout'
import './HealthConditionPage.css'

// Danh sách bệnh hiển thị cho mỗi người
const CONDITIONS = [
  { id: 'asthma', label: 'Asthma or lung disease' },
  { id: 'heart', label: 'Heart disease or high blood pressure' },
  { id: 'allergy', label: 'Pollen, dust, or mold allergies' },
  { id: 'diabetes', label: 'Diabetes' },
  { id: 'kidney', label: 'Kidney Disease' },
]

// Các nhóm tuổi trong ô "Age group"
const AGE_GROUPS = ['Children (0–12)', 'Teens (13–17)', 'Adults (18–64)', '65 and older']

// Các lựa chọn "không có bệnh" (chọn cái này sẽ bỏ chọn các bệnh ở trên)
const OTHER_ANSWERS = [
  { id: 'none', label: 'None' },
  { id: 'not-sure', label: 'Not sure' },
  { id: 'no-answer', label: 'Prefer not to say' },
]

// Tin mô phỏng cho live feed (sau này thay bằng dữ liệu API thật)
const FEED_ITEMS = [
  { title: 'Air quality alert', meta: 'Zone 4 · 12 min ago' },
  { title: 'Heat advisory', meta: 'Downtown · 1 hr ago' },
  { title: 'Pollen count rising', meta: 'North side · today' },
  { title: 'Flood watch lifted', meta: 'River district · 3 hr ago' },
]

let nextId = 1
function newPerson() {
  return {
    id: nextId++,
    age: '65 and older',
    conditions: [], // id các bệnh đã chọn, ví dụ ['asthma', 'other']
    otherText: '',
    special: null, // 'none' | 'not-sure' | 'no-answer' | null
  }
}

// Ảnh 3D xuất từ Figma, đặt trong thư mục public/images. Nếu chưa có ảnh thì tự ẩn đi.
function Decoration({ src, className }) {
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      className={className}
      onError={(e) => {
        e.currentTarget.style.display = 'none'
      }}
    />
  )
}

// Chip trạng thái ở góc trên: xoay vòng các tin cộng đồng
function LiveFeed() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % FEED_ITEMS.length), 3500)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="health-status" aria-live="off">
      <span className="health-status-dot" />
      <div className="health-feed">
        {FEED_ITEMS.map((item, i) => (
          <span key={item.title} className={i === index ? 'health-feed-item is-on' : 'health-feed-item'}>
            <b>{item.title}</b>
            <i>{item.meta}</i>
          </span>
        ))}
      </div>
    </div>
  )
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

// Phần câu hỏi của 1 người
function PersonFields({ person, index, total, onChange, onAdd, onRemove }) {
  const prefix = `person-${person.id}`

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

  return (
    <section className="health-person" aria-labelledby={`${prefix}-title`}>
      <div className="health-person-head">
        <h3 className="health-person-title" id={`${prefix}-title`}>
          Person {index + 1}
        </h3>

        {index === 0 ? (
          <button type="button" className="health-add" onClick={onAdd}>
            <AddPersonIcon />
            Add another person
          </button>
        ) : (
          <button
            type="button"
            className="health-remove"
            onClick={onRemove}
            aria-label={`Remove person ${index + 1}`}
          >
            Remove
          </button>
        )}
      </div>

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
        {total > 1 ? 'Health condition' : 'Your health condition'}
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
    </section>
  )
}

export default function HealthConditionPage({ onNext }) {
  const [people, setPeople] = useState(() => [newPerson()])

  function updatePerson(updated) {
    setPeople((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
  }

  function addPerson() {
    setPeople((prev) => [...prev, newPerson()])
  }

  function removePerson(id) {
    setPeople((prev) => prev.filter((p) => p.id !== id))
  }

  // Một người được tính là đã trả lời khi chọn ít nhất một bệnh hoặc một đáp án đặc biệt
  const answeredCount = people.filter((p) => p.conditions.length > 0 || p.special).length
  const hasAnswers = answeredCount > 0
  const allAnswered = answeredCount === people.length

  let statusTitle = 'Waiting for your answers'
  let statusSub = 'Pick any health conditions on the left.'
  let hintTitle = 'Next: your personalized risk map'
  let hintSub = 'Takes about 10 seconds to build.'
  if (hasAnswers) {
    statusTitle = allAnswered
      ? 'All set'
      : `Got answers for ${answeredCount} of ${people.length} people`
    statusSub = allAnswered
      ? 'Your map will highlight the risks that matter most to you.'
      : 'Answer for everyone to get the most accurate map.'
    hintTitle = 'Ready when you are'
    hintSub = 'Continue to see your personalized risk map.'
  }

  function handleSubmit(e) {
    e.preventDefault()

    // Dữ liệu gửi sang bước tiếp theo: mỗi người gồm nhóm tuổi và danh sách bệnh
    const household = people.map((p) => ({
      age: p.age,
      conditions: p.conditions,
      otherText: p.conditions.includes('other') ? p.otherText : '',
      answer: p.special,
    }))

    if (onNext) onNext(household)
    else console.log('Household:', household)
  }

  return (
    <QuestionnaireLayout
      illustration={
        <section className="health-illustration" aria-label="Climate illustration">
          <Decoration src="/images/cloud-moon.png" className="health-deco health-deco-cloud" />
          {/* Ảnh nhà đã có sẵn cơn lốc bên trong */}
          <Decoration src="/images/house-3d.png" className="health-deco health-deco-house" />

          <div className="health-panel">
            <LiveFeed />

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

            {/* Ngọn đồi với đường đi, cây và ngôi nhà nhỏ */}
            <div className="health-hill" aria-hidden="true">
              <span className="health-road" />
              <span className="health-tree health-tree-left" />
              <span className="health-tree health-tree-right" />
              <span className="health-small-house" />
              <span className="health-bin">
                <svg viewBox="0 0 24 24">
                  <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />
                </svg>
              </span>
            </div>

            <div className="health-hint">
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
      <form className="questionnaire-card health-card" onSubmit={handleSubmit}>
        <div className="questionnaire-card-heading">
          <h2>About your family</h2>
          <span>STEP 01 / 02</span>
        </div>

        <p className="health-question">Who will be living here?</p>
        <p className="health-instruction">Add household members to personalize your results.</p>

        <div className="health-people">
          {people.map((person, i) => (
            <PersonFields
              key={person.id}
              person={person}
              index={i}
              total={people.length}
              onChange={updatePerson}
              onAdd={addPerson}
              onRemove={() => removePerson(person.id)}
            />
          ))}
        </div>

        <button type="submit" className="health-next">
          Next step
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </form>
    </QuestionnaireLayout>
  )
}
