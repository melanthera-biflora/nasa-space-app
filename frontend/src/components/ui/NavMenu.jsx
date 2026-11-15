'use client'
import Link from 'next/link'
import { useId } from 'react'
import Icon from './Icon'

// A small navigation menu (APG disclosure navigation: links in a popover, not role="menu"). The native popover gives
// Escape, click-outside and the top layer; focus goes back to the button when it closes.
export default function NavMenu({ label, items, current }) {
  const raw = useId()
  const id = `nav${raw.replace(/[^a-zA-Z0-9]/g, '')}`
  return (
    <span className="ui-navmenu">
      <button type="button" className="ui-navmenu-btn" popoverTarget={id} style={{ anchorName: `--${id}` }}
        aria-current={items.some((it) => it.href === current) ? 'true' : undefined}>
        {label}<Icon name="chevron-down" size={16} />
      </button>
      <span id={id} popover="auto" className="ui-pop ui-pop-menu" style={{ positionAnchor: `--${id}` }}>
        <ul>
          {items.map((it) => (
            <li key={it.href}>
              <Link href={it.href} aria-current={current === it.href ? 'page' : undefined}
                onClick={() => document.getElementById(id)?.hidePopover?.()}>
                <b>{it.label}</b>{it.hint && <span>{it.hint}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </span>
    </span>
  )
}
