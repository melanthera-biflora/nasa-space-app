import { stripeKey, waterSense } from '../../presenters/detective'

// One stripe per year, cool to warm around the period's average (Hawkins' warming stripes): an overview only. Water
// records run brown (drier) to teal (wetter) instead, and the key under the stripes says which is which.
export default function Stripes({ stripes, variable }) {
  if (!stripes.length) return null
  const sense = waterSense(variable)
  const color = (k) => (sense === 'wet' ? `var(--dw-${k})` : sense === 'dry' ? `var(--dw-${10 - k})` : `var(--div-${k})`)
  return (
    <div className="dt-stripes" aria-hidden="true">
      <div className="dt-stripes-row">
        {stripes.map((s) => <span key={s.year} style={{ background: color(s.k) }} title={`${s.year}`} />)}
      </div>
      <p className="dt-stripes-ends"><span>{stripes[0].year}</span><span className="dt-stripes-key">{stripeKey(variable)}</span><span>{stripes.at(-1).year}</span></p>
    </div>
  )
}
