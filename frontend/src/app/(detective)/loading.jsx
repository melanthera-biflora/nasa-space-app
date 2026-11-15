import { SkeletonShape } from '../../components/ui/Skeleton'

// Shown while a detective page's code loads (production prefetch makes this rare): the same page shape as the data
// wait in views/common.jsx, so the two hand over without a jump.
export default function Loading() {
  return (
    <main className="dt-main" id="main" aria-busy="true">
      <span className="ui-skel" style={{ display: 'block', width: '45%', height: 28, marginBottom: 16 }} aria-hidden="true" />
      <div className="skel-fade"><SkeletonShape shape="chart" /></div>
    </main>
  )
}
