const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// Pick a month: 12 radios in a grid (not <input type="month">, which desktop Firefox and macOS Safari still lack).
// value: 1-12. Arrow keys move and select, like any radio group.
export default function MonthGrid({ legend = 'Month', name, value, onChange }) {
  return (
    <fieldset className="ui-months">
      <legend className="ui-label">{legend}</legend>
      <div className="ui-months-grid">
        {MONTHS.map((m, i) => (
          <label key={m} className="ui-seg-opt">
            <input type="radio" name={name} value={i + 1} checked={value === i + 1} onChange={() => onChange(i + 1)} aria-label={NAMES[i]} />
            <span aria-hidden="true">{m}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
