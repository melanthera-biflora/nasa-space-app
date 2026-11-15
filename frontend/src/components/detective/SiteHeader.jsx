'use client'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import Icon from '../ui/Icon'
import NavMenu from '../ui/NavMenu'
import { intentProps } from '../../lib/intent'
import { STEPS } from '../../presenters/detective'

const DETECTIVE = new Set(STEPS.map((t) => t.href))

// The site's header on every page. The tools menu keeps the current place and variable when you are already
// looking closer; nothing about the household ever goes into these links.
export default function SiteHeader() {
  const path = usePathname()
  const params = useSearchParams()
  const q = DETECTIVE.has(path) && params.toString() ? `?${params}` : ''
  const link = (href, label, icon, extra) => (
    <li><Link href={href} aria-current={path === href ? 'page' : undefined} {...extra}>{icon && <Icon name={icon} size={16} />}{label}</Link></li>
  )
  return (
    <header className="dt-header">
      <a className="skip-link" href="#main">Skip to content</a>
      <Link href="/" className="dt-brand">Climatch</Link>
      <nav aria-label="Main">
        <ul className="dt-nav">
          {link('/', 'Check a place', 'map-pin')}
          {/* a pointer resting on the link starts the 51-city table (29 KB): the page usually opens with it ready */}
          {link('/compare', 'Compare places', 'scale', intentProps('/places/compare'))}
          <li><NavMenu label="Look closer" current={path} items={STEPS.map((t) => ({ ...t, href: `${t.href}${q}` }))} /></li>
          {link('/learn', 'Learn')}
          {link('/about', 'About')}
        </ul>
      </nav>
      <span className="dt-progress" aria-hidden="true" />
    </header>
  )
}
