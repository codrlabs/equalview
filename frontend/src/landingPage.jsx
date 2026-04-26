import { useState } from 'react'
import './styles/LandingPage.css'


export default function LandingPage() {
  const [url, setUrl] = useState('')
  const [scanStatus, setScanStatus] = useState('idle')

  const handleScan = () => {
    if (!url.trim()) return
    
    // Validate URL format
    try {
      new URL(url)
    } catch {
      alert('Please enter a valid URL (e.g., https://example.com)')
      return
    }
    
    setScanStatus('scanning')
    setTimeout(() => {
      window.location.href = `/scan-results?url=${encodeURIComponent(url)}`
    }, 1200)
  }

  return (
    <div className="landing-container">
      <header className="landing-header">
        <h1 className="landing-title">equalview</h1>
      </header>

      <p className="landing-subtitle">
        Scan a website to check accessibility and structure.
      </p>

      <section className="landing-scan-section" aria-label="Website scan">
        <label htmlFor="website-url" className="visually-hidden">Website URL</label>
        <input
          id="website-url"
          type="url"
          className="landing-url-input"
          placeholder="Website URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleScan()}
          disabled={scanStatus === 'scanning'}
          aria-describedby="scan-hint"
        />
        <button
          type="button"
          className="landing-scan-btn"
          onClick={handleScan}
          disabled={scanStatus === 'scanning' || !url.trim()}
          aria-busy={scanStatus === 'scanning'}
        >
          {scanStatus === 'scanning' ? 'Redirecting…' : 'Scan'}
        </button>
        <p id="scan-hint" className="landing-scan-hint visually-hidden">
          Enter a full URL (e.g. https://example.com) and press Scan to analyze the site.
        </p>
      </section>

      <section className="landing-problems" aria-labelledby="problems-heading">
        <h2 id="problems-heading">Problems</h2>
        <div className="problems-placeholder">
          <p>Results will appear on the scan results page after backend integration.</p>
        </div>
      </section>

      <section className="landing-whats-good" aria-labelledby="whats-good-heading">
        <h2 id="whats-good-heading">What&apos;s Good</h2>
        <div className="whats-good-box">
          <p className="placeholder-text">Run a scan to see what&apos;s good about this site.</p>
        </div>
      </section>
    </div>
  )
}

