import Footer from './Footer'
import './QuestionnaireLayout.css'

// `title` gives a later step its own short heading ("Where is the home?") instead of repeating the home page's hero.
export default function QuestionnaireLayout({ children, illustration, leaving = false, title = null, description = null }) {
  return (
    <div className={leaving ? 'questionnaire-app is-leaving' : 'questionnaire-app'}>
      <main className="questionnaire" id="main">
        <div className="questionnaire-container">
          {title ? (
            <header className="questionnaire-hero is-compact">
              <div className="questionnaire-hero-copy rise-in">
                <h1>{title}</h1>
                {description && <p className="questionnaire-description">{description}</p>}
              </div>
            </header>
          ) : (
          <header className="questionnaire-hero">
            <div className="questionnaire-hero-copy rise-in">
              <h1>
                Thinking about a new home?
                <br />
                Investigate its climate trends.
              </h1>
              <p className="questionnaire-description">
                We test 25 years of NASA data to show what changed there,
                how fast, and whether the change is real.
              </p>
            </div>
            <div className="questionnaire-art" aria-hidden="true">
              <img className="questionnaire-cloud" src="/images/cloud-moon.png" alt="" />
              <img className="questionnaire-house" src="/images/house-3d.png" alt="" />
            </div>
          </header>
          )}

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