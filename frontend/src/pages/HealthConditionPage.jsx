import { useState } from 'react'
import QuestionnaireLayout from '../components/QuestionnaireLayout'
import './HealthConditionPage.css'

// Danh sách bệnh hiển thị trong form
const CONDITIONS = [
  { id: 'asthma', label: 'Asthma or lung disease' },
  { id: 'heart', label: 'Heart disease or high blood pressure' },
  { id: 'allergy', label: 'Pollen, dust, or mold allergies' },
  { id: 'diabetes', label: 'Diabetes' },
  { id: 'kidney', label: 'Kidney Disease' },
]

// Các nhóm tuổi trong ô "Who?"
const AGE_GROUPS = ['Children (0–12)', 'Teens (13–17)', 'Adults (18–64)', '65 and older']
const DEFAULT_AGE = '65 and older'

// Các lựa chọn "không có bệnh" ở dưới cùng (chọn cái này sẽ bỏ chọn các bệnh ở trên)
const OTHER_ANSWERS = [
  { id: 'none', label: 'None' },
  { id: 'not-sure', label: 'Not sure' },
  { id: 'no-answer', label: 'Prefer not to say' },
]

function emptyAnswers() {
  const answers = {}
  ;[...CONDITIONS, { id: 'other' }].forEach((c) => {
    answers[c.id] = { checked: false, who: DEFAULT_AGE }
  })
  return answers
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

export default function HealthConditionPage({ onNext }) {
  const [answers, setAnswers] = useState(emptyAnswers)
  const [otherText, setOtherText] = useState('')
  const [special, setSpecial] = useState(null) // 'none' | 'not-sure' | 'no-answer' | null

  function toggleCondition(id) {
    setSpecial(null)
    setAnswers((prev) => ({ ...prev, [id]: { ...prev[id], checked: !prev[id].checked } }))
  }

  // Chọn nhóm tuổi thì tự đánh dấu luôn bệnh đó
  function changeWho(id, who) {
    setSpecial(null)
    setAnswers((prev) => ({ ...prev, [id]: { checked: true, who } }))
  }

  function chooseSpecial(id) {
    if (special === id) {
      setSpecial(null)
      return
    }
    setSpecial(id)
    setAnswers(emptyAnswers())
    setOtherText('')
  }

  function handleSubmit(e) {
    e.preventDefault()
    const selected = Object.entries(answers)
      .filter(([, a]) => a.checked)
      .map(([id, a]) => ({ id, who: a.who, ...(id === 'other' ? { text: otherText } : {}) }))

    // Dữ liệu gửi sang bước tiếp theo
    const result = { conditions: selected, answer: special }
    if (onNext) onNext(result)
    else console.log('Health answers:', result)
  }

  const rows = [...CONDITIONS, { id: 'other', label: 'Other' }]

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

        <p className="health-question">
          Does anyone in your household have any of the following health conditions?
        </p>

        <p className="health-instruction">
          Select all that apply, then choose the affected age groups under “Who?”
        </p>

        <div className="health-table" role="group" aria-label="Health conditions">
          <span className="health-col-title">Health condition</span>
          <span className="health-col-title">Who?</span>

          {rows.map((row) => (
            <div className="health-row" key={row.id}>
              <label className="health-check-label">
                <input
                  type="checkbox"
                  checked={answers[row.id].checked}
                  onChange={() => toggleCondition(row.id)}
                />
                <span className="health-box" aria-hidden="true" />
                {row.id === 'other' ? (
                  <span className="health-other">
                    Other:
                    <input
                      type="text"
                      className="health-other-input"
                      aria-label="Other health condition"
                      value={otherText}
                      onChange={(e) => {
                        setOtherText(e.target.value)
                        if (e.target.value && !answers.other.checked) toggleCondition('other')
                      }}
                    />
                  </span>
                ) : (
                  row.label
                )}
              </label>

              <div className="health-select-wrap">
                <select
                  className="health-select"
                  aria-label={`Who has ${row.id === 'other' ? 'the other condition' : row.label}`}
                  value={answers[row.id].who}
                  onChange={(e) => changeWho(row.id, e.target.value)}
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
          ))}
        </div>

        <div className="health-special">
          {OTHER_ANSWERS.map((item) => (
            <label className="health-check-label" key={item.id}>
              <input
                type="checkbox"
                checked={special === item.id}
                onChange={() => chooseSpecial(item.id)}
              />
              <span className="health-box" aria-hidden="true" />
              {item.label}
            </label>
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
