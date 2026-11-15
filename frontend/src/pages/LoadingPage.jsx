import { useEffect, useState } from 'react'
import Footer from '../components/Footer'
import './LoadingPage.css'

// Thời gian chạy hết 1 vòng 4 mùa (mili giây). Đổi số này nếu muốn nhanh/chậm hơn.
const DURATION = 8000

// Các bước hiển thị trong kính lúp. "doneAt" = tiến độ (0 → 1) mà bước đó được đánh dấu xong.
const STEPS = [
  { label: 'Loading climate data', doneAt: 0.3 },
  { label: 'Removing normal seasonal variation', doneAt: 0.65 },
  { label: 'Comparing with WHO / CDC limits', doneAt: 0.97 },
]

// 4 mùa theo thứ tự chấm sáng chạy qua
const SEASONS = [
  { id: 'spring', name: 'Spring', months: 'Mar – May', color: '#8fe3a8' },
  { id: 'summer', name: 'Summer', months: 'Jun – Aug', color: '#ffd36b' },
  { id: 'autumn', name: 'Autumn', months: 'Sep – Nov', color: '#ffa06e' },
  { id: 'winter', name: 'Winter', months: 'Dec – Feb', color: '#a9d4ff' },
]

// Hình vẽ biểu tượng từng mùa (khung 24×24)
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

// Kích thước vòng quỹ đạo (khớp với CSS)
const DIAL = 640
const CENTER = DIAL / 2
const ORBIT_R = 290
const ORBIT_LENGTH = 2 * Math.PI * ORBIT_R

// Điểm trên vòng tròn theo góc (0° = đỉnh, quay theo chiều kim đồng hồ)
function pointAt(deg, r = ORBIT_R) {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: CENTER + r * Math.cos(rad), y: CENTER + r * Math.sin(rad) }
}

const clamp = (v) => Math.min(1, Math.max(0, v))

// Vị trí cố định cho hạt hiệu ứng. "y" chỉ dùng khi máy tắt hiệu ứng chuyển động.
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
    }, 50)
    return () => clearInterval(timer)
  }, [onComplete])

  // t chạy từ 0 → 4 (mỗi đơn vị là 1 mùa)
  const t = progress * 4
  const seasonIndex = Math.min(3, Math.floor(t))
  const season = SEASONS[seasonIndex]

  // Độ hiện của nền từng mùa: mùa sau hiện dần lên phủ mùa trước
  const layerOpacity = SEASONS.map((_, i) => (i === 0 ? 1 : clamp((t - i + 0.25) / 0.5)))
  // Độ hiện của hiệu ứng thời tiết từng mùa
  const weatherOpacity = layerOpacity.map((o, i) => o * (1 - (layerOpacity[i + 1] ?? 0)))

  const marker = pointAt(progress * 360)
  const currentStep = STEPS.findIndex((step) => progress < step.doneAt)

  return (
    <div className="loading-page">
      {/* Nền đổi màu theo mùa */}
      <div className="loading-scene" aria-hidden="true">
        {SEASONS.map((s, i) => (
          <div
            key={s.id}
            className={`loading-season-bg is-${s.id}`}
            style={{ opacity: layerOpacity[i] }}
          />
        ))}

        {/* Hiệu ứng thời tiết theo mùa */}
        {SEASONS.map((s, i) => (
          <div
            key={s.id}
            className={`loading-weather is-${s.id}`}
            style={{ opacity: weatherOpacity[i] }}
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

      <main className="loading-content">
        <div className="loading-dial">
          {/* Quỹ đạo 4 mùa: thay cho vòng tiến trình */}
          <svg className="loading-orbit" viewBox={`0 0 ${DIAL} ${DIAL}`} aria-hidden="true">
            {/* 12 chấm nhỏ = 12 tháng */}
            {Array.from({ length: 12 }, (_, i) => {
              const p = pointAt(i * 30)
              return <circle key={i} className="loading-month" cx={p.x} cy={p.y} r="2.5" />
            })}

            <circle className="loading-track" cx={CENTER} cy={CENTER} r={ORBIT_R} />
            <circle
              className="loading-trail"
              cx={CENTER}
              cy={CENTER}
              r={ORBIT_R}
              stroke={season.color}
              strokeDasharray={ORBIT_LENGTH}
              strokeDashoffset={ORBIT_LENGTH * (1 - progress)}
              transform={`rotate(-90 ${CENTER} ${CENTER})`}
            />

            {/* Chấm sáng chạy quanh vòng (vẽ trước để đi phía sau biểu tượng mùa) */}
            <g className="loading-marker" style={{ '--c': season.color }}>
              <circle cx={marker.x} cy={marker.y} r="16" className="loading-marker-glow" />
              <circle cx={marker.x} cy={marker.y} r="9" className="loading-marker-core" />
            </g>

            {/* Biểu tượng 4 mùa, đặt giữa mỗi phần tư vòng */}
            {SEASONS.map((s, i) => {
              const p = pointAt(i * 90 + 45)
              const active = i === seasonIndex
              const passed = i < seasonIndex
              return (
                <g key={s.id} transform={`translate(${p.x} ${p.y})`}>
                  <g
                    className={`loading-badge ${active ? 'is-active' : ''} ${passed ? 'is-passed' : ''}`}
                    style={{ '--c': s.color }}
                  >
                    <circle r="30" />
                    <g transform="translate(-12 -12)" className="loading-badge-icon">
                      {SEASON_ICONS[s.id]}
                    </g>
                  </g>
                </g>
              )
            })}
          </svg>

          <section className="loading-lens" aria-live="polite">
            <p className="loading-eyebrow">Analyzing</p>
            <h1 className="loading-title">{location}</h1>

            <p className="loading-season" style={{ '--c': season.color }}>
              <span className="loading-season-dot" />
              {season.name} · {season.months}
            </p>

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

            <p className="loading-note">Reviewing a full year of climate data…</p>

            {/* Thông báo tiến độ cho trình đọc màn hình */}
            <span
              className="loading-sr-only"
              role="progressbar"
              aria-label="Analysis progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
            />
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
