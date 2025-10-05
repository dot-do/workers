/**
 * Thompson Sampling Algorithm
 * Bayesian multi-armed bandit using Beta-Bernoulli conjugate prior
 */

import type { Variant, ThompsonSamplingParams } from '../types'

/**
 * Sample from Beta distribution using Gamma distribution trick
 * Beta(alpha, beta) = Gamma(alpha, 1) / (Gamma(alpha, 1) + Gamma(beta, 1))
 */
function sampleBeta(alpha: number, beta: number): number {
  const gammaAlpha = sampleGamma(alpha, 1)
  const gammaBeta = sampleGamma(beta, 1)
  return gammaAlpha / (gammaAlpha + gammaBeta)
}

/**
 * Sample from Gamma distribution using Marsaglia and Tsang's method
 */
function sampleGamma(shape: number, scale: number): number {
  if (shape < 1) {
    // Use transformation for shape < 1
    return sampleGamma(shape + 1, scale) * Math.pow(Math.random(), 1 / shape)
  }

  const d = shape - 1 / 3
  const c = 1 / Math.sqrt(9 * d)

  while (true) {
    let x: number
    let v: number

    // Generate candidate
    do {
      x = randomNormal()
      v = 1 + c * x
    } while (v <= 0)

    v = v * v * v
    const u = Math.random()

    // Accept/reject
    if (u < 1 - 0.0331 * x * x * x * x) {
      return d * v * scale
    }

    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
      return d * v * scale
    }
  }
}

/**
 * Generate random normal (0, 1) using Box-Muller transform
 */
function randomNormal(): number {
  const u1 = Math.random()
  const u2 = Math.random()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

/**
 * Select variant using Thompson Sampling
 * Each variant's beta distribution represents our belief about its true conversion rate
 */
export function selectVariantThompsonSampling(variants: Variant[], params: ThompsonSamplingParams = {}): Variant {
  const priorAlpha = params.priorAlpha || 1
  const priorBeta = params.priorBeta || 1

  let bestVariant: Variant | null = null
  let bestSample = -1

  for (const variant of variants) {
    // Update posterior parameters
    const alpha = priorAlpha + (variant.stats.successes || 0)
    const beta = priorBeta + (variant.stats.failures || 0)

    // Sample from Beta(alpha, beta)
    const sample = sampleBeta(alpha, beta)

    if (sample > bestSample) {
      bestSample = sample
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
 */
export function updateThompsonSamplingStats(variant: Variant, success: boolean): Variant {
  const updated = { ...variant }
  updated.stats = { ...variant.stats }

  updated.stats.observations = (updated.stats.observations || 0) + 1

  if (success) {
    updated.stats.successes = (updated.stats.successes || 0) + 1
  } else {
    updated.stats.failures = (updated.stats.failures || 0) + 1
  }

  // Update Bayesian parameters (posterior)
  const priorAlpha = 1
  const priorBeta = 1
  updated.stats.alpha = priorAlpha + (updated.stats.successes || 0)
  updated.stats.beta = priorBeta + (updated.stats.failures || 0)

  return updated
}

/**
 * Calculate probability that this variant is the best
 * Monte Carlo simulation
 */
export function calculateProbabilityToBeBest(variant: Variant, allVariants: Variant[], numSimulations = 10000): number {
  const priorAlpha = 1
  const priorBeta = 1

  let winCount = 0

  for (let i = 0; i < numSimulations; i++) {
    // Sample from each variant's posterior
    const samples = allVariants.map((v) => {
      const alpha = priorAlpha + (v.stats.successes || 0)
      const beta = priorBeta + (v.stats.failures || 0)
      return sampleBeta(alpha, beta)
    })

    // Check if this variant had the highest sample
    const variantIndex = allVariants.findIndex((v) => v.id === variant.id)
    const variantSample = samples[variantIndex]
    const maxSample = Math.max(...samples)

    if (variantSample === maxSample) {
      winCount++
    }
  }

  return winCount / numSimulations
}

/**
 * Get expected value (mean of posterior distribution)
 */
export function getExpectedValue(variant: Variant): number {
  const alpha = (variant.stats.alpha || 1)
  const beta = (variant.stats.beta || 1)
  return alpha / (alpha + beta)
}

/**
 * Get credible interval for conversion rate
 */
export function getCredibleInterval(variant: Variant, credibility = 0.95): [number, number] {
  const alpha = (variant.stats.alpha || 1)
  const beta = (variant.stats.beta || 1)

  // Use beta distribution quantiles
  const lowerTail = (1 - credibility) / 2
  const upperTail = 1 - lowerTail

  // Approximation using normal distribution for large sample sizes
  const mean = alpha / (alpha + beta)
  const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1))
  const stdDev = Math.sqrt(variance)

  // Z-scores for credible interval
  const zLower = -1.96 // For 95% CI
  const zUpper = 1.96

  const lower = Math.max(0, mean + zLower * stdDev)
  const upper = Math.min(1, mean + zUpper * stdDev)

  return [lower, upper]
}
