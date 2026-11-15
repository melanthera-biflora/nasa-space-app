// A number in a circle (step numbers, counts). Tabular digits, line-height 1 and cap-height trimming keep the digit
// optically centred (research: modern_ui.md 1.3). tone: neutral | brand | accent | highlight.
export default function NumBadge({ children, tone = 'neutral', size = 'md', label }) {
  return <span className={`ui-num is-${tone}${size === 'sm' ? ' is-sm' : ''}`} aria-label={label}>{children}</span>
}
