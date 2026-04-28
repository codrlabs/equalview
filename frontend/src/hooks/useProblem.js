import { useEffect, useState } from 'react'
import { apiClient } from '../lib/apiClient'

/**
 * @typedef {import('../../../shared/types.js').Problem} Problem
 *
 * @typedef {{ status: 'loading' } |
 *           { status: 'error', error: string } |
 *           { status: 'ready', data: Problem }} ProblemState
 */

/**
 * Fetch a single problem by id.
 * @param {string|undefined} id
 * @param {{ client?: typeof apiClient }} [opts]
 * @returns {{ data: Problem|null, loading: boolean, error: string|null }}
 */
export function useProblem(id, { client = apiClient } = {}) {
  const missingId = !id
  const [state, setState] = useState(
    /** @type {ProblemState} */ ({ status: 'loading' })
  )

  useEffect(() => {
    if (missingId) return undefined
    let cancelled = false
    client
      .getProblem(id)
      .then((p) => {
        if (!cancelled) setState({ status: 'ready', data: p })
      })
      .catch((err) => {
        if (!cancelled) setState({ status: 'error', error: err.message })
      })
    return () => {
      cancelled = true
    }
  }, [id, client, missingId])

  if (missingId) {
    return { data: null, loading: false, error: 'Missing problem id' }
  }

  return {
    data: state.status === 'ready' ? state.data : null,
    loading: state.status === 'loading',
    error: state.status === 'error' ? state.error : null,
  }
}
