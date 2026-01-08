/**
 * @dotdo/evals-scoring - Scoring Engine for Evaluations
 *
 * Provides rubric-based scoring, LLM-as-judge, and programmatic scorers
 * for AI evaluation pipelines.
 */

export * from './types.js'
export * from './rubric-scorer.js'
export * from './programmatic-scorer.js'

import { RubricScorer } from './rubric-scorer.js'
import { ProgrammaticScorer } from './programmatic-scorer.js'
import type { Scorer, ScoringConfig, ScoringInput, ScoringResult } from './types.js'

/**
 * Factory function to create appropriate scorer based on config
 */
export function createScorer(config: ScoringConfig): Scorer {
  switch (config.method) {
    case 'rubric':
      return new RubricScorer()

    case 'programmatic':
      return new ProgrammaticScorer()

    case 'exact_match':
    case 'semantic':
    case 'llm-judge':
      // These would be implemented separately
      throw new Error(`Scorer method "${config.method}" not yet implemented`)

    default:
      throw new Error(`Unknown scoring method: ${config.method}`)
  }
}

/**
 * Convenience function to score input with a config
 */
export async function score(
  input: ScoringInput,
  config: ScoringConfig
): Promise<ScoringResult> {
  const scorer = createScorer(config)
  return scorer.score(input, config)
}

/**
 * Aggregate multiple scoring results
 */
export function aggregateResults(
  results: ScoringResult[],
  strategy: 'mean' | 'min' | 'max' | 'weighted' = 'mean',
  weights?: number[]
): ScoringResult {
  if (results.length === 0) {
    throw new Error('Cannot aggregate empty results array')
  }

  let aggregatedScore: number

  switch (strategy) {
    case 'mean': {
      const sum = results.reduce((acc, r) => acc + r.score, 0)
      aggregatedScore = sum / results.length
      break
    }

    case 'min': {
      aggregatedScore = Math.min(...results.map(r => r.score))
      break
    }

    case 'max': {
      aggregatedScore = Math.max(...results.map(r => r.score))
      break
    }

    case 'weighted': {
      if (!weights || weights.length !== results.length) {
        throw new Error('Weighted aggregation requires weights array of same length as results')
      }
      const totalWeight = weights.reduce((sum, w) => sum + w, 0)
      if (Math.abs(totalWeight - 1.0) > 0.001) {
        throw new Error('Weights must sum to 1.0')
      }
      aggregatedScore = results.reduce((sum, r, i) => sum + r.score * weights[i]!, 0)
      break
    }

    default:
      throw new Error(`Unknown aggregation strategy: ${strategy}`)
  }

  // Combine criterion scores from all results
  const allCriterionScores = results.flatMap(r => r.criterionScores)

  return {
    score: aggregatedScore,
    passed: aggregatedScore >= 0.7, // Default threshold
    criterionScores: allCriterionScores,
    method: results[0]!.method,
    justification: `Aggregated ${results.length} results using ${strategy} strategy`,
    timestamp: new Date().toISOString(),
    metadata: {
      strategy,
      resultCount: results.length,
    },
  }
}

/**
 * Compare two scoring results
 */
export function compareResults(
  a: ScoringResult,
  b: ScoringResult
): {
  scoreDifference: number
  improvement: boolean
  criterionComparisons: Array<{
    criterionId: string
    scoreA: number
    scoreB: number
    difference: number
  }>
} {
  const scoreDifference = b.score - a.score
  const improvement = scoreDifference > 0

  // Compare criterion scores
  const criterionComparisons = a.criterionScores.map(scoreA => {
    const scoreB = b.criterionScores.find(s => s.criterionId === scoreA.criterionId)
    return {
      criterionId: scoreA.criterionId,
      scoreA: scoreA.normalizedScore,
      scoreB: scoreB?.normalizedScore ?? 0,
      difference: (scoreB?.normalizedScore ?? 0) - scoreA.normalizedScore,
    }
  })

  return {
    scoreDifference,
    improvement,
    criterionComparisons,
  }
}

/**
 * Format a scoring result for display
 */
export function formatScoringResult(result: ScoringResult): string {
  const lines: string[] = []

  lines.push(`Score: ${(result.score * 100).toFixed(1)}%`)
  lines.push(`Status: ${result.passed ? 'PASSED' : 'FAILED'}`)
  lines.push(`Method: ${result.method}`)

  if (result.justification) {
    lines.push(`\nJustification: ${result.justification}`)
  }

  if (result.criterionScores.length > 0) {
    lines.push('\nCriterion Scores:')
    for (const score of result.criterionScores) {
      const normalized = (score.normalizedScore * 100).toFixed(1)
      const weighted = (score.weightedScore * 100).toFixed(1)
      lines.push(
        `  - ${score.criterionId}: ${normalized}% (weighted: ${weighted}%)`
      )
      if (score.justification) {
        lines.push(`    ${score.justification}`)
      }
    }
  }

  return lines.join('\n')
}
