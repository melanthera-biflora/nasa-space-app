'use client'
import { motion } from 'motion/react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { STEPS } from '../../presenters/detective'
import NumBadge from '../ui/NumBadge'
import PageSections from './PageSections'

// The detective steps as a side menu (the current one also says what it shows and lists its sections). Each link keeps
// the place, variable and years; picking a step or a section on a phone also closes the drawer it sits in.
export default function StepNav() {
  const path = usePathname()
  const q = useSearchParams().toString()
  const close = () => {
    const side = document.getElementById('dt-side')
    if (side?.matches(':popover-open')) side.hidePopover()
  }
  return (
    <nav className="dt-steps" aria-labelledby="dt-steps-h">
      <p id="dt-steps-h" className="dt-side-title">Steps</p>
      <ol>
        {STEPS.map((s, i) => (
          <li key={s.href}>
            <Link href={`${s.href}${q ? `?${q}` : ''}`} aria-current={path === s.href ? 'step' : undefined} onClick={close} title={s.label}>
              {path === s.href && <motion.span layoutId="dt-step-mark" className="dt-step-mark" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
              <NumBadge size="sm" tone={path === s.href ? 'solid' : 'neutral'}>{i + 1}</NumBadge>
              <span className="dt-step-text"><b>{s.label}</b>{path === s.href && <small>{s.hint}</small>}</span>
            </Link>
            {path === s.href && <PageSections key={path} onJump={close} />}
          </li>
        ))}
      </ol>
      <Link href="/about" className="dt-side-link" onClick={close}>About the data</Link>
    </nav>
  )
}
