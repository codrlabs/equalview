import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import ProblemSolutionPage from '../components/ProblemSolutionPage'
import ProblemCategoryBox from '../components/ProblemCategoryBox'
import WhatsGood from '../components/WhatsGood'
import { useScan } from '../hooks/useScan'
import '../styles/LandingPage.css'
import '../styles/ProblemSolutionPage.css'

export default function ScanResultsPage() {
  const [searchParams] = useSearchParams()
  const url = searchParams.get('url')
  const { data: results, loading, error } = useScan(url)
  const [selectedProblem, setSelectedProblem] = useState(null)

  if (selectedProblem) {
    return (
      <div className="landing-container">
        <ProblemSolutionPage
          problem={selectedProblem}
          onBack={() => setSelectedProblem(null)}
        />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="landing-container">
        <p>Fetching scan results...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="landing-container">
        <h1>Scan Results</h1>
        <p>Error: {error}</p>
        <Link to="/" className="back-link">
          ← Back to scan
        </Link>
      </div>
    )
  }

  if (!results) {
    return (
      <div className="landing-container">
        <h1>No results</h1>
        <Link to="/" className="back-link">
          ← Back to scan
        </Link>
      </div>
    )
  }

  return (
    <div className="landing-container">
      <header className="landing-header">
        <h1 className="landing-title">Scan Results for {url}</h1>
        <Link to="/" className="back-link">
          ← New Scan
        </Link>
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

      <WhatsGood items={results.whatsGood} />
    </div>
  )
}
