/**
 * External Network Manager Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ExternalNetworkManager } from '../src/external'
import type { Ad } from '../src/types'

describe('ExternalNetworkManager', () => {
  let manager: ExternalNetworkManager
  let env: {
    ADS_DB: D1Database
    ADS_KV: KVNamespace
    GOOGLE_ADS?: any
    BING_ADS?: any
  }

  beforeEach(() => {
    env = {
      ADS_DB: {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({
            first: vi.fn(),
            all: vi.fn(),
            run: vi.fn(),
          })),
        })),
      } as any,
      ADS_KV: {
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      } as any,
      GOOGLE_ADS: {
        submitDisplayAd: vi.fn(),
        syncCampaignPerformance: vi.fn(),
      },
      BING_ADS: {
        createSearchCampaign: vi.fn(),
        syncCampaignPerformance: vi.fn(),
      },
    }

    manager = new ExternalNetworkManager(env)
  })

  describe('submitToGoogleNetwork', () => {
    it('should submit eligible ad to Google', async () => {
      const adId = 'ad-123'
      const userId = 'user-456'

      // Mock getAd
      vi.spyOn(manager as any, 'getAd').mockResolvedValue({
        id: adId,
        campaignId: 'campaign-123',
        creativeId: 'creative-123',
        status: 'active',
        bid: 5.0,
        dailyBudget: 100,
        qualityScore: 9,
        metrics: {
          impressions: 2000,
          clicks: 80,
          conversions: 10,
          spend: 50,
          revenue: 200,
          ctr: 0.04, // 4%
          cpc: 0.625,
          cvr: 0.125,
          roas: 4.0,
        },
        config: {
          name: 'Test Ad',
          imageUrl: 'https://example.com/image.jpg',
          width: 300,
          height: 250,
          altText: 'Test Ad',
        },
        targeting: {
          locations: ['US'],
          devices: ['mobile'],
        },
      })

      // Mock Google Ads response
      env.GOOGLE_ADS.submitDisplayAd = vi.fn().mockResolvedValue({
        externalAdId: 'google-ad-123',
        status: 'pending',
        submittedAt: new Date().toISOString(),
      })

      const dbRun = vi.fn()
      env.ADS_DB.prepare = vi.fn(() => ({
        bind: vi.fn(() => ({
          run: dbRun,
        })),
      })) as any

      const result = await manager.submitToGoogleNetwork(userId, adId, {
        bid: 6.0,
        budget: 200,
      })

      expect(result.network).toBe('google')
      expect(result.externalAdId).toBe('google-ad-123')
      expect(result.status).toBe('pending')
      expect(dbRun).toHaveBeenCalled()

      // Verify submission parameters
      expect(env.GOOGLE_ADS.submitDisplayAd).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          internalAdId: adId,
          creative: expect.objectContaining({
            imageUrl: 'https://example.com/image.jpg',
            width: 300,
            height: 250,
          }),
          bid: 6.0, // Override bid
          dailyBudget: 200, // Override budget
        })
      )
    })

    it('should throw error if ad not eligible', async () => {
      const adId = 'ad-low-quality'

      // Mock low-quality ad
      vi.spyOn(manager as any, 'getAd').mockResolvedValue({
        id: adId,
        status: 'active',
        qualityScore: 5, // Too low (< 8)
        metrics: {
          impressions: 2000,
          clicks: 40,
          conversions: 2,
          spend: 50,
          revenue: 80,
          ctr: 0.02, // 2% - too low
          roas: 1.6, // Too low (< 2.0)
        },
      })

      await expect(manager.submitToGoogleNetwork('user-123', adId)).rejects.toThrow('Ad not eligible for promotion')
    })

    it('should throw error if Google Ads not available', async () => {
      env.GOOGLE_ADS = undefined
      const manager2 = new ExternalNetworkManager(env)

      await expect(manager2.submitToGoogleNetwork('user-123', 'ad-123')).rejects.toThrow(
        'Google Ads integration not available'
      )
    })

    it('should apply default budget multipliers', async () => {
      const adId = 'ad-123'

      vi.spyOn(manager as any, 'getAd').mockResolvedValue({
        id: adId,
        status: 'active',
        bid: 5.0,
        dailyBudget: 100,
        qualityScore: 9,
        metrics: {
          impressions: 2000,
          ctr: 0.04,
          roas: 3.0,
        },
        config: {
          imageUrl: 'https://example.com/image.jpg',
          width: 300,
          height: 250,
        },
      })

      env.GOOGLE_ADS.submitDisplayAd = vi.fn().mockResolvedValue({
        externalAdId: 'google-123',
        status: 'pending',
        submittedAt: new Date().toISOString(),
      })

      env.ADS_DB.prepare = vi.fn(() => ({
        bind: vi.fn(() => ({
          run: vi.fn(),
        })),
      })) as any

      await manager.submitToGoogleNetwork('user-123', adId)

      // Should use 1.2x bid multiplier and 2x budget multiplier
      expect(env.GOOGLE_ADS.submitDisplayAd).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          bid: 6.0, // 5.0 * 1.2
          dailyBudget: 200, // 100 * 2
        })
      )
    })
  })

  describe('submitToBingNetwork', () => {
    it('should submit eligible ad to Bing', async () => {
      const adId = 'ad-456'

      vi.spyOn(manager as any, 'getAd').mockResolvedValue({
        id: adId,
        status: 'active',
        dailyBudget: 100,
        qualityScore: 9,
        metrics: {
          impressions: 2000,
          ctr: 0.04,
          roas: 3.0,
        },
        targeting: {
          locations: ['US'],
        },
      })

      env.BING_ADS.createSearchCampaign = vi.fn().mockResolvedValue({
        externalCampaignId: 'bing-campaign-123',
        status: 'active',
      })

      const dbRun = vi.fn()
      env.ADS_DB.prepare = vi.fn(() => ({
        bind: vi.fn(() => ({
          run: dbRun,
        })),
      })) as any

      const result = await manager.submitToBingNetwork('user-123', adId)

      expect(result.network).toBe('bing')
      expect(result.externalAdId).toBe('bing-campaign-123')
      expect(result.status).toBe('pending')
      expect(dbRun).toHaveBeenCalled()
    })

    it('should throw error if Bing Ads not available', async () => {
      env.BING_ADS = undefined
      const manager2 = new ExternalNetworkManager(env)

      await expect(manager2.submitToBingNetwork('user-123', 'ad-123')).rejects.toThrow('Bing Ads integration not available')
    })
  })

  describe('evaluateForPromotion', () => {
    it('should approve high-quality ad', async () => {
      const adId = 'ad-high-quality'

      vi.spyOn(manager as any, 'getAd').mockResolvedValue({
        id: adId,
        status: 'active',
        qualityScore: 9,
        metrics: {
          impressions: 5000,
          clicks: 200,
          conversions: 40,
          spend: 100,
          revenue: 400,
          ctr: 0.04, // 4%
          roas: 4.0,
        },
      })

      const result = await manager.evaluateForPromotion(adId)

      expect(result.eligible).toBe(true)
      expect(result.reasons).toContain('Ad meets all promotion criteria')
      expect(result.qualityScore).toBe(9)
      expect(result.ctr).toBe(0.04)
      expect(result.roas).toBe(4.0)
    })

    it('should reject ad with low quality score', async () => {
      vi.spyOn(manager as any, 'getAd').mockResolvedValue({
        id: 'ad-123',
        status: 'active',
        qualityScore: 6, // < 8
        metrics: {
          impressions: 2000,
          ctr: 0.04,
          roas: 3.0,
        },
      })

      const result = await manager.evaluateForPromotion('ad-123')

      expect(result.eligible).toBe(false)
      expect(result.reasons).toContain('Quality score too low: 6 (minimum 8)')
    })

    it('should reject ad with low CTR', async () => {
      vi.spyOn(manager as any, 'getAd').mockResolvedValue({
        id: 'ad-123',
        status: 'active',
        qualityScore: 9,
        metrics: {
          impressions: 2000,
          ctr: 0.02, // 2% < 3%
          roas: 3.0,
        },
      })

      const result = await manager.evaluateForPromotion('ad-123')

      expect(result.eligible).toBe(false)
      expect(result.reasons).toContain('CTR too low: 2.00% (minimum 3%)')
    })

    it('should reject ad with low ROAS', async () => {
      vi.spyOn(manager as any, 'getAd').mockResolvedValue({
        id: 'ad-123',
        status: 'active',
        qualityScore: 9,
        metrics: {
          impressions: 2000,
          ctr: 0.04,
          roas: 1.5, // < 2.0
        },
      })

      const result = await manager.evaluateForPromotion('ad-123')

      expect(result.eligible).toBe(false)
      expect(result.reasons).toContain('ROAS too low: 1.50 (minimum 2.0)')
    })

    it('should reject ad with insufficient data', async () => {
      vi.spyOn(manager as any, 'getAd').mockResolvedValue({
        id: 'ad-123',
        status: 'active',
        qualityScore: 9,
        metrics: {
          impressions: 500, // < 1000
          ctr: 0.04,
          roas: 3.0,
        },
      })

      const result = await manager.evaluateForPromotion('ad-123')

      expect(result.eligible).toBe(false)
      expect(result.reasons).toContain('Insufficient data: 500 impressions (minimum 1000)')
    })

    it('should reject inactive ad', async () => {
      vi.spyOn(manager as any, 'getAd').mockResolvedValue({
        id: 'ad-123',
        status: 'paused',
        qualityScore: 9,
        metrics: {
          impressions: 2000,
          ctr: 0.04,
          roas: 3.0,
        },
      })

      const result = await manager.evaluateForPromotion('ad-123')

      expect(result.eligible).toBe(false)
      expect(result.reasons).toContain('Ad not active: paused')
    })

    it('should return not eligible if ad not found', async () => {
      vi.spyOn(manager as any, 'getAd').mockResolvedValue(null)

      const result = await manager.evaluateForPromotion('non-existent')

      expect(result.eligible).toBe(false)
      expect(result.reasons).toContain('Ad not found')
    })
  })

  describe('promoteBestPerformers', () => {
    it('should promote top eligible ads', async () => {
      // Mock database query
      env.ADS_DB.prepare = vi.fn(() => ({
        bind: vi.fn(() => ({
          all: vi.fn().mockResolvedValue({
            results: [
              { id: 'ad-1', quality_score: 10, daily_budget: 100, bid: 5 },
              { id: 'ad-2', quality_score: 9, daily_budget: 80, bid: 4 },
              { id: 'ad-3', quality_score: 8, daily_budget: 60, bid: 3 },
            ],
          }),
        })),
      })) as any

      // Mock eligibility checks
      let callCount = 0
      vi.spyOn(manager as any, 'evaluateForPromotion').mockImplementation(async () => {
        callCount++
        return {
          eligible: true,
          reasons: ['Ad meets all promotion criteria'],
          qualityScore: 9,
          ctr: 0.04,
          roas: 3.0,
        }
      })

      // Mock getExternalAdStatus (not yet submitted)
      vi.spyOn(manager as any, 'getExternalAdStatus').mockResolvedValue(null)

      // Mock submission
      vi.spyOn(manager, 'submitToGoogleNetwork').mockImplementation(async (_userId: string, adId: string) => ({
        id: crypto.randomUUID(),
        adId,
        network: 'google' as const,
        externalAdId: `google-${adId}`,
        status: 'pending' as const,
        submittedAt: new Date().toISOString(),
      }))

      const results = await manager.promoteBestPerformers('user-123', 2)

      expect(results.length).toBe(2)
      expect(results[0].network).toBe('google')
      expect(results[1].network).toBe('google')
    })

    it('should skip already submitted ads', async () => {
      env.ADS_DB.prepare = vi.fn(() => ({
        bind: vi.fn(() => ({
          all: vi.fn().mockResolvedValue({
            results: [
              { id: 'ad-1', quality_score: 10 },
              { id: 'ad-2', quality_score: 9 },
            ],
          }),
        })),
      })) as any

      // Mock first ad already submitted
      vi.spyOn(manager as any, 'getExternalAdStatus').mockImplementation(async (adId: string) => {
        if (adId === 'ad-1') {
          return { id: '123', adId, network: 'google', externalAdId: 'google-ad-1', status: 'running' }
        }
        return null
      })

      vi.spyOn(manager as any, 'evaluateForPromotion').mockResolvedValue({
        eligible: true,
        reasons: ['Eligible'],
        qualityScore: 9,
        ctr: 0.04,
        roas: 3.0,
      })

      vi.spyOn(manager, 'submitToGoogleNetwork').mockResolvedValue({
        id: '456',
        adId: 'ad-2',
        network: 'google',
        externalAdId: 'google-ad-2',
        status: 'pending',
        submittedAt: new Date().toISOString(),
      })

      const results = await manager.promoteBestPerformers('user-123', 2)

      // Should only submit ad-2
      expect(results.length).toBe(1)
      expect(results[0].adId).toBe('ad-2')
    })

    it('should skip ineligible ads', async () => {
      env.ADS_DB.prepare = vi.fn(() => ({
        bind: vi.fn(() => ({
          all: vi.fn().mockResolvedValue({
            results: [
              { id: 'ad-1', quality_score: 10 },
              { id: 'ad-2', quality_score: 6 }, // Low quality
            ],
          }),
        })),
      })) as any

      vi.spyOn(manager as any, 'getExternalAdStatus').mockResolvedValue(null)

      // Mock first ad eligible, second ineligible
      vi.spyOn(manager as any, 'evaluateForPromotion').mockImplementation(async (adId: string) => {
        if (adId === 'ad-1') {
          return { eligible: true, reasons: ['Eligible'], qualityScore: 10, ctr: 0.04, roas: 3.0 }
        }
        return { eligible: false, reasons: ['Low quality'], qualityScore: 6, ctr: 0.02, roas: 1.5 }
      })

      vi.spyOn(manager, 'submitToGoogleNetwork').mockResolvedValue({
        id: '123',
        adId: 'ad-1',
        network: 'google',
        externalAdId: 'google-ad-1',
        status: 'pending',
        submittedAt: new Date().toISOString(),
      })

      const results = await manager.promoteBestPerformers('user-123', 2)

      // Should only submit ad-1
      expect(results.length).toBe(1)
      expect(results[0].adId).toBe('ad-1')
    })

    it('should handle submission errors gracefully', async () => {
      env.ADS_DB.prepare = vi.fn(() => ({
        bind: vi.fn(() => ({
          all: vi.fn().mockResolvedValue({
            results: [{ id: 'ad-1', quality_score: 10 }],
          }),
        })),
      })) as any

      vi.spyOn(manager as any, 'getExternalAdStatus').mockResolvedValue(null)
      vi.spyOn(manager as any, 'evaluateForPromotion').mockResolvedValue({
        eligible: true,
        reasons: ['Eligible'],
        qualityScore: 10,
        ctr: 0.04,
        roas: 3.0,
      })

      // Mock submission failure
      vi.spyOn(manager, 'submitToGoogleNetwork').mockRejectedValue(new Error('API Error'))

      const results = await manager.promoteBestPerformers('user-123', 1)

      // Should return empty array (error caught and logged)
      expect(results.length).toBe(0)
    })
  })

  describe('syncExternalPerformance', () => {
    it('should sync from both Google and Bing', async () => {
      const adId = 'ad-123'

      // Mock submissions
      env.ADS_DB.prepare = vi.fn(() => ({
        bind: vi.fn(() => ({
          all: vi.fn().mockResolvedValue({
            results: [
              { network: 'google', external_ad_id: 'google-ad-123' },
              { network: 'bing', external_ad_id: 'bing-campaign-456' },
            ],
          }),
        })),
      })) as any

      // Mock performance sync
      env.GOOGLE_ADS.syncCampaignPerformance = vi.fn().mockResolvedValue({
        impressions: 1000,
        clicks: 50,
        conversions: 5,
        spend: 25,
        revenue: 100,
      })

      env.BING_ADS.syncCampaignPerformance = vi.fn().mockResolvedValue({
        impressions: 800,
        clicks: 40,
        conversions: 4,
        spend: 20,
        revenue: 80,
      })

      vi.spyOn(manager as any, 'storeExternalMetrics').mockResolvedValue(undefined)

      await manager.syncExternalPerformance(adId)

      expect(env.GOOGLE_ADS.syncCampaignPerformance).toHaveBeenCalledWith('default', 'google-ad-123')
      expect(env.BING_ADS.syncCampaignPerformance).toHaveBeenCalledWith('default', 'bing-campaign-456')
    })

    it('should handle sync errors gracefully', async () => {
      env.ADS_DB.prepare = vi.fn(() => ({
        bind: vi.fn(() => ({
          all: vi.fn().mockResolvedValue({
            results: [{ network: 'google', external_ad_id: 'google-123' }],
          }),
        })),
      })) as any

      // Mock sync failure
      env.GOOGLE_ADS.syncCampaignPerformance = vi.fn().mockRejectedValue(new Error('Sync failed'))

      // Should not throw
      await expect(manager.syncExternalPerformance('ad-123')).resolves.not.toThrow()
    })
  })

  describe('getExternalAdStatus', () => {
    it('should return submission status', async () => {
      const adId = 'ad-123'
      const network = 'google'

      env.ADS_DB.prepare = vi.fn(() => ({
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue({
            id: 'submission-123',
            ad_id: adId,
            network,
            external_ad_id: 'google-ad-123',
            status: 'running',
            submitted_at: '2025-10-01T00:00:00.000Z',
            approved_at: '2025-10-02T00:00:00.000Z',
            rejection_reason: null,
          }),
        })),
      })) as any

      const result = await manager.getExternalAdStatus(adId, network)

      expect(result).toBeDefined()
      expect(result?.network).toBe('google')
      expect(result?.status).toBe('running')
      expect(result?.externalAdId).toBe('google-ad-123')
    })

    it('should return null if not found', async () => {
      env.ADS_DB.prepare = vi.fn(() => ({
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(null),
        })),
      })) as any

      const result = await manager.getExternalAdStatus('ad-123', 'google')

      expect(result).toBeNull()
    })
  })
})
