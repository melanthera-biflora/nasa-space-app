'use client'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import Button, { ButtonLink } from '../components/ui/Button'
import { SkeletonShape } from '../components/ui/Skeleton'
import StatusLine from '../components/ui/StatusLine'
import { useWaitStage } from '../presenters/request'

/** Waiting for data and failing to get it, the same on every page (A3 timeline): the page's shape is held from the
 * start but only fades in after 400 ms (a fast answer never flashes), with a status line; a reason from 3 s, a way out
 * from 10 s; an error gets its plain sentence and Try again. `subject` names what is loading ("California",
 * "51 cities"); `shape` is the page's skeleton (see SkeletonShape). Renders nothing once there is data. */
export function Waiting({ error, waiting, subject, shape = 'chart' }) {
  const stage = useWaitStage(waiting && !error)
  if (error) {
    return (
      <div className="dt-status" role="alert">
        <p>{error}</p>
        <div className="dt-wait-actions">
          <Button variant="secondary" onClick={() => window.location.reload()}>Try again</Button>
          <ButtonLink href="/where" variant="ghost" icon="search">Choose another place</ButtonLink>
        </div>
      </div>
    )
  }
  if (!waiting) return null
  return (
    <div className="dt-wait" aria-busy="true">
      <StatusLine delay={0}>
        {stage === 'waiting' && `Fetching NASA data for ${subject}…`}
        {stage === 'slow' && `Still fetching NASA data for ${subject}. The first look takes a few seconds; after that it's instant.`}
        {stage === 'stuck' && 'This is taking longer than usual.'}
      </StatusLine>
      {stage === 'stuck' && (
        <div className="dt-wait-actions">
          <Button variant="secondary" onClick={() => window.location.reload()}>Try again</Button>
          <ButtonLink href="/where" variant="ghost">Choose another place</ButtonLink>
        </div>
      )}
      <div className="skel-fade"><SkeletonShape shape={shape} /></div>
    </div>
  )
}

/** Loading, error and not-available states for one variable; renders children only when the factor can be shown. */
export function Status({ current, children }) {
  const waiting = !current.error && (current.loading || !current.factor)
  if (current.error || waiting) return <Waiting error={current.error} waiting={waiting} subject={current.placeName} />
  if (!current.factor.available) {
    return <div className="dt-status"><p><b>{current.label}</b> isn&apos;t available here: {current.factor.reason || 'not enough years of data.'}</p></div>
  }
  return children
}

/** "Next step" link that keeps the current analysis. */
export function NextStep({ href, children }) {
  const q = useSearchParams().toString()
  return <Link className="dt-next" href={`${href}${q ? `?${q}` : ''}`}>{children}</Link>
}
