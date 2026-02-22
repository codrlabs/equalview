import './ProblemSolutionPage.css'

/**
 * Displays a single problem's details and how to fix it.
 * User reaches this view by clicking an individual problem from the scan results.
 */
export default function ProblemSolutionPage({ problem, onBack }) {
  if (!problem) return null

  const { name, rootCause, codeSnippet, solution, category } = problem

  return (
    <article className="problem-solution-page" aria-labelledby="problem-solution-heading">
      <header className="problem-solution-header">
        {onBack && (
          <button type="button" className="problem-solution-back" onClick={onBack} aria-label="Back to results">
            ← Back to results
          </button>
        )}
        <h1 id="problem-solution-heading" className="problem-solution-title">Problem Solution</h1>
        <p className="problem-solution-intro">Review the issue and how to fix it below.</p>
      </header>

      <section className="problem-solution-section" aria-labelledby="problem-name-heading">
        <h2 id="problem-name-heading">Problem Name</h2>
        <p className="problem-name">{name}</p>
        {category && (
          <span className="problem-category" aria-label="Category">{category}</span>
        )}
      </section>

      <section className="problem-solution-section" aria-labelledby="root-cause-heading">
        <h2 id="root-cause-heading">Root Cause</h2>
        <p className="root-cause-description">{rootCause}</p>
        {codeSnippet && (
          <div className="root-cause-code">
            <span className="code-label">Line of code:</span>
            <pre className="code-block"><code>{codeSnippet}</code></pre>
          </div>
        )}
      </section>

      <section className="problem-solution-section" aria-labelledby="solution-heading">
        <h2 id="solution-heading">Suggested Solution for this Problem</h2>
        <div className="solution-content">
          {Array.isArray(solution) ? (
            <ol className="solution-steps">
              {solution.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          ) : (
            <p>{solution}</p>
          )}
        </div>
      </section>
    </article>
  )
}
