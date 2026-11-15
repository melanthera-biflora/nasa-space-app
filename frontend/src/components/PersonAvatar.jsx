import { useState } from 'react'

// The team's portraits (public/images/people/), as 144 px WebP copies in small/: about 5 KB each instead of about
// 700 KB, for a face shown 56 px wide.
const PERSON_ASSETS = {
  '65_plus': ['/images/people/small/senior-man.webp', '/images/people/small/senior-woman.webp'],
  '18_64': ['/images/people/small/adult-man.webp', '/images/people/small/adult-woman.webp'],
  teens: ['/images/people/small/teen-boy.webp', '/images/people/small/teen-girl.webp'],
  children: ['/images/people/small/child-boy.webp', '/images/people/small/child-girl.webp'],
}

function avatarGroup(value) {
  const text = String(value ?? '').toLowerCase().trim()
  if (/65|senior|elder|older/.test(text)) return '65_plus'
  if (/teen|13.?17|5_17/.test(text)) return 'teens'
  if (/child|0.?12|under_5/.test(text)) return 'children'
  if (/adult|18.?64/.test(text)) return '18_64'
  return null
}

export default function PersonAvatar({ ageGroup, assets = PERSON_ASSETS }) {
  // Decorative variant only: this does not assign a gender to the user's profile.
  const [variant] = useState(() => Math.random())
  const [failedSrc, setFailedSrc] = useState(null)
  const candidates = assets[avatarGroup(ageGroup)] || []
  const src = candidates.length ? candidates[Math.floor(variant * candidates.length)] : null
  return (
    <span className="report-avatar" aria-hidden="true">
      {src && src !== failedSrc
        ? <img src={src} alt="" onError={() => setFailedSrc(src)} />
        : <svg viewBox="0 0 64 80" fill="none"><circle cx="32" cy="23" r="16" fill="var(--line)" /><path d="M6 78V65a26 26 0 0 1 52 0v13" fill="var(--line-strong)" /></svg>}
    </span>
  )
}
