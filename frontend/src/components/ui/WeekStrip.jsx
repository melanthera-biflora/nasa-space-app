// Pick a week of the year: 52 radios in a strip (arrow keys move and select; Home and End jump, as any radio group).
// Each cell says its dates and whether the week was unusual, so colour is never the only cue.
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const words = (mmdd) => `${MON[Number(mmdd.slice(0, 2)) - 1]} ${Number(mmdd.slice(3))}`

export default function WeekStrip({ legend = 'Week', name, blocks, value, onChange }) {
  return (
    <fieldset className="ui-weeks">
      <legend className="ui-label">{legend}</legend>
      <div className="ui-weeks-scroll">
        <div className="ui-weeks-row">
          {blocks.map((b) => (
            <label key={b.week} className={`ui-week${b.unusual ? ` is-${b.unusual}` : ''}`}>
              <input type="radio" name={name} checked={value === b.week} onChange={() => onChange(b.week)}
                aria-label={`Week ${b.week}, ${words(b.start)} to ${words(b.end)}${b.unusual ? `, ${b.unusual === 'high' ? 'above' : 'below'} usual` : ''}`} />
              <span aria-hidden="true" />
            </label>
          ))}
        </div>
        <div className="ui-weeks-months" aria-hidden="true">{MON.map((m) => <span key={m}>{m}</span>)}</div>
      </div>
    </fieldset>
  )
}
