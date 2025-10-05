/**
 * Bayesian A/B Testing
 * Statistical analysis using Bayesian methods for fixed allocation experiments
 */

import type { Variant, BayesianABParams, TestResult } from '../types'

/**
 * Sample from Beta distribution (same as Thompson Sampling)
 */
function sampleBeta(alpha: number, beta: number): number {
  const gammaAlpha = sampleGamma(alpha, 1)
  const gammaBeta = sampleGamma(beta, 1)
  return gammaAlpha / (gammaAlpha + gammaBeta)
}

function sampleGamma(shape: number, scale: number): number {
  if (shape < 1) {
    return sampleGamma(shape + 1, scale) * Math.pow(Math.random(), 1 / shape)
  }

  const d = shape - 1 / 3
  const c = 1 / Math.sqrt(9 * d)

  while (true) {
    let x: number
    let v: number

    do {
      x = randomNormal()
      v = 1 + c * x
    } while (v <= 0)

    v = v * v * v
    const u = Math.random()

    if (u < 1 - 0.0331 * x * x * x * x) {
      return d * v * scale
    }

    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
      return d * v * scale
    }
  }
}

function randomNormal(): number {
  const u1 = Math.random()
  const u2 = Math.random()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

/**
 * Run Bayesian A/B test between control and treatment
 */
export function runBayesianABTest(
  control: Variant,
  treatment: Variant,
  params: BayesianABParams = {}
): TestResult {
  const priorAlpha = params.priorAlpha || 1
  const priorBeta = params.priorBeta || 1
  const credibleInterval = params.credibleInterval || 0.95

  // Posterior parameters
  const controlAlpha = priorAlpha + (control.stats.successes || 0)
  const controlBeta = priorBeta + (control.stats.failures || 0)

  const treatmentAlpha = priorAlpha + (treatment.stats.successes || 0)
  const treatmentBeta = priorBeta + (treatment.stats.failures || 0)

  // Expected values (posterior means)
  const controlMean = controlAlpha / (controlAlpha + controlBeta)
  const treatmentMean = treatmentAlpha / (treatmentAlpha + treatmentBeta)

  // Calculate probability that treatment > control using Monte Carlo
  const numSimulations = 10000
  let treatmentWins = 0

  for (let i = 0; i < numSimulations; i++) {
    const controlSample = sampleBeta(controlAlpha, controlBeta)
    const treatmentSample = sampleBeta(treatmentAlpha, treatmentBeta)

    if (treatmentSample > controlSample) {
      treatmentWins++
    }
  }

  const probabilityToBeBest = treatmentWins / numSimulations

  // Credible intervals (using normal approximation)
  const controlVariance = (controlAlpha * controlBeta) / ((controlAlpha + controlBeta) ** 2 * (controlAlpha + controlBeta + 1))
  const treatmentVariance = (treatmentAlpha * treatmentBeta) / ((treatmentAlpha + treatmentBeta) ** 2 * (treatmentAlpha + treatmentBeta + 1))

  const zScore = calculateZScore(credibleInterval)

  const controlCI: [number, number] = [
    Math.max(0, controlMean - zScore * Math.sqrt(controlVariance)),
    Math.min(1, controlMean + zScore * Math.sqrt(controlVariance)),
  ]

  const treatmentCI: [number, number] = [
    Math.max(0, treatmentMean - zScore * Math.sqrt(treatmentVariance)),
    Math.min(1, treatmentMean + zScore * Math.sqrt(treatmentVariance)),
  ]

  // Effect size
  const absoluteDifference = treatmentMean - controlMean
  const relativeLift = controlMean > 0 ? (absoluteDifference / controlMean) * 100 : 0

  // Conclusion
  const threshold = params.earlyStoppingThreshold || 0.95
  const isSignificant = probabilityToBeBest > threshold || probabilityToBeBest < (1 - threshold)

  let recommendedAction: 'continue' | 'conclude' | 'stop' = 'continue'
  if (isSignificant) {
    recommendedAction = 'conclude'
  }

  return {
    experimentId: control.experimentId,
    controlVariantId: control.id,
    treatmentVariantId: treatment.id,
    metric: 'conversion_rate',
    pValue: 1 - Math.max(probabilityToBeBest, 1 - probabilityToBeBest), // Approximate
    absoluteDifference,
    relativeLift,
    controlMean,
    controlCI,
    treatmentMean,
    treatmentCI,
    probabilityToBeBest,
    credibleInterval: [treatmentCI[0], treatmentCI[1]],
    isSignificant,
    recommendedAction,
  }
}

/**
 * Calculate z-score for credible interval
 */
function calculateZScore(credibility: number): number {
  // Common z-scores
  if (credibility === 0.90) return 1.645
  if (credibility === 0.95) return 1.96
  if (credibility === 0.99) return 2.576

  // Approximation for other values
  // Using inverse normal CDF approximation
  const p = (1 + credibility) / 2
  return approximateInverseNormalCDF(p)
}

/**
 * Approximate inverse normal CDF (for z-score calculation)
 */
function approximateInverseNormalCDF(p: number): number {
  if (p <= 0 || p >= 1) {
    throw new Error('p must be between 0 and 1')
  }

  // Beasley-Springer-Moro algorithm approximation
  const a = [2.50662823884, -18.61500062529, 41.39119773534, -25.44106049637]
  const b = [-8.47351093090, 23.08336743743, -21.06224101826, 3.13082909833]
  const c = [0.3374754822726147, 0.9761690190917186, 0.1607979714918209, 0.0276438810333863, 0.0038405729373609, 0.0003951896511919, 0.0000321767881768, 0.0000002888167364, 0.0000003960315187]

  const y = p - 0.5

  if (Math.abs(y) < 0.42) {
    const r = y * y
    let x = y * (((a[3] * r + a[2]) * r + a[1]) * r + a[0])
    x = x / ((((b[3] * r + b[2]) * r + b[1]) * r + b[0]) * r + 1)
    return x
  }

  let r = p
  if (y > 0) {
    r = 1 - p
  }

  r = Math.log(-Math.log(r))
  let x = c[0]
  for (let i = 1; i < c.length; i++) {
    x = x + c[i] * Math.pow(r, i)
  }

  if (y < 0) {
    x = -x
  }

  return x
}

/**
 * Calculate expected loss - expected difference if we choose wrong variant
 */
export function calculateExpectedLoss(
  control: Variant,
  treatment: Variant,
  numSimulations = 10000
): { controlLoss: number; treatmentLoss: number } {
  const priorAlpha = 1
  const priorBeta = 1

  const controlAlpha = priorAlpha + (control.stats.successes || 0)
  const controlBeta = priorBeta + (control.stats.failures || 0)

  const treatmentAlpha = priorAlpha + (treatment.stats.successes || 0)
  const treatmentBeta = priorBeta + (treatment.stats.failures || 0)

  let controlLossSum = 0
  let treatmentLossSum = 0

  for (let i = 0; i < numSimulations; i++) {
    const controlSample = sampleBeta(controlAlpha, controlBeta)
    const treatmentSample = sampleBeta(treatmentAlpha, treatmentBeta)

    // Loss if we choose control but treatment is better
    if (treatmentSample > controlSample) {
      controlLossSum += treatmentSample - controlSample
    }

    // Loss if we choose treatment but control is better
    if (controlSample > treatmentSample) {
      treatmentLossSum += controlSample - treatmentSample
    }
  }

  return {
    controlLoss: controlLossSum / numSimulations,
    treatmentLoss: treatmentLossSum / numSimulations,
  }
}

/**
 * Check if experiment should stop early
 */
export function shouldStopEarly(control: Variant, treatment: Variant, params: BayesianABParams = {}): {
  shouldStop: boolean
  reason?: string
} {
  const threshold = params.earlyStoppingThreshold || 0.95

  // Calculate probability treatment is better
  const result = runBayesianABTest(control, treatment, params)

  if (result.probabilityToBeBest && result.probabilityToBeBest > threshold) {
    return {
      shouldStop: true,
      reason: `Treatment has ${(result.probabilityToBeBest * 100).toFixed(1)}% probability to be best (threshold: ${(threshold * 100).toFixed(1)}%)`,
    }
  }

  if (result.probabilityToBeBest && result.probabilityToBeBest < (1 - threshold)) {
    return {
      shouldStop: true,
      reason: `Control has ${((1 - result.probabilityToBeBest) * 100).toFixed(1)}% probability to be best (threshold: ${(threshold * 100).toFixed(1)}%)`,
    }
  }

  // Check expected loss
  const loss = calculateExpectedLoss(control, treatment)
  const maxAcceptableLoss = 0.01 // 1% absolute difference

  if (loss.controlLoss < maxAcceptableLoss && loss.treatmentLoss < maxAcceptableLoss) {
    return {
      shouldStop: true,
      reason: `Expected loss is negligible (< ${(maxAcceptableLoss * 100).toFixed(1)}% for both variants)`,
    }
  }

  return { shouldStop: false }
}
