import './App.css'

function App() {
  return (
    <div className="app">
      <main className="questionnaire">
        <div className="page-container">
          <header className="hero">
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

          <div className="questionnaire-layout">
            <section className="form-card">
              <div className="form-heading">
                <h2>About your family</h2>
                <span>STEP 01 / 02</span>
              </div>

              <p>Form sẽ nằm ở đây.</p>
            </section>

            <section
              className="illustration-card"
              aria-label="Climate illustration"
            >
              <span className="status-badge">
                <span className="status-dot" />
                Community response: Active
              </span>
            </section>
          </div>
        </div>
      </main>

      <footer className="footer">
        <p>
          Climatch is for information only and doesn’t replace a doctor’s
          advice.
        </p>
        <p>Hackathon 2026 · [Team name]</p>
      </footer>
    </div>
  )
}

export default App