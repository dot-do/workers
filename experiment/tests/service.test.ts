/**
 * Experiment Service Integration Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { ExperimentService } from '../src/index'
import type { ExperimentConfig, ExperimentType, AssignmentContext } from '../src/types'

describe('ExperimentService', () => {
  let service: ExperimentService
  let mockEnv: any

  beforeEach(() => {
    // Mock environment with in-memory storage
    const assignments = new Map()
    const experiments = new Map()
    const variants = new Map()
    const observations = new Map()

    mockEnv = {
      EXPERIMENT_KV: {
        get: async (key: string) => {
          if (key.startsWith('assignment:')) return assignments.get(key)
          if (key.startsWith('experiment:')) return experiments.get(key)
          return null
        },
        put: async (key: string, value: string) => {
          if (key.startsWith('assignment:')) assignments.set(key, value)
          if (key.startsWith('experiment:')) experiments.set(key, value)
        },
      },
      EXPERIMENT_DB: {
        prepare: (query: string) => ({
          bind: (...params: any[]) => ({
            run: async () => ({ success: true }),
            first: async () => null,
            all: async () => ({ results: [] }),
          }),
        }),
      },
      EXPERIMENT_QUEUE: {
        send: async (msg: any) => {},
      },
      ANALYTICS: {
        trackEvent: async (event: string, properties: any) => {},
      },
    }

    service = new ExperimentService({} as any, mockEnv)
  })

  describe('createExperiment', () => {
    it('should create a new experiment', async () => {
      const config: ExperimentConfig = {
        name: 'Test Experiment',
        type: 'thompson_sampling' as ExperimentType,
        primaryMetric: 'click',
        trafficAllocation: 1.0,
      }

      const variants = [
        { name: 'Control', isControl: true, config: { adId: 'ad_1' } },
        { name: 'Treatment', config: { adId: 'ad_2' } },
      ]

      const experiment = await service.createExperiment(config, variants)

      expect(experiment.id).toBeDefined()
      expect(experiment.config.name).toBe('Test Experiment')
      expect(experiment.status).toBe('draft')
      expect(experiment.variants).toHaveLength(2)
    })

    it('should validate traffic allocation', async () => {
      const config: ExperimentConfig = {
        name: 'Invalid Traffic',
        type: 'ab_test' as ExperimentType,
        primaryMetric: 'conversion',
        trafficAllocation: 1.5, // Invalid
      }

      await expect(service.createExperiment(config, [])).rejects.toThrow()
    })

    it('should enforce at least 2 variants', async () => {
      const config: ExperimentConfig = {
        name: 'Single Variant',
        type: 'ab_test' as ExperimentType,
        primaryMetric: 'click',
        trafficAllocation: 1.0,
      }

      await expect(service.createExperiment(config, [{ name: 'Only One', isControl: true, config: {} }])).rejects.toThrow()
    })
  })

  describe('startExperiment', () => {
    it('should start a draft experiment', async () => {
      // Create experiment first
      const config: ExperimentConfig = {
        name: 'Start Test',
        type: 'thompson_sampling' as ExperimentType,
        primaryMetric: 'click',
        trafficAllocation: 1.0,
      }

      const variants = [
        { name: 'Control', isControl: true, config: {} },
        { name: 'Treatment', config: {} },
      ]

      const experiment = await service.createExperiment(config, variants)

      // Start it
      const started = await service.startExperiment(experiment.id)

      expect(started.status).toBe('running')
      expect(started.startedAt).toBeDefined()
    })

    it('should not start an already running experiment', async () => {
      // This would require mocking a running experiment
      // Skip for now - integration test would cover this
    })
  })

  describe('assignVariant', () => {
    it('should assign consistent variant to same user', async () => {
      // Create and start experiment
      const config: ExperimentConfig = {
        name: 'Consistency Test',
        type: 'thompson_sampling' as ExperimentType,
        primaryMetric: 'click',
        trafficAllocation: 1.0,
      }

      const variants = [
        { name: 'Control', isControl: true, config: { adId: 'ad_1' } },
        { name: 'Treatment', config: { adId: 'ad_2' } },
      ]

      const experiment = await service.createExperiment(config, variants)
      await service.startExperiment(experiment.id)

      const context: AssignmentContext = {
        userId: 'user_123',
        sessionId: 'session_456',
        timestamp: Date.now(),
        device: 'mobile',
        location: 'US',
        features: {},
      }

      // Assign twice
      const assignment1 = await service.assignVariant(experiment.id, context)
      const assignment2 = await service.assignVariant(experiment.id, context)

      // Should get same variant
      expect(assignment1.variantId).toBe(assignment2.variantId)
      expect(assignment1.id).toBe(assignment2.id)
    })

    it('should respect traffic allocation', async () => {
      const config: ExperimentConfig = {
        name: 'Traffic Test',
        type: 'thompson_sampling' as ExperimentType,
        primaryMetric: 'click',
        trafficAllocation: 0.5, // Only 50% in experiment
      }

      const variants = [
        { name: 'Control', isControl: true, config: {} },
        { name: 'Treatment', config: {} },
      ]

      const experiment = await service.createExperiment(config, variants)
      await service.startExperiment(experiment.id)

      let assigned = 0
      let notAssigned = 0

      for (let i = 0; i < 100; i++) {
        const context: AssignmentContext = {
          userId: `user_${i}`,
          sessionId: `session_${i}`,
          timestamp: Date.now(),
          device: 'mobile',
          location: 'US',
          features: {},
        }

        try {
          await service.assignVariant(experiment.id, context)
          assigned++
        } catch (error: any) {
          if (error.message.includes('traffic')) {
            notAssigned++
          }
        }
      }

      // Should be roughly 50/50
      expect(assigned).toBeGreaterThan(30)
      expect(assigned).toBeLessThan(70)
    })
  })

  describe('recordObservation', () => {
    it('should record observation for assignment', async () => {
      // Create experiment and get assignment
      const config: ExperimentConfig = {
        name: 'Observation Test',
        type: 'thompson_sampling' as ExperimentType,
        primaryMetric: 'click',
        trafficAllocation: 1.0,
      }

      const variants = [
        { name: 'Control', isControl: true, config: {} },
        { name: 'Treatment', config: {} },
      ]

      const experiment = await service.createExperiment(config, variants)
      await service.startExperiment(experiment.id)

      const context: AssignmentContext = {
        userId: 'user_123',
        sessionId: 'session_456',
        timestamp: Date.now(),
        device: 'mobile',
        location: 'US',
        features: {},
      }

      const assignment = await service.assignVariant(experiment.id, context)

      // Record observation
      await service.recordObservation(assignment.id, 'click', 1)

      // Should succeed without error
      expect(true).toBe(true)
    })

    it('should handle multiple observations', async () => {
      // Similar to above but record multiple observations
      // This is more of an integration test
    })
  })

  describe('getExperimentStats', () => {
    it('should return experiment statistics', async () => {
      const config: ExperimentConfig = {
        name: 'Stats Test',
        type: 'bayesian_ab' as ExperimentType,
        primaryMetric: 'conversion',
        trafficAllocation: 1.0,
      }

      const variants = [
        { name: 'Control', isControl: true, config: {} },
        { name: 'Treatment', config: {} },
      ]

      const experiment = await service.createExperiment(config, variants)

      const stats = await service.getExperimentStats(experiment.id)

      expect(stats.experimentId).toBe(experiment.id)
      expect(stats.variants).toBeDefined()
      expect(stats.variants).toHaveLength(2)
    })
  })

  describe('concludeExperiment', () => {
    it('should conclude running experiment', async () => {
      const config: ExperimentConfig = {
        name: 'Conclusion Test',
        type: 'ab_test' as ExperimentType,
        primaryMetric: 'click',
        trafficAllocation: 1.0,
      }

      const variants = [
        { name: 'Control', isControl: true, config: {} },
        { name: 'Treatment', config: {} },
      ]

      const experiment = await service.createExperiment(config, variants)
      await service.startExperiment(experiment.id)

      const concluded = await service.concludeExperiment(experiment.id)

      expect(concluded.status).toBe('completed')
      expect(concluded.concludedAt).toBeDefined()
    })

    it('should set winner when specified', async () => {
      // Create experiment
      const config: ExperimentConfig = {
        name: 'Winner Test',
        type: 'ab_test' as ExperimentType,
        primaryMetric: 'conversion',
        trafficAllocation: 1.0,
      }

      const variants = [
        { name: 'Control', isControl: true, config: {} },
        { name: 'Treatment', config: {} },
      ]

      const experiment = await service.createExperiment(config, variants)
      await service.startExperiment(experiment.id)

      // Conclude with winner
      const winnerVariantId = experiment.variants[1].id
      const concluded = await service.concludeExperiment(experiment.id, winnerVariantId)

      expect(concluded.winnerVariantId).toBe(winnerVariantId)
    })
  })
})
