/**
 * Bing Ads Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BingAdsService } from '../src/index'
import type { Env } from '../src/index'
import type { SearchCampaignConfig, SearchAdConfig } from '../src/types'

describe('BingAdsService', () => {
  let service: BingAdsService
  let env: Env

  beforeEach(() => {
    env = {
      BING_ADS_KV: {
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      } as any,
      BING_ADS_DB: {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({
            first: vi.fn(),
            all: vi.fn(),
            run: vi.fn(),
          })),
        })),
      } as any,
      BING_ADS_QUEUE: {} as any,
      DB: {} as any,
      AUTH: {} as any,
      ANALYTICS: {} as any,
      BING_ADS_CLIENT_ID: 'test-client-id',
      BING_ADS_CLIENT_SECRET: 'test-client-secret',
      BING_ADS_REDIRECT_URI: 'https://example.com/callback',
      BING_ADS_DEVELOPER_TOKEN: 'test-dev-token',
      BING_ADS_TENANT: 'common',
      ENVIRONMENT: 'test',
      LOG_LEVEL: 'info',
    }

    service = new BingAdsService({} as any, env)
  })

  describe('getAuthorizationUrl', () => {
    it('should generate authorization URL with MFA scope', async () => {
      const url = await service.getAuthorizationUrl('user-123')

      expect(url).toContain('https://login.microsoftonline.com/common/oauth2/v2.0/authorize')
      expect(url).toContain('client_id=test-client-id')
      expect(url).toContain('scope=https%3A%2F%2Fads.microsoft.com%2Fmsads.manage') // MFA scope
      expect(url).toContain('offline_access')
      expect(url).toContain('prompt=consent')
    })

    it('should store state in KV for CSRF protection', async () => {
      await service.getAuthorizationUrl('user-123')

      expect(env.BING_ADS_KV.put).toHaveBeenCalledWith(
        expect.stringMatching(/^oauth:state:/),
        'user-123',
        { expirationTtl: 600 }
      )
    })
  })

  describe('handleOAuthCallback', () => {
    it('should exchange code for tokens with MFA support', async () => {
      const state = 'test-state-123'
      const code = 'auth-code-456'

      // Mock state verification
      env.BING_ADS_KV.get = vi.fn().mockResolvedValue('user-123')

      // Mock token exchange
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600,
          scope: 'https://ads.microsoft.com/msads.manage offline_access',
        }),
      })

      const tokens = await service.handleOAuthCallback(code, state)

      expect(tokens.accessToken).toBe('new-access-token')
      expect(tokens.refreshToken).toBe('new-refresh-token')
      expect(tokens.scope).toContain('msads.manage')
    })

    it('should throw error for invalid state', async () => {
      env.BING_ADS_KV.get = vi.fn().mockResolvedValue(null)

      await expect(service.handleOAuthCallback('code', 'invalid-state')).rejects.toThrow('Invalid or expired OAuth state')
    })

    it('should store tokens in both KV and D1', async () => {
      const state = 'test-state'
      const code = 'test-code'

      env.BING_ADS_KV.get = vi.fn().mockResolvedValue('user-123')

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'access',
          refresh_token: 'refresh',
          expires_in: 3600,
          scope: 'https://ads.microsoft.com/msads.manage offline_access',
        }),
      })

      const dbRun = vi.fn()
      env.BING_ADS_DB.prepare = vi.fn(() => ({
        bind: vi.fn(() => ({
          run: dbRun,
        })),
      })) as any

      await service.handleOAuthCallback(code, state)

      // Should store in KV
      expect(env.BING_ADS_KV.put).toHaveBeenCalledWith(
        'oauth:tokens:user-123',
        expect.any(String),
        { expirationTtl: 3600 }
      )

      // Should store in D1
      expect(dbRun).toHaveBeenCalled()
    })
  })

  describe('createSearchCampaign', () => {
    it('should create campaign with SOAP API', async () => {
      const config: SearchCampaignConfig = {
        name: 'Test Campaign',
        dailyBudget: 100,
        targeting: {
          locations: ['US'],
          languages: ['en'],
        },
      }

      // Mock getValidAccessToken
      vi.spyOn(service as any, 'getValidAccessToken').mockResolvedValue('valid-token')
      vi.spyOn(service as any, 'getCustomerInfo').mockResolvedValue({
        customerId: 'customer-123',
        accountId: 'account-456',
      })

      // Mock SOAP API response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '<CampaignId>12345</CampaignId>',
      })

      const dbRun = vi.fn()
      env.BING_ADS_DB.prepare = vi.fn(() => ({
        bind: vi.fn(() => ({
          run: dbRun,
        })),
      })) as any

      const result = await service.createSearchCampaign('user-123', config)

      expect(result.name).toBe('Test Campaign')
      expect(result.dailyBudget).toBe(100)
      expect(result.status).toBe('active')
      expect(dbRun).toHaveBeenCalled()
    })

    it('should build correct SOAP request', async () => {
      const config: SearchCampaignConfig = {
        name: 'Test Campaign',
        dailyBudget: 50,
      }

      vi.spyOn(service as any, 'getValidAccessToken').mockResolvedValue('token')
      vi.spyOn(service as any, 'getCustomerInfo').mockResolvedValue({
        customerId: 'cust',
        accountId: 'acc',
      })

      let soapRequest = ''
      global.fetch = vi.fn().mockImplementation(async (_url: string, options?: RequestInit) => {
        soapRequest = options?.body as string
        return {
          ok: true,
          text: async () => '<CampaignId>123</CampaignId>',
        }
      })

      env.BING_ADS_DB.prepare = vi.fn(() => ({
        bind: vi.fn(() => ({
          run: vi.fn(),
        })),
      })) as any

      await service.createSearchCampaign('user-123', config)

      expect(soapRequest).toContain('AddCampaignsRequest')
      expect(soapRequest).toContain('<Name>Test Campaign</Name>')
      expect(soapRequest).toContain('<DailyBudget>50</DailyBudget>')
      expect(soapRequest).toContain('xmlns="https://bingads.microsoft.com/CampaignManagement/v13"')
    })

    it('should throw error on API failure', async () => {
      const config: SearchCampaignConfig = {
        name: 'Test',
        dailyBudget: 100,
      }

      vi.spyOn(service as any, 'getValidAccessToken').mockResolvedValue('token')
      vi.spyOn(service as any, 'getCustomerInfo').mockResolvedValue({
        customerId: 'cust',
        accountId: 'acc',
      })

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        text: async () => 'API Error',
      })

      await expect(service.createSearchCampaign('user-123', config)).rejects.toThrow('Failed to create search campaign')
    })
  })

  describe('createSearchAd', () => {
    it('should create search ad with SOAP API', async () => {
      const config: SearchAdConfig = {
        campaignId: 'campaign-123',
        headline1: 'Buy Now',
        headline2: 'Save 50%',
        description1: 'Limited time offer',
        displayUrl: 'example.com/sale',
        finalUrl: 'https://example.com/sale',
        keywords: [
          { keyword: 'shoes', matchType: 'exact', bid: 2.5 },
          { keyword: 'sneakers', matchType: 'phrase', bid: 2.0 },
        ],
      }

      vi.spyOn(service as any, 'getValidAccessToken').mockResolvedValue('valid-token')
      vi.spyOn(service as any, 'getCustomerInfo').mockResolvedValue({
        customerId: 'customer-123',
        accountId: 'account-456',
      })

      // Mock campaign lookup
      env.BING_ADS_DB.prepare = vi.fn(() => ({
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue({ external_campaign_id: 'ext-campaign-123' }),
          run: vi.fn(),
        })),
      })) as any

      // Mock SOAP API response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '<AdId>67890</AdId>',
      })

      const result = await service.createSearchAd('user-123', config)

      expect(result.headline1).toBe('Buy Now')
      expect(result.headline2).toBe('Save 50%')
      expect(result.description1).toBe('Limited time offer')
      expect(result.finalUrl).toBe('https://example.com/sale')
      expect(result.status).toBe('active')
    })

    it('should throw error if campaign not found', async () => {
      const config: SearchAdConfig = {
        campaignId: 'invalid-campaign',
        headline1: 'Test',
        headline2: 'Test',
        description1: 'Test',
        displayUrl: 'example.com',
        finalUrl: 'https://example.com',
        keywords: [],
      }

      vi.spyOn(service as any, 'getValidAccessToken').mockResolvedValue('token')
      vi.spyOn(service as any, 'getCustomerInfo').mockResolvedValue({
        customerId: 'cust',
        accountId: 'acc',
      })

      env.BING_ADS_DB.prepare = vi.fn(() => ({
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(null),
        })),
      })) as any

      await expect(service.createSearchAd('user-123', config)).rejects.toThrow('Campaign invalid-campaign not found')
    })

    it('should add keywords to database', async () => {
      const config: SearchAdConfig = {
        campaignId: 'campaign-123',
        headline1: 'Test',
        headline2: 'Test',
        description1: 'Test',
        displayUrl: 'example.com',
        finalUrl: 'https://example.com',
        keywords: [
          { keyword: 'test keyword', matchType: 'exact', bid: 3.0 },
        ],
      }

      vi.spyOn(service as any, 'getValidAccessToken').mockResolvedValue('token')
      vi.spyOn(service as any, 'getCustomerInfo').mockResolvedValue({
        customerId: 'cust',
        accountId: 'acc',
      })

      const dbRun = vi.fn()
      const dbFirst = vi.fn().mockResolvedValue({ external_campaign_id: 'ext-123' })

      env.BING_ADS_DB.prepare = vi.fn(() => ({
        bind: vi.fn(() => ({
          first: dbFirst,
          run: dbRun,
        })),
      })) as any

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '<AdId>123</AdId>',
      })

      await service.createSearchAd('user-123', config)

      // Should insert ad and keyword
      expect(dbRun).toHaveBeenCalledTimes(2) // 1 for ad, 1 for keyword
    })
  })

  describe('syncCampaignPerformance', () => {
    it('should sync metrics from Bing Ads', async () => {
      vi.spyOn(service as any, 'getValidAccessToken').mockResolvedValue('valid-token')
      vi.spyOn(service as any, 'getCustomerInfo').mockResolvedValue({
        customerId: 'customer-123',
        accountId: 'account-456',
      })

      // Mock campaign lookup
      env.BING_ADS_DB.prepare = vi.fn(() => ({
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue({ external_campaign_id: 'ext-campaign-123' }),
          run: vi.fn(),
        })),
      })) as any

      // Mock SOAP API response
      vi.spyOn(service as any, 'parseMetricsFromSoapResponse').mockReturnValue({
        impressions: 5000,
        clicks: 250,
        conversions: 25,
        spend: 125,
      })

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '<Report>Data</Report>',
      })

      const result = await service.syncCampaignPerformance('user-123', 'campaign-123')

      expect(result.impressions).toBe(5000)
      expect(result.clicks).toBe(250)
      expect(result.conversions).toBe(25)
      expect(result.spend).toBe(125)
    })

    it('should store synced metrics in database', async () => {
      vi.spyOn(service as any, 'getValidAccessToken').mockResolvedValue('token')
      vi.spyOn(service as any, 'getCustomerInfo').mockResolvedValue({
        customerId: 'cust',
        accountId: 'acc',
      })

      const dbRun = vi.fn()
      env.BING_ADS_DB.prepare = vi.fn(() => ({
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue({ external_campaign_id: 'ext-123' }),
          run: dbRun,
        })),
      })) as any

      vi.spyOn(service as any, 'parseMetricsFromSoapResponse').mockReturnValue({
        impressions: 1000,
        clicks: 50,
        conversions: 5,
        spend: 25,
      })

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '<Report>Data</Report>',
      })

      await service.syncCampaignPerformance('user-123', 'campaign-123')

      expect(dbRun).toHaveBeenCalled()
    })

    it('should throw error if campaign not found', async () => {
      vi.spyOn(service as any, 'getValidAccessToken').mockResolvedValue('token')
      vi.spyOn(service as any, 'getCustomerInfo').mockResolvedValue({
        customerId: 'cust',
        accountId: 'acc',
      })

      env.BING_ADS_DB.prepare = vi.fn(() => ({
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(null),
        })),
      })) as any

      await expect(service.syncCampaignPerformance('user-123', 'invalid-campaign')).rejects.toThrow(
        'Campaign invalid-campaign not found'
      )
    })
  })

  describe('token management', () => {
    it('should cache valid tokens in KV', async () => {
      const tokens = {
        accessToken: 'access-123',
        refreshToken: 'refresh-123',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        scope: 'https://ads.microsoft.com/msads.manage offline_access',
      }

      await (service as any).storeTokens('user-123', tokens)

      expect(env.BING_ADS_KV.put).toHaveBeenCalledWith(
        'oauth:tokens:user-123',
        expect.any(String),
        { expirationTtl: 3600 }
      )
    })

    it('should refresh expired tokens automatically', async () => {
      const expiredTokens = {
        accessToken: 'old-access',
        refreshToken: 'refresh-123',
        expiresAt: new Date(Date.now() - 1000).toISOString(), // Expired
        scope: 'https://ads.microsoft.com/msads.manage offline_access',
      }

      // Mock KV get returns null (cache miss)
      env.BING_ADS_KV.get = vi.fn().mockResolvedValue(null)

      // Mock D1 get returns expired token
      env.BING_ADS_DB.prepare = vi.fn(() => ({
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue({
            access_token: 'old-access',
            refresh_token: 'refresh-123',
            expires_at: expiredTokens.expiresAt,
          }),
          run: vi.fn(),
        })),
      })) as any

      // Mock token refresh
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'new-access',
          refresh_token: 'new-refresh',
          expires_in: 3600,
          scope: 'https://ads.microsoft.com/msads.manage offline_access',
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
        scope: 'https://ads.microsoft.com/msads.manage offline_access',
      }

      env.BING_ADS_KV.get = vi.fn().mockResolvedValue(JSON.stringify(validTokens))

      const token = await (service as any).getValidAccessToken('user-123')

      expect(token).toBe('valid-access')
      // Should not query D1
      expect(env.BING_ADS_DB.prepare).not.toHaveBeenCalled()
    })

    it('should throw error if no authorization found', async () => {
      env.BING_ADS_KV.get = vi.fn().mockResolvedValue(null)

      env.BING_ADS_DB.prepare = vi.fn(() => ({
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(null),
        })),
      })) as any

      await expect((service as any).getValidAccessToken('user-123')).rejects.toThrow(
        'No Bing Ads authorization found. Please authorize first.'
      )
    })
  })

  describe('SOAP request building', () => {
    it('should include proper XML namespaces', () => {
      const config: SearchCampaignConfig = {
        name: 'Test',
        dailyBudget: 100,
      }

      const soapRequest = (service as any).buildCreateCampaignSoapRequest(config, 'account-123')

      expect(soapRequest).toContain('xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"')
      expect(soapRequest).toContain('xmlns="https://bingads.microsoft.com/CampaignManagement/v13"')
    })

    it('should include account ID in header', () => {
      const config: SearchCampaignConfig = {
        name: 'Test',
        dailyBudget: 100,
      }

      const soapRequest = (service as any).buildCreateCampaignSoapRequest(config, 'account-456')

      expect(soapRequest).toContain('<h:CustomerAccountId')
      expect(soapRequest).toContain('account-456')
    })

    it('should format ad SOAP request correctly', () => {
      const config: SearchAdConfig = {
        campaignId: 'campaign-123',
        headline1: 'Headline 1',
        headline2: 'Headline 2',
        description1: 'Description',
        displayUrl: 'example.com',
        finalUrl: 'https://example.com',
        keywords: [],
      }

      const soapRequest = (service as any).buildCreateAdSoapRequest(config, 'ext-campaign-123')

      expect(soapRequest).toContain('AddAdsRequest')
      expect(soapRequest).toContain('<TitlePart1>Headline 1</TitlePart1>')
      expect(soapRequest).toContain('<TitlePart2>Headline 2</TitlePart2>')
      expect(soapRequest).toContain('<Text>Description</Text>')
      expect(soapRequest).toContain('xsi:type="ExpandedTextAd"')
    })
  })
})
