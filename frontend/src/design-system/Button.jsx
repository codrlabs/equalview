/**
 * EqualView primary action button.
 * Variants: primary (filled blue), secondary (outline), ghost (text), danger.
 * Sizes: sm, md, lg. Pill or default radius.
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  pill = false,
  disabled = false,
  iconLeft = null,
  iconRight = null,
  type = 'button',
  onClick,
  style = {},
  ...rest
}) {
  const sizes = {
    sm: { padding: '0 14px', height: 34, fontSize: 'var(--text-sm)' },
    md: { padding: '0 20px', height: 42, fontSize: 'var(--text-base)' },
    lg: { padding: '0 28px', height: 52, fontSize: 'var(--text-md)' },
  }
  const variants = {
    primary: { background: 'var(--accent)', color: 'var(--text-on-accent)', border: '1px solid var(--accent)' },
    secondary: { background: 'var(--surface-card)', color: 'var(--text-strong)', border: '1px solid var(--border-strong)' },
    ghost: { background: 'transparent', color: 'var(--text-link)', border: '1px solid transparent' },
    danger: { background: 'var(--sev-critical)', color: '#fff', border: '1px solid var(--sev-critical)' },
  }
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    fontFamily: 'var(--font-sans)', fontWeight: 'var(--weight-semibold)', lineHeight: 1, letterSpacing: '0.005em',
    borderRadius: pill ? 'var(--radius-pill)' : 'var(--radius-md)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'background var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard), transform var(--duration-fast) var(--ease-standard)',
    whiteSpace: 'nowrap', userSelect: 'none',
    ...sizes[size],
    ...variants[variant],
    ...style,
  }
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={base}
      onMouseDown={(e) => { if (!disabled) e.currentTarget.style.transform = 'translateY(1px)' }}
      onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
      {...rest}
    >
      {iconLeft}{children}{iconRight}
    </button>
  )
}
