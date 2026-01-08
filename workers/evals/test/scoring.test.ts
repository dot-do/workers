/**
 * Tests for scoring functionality
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  validateRubric,
  normalizeScore,
  aggregateScores,
  RubricScorer,
  createRubricScorer,
} from '../src/scoring/rubric-scorer.js'
import {
  ProgrammaticScorer,
  registerScorer,
  getScorer,
  unregisterScorer,
  clearScorers,
  exactMatchScorer,
  lengthScorer,
  containsScorer,
} from '../src/scoring/programmatic-scorer.js'
import {
  createScorer,
  score,
  aggregateResults,
  compareResults,
  formatScoringResult,
} from '../src/scoring/index.js'
import type {
  Rubric,
  Scale,
  RubricCriterion,
  CriterionScore,
  ScoringConfig,
  ScoringInput,
} from '../src/scoring/types.js'

describe('Rubric Validation', () => {
  it('should validate a valid rubric', () => {
    const rubric: Rubric = {
      name: 'Code Quality',
      description: 'Evaluates code quality',
      criteria: [
        {
          id: 'correctness',
          name: 'Correctness',
          description: 'Code produces correct results',
          weight: 0.5,
          scale: {
            type: 'numeric',
            min: 0,
            max: 100,
          },
        },
        {
          id: 'style',
          name: 'Style',
          description: 'Code follows style guidelines',
          weight: 0.5,
          scale: {
            type: 'numeric',
            min: 0,
            max: 100,
          },
        },
      ],
    }

    const result = validateRubric(rubric)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should reject rubric without name', () => {
    const rubric: Rubric = {
      name: '',
      description: 'Test',
      criteria: [
        {
          id: 'test',
          name: 'Test',
          description: 'Test',
          weight: 1.0,
          scale: { type: 'numeric', min: 0, max: 100 },
        },
      ],
    }

    const result = validateRubric(rubric)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Rubric must have a name')
  })

  it('should reject rubric without criteria', () => {
    const rubric: Rubric = {
      name: 'Test',
      description: 'Test',
      criteria: [],
    }

    const result = validateRubric(rubric)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Rubric must have at least one criterion')
  })

  it('should reject rubric with weights not summing to 1.0', () => {
    const rubric: Rubric = {
      name: 'Test',
      description: 'Test',
      criteria: [
        {
          id: 'a',
          name: 'A',
          description: 'A',
          weight: 0.3,
          scale: { type: 'numeric', min: 0, max: 100 },
        },
        {
          id: 'b',
          name: 'B',
          description: 'B',
          weight: 0.5,
          scale: { type: 'numeric', min: 0, max: 100 },
        },
      ],
    }

    const result = validateRubric(rubric)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('weights must sum to 1.0'))).toBe(true)
  })

  it('should reject numeric scale without min/max', () => {
    const rubric: Rubric = {
      name: 'Test',
      description: 'Test',
      criteria: [
        {
          id: 'test',
          name: 'Test',
          description: 'Test',
          weight: 1.0,
          scale: { type: 'numeric' } as Scale,
        },
      ],
    }

    const result = validateRubric(rubric)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('must have min and max'))).toBe(true)
  })

  it('should reject categorical scale without categories', () => {
    const rubric: Rubric = {
      name: 'Test',
      description: 'Test',
      criteria: [
        {
          id: 'test',
          name: 'Test',
          description: 'Test',
          weight: 1.0,
          scale: { type: 'categorical' } as Scale,
        },
      ],
    }

    const result = validateRubric(rubric)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('must have categories'))).toBe(true)
  })
})

describe('Score Normalization', () => {
  it('should normalize numeric scores', () => {
    const scale: Scale = {
      type: 'numeric',
      min: 0,
      max: 100,
    }

    expect(normalizeScore(0, scale)).toBe(0)
    expect(normalizeScore(50, scale)).toBe(0.5)
    expect(normalizeScore(100, scale)).toBe(1)
  })

  it('should normalize categorical scores', () => {
    const scale: Scale = {
      type: 'categorical',
      categories: [
        { label: 'Poor', value: 1 },
        { label: 'Fair', value: 2 },
        { label: 'Good', value: 3 },
        { label: 'Excellent', value: 4 },
      ],
    }

    expect(normalizeScore(1, scale)).toBe(0)
    expect(normalizeScore(2, scale)).toBeCloseTo(0.333, 2)
    expect(normalizeScore(3, scale)).toBeCloseTo(0.666, 2)
    expect(normalizeScore(4, scale)).toBe(1)
  })

  it('should normalize binary scores', () => {
    const scale: Scale = {
      type: 'binary',
    }

    expect(normalizeScore(0, scale)).toBe(0)
    expect(normalizeScore(1, scale)).toBe(1)
  })
})

describe('Score Aggregation', () => {
  it('should aggregate weighted scores correctly', () => {
    const criterionScores: CriterionScore[] = [
      {
        criterionId: 'a',
        rawScore: 80,
        normalizedScore: 0.8,
        weightedScore: 0.4, // 0.8 * 0.5
      },
      {
        criterionId: 'b',
        rawScore: 60,
        normalizedScore: 0.6,
        weightedScore: 0.3, // 0.6 * 0.5
      },
    ]

    const overall = aggregateScores(criterionScores)
    expect(overall).toBe(0.7)
  })

  it('should handle single criterion', () => {
    const criterionScores: CriterionScore[] = [
      {
        criterionId: 'only',
        rawScore: 75,
        normalizedScore: 0.75,
        weightedScore: 0.75,
      },
    ]

    const overall = aggregateScores(criterionScores)
    expect(overall).toBe(0.75)
  })
})

describe('RubricScorer', () => {
  it('should score input against a rubric', async () => {
    const rubric: Rubric = {
      name: 'Test Rubric',
      description: 'Test rubric for evaluation',
      criteria: [
        {
          id: 'quality',
          name: 'Quality',
          description: 'Overall quality',
          weight: 0.6,
          scale: { type: 'numeric', min: 0, max: 100 },
        },
        {
          id: 'completeness',
          name: 'Completeness',
          description: 'How complete is the output',
          weight: 0.4,
          scale: { type: 'numeric', min: 0, max: 100 },
        },
      ],
    }

    const scorer = createRubricScorer()
    const input: ScoringInput = {
      output: 'This is a test output that is reasonably long',
      expected: 'Expected output',
    }

    const config: ScoringConfig = {
      method: 'rubric',
      rubric,
      threshold: 0.5,
    }

    const result = await scorer.score(input, config)

    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(1)
    expect(result.method).toBe('rubric')
    expect(result.criterionScores).toHaveLength(2)
    expect(typeof result.passed).toBe('boolean')
  })

  it('should score with manual criterion scores', async () => {
    const rubric: Rubric = {
      name: 'Manual Test',
      description: 'Test with manual scores',
      criteria: [
        {
          id: 'a',
          name: 'Criterion A',
          description: 'First criterion',
          weight: 0.3,
          scale: { type: 'numeric', min: 0, max: 100 },
        },
        {
          id: 'b',
          name: 'Criterion B',
          description: 'Second criterion',
          weight: 0.7,
          scale: { type: 'numeric', min: 0, max: 100 },
        },
      ],
    }

    const scorer = new RubricScorer()
    const result = await scorer.scoreWithCriterionScores(
      rubric,
      { a: 80, b: 90 },
      0.8
    )

    // Expected: 0.3 * 0.8 + 0.7 * 0.9 = 0.24 + 0.63 = 0.87
    expect(result.score).toBeCloseTo(0.87, 2)
    expect(result.passed).toBe(true)
    expect(result.criterionScores).toHaveLength(2)
  })

  it('should throw error for invalid rubric', async () => {
    const invalidRubric: Rubric = {
      name: 'Invalid',
      description: 'Invalid rubric',
      criteria: [], // No criteria
    }

    const scorer = createRubricScorer()
    const input: ScoringInput = { output: 'test' }
    const config: ScoringConfig = {
      method: 'rubric',
      rubric: invalidRubric,
    }

    await expect(scorer.score(input, config)).rejects.toThrow('Invalid rubric')
  })
})

describe('Programmatic Scorer', () => {
  beforeEach(() => {
    clearScorers()
    // Re-register built-in scorers
    registerScorer('exact_match', exactMatchScorer)
    registerScorer('length', lengthScorer)
    registerScorer('contains', containsScorer)
  })

  it('should register and retrieve scorer functions', () => {
    const customScorer = (input: ScoringInput) => 0.5
    registerScorer('custom', customScorer)

    const retrieved = getScorer('custom')
    expect(retrieved).toBeDefined()
    expect(retrieved).toBe(customScorer)
  })

  it('should unregister scorer functions', () => {
    const customScorer = (input: ScoringInput) => 0.5
    registerScorer('custom', customScorer)

    const removed = unregisterScorer('custom')
    expect(removed).toBe(true)
    expect(getScorer('custom')).toBeUndefined()
  })

  it('should score with exact match scorer', async () => {
    const scorer = new ProgrammaticScorer()
    const input: ScoringInput = {
      output: 'hello world',
      expected: 'hello world',
    }
    const config: ScoringConfig = {
      method: 'programmatic',
      scorerFunction: 'exact_match',
    }

    const result = await scorer.score(input, config)
    expect(result.score).toBe(1)
    expect(result.passed).toBe(true)
  })

  it('should fail with exact match scorer on mismatch', async () => {
    const scorer = new ProgrammaticScorer()
    const input: ScoringInput = {
      output: 'hello world',
      expected: 'goodbye world',
    }
    const config: ScoringConfig = {
      method: 'programmatic',
      scorerFunction: 'exact_match',
    }

    const result = await scorer.score(input, config)
    expect(result.score).toBe(0)
    expect(result.passed).toBe(false)
  })

  it('should score with contains scorer', async () => {
    const scorer = new ProgrammaticScorer()
    const input: ScoringInput = {
      output: 'hello world, how are you?',
      expected: 'world',
    }
    const config: ScoringConfig = {
      method: 'programmatic',
      scorerFunction: 'contains',
    }

    const result = await scorer.score(input, config)
    expect(result.score).toBe(1)
  })

  it('should score with custom registered function', async () => {
    const customScorer = (input: ScoringInput) => {
      return input.output.length > 10 ? 1 : 0.5
    }
    registerScorer('custom', customScorer)

    const scorer = new ProgrammaticScorer()
    const input: ScoringInput = { output: 'short' }
    const config: ScoringConfig = {
      method: 'programmatic',
      scorerFunction: 'custom',
    }

    const result = await scorer.score(input, config)
    expect(result.score).toBe(0.5)
  })

  it('should throw error for missing scorer function', async () => {
    const scorer = new ProgrammaticScorer()
    const input: ScoringInput = { output: 'test' }
    const config: ScoringConfig = {
      method: 'programmatic',
      scorerFunction: 'nonexistent',
    }

    await expect(scorer.score(input, config)).rejects.toThrow('Scorer function not found')
  })
})

describe('Scorer Factory', () => {
  it('should create rubric scorer', () => {
    const config: ScoringConfig = { method: 'rubric' }
    const scorer = createScorer(config)
    expect(scorer).toBeInstanceOf(RubricScorer)
  })

  it('should create programmatic scorer', () => {
    const config: ScoringConfig = { method: 'programmatic' }
    const scorer = createScorer(config)
    expect(scorer).toBeInstanceOf(ProgrammaticScorer)
  })

  it('should throw error for unimplemented methods', () => {
    const config: ScoringConfig = { method: 'llm-judge' }
    expect(() => createScorer(config)).toThrow('not yet implemented')
  })
})

describe('Score Convenience Function', () => {
  beforeEach(() => {
    clearScorers()
    registerScorer('exact_match', exactMatchScorer)
  })

  it('should score input with config', async () => {
    const input: ScoringInput = {
      output: 'test',
      expected: 'test',
    }
    const config: ScoringConfig = {
      method: 'programmatic',
      scorerFunction: 'exact_match',
    }

    const result = await score(input, config)
    expect(result.score).toBe(1)
    expect(result.method).toBe('programmatic')
  })
})

describe('Result Aggregation', () => {
  it('should aggregate results using mean strategy', () => {
    const results = [
      {
        score: 0.8,
        passed: true,
        criterionScores: [],
        method: 'rubric' as const,
        timestamp: new Date().toISOString(),
      },
      {
        score: 0.6,
        passed: false,
        criterionScores: [],
        method: 'rubric' as const,
        timestamp: new Date().toISOString(),
      },
    ]

    const aggregated = aggregateResults(results, 'mean')
    expect(aggregated.score).toBe(0.7)
  })

  it('should aggregate results using min strategy', () => {
    const results = [
      {
        score: 0.8,
        passed: true,
        criterionScores: [],
        method: 'rubric' as const,
        timestamp: new Date().toISOString(),
      },
      {
        score: 0.6,
        passed: false,
        criterionScores: [],
        method: 'rubric' as const,
        timestamp: new Date().toISOString(),
      },
    ]

    const aggregated = aggregateResults(results, 'min')
    expect(aggregated.score).toBe(0.6)
  })

  it('should aggregate results using max strategy', () => {
    const results = [
      {
        score: 0.8,
        passed: true,
        criterionScores: [],
        method: 'rubric' as const,
        timestamp: new Date().toISOString(),
      },
      {
        score: 0.6,
        passed: false,
        criterionScores: [],
        method: 'rubric' as const,
        timestamp: new Date().toISOString(),
      },
    ]

    const aggregated = aggregateResults(results, 'max')
    expect(aggregated.score).toBe(0.8)
  })

  it('should aggregate results using weighted strategy', () => {
    const results = [
      {
        score: 0.8,
        passed: true,
        criterionScores: [],
        method: 'rubric' as const,
        timestamp: new Date().toISOString(),
      },
      {
        score: 0.6,
        passed: false,
        criterionScores: [],
        method: 'rubric' as const,
        timestamp: new Date().toISOString(),
      },
    ]

    const aggregated = aggregateResults(results, 'weighted', [0.7, 0.3])
    expect(aggregated.score).toBeCloseTo(0.74, 2) // 0.8 * 0.7 + 0.6 * 0.3
  })

  it('should throw error for empty results', () => {
    expect(() => aggregateResults([], 'mean')).toThrow('Cannot aggregate empty results')
  })
})

describe('Result Comparison', () => {
  it('should compare two scoring results', () => {
    const resultA = {
      score: 0.6,
      passed: false,
      criterionScores: [
        {
          criterionId: 'quality',
          rawScore: 60,
          normalizedScore: 0.6,
          weightedScore: 0.6,
        },
      ],
      method: 'rubric' as const,
      timestamp: new Date().toISOString(),
    }

    const resultB = {
      score: 0.8,
      passed: true,
      criterionScores: [
        {
          criterionId: 'quality',
          rawScore: 80,
          normalizedScore: 0.8,
          weightedScore: 0.8,
        },
      ],
      method: 'rubric' as const,
      timestamp: new Date().toISOString(),
    }

    const comparison = compareResults(resultA, resultB)
    expect(comparison.scoreDifference).toBeCloseTo(0.2, 2)
    expect(comparison.improvement).toBe(true)
    expect(comparison.criterionComparisons).toHaveLength(1)
    expect(comparison.criterionComparisons[0]!.difference).toBeCloseTo(0.2, 2)
  })
})

describe('Result Formatting', () => {
  it('should format scoring result for display', () => {
    const result = {
      score: 0.85,
      passed: true,
      criterionScores: [
        {
          criterionId: 'quality',
          rawScore: 85,
          normalizedScore: 0.85,
          weightedScore: 0.51,
          justification: 'High quality output',
        },
        {
          criterionId: 'completeness',
          rawScore: 85,
          normalizedScore: 0.85,
          weightedScore: 0.34,
        },
      ],
      method: 'rubric' as const,
      justification: 'Overall excellent performance',
      timestamp: new Date().toISOString(),
    }

    const formatted = formatScoringResult(result)
    expect(formatted).toContain('Score: 85.0%')
    expect(formatted).toContain('Status: PASSED')
    expect(formatted).toContain('Method: rubric')
    expect(formatted).toContain('quality')
    expect(formatted).toContain('completeness')
    expect(formatted).toContain('High quality output')
  })
})
