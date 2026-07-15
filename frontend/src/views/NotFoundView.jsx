import { Button } from '../design-system'
import { Ico } from '../lib/icons'

/** 404 — fallback for any unknown route. */
export default function NotFoundView({ onNav }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '64px 24px' }}>
      <div style={{ font: 'var(--font-sans)', fontWeight: 'var(--weight-bold)', fontSize: 'var(--text-4xl)', letterSpacing: '-0.03em', color: 'var(--accent)', lineHeight: 1 }}>404</div>
      <h1 style={{ fontSize: 'var(--text-xl)', margin: '16px 0 8px' }}>This page took a wrong turn</h1>
      <p style={{ font: 'var(--font-body)', fontSize: 'var(--text-md)', color: 'var(--text-muted)', maxWidth: 420, lineHeight: 1.6, margin: '0 0 26px', textWrap: 'balance' }}>
        We couldn’t find what you were looking for. It may have moved, or never existed. Let’s get you back on track.
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Button variant="primary" onClick={() => onNav('landing')} iconLeft={Ico('House', 16, '#fff')}>Back home</Button>
        <Button variant="secondary" onClick={() => onNav('story')}>Why Vizably</Button>
      </div>
    </div>
  )
}
