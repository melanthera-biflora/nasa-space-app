import { useState } from 'react'
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
            <span className="health-status">
              <span className="health-status-dot" />
              Community response: Active
            </span>

            <div className="health-rings" aria-hidden="true">
              <span />
              <span />
            </div>

            <div className="health-check" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M6 12.5l4 4 8-9" />
              </svg>
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

            <div className="health-stat">
              <span className="health-stat-label">Avg. response</span>
              <span className="health-stat-value">
                24 <small>hrs</small>
              </span>
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
