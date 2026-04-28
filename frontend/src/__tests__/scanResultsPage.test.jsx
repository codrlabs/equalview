import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Stub the apiClient so the hook resolves with our fixture instead of
// hitting the network.
vi.mock('../lib/apiClient', () => ({
  apiClient: {
    getScanResults: vi.fn(),
    runScan: vi.fn(),
    getProblem: vi.fn(),
  },
}))

import { apiClient } from '../lib/apiClient'
import { mockScanResults } from '../data/mockScanResults'
import ScanResultsPage from '../pages/ScanResultsPage'

function renderAt(url) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <ScanResultsPage />
    </MemoryRouter>
  )
}

describe('ScanResultsPage', () => {
  beforeEach(() => {
    apiClient.getScanResults.mockReset()
  })

  it('renders the three buckets after a successful scan', async () => {
    apiClient.getScanResults.mockResolvedValue(mockScanResults)

    renderAt('/scan-results?url=https%3A%2F%2Fexample.com')

    await waitFor(() =>
      expect(screen.getByText('Visual Accessibility')).toBeInTheDocument()
    )
    expect(screen.getByText('Structure and Semantics')).toBeInTheDocument()
    expect(screen.getByText('Multi-media')).toBeInTheDocument()
    expect(screen.getByText("What's Good")).toBeInTheDocument()
  })

  it('shows an error when no ?url= is present', async () => {
    apiClient.getScanResults.mockResolvedValue(mockScanResults)

    renderAt('/scan-results')

    await waitFor(() =>
      expect(screen.getByText(/No URL provided/i)).toBeInTheDocument()
    )
  })

  it('shows an error when the api call fails', async () => {
    apiClient.getScanResults.mockRejectedValue(new Error('HTTP 500: boom'))

    renderAt('/scan-results?url=https%3A%2F%2Fexample.com')

    await waitFor(() =>
      expect(screen.getByText(/HTTP 500: boom/)).toBeInTheDocument()
    )
  })
})
