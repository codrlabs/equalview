import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'

const navigateMock = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

import LandingPage from '../pages/LandingPage'

describe('LandingPage', () => {
  beforeEach(() => {
    navigateMock.mockReset()
  })

  it('renders the landing page title', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    )
    expect(screen.getByText('equalview')).toBeInTheDocument()
  })

  it('renders the URL input and scan button', async () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    )
    expect(screen.getByLabelText('Website URL')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Scan' })).toBeInTheDocument()
  })

  it('shows validation error for invalid URL and does not navigate', async () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    )

    const input = screen.getByLabelText('Website URL')
    const button = screen.getByRole('button', { name: 'Scan' })

    await userEvent.type(input, 'not-a-valid-url')
    await userEvent.click(button)

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Please enter a valid website address (e.g. https://example.com)'
    )
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('shows validation error for empty URL', async () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    )

    const button = screen.getByRole('button', { name: 'Scan' })
    await userEvent.click(button)

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Scan' })).toBeDisabled()
  })

  it('disables input and button during scanning state', async () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    )

    const input = screen.getByLabelText('Website URL')
    const button = screen.getByRole('button', { name: 'Scan' })

    await userEvent.type(input, 'https://example.com')
    await userEvent.click(button)

    expect(screen.getByLabelText('Website URL')).toBeDisabled()
    expect(button).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Redirecting…' })).toBeInTheDocument()
  })

  it('shows scanning state after valid input', async () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    )

    const input = screen.getByLabelText('Website URL')
    const button = screen.getByRole('button', { name: 'Scan' })

    await userEvent.type(input, 'https://example.com')
    await userEvent.click(button)

    expect(screen.getByRole('button', { name: 'Redirecting…' })).toBeInTheDocument()
  })

  it('shows error for invalid bare domain input', async () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    )

    const input = screen.getByLabelText('Website URL')
    const button = screen.getByRole('button', { name: 'Scan' })

    await userEvent.type(input, 'not-a-domain')
    await userEvent.click(button)

    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('clears validation error when input becomes valid', async () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    )

    const input = screen.getByLabelText('Website URL')
    const button = screen.getByRole('button', { name: 'Scan' })

    await userEvent.type(input, 'badsite')
    await userEvent.click(button)

    expect(screen.getByRole('alert')).toBeInTheDocument()

    await userEvent.clear(input)
    await userEvent.type(input, 'https://good.com')
    await userEvent.click(button)

    expect(screen.getByRole('button', { name: 'Redirecting…' })).toBeInTheDocument()
  })

  it('navigates to scan results after delay when valid URL is entered', async () => {
    vi.useFakeTimers()
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    )

    const input = screen.getByLabelText('Website URL')
    const button = screen.getByRole('button', { name: 'Scan' })

    fireEvent.change(input, { target: { value: 'https://example.com' } })
    fireEvent.click(button)

    expect(button).toHaveTextContent('Redirecting…')

    await vi.advanceTimersByTimeAsync(1300)

    expect(navigateMock).toHaveBeenCalledWith('/scan-results?url=https%3A%2F%2Fexample.com')

    vi.useRealTimers()
  })

  it('renders aria attributes correctly', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    )
    const input = screen.getByLabelText('Website URL')
    expect(input).toHaveAttribute('aria-invalid', 'false')
  })

  it('updates aria-invalid when validation error is shown', async () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    )

    const input = screen.getByLabelText('Website URL')
    const button = screen.getByRole('button', { name: 'Scan' })

    await userEvent.type(input, 'invalid')
    await userEvent.click(button)

    expect(input).toHaveAttribute('aria-invalid', 'true')
  })
})
