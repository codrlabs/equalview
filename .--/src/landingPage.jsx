import { useState } from 'react'
import ProblemSolutionPage from './components/ProblemSolutionPage'
import { mockScanResults } from './data/mockScanResults'
import './LandingPage.css'

export default function LandingPage() {
  const [url, setUrl] = useState('')
  const [scanStatus, setScanStatus] = useState('idle') // 'idle' | 'scanning' | 'done'
  const [scanResults, setScanResults] = useState(null)
  const [selectedProblem, setSelectedProblem] = useState(null)

  const handleScan = () => {
    if (!url.trim()) return
    setScanStatus('scanning')
    setScanResults(null)
    // Simulate scan delay; replace with real API call later
    setTimeout(() => {
      setScanResults(mockScanResults)
      setScanStatus('done')
    }, 1200)
  }

  const handleBackFromSolution = () => setSelectedProblem(null)

  // When a problem is selected, show the Problem Solution page
  if (selectedProblem) {
    return (
      <div className="landing-container">
        <ProblemSolutionPage problem={selectedProblem} onBack={handleBackFromSolution} />
      </div>
    )
  }

  const hasResults = scanStatus === 'done' && scanResults
  const showPlaceholder = scanStatus === 'idle' || scanStatus === 'scanning'

  return (
    <div className="landing-container">
      <header className="landing-header">
        <h1 className="landing-title">Healcode</h1>
        {hasResults && (
          <button type="button" className="landing-download-pdf" aria-label="Download results as PDF">
            Download PDF
          </button>
        )}
      </header>

      <p className="landing-subtitle">
        {hasResults ? 'Users can download the PDF version of the results.' : 'Scan a website to check accessibility and structure.'}
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
          {scanStatus === 'scanning' ? 'Scanning…' : 'Scan'}
        </button>
        <p id="scan-hint" className="landing-scan-hint visually-hidden">
          Enter a full URL (e.g. https://example.com) and press Scan to analyze the site.
        </p>
      </section>

      <section className="landing-problems" aria-labelledby="problems-heading">
        <h2 id="problems-heading">Problems</h2>
        <div className="problems-grid">
          <ProblemCategoryBox
            title="Virtual Accessibility"
            problems={scanResults?.problems?.visualAccessibility}
            showPlaceholder={showPlaceholder}
            onSelectProblem={setSelectedProblem}
          />
          <ProblemCategoryBox
            title="Structure and Semantics"
            problems={scanResults?.problems?.structureAndSemantics}
            showPlaceholder={showPlaceholder}
            onSelectProblem={setSelectedProblem}
          />
          <ProblemCategoryBox
            title="Multi-media"
            problems={scanResults?.problems?.multimedia}
            showPlaceholder={showPlaceholder}
            onSelectProblem={setSelectedProblem}
          />
        </div>
      </section>

      <section className="landing-whats-good" aria-labelledby="whats-good-heading">
        <h2 id="whats-good-heading">What&apos;s Good</h2>
        <div className="whats-good-box">
          {showPlaceholder ? (
            <p className="placeholder-text">Run a scan to see what&apos;s good about this site.</p>
          ) : (
            <ul className="whats-good-list">
              {(scanResults?.whatsGood || []).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}

function ProblemCategoryBox({ title, problems, showPlaceholder, onSelectProblem }) {
  const list = problems || []

  return (
    <div className="problem-category-box">
      <h3 className="problem-category-title">{title}</h3>
      <div className="problem-category-content">
        {showPlaceholder ? (
          <p className="placeholder-text">No results yet. Run a scan above.</p>
        ) : list.length === 0 ? (
          <p className="placeholder-text">No issues in this category.</p>
        ) : (
          <ul className="problem-list">
            {list.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="problem-link"
                  onClick={() => onSelectProblem(p)}
                >
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
