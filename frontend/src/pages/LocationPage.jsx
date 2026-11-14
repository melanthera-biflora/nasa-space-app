import QuestionnaireLayout from '../components/QuestionnaireLayout'
import './LocationPage.css'

export default function LocationPage() {
  return (
    <QuestionnaireLayout
      illustration={
        <section className="location-map" aria-label="Location map">
          Map will appear here
        </section>
      }
    >
      <section className="questionnaire-card">
        <div className="questionnaire-card-heading">
          <h2>Location information</h2>
          <span>STEP 02 / 02</span>
        </div>

        <p>Address search will appear here.</p>
      </section>
    </QuestionnaireLayout>
  )
}