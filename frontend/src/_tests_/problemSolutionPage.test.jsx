import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ProblemSolutionPage from '../components/ProblemSolutionPage'

// Mock the data import
const mockScanResults = {
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
      },
    ],
  },
  whatsGood: [
    'Page has a descriptive <title> and language attribute on <html>.',
  ],
}

// Mock the data module
vi.mock('../data/mockScanResults', () => ({
  mockScanResults,
}))

describe('ProblemSolutionPage', () => {
  const renderProblemSolutionPage = (problem = mockScanResults.problems.visualAccessibility[0]) => {
    return render(
      <ProblemSolutionPage problem={problem} />
    )
  }

  beforeEach(() => {
    // Mock window.location.hash
    delete window.location
    window.location = { hash: '#problem-contrast-1' }
  })

  it('should render the component', () => {
    renderProblemSolutionPage()
    
    expect(screen.getByText('Problem Solution')).toBeInTheDocument()
  })

  it('should display the correct problem when hash matches', () => {
    renderProblemSolutionPage()
    
    expect(screen.getByText('Low contrast between text and background')).toBeInTheDocument()
    expect(screen.getByText('Visual Accessibility')).toBeInTheDocument()
  })

  it('should display problem details', () => {
    renderProblemSolutionPage()
    
    expect(screen.getByText('Root Cause')).toBeInTheDocument()
    expect(screen.getByText('Text and background colors do not meet WCAG AA contrast requirements (4.5:1 for normal text).')).toBeInTheDocument()
  })

  it('should display code snippet', () => {
    renderProblemSolutionPage()
    
    expect(screen.getByText('Line of code:')).toBeInTheDocument()
    expect(screen.getByText('<p style="color: #999; background: #eee;">Hard to read text</p>')).toBeInTheDocument()
  })

  it('should display solutions', () => {
    renderProblemSolutionPage()
    
    expect(screen.getByText('Suggested Solution for this Problem')).toBeInTheDocument()
    expect(screen.getByText('Increase the contrast ratio to at least 4.5:1 for normal text and 3:1 for large text.')).toBeInTheDocument()
    expect(screen.getByText('Use a tool or browser extension to check contrast (e.g. WebAIM Contrast Checker).')).toBeInTheDocument()
    expect(screen.getByText('Prefer dark text on light backgrounds or vice versa with sufficient difference.')).toBeInTheDocument()
  })


})