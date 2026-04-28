import { useEffect, useState } from 'react'
import { apiClient } from '../lib/apiClient'

/**
 * @typedef {import('../../../shared/types.js').ScanResult} ScanResult
 *
 * @typedef {{ status: 'loading' } |
 *           { status: 'error', error: string } |
 *           { status: 'ready', data: ScanResult }} ScanState
 */

/**
 * Encapsulates the loading / error / data state machine for a scan
 * results fetch. A page that calls `useScan(url)` reads
 * `{ data, loading, error }` and renders accordingly.
 *
 * State is only set inside async resolutions, keeping `useEffect` free
 * of synchronous setState calls (per react-hooks/set-state-in-effect).
 *
 * @param {string|null} url
 * @param {{ client?: typeof apiClient }} [opts]
 * @returns {{ data: ScanResult|null, loading: boolean, error: string|null }}
 */
export function useScan(url, { client = apiClient } = {}) {
  // Derive the "missing url" error synchronously from the input rather
  // than driving it through state, so we don't have to setState inside
  // the effect.
  const missingUrl = !url
  const [state, setState] = useState(
    /** @type {ScanState} */ ({ status: 'loading' })
  )

  useEffect(() => {
    if (missingUrl) return undefined
    let cancelled = false
    client
      .getScanResults(url)
      .then((result) => {
        if (!cancelled) setState({ status: 'ready', data: result })
      })
      .catch((err) => {
        if (!cancelled) setState({ status: 'error', error: err.message })
      })
    return () => {
      cancelled = true
    }
  }, [url, client, missingUrl])

  if (missingUrl) {
    return { data: null, loading: false, error: 'No URL provided in query params' }
  }

  return {
    data: state.status === 'ready' ? state.data : null,
    loading: state.status === 'loading',
    error: state.status === 'error' ? state.error : null,
  }
}
