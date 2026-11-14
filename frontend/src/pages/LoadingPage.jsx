import { useEffect, useState } from 'react'
import Footer from '../components/Footer'
import './LoadingPage.css'

// Thời gian chạy hiệu ứng loading (mili giây). Đổi số này nếu muốn nhanh/chậm hơn.
const DURATION = 7000

// Các bước hiển thị trong kính lúp. "doneAt" = tiến độ (0 → 1) mà bước đó được đánh dấu xong.
const STEPS = [
  { label: 'Loading climate data', doneAt: 0.3 },
  { label: 'Removing normal seasonal variation', doneAt: 0.6 },
  { label: 'Comparing with WHO / CDC limits', doneAt: 0.95 },
]

// Kích thước vòng tiến trình quanh kính lúp (khớp với CSS)
const RING_SIZE = 470
const RING_STROKE = 8
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2
const RING_LENGTH = 2 * Math.PI * RING_RADIUS

// Vị trí cố định cho các hạt mưa và bông tuyết (cố định để giao diện không nhảy lung tung)
const RAIN = Array.from({ length: 42 }, (_, i) => ({
  left: (i * 37) % 100,
  top: (i * 53) % 90,
  length: 22 + ((i * 7) % 4) * 8,
  delay: ((i * 13) % 20) / 10,
}))

const SNOW = [
  { right: 26, bottom: 30, size: 22 },
  { right: 23, bottom: 24, size: 26 },
  { right: 20, bottom: 25, size: 22 },
  { right: 1.5, bottom: 26, size: 28 },
  { right: 14, bottom: 6, size: 26 },
  { right: 9, bottom: 2, size: 20 },
  { right: 4, bottom: 9, size: 18 },
]

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4.5 8.2l2.3 2.3 4.7-5" />
    </svg>
  )
}

function Snowflake({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M12 2l-2.5 2.5M12 2l2.5 2.5M12 22l-2.5-2.5M12 22l2.5-2.5" />
    </svg>
  )
}

export default function LoadingPage({ location = 'Phoenix, Arizona', onComplete }) {
  const [progress, setProgress] = useState(0)

  // Chạy tiến độ từ 0 đến 1 trong DURATION mili giây
  useEffect(() => {
    const start = Date.now()
    const timer = setInterval(() => {
      const next = Math.min((Date.now() - start) / DURATION, 1)
      setProgress(next)
      if (next >= 1) {
        clearInterval(timer)
        if (onComplete) onComplete()
      }
    }, 100)
    return () => clearInterval(timer)
  }, [onComplete])

  const currentStep = STEPS.findIndex((step) => progress < step.doneAt)

  return (
    <div className="loading-page">
      {/* Nền trang trí: mưa, nắng, tuyết, đất nứt */}
      <div className="loading-scene" aria-hidden="true">
        <div className="loading-cloud loading-cloud-1" />
        <div className="loading-cloud loading-cloud-2" />
        <div className="loading-rain">
          {RAIN.map((drop, i) => (
            <span
              key={i}
              style={{
                left: `${drop.left}%`,
                top: `${drop.top}%`,
                height: `${drop.length}px`,
                animationDelay: `${drop.delay}s`,
              }}
            />
          ))}
        </div>
        <div className="loading-sun" />
        <svg className="loading-cracks" viewBox="0 0 600 260" preserveAspectRatio="none">
          <path d="M0 60 L80 90 L120 70 L190 120 L260 100 L330 150 L420 130 L520 190 L600 170" />
          <path d="M80 90 L95 160 L60 230 M190 120 L170 200 L210 260 M330 150 L350 220 M420 130 L460 60 M120 70 L140 10" />
          <path d="M0 150 L60 230 L130 210 L170 200 L260 240 L350 220 L440 250" />
        </svg>
        <div className="loading-snow">
          {SNOW.map((flake, i) => (
            <span key={i} style={{ right: `${flake.right}%`, bottom: `${flake.bottom}%` }}>
              <Snowflake size={flake.size} />
            </span>
          ))}
        </div>
      </div>

      <main className="loading-content">
        {/* Kính lúp */}
        <div className="loading-magnifier">
          <div className="loading-handle" aria-hidden="true" />

          <svg
            className="loading-ring"
            width={RING_SIZE}
            height={RING_SIZE}
            viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
            aria-hidden="true"
          >
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              strokeWidth={RING_STROKE}
              strokeDasharray={RING_LENGTH}
              strokeDashoffset={RING_LENGTH * (1 - progress)}
            />
          </svg>

          <section className="loading-lens" aria-live="polite">
            <p className="loading-eyebrow">Analyzing</p>
            <h1 className="loading-title">{location}</h1>

            <div
              className="loading-bar"
              role="progressbar"
              aria-label="Analysis progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
            >
              <div className="loading-bar-fill" style={{ width: `${progress * 100}%` }} />
            </div>

            <ul className="loading-steps">
              {STEPS.map((step, i) => {
                const done = progress >= step.doneAt
                const active = i === currentStep
                return (
                  <li
                    key={step.label}
                    className={`loading-step ${done ? 'is-done' : ''} ${active ? 'is-active' : ''}`}
                  >
                    <span className="loading-step-icon">{done && <CheckIcon />}</span>
                    {step.label}
                  </li>
                )
              })}
            </ul>

            <p className="loading-note">This usually takes 5–10 seconds.</p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
