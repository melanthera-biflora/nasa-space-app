import Icon from '../ui/Icon'
import Verdict from './Verdict'
import YearBars from './YearBars'

// One of the "Most important for you" cards: the record, its two numbers, a picture of the years, the verdict in
// words and why it matters for this household. "See the details" opens its row below.
export default function TopCard({ detail, onOpen, mine = true }) {
  return (
    <article className="rp-top" aria-labelledby={`top-${detail.key}`}>
      {mine && detail.priority && <span className="rp-mine">For your household</span>}
      <div className="rp-top-head">
        <span className="rp-icon"><Icon name={detail.icon} size={18} /></span>
        <h3 id={`top-${detail.key}`}>{detail.name}</h3>
      </div>
      <p className="rp-numbers"><b>{detail.then}</b><span aria-hidden="true"> → </span><span className="sr-only"> to </span><b>{detail.now}</b> {detail.unit}</p>
      <p className="rp-years">{detail.thenYears} vs {detail.nowYears}</p>
      {detail.quality && <p className="rp-quality">{detail.quality}</p>}
      <YearBars points={detail.points} marks={detail.marks} unit={detail.unit} compact />
      <Verdict verdict={detail.verdict} level={detail.level} />
      {detail.verdict.why && <p className="rp-unclear">{detail.verdict.why}</p>}
      {detail.sentences[2] && <p className="rp-why">{detail.sentences[2]}</p>}
      <button type="button" className="rp-open" onClick={() => onOpen(detail.key)}>See the details<Icon name="chevron-down" size={16} /></button>
    </article>
  )
}
