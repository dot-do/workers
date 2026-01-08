/**
 * Programmatic scorer implementation
 *
 * Allows custom scoring functions to be defined and executed
 */

import type {
  Scorer,
  ScorerFunction,
  ScoringConfig,
  ScoringInput,
  ScoringResult,
} from './types.js'

/**
 * Registry of scorer functions
 */
const scorerRegistry = new Map<string, ScorerFunction>()

/**
 * Register a scorer function
 */
export function registerScorer(name: string, fn: ScorerFunction): void {
  scorerRegistry.set(name, fn)
}

/**
 * Get a registered scorer function
 */
export function getScorer(name: string): ScorerFunction | undefined {
  return scorerRegistry.get(name)
}

/**
 * Unregister a scorer function
 */
export function unregisterScorer(name: string): boolean {
  return scorerRegistry.delete(name)
}

/**
 * Clear all registered scorers
 */
export function clearScorers(): void {
  scorerRegistry.clear()
}

/**
 * Programmatic scorer implementation
 */
export class ProgrammaticScorer implements Scorer {
  /**
   * Score input using a programmatic function
   */
  async score(
    input: ScoringInput,
    config: ScoringConfig
  ): Promise<ScoringResult> {
    if (!config.scorerFunction) {
      throw new Error('Programmatic scorer requires scorerFunction in config')
    }

    // Try to get the scorer from the registry
    let scorerFn = getScorer(config.scorerFunction)

    // If not in registry, try to parse it as a function string
    if (!scorerFn && typeof config.scorerFunction === 'string') {
      // Check if it looks like a function definition (contains 'function' or '=>')
      const looksLikeFunction = config.scorerFunction.includes('function') ||
                                config.scorerFunction.includes('=>')

      if (looksLikeFunction) {
        try {
          // Create function from string (be careful with this in production!)
          // eslint-disable-next-line @typescript-eslint/no-implied-eval
          scorerFn = new Function(
            'input',
            `return (${config.scorerFunction})(input)`
          ) as ScorerFunction
        } catch (error) {
          throw new Error(
            `Failed to parse scorer function: ${error instanceof Error ? error.message : String(error)}`
          )
        }
      }
    }

    if (!scorerFn) {
      throw new Error(`Scorer function not found: ${config.scorerFunction}`)
    }

    // Execute the scorer function
    let rawScore: number
    try {
      rawScore = await scorerFn(input)
    } catch (error) {
      throw new Error(
        `Scorer function execution failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }

    // Validate score is between 0 and 1
    if (typeof rawScore !== 'number' || rawScore < 0 || rawScore > 1) {
      throw new Error(`Scorer function must return a number between 0 and 1, got: ${rawScore}`)
    }

    const threshold = config.threshold ?? 0.7
    const passed = rawScore >= threshold

    return {
      score: rawScore,
      passed,
      criterionScores: [
        {
          criterionId: 'programmatic',
          rawScore,
          normalizedScore: rawScore,
          weightedScore: rawScore,
        },
      ],
      method: 'programmatic',
      justification: `Scored using function: ${config.scorerFunction}`,
      timestamp: new Date().toISOString(),
      metadata: {
        scorerFunction: config.scorerFunction,
        threshold,
      },
    }
  }
}

/**
 * Create a programmatic scorer instance
 */
export function createProgrammaticScorer(): ProgrammaticScorer {
  return new ProgrammaticScorer()
}

// Built-in scorer functions

/**
 * Exact match scorer - returns 1 if output matches expected, 0 otherwise
 */
export const exactMatchScorer: ScorerFunction = (input: ScoringInput) => {
  if (!input.expected) {
    throw new Error('Exact match scorer requires expected output')
  }
  return input.output === input.expected ? 1 : 0
}

/**
 * Length-based scorer - scores based on output length relative to expected
 */
export const lengthScorer: ScorerFunction = (input: ScoringInput) => {
  if (!input.expected) {
    throw new Error('Length scorer requires expected output')
  }
  const actualLength = input.output.length
  const expectedLength = input.expected.length
  if (expectedLength === 0) return actualLength === 0 ? 1 : 0

  // Score based on how close the lengths are
  const ratio = Math.min(actualLength, expectedLength) / Math.max(actualLength, expectedLength)
  return ratio
}

/**
 * Contains scorer - returns 1 if output contains expected substring
 */
export const containsScorer: ScorerFunction = (input: ScoringInput) => {
  if (!input.expected) {
    throw new Error('Contains scorer requires expected output')
  }
  return input.output.includes(input.expected) ? 1 : 0
}

// Register built-in scorers
registerScorer('exact_match', exactMatchScorer)
registerScorer('length', lengthScorer)
registerScorer('contains', containsScorer)
