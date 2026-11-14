import QuestionnaireLayout from '../components/QuestionnaireLayout'
import './HealthConditionPage.css'

export default function HealthConditionPage() {
  return (
    <QuestionnaireLayout
      illustration={
        <section
          className="health-illustration"
          aria-label="Climate illustration"
        >
          <span className="health-status">
            <span className="health-status-dot" />
            Community response: Active
          </span>
        </section>
      }
    >
      <section className="questionnaire-card">
        <div className="questionnaire-card-heading">
          <h2>About your family</h2>
          <span>STEP 01 / 02</span>
        </div>

        <p className="health-question">
          Does anyone in your household have any of the following health
          conditions?
        </p>

        <p className="health-instruction">
          Select all that apply, then choose the affected age groups under
          “Who?”
        </p>

        {/* Mình sẽ thêm checkbox và dropdown ở bước tiếp theo */}
      </section>
    </QuestionnaireLayout>
  )
}