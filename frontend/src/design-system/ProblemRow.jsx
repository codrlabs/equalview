import { useState } from 'react'
import SeverityBadge from './SeverityBadge'

/**
 * ProblemRow — a single accessibility finding in a results list.
 * Severity badge + name + optional WCAG criterion + count, with a
 * chevron affordance. Behaves as a button when onClick is supplied.
 */
export default function ProblemRow({ name, level = 'moderate', wcag, count, onClick, style = {} }) {
  const [hover, setHover] = useState(false)
  const interactive = typeof onClick === 'function'
  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (interactive && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onClick(e)
        }
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
        background: hover && interactive ? 'var(--bg-subtle)' : 'var(--surface-card)',
        borderBottom: '1px solid var(--border-subtle)',
        cursor: interactive ? 'pointer' : 'default',
        transition: 'background var(--duration-fast) var(--ease-standard)',
        ...style,
      }}
    >
      <SeverityBadge level={level} size="sm" />
      <span style={{ flex: 1, font: 'var(--font-body)', color: 'var(--text-strong)', fontWeight: 'var(--weight-medium)' }}>{name}</span>
      {wcag && (
        <span style={{
          font: 'var(--font-code)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)',
          background: 'var(--bg-inset)', padding: '2px 8px', borderRadius: 'var(--radius-sm)',
        }}>WCAG {wcag}</span>
      )}
      {count != null && (
        <span style={{ font: 'var(--font-label)', color: 'var(--text-muted)', minWidth: 22, textAlign: 'right' }}>{count}</span>
      )}
      {interactive && (
        <span aria-hidden="true" style={{
          color: 'var(--text-faint)', fontSize: 18, lineHeight: 1,
          transform: hover ? 'translateX(2px)' : 'none',
          transition: 'transform var(--duration-fast) var(--ease-standard)',
        }}>›</span>
      )}
    </div>
  )
}
