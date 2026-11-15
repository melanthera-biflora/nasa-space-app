import { format } from '../lib/format'

// Word-sized charts for lists (Tufte's sparklines): bars per year and a line with its first and last value marked.
// Each bar carries a native tooltip; the numbers are also in the text beside them.

export function SparkBars({ points, max, unit = '', mark = null, height = 28, label }) {
  const w = 6, gap = 2, top = max || Math.max(...points.map((p) => p.value), 1)
  return (
    <svg className="pt-spark" viewBox={`0 0 ${points.length * (w + gap)} ${height}`} width={points.length * (w + gap)} height={height} role="img" aria-label={label}>
      {mark != null && <line x1="0" x2={points.length * (w + gap)} y1={height - (mark / top) * height} y2={height - (mark / top) * height} className="pt-spark-mark" />}
      {points.map((p, i) => {
        const h = Math.max(p.value > 0 ? 2 : 0, (p.value / top) * height)
        return <rect key={p.year} x={i * (w + gap)} y={height - h} width={w} height={h} rx="1" className="pt-spark-bar"><title>{p.year}: {format(p.value)}{unit}</title></rect>
      })}
    </svg>
  )
}

export function SparkLine({ values, labels = [], width = 160, height = 32, rising, label }) {
  if (values.length < 2) return null
  const lo = Math.min(...values), hi = Math.max(...values), span = hi - lo || 1
  const X = (i) => 3 + (i / (values.length - 1)) * (width - 6)
  const Y = (v) => 3 + (1 - (v - lo) / span) * (height - 6)
  return (
    <svg className={`pt-spark pt-sparkline${rising ? ' is-rising' : ''}`} viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label={label}>
      <path d={values.map((v, i) => `${i ? 'L' : 'M'}${X(i)},${Y(v)}`).join('')} />
      <circle cx={X(0)} cy={Y(values[0])} r="2.5"><title>{labels[0]}: {format(values[0])}</title></circle>
      <circle cx={X(values.length - 1)} cy={Y(values.at(-1))} r="3"><title>{labels.at(-1)}: {format(values.at(-1))}</title></circle>
    </svg>
  )
}
