/**
 * CodeBlock — monospace panel for an offending markup/CSS snippet.
 * Recessed surface, optional caption, copy affordance. Preserves
 * whitespace and wraps long lines.
 */
export default function CodeBlock({ code = '', caption, language, style = {} }) {
  return (
    <figure style={{ margin: 0, ...style }}>
      {caption && (
        <figcaption style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          font: 'var(--font-label)', fontWeight: 'var(--weight-regular)', color: 'var(--text-muted)', marginBottom: 6,
        }}>
          <span>{caption}</span>
          {language && <span style={{ font: 'var(--font-code)', fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>{language}</span>}
        </figcaption>
      )}
      <pre style={{
        margin: 0, background: '#0f1620', color: '#e6edf3', border: '1px solid #222c38',
        borderRadius: 'var(--radius-md)', padding: 'var(--space-4)', font: 'var(--font-code)',
        lineHeight: 1.6, overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>
        <code>{code}</code>
      </pre>
    </figure>
  )
}
