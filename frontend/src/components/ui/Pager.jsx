import Button from './Button'

// Pages of a list: Previous, a button per page (the current one marked), Next, and where you are ("7–12 of 31").
// Nothing when everything fits on one page. Disabled ends stay focusable (Button's aria-disabled).
export default function Pager({ page, pages, total, size, onChange, label = 'Pages' }) {
  if (pages < 2) return null
  const from = page * size + 1, to = Math.min(total, (page + 1) * size)
  return (
    <nav className="ui-pager" aria-label={label}>
      <Button size="sm" variant="ghost" icon="chevron-left" disabled={page === 0} onClick={() => onChange(page - 1)}>Previous</Button>
      <ol className="ui-pager-pages">
        {Array.from({ length: pages }, (_, k) => (
          <li key={k}>
            <button type="button" className="ui-pager-num" aria-current={k === page ? 'page' : undefined} aria-label={`Page ${k + 1} of ${pages}`}
              onClick={() => onChange(k)}>{k + 1}</button>
          </li>
        ))}
      </ol>
      <Button size="sm" variant="ghost" iconEnd="chevron-right" disabled={page === pages - 1} onClick={() => onChange(page + 1)}>Next</Button>
      <span className="ui-pager-where" aria-live="polite">{from}–{to} of {total}</span>
    </nav>
  )
}
