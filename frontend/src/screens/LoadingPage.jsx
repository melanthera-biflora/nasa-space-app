import Footer from '../components/Footer'
import MethodSketch from '../components/MethodSketch'
import { SEASONS, useAnalyzing } from '../presenters/analyzing'
import './LoadingPage.css'

// A view (Model-View-Presenter): presenters/analyzing.js decides the steps, the note, the season and when to leave.

// An icon for each season (24×24 box)
const SEASON_ICONS = {
  spring: (
    <>
      <path d="M12 21v-8" />
      <path d="M12 13c0-4 3-7 7-7 0 4-3 7-7 7z" />
      <path d="M12 15.5c0-3.2-2.6-5.7-6.2-5.7 0 3.5 2.6 5.7 6.2 5.7z" />
    </>
  ),
  summer: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
    </>
  ),
  autumn: (
    <>
      <path d="M5 19c0-8 6-14 15-14 0 9-6 15-14 15" />
      <path d="M5 19l8-8" />
    </>
  ),
  winter: (
    <>
      <path d="M12 2.5v19M3.8 7.2l16.4 9.6M3.8 16.8l16.4-9.6" />
      <path d="M9.5 4l2.5 2 2.5-2M9.5 20l2.5-2 2.5 2" />
    </>
  ),
}

// Fixed places for the effect particles. "y" is used only with reduced motion.
const makeParticles = (count, seed) =>
  Array.from({ length: count }, (_, i) => ({
    left: (i * 37 + seed) % 100,
    y: (i * 53 + seed) % 88,
    size: 0.7 + ((i * 7 + seed) % 5) * 0.15,
    duration: 6 + ((i * 11 + seed) % 7) * 0.8,
    delay: -(((i * 29 + seed) % 97) / 10),
  }))

const PARTICLES = {
  spring: makeParticles(18, 3),
  summer: makeParticles(16, 11),
  autumn: makeParticles(18, 19),
  winter: makeParticles(32, 27),
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4.5 8.2l2.3 2.3 4.7-5" />
    </svg>
  )
}

// `ready` is true once the report has arrived; the page fades out only when the animation has played and the
// report is ready (presenters/analyzing.js), so a slow first report never leaves a blank, faded screen.
export default function LoadingPage({ location = 'Phoenix, Arizona', onComplete, ready = true }) {
  const vm = useAnalyzing({ ready, onComplete })

  return (
    <div className={vm.leaving ? 'loading-page is-leaving' : 'loading-page'}>
      {/* Background that changes with the season */}
      <div className="loading-scene" aria-hidden="true">
        {SEASONS.map((s, i) => (
          <div
            key={s.id}
            className={`loading-season-bg is-${s.id}`}
            style={{ opacity: vm.layerOpacity[i] }}
          />
        ))}

        {/* Weather effects for the season */}
        {SEASONS.map((s, i) => (
          <div
            key={s.id}
            className={`loading-weather is-${s.id}`}
            style={{ opacity: vm.weatherOpacity[i] }}
          >
            {s.id === 'summer' && <div className="loading-summer-sun" />}
            {PARTICLES[s.id].map((p, j) => (
              <span
                key={j}
                style={{
                  left: `${p.left}%`,
                  '--y': `${p.y}%`,
                  '--s': p.size,
                  animationDuration: `${p.duration}s`,
                  animationDelay: `${p.delay}s`,
                }}
              />
            ))}
          </div>
        ))}

        <div className="loading-hill loading-hill-back" />
        <div className="loading-hill loading-hill-front" />
      </div>

      <main className="loading-content" id="main">
        <section className={`loading-card${vm.leaving ? ' is-done' : ''}`} aria-labelledby="loading-title">
          <div className="loading-head">
            <p className="loading-eyebrow">Analyzing</p>
            <p className="loading-season" style={{ '--c': vm.season.color }}>
              <span className="loading-season-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">{SEASON_ICONS[vm.season.id]}</svg>
              </span>
              {vm.season.name}
            </p>
          </div>
          <h1 id="loading-title" className="loading-title">{location}</h1>

          <figure className="loading-sketch">
            <MethodSketch progress={vm.progress} still={vm.still} seasonColors={SEASONS.map((s) => s.color)} />
            <figcaption>How the test works · an illustration, not this place’s data</figcaption>
          </figure>

          <ol className="loading-steps">
            {vm.steps.map((step) => (
              <li key={step.label} className={`loading-step is-${step.state}`}>
                <span className="loading-step-icon" aria-hidden="true">{step.state === 'done' && <CheckIcon />}</span>
                {step.label}
                <span className="sr-only">{step.state === 'done' ? ' (done)' : step.state === 'active' ? ' (in progress)' : ''}</span>
              </li>
            ))}
          </ol>

          <p className="loading-note" aria-live="polite">{vm.note}</p>
          <div className={`loading-bar${vm.waiting ? ' is-waiting' : ''}`} role="progressbar" aria-label="Analysis progress"
            aria-valuemin={0} aria-valuemax={100} aria-valuenow={vm.percent}
            aria-valuetext={vm.waiting ? 'Waiting for NASA data' : undefined}>
            <i style={{ transform: `scaleX(${vm.waiting ? 1 : vm.progress})` }} />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
