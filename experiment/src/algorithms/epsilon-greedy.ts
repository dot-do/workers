/**
 * Epsilon-Greedy Algorithm
 * Simple multi-armed bandit with random exploration
 */

import type { Variant, EpsilonGreedyParams } from '../types'

/**
 * Select variant using Epsilon-Greedy
 * With probability epsilon: explore (random selection)
 * With probability 1-epsilon: exploit (best mean reward)
 */
export function selectVariantEpsilonGreedy(variants: Variant[], params: EpsilonGreedyParams = {}): Variant {
  let epsilon = params.epsilon || 0.1

  // Decay epsilon over time if requested
  if (params.decay) {
    const totalAssignments = variants.reduce((sum, v) => sum + (v.stats.observations || 0), 0)
    // Decay formula: epsilon = epsilon0 / (1 + decay_rate * t)
    const decayRate = 0.001
    epsilon = epsilon / (1 + decayRate * totalAssignments)
  }

  // Explore with probability epsilon
  if (Math.random() < epsilon) {
    // Random variant
    return variants[Math.floor(Math.random() * variants.length)]
  }

  // Exploit: select variant with best mean
  let bestVariant: Variant | null = null
  let bestMean = -Infinity

  for (const variant of variants) {
    const mean = variant.stats.mean || 0
    const observations = variant.stats.observations || 0

    // Prioritize un-tried variants
    if (observations === 0) {
      return variant
    }

    if (mean > bestMean) {
      bestMean = mean
      bestVariant = variant
    }
  }

  if (!bestVariant) {
    // Fallback to random
    return variants[Math.floor(Math.random() * variants.length)]
  }

  return bestVariant
}

/**
 * Update variant statistics after observation
 */
export function updateEpsilonGreedyStats(variant: Variant, reward: number): Variant {
  const updated = { ...variant }
  updated.stats = { ...variant.stats }

  const n = (updated.stats.observations || 0) + 1
  const oldMean = updated.stats.mean || 0

  // Incremental mean update
  const newMean = oldMean + (reward - oldMean) / n

  updated.stats.observations = n
  updated.stats.mean = newMean
  updated.stats.sum = (updated.stats.sum || 0) + reward
  updated.stats.sumSquares = (updated.stats.sumSquares || 0) + reward * reward

  // Calculate variance
  if (n > 1) {
    const meanSquare = updated.stats.sumSquares / n
    const squareMean = newMean * newMean
    updated.stats.variance = meanSquare - squareMean
  }

  return updated
}

/**
 * Get current epsilon value (accounting for decay)
 */
export function getCurrentEpsilon(variants: Variant[], params: EpsilonGreedyParams = {}): number {
  let epsilon = params.epsilon || 0.1

  if (params.decay) {
    const totalAssignments = variants.reduce((sum, v) => sum + (v.stats.observations || 0), 0)
    const decayRate = 0.001
    epsilon = epsilon / (1 + decayRate * totalAssignments)
  }

  return epsilon
}
