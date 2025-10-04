/**
 * Ads Creative Optimizer Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AdsCreativeService } from '../src/index'
import type { Env } from '../src/index'
import {
  AdFormat,
  CreativeStatus,
  AssetType,
  AdPlatform,
  type AdCopy,
  type AssetMetadata,
  type DCOComponents,
  type DCORules,
  type CreativeVariation,
} from '@dot-do/ads-types'

describe('AdsCreativeService', () => {
  let service: AdsCreativeService
  let mockEnv: Env

  beforeEach(() => {
    // Mock environment
    mockEnv = {
      CREATIVES_KV: {
        get: vi.fn().mockResolvedValue(null),
        put: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      } as any,
      DB: {
        prepare: vi.fn(() => ({
          bind: vi.fn().mockReturnThis(),
          run: vi.fn().mockResolvedValue({ success: true }),
          first: vi.fn().mockResolvedValue(null),
          all: vi.fn().mockResolvedValue({ results: [] }),
        })),
      } as any,
      ASSETS: {
        put: vi.fn().mockResolvedValue(undefined),
        get: vi.fn().mockResolvedValue(null),
        delete: vi.fn().mockResolvedValue(undefined),
      } as any,
      CREATIVE_QUEUE: {
        send: vi.fn().mockResolvedValue(undefined),
      } as any,
      ANALYTICS: {
        writeDataPoint: vi.fn(),
      } as any,
    }

    service = new AdsCreativeService({} as any, mockEnv)
  })

  describe('Asset Management', () => {
    it('should upload asset', async () => {
      const file = new ArrayBuffer(1024 * 100) // 100KB
      const metadata: AssetMetadata = {
        name: 'Test Image',
        type: AssetType.Image,
        platform: AdPlatform.GoogleAds,
        tags: ['product', 'hero'],
      }

      const asset = await service.uploadAsset(file, metadata)

      expect(asset).toBeDefined()
      expect(asset.id).toBeDefined()
      expect(asset.name).toBe('Test Image')
      expect(asset.type).toBe(AssetType.Image)
      expect(asset.metadata.fileSize).toBe(102400)
      expect(mockEnv.ASSETS.put).toHaveBeenCalled()
      expect(mockEnv.DB.prepare).toHaveBeenCalled()
      expect(mockEnv.CREATIVES_KV.put).toHaveBeenCalled()
      expect(mockEnv.ANALYTICS.writeDataPoint).toHaveBeenCalled()
    })

    it('should list assets with filters', async () => {
      const mockAssets = [
        {
          id: 'asset-1',
          type: AssetType.Image,
          name: 'Image 1',
          url: 'https://example.com/1.jpg',
          metadata: '{}',
          tags: '[]',
          platform: AdPlatform.GoogleAds,
          created_at: '2025-01-01',
          updated_at: '2025-01-01',
        },
      ]

      mockEnv.DB.prepare = vi.fn(() => ({
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: mockAssets }),
        first: vi.fn().mockResolvedValue({ count: 1 }),
      })) as any

      const result = await service.listAssets({ type: AssetType.Image }, 50, 0)

      expect(result.assets).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.assets[0].id).toBe('asset-1')
    })

    it('should delete asset', async () => {
      const assetId = 'test-asset-id'
      const mockAsset = {
        id: assetId,
        type: AssetType.Image,
        name: 'Test Image',
        url: 'https://example.com/test.jpg',
        metadata: {},
        tags: [],
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      }

      mockEnv.CREATIVES_KV.get = vi.fn().mockResolvedValue(JSON.stringify(mockAsset))

      await service.deleteAsset(assetId)

      expect(mockEnv.DB.prepare).toHaveBeenCalled()
      expect(mockEnv.CREATIVES_KV.delete).toHaveBeenCalledWith(`asset:${assetId}`)
      expect(mockEnv.CREATIVE_QUEUE.send).toHaveBeenCalled()
      expect(mockEnv.ANALYTICS.writeDataPoint).toHaveBeenCalled()
    })
  })

  describe('Creative Management', () => {
    it('should create creative', async () => {
      const copy: AdCopy = {
        headlines: ['Best Product Ever', 'Buy Now and Save'],
        descriptions: ['Limited time offer', 'Free shipping on all orders'],
        finalUrl: 'https://example.com/product',
      }

      const creative = await service.createCreative('Test Creative', AdFormat.ResponsiveSearchAd, AdPlatform.GoogleAds, copy, ['asset-1', 'asset-2'])

      expect(creative).toBeDefined()
      expect(creative.id).toBeDefined()
      expect(creative.name).toBe('Test Creative')
      expect(creative.format).toBe(AdFormat.ResponsiveSearchAd)
      expect(creative.status).toBe(CreativeStatus.Draft)
      expect(creative.assets).toHaveLength(2)
      expect(mockEnv.DB.prepare).toHaveBeenCalled()
      expect(mockEnv.CREATIVES_KV.put).toHaveBeenCalled()
      expect(mockEnv.ANALYTICS.writeDataPoint).toHaveBeenCalled()
    })

    it('should update creative', async () => {
      const creativeId = 'test-creative-id'
      const existingCreative = {
        id: creativeId,
        name: 'Old Name',
        format: AdFormat.TextAd,
        platform: AdPlatform.GoogleAds,
        status: CreativeStatus.Draft,
        copy: {
          headlines: ['Old Headline'],
          descriptions: ['Old Description'],
          finalUrl: 'https://example.com',
        },
        assets: [],
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      }

      mockEnv.CREATIVES_KV.get = vi.fn().mockResolvedValue(JSON.stringify(existingCreative))

      const updated = await service.updateCreative(creativeId, {
        name: 'New Name',
        status: CreativeStatus.Active,
      })

      expect(updated.name).toBe('New Name')
      expect(updated.status).toBe(CreativeStatus.Active)
      expect(mockEnv.DB.prepare).toHaveBeenCalled()
      expect(mockEnv.CREATIVES_KV.put).toHaveBeenCalled()
    })

    it('should delete creative', async () => {
      const creativeId = 'test-creative-id'
      const mockCreative = {
        id: creativeId,
        name: 'Test Creative',
        format: AdFormat.ImageAd,
        platform: AdPlatform.MetaAds,
        status: CreativeStatus.Active,
        copy: { headlines: [], descriptions: [], finalUrl: '' },
        assets: [],
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      }

      mockEnv.CREATIVES_KV.get = vi.fn().mockResolvedValue(JSON.stringify(mockCreative))

      await service.deleteCreative(creativeId)

      expect(mockEnv.DB.prepare).toHaveBeenCalled()
      expect(mockEnv.CREATIVES_KV.delete).toHaveBeenCalledWith(`creative:${creativeId}`)
      expect(mockEnv.ANALYTICS.writeDataPoint).toHaveBeenCalled()
    })

    it('should get creative performance', async () => {
      const creativeId = 'test-creative-id'
      const dateFrom = '2025-01-01'
      const dateTo = '2025-01-31'

      const performance = await service.getCreativePerformance(creativeId, dateFrom, dateTo)

      expect(performance).toBeDefined()
      expect(performance.impressions).toBeGreaterThan(0)
      expect(performance.clicks).toBeGreaterThan(0)
      expect(performance.conversions).toBeGreaterThan(0)
      expect(performance.ctr).toBeGreaterThan(0)
      expect(performance.cpc).toBeGreaterThan(0)
      expect(performance.cpa).toBeGreaterThan(0)
      expect(performance.dateFrom).toBe(dateFrom)
      expect(performance.dateTo).toBe(dateTo)
    })
  })

  describe('A/B Testing', () => {
    it('should create test', async () => {
      const variants: CreativeVariation[] = [
        {
          id: 'variant-a',
          name: 'Variant A',
          copy: { headlines: ['Headline A'] },
          allocation: 50,
        },
        {
          id: 'variant-b',
          name: 'Variant B',
          copy: { headlines: ['Headline B'] },
          allocation: 50,
        },
      ]

      const test = await service.createTest('Test Name', 'campaign-123', variants)

      expect(test).toBeDefined()
      expect(test.id).toBeDefined()
      expect(test.name).toBe('Test Name')
      expect(test.variants).toHaveLength(2)
      expect(test.status).toBe('running')
      expect(mockEnv.DB.prepare).toHaveBeenCalled()
      expect(mockEnv.ANALYTICS.writeDataPoint).toHaveBeenCalled()
    })

    it('should reject test with invalid allocations', async () => {
      const variants: CreativeVariation[] = [
        {
          id: 'variant-a',
          name: 'Variant A',
          copy: {},
          allocation: 60,
        },
        {
          id: 'variant-b',
          name: 'Variant B',
          copy: {},
          allocation: 60, // Total 120% - invalid
        },
      ]

      await expect(service.createTest('Test Name', 'campaign-123', variants)).rejects.toThrow('Total allocation must equal 100%')
    })

    it('should get test results', async () => {
      const testId = 'test-123'
      const mockTest = {
        id: testId,
        name: 'Test',
        campaign_id: 'campaign-123',
        variants: JSON.stringify([
          { id: 'variant-a', name: 'Variant A', allocation: 50 },
          { id: 'variant-b', name: 'Variant B', allocation: 50 },
        ]),
        status: 'running',
        started_at: '2025-01-01',
      }

      mockEnv.DB.prepare = vi.fn(() => ({
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(mockTest),
      })) as any

      const results = await service.getTestResults(testId)

      expect(results).toBeDefined()
      expect(results.testId).toBe(testId)
      expect(results.variants).toHaveLength(2)
      expect(results.winner).toBeDefined()
      expect(results.statisticalSignificance).toBe(true)
    })

    it('should stop test', async () => {
      const testId = 'test-123'
      const winnerId = 'variant-a'

      await service.stopTest(testId, winnerId)

      expect(mockEnv.DB.prepare).toHaveBeenCalled()
      expect(mockEnv.ANALYTICS.writeDataPoint).toHaveBeenCalled()
    })
  })

  describe('DCO (Dynamic Creative Optimization)', () => {
    it('should create DCO campaign', async () => {
      const components: DCOComponents = {
        headlines: ['Headline 1', 'Headline 2', 'Headline 3'],
        descriptions: ['Description 1', 'Description 2'],
        images: ['image-1', 'image-2'],
        callsToAction: ['Shop Now', 'Learn More'],
      }

      const rules: DCORules = {
        priority: [
          { component: 'headlines', weight: 0.4 },
          { component: 'images', weight: 0.3 },
          { component: 'descriptions', weight: 0.3 },
        ],
      }

      const dco = await service.createDCOCampaign('campaign-123', components, rules)

      expect(dco).toBeDefined()
      expect(dco.id).toBeDefined()
      expect(dco.campaignId).toBe('campaign-123')
      expect(dco.components.headlines).toHaveLength(3)
      expect(dco.status).toBe('active')
      expect(mockEnv.DB.prepare).toHaveBeenCalled()
      expect(mockEnv.CREATIVE_QUEUE.send).toHaveBeenCalled()
      expect(mockEnv.ANALYTICS.writeDataPoint).toHaveBeenCalled()
    })
  })

  describe('Recommendations', () => {
    it('should get creative recommendations', async () => {
      const recommendations = await service.getCreativeRecommendations('campaign-123')

      expect(recommendations).toBeDefined()
      expect(recommendations.length).toBeGreaterThan(0)
      expect(recommendations[0].type).toBeDefined()
      expect(recommendations[0].title).toBeDefined()
      expect(recommendations[0].priority).toBeDefined()
      expect(recommendations[0].estimatedImpact).toBeDefined()
      expect(recommendations[0].actionSteps).toBeInstanceOf(Array)
    })
  })

  describe('Asset Performance', () => {
    it('should update asset performance', async () => {
      const assetId = 'asset-123'
      const mockAsset = {
        id: assetId,
        type: AssetType.Image,
        name: 'Test Image',
        url: 'https://example.com/test.jpg',
        metadata: {},
        tags: [],
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      }

      mockEnv.CREATIVES_KV.get = vi.fn().mockResolvedValue(JSON.stringify(mockAsset))

      const performance = {
        impressions: 100000,
        clicks: 5000,
        conversions: 500,
        ctr: 5.0,
        conversionRate: 10.0,
        score: 85,
        lastUpdated: new Date().toISOString(),
      }

      await service.updateAssetPerformance(assetId, performance)

      expect(mockEnv.DB.prepare).toHaveBeenCalled()
      expect(mockEnv.CREATIVES_KV.put).toHaveBeenCalled()
    })
  })
})
