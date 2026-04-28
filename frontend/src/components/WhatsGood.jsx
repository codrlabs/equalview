/**
 * "What's Good" panel rendered below the buckets on the results page.
 *
 * @param {{ items: string[] }} props
 */
export default function WhatsGood({ items }) {
  return (
    <section className="landing-whats-good" aria-labelledby="whats-good-heading">
      <h2 id="whats-good-heading">What's Good</h2>
      <div className="whats-good-box">
        <ul className="whats-good-list">
          {items && items.length > 0 ? (
            items.map((item, i) => <li key={i}>{item}</li>)
          ) : (
            <li>No positives found.</li>
          )}
        </ul>
      </div>
    </section>
  )
}
