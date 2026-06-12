import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isValidUrl } from '../utils/urlValidator'
import { normalizeUrl } from '../utils/urlValidator'
import '../styles/LandingPage.css'

/** Visual delay so users can see the "Scanning…" state on local dev. */
const SCAN_REDIRECT_DELAY_MS = 1200

export default function LandingPage() {
  const [url, setUrl] = useState('')
  const [scanStatus, setScanStatus] = useState('idle')
  const [validationError, setValidationError] = useState('')
  const navigate = useNavigate()

  const handleScan = () => {
    if (!url.trim()) return
  
    const normalized = normalizeUrl(url)
    if (!isValidUrl(normalized)) {
      setValidationError('Please enter a valid website address (e.g. https://example.com)')
      return
    }
    setValidationError('')
  
    setScanStatus('scanning')
    setTimeout(() => {
      navigate(`/scan-results?url=${encodeURIComponent(normalized)}`)
    }, SCAN_REDIRECT_DELAY_MS)
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
        <label htmlFor="website-url" className="visually-hidden">
          Website URL
        </label>
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
          aria-invalid={validationError ? 'true' : 'false'}
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
        {validationError && (
          <p role="alert" className="landing-validation-error">
            {validationError}
          </p>
        )}
        <p id="scan-hint" className="landing-scan-hint visually-hidden">
          Enter a full URL (e.g. https://example.com) and press Scan to analyze
          the site.
        </p>
      </section>
    </div>
  )
}
