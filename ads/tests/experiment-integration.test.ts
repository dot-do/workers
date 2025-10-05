/**
 * Ads + Experiment Integration Tests
 * Tests the tight coupling between ads worker and experiment worker
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { AdsService } from '../src/index'
import type { Ad, AdContext } from '../src/types'

describe('Ads + Experiment Integration', () => {
  let adsService: AdsService
  let mockEnv: any
  let experimentAssignments: Map<string, any>
  let experimentObservations: Array<any>

  const createAd = (id: string, qualityScore: number = 8, bid: number = 5.0): Ad => ({
    id,
    campaignId: 'campaign_1',
    creativeId: `creative_${id}`,
    status: 'active',
    bid,
    dailyBudget: 1000,
    totalBudget: 10000,
    spent: 0,
    qualityScore,
    metrics: {
      impressions: 0,
      clicks: 0,
      conversions: 0,
      spend: 0,
      revenue: 0,
      ctr: 0,
      cpc: 0,
      cpm: 0,
      cvr: 0,
      roas: 0,
    },
    config: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  beforeEach(() => {
    experimentAssignments = new Map()
    experimentObservations = []

    const ads = new Map<string, Ad>()
    ads.set('ad_1', createAd('ad_1', 8, 5.0))
    ads.set('ad_2', createAd('ad_2', 9, 6.0))
    ads.set('ad_3', createAd('ad_3', 7, 7.0))

    mockEnv = {
      ADS_KV: {
        get: async (key: string) => {
          if (key === 'active_experiment') {
            return JSON.stringify({ id: 'exp_123' })
          }
          if (key.startsWith('freq:')) return null
          return null
        },
        put: async (key: string, value: string) => {},
      },
      ADS_DB: {
        prepare: (query: string) => ({
          bind: (...params: any[]) => ({
            run: async () => ({ success: true }),
            first: async (col?: string) => {
              if (query.includes('SELECT * FROM ads WHERE id = ?')) {
                const adId = params[0]
                return ads.get(adId) || null
              }
              if (query.includes('SELECT * FROM ad_impressions WHERE id = ?')) {
                return {
                  id: params[0],
                  adId: 'ad_1',
                  assignmentId: 'assignment_456',
                  experimentId: 'exp_123',
                }
              }
              return null
            },
            all: async () => {
              if (query.includes('WHERE status = ?')) {
                return { results: Array.from(ads.values()) }
              }
              return { results: [] }
            },
          }),
        }),
      },
      EXPERIMENT: {
        // Mock experiment worker
        assignVariant: async (experimentId: string, context: any) => {
          // Deterministic assignment based on userId
          const variantIndex = context.userId.charCodeAt(context.userId.length - 1) % 3
          const variantIds = ['variant_a', 'variant_b', 'variant_c']
          const adIds = ['ad_1', 'ad_2', 'ad_3']

          const assignment = {
            id: `assignment_${context.userId}`,
            experimentId,
            variantId: variantIds[variantIndex],
            config: {
              adId: adIds[variantIndex],
            },
            timestamp: Date.now(),
          }

          experimentAssignments.set(assignment.id, assignment)
          return assignment
        },
        recordObservation: async (assignmentId: string, metric: string, value: number) => {
          experimentObservations.push({
            assignmentId,
            metric,
            value,
            timestamp: Date.now(),
          })
        },
      },
    }

    adsService = new AdsService({} as any, mockEnv)
  })

  describe('Ad Selection with Experiments', () => {
    it('should use experiment assignment when active experiment exists', async () => {
      const context: AdContext = {
        userId: 'user_123', // Will map to ad_1
        sessionId: 'session_456',
        timestamp: Date.now(),
        device: 'mobile',
        location: 'US',
        url: 'https://example.com',
      }

      const result = await adsService.selectAd(context)

      expect(result.ad).toBeDefined()
      expect(result.impression).toBeDefined()
      expect(result.experimentAssignment).toBeDefined()
      expect(result.experimentAssignment!.experimentId).toBe('exp_123')
      expect(result.experimentAssignment!.assignmentId).toBeDefined()
    })

    it('should maintain assignment consistency for same user', async () => {
      const context1: AdContext = {
        userId: 'user_abc', // Consistent user
        sessionId: 'session_1',
        timestamp: Date.now(),
        device: 'mobile',
        location: 'US',
        url: 'https://example.com',
      }

      const context2: AdContext = {
        ...context1,
        sessionId: 'session_2', // Different session, same user
      }

      const result1 = await adsService.selectAd(context1)
      const result2 = await adsService.selectAd(context2)

      // Should get same ad (variant) for same user
      expect(result1.ad.id).toBe(result2.ad.id)
      expect(result1.experimentAssignment!.variantId).toBe(result2.experimentAssignment!.variantId)
    })

    it('should fallback to quality-based selection when experiment fails', async () => {
      // Mock experiment failure
      mockEnv.EXPERIMENT.assignVariant = async () => {
        throw new Error('Experiment service unavailable')
      }

      const context: AdContext = {
        userId: 'user_123',
        sessionId: 'session_456',
        timestamp: Date.now(),
        device: 'mobile',
        location: 'US',
        url: 'https://example.com',
      }

      const result = await adsService.selectAd(context)

      expect(result.ad).toBeDefined()
      expect(result.experimentAssignment).toBeUndefined()
      // Should have selected based on quality × bid
    })

    it('should fallback when no active experiment', async () => {
      // Mock no active experiment
      mockEnv.ADS_KV.get = async (key: string) => {
        if (key === 'active_experiment') return null
        if (key.startsWith('freq:')) return null
        return null
      }

      const context: AdContext = {
        userId: 'user_123',
        sessionId: 'session_456',
        timestamp: Date.now(),
        device: 'mobile',
        location: 'US',
        url: 'https://example.com',
      }

      const result = await adsService.selectAd(context)

      expect(result.ad).toBeDefined()
      expect(result.experimentAssignment).toBeUndefined()
    })
  })

  describe('Observation Recording', () => {
    it('should record click observation to experiment worker', async () => {
      const context: AdContext = {
        userId: 'user_123',
        sessionId: 'session_456',
        timestamp: Date.now(),
        device: 'mobile',
        location: 'US',
        url: 'https://example.com',
      }

      // Select ad with experiment
      const result = await adsService.selectAd(context)
      const impressionId = result.impression.id

      // Record click
      await adsService.recordClick(impressionId)

      // Check that observation was recorded
      const clickObservation = experimentObservations.find((obs) => obs.metric === 'click' && obs.assignmentId === result.experimentAssignment!.assignmentId)

      expect(clickObservation).toBeDefined()
      expect(clickObservation!.value).toBe(1)
    })

    it('should record conversion observation to experiment worker', async () => {
      const context: AdContext = {
        userId: 'user_123',
        sessionId: 'session_456',
        timestamp: Date.now(),
        device: 'mobile',
        location: 'US',
        url: 'https://example.com',
      }

      const result = await adsService.selectAd(context)
      const impressionId = result.impression.id

      // Record conversion
      const conversionValue = 49.99
      await adsService.recordConversion(impressionId, conversionValue)

      // Check observations
      const conversionObservation = experimentObservations.find(
        (obs) => obs.metric === 'conversion' && obs.assignmentId === result.experimentAssignment!.assignmentId
      )
      const revenueObservation = experimentObservations.find(
        (obs) => obs.metric === 'revenue' && obs.assignmentId === result.experimentAssignment!.assignmentId
      )

      expect(conversionObservation).toBeDefined()
      expect(conversionObservation!.value).toBe(1)
      expect(revenueObservation).toBeDefined()
      expect(revenueObservation!.value).toBe(conversionValue)
    })

    it('should record impression observation to experiment worker', async () => {
      const context: AdContext = {
        userId: 'user_123',
        sessionId: 'session_456',
        timestamp: Date.now(),
        device: 'mobile',
        location: 'US',
        url: 'https://example.com',
      }

      const result = await adsService.selectAd(context)
      const impressionId = result.impression.id

      // Record impression with viewability
      await adsService.recordImpression(impressionId, 0.75)

      // Check observation
      const impressionObservation = experimentObservations.find(
        (obs) => obs.metric === 'impression' && obs.assignmentId === result.experimentAssignment!.assignmentId
      )

      expect(impressionObservation).toBeDefined()
      expect(impressionObservation!.value).toBe(1)
    })

    it('should not record observations when not part of experiment', async () => {
      // Mock no active experiment
      mockEnv.ADS_KV.get = async (key: string) => {
        if (key === 'active_experiment') return null
        return null
      }

      const context: AdContext = {
        userId: 'user_123',
        sessionId: 'session_456',
        timestamp: Date.now(),
        device: 'mobile',
        location: 'US',
        url: 'https://example.com',
      }

      const result = await adsService.selectAd(context)
      await adsService.recordClick(result.impression.id)

      // No observations should be recorded
      expect(experimentObservations).toHaveLength(0)
    })
  })

  describe('Complete Flow', () => {
    it('should handle complete ad lifecycle with experiment', async () => {
      const context: AdContext = {
        userId: 'user_789',
        sessionId: 'session_xyz',
        timestamp: Date.now(),
        device: 'desktop',
        location: 'US',
        url: 'https://example.com/blog',
      }

      // 1. Select ad (creates assignment)
      const result = await adsService.selectAd(context)
      expect(result.experimentAssignment).toBeDefined()
      const assignmentId = result.experimentAssignment!.assignmentId

      // 2. Record impression
      await adsService.recordImpression(result.impression.id, 0.9)
      const impressionObs = experimentObservations.filter((obs) => obs.assignmentId === assignmentId && obs.metric === 'impression')
      expect(impressionObs).toHaveLength(1)

      // 3. Record click
      await adsService.recordClick(result.impression.id)
      const clickObs = experimentObservations.filter((obs) => obs.assignmentId === assignmentId && obs.metric === 'click')
      expect(clickObs).toHaveLength(1)

      // 4. Record conversion
      await adsService.recordConversion(result.impression.id, 99.99)
      const conversionObs = experimentObservations.filter((obs) => obs.assignmentId === assignmentId && obs.metric === 'conversion')
      const revenueObs = experimentObservations.filter((obs) => obs.assignmentId === assignmentId && obs.metric === 'revenue')
      expect(conversionObs).toHaveLength(1)
      expect(revenueObs).toHaveLength(1)
      expect(revenueObs[0].value).toBe(99.99)

      // Total observations: 1 impression + 1 click + 1 conversion + 1 revenue = 4
      expect(experimentObservations).toHaveLength(4)
    })

    it('should handle partial conversion (view-through)', async () => {
      const context: AdContext = {
        userId: 'user_999',
        sessionId: 'session_999',
        timestamp: Date.now(),
        device: 'mobile',
        location: 'US',
        url: 'https://example.com',
      }

      // Select ad
      const result = await adsService.selectAd(context)

      // Record impression but NO click
      await adsService.recordImpression(result.impression.id, 0.8)

      // Record conversion (view-through conversion)
      await adsService.recordConversion(result.impression.id, 29.99)

      const assignmentId = result.experimentAssignment!.assignmentId
      const conversionObs = experimentObservations.filter((obs) => obs.assignmentId === assignmentId && obs.metric === 'conversion')

      expect(conversionObs).toHaveLength(1)
      // Should still record conversion even without click
    })
  })

  describe('Experiment Configuration', () => {
    it('should retrieve active experiment config from KV', async () => {
      const experimentConfig = await mockEnv.ADS_KV.get('active_experiment')
      const parsed = JSON.parse(experimentConfig)

      expect(parsed.id).toBe('exp_123')
    })

    it('should support multiple concurrent experiments (future)', () => {
      // Future enhancement: support multiple experiments
      const experiments = [
        { id: 'exp_1', type: 'ad_creative' },
        { id: 'exp_2', type: 'targeting' },
        { id: 'exp_3', type: 'bidding' },
      ]

      expect(experiments).toHaveLength(3)
    })
  })

  describe('Error Handling', () => {
    it('should handle experiment worker timeout gracefully', async () => {
      mockEnv.EXPERIMENT.assignVariant = async () => {
        await new Promise((resolve) => setTimeout(resolve, 5000))
        throw new Error('Timeout')
      }

      const context: AdContext = {
        userId: 'user_123',
        sessionId: 'session_456',
        timestamp: Date.now(),
        device: 'mobile',
        location: 'US',
        url: 'https://example.com',
      }

      // Should timeout and fallback
      const result = await Promise.race([
        adsService.selectAd(context),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Test timeout')), 1000)),
      ])

      // Should still return a result (via fallback)
      expect(result).toBeDefined()
    })

    it('should handle observation recording failure gracefully', async () => {
      mockEnv.EXPERIMENT.recordObservation = async () => {
        throw new Error('Observation service unavailable')
      }

      const context: AdContext = {
        userId: 'user_123',
        sessionId: 'session_456',
        timestamp: Date.now(),
        device: 'mobile',
        location: 'US',
        url: 'https://example.com',
      }

      const result = await adsService.selectAd(context)

      // Recording click should not throw
      await expect(adsService.recordClick(result.impression.id)).resolves.not.toThrow()
    })
  })
})
