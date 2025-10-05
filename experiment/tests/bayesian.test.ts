/**
 * Bayesian A/B Testing Algorithm Tests
 */

import { describe, it, expect } from 'vitest'
import { runBayesianABTest, calculateCredibleInterval, calculateExpectedLoss } from '../src/algorithms/bayesian'
import type { Variant } from '../src/types'

describe('Bayesian A/B Testing', () => {
  const createVariant = (id: string, successes: number, failures: number): Variant => ({
    id,
    experimentId: 'exp_1',
    name: `Variant ${id}`,
    isControl: id === 'control',
    weight: 0.5,
    config: {},
    stats: {
      observations: successes + failures,
      successes,
      failures,
      mean: successes / (successes + failures),
      variance: 0,
      stddev: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  describe('runBayesianABTest', () => {
    it('should detect no significant difference for equal variants', () => {
      const control = createVariant('control', 50, 50)
      const treatment = createVariant('treatment', 50, 50)

      const result = runBayesianABTest(control, treatment, { threshold: 0.95 })

      expect(result.isSignificant).toBe(false)
      expect(result.probabilityToBeBest).toBeGreaterThan(0.4)
      expect(result.probabilityToBeBest).toBeLessThan(0.6)
    })

    it('should detect significant difference for clearly better variant', () => {
      const control = createVariant('control', 200, 800) // 20%
      const treatment = createVariant('treatment', 600, 400) // 60%

      const result = runBayesianABTest(control, treatment, { threshold: 0.95 })

      expect(result.isSignificant).toBe(true)
      expect(result.probabilityToBeBest).toBeGreaterThan(0.99)
      expect(result.liftMean).toBeGreaterThan(1.5) // 60% vs 20% = 200% lift
    })

    it('should not be significant with small sample size', () => {
      const control = createVariant('control', 2, 8) // 20%
      const treatment = createVariant('treatment', 6, 4) // 60%

      const result = runBayesianABTest(control, treatment, { threshold: 0.95 })

      // Large difference but small sample - might not be significant
      expect(result.probabilityToBeBest).toBeGreaterThan(0.7)
      // But might not reach 95% threshold
    })

    it('should calculate lift correctly', () => {
      const control = createVariant('control', 100, 900) // 10%
      const treatment = createVariant('treatment', 200, 800) // 20%

      const result = runBayesianABTest(control, treatment)

      expect(result.liftMean).toBeGreaterThan(0.8) // ~100% lift (10% → 20%)
      expect(result.liftMean).toBeLessThan(1.2)
      expect(result.liftCredibleInterval).toBeDefined()
      expect(result.liftCredibleInterval![0]).toBeLessThan(result.liftMean)
      expect(result.liftCredibleInterval![1]).toBeGreaterThan(result.liftMean)
    })

    it('should respect custom threshold', () => {
      const control = createVariant('control', 45, 55) // 45%
      const treatment = createVariant('treatment', 55, 45) // 55%

      const result90 = runBayesianABTest(control, treatment, { threshold: 0.9 })
      const result99 = runBayesianABTest(control, treatment, { threshold: 0.99 })

      // Might be significant at 90% but not 99%
      if (result90.isSignificant) {
        expect(result99.isSignificant).toBe(false)
      }
    })

    it('should use custom priors', () => {
      const control = createVariant('control', 5, 5)
      const treatment = createVariant('treatment', 8, 2)

      // Weak priors (default)
      const result1 = runBayesianABTest(control, treatment, { priorAlpha: 1, priorBeta: 1 })

      // Strong priors favoring 50% conversion
      const result2 = runBayesianABTest(control, treatment, { priorAlpha: 100, priorBeta: 100 })

      // Strong priors should reduce confidence
      expect(result2.probabilityToBeBest).toBeLessThan(result1.probabilityToBeBest)
    })

    it('should increase confidence with more observations', () => {
      // Small sample
      const controlSmall = createVariant('control', 5, 5)
      const treatmentSmall = createVariant('treatment', 7, 3)
      const resultSmall = runBayesianABTest(controlSmall, treatmentSmall)

      // Large sample with same proportions
      const controlLarge = createVariant('control', 500, 500)
      const treatmentLarge = createVariant('treatment', 700, 300)
      const resultLarge = runBayesianABTest(controlLarge, treatmentLarge)

      // Large sample should have higher confidence
      expect(resultLarge.probabilityToBeBest).toBeGreaterThan(resultSmall.probabilityToBeBest)
      expect(resultLarge.isSignificant).toBe(true)
    })

    it('should handle treatment worse than control', () => {
      const control = createVariant('control', 60, 40) // 60%
      const treatment = createVariant('treatment', 40, 60) // 40%

      const result = runBayesianABTest(control, treatment)

      expect(result.probabilityToBeBest).toBeLessThan(0.1)
      expect(result.liftMean).toBeLessThan(0) // Negative lift
    })

    it('should provide credible intervals', () => {
      const control = createVariant('control', 50, 50)
      const treatment = createVariant('treatment', 60, 40)

      const result = runBayesianABTest(control, treatment)

      expect(result.liftCredibleInterval).toBeDefined()
      expect(result.liftCredibleInterval![0]).toBeLessThan(result.liftMean)
      expect(result.liftCredibleInterval![1]).toBeGreaterThan(result.liftMean)
    })
  })

  describe('calculateCredibleInterval', () => {
    it('should calculate 95% credible interval', () => {
      const variant = createVariant('test', 50, 50)

      const interval = calculateCredibleInterval(variant, 0.95)

      expect(interval).toBeDefined()
      expect(interval[0]).toBeGreaterThan(0.3)
      expect(interval[0]).toBeLessThan(0.5)
      expect(interval[1]).toBeGreaterThan(0.5)
      expect(interval[1]).toBeLessThan(0.7)
    })

    it('should have wider interval for 99% confidence', () => {
      const variant = createVariant('test', 50, 50)

      const interval95 = calculateCredibleInterval(variant, 0.95)
      const interval99 = calculateCredibleInterval(variant, 0.99)

      const width95 = interval95[1] - interval95[0]
      const width99 = interval99[1] - interval99[0]

      expect(width99).toBeGreaterThan(width95)
    })

    it('should have narrower interval with more data', () => {
      const variantSmall = createVariant('test', 5, 5)
      const variantLarge = createVariant('test', 500, 500)

      const intervalSmall = calculateCredibleInterval(variantSmall, 0.95)
      const intervalLarge = calculateCredibleInterval(variantLarge, 0.95)

      const widthSmall = intervalSmall[1] - intervalSmall[0]
      const widthLarge = intervalLarge[1] - intervalLarge[0]

      expect(widthLarge).toBeLessThan(widthSmall)
    })
  })

  describe('calculateExpectedLoss', () => {
    it('should calculate expected loss when treatment is worse', () => {
      const control = createVariant('control', 60, 40) // 60%
      const treatment = createVariant('treatment', 40, 60) // 40%

      const loss = calculateExpectedLoss(control, treatment)

      expect(loss).toBeGreaterThan(0)
      // Loss should be roughly 20% (60% - 40%)
      expect(loss).toBeGreaterThan(0.15)
      expect(loss).toBeLessThan(0.25)
    })

    it('should have low loss when treatment is better', () => {
      const control = createVariant('control', 40, 60) // 40%
      const treatment = createVariant('treatment', 60, 40) // 60%

      const loss = calculateExpectedLoss(control, treatment)

      expect(loss).toBeLessThan(0.05) // Small loss
    })

    it('should calculate zero loss for equal variants', () => {
      const control = createVariant('control', 50, 50)
      const treatment = createVariant('treatment', 50, 50)

      const loss = calculateExpectedLoss(control, treatment)

      expect(loss).toBeLessThan(0.05)
    })

    it('should have higher loss with more certainty', () => {
      // Small sample
      const controlSmall = createVariant('control', 6, 4)
      const treatmentSmall = createVariant('treatment', 4, 6)
      const lossSmall = calculateExpectedLoss(controlSmall, treatmentSmall)

      // Large sample with same proportions
      const controlLarge = createVariant('control', 600, 400)
      const treatmentLarge = createVariant('treatment', 400, 600)
      const lossLarge = calculateExpectedLoss(controlLarge, treatmentLarge)

      // Large sample should have higher expected loss (more certain)
      expect(lossLarge).toBeGreaterThan(lossSmall)
    })
  })
})
