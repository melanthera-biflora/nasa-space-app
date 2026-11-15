// The analysis method as a picture, drawn while the report loads. It is an illustration, not data (the page labels it so):
// 25 years of monthly ups and downs draw in (the seasons), the seasonal swing is taken out, then a straight
// trend with its band is drawn through what is left. Phases follow `progress` (0 → 1); `still` shows the end state.
const W = 480, H = 118, PAD = 10, N = 300
const LO = -1.25, HI = 2.25
const A_END = 0.35, B_END = 0.7, C_END = 0.95
const SEASON_OF_MONTH = [3, 3, 0, 0, 0, 1, 1, 1, 2, 2, 2, 3]   // Jan … Dec → spring 0, summer 1, autumn 2, winter 3

const clamp = (v) => Math.min(1, Math.max(0, v))
const ease = (v) => 1 - (1 - clamp(v)) ** 3
const x = (m) => PAD + (m / (N - 1)) * (W - 2 * PAD)
const y = (v) => PAD + ((HI - v) / (HI - LO)) * (H - 2 * PAD)
const trend = (m) => 0.0035 * m
// Fixed shape: a yearly wave, a slow rise and some year-to-year wobble (deterministic, so every load looks the same)
const SERIES = Array.from({ length: N }, (_, m) => ({
  season: Math.sin((2 * Math.PI * m) / 12 - Math.PI / 2),
  rest: trend(m) + 0.18 * Math.sin(m * 0.37) * Math.cos(m * 0.11),
}))

export default function MethodSketch({ progress, still = false, seasonColors }) {
  const a = still ? 1 : ease(progress / A_END)                       // how much of the record has drawn in
  const k = 1 - 0.88 * (still ? 1 : ease((progress - A_END) / (B_END - A_END)))   // seasonal swing left
  const c = still ? 1 : ease((progress - B_END) / (C_END - B_END))   // how much of the trend has drawn
  const shown = Math.max(2, Math.round(a * N))
  const pts = SERIES.slice(0, shown).map((p, m) => `${x(m).toFixed(1)},${y(p.season * k + p.rest).toFixed(1)}`)
  const head = SERIES[shown - 1]
  const headColor = seasonColors[SEASON_OF_MONTH[(shown - 1) % 12]]
  const tEnd = (N - 1) * c
  const band = `${x(0)},${y(trend(0) + 0.3)} ${x(tEnd)},${y(trend(tEnd) + 0.3)} ${x(tEnd)},${y(trend(tEnd) - 0.3)} ${x(0)},${y(trend(0) - 0.3)}`

  return (
    <svg className="ms" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <line className="ms-base" x1={PAD} x2={W - PAD} y1={y(0)} y2={y(0)} />
      {c > 0 && <polygon className="ms-band" points={band} style={{ opacity: 0.9 * c }} />}
      <polyline className="ms-series" points={pts.join(' ')} />
      {c > 0 && <line className="ms-trend" x1={x(0)} y1={y(trend(0))} x2={x(tEnd)} y2={y(trend(tEnd))} />}
      {c >= 1
        ? <circle className="ms-end" cx={x(N - 1)} cy={y(trend(N - 1))} r="5" />
        : a < 1 && <circle className="ms-head" cx={x(shown - 1)} cy={y(head.season * k + head.rest)} r="5" style={{ fill: headColor }} />}
    </svg>
  )
}
