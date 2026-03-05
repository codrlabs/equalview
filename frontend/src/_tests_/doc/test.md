# Testing Documentation

## Overview

This document explains how to test the mockScanResults and ProblemSolutionPage components in the Healcode frontend application.

## Test Setup

The frontend uses Vitest as the testing framework with the following configuration:

- **Test Runner**: Vitest
- **DOM Testing**: @testing-library/react
- **Environment**: jsdom
- **Setup File**: `src/setupTests.js`

### Required Dependencies

```bash
npm install vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test mockScanResults
npm test problemSolutionPage
npm test landingPage

# Run tests in watch mode (default)
npm test

# Run tests once without watch mode
npm test -- --run
```

## Test Files

### 1. mockScanResults.test.jsx

**Location**: `frontend/src/_tests_/mockScanResults.test.jsx`

**Purpose**: Tests the mockScanResults data structure and validates its integrity.

**Test Coverage**:
- ✅ Valid structure (object with problems and whatsGood properties)
- ✅ Problems structure (object with category arrays)
- ✅ Problem objects (valid properties and data types)
- ✅ Solution arrays (non-empty arrays of strings)
- ✅ whatsGood array (non-empty array of strings)
- ✅ Valid categories (visualAccessibility, structureAndSemantics, multimedia)
- ✅ Valid code snippets (non-empty strings)

**Key Test Cases**:
```javascript
describe('mockScanResults', () => {
  it('should have a valid structure', () => {
    expect(mockScanResults).toBeDefined()
    expect(typeof mockScanResults).toBe('object')
    expect(mockScanResults).toHaveProperty('problems')
    expect(mockScanResults).toHaveProperty('whatsGood')
  })

  it('should have valid problem objects', () => {
    const problem = mockScanResults.problems.visualAccessibility[0]
    expect(problem).toHaveProperty('id', 'name', 'category', 'rootCause', 'codeSnippet', 'solution')
    expect(typeof problem.id).toBe('string')
    expect(['high', 'medium', 'low']).toContain(problem.severity)
  })
})
```

### 2. ProblemSolutionPage.test.jsx

**Location**: `frontend/src/_tests_/problemSolutionPage.test.jsx`

**Purpose**: Tests the ProblemSolutionPage component functionality and rendering.

**Test Coverage**:
- ✅ Component rendering
- ✅ Problem display (name, category, root cause)
- ✅ Code snippet display
- ✅ Solution display (numbered list)
- ✅ Data integrity validation

**Key Test Cases**:
```javascript
describe('ProblemSolutionPage', () => {
  it('should render the component', () => {
    renderProblemSolutionPage()
    expect(screen.getByText('Problem Solution')).toBeInTheDocument()
  })

  it('should display problem details', () => {
    renderProblemSolutionPage()
    expect(screen.getByText('Root Cause')).toBeInTheDocument()
    expect(screen.getByText('Text and background colors do not meet WCAG AA contrast requirements')).toBeInTheDocument()
  })

  it('should display solutions', () => {
    renderProblemSolutionPage()
    expect(screen.getByText('Suggested Solution for this Problem')).toBeInTheDocument()
    expect(screen.getByText('Increase the contrast ratio to at least 4.5:1')).toBeInTheDocument()
  })
})
```

### 3. landingPage.test.jsx

**Location**: `frontend/src/_tests_/landingPage.test.jsx`

**Purpose**: Tests the LandingPage component functionality and user interactions.

**Test Coverage**:
- ✅ Initial UI rendering
- ✅ URL validation and error handling
- ✅ Scan functionality and state management
- ✅ Problem selection and navigation
- ✅ Mock component integration

**Key Test Cases**:
```javascript
describe('LandingPage Component', () => {
  it('renders initial UI correctly', () => {
    render(<LandingPage />);
    expect(screen.getByText('Healcode')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Website URL')).toBeInTheDocument();
    expect(screen.getByText('Scan')).toBeInTheDocument();
  })

  it('shows alert for invalid URL', () => {
    render(<LandingPage />);
    fireEvent.change(screen.getByPlaceholderText('Website URL'), {
      target: { value: 'not-a-url' },
    });
    fireEvent.click(screen.getByText('Scan'));
    expect(window.alert).toHaveBeenCalledWith('Please enter a valid URL (e.g., https://example.com)');
  })

  it('runs scan and displays results', async () => {
    render(<LandingPage />);
    fireEvent.change(screen.getByPlaceholderText('Website URL'), {
      target: { value: 'https://example.com' },
    });
    fireEvent.click(screen.getByText('Scan'));
    expect(screen.getByText('Scanning…')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(1200); });
    expect(screen.getByText('Visual Accessibility')).toBeInTheDocument();
  })
})
```

## Test Data

### Mock Data Structure

The tests use mock data from `frontend/src/data/mockScanResults.js`:

```javascript
export const mockScanResults = {
  problems: {
    visualAccessibility: [
      {
        id: 'contrast-1',
        name: 'Low contrast between text and background',
        category: 'Visual Accessibility',
        rootCause: 'Text and background colors do not meet WCAG AA contrast requirements (4.5:1 for normal text).',
        codeSnippet: '<p style="color: #999; background: #eee;">Hard to read text</p>',
        solution: [
          'Increase the contrast ratio to at least 4.5:1 for normal text and 3:1 for large text.',
          'Use a tool or browser extension to check contrast (e.g. WebAIM Contrast Checker).',
          'Prefer dark text on light backgrounds or vice versa with sufficient difference.',
        ],
      }
    ],
    structureAndSemantics: [/* ... */],
    multimedia: [/* ... */]
  },
  whatsGood: [
    'Page has a descriptive <title> and language attribute on <html>.',
    // ... more positive feedback
  ]
}
```

## Component Testing

### ProblemSolutionPage Component

**Location**: `frontend/src/components/ProblemSolutionPage.jsx`

**Props**:
- `problem`: Object containing problem details
- `onBack`: Optional callback function for back navigation

**Rendering Structure**:
```jsx
<article className="problem-solution-page">
  <header>
    <h1>Problem Solution</h1>
    <p>Review the issue and how to fix it below.</p>
  </header>
  
  <section>
    <h2>Problem Name</h2>
    <p>{problem.name}</p>
    <span>{problem.category}</span>
  </section>
  
  <section>
    <h2>Root Cause</h2>
    <p>{problem.rootCause}</p>
    <div>
      <span>Line of code:</span>
      <pre><code>{problem.codeSnippet}</code></pre>
    </div>
  </section>
  
  <section>
    <h2>Suggested Solution for this Problem</h2>
    <div>
      <ol>
        {problem.solution.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
    </div>
  </section>
</article>
```

## CSS Testing

**Location**: `frontend/src/styles/ProblemSolutionPage.css`

The component includes comprehensive CSS styling for:
- Responsive design
- Accessibility features
- Visual hierarchy
- Print-friendly layout

## Best Practices

1. **Isolation**: Each test is independent and doesn't rely on other tests
2. **Mocking**: External dependencies are properly mocked
3. **Accessibility**: Tests verify ARIA attributes and semantic HTML
4. **Data Validation**: Tests ensure data integrity and proper structure
5. **User Experience**: Tests cover the complete user interaction flow

## Continuous Integration

Tests should pass before merging to ensure:
- Data structure integrity
- Component functionality
- User interface consistency
- Accessibility compliance

## Troubleshooting

### Common Issues

1. **Import Errors**: Ensure all dependencies are installed
2. **Mock Issues**: Verify mock data structure matches expected format
3. **DOM Queries**: Use appropriate Testing Library queries
4. **Async Operations**: Use proper async/await patterns when needed
5. **Hook Call Errors**: Use `vi.mock()` instead of `jest.mock()` for Vitest compatibility
6. **Timer Issues**: Use `vi.advanceTimersByTime()` instead of `jest.advanceTimersByTime()`

### Debugging Tips

```bash
# Run tests with verbose output
npm test -- --verbose

# Run specific test
npm test -- --testNamePattern="should render the component"

# Debug mode
npm test -- --debug

# Run tests once without watch mode
npm test -- --run

# Run specific test file
npm test landingPage
npm test mockScanResults
npm test problemSolutionPage
