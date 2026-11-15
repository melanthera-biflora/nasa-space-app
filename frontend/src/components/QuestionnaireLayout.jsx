import Footer from './Footer'
import './QuestionnaireLayout.css'

export default function QuestionnaireLayout({ children, illustration }) {
  return (
    <div className="questionnaire-app">
      <main className="questionnaire">
        <div className="questionnaire-container">
          <header className="questionnaire-hero">
            <div className="questionnaire-hero-copy">
              <h1>
                Found a great home?
                <br />
                Don’t forget your health.
              </h1>
              <p className="questionnaire-description">
                The climate around your home affects your health
                more than you might think.
              </p>
            </div>
            <div className="questionnaire-art" aria-hidden="true">
              <img className="questionnaire-cloud" src="/images/cloud-moon.png" alt="" />
              <img className="questionnaire-house" src="/images/house-3d.png" alt="" />
            </div>
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