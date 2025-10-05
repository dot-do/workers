/**
 * Upper Confidence Bound (UCB1) Algorithm
 * Deterministic multi-armed bandit that balances exploration and exploitation
 */

import type { Variant, UCBParams } from '../types'

/**
 * Calculate UCB1 score for a variant
 * UCB1 = mean + c * sqrt(ln(total) / n)
 */
function calculateUCBScore(variant: Variant, totalAssignments: number, c: number): number {
  const n = variant.stats.observations || 0

  if (n === 0) {
    return Infinity // Force exploration of un-tried variants
  }

  const mean = variant.stats.mean || 0
  const explorationBonus = c * Math.sqrt(Math.log(totalAssignments) / n)

  return mean + explorationBonus
}

/**
 * Select variant using UCB1
 */
export function selectVariantUCB(variants: Variant[], params: UCBParams = {}): Variant {
  const c = params.c || 2 // Default exploration parameter

  // Calculate total assignments across all variants
  const totalAssignments = variants.reduce((sum, v) => sum + (v.stats.observations || 0), 0)

  if (totalAssignments === 0) {
    // Random selection for first assignment
    return variants[Math.floor(Math.random() * variants.length)]
  }

  // Calculate UCB scores for each variant
  let bestVariant: Variant | null = null
  let bestScore = -Infinity

  for (const variant of variants) {
    const score = calculateUCBScore(variant, totalAssignments, c)

    if (score > bestScore) {
      bestScore = score
      bestVariant = variant
    }
  }

  if (!bestVariant) {
    throw new Error('No variants available')
  }

  return bestVariant
}

/**
 * Update variant statistics after observation
 * For UCB, we track running mean
 */
export function updateUCBStats(variant: Variant, reward: number): Variant {
  const updated = { ...variant }
  updated.stats = { ...variant.stats }

  const n = (updated.stats.observations || 0) + 1
  const oldMean = updated.stats.mean || 0

  // Incremental mean update: new_mean = old_mean + (reward - old_mean) / n
  const newMean = oldMean + (reward - oldMean) / n

  updated.stats.observations = n
  updated.stats.mean = newMean

  // Update sum and sum of squares for variance calculation
  updated.stats.sum = (updated.stats.sum || 0) + reward
  updated.stats.sumSquares = (updated.stats.sumSquares || 0) + reward * reward

  // Calculate variance: Var(X) = E[X^2] - E[X]^2
  if (n > 1) {
    const meanSquare = updated.stats.sumSquares / n
    const squareMean = newMean * newMean
    updated.stats.variance = meanSquare - squareMean
  }

  return updated
}

/**
 * Get confidence bound for a variant
 */
export function getConfidenceBound(variant: Variant, totalAssignments: number, c = 2): number {
  const n = variant.stats.observations || 0

  if (n === 0) {
    return Infinity
  }

  return c * Math.sqrt(Math.log(totalAssignments) / n)
}
