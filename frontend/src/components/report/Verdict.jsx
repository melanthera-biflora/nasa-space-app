import Icon from '../ui/Icon'

// Direction and sureness as a small chip: an arrow and words with the colour, never colour alone.
export default function Verdict({ verdict, level }) {
  return (
    <span className="rp-verdicts">
      <span className={`rp-verdict is-${verdict.tone}`}><Icon name={verdict.arrow} size={14} />{verdict.text}</span>
      {level && <span className={`rp-level${level === 'Under the limit' ? '' : ' is-over'}`}>{level}</span>}
    </span>
  )
}
