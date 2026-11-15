import { PATHS } from './iconPaths'

// Delicate by default: 1.5 stroke at 20 px, 1.25 at 16 px; hidden from screen readers (the word next to an icon, or the
// button's own name, carries the meaning).
export default function Icon({ name, size = 20, className = '' }) {
  const Glyph = PATHS[name]
  if (!Glyph) return null
  return <Glyph className={`ui-icon ${className}`} size={size} strokeWidth={size <= 16 ? 1.25 : 1.5} absoluteStrokeWidth aria-hidden="true" focusable="false" />
}
