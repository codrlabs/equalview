import { Button, Card, SeverityBadge } from '../design-system'
import { Ico } from '../lib/icons'

/** Story / "Why Vizably" — origin, the insight, the invisible problems, the hope. */
export default function StoryView({ onNav }) {
  const examples = [
    { code: '<input placeholder="Email">', level: 'serious',
      sees: 'A tidy field with helpful grey hint text.',
      shuts: 'A screen reader announces “edit text, blank.” No idea what to type.',
      who: 'Blind users', icon: 'EyeOff' },
    { code: '.field--error { border: 1px solid red }', level: 'serious',
      sees: 'Obviously, something went wrong here.',
      shuts: 'With colour-blindness the field looks completely normal.',
      who: 'Colour-blind users', icon: 'Palette' },
    { code: '<div onclick="submit()">Send</div>', level: 'critical',
      sees: 'Clicks and submits exactly as expected.',
      shuts: 'Keyboard users can’t focus it or press it at all.',
      who: 'Keyboard-only users', icon: 'Keyboard' },
    { code: '<img src="sales-chart.png">', level: 'critical',
      sees: 'A clear chart of this quarter’s numbers.',
      shuts: 'A screen reader reads out only one word: “image.”',
      who: 'Blind users', icon: 'ImageOff' },
    { code: '<button class="icon-xs">×</button>', level: 'moderate',
      sees: 'A neat little close button.',
      shuts: 'Hands that tremble miss the 24px target again and again.',
      who: 'Users with motor impairments', icon: 'Hand' },
    { code: '*:focus { outline: none }', level: 'serious',
      sees: 'A cleaner-looking page.',
      shuts: 'Keyboard users lose all track of where they are on it.',
      who: 'Keyboard-only users', icon: 'Navigation' },
  ]

  const H2 = ({ children }) => (
    <h2 style={{ fontSize: 'var(--text-xl)', letterSpacing: '-0.02em', margin: '0 0 14px', lineHeight: 1.15 }}>{children}</h2>
  )
  const P = ({ children, style }) => (
    <p style={{ font: 'var(--font-body)', fontSize: 'var(--text-md)', color: 'var(--text-body)', lineHeight: 1.7, margin: '0 0 16px', textWrap: 'pretty', ...style }}>{children}</p>
  )

  return (
    <div style={{ width: '100%', maxWidth: 820, margin: '0 auto', padding: '52px 24px 72px' }}>

      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: 56 }}>
        <div style={{ font: 'var(--font-label)', color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: 'var(--text-xs)', marginBottom: 14 }}>Our story</div>
        <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--weight-bold)', letterSpacing: '-0.025em', lineHeight: 1.05, margin: '0 auto 18px', maxWidth: 620 }}>
          The web should work<br />for all of us.
        </h1>
        <P style={{ fontSize: 'var(--text-md)', color: 'var(--text-muted)', maxWidth: 560, margin: '0 auto', textWrap: 'balance' }}>
          Vizably exists because too often it doesn’t — and because the tools to fix that have been locked behind a paywall for far too long.
        </P>
      </div>

      {/* Origin */}
      <section style={{ marginBottom: 48 }}>
        <H2>It started with one person</H2>
        <P>
          Every line of Vizably traces back to a single conviction. <strong style={{ color: 'var(--text-strong)' }}>Samuel</strong> didn’t set out to start a company — he set out to fix something he couldn’t unsee. The project is his: his idea, his hands, and his to steward from the first commit onward.
        </P>
        <P>
          He didn’t shape it in isolation. The team at <strong style={{ color: 'var(--text-strong)' }}>Codrlabs</strong> shared their expertise and guided the way, helping turn a stubborn idea into a working tool — without ever taking it out of his hands.
        </P>
        <Card style={{ borderLeft: '3px solid var(--accent)', background: 'var(--surface-card)' }}>
          <p style={{ font: 'var(--font-sans)', fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-lg)', color: 'var(--text-strong)', lineHeight: 1.4, margin: 0, letterSpacing: '-0.01em' }}>
            “If a tool measures whether the web is fair, it should be the first thing that’s fair about it — free, and open to everyone.”
          </p>
        </Card>
      </section>

      {/* The insight */}
      <section style={{ marginBottom: 44 }}>
        <H2>Accessibility is an afterthought — when it’s a thought at all</H2>
        <P>
          Developers ship for the users they can picture. People with disabilities quietly fall outside the frame — not out of malice, but because no one stopped to consider them. And the builders who <em>do</em> care often get priced out: the established tools cost <strong style={{ color: 'var(--text-strong)' }}>$500–$5,000 a month</strong>.
        </P>
        <P style={{ marginBottom: 0 }}>
          Those are exactly the people Vizably is built for — and the ones the rest of the web tends to forget.
        </P>
      </section>

      {/* Invisible problems gallery */}
      <section style={{ marginBottom: 52 }}>
        <H2>The things no one notices</H2>
        <P style={{ marginBottom: 24, color: 'var(--text-muted)' }}>
          None of these look broken if you don’t need them to work. That’s precisely why they slip through.
        </P>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {examples.map((ex, i) => (
            <Card key={i} padding="var(--space-5)" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <code style={{ font: 'var(--font-code)', fontSize: '12.5px', color: '#e6edf3', background: '#0f1620', padding: '7px 10px', borderRadius: 'var(--radius-sm)', lineHeight: 1.45, wordBreak: 'break-word' }}>{ex.code}</code>
                <SeverityBadge level={ex.level} size="sm" showLabel={false} />
              </div>
              <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--text-faint)', marginTop: 1 }}>{Ico('Check', 16, 'currentColor')}</span>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 1.5 }}>{ex.sees}</span>
              </div>
              <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--accent)', marginTop: 1 }}>{Ico(ex.icon, 16, 'currentColor')}</span>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)', lineHeight: 1.5 }}>
                  {ex.shuts}
                  <span style={{ display: 'block', marginTop: 4, font: 'var(--font-label)', fontSize: 'var(--text-xs)', color: 'var(--accent)' }}>{ex.who}</span>
                </span>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Hope */}
      <section style={{ marginBottom: 40 }}>
        <H2>A free reference, built together</H2>
        <P>
          Vizably is free, and it’s meant to stay that way. The more people who contribute, the stronger this free alternative becomes — until anyone, anywhere, can use it as their point of reference without paying a cent.
        </P>
        <P style={{ marginBottom: 0 }}>
          That’s the whole ambition: not to sell accessibility back to the people who need it, but to give it away — and keep making it better, in the open.
        </P>
      </section>

      {/* Donate CTA */}
      <Card style={{ textAlign: 'center', background: 'var(--accent-subtle)', borderColor: 'var(--blue-100)', padding: 'var(--space-7)' }}>
        <div style={{ display: 'inline-flex', width: 46, height: 46, borderRadius: '50%', background: 'var(--accent)', color: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>{Ico('Coffee', 22, '#fff')}</div>
        <h2 style={{ fontSize: 'var(--text-lg)', margin: '0 0 8px' }}>Help keep it free for everyone</h2>
        <p style={{ font: 'var(--font-body)', color: 'var(--ink-800)', maxWidth: 460, margin: '0 auto 20px', lineHeight: 1.6 }}>
          We hope a few will choose to chip in. Every coffee is reinvested in full — into sharper scans, wider WCAG coverage, and the tooling to keep improving it. Nothing goes to servers; your reports live in your own storage.
        </p>
        <Button variant="primary" size="lg" pill onClick={() => onNav('donate')} iconLeft={Ico('Coffee', 17, '#fff')}>Buy me a coffee</Button>
      </Card>
    </div>
  )
}
