/**
 * vizably logo — mark + wordmark lockup. The mark reads as a
 * scan/document with a highlighted finding (the dot). Renders inline
 * SVG so color follows `tone`.
 *
 * tone: 'brand' (blue tile) | 'mono' (currentColor) | 'invert' (white)
 */
export default function Logo({ tone = 'brand', showWordmark = true, size = 32, style = {} }) {
  const wordColor = tone === 'invert' ? '#ffffff' : 'var(--text-strong)'

  const mark = tone === 'brand' ? (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect width="40" height="40" rx="11" fill="var(--accent)" />
      <rect x="9" y="15.5" width="22" height="3.6" rx="1.8" fill="#fff" />
      <rect x="9" y="21.9" width="14" height="3.6" rx="1.8" fill="#fff" />
      <circle cx="27" cy="23.7" r="2.1" fill="#fff" />
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true"
      style={{ color: tone === 'mono' ? 'var(--text-strong)' : tone === 'invert' ? '#fff' : 'currentColor' }}>
      <rect x="0.75" y="0.75" width="38.5" height="38.5" rx="10.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="15.5" width="22" height="3.6" rx="1.8" fill="currentColor" />
      <rect x="9" y="21.9" width="14" height="3.6" rx="1.8" fill="currentColor" />
      <circle cx="27" cy="23.7" r="2.1" fill="currentColor" />
    </svg>
  )

  return (
    <span role="img" aria-label="Vizably" style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.34, ...style }}>
      {mark}
      {showWordmark && (
        <span style={{
          font: 'var(--font-sans)', fontWeight: 'var(--weight-bold)', fontSize: size * 0.72,
          letterSpacing: '-0.02em', lineHeight: 1, color: wordColor,
        }}>
          viz<span style={{ color: tone === 'invert' ? '#fff' : 'var(--accent)' }}>ably</span>
        </span>
      )}
    </span>
  )
}
