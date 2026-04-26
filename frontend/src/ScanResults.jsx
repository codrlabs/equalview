import { useState, useEffect } from 'react'
import ProblemSolutionPage from './components/ProblemSolutionPage.jsx'
import './styles/LandingPage.css'
import './styles/ProblemSolutionPage.css'

export default function ScanResults() {
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedProblem, setSelectedProblem] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const url = urlParams.get('url')
    if (!url) {
      setError('No URL provided in query params')
      setLoading(false)
      return
    }

    fetch(`/api/scan-results?url=${encodeURIComponent(url)}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
        return res.json()
      })
      .then(data => {
        setResults(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const handleBackFromSolution = () => setSelectedProblem(null)

  if (selectedProblem) {
    return (
      <div className="landing-container">
        <ProblemSolutionPage problem={selectedProblem} onBack={handleBackFromSolution} />
      </div>
    )
  }

  if (loading) {
    return <div className="landing-container"><p>Fetching scan results...</p></div>
  }

  if (error) {
    return (
      <div className="landing-container">
        <h1>Scan Results</h1>
        <p>Error: {error}</p>
        <a href="/">← Back to scan</a>
      </div>
    )
  }

  if (!results) {
    return (
      <div className="landing-container">
        <h1>No results</h1>
        <a href="/">← Back to scan</a>
      </div>
    )
  }

  const url = new URLSearchParams(window.location.search).get('url')

  return (
    <div className="landing-container">
      <header className="landing-header">
        <h1 className="landing-title">Scan Results for {url}</h1>
        <a href="/" className="back-link">← New Scan</a>
      </header>

      <section className="landing-problems" aria-labelledby="problems-heading">
        <h2 id="problems-heading">Problems</h2>
        <div className="problems-grid">
          <ProblemCategoryBox
            title="Visual Accessibility"
            problems={results.problems?.visualAccessibility}
            onSelectProblem={setSelectedProblem}
          />
          <ProblemCategoryBox
            title="Structure and Semantics"
            problems={results.problems?.structureAndSemantics}
            onSelectProblem={setSelectedProblem}
          />
          <ProblemCategoryBox
            title="Multi-media"
            problems={results.problems?.multimedia}
            onSelectProblem={setSelectedProblem}
          />
        </div>
      </section>

      <section className="landing-whats-good" aria-labelledby="whats-good-heading">
        <h2 id="whats-good-heading">What's Good</h2>
        <div className="whats-good-box">
          <ul className="whats-good-list">
            {results.whatsGood?.map((item, i) => (
              <li key={i}>{item}</li>
            )) || <li>No positives found.</li>}
          </ul>
        </div>
      </section>

      <button className="landing-scan-btn" onClick={() => {/* PDF TODO */}}>
        Download PDF Report
      </button>
    </div>
  )
}

function ProblemCategoryBox({ title, problems, onSelectProblem }) {
  const list = problems || []

  return (
    <div className="problem-category-box">
      <h3 className="problem-category-title">{title}</h3>
      <div className="problem-category-content">
        {list.length === 0 ? (
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
