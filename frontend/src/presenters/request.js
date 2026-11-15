// How long a request has been waiting, in the stages people notice (NN/g thresholds, SPEC A3 loading timeline):
// under 400 ms show nothing new; then a skeleton and a status line; from 3 s say why it takes time; from 10 s offer a
// way out. The API gives up at 30 s on its own (api/http.js).
import { useEffect, useState } from 'react'

export const STAGES = [[10_000, 'stuck'], [3_000, 'slow'], [400, 'waiting'], [0, 'quiet']]

export const waitStage = (ms) => STAGES.find(([from]) => ms >= from)[1]

/** The wait stage while `active` is true; 'quiet' again as soon as it stops. */
export function useWaitStage(active) {
  const [stage, setStage] = useState('quiet')
  useEffect(() => {
    if (!active) return undefined
    const timers = STAGES.filter(([from]) => from > 0).map(([from, name]) => setTimeout(() => setStage(name), from))
    return () => { timers.forEach(clearTimeout); setStage('quiet') }
  }, [active])
  return active ? stage : 'quiet'
}
