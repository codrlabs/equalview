/**
 * Bucket card on the results page. One per category
 * (Visual Accessibility, Structure & Semantics, Multi-media).
 */
export default function ProblemCategoryBox({ title, problems, onSelectProblem }) {
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
