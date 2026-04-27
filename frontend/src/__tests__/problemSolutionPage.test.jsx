import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProblemSolutionPage from '../components/ProblemSolutionPage'

const sampleProblem = {
  id: 'contrast-1',
  name: 'Low contrast between text and background',
  category: 'Visual Accessibility',
  rootCause:
    'Text and background colors do not meet WCAG AA contrast requirements (4.5:1 for normal text).',
  codeSnippet: '<p style="color: #999; background: #eee;">Hard to read text</p>',
  solution: [
    'Increase the contrast ratio to at least 4.5:1 for normal text and 3:1 for large text.',
    'Use a tool or browser extension to check contrast (e.g. WebAIM Contrast Checker).',
    'Prefer dark text on light backgrounds or vice versa with sufficient difference.',
  ],
}

describe('ProblemSolutionPage', () => {
  const renderProblemSolutionPage = (problem = sampleProblem) =>
    render(<ProblemSolutionPage problem={problem} />)

  it('should render the component', () => {
    renderProblemSolutionPage()

    expect(screen.getByText('Problem Solution')).toBeInTheDocument()
  })

  it('should display the problem name and category', () => {
    renderProblemSolutionPage()

    expect(screen.getByText('Low contrast between text and background')).toBeInTheDocument()
    expect(screen.getByText('Visual Accessibility')).toBeInTheDocument()
  })

  it('should display problem details', () => {
    renderProblemSolutionPage()

    expect(screen.getByText('Root Cause')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Text and background colors do not meet WCAG AA contrast requirements (4.5:1 for normal text).'
      )
    ).toBeInTheDocument()
  })

  it('should display code snippet', () => {
    renderProblemSolutionPage()

    expect(screen.getByText('Line of code:')).toBeInTheDocument()
    expect(
      screen.getByText('<p style="color: #999; background: #eee;">Hard to read text</p>')
    ).toBeInTheDocument()
  })

  it('should display solutions', () => {
    renderProblemSolutionPage()

    expect(screen.getByText('Suggested Solution for this Problem')).toBeInTheDocument()
    sampleProblem.solution.forEach((step) => {
      expect(screen.getByText(step)).toBeInTheDocument()
    })
  })
})
