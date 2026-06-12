/**
 * Small status / count pill. Neutral by default; `tone` selects a
 * semantic color. For accessibility severities use SeverityBadge,
 * which guarantees an icon + label pairing.
 */
export default function Badge({ children, tone = 'neutral', dot = false, style = {}, ...rest }) {
  const tones = {
    neutral: { bg: 'var(--ink-100)', fg: 'var(--ink-700)', dotc: 'var(--ink-400)' },
    accent: { bg: 'var(--blue-50)', fg: 'var(--blue-700)', dotc: 'var(--blue-600)' },
    success: { bg: 'var(--green-50)', fg: 'var(--green-700)', dotc: 'var(--green-600)' },
    warning: { bg: 'var(--sev-moderate-bg)', fg: 'var(--sev-moderate-fg)', dotc: 'var(--sev-moderate)' },
    danger: { bg: 'var(--sev-critical-bg)', fg: 'var(--sev-critical-fg)', dotc: 'var(--sev-critical)' },
  }
  const t = tones[tone] || tones.neutral
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px',
        background: t.bg, color: t.fg,
        font: 'var(--font-label)', fontSize: 'var(--text-xs)', letterSpacing: '0.01em',
        borderRadius: 'var(--radius-pill)', whiteSpace: 'nowrap',
        ...style,
      }}
      {...rest}
    >
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.dotc }} />}
      {children}
    </span>
  )
}
