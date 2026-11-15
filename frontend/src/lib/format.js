// Formatting shared by the report components. Formatting only: statistics come from the report.
const numberFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })
const smallFormat = new Intl.NumberFormat('en-US', { maximumSignificantDigits: 2 })   // haze 0.13, not 0.1

// A real minus sign (U+2212, as in sign()), and never "-0".
export function format(value) {
  if (!Number.isFinite(value)) return '—'
  const text = (value !== 0 && Math.abs(value) < 1 ? smallFormat : numberFormat).format(Math.abs(value))
  return value < 0 && text !== '0' ? `−${text}` : text
}

export const sign = (value) =>
  Number.isFinite(value) ? `${value > 0 ? '+' : value < 0 ? '−' : ''}${format(Math.abs(value))}` : '—'

export const unitOf = (factor) => factor.unit_short || factor.unit

// Direction of a card for colour and words: 'flat' unless the trend is significant.
export const direction = (f) => (f.trend_direction === 'no_clear_trend' ? 'flat' : f.slope_per_decade > 0 ? 'up' : 'down')
export const DIRECTION_WORDS = { up: '↑ Rising', down: '↓ Falling', flat: '→ No clear trend yet' }
