// Keyboard navigation inside a chart (WAI-ARIA "roving tabindex"): the chart is one tab stop, and the arrow keys,
// Home and End move between its items. Items carry `data-roving`; their order in the SVG is the order of travel.
const STEPS = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }

export function rovingIndex(key, index, count) {
  if (!count) return null
  if (key === 'Home') return 0
  if (key === 'End') return count - 1
  if (!(key in STEPS)) return null
  return Math.min(count - 1, Math.max(0, index + STEPS[key]))
}

// A chart that is one tab stop and reads one item at a time (a year, a month): Left and Right step one, Page Up and
// Page Down five, Home and End jump to the ends. Returns the next index, or null for any other key.
export function chartIndex(key, index, count) {
  const next = { ArrowRight: index + 1, ArrowLeft: index - 1, PageUp: index + 5, PageDown: index - 5, Home: 0, End: count - 1 }[key]
  return next === undefined || !count ? null : Math.max(0, Math.min(count - 1, next))
}

// onKeyDown for an item: focus the next one in the same SVG. Returns true when it handled the key.
export function moveFocus(event) {
  const items = [...(event.currentTarget.ownerSVGElement?.querySelectorAll('[data-roving]') || [])]
  const to = rovingIndex(event.key, items.indexOf(event.currentTarget), items.length)
  if (to === null) return false
  event.preventDefault()
  items[to].focus()
  return true
}
