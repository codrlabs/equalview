import { useState } from 'react'
import { Button, Card } from '../design-system'
import { Ico, GoogleMark } from '../lib/icons'
import { PROVIDERS } from '../data/placeholders'

/**
 * Connect storage — the step after OAuth. EqualView creates (or reuses) a
 * single repo/Drive folder it will write reports to, with explicit consent.
 *
 * NOTE: placeholder flow — no storage is actually provisioned yet.
 */
export default function ConnectView({ provider, onDone, onCancel }) {
  const pv = PROVIDERS[provider] || PROVIDERS.github
  const [mode, setMode] = useState('new') // new | existing
  const [name, setName] = useState(pv.dest)
  const [existing, setExisting] = useState(pv.existing[0])
  const providerIcon = provider === 'google' ? GoogleMark(20) : Ico('Github', 20)

  const Option = ({ id, icon, title, desc, children }) => {
    const active = mode === id
    return (
      <div onClick={() => setMode(id)} style={{
        border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border-default)'}`,
        background: active ? 'var(--accent-subtle)' : 'var(--surface-card)',
        borderRadius: 'var(--radius-md)', padding: 'var(--space-4)', cursor: 'pointer',
        transition: 'border-color var(--duration-fast) var(--ease-standard), background var(--duration-fast) var(--ease-standard)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <span style={{ flexShrink: 0, width: 22, height: 22, marginTop: 1, borderRadius: '50%', border: `2px solid ${active ? 'var(--accent)' : 'var(--border-strong)'}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            {active && <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)' }} />}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }}>{Ico(icon, 17, 'currentColor')}</span>
              <span style={{ font: 'var(--font-label)', color: 'var(--text-strong)' }}>{title}</span>
            </div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: '4px 0 0', lineHeight: 1.45 }}>{desc}</p>
            {active && children && <div style={{ marginTop: 12 }}>{children}</div>}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '52px 24px 72px' }}>
      <div style={{ width: '100%', maxWidth: 460 }}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 12px', borderRadius: 'var(--radius-pill)', background: 'var(--surface-card)', border: '1px solid var(--border-default)', marginBottom: 16 }}>
            {providerIcon}<span style={{ font: 'var(--font-label)', color: 'var(--text-strong)' }}>{pv.name} connected</span>
            <span style={{ color: 'var(--green-600)' }}>{Ico('Check', 15, 'currentColor')}</span>
          </div>
          <h1 style={{ fontSize: 'var(--text-xl)', margin: '0 0 6px' }}>Where should we save your scans?</h1>
          <p style={{ font: 'var(--font-body)', color: 'var(--text-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.5 }}>
            EqualView writes each report to {pv.article} {pv.unit} in your {pv.name} — you stay in control of it.
          </p>
        </div>

        <Card padding="var(--space-5)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Option id="new" icon="Plus" title={`Create a new ${pv.unit}`} desc={`Recommended — a fresh private ${pv.unitShort} just for EqualView.`}>
              <label style={{ display: 'block', font: 'var(--font-label)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 5 }}>{pv.unit.charAt(0).toUpperCase() + pv.unit.slice(1)} name</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 42, padding: '0 12px', background: 'var(--surface-card)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ color: 'var(--text-faint)' }}>{Ico(pv.destIcon, 16)}</span>
                <input value={name} onClick={(e) => e.stopPropagation()} onChange={(e) => setName(e.target.value)}
                  style={{ flex: 1, border: 'none', outline: 'none', font: 'var(--font-code)', fontSize: 'var(--text-sm)', color: 'var(--text-strong)', background: 'transparent' }} />
                <span style={{ font: 'var(--font-label)', fontSize: 'var(--text-xs)', color: 'var(--green-700)', background: 'var(--green-50)', padding: '2px 7px', borderRadius: 'var(--radius-sm)' }}>Private</span>
              </div>
            </Option>

            <Option id="existing" icon="FolderOpen" title={`Use an existing ${pv.unit}`} desc={`Point EqualView at ${pv.article} ${pv.unit} you already have.`}>
              <div style={{ position: 'relative' }}>
                <select value={existing} onClick={(e) => e.stopPropagation()} onChange={(e) => setExisting(e.target.value)}
                  style={{ width: '100%', height: 42, padding: '0 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', font: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-strong)', background: 'var(--surface-card)', appearance: 'none', cursor: 'pointer' }}>
                  {pv.existing.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }}>{Ico('ChevronDown', 16)}</span>
              </div>
              <p style={{ display: 'flex', gap: 7, alignItems: 'flex-start', fontSize: 'var(--text-xs)', color: 'var(--sev-moderate-fg)', background: 'var(--sev-moderate-bg)', border: '1px solid var(--sev-moderate)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', margin: '10px 0 0', lineHeight: 1.45 }}>
                <span style={{ color: 'var(--sev-moderate)', marginTop: 1 }}>{Ico('TriangleAlert', 14, 'currentColor')}</span>
                <span>Leave EqualView’s files as they are. If reports in this {pv.unit} are renamed or hand-edited, we may not be able to read your history back.</span>
              </p>
            </Option>
          </div>
        </Card>

        {/* Consent */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 16, padding: '12px 16px', background: 'var(--bg-inset)', borderRadius: 'var(--radius-md)' }}>
          <span style={{ color: 'var(--text-muted)', marginTop: 1 }}>{Ico('ShieldCheck', 16, 'currentColor')}</span>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-body)', lineHeight: 1.5, margin: 0 }}>
            Scope requested: <code style={{ font: 'var(--font-code)', color: 'var(--text-strong)' }}>{pv.scope}</code> — {pv.scopeNote.toLowerCase()}. EqualView can’t see or touch anything else in your {pv.name}.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <Button variant="secondary" size="lg" onClick={onCancel}>Back</Button>
          <Button variant="primary" size="lg" style={{ flex: 1 }} onClick={() => onDone(mode)}
            iconRight={Ico('ArrowRight', 17, '#fff')}>
            {mode === 'new' ? `Create ${pv.unit} & continue` : 'Connect & continue'}
          </Button>
        </div>
      </div>
    </div>
  )
}
