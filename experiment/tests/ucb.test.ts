/**
 * UCB (Upper Confidence Bound) Algorithm Tests
 */

import { describe, it, expect } from 'vitest'
import { selectVariantUCB } from '../src/algorithms/ucb'
import type { Variant } from '../src/types'

describe('UCB (Upper Confidence Bound)', () => {
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

  describe('selectVariantUCB', () => {
    it('should prioritize unexplored variants', () => {
      const variants = [
        createVariant('A', 10, 10), // 50% with 20 observations
        createVariant('B', 0, 0), // No observations - should be selected
      ]

      const selected = selectVariantUCB(variants)
      expect(selected.id).toBe('B')
    })

    it('should balance exploration and exploitation', () => {
      const variants = [
        createVariant('A', 100, 100), // 50% with 200 observations
        createVariant('B', 60, 40), // 60% with 100 observations
      ]

      // With more observations, A has lower uncertainty
      // But B has higher mean, so UCB should favor B
      const selected = selectVariantUCB(variants)
      expect(selected.id).toBe('B')
    })

    it('should respect exploration parameter', () => {
      const variants = [
        createVariant('A', 50, 50), // 50% with 100 observations
        createVariant('B', 52, 48), // 52% with 100 observations
      ]

      // With high c (exploration), should still explore
      const selected1 = selectVariantUCB(variants, { c: 10 })
      expect(selected1).toBeDefined()

      // With low c (exploitation), should pick best mean
      const selected2 = selectVariantUCB(variants, { c: 0.1 })
      expect(selected2.id).toBe('B') // Higher mean
    })

    it('should handle equal variants correctly', () => {
      const variants = [
        createVariant('A', 50, 50),
        createVariant('B', 50, 50),
        createVariant('C', 50, 50),
      ]

      // Should select one of them deterministically
      const selected = selectVariantUCB(variants)
      expect(['A', 'B', 'C']).toContain(selected.id)
    })

    it('should converge to best variant with high observations', () => {
      const variants = [
        createVariant('A', 4000, 6000), // 40% - clearly worse
        createVariant('B', 5500, 4500), // 55% - best
        createVariant('C', 4800, 5200), // 48% - mediocre
      ]

      // With high observations, uncertainty is low
      // Should consistently pick best mean
      const selections: Record<string, number> = { A: 0, B: 0, C: 0 }
      for (let i = 0; i < 100; i++) {
        const selected = selectVariantUCB(variants)
        selections[selected.id]++
      }

      // B should be selected every time (deterministic)
      expect(selections.B).toBe(100)
    })

    it('should explore more with higher c value', () => {
      const variants = [
        createVariant('A', 100, 100), // 50% with 200 observations
        createVariant('B', 10, 10), // 50% with 20 observations
      ]

      // With c=0, should pick based on mean only (tie)
      const selected1 = selectVariantUCB(variants, { c: 0 })
      expect(selected1).toBeDefined()

      // With c=5, should favor B due to higher uncertainty
      const selected2 = selectVariantUCB(variants, { c: 5 })
      expect(selected2.id).toBe('B')
    })

    it('should handle zero observations gracefully', () => {
      const variants = [createVariant('A', 0, 0), createVariant('B', 0, 0), createVariant('C', 0, 0)]

      const selected = selectVariantUCB(variants)
      expect(['A', 'B', 'C']).toContain(selected.id)
    })

    it('should prefer high mean with low uncertainty', () => {
      const variants = [
        createVariant('A', 8000, 2000), // 80% with 10000 observations
        createVariant('B', 80, 20), // 80% with 100 observations
      ]

      // Even though means are equal, A has lower uncertainty
      // But exploration bonus should favor B slightly
      const selected = selectVariantUCB(variants, { c: 2 })

      // With default c=2, should favor B (more uncertainty = exploration bonus)
      expect(selected.id).toBe('B')
    })

    it('should work with 5 variants', () => {
      const variants = [
        createVariant('A', 10, 90), // 10%
        createVariant('B', 20, 80), // 20%
        createVariant('C', 30, 70), // 30%
        createVariant('D', 50, 50), // 50% - best
        createVariant('E', 40, 60), // 40%
      ]

      const selections: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 }
      for (let i = 0; i < 100; i++) {
        const selected = selectVariantUCB(variants)
        selections[selected.id]++
      }

      // D should dominate
      expect(selections.D).toBeGreaterThan(80)
    })

    it('should be deterministic with same inputs', () => {
      const variants = [
        createVariant('A', 50, 50),
        createVariant('B', 60, 40),
        createVariant('C', 45, 55),
      ]

      const selected1 = selectVariantUCB(variants)
      const selected2 = selectVariantUCB(variants)
      const selected3 = selectVariantUCB(variants)

      expect(selected1.id).toBe(selected2.id)
      expect(selected2.id).toBe(selected3.id)
    })
  })
})
