// Presenter for the analyzing (loading) screen. Pure: given how far the animation has played (0 → 1) and whether
// the report has arrived, it says which step is done, what to say, which season the background shows, and when to
// leave. useAnalyzing() owns the timers. The screen never claims "done" before the report is here.
import { useEffect, useState } from 'react'

export const DURATION = 8000   // one pass of the four seasons and the method sketch (ms)
export const STILL_DURATION = 3000   // with reduced motion nothing moves, so the steps are only read, not watched
export const EXIT_MS = 700     // the fade-out; matches loading-out in LoadingPage.css

export const STEPS = [
  { label: 'Fetching 25 years of NASA data', doneAt: 0.35, note: 'Each wave is one year: summers up, winters down.' },
  { label: 'Removing the normal seasons', doneAt: 0.7, note: 'Taking out the usual swing of each month, so only the change is left.' },
  { label: 'Testing which changes are real', doneAt: 0.95, note: 'Fitting a trend and checking it isn’t just year-to-year noise (Mann-Kendall).' },
]

export const SEASONS = [
  { id: 'spring', name: 'Spring', months: 'Mar – May', color: '#8fe3a8' },
  { id: 'summer', name: 'Summer', months: 'Jun – Aug', color: '#ffd36b' },
  { id: 'autumn', name: 'Autumn', months: 'Sep – Nov', color: '#ffa06e' },
  { id: 'winter', name: 'Winter', months: 'Dec – Feb', color: '#a9d4ff' },
]

const clamp = (v) => Math.min(1, Math.max(0, v))

export function presentAnalyzing(progress, ready) {
  const leaving = progress >= 1 && ready
  const waiting = progress >= 1 && !ready
  // the last step is only done once the report has actually arrived
  const isDone = (i) => progress >= STEPS[i].doneAt && (i < STEPS.length - 1 || ready)
  const firstOpen = STEPS.findIndex((_, i) => !isDone(i))
  const steps = STEPS.map((s, i) => ({ label: s.label, state: isDone(i) ? 'done' : i === firstOpen ? 'active' : 'todo' }))
  const note = waiting ? 'Still fetching NASA data for this place…'
    : leaving ? 'Done. Opening the report…' : STEPS[firstOpen]?.note || ''

  // background: each season fades in over the one before; its weather fades out as the next arrives
  const t = progress * 4
  const layerOpacity = SEASONS.map((_, i) => (i === 0 ? 1 : clamp((t - i + 0.25) / 0.5)))
  const weatherOpacity = layerOpacity.map((o, i) => o * (1 - (layerOpacity[i + 1] ?? 0)))
  return {
    leaving,
    waiting,
    steps,
    note,
    season: SEASONS[Math.min(3, Math.floor(t))],
    layerOpacity,
    weatherOpacity,
    percent: Math.round(progress * 100),
  }
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Plays the animation clock, and hands over (onComplete) once the screen is leaving and has faded out.
export function useAnalyzing({ ready, onComplete }) {
  const [progress, setProgress] = useState(0)
  const [still] = useState(reducedMotion)
  const vm = presentAnalyzing(progress, ready)

  useEffect(() => {
    const start = Date.now()
    const duration = still ? STILL_DURATION : DURATION
    const timer = setInterval(() => {
      const next = Math.min((Date.now() - start) / duration, 1)
      setProgress(next)
      if (next >= 1) clearInterval(timer)
    }, 33)
    return () => clearInterval(timer)
  }, [still])

  useEffect(() => {
    if (!vm.leaving) return undefined
    const exitTimer = setTimeout(() => onComplete?.(), reducedMotion() ? 0 : EXIT_MS)
    return () => clearTimeout(exitTimer)
  }, [vm.leaving, onComplete])

  return { ...vm, progress, still }
}
