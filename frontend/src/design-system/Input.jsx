import { useId, useState } from 'react'

/**
 * Text input with optional leading icon, label and error/hint message.
 * Used for the URL scan field and any form entry. Always renders a
 * visible focus ring; binds label to input for screen readers.
 */
export default function Input({
  label,
  hint,
  error,
  iconLeft = null,
  id,
  size = 'md',
  style = {},
  containerStyle = {},
  ...rest
}) {
  const reactId = useId()
  const inputId = id || reactId
  const sizes = {
    md: { height: 44, fontSize: 'var(--text-base)', padding: iconLeft ? '0 14px 0 42px' : '0 14px' },
    lg: { height: 54, fontSize: 'var(--text-md)', padding: iconLeft ? '0 16px 0 48px' : '0 16px' },
  }
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...containerStyle }}>
      {label && (
        <label htmlFor={inputId} style={{ font: 'var(--font-label)', color: 'var(--text-strong)' }}>{label}</label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {iconLeft && (
          <span style={{
            position: 'absolute', left: size === 'lg' ? 16 : 14, display: 'inline-flex',
            color: 'var(--text-muted)', pointerEvents: 'none',
          }}>{iconLeft}</span>
        )}
        <input
          id={inputId}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined}
          {...rest}
          onFocus={(e) => { setFocused(true); rest.onFocus && rest.onFocus(e) }}
          onBlur={(e) => { setFocused(false); rest.onBlur && rest.onBlur(e) }}
          style={{
            width: '100%',
            fontFamily: 'var(--font-sans)',
            color: 'var(--text-strong)',
            background: 'var(--surface-card)',
            border: `1px solid ${error ? 'var(--sev-critical)' : focused ? 'var(--accent)' : 'var(--border-strong)'}`,
            borderRadius: 'var(--radius-md)',
            outline: 'none',
            boxShadow: focused ? '0 0 0 3px var(--accent-subtle)' : 'none',
            transition: 'border-color var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard)',
            ...sizes[size],
            ...style,
          }}
        />
      </div>
      {error ? (
        <span id={`${inputId}-err`} role="alert" style={{ font: 'var(--font-label)', fontWeight: 'var(--weight-regular)', color: 'var(--sev-critical-fg)' }}>{error}</span>
      ) : hint ? (
        <span id={`${inputId}-hint`} style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{hint}</span>
      ) : null}
    </div>
  )
}
