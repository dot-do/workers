/**
 * Epsilon-Greedy Algorithm Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { selectVariantEpsilonGreedy } from '../src/algorithms/epsilon-greedy'
import type { Variant } from '../src/types'

describe('Epsilon-Greedy', () => {
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

  describe('selectVariantEpsilonGreedy', () => {
    it('should exploit best variant with epsilon=0', () => {
      const variants = [
        createVariant('A', 40, 60), // 40%
        createVariant('B', 60, 40), // 60% - best
        createVariant('C', 50, 50), // 50%
      ]

      // With epsilon=0, should always exploit
      const selections: Record<string, number> = { A: 0, B: 0, C: 0 }
      for (let i = 0; i < 100; i++) {
        const selected = selectVariantEpsilonGreedy(variants, { epsilon: 0 })
        selections[selected.id]++
      }

      expect(selections.B).toBe(100)
      expect(selections.A).toBe(0)
      expect(selections.C).toBe(0)
    })

    it('should explore all variants with epsilon=1', () => {
      const variants = [
        createVariant('A', 10, 90),
        createVariant('B', 90, 10),
        createVariant('C', 50, 50),
      ]

      // With epsilon=1, should always explore (random)
      const selections: Record<string, number> = { A: 0, B: 0, C: 0 }
      for (let i = 0; i < 1000; i++) {
        const selected = selectVariantEpsilonGreedy(variants, { epsilon: 1 })
        selections[selected.id]++
      }

      // All variants should get roughly equal selections
      expect(selections.A).toBeGreaterThan(250)
      expect(selections.A).toBeLessThan(400)
      expect(selections.B).toBeGreaterThan(250)
      expect(selections.B).toBeLessThan(400)
      expect(selections.C).toBeGreaterThan(250)
      expect(selections.C).toBeLessThan(400)
    })

    it('should balance exploration and exploitation with epsilon=0.1', () => {
      const variants = [
        createVariant('A', 10, 90), // 10% - bad
        createVariant('B', 80, 20), // 80% - best
      ]

      // With epsilon=0.1, should exploit 90% of time
      const selections: Record<string, number> = { A: 0, B: 0 }
      for (let i = 0; i < 1000; i++) {
        const selected = selectVariantEpsilonGreedy(variants, { epsilon: 0.1 })
        selections[selected.id]++
      }

      // B should get ~90% + half of 10% = ~95%
      expect(selections.B).toBeGreaterThan(850)
      expect(selections.A).toBeGreaterThan(0)
      expect(selections.A).toBeLessThan(150)
    })

    it('should handle variants with no data', () => {
      const variants = [
        createVariant('A', 0, 0),
        createVariant('B', 0, 0),
      ]

      // With no data, all variants have mean=0
      // Should select randomly
      const selections: Record<string, number> = { A: 0, B: 0 }
      for (let i = 0; i < 100; i++) {
        const selected = selectVariantEpsilonGreedy(variants, { epsilon: 0.5 })
        selections[selected.id]++
      }

      expect(selections.A).toBeGreaterThan(0)
      expect(selections.B).toBeGreaterThan(0)
    })

    it('should decay epsilon over time', () => {
      const variants = [
        createVariant('A', 40, 60), // 40%
        createVariant('B', 60, 40), // 60%
      ]

      // Simulate 1000 iterations with decaying epsilon
      const selections: number[] = []
      for (let i = 1; i <= 1000; i++) {
        const epsilon = Math.max(0.01, 1 / i) // Decay epsilon
        const selected = selectVariantEpsilonGreedy(variants, { epsilon })
        selections.push(selected.id === 'B' ? 1 : 0)
      }

      // Early selections should be more random
      const early = selections.slice(0, 100).reduce((sum, v) => sum + v, 0)
      expect(early).toBeGreaterThan(50)
      expect(early).toBeLessThan(90)

      // Late selections should favor B
      const late = selections.slice(900, 1000).reduce((sum, v) => sum + v, 0)
      expect(late).toBeGreaterThan(90)
    })

    it('should work with 5 variants', () => {
      const variants = [
        createVariant('A', 10, 90), // 10%
        createVariant('B', 30, 70), // 30%
        createVariant('C', 50, 50), // 50%
        createVariant('D', 70, 30), // 70% - best
        createVariant('E', 60, 40), // 60%
      ]

      const selections: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 }
      for (let i = 0; i < 1000; i++) {
        const selected = selectVariantEpsilonGreedy(variants, { epsilon: 0.1 })
        selections[selected.id]++
      }

      // D should dominate (70% best + ~90% exploitation)
      expect(selections.D).toBeGreaterThan(850)

      // All others should get some exploration
      expect(selections.A).toBeGreaterThan(0)
      expect(selections.B).toBeGreaterThan(0)
      expect(selections.C).toBeGreaterThan(0)
      expect(selections.E).toBeGreaterThan(0)
    })

    it('should handle epsilon boundary values', () => {
      const variants = [createVariant('A', 50, 50), createVariant('B', 60, 40)]

      // epsilon = 0 (pure exploitation)
      const selected1 = selectVariantEpsilonGreedy(variants, { epsilon: 0 })
      expect(selected1.id).toBe('B')

      // epsilon = 1 (pure exploration)
      const selections: Record<string, number> = { A: 0, B: 0 }
      for (let i = 0; i < 100; i++) {
        const selected = selectVariantEpsilonGreedy(variants, { epsilon: 1 })
        selections[selected.id]++
      }
      expect(selections.A).toBeGreaterThan(30)
      expect(selections.B).toBeGreaterThan(30)
    })

    it('should use default epsilon=0.1', () => {
      const variants = [
        createVariant('A', 20, 80),
        createVariant('B', 80, 20),
      ]

      const selections: Record<string, number> = { A: 0, B: 0 }
      for (let i = 0; i < 1000; i++) {
        const selected = selectVariantEpsilonGreedy(variants) // No epsilon specified
        selections[selected.id]++
      }

      // Should exploit most of the time (default epsilon=0.1)
      expect(selections.B).toBeGreaterThan(850)
    })

    it('should handle tie in means', () => {
      const variants = [
        createVariant('A', 50, 50),
        createVariant('B', 50, 50),
      ]

      // With epsilon=0, should still pick one deterministically
      const selections: Record<string, number> = { A: 0, B: 0 }
      for (let i = 0; i < 100; i++) {
        const selected = selectVariantEpsilonGreedy(variants, { epsilon: 0 })
        selections[selected.id]++
      }

      // One should be selected 100% of the time (first with max mean)
      expect(selections.A === 100 || selections.B === 100).toBe(true)
    })
  })
})
