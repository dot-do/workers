/**
 * Ads Campaign Manager Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AdsCampaignService } from '../src/index'
import type { Env } from '../src/index'
import type { AdPlatform, CampaignConfig, CampaignStatus, CampaignObjective, BidStrategy, BudgetType, BudgetPacing } from '@dot-do/ads-types'

describe('AdsCampaignService', () => {
  let service: AdsCampaignService
  let mockEnv: Env

  beforeEach(() => {
    // Mock environment
    mockEnv = {
      CAMPAIGNS_KV: {
        get: vi.fn().mockResolvedValue(null),
        put: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      } as any,
      DB: {
        prepare: vi.fn(() => ({
          bind: vi.fn().mockReturnThis(),
          run: vi.fn().mockResolvedValue({ success: true }),
          first: vi.fn().mockResolvedValue(null),
        })),
      } as any,
      CAMPAIGN_QUEUE: {
        send: vi.fn().mockResolvedValue(undefined),
      } as any,
      ANALYTICS: {
        writeDataPoint: vi.fn(),
      } as any,
    }

    service = new AdsCampaignService({} as any, mockEnv)
  })

  describe('Campaign CRUD', () => {
    it('should create a campaign', async () => {
      const config: CampaignConfig = {
        platform: 'google_ads' as AdPlatform,
        name: 'Test Campaign',
        status: 'active' as CampaignStatus,
        objective: 'conversions' as CampaignObjective,
        budget: {
          amount: 1000,
          currency: 'USD',
          type: 'daily' as BudgetType,
          pacing: 'standard' as BudgetPacing,
        },
        bidStrategy: 'target_cpa' as BidStrategy,
        targetCPA: 25,
        targeting: {
          locations: ['US'],
          ageMin: 25,
          ageMax: 54,
        },
        startDate: '2025-01-01',
      }

      const campaign = await service.createCampaign('google_ads' as AdPlatform, config)

      expect(campaign).toBeDefined()
      expect(campaign.id).toBeDefined()
      expect(campaign.config.name).toBe('Test Campaign')
      expect(campaign.config.platform).toBe('google_ads')
      expect(campaign.config.status).toBe('active')
      expect(campaign.config.objective).toBe('conversions')
      expect(mockEnv.DB.prepare).toHaveBeenCalled()
      expect(mockEnv.CAMPAIGNS_KV.put).toHaveBeenCalled()
      expect(mockEnv.ANALYTICS.writeDataPoint).toHaveBeenCalled()
      expect(mockEnv.CAMPAIGN_QUEUE.send).toHaveBeenCalled()
    })

    it('should update a campaign', async () => {
      const campaignId = 'test-campaign-id'
      const existingCampaign = {
        id: campaignId,
        config: {
          platform: 'google_ads' as AdPlatform,
          name: 'Old Name',
          status: 'active' as CampaignStatus,
          objective: 'conversions' as CampaignObjective,
          budget: { amount: 1000, currency: 'USD', type: 'daily' as BudgetType, pacing: 'standard' as BudgetPacing },
          bidStrategy: 'target_cpa' as BidStrategy,
          targeting: {},
          startDate: '2025-01-01',
        },
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      }

      // Mock getCampaign to return existing campaign
      mockEnv.CAMPAIGNS_KV.get = vi.fn().mockResolvedValue(JSON.stringify(existingCampaign))

      const updates = { name: 'New Name', status: 'paused' as CampaignStatus }
      const updatedCampaign = await service.updateCampaign(campaignId, updates)

      expect(updatedCampaign.config.name).toBe('New Name')
      expect(updatedCampaign.config.status).toBe('paused')
      expect(mockEnv.DB.prepare).toHaveBeenCalled()
      expect(mockEnv.CAMPAIGNS_KV.put).toHaveBeenCalled()
    })

    it('should pause a campaign', async () => {
      const campaignId = 'test-campaign-id'
      const existingCampaign = {
        id: campaignId,
        config: {
          platform: 'google_ads' as AdPlatform,
          name: 'Test Campaign',
          status: 'active' as CampaignStatus,
          objective: 'conversions' as CampaignObjective,
          budget: { amount: 1000, currency: 'USD', type: 'daily' as BudgetType, pacing: 'standard' as BudgetPacing },
          bidStrategy: 'target_cpa' as BidStrategy,
          targeting: {},
          startDate: '2025-01-01',
        },
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      }

      mockEnv.CAMPAIGNS_KV.get = vi.fn().mockResolvedValue(JSON.stringify(existingCampaign))

      await service.pauseCampaign(campaignId)

      expect(mockEnv.DB.prepare).toHaveBeenCalled()
      expect(mockEnv.CAMPAIGNS_KV.put).toHaveBeenCalled()
    })

    it('should delete a campaign', async () => {
      const campaignId = 'test-campaign-id'
      const existingCampaign = {
        id: campaignId,
        config: {
          platform: 'google_ads' as AdPlatform,
          name: 'Test Campaign',
          status: 'active' as CampaignStatus,
          objective: 'conversions' as CampaignObjective,
          budget: { amount: 1000, currency: 'USD', type: 'daily' as BudgetType, pacing: 'standard' as BudgetPacing },
          bidStrategy: 'target_cpa' as BidStrategy,
          targeting: {},
          startDate: '2025-01-01',
        },
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      }

      mockEnv.CAMPAIGNS_KV.get = vi.fn().mockResolvedValue(JSON.stringify(existingCampaign))

      await service.deleteCampaign(campaignId)

      expect(mockEnv.DB.prepare).toHaveBeenCalled()
      expect(mockEnv.CAMPAIGNS_KV.delete).toHaveBeenCalledWith(`campaign:${campaignId}`)
      expect(mockEnv.ANALYTICS.writeDataPoint).toHaveBeenCalled()
    })
  })

  describe('Campaign Optimization', () => {
    it('should optimize bids for target CPA', async () => {
      const campaignId = 'test-campaign-id'
      const campaign = {
        id: campaignId,
        config: {
          platform: 'google_ads' as AdPlatform,
          name: 'Test Campaign',
          status: 'active' as CampaignStatus,
          objective: 'conversions' as CampaignObjective,
          budget: { amount: 1000, currency: 'USD', type: 'daily' as BudgetType, pacing: 'standard' as BudgetPacing },
          bidStrategy: 'target_cpa' as BidStrategy,
          targetCPA: 25,
          targeting: {},
          startDate: '2025-01-01',
        },
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      }

      mockEnv.CAMPAIGNS_KV.get = vi.fn().mockResolvedValue(JSON.stringify(campaign))

      const optimization = await service.optimizeBids(campaignId, 'target_cpa' as BidStrategy)

      expect(optimization).toBeDefined()
      expect(optimization.campaignId).toBe(campaignId)
      expect(optimization.strategy).toBe('target_cpa')
      expect(optimization.newBid).toBeDefined()
      expect(optimization.expectedImpact).toBeDefined()
    })

    it('should get campaign recommendations', async () => {
      const campaignId = 'test-campaign-id'
      const campaign = {
        id: campaignId,
        config: {
          platform: 'google_ads' as AdPlatform,
          name: 'Test Campaign',
          status: 'active' as CampaignStatus,
          objective: 'conversions' as CampaignObjective,
          budget: { amount: 100, currency: 'USD', type: 'daily' as BudgetType, pacing: 'standard' as BudgetPacing },
          bidStrategy: 'target_cpa' as BidStrategy,
          targetCPA: 25,
          targetROAS: 3.0,
          targeting: {},
          startDate: '2025-01-01',
        },
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      }

      mockEnv.CAMPAIGNS_KV.get = vi.fn().mockResolvedValue(JSON.stringify(campaign))

      const recommendations = await service.getCampaignRecommendations(campaignId)

      expect(recommendations).toBeDefined()
      expect(Array.isArray(recommendations)).toBe(true)
      // Recommendations may be empty or contain items based on mock metrics
    })
  })

  describe('Bulk Operations', () => {
    it('should bulk create campaigns', async () => {
      const configs: CampaignConfig[] = [
        {
          platform: 'google_ads' as AdPlatform,
          name: 'Campaign 1',
          status: 'active' as CampaignStatus,
          objective: 'conversions' as CampaignObjective,
          budget: { amount: 1000, currency: 'USD', type: 'daily' as BudgetType, pacing: 'standard' as BudgetPacing },
          bidStrategy: 'target_cpa' as BidStrategy,
          targeting: {},
          startDate: '2025-01-01',
        },
        {
          platform: 'meta_ads' as AdPlatform,
          name: 'Campaign 2',
          status: 'active' as CampaignStatus,
          objective: 'brand_awareness' as CampaignObjective,
          budget: { amount: 500, currency: 'USD', type: 'daily' as BudgetType, pacing: 'standard' as BudgetPacing },
          bidStrategy: 'maximize_clicks' as BidStrategy,
          targeting: {},
          startDate: '2025-01-01',
        },
      ]

      const campaigns = await service.bulkCreateCampaigns(configs)

      expect(campaigns).toBeDefined()
      expect(campaigns.length).toBeGreaterThan(0)
      expect(mockEnv.DB.prepare).toHaveBeenCalled()
    })

    it('should bulk pause campaigns', async () => {
      const campaignIds = ['campaign-1', 'campaign-2', 'campaign-3']

      // Mock getCampaign for each ID
      mockEnv.CAMPAIGNS_KV.get = vi.fn().mockImplementation((key: string) => {
        const id = key.replace('campaign:', '')
        return Promise.resolve(
          JSON.stringify({
            id,
            config: {
              platform: 'google_ads',
              name: `Campaign ${id}`,
              status: 'active',
              objective: 'conversions',
              budget: { amount: 1000, currency: 'USD', type: 'daily', pacing: 'standard' },
              bidStrategy: 'target_cpa',
              targeting: {},
              startDate: '2025-01-01',
            },
            createdAt: '2025-01-01',
            updatedAt: '2025-01-01',
          })
        )
      })

      await service.bulkPauseCampaigns(campaignIds)

      expect(mockEnv.DB.prepare).toHaveBeenCalled()
    })
  })

  describe('Campaign Metrics', () => {
    it('should get campaign metrics', async () => {
      const campaignId = 'test-campaign-id'
      const campaign = {
        id: campaignId,
        config: {
          platform: 'google_ads' as AdPlatform,
          name: 'Test Campaign',
          status: 'active' as CampaignStatus,
          objective: 'conversions' as CampaignObjective,
          budget: { amount: 1000, currency: 'USD', type: 'daily' as BudgetType, pacing: 'standard' as BudgetPacing },
          bidStrategy: 'target_cpa' as BidStrategy,
          targeting: {},
          startDate: '2025-01-01',
        },
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      }

      mockEnv.CAMPAIGNS_KV.get = vi.fn().mockResolvedValue(JSON.stringify(campaign))

      const metrics = await service.getCampaignMetrics(campaignId, {
        from: '2025-01-01',
        to: '2025-01-31',
      })

      expect(metrics).toBeDefined()
      expect(metrics.impressions).toBeGreaterThan(0)
      expect(metrics.clicks).toBeGreaterThan(0)
      expect(metrics.spend).toBeGreaterThan(0)
      expect(metrics.ctr).toBeGreaterThan(0)
      expect(metrics.roas).toBeGreaterThan(0)
    })

    it('should cache metrics', async () => {
      const campaignId = 'test-campaign-id'
      const campaign = {
        id: campaignId,
        config: {
          platform: 'google_ads' as AdPlatform,
          name: 'Test Campaign',
          status: 'active' as CampaignStatus,
          objective: 'conversions' as CampaignObjective,
          budget: { amount: 1000, currency: 'USD', type: 'daily' as BudgetType, pacing: 'standard' as BudgetPacing },
          bidStrategy: 'target_cpa' as BidStrategy,
          targeting: {},
          startDate: '2025-01-01',
        },
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      }

      mockEnv.CAMPAIGNS_KV.get = vi.fn().mockResolvedValue(JSON.stringify(campaign))

      await service.getCampaignMetrics(campaignId, {
        from: '2025-01-01',
        to: '2025-01-31',
      })

      // Verify cache was written to
      expect(mockEnv.CAMPAIGNS_KV.put).toHaveBeenCalled()
    })
  })
})
