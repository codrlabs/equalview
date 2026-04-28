import { Link, useParams } from 'react-router-dom'
import ProblemSolutionPage from '../components/ProblemSolutionPage'
import { useProblem } from '../hooks/useProblem'
import '../styles/LandingPage.css'
import '../styles/ProblemSolutionPage.css'

/**
 * Standalone problem detail route — `/problems/:id`. Fetches the
 * problem from the backend so it survives a refresh / direct link.
 */
export default function ProblemPage() {
  const { id } = useParams()
  const { data: problem, loading, error } = useProblem(id)

  if (loading) {
    return (
      <div className="landing-container">
        <p>Loading problem…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="landing-container">
        <h1>Problem</h1>
        <p>Error: {error}</p>
        <Link to="/" className="back-link">
          ← Back to scan
        </Link>
      </div>
    )
  }

  return (
    <div className="landing-container">
      <ProblemSolutionPage problem={problem} />
      <Link to="/" className="back-link">
        ← Back to scan
      </Link>
    </div>
  )
}
