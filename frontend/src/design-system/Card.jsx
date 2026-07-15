import { useState } from 'react'

/**
 * Surface container. The default white card used across vizably:
 * 1px subtle border, 10px radius, soft low shadow. `interactive`
 * adds a hover lift; `inset` gives the recessed grey treatment.
 */
export default function Card({
  children,
  interactive = false,
  inset = false,
  padding = 'var(--space-5)',
  as = 'div',
  style = {},
  ...rest
}) {
  const El = as
  const [hover, setHover] = useState(false)
  return (
    <El
      onMouseEnter={() => interactive && setHover(true)}
      onMouseLeave={() => interactive && setHover(false)}
      style={{
        background: inset ? 'var(--bg-subtle)' : 'var(--surface-card)',
        border: `1px solid ${hover ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: inset ? 'none' : hover ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        padding,
        transition: 'box-shadow var(--duration-base) var(--ease-standard), border-color var(--duration-base) var(--ease-standard), transform var(--duration-base) var(--ease-standard)',
        transform: hover ? 'translateY(-2px)' : 'translateY(0)',
        ...style,
      }}
      {...rest}
    >
      {children}
    </El>
  )
}
