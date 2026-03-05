import { describe, it, expect } from 'vitest'
import { mockScanResults } from '../data/mockScanResults'

describe('mockScanResults', () => {
  it('should have a valid structure', () => {
    expect(mockScanResults).toBeDefined()
    expect(typeof mockScanResults).toBe('object')
    expect(mockScanResults).toHaveProperty('problems')
    expect(mockScanResults).toHaveProperty('whatsGood')
  })

  it('should have valid problems structure', () => {
    const { problems } = mockScanResults
    
    expect(problems).toBeDefined()
    expect(typeof problems).toBe('object')
    
    // Check each category
    expect(problems).toHaveProperty('visualAccessibility')
    expect(problems).toHaveProperty('structureAndSemantics')
    expect(problems).toHaveProperty('multimedia')
    
    // Check that each category is an array
    expect(Array.isArray(problems.visualAccessibility)).toBe(true)
    expect(Array.isArray(problems.structureAndSemantics)).toBe(true)
    expect(Array.isArray(problems.multimedia)).toBe(true)
  })

  it('should have valid problem objects', () => {
    const { problems } = mockScanResults
    const visualProblems = problems.visualAccessibility
    const problem = visualProblems[0]
    
    expect(problem).toBeDefined()
    expect(problem).toHaveProperty('id')
    expect(problem).toHaveProperty('name')
    expect(problem).toHaveProperty('category')
    expect(problem).toHaveProperty('rootCause')
    expect(problem).toHaveProperty('codeSnippet')
    expect(problem).toHaveProperty('solution')
    
    expect(typeof problem.id).toBe('string')
    expect(typeof problem.name).toBe('string')
    expect(typeof problem.category).toBe('string')
    expect(typeof problem.rootCause).toBe('string')
    expect(typeof problem.codeSnippet).toBe('string')
    expect(Array.isArray(problem.solution)).toBe(true)
  })

  it('should have valid solution arrays', () => {
    const { problems } = mockScanResults
    const visualProblems = problems.visualAccessibility
    const problem = visualProblems[0]
    
    expect(problem.solution).toBeDefined()
    expect(problem.solution.length).toBeGreaterThan(0)
    
    problem.solution.forEach(solution => {
      expect(typeof solution).toBe('string')
      expect(solution.length).toBeGreaterThan(0)
    })
  })

  it('should have valid whatsGood array', () => {
    const { whatsGood } = mockScanResults
    
    expect(whatsGood).toBeDefined()
    expect(Array.isArray(whatsGood)).toBe(true)
    expect(whatsGood.length).toBeGreaterThan(0)
    
    whatsGood.forEach(item => {
      expect(typeof item).toBe('string')
      expect(item.length).toBeGreaterThan(0)
    })
  })

  it('should have valid categories', () => {
    const { problems } = mockScanResults
    const categories = Object.keys(problems)
    
    expect(categories).toContain('visualAccessibility')
    expect(categories).toContain('structureAndSemantics')
    expect(categories).toContain('multimedia')
  })

  it('should have valid code snippets', () => {
    const { problems } = mockScanResults
    
    Object.values(problems).flat().forEach(problem => {
      expect(problem.codeSnippet).toBeDefined()
      expect(typeof problem.codeSnippet).toBe('string')
      expect(problem.codeSnippet.length).toBeGreaterThan(0)
    })
  })
})
