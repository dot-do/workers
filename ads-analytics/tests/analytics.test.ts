/**
 * Ads Analytics Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AdsAnalyticsService } from '../src/index'
import type { Env } from '../src/index'
import { AdEventType, AttributionModel, AdPlatform, type AdEvent, type Conversion, type DateRange } from '@dot-do/ads-types'

describe('AdsAnalyticsService', () => {
  let service: AdsAnalyticsService
  let mockEnv: Env

  beforeEach(() => {
    // Mock environment
    mockEnv = {
      ANALYTICS_KV: {
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
      ANALYTICS: {
        writeDataPoint: vi.fn(),
      } as any,
      ANALYTICS_QUEUE: {
        send: vi.fn().mockResolvedValue(undefined),
      } as any,
    }

    service = new AdsAnalyticsService({} as any, mockEnv)
  })

  describe('Event Tracking', () => {
    it('should track impression event', async () => {
      const event: AdEvent = {
        id: 'event-001',
        type: AdEventType.Impression,
        campaignId: 'campaign-123',
        adId: 'ad-456',
        audienceId: 'audience-789',
        userId: 'user-001',
        sessionId: 'session-abc',
        timestamp: new Date().toISOString(),
        platform: AdPlatform.GoogleAds,
      }

      await service.trackEvent(event)

      expect(mockEnv.DB.prepare).toHaveBeenCalled()
      expect(mockEnv.ANALYTICS.writeDataPoint).toHaveBeenCalled()
    })

    it('should track click event', async () => {
      const event: AdEvent = {
        id: 'event-002',
        type: AdEventType.Click,
        campaignId: 'campaign-123',
        adId: 'ad-456',
        userId: 'user-001',
        sessionId: 'session-abc',
        timestamp: new Date().toISOString(),
        platform: AdPlatform.MetaAds,
      }

      await service.trackEvent(event)

      expect(mockEnv.DB.prepare).toHaveBeenCalled()
      expect(mockEnv.ANALYTICS.writeDataPoint).toHaveBeenCalled()
    })

    it('should track conversion event', async () => {
      const conversionEvent: Conversion = {
        id: 'event-003',
        type: AdEventType.Conversion,
        campaignId: 'campaign-123',
        userId: 'user-001',
        sessionId: 'session-abc',
        timestamp: new Date().toISOString(),
        platform: AdPlatform.GoogleAds,
        conversionType: 'purchase',
        value: 99.99,
        currency: 'USD',
        attributedTouchpoints: [
          {
            campaignId: 'campaign-123',
            adId: 'ad-456',
            platform: AdPlatform.GoogleAds,
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            eventType: AdEventType.Impression,
            credit: 0,
          },
          {
            campaignId: 'campaign-123',
            adId: 'ad-456',
            platform: AdPlatform.GoogleAds,
            timestamp: new Date(Date.now() - 1800000).toISOString(),
            eventType: AdEventType.Click,
            credit: 1,
          },
        ],
      }

      await service.trackConversion(conversionEvent)

      expect(mockEnv.DB.prepare).toHaveBeenCalled()
      expect(mockEnv.ANALYTICS_QUEUE.send).toHaveBeenCalled()
    })
  })

  describe('Metrics Calculation', () => {
    it('should calculate campaign metrics', async () => {
      const campaignId = 'campaign-123'
      const dateRange: DateRange = {
        from: '2025-01-01',
        to: '2025-01-31',
      }

      // Mock event data
      mockEnv.DB.prepare = vi.fn(() => ({
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({
          results: [
            { type: AdEventType.Impression, count: 100000 },
            { type: AdEventType.Click, count: 5000 },
            { type: AdEventType.View, count: 3000 },
          ],
        }),
      })) as any

      const metrics = await service.getCampaignMetrics(campaignId, dateRange)

      expect(metrics.impressions).toBe(100000)
      expect(metrics.clicks).toBe(5000)
      expect(metrics.views).toBe(3000)
      expect(metrics.ctr).toBeCloseTo(5.0, 1)
      expect(mockEnv.ANALYTICS_KV.put).toHaveBeenCalled()
    })

    it('should get aggregated metrics by date', async () => {
      const campaignId = 'campaign-123'
      const dateRange: DateRange = {
        from: '2025-01-01',
        to: '2025-01-03',
      }

      const mockData = [
        { date: '2025-01-01', impressions: 10000, clicks: 500 },
        { date: '2025-01-02', impressions: 12000, clicks: 600 },
        { date: '2025-01-03', impressions: 11000, clicks: 550 },
      ]

      mockEnv.DB.prepare = vi.fn(() => ({
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: mockData }),
      })) as any

      const aggregated = await service.getAggregatedMetrics({ dateRange }, 'date')

      expect(aggregated.groups.length).toBe(3)
      expect(aggregated.groups[0].key).toBe('2025-01-01')
      expect(aggregated.totals).toBeDefined()
    })

    it('should get cross-platform metrics', async () => {
      const dateRange: DateRange = {
        from: '2025-01-01',
        to: '2025-01-31',
      }

      const crossPlatform = await service.getCrossPlatformMetrics(dateRange)

      expect(Object.keys(crossPlatform.platforms).length).toBeGreaterThan(0)
      expect(crossPlatform.total).toBeDefined()
      expect(crossPlatform.breakdown).toBeDefined()
    })
  })

  describe('Attribution', () => {
    it('should calculate last-click attribution', async () => {
      const dateRange: DateRange = {
        from: '2025-01-01',
        to: '2025-01-31',
      }

      const mockPaths = [
        {
          id: 'path-1',
          user_id: 'user-001',
          attributed_touchpoints: JSON.stringify([
            { campaignId: 'campaign-123', adId: 'ad-1', platform: AdPlatform.GoogleAds, timestamp: '2025-01-01T10:00:00Z', eventType: AdEventType.Impression },
            { campaignId: 'campaign-123', adId: 'ad-2', platform: AdPlatform.MetaAds, timestamp: '2025-01-01T11:00:00Z', eventType: AdEventType.Click },
          ]),
          value: 100,
          timestamp: '2025-01-01T12:00:00Z',
        },
      ]

      mockEnv.DB.prepare = vi.fn(() => ({
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: mockPaths }),
      })) as any

      const window = { clickWindow: 30, viewWindow: 7 }
      const report = await service.getAttributionReport(AttributionModel.LastClick, window, dateRange)

      expect(report.model).toBe(AttributionModel.LastClick)
      expect(report.conversions).toBeGreaterThan(0)
      expect(report.path).toBeDefined()
      expect(Array.isArray(report.path)).toBe(true)
    })

    it('should compare attribution models', async () => {
      const dateRange: DateRange = {
        from: '2025-01-01',
        to: '2025-01-31',
      }

      const mockPaths = [
        {
          id: 'path-1',
          user_id: 'user-001',
          attributed_touchpoints: JSON.stringify([
            { campaignId: 'campaign-123', adId: 'ad-1', platform: AdPlatform.GoogleAds, timestamp: '2025-01-01T10:00:00Z', eventType: AdEventType.Impression },
            { campaignId: 'campaign-123', adId: 'ad-2', platform: AdPlatform.MetaAds, timestamp: '2025-01-01T11:00:00Z', eventType: AdEventType.Click },
          ]),
          value: 100,
          timestamp: '2025-01-01T12:00:00Z',
        },
      ]

      mockEnv.DB.prepare = vi.fn(() => ({
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: mockPaths }),
      })) as any

      const window = { clickWindow: 30, viewWindow: 7 }
      const comparison = await service.compareAttributionModels(window, dateRange)

      expect(comparison).toBeDefined()
      expect(comparison.models).toHaveLength(5)
      expect(comparison.models.map(m => m.model)).toContain(AttributionModel.LastClick)
      expect(comparison.models.map(m => m.model)).toContain(AttributionModel.FirstClick)
      expect(comparison.models.map(m => m.model)).toContain(AttributionModel.Linear)
    })
  })

  describe('ROAS Metrics', () => {
    it('should calculate ROAS metrics', async () => {
      const dateRange: DateRange = {
        from: '2025-01-01',
        to: '2025-01-31',
      }

      const mockMetrics = {
        date: '2025-01-01',
        impressions: 100000,
        clicks: 5000,
        spend: 1000,
        revenue: 5000,
      }

      mockEnv.DB.prepare = vi.fn(() => ({
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [mockMetrics] }),
      })) as any

      const campaignId = 'campaign-123'
      const roasMetrics = await service.getROASMetrics(campaignId, dateRange)

      expect(roasMetrics.revenue).toBeGreaterThan(0)
      expect(roasMetrics.adSpend).toBeGreaterThan(0)
      expect(roasMetrics.roas).toBeGreaterThan(0)
      expect(roasMetrics.dateRange).toBeDefined()
    })
  })

  describe('Channel Performance', () => {
    it('should get channel performance', async () => {
      const platform = AdPlatform.GoogleAds
      const dateRange: DateRange = {
        from: '2025-01-01',
        to: '2025-01-31',
      }

      const mockData = [
        { platform: AdPlatform.GoogleAds, impressions: 50000, clicks: 2500, conversions: 100, spend: 500, revenue: 2000 },
      ]

      mockEnv.DB.prepare = vi.fn(() => ({
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: mockData }),
      })) as any

      const performance = await service.getChannelPerformance(platform, dateRange)

      expect(performance.channel).toBe(platform)
      expect(performance.metrics).toBeDefined()
      expect(performance.trends).toBeDefined()
    })
  })

  describe('Reports', () => {
    it('should generate report', async () => {
      const reportConfig = {
        name: 'Weekly Performance Report',
        type: 'campaign' as const,
        metrics: ['impressions', 'clicks', 'conversions', 'roas'],
        dimensions: ['date', 'platform'],
        dateRange: {
          from: '2025-01-01',
          to: '2025-01-07',
        },
        format: 'json' as const,
      }

      const report = await service.generateReport(reportConfig)

      expect(report).toBeDefined()
      expect(report.id).toBeDefined()
      expect(report.config.name).toBe('Weekly Performance Report')
      expect(report.data).toBeDefined()
      expect(mockEnv.DB.prepare).toHaveBeenCalled()
      expect(mockEnv.ANALYTICS_KV.put).toHaveBeenCalled()
    })

    it('should create scheduled report', async () => {
      const config = {
        name: 'Daily Report',
        type: 'campaign' as const,
        metrics: ['impressions', 'clicks'],
        dimensions: ['date'],
        dateRange: {
          from: '2025-01-01',
          to: '2025-01-31',
        },
        format: 'pdf' as const,
      }

      const schedule = {
        frequency: 'daily' as const,
        hour: 9,
        minute: 0,
        timezone: 'America/Los_Angeles',
        enabled: true,
      }

      const report = await service.createScheduledReport(config, schedule, ['user@example.com'])

      expect(report).toBeDefined()
      expect(report.id).toBeDefined()
      expect(report.schedule.frequency).toBe('daily')
      expect(mockEnv.DB.prepare).toHaveBeenCalled()
      expect(mockEnv.ANALYTICS_QUEUE.send).toHaveBeenCalled()
    })
  })

  describe('Alerts', () => {
    it('should create alert', async () => {
      const alertConfig = {
        name: 'High CPA Alert',
        metric: 'cpa',
        condition: {
          operator: 'greater_than' as const,
          value: 50,
        },
        channels: ['email' as const],
        recipients: ['user@example.com'],
        enabled: true,
      }

      const alert = await service.createAlert(alertConfig)

      expect(alert).toBeDefined()
      expect(mockEnv.DB.prepare).toHaveBeenCalled()
      expect(mockEnv.ANALYTICS_QUEUE.send).toHaveBeenCalled()
    })
  })

  describe('Custom Metrics', () => {
    it('should create custom metric', async () => {
      const name = 'Profit per Click'
      const formula = '(revenue - spend) / clicks'
      const description = 'Average profit per click'

      const metric = await service.createCustomMetric(name, description, formula)

      expect(metric).toBeDefined()
      expect(mockEnv.DB.prepare).toHaveBeenCalled()
    })
  })
})
