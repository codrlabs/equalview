/**
 * ScoreDial — circular accessibility score (0–100). The ring color
 * follows severity bands but the numeric value and grade label carry
 * the meaning, so it is never color-only.
 */
export default function ScoreDial({ value = 0, size = 132, label = 'Score', stroke = 10 }) {
  const v = Math.max(0, Math.min(100, value))
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - v / 100)
  const band = v >= 90 ? { color: 'var(--green-600)', grade: 'Good' }
    : v >= 70 ? { color: 'var(--sev-moderate)', grade: 'Fair' }
    : v >= 50 ? { color: 'var(--sev-serious)', grade: 'Poor' }
    : { color: 'var(--sev-critical)', grade: 'Critical' }

  return (
    <div
      style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
      role="img"
      aria-label={`${label}: ${v} out of 100, ${band.grade}`}
    >
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ink-100)" strokeWidth={stroke} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={band.color} strokeWidth={stroke}
            strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset var(--duration-slow) var(--ease-out)' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{
            font: 'var(--font-sans)', fontWeight: 'var(--weight-bold)', fontSize: size * 0.3,
            lineHeight: 1, color: 'var(--text-strong)', letterSpacing: '-0.02em',
          }}>{v}</span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 'var(--weight-semibold)' }}>/ 100</span>
        </div>
      </div>
      <span style={{ font: 'var(--font-label)', color: band.color }}>{band.grade}</span>
    </div>
  )
}
