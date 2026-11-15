import Link from 'next/link'
import Icon from './Icon'

// One button family (SPEC A3 design contract): primary (one per view), secondary, ghost, and icon-only.
// Disabled buttons stay focusable (aria-disabled) and should come with a reason the user can read.
// Loading keeps the label; the spinner only shows after 400 ms (CSS), so quick actions don't flicker.
function parts({ variant = 'secondary', size, loading, icon, iconEnd, children }) {
  return {
    className: `ui-btn is-${variant}${size === 'sm' ? ' is-sm' : ''}${loading ? ' is-loading' : ''}`,
    body: (
      <>
        {loading ? <span className="ui-spinner" aria-hidden="true" /> : icon && <Icon name={icon} size={variant === 'icon' ? 20 : 18} />}
        {children != null && <span className="ui-btn-label">{children}</span>}
        {iconEnd && <Icon name={iconEnd} size={16} />}
      </>
    ),
  }
}

export default function Button({ variant, size, loading = false, icon, iconEnd, disabled = false, onClick, className = '', children, type = 'button', ...rest }) {
  const { className: cls, body } = parts({ variant, size, loading, icon, iconEnd, children })
  const blocked = disabled || loading
  return (
    <button type={type} className={`${cls} ${className}`} aria-disabled={blocked || undefined} aria-busy={loading || undefined}
      onClick={(e) => { if (blocked) { e.preventDefault(); return } onClick?.(e) }} {...rest}>
      {body}
    </button>
  )
}

/** A link that looks like a button (navigation is a link, not a button). */
export function ButtonLink({ href, variant, size, icon, iconEnd, className = '', children, ...rest }) {
  const { className: cls, body } = parts({ variant, size, icon, iconEnd, children })
  return <Link href={href} className={`${cls} ${className}`} {...rest}>{body}</Link>
}
