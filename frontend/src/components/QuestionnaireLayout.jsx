import Footer from './Footer'
import './QuestionnaireLayout.css'

export default function QuestionnaireLayout({ children, illustration }) {
  return (
    <div className="questionnaire-app">
      <main className="questionnaire">
        <div className="questionnaire-container">
          <header className="questionnaire-hero">
            <h1>
              Found a great home?
              <br />
              Don’t forget your health.
            </h1>

            <p>
              The climate around your home affects your health more than
              you might think.
            </p>
          </header>

          <div className="questionnaire-columns">
            {children}
            {illustration}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}