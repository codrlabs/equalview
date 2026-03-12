import { render, screen, fireEvent, act } from '@testing-library/react';
import LandingPage from '../LandingPage';
import { mockScanResults } from '../data/mockScanResults';

// Mock ProblemSolutionPage so we don't render the full component
vi.mock('../components/ProblemSolutionPage', () => {
  return {
    default: function MockSolutionPage({ problem, onBack }) {
      return (
        <div data-testid="solution-page">
          <p>Solution for: {problem.name}</p>
          <button onClick={onBack}>Back</button>
        </div>
      );
    }
  };
});

// Mock window.alert to avoid actual popups
window.alert = vi.fn();

describe('LandingPage Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.alert.mockClear();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  test('renders initial UI correctly', () => {
    render(<LandingPage />);

    expect(screen.getByText('Healcode')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Website URL')).toBeInTheDocument();
    expect(screen.getByText('Scan')).toBeInTheDocument();
    expect(screen.getByText("Run a scan to see what's good about this site.")).toBeInTheDocument();
  });

  test('disables Scan button when URL is empty', () => {
    render(<LandingPage />);
    const button = screen.getByText('Scan');
    expect(button).toBeDisabled();
  });

  test('shows alert for invalid URL', () => {
    render(<LandingPage />);

    fireEvent.change(screen.getByPlaceholderText('Website URL'), {
      target: { value: 'not-a-url' },
    });

    fireEvent.click(screen.getByText('Scan'));

    expect(window.alert).toHaveBeenCalledWith(
      'Please enter a valid URL (e.g., https://example.com)'
    );
  });

  test('runs scan and displays results', async () => {
    render(<LandingPage />);

    fireEvent.change(screen.getByPlaceholderText('Website URL'), {
      target: { value: 'https://example.com' },
    });

    fireEvent.click(screen.getByText('Scan'));

    // Should show scanning state
    expect(screen.getByText('Scanning…')).toBeInTheDocument();

    // Fast-forward the timeout
    act(() => {
      vi.advanceTimersByTime(1200);
    });

    // Now results should appear
    expect(screen.getByText('Visual Accessibility')).toBeInTheDocument();
    expect(screen.getByText('Structure and Semantics')).toBeInTheDocument();
    expect(screen.getByText('Multi-media')).toBeInTheDocument();

    // "What's Good" list should appear
    mockScanResults.whatsGood.forEach((item) => {
      expect(screen.getByText(item)).toBeInTheDocument();
    });
  });

  test('clicking a problem opens the solution page', () => {
    render(<LandingPage />);

    fireEvent.change(screen.getByPlaceholderText('Website URL'), {
      target: { value: 'https://example.com' },
    });

    fireEvent.click(screen.getByText('Scan'));

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    // Click the first problem in Visual Accessibility
    const firstProblem = mockScanResults.problems.visualAccessibility[0];
    fireEvent.click(screen.getByText(firstProblem.name));

    // Should show the mocked solution page
    expect(screen.getByTestId('solution-page')).toBeInTheDocument();
    expect(screen.getByText(`Solution for: ${firstProblem.name}`)).toBeInTheDocument();
  });
});
