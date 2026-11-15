'use client'
import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import Icon from '../ui/Icon'

const TOP_LINE = 140      // px from the top of the window: a heading above this line is the section you are reading

// The open page's sections, listed under its step in the side menu: a jump to each h2 in the page, the one you are
// reading marked as you scroll, and a way back to the top. The list is read from the page itself (and read again when
// the page changes), so sections that appear once data arrives are listed too. At the bottom of the page the last
// section in view is the one being read (a short last section can never reach the line); a clicked section stays
// marked until the reader scrolls by themself, so the smooth scroll can't move the mark elsewhere.
export default function PageSections({ onJump }) {
  const [items, setItems] = useState([])
  const [current, setCurrent] = useState(null)
  const pinned = useRef(null)

  useEffect(() => {
    const shell = document.querySelector('.dt-shell')
    if (!shell) return undefined
    let timer = 0
    const collect = () => {          // a short timer, not a frame: frames pause in background tabs
      clearTimeout(timer)
      timer = setTimeout(() => {
        const found = [...document.querySelectorAll('#main h2[id]')].filter((h) => !h.closest('dialog, details:not([open])'))
          .map((h) => ({ id: h.id, text: h.textContent.trim() }))
        setItems((old) => (JSON.stringify(old) === JSON.stringify(found) ? old : found))   // no re-render loop
      }, 80)
    }
    collect()
    const watch = new MutationObserver(collect)
    watch.observe(shell, { childList: true, subtree: true })
    return () => { watch.disconnect(); clearTimeout(timer) }
  }, [])

  useEffect(() => {
    let frame = 0
    const spy = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (pinned.current) return
        const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4
        let cur = null
        for (const it of items) {
          const top = document.getElementById(it.id)?.getBoundingClientRect().top
          if (top != null && (top <= TOP_LINE || (atBottom && top < window.innerHeight))) cur = it.id
        }
        setCurrent(cur)
      })
    }
    const unpin = () => { if (pinned.current) { pinned.current = null; spy() } }    // the reader scrolls by themself
    spy()
    window.addEventListener('scroll', spy, { passive: true })
    for (const t of ['wheel', 'touchmove', 'keydown']) window.addEventListener(t, unpin, { passive: true })
    return () => {
      window.removeEventListener('scroll', spy)
      for (const t of ['wheel', 'touchmove', 'keydown']) window.removeEventListener(t, unpin)
      cancelAnimationFrame(frame)
    }
  }, [items])

  function jump(e, id) {
    const target = id === 'main' ? document.querySelector('#main h1') : document.getElementById(id)
    if (!target) return
    e.preventDefault()
    onJump?.()
    pinned.current = id === 'main' ? null : id
    setCurrent(id === 'main' ? items[0]?.id ?? null : id)
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    if (id === 'main') window.scrollTo({ top: 0, behavior })
    else target.scrollIntoView({ behavior, block: 'start' })
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1')
    target.focus({ preventScroll: true })      // the next Tab continues from here, as after a native jump
    history.replaceState(history.state, '', `${window.location.pathname}${window.location.search}${id === 'main' ? '' : `#${id}`}`)
  }

  if (items.length < 2) return null
  return (
    <ul className="dt-sections" aria-label="Sections of this page">
      {items.map((it) => (
        <li key={it.id}>
          <a href={`#${it.id}`} aria-current={current === it.id ? 'location' : undefined} onClick={(e) => jump(e, it.id)}>
            {current === it.id && <motion.span layoutId="dt-section-mark" className="dt-sections-mark" transition={{ type: 'spring', stiffness: 520, damping: 40 }} />}
            <span className="dt-sections-text">{it.text}</span>
          </a>
        </li>
      ))}
      {current && (
        <li><a href="#main" className="dt-sections-top" onClick={(e) => jump(e, 'main')}><Icon name="arrow-up" size={14} />Back to top</a></li>
      )}
    </ul>
  )
}
