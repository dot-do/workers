/**
 * Thompson Sampling Algorithm Tests
 */

import { describe, it, expect } from 'vitest'
import { selectVariantThompsonSampling, calculateProbabilityToBeBest } from '../src/algorithms/thompson-sampling'
import type { Variant } from '../src/types'

describe('Thompson Sampling', () => {
  const createVariant = (id: string, successes: number, failures: number): Variant => ({
    id,
    experimentId: 'exp_1',
    name: `Variant ${id}`,
    isControl: id === 'A',
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

  describe('selectVariantThompsonSampling', () => {
    it('should select variant with no data (exploration)', () => {
      const variants = [createVariant('A', 0, 0), createVariant('B', 0, 0)]

      const selected = selectVariantThompsonSampling(variants)
      expect(selected).toBeDefined()
      expect(['A', 'B']).toContain(selected.id)
    })

    it('should favor variant with better performance', () => {
      const variants = [
        createVariant('A', 10, 90), // 10% success rate
        createVariant('B', 50, 50), // 50% success rate
      ]

      // Run multiple times and count selections
      const selections: Record<string, number> = { A: 0, B: 0 }
      for (let i = 0; i < 1000; i++) {
        const selected = selectVariantThompsonSampling(variants)
        selections[selected.id]++
      }

      // Variant B should be selected significantly more often
      expect(selections.B).toBeGreaterThan(selections.A)
      expect(selections.B).toBeGreaterThan(700) // At least 70% of the time
    })

    it('should still explore lower-performing variants', () => {
      const variants = [
        createVariant('A', 10, 90), // 10% success rate
        createVariant('B', 50, 50), // 50% success rate
      ]

      // Run multiple times
      const selections: Record<string, number> = { A: 0, B: 0 }
      for (let i = 0; i < 1000; i++) {
        const selected = selectVariantThompsonSampling(variants)
        selections[selected.id]++
      }

      // Variant A should still get some selections (exploration)
      expect(selections.A).toBeGreaterThan(0)
      expect(selections.A).toBeGreaterThan(50) // At least 5% of the time
    })

    it('should respect custom priors', () => {
      const variants = [createVariant('A', 0, 0), createVariant('B', 0, 0)]

      // With strong priors favoring B
      const selections: Record<string, number> = { A: 0, B: 0 }
      for (let i = 0; i < 100; i++) {
        const selected = selectVariantThompsonSampling(variants, {
          priorAlpha: 10, // Strong prior
          priorBeta: 1,
        })
        selections[selected.id]++
      }

      // Both should get selections due to randomness
      expect(selections.A).toBeGreaterThan(0)
      expect(selections.B).toBeGreaterThan(0)
    })

    it('should converge to best variant over time', () => {
      const variants = [
        createVariant('A', 100, 900), // 10% - bad variant
        createVariant('B', 500, 500), // 50% - best variant
        createVariant('C', 200, 800), // 20% - mediocre variant
      ]

      const selections: Record<string, number> = { A: 0, B: 0, C: 0 }
      for (let i = 0; i < 10000; i++) {
        const selected = selectVariantThompsonSampling(variants)
        selections[selected.id]++
      }

      // B should dominate
      expect(selections.B).toBeGreaterThan(selections.A)
      expect(selections.B).toBeGreaterThan(selections.C)
      expect(selections.B).toBeGreaterThan(7000) // At least 70%
    })
  })

  describe('calculateProbabilityToBeBest', () => {
    it('should calculate 50% for equal variants', () => {
      const variants = [createVariant('A', 50, 50), createVariant('B', 50, 50)]

      const prob = calculateProbabilityToBeBest(variants[0], variants, 1000)
      expect(prob).toBeGreaterThan(0.4)
      expect(prob).toBeLessThan(0.6)
    })

    it('should calculate high probability for clear winner', () => {
      const variants = [
        createVariant('A', 80, 20), // 80% - winner
        createVariant('B', 20, 80), // 20% - loser
      ]

      const prob = calculateProbabilityToBeBest(variants[0], variants, 1000)
      expect(prob).toBeGreaterThan(0.95)
    })

    it('should calculate low probability for clear loser', () => {
      const variants = [
        createVariant('A', 20, 80), // 20% - loser
        createVariant('B', 80, 20), // 80% - winner
      ]

      const prob = calculateProbabilityToBeBest(variants[0], variants, 1000)
      expect(prob).toBeLessThan(0.1)
    })

    it('should handle three variants correctly', () => {
      const variants = [
        createVariant('A', 100, 900), // 10%
        createVariant('B', 500, 500), // 50% - best
        createVariant('C', 300, 700), // 30%
      ]

      const probA = calculateProbabilityToBeBest(variants[0], variants, 1000)
      const probB = calculateProbabilityToBeBest(variants[1], variants, 1000)
      const probC = calculateProbabilityToBeBest(variants[2], variants, 1000)

      expect(probB).toBeGreaterThan(probA)
      expect(probB).toBeGreaterThan(probC)
      expect(probB).toBeGreaterThan(0.8)
    })

    it('should increase confidence with more data', () => {
      // Small sample
      const variantsSmall = [createVariant('A', 6, 4), createVariant('B', 4, 6)]
      const probSmall = calculateProbabilityToBeBest(variantsSmall[0], variantsSmall, 1000)

      // Large sample with same proportions
      const variantsLarge = [createVariant('A', 600, 400), createVariant('B', 400, 600)]
      const probLarge = calculateProbabilityToBeBest(variantsLarge[0], variantsLarge, 1000)

      // Large sample should have higher confidence
      expect(probLarge).toBeGreaterThan(probSmall)
      expect(probLarge).toBeGreaterThan(0.9)
    })
  })
})
