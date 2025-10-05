/**
 * Google Ads Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GoogleAdsService } from '../src/index'
import type { Env } from '../src/index'

describe('GoogleAdsService', () => {
  let service: GoogleAdsService
  let env: Env

  beforeEach(() => {
    env = {
      GOOGLE_ADS_KV: {
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      } as any,
      GOOGLE_ADS_DB: {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({
            first: vi.fn(),
            all: vi.fn(),
            run: vi.fn(),
          })),
        })),
      } as any,
      GOOGLE_ADS_QUEUE: {} as any,
      GOOGLE_ADS_ANALYTICS: {
        writeDataPoint: vi.fn(),
      } as any,
      DB: {} as any,
      AUTH: {} as any,
      ANALYTICS: {} as any,
    }

    service = new GoogleAdsService({} as any, env)
  })

  describe('getAuthorizationUrl', () => {
    it('should return authorization URL', async () => {
      const url = await service.getAuthorizationUrl('user-123')

      expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth')
      expect(url).toContain('client_id=')
      expect(url).toContain('scope=')
      expect(url).toContain('state=')
    })

    it('should include user ID in state', async () => {
      const url = await service.getAuthorizationUrl('user-456')

      expect(url).toContain('state=')
      // State should be extractable and verifiable
      const stateMatch = url.match(/state=([^&]+)/)
      expect(stateMatch).toBeTruthy()
    })
  })

  describe('submitDisplayAd', () => {
    it('should validate display ad submission', async () => {
      const submission = {
        internalAdId: 'ad-123',
        creative: {
          imageUrl: 'https://example.com/image.jpg',
          width: 300,
          height: 250,
          altText: 'Test Ad',
        },
        targeting: {
          locations: ['US'],
          devices: ['mobile' as const],
        },
        bid: 2.5,
        dailyBudget: 100,
      }

      // Mock getValidAccessToken
      vi.spyOn(service as any, 'getValidAccessToken').mockResolvedValue('valid-token')

      // Mock external API call
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          externalAdId: 'google-ad-123',
          status: 'pending',
          submittedAt: new Date().toISOString(),
        }),
      })

      const result = await service.submitDisplayAd('user-123', submission)

      expect(result.externalAdId).toBe('google-ad-123')
      expect(result.status).toBe('pending')
      expect(result.internalAdId).toBe('ad-123')
    })

    it('should throw error if no access token', async () => {
      vi.spyOn(service as any, 'getValidAccessToken').mockRejectedValue(new Error('No access token'))

      const submission = {
        internalAdId: 'ad-123',
        creative: {
          imageUrl: 'https://example.com/image.jpg',
          width: 300,
          height: 250,
          altText: 'Test',
        },
        bid: 2.5,
      }

      await expect(service.submitDisplayAd('user-123', submission)).rejects.toThrow()
    })
  })

  describe('createSearchCampaign', () => {
    it('should create search campaign with valid config', async () => {
      const config = {
        name: 'Test Campaign',
        dailyBudget: 100,
        bidStrategy: 'manual_cpc' as const,
        targeting: {
          locations: ['US', 'CA'],
          languages: ['en'],
        },
      }

      vi.spyOn(service as any, 'getValidAccessToken').mockResolvedValue('valid-token')
      vi.spyOn(service as any, 'getCustomerId').mockResolvedValue('customer-123')

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            {
              resourceName: 'customers/123/campaigns/456',
              campaign: {
                id: '456',
                name: 'Test Campaign',
                status: 'ENABLED',
              },
            },
          ],
        }),
      })

      const result = await service.createSearchCampaign('user-123', config)

      expect(result.name).toBe('Test Campaign')
      expect(result.status).toBe('enabled')
      expect(result.dailyBudget).toBe(100)
    })

    it('should validate campaign budget', async () => {
      const config = {
        name: 'Test',
        dailyBudget: -10, // Invalid negative budget
        bidStrategy: 'manual_cpc' as const,
      }

      // Should validate before making API call
      await expect(service.createSearchCampaign('user-123', config)).rejects.toThrow()
    })
  })

  describe('createSearchAd', () => {
    it('should create search ad with headlines and keywords', async () => {
      const config = {
        campaignId: 'campaign-123',
        headline1: 'Buy Now',
        headline2: 'Save 50%',
        description1: 'Limited time offer',
        displayUrl: 'example.com/sale',
        finalUrl: 'https://example.com/sale',
        keywords: [
          { keyword: 'shoes', matchType: 'exact' as const, bid: 2.5 },
          { keyword: 'sneakers', matchType: 'phrase' as const, bid: 2.0 },
        ],
      }

      vi.spyOn(service as any, 'getValidAccessToken').mockResolvedValue('valid-token')
      vi.spyOn(service as any, 'getCustomerId').mockResolvedValue('customer-123')

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            {
              resourceName: 'customers/123/adGroups/789',
              adGroup: { id: '789' },
            },
          ],
        }),
      })

      const result = await service.createSearchAd('user-123', config)

      expect(result.headline1).toBe('Buy Now')
      expect(result.headline2).toBe('Save 50%')
      expect(result.keywords.length).toBe(2)
    })

    it('should validate headline length', async () => {
      const config = {
        campaignId: 'campaign-123',
        headline1: 'A'.repeat(40), // Too long (max 30)
        headline2: 'Test',
        description1: 'Description',
        displayUrl: 'example.com',
        finalUrl: 'https://example.com',
        keywords: [],
      }

      await expect(service.createSearchAd('user-123', config)).rejects.toThrow()
    })

    it('should validate description length', async () => {
      const config = {
        campaignId: 'campaign-123',
        headline1: 'Test',
        headline2: 'Test',
        description1: 'A'.repeat(100), // Too long (max 90)
        displayUrl: 'example.com',
        finalUrl: 'https://example.com',
        keywords: [],
      }

      await expect(service.createSearchAd('user-123', config)).rejects.toThrow()
    })
  })

  describe('syncCampaignPerformance', () => {
    it('should sync performance metrics from Google Ads', async () => {
      vi.spyOn(service as any, 'getValidAccessToken').mockResolvedValue('valid-token')
      vi.spyOn(service as any, 'getCustomerId').mockResolvedValue('customer-123')

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            {
              campaign: { id: 'campaign-123' },
              metrics: {
                impressions: '10000',
                clicks: '500',
                conversions: '50',
                costMicros: '250000000', // $250
                conversionValueMicros: '1000000000', // $1000
              },
            },
          ],
        }),
      })

      const result = await service.syncCampaignPerformance('user-123', 'campaign-123')

      expect(result.impressions).toBe(10000)
      expect(result.clicks).toBe(500)
      expect(result.conversions).toBe(50)
      expect(result.spend).toBe(250)
      expect(result.revenue).toBe(1000)
    })

    it('should store synced metrics in database', async () => {
      vi.spyOn(service as any, 'getValidAccessToken').mockResolvedValue('valid-token')
      vi.spyOn(service as any, 'getCustomerId').mockResolvedValue('customer-123')

      const dbRun = vi.fn()
      env.GOOGLE_ADS_DB.prepare = vi.fn(() => ({
        bind: vi.fn(() => ({
          run: dbRun,
        })),
      })) as any

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            {
              campaign: { id: 'campaign-123' },
              metrics: {
                impressions: '1000',
                clicks: '50',
                conversions: '5',
                costMicros: '10000000',
                conversionValueMicros: '50000000',
              },
            },
          ],
        }),
      })

      await service.syncCampaignPerformance('user-123', 'campaign-123')

      expect(dbRun).toHaveBeenCalled()
    })
  })

  describe('token management', () => {
    it('should cache valid tokens in KV', async () => {
      const tokens = {
        accessToken: 'access-123',
        refreshToken: 'refresh-123',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        scope: 'scope',
      }

      await (service as any).storeTokens('user-123', tokens)

      expect(env.GOOGLE_ADS_KV.put).toHaveBeenCalledWith(
        'oauth:tokens:user-123',
        expect.any(String),
        expect.objectContaining({ expirationTtl: 3600 })
      )
    })

    it('should refresh expired tokens automatically', async () => {
      const expiredTokens = {
        accessToken: 'old-access',
        refreshToken: 'refresh-123',
        expiresAt: new Date(Date.now() - 1000).toISOString(), // Expired
        scope: 'scope',
      }

      // Mock KV get returns expired token
      env.GOOGLE_ADS_KV.get = vi.fn().mockResolvedValue(JSON.stringify(expiredTokens))

      // Mock D1 get
      env.GOOGLE_ADS_DB.prepare = vi.fn(() => ({
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue({
            access_token: 'old-access',
            refresh_token: 'refresh-123',
            expires_at: expiredTokens.expiresAt,
            scope: 'scope',
          }),
        })),
      })) as any

      // Mock token refresh
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'new-access',
          refresh_token: 'new-refresh',
          expires_in: 3600,
          scope: 'scope',
        }),
      })

      const token = await (service as any).getValidAccessToken('user-123')

      expect(token).toBe('new-access')
      expect(global.fetch).toHaveBeenCalled()
    })

    it('should use cached token if not expired', async () => {
      const validTokens = {
        accessToken: 'valid-access',
        refreshToken: 'refresh-123',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        scope: 'scope',
      }

      env.GOOGLE_ADS_KV.get = vi.fn().mockResolvedValue(JSON.stringify(validTokens))

      const token = await (service as any).getValidAccessToken('user-123')

      expect(token).toBe('valid-access')
      // Should not query D1 or refresh
      expect(env.GOOGLE_ADS_DB.prepare).not.toHaveBeenCalled()
    })
  })
})
