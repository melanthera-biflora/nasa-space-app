// Placeholder blocks in the real layout while data loads (only after ~400 ms; no shimmer sweep). The region that
// holds them sets aria-busy and has one status line.
export default function Skeleton({ width = '100%', height = 14, round = false, className = '' }) {
  return <span className={`ui-skel${round ? ' is-round' : ''} ${className}`} style={{ width, height }} aria-hidden="true" />
}

const times = (n) => Array.from({ length: n }, (_, i) => i)

/** A page's shape in placeholder blocks (round 5), so nothing jumps when the data lands: `chart` for a Look closer
 *  page (lede, chart, a row of facts), `sections` for /patterns, `compare` for the city list beside its map panel,
 *  `list` for definitions. */
export function SkeletonShape({ shape = 'chart' }) {
  if (shape === 'compare') {
    return (
      <div className="skel-compare">
        <div className="skel-row">{times(3).map((i) => <Skeleton key={i} width={190} height={36} />)}</div>
        <div className="skel-split">
          <div className="skel-stack">
            {times(3).map((i) => (
              <div key={i} className="skel-card">
                <Skeleton width="45%" height={18} />
                {times(3).map((j) => <span key={j} className="skel-bar"><Skeleton height={14} /><Skeleton height={18} /><Skeleton height={14} /></span>)}
              </div>
            ))}
          </div>
          <Skeleton height={460} className="skel-panel" />
        </div>
      </div>
    )
  }
  if (shape === 'sections') {
    return <div className="skel-stack">{times(3).map((i) => <div key={i} className="skel-card"><Skeleton width="35%" height={20} /><Skeleton width="85%" /><Skeleton height={180} /></div>)}</div>
  }
  if (shape === 'list') return <div className="skel-stack">{times(6).map((i) => <span key={i} className="skel-def"><Skeleton width="30%" height={16} /><Skeleton width="90%" /></span>)}</div>
  return (
    <div className="skel-stack">
      <Skeleton width="72%" /><Skeleton width="54%" />
      <Skeleton height={280} />
      <div className="skel-row">{times(3).map((i) => <Skeleton key={i} width="31%" height={56} />)}</div>
    </div>
  )
}

