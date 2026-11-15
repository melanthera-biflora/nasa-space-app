// Warm the cache when someone shows intent: pointer resting on a link for 100 ms (not a sweep), or keyboard focus.
import { prefetch } from '../api/http'

export function intentProps(path) {
  let timer
  return {
    onPointerEnter: () => { timer = setTimeout(() => prefetch(path), 100) },
    onPointerLeave: () => clearTimeout(timer),
    onFocus: () => prefetch(path),
  }
}
