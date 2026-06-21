import { useState } from 'react'
import { Button, Card } from '../design-system'
import { Ico } from '../lib/icons'

/**
 * Support — donations run through Buy Me a Coffee (Samuel's account).
 * EqualView never handles payment data itself.
 */
export default function DonateView({ onNav }) {
  const BMC = 'https://ko-fi.com/devolabode'
  const PER = 3 // dollars per coffee
  const [count, setCount] = useState(3)

  const tiers = [1, 3, 5]
  const reinvest = [
    ['Wrench', 'Tooling and time to keep the scanner accurate and the codebase healthy.'],
    ['Sparkles', 'Room to grow — like optional AI fix suggestions you power with your own token.'],
    ['Heart', 'Keeping EqualView free, open source, and independent.'],
  ]

  return (
    <div style={{ width: '100%', maxWidth: 760, margin: '0 auto', padding: '48px 24px 72px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ font: 'var(--font-label)', color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: 'var(--text-xs)', marginBottom: 12 }}>Support EqualView</div>
        <h1 style={{ fontSize: 'var(--text-2xl)', letterSpacing: '-0.02em', margin: '0 0 12px', lineHeight: 1.12 }}>Buy Samuel a coffee</h1>
        <p style={{ font: 'var(--font-body)', fontSize: 'var(--text-md)', color: 'var(--text-muted)', maxWidth: 500, margin: '0 auto', lineHeight: 1.6 }}>
          EqualView is free and always will be. Your scans live in your own Drive or repo, so coffees don’t pay for servers — they go straight into making the tool better.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, alignItems: 'start' }}>
        {/* Coffee card */}
        <Card padding="var(--space-6)">
          <div style={{ font: 'var(--font-label)', color: 'var(--text-muted)', marginBottom: 12 }}>How many coffees?</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
            {tiers.map((t) => {
              const active = count === t
              return (
                <button key={t} onClick={() => setCount(t)} style={{
                  height: 88, borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                  border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border-default)'}`,
                  background: active ? 'var(--accent-subtle)' : 'var(--surface-card)',
                  color: active ? 'var(--accent)' : 'var(--text-strong)',
                }}>
                  <span style={{ display: 'flex', gap: 1 }}>{Array.from({ length: t }).map((_, k) => <span key={k} style={{ display: 'inline-flex' }}>{Ico('Coffee', 17, 'currentColor')}</span>)}</span>
                  <span style={{ font: 'var(--font-label)', fontSize: 'var(--text-xs)', color: active ? 'var(--accent)' : 'var(--text-muted)' }}>${t * PER}</span>
                </button>
              )
            })}
          </div>

          <Button variant="primary" size="lg" pill style={{ width: '100%' }} onClick={() => window.open(BMC, '_blank')}
            iconLeft={Ico('Coffee', 18, '#fff')} iconRight={Ico('ExternalLink', 15, '#fff')}>
            {`Buy ${count} coffee${count > 1 ? 's' : ''} · $${count * PER}`}
          </Button>
          <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 14, textAlign: 'center', lineHeight: 1.5 }}>
            {Ico('ExternalLink', 13)} Opens Buy&nbsp;Me&nbsp;a&nbsp;Coffee — secure, no account needed.
          </p>
        </Card>

        {/* Where it goes */}
        <div>
          <h2 style={{ fontSize: 'var(--text-base)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', margin: '4px 0 14px' }}>Where it goes</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {reinvest.map(([icon, text], i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 'var(--radius-sm)', background: 'var(--accent-subtle)', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{Ico(icon, 17, 'currentColor')}</span>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)', lineHeight: 1.5, paddingTop: 6 }}>{text}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 9, alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--green-600)', marginTop: 1 }}>{Ico('RefreshCw', 16, 'currentColor')}</span>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)', lineHeight: 1.5 }}><strong style={{ color: 'var(--text-strong)' }}>100% reinvested.</strong> Read the story behind the project <button onClick={() => onNav('story')} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-link)', cursor: 'pointer', font: 'inherit', textDecoration: 'underline' }}>here</button>.</span>
          </div>
        </div>
      </div>
    </div>
  )
}
