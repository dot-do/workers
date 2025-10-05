/**
 * Dashboard Manager Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DashboardManager } from '../src/dashboard'
import type { ChannelPerformance, UnifiedMetrics } from '../src/dashboard'

describe('DashboardManager', () => {
  let manager: DashboardManager
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
    }

    manager = new DashboardManager(env)
  })

  describe('getDashboardSummary', () => {
    it('should aggregate metrics across all channels', async () => {
      // Mock house ads performance
      vi.spyOn(manager as any, 'getHouseAdsPerformance').mockResolvedValue({
        channel: 'house',
        metrics: {
          impressions: 10000,
          clicks: 400,
          conversions: 40,
          spend: 200,
          revenue: 800,
          ctr: 0.04,
          cpc: 0.5,
          cpm: 20,
          cvr: 0.1,
          cpa: 5,
          roas: 4.0,
        },
        adCount: 10,
        activeAdCount: 8,
        lastUpdated: new Date().toISOString(),
      })

      // Mock Google ads performance
      vi.spyOn(manager as any, 'getGoogleAdsPerformance').mockResolvedValue({
        channel: 'google',
        metrics: {
          impressions: 5000,
          clicks: 200,
          conversions: 20,
          spend: 100,
          revenue: 400,
          ctr: 0.04,
          cpc: 0.5,
          cpm: 20,
          cvr: 0.1,
          cpa: 5,
          roas: 4.0,
        },
        adCount: 5,
        activeAdCount: 4,
        lastUpdated: new Date().toISOString(),
      })

      // Mock Bing ads performance
      vi.spyOn(manager as any, 'getBingAdsPerformance').mockResolvedValue({
        channel: 'bing',
        metrics: {
          impressions: 3000,
          clicks: 120,
          conversions: 12,
          spend: 60,
          revenue: 240,
          ctr: 0.04,
          cpc: 0.5,
          cpm: 20,
          cvr: 0.1,
          cpa: 5,
          roas: 4.0,
        },
        adCount: 3,
        activeAdCount: 2,
        lastUpdated: new Date().toISOString(),
      })

      // Mock top performing ads
      vi.spyOn(manager as any, 'getTopPerformingAds').mockResolvedValue([
        {
          adId: 'ad-1',
          adName: 'Top Ad',
          channel: 'house',
          status: 'active',
          metrics: {
            impressions: 5000,
            clicks: 250,
            conversions: 30,
            spend: 100,
            revenue: 500,
            ctr: 0.05,
            cpc: 0.4,
            cpm: 20,
            cvr: 0.12,
            cpa: 3.33,
            roas: 5.0,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ])

      const summary = await manager.getDashboardSummary()

      expect(summary.overall).toBeDefined()
      expect(summary.overall.impressions).toBe(18000) // 10000 + 5000 + 3000
      expect(summary.overall.clicks).toBe(720) // 400 + 200 + 120
      expect(summary.overall.conversions).toBe(72) // 40 + 20 + 12
      expect(summary.overall.spend).toBe(360) // 200 + 100 + 60
      expect(summary.overall.revenue).toBe(1440) // 800 + 400 + 240

      expect(summary.channels).toHaveLength(3)
      expect(summary.channels[0].channel).toBe('house')
      expect(summary.channels[1].channel).toBe('google')
      expect(summary.channels[2].channel).toBe('bing')

      expect(summary.topPerformingAds).toHaveLength(1)
      expect(summary.dateRange).toBeDefined()
      expect(summary.generatedAt).toBeDefined()
    })

    it('should use default date range if not provided', async () => {
      vi.spyOn(manager as any, 'getHouseAdsPerformance').mockResolvedValue({
        channel: 'house',
        metrics: { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0, ctr: 0, cpc: 0, cpm: 0, cvr: 0, cpa: 0, roas: 0 },
        adCount: 0,
        activeAdCount: 0,
        lastUpdated: new Date().toISOString(),
      })

      vi.spyOn(manager as any, 'getGoogleAdsPerformance').mockResolvedValue({
        channel: 'google',
        metrics: { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0, ctr: 0, cpc: 0, cpm: 0, cvr: 0, cpa: 0, roas: 0 },
        adCount: 0,
        activeAdCount: 0,
        lastUpdated: new Date().toISOString(),
      })

      vi.spyOn(manager as any, 'getBingAdsPerformance').mockResolvedValue({
        channel: 'bing',
        metrics: { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0, ctr: 0, cpc: 0, cpm: 0, cvr: 0, cpa: 0, roas: 0 },
        adCount: 0,
        activeAdCount: 0,
        lastUpdated: new Date().toISOString(),
      })

      vi.spyOn(manager as any, 'getTopPerformingAds').mockResolvedValue([])

      const summary = await manager.getDashboardSummary()

      // Should use last 30 days
      const now = new Date()
      const expectedFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      expect(new Date(summary.dateRange.from).getTime()).toBeGreaterThanOrEqual(expectedFrom.getTime() - 1000)
      expect(new Date(summary.dateRange.to).getTime()).toBeLessThanOrEqual(now.getTime() + 1000)
    })

    it('should use custom date range if provided', async () => {
      vi.spyOn(manager as any, 'getHouseAdsPerformance').mockResolvedValue({
        channel: 'house',
        metrics: { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0, ctr: 0, cpc: 0, cpm: 0, cvr: 0, cpa: 0, roas: 0 },
        adCount: 0,
        activeAdCount: 0,
        lastUpdated: new Date().toISOString(),
      })

      vi.spyOn(manager as any, 'getGoogleAdsPerformance').mockResolvedValue({
        channel: 'google',
        metrics: { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0, ctr: 0, cpc: 0, cpm: 0, cvr: 0, cpa: 0, roas: 0 },
        adCount: 0,
        activeAdCount: 0,
        lastUpdated: new Date().toISOString(),
      })

      vi.spyOn(manager as any, 'getBingAdsPerformance').mockResolvedValue({
        channel: 'bing',
        metrics: { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0, ctr: 0, cpc: 0, cpm: 0, cvr: 0, cpa: 0, roas: 0 },
        adCount: 0,
        activeAdCount: 0,
        lastUpdated: new Date().toISOString(),
      })

      vi.spyOn(manager as any, 'getTopPerformingAds').mockResolvedValue([])

      const from = '2025-10-01T00:00:00.000Z'
      const to = '2025-10-07T23:59:59.999Z'

      const summary = await manager.getDashboardSummary({ from, to })

      expect(summary.dateRange.from).toBe(from)
      expect(summary.dateRange.to).toBe(to)
    })
  })

  describe('getChannelComparison', () => {
    it('should compare channels by metrics', async () => {
      vi.spyOn(manager, 'getDashboardSummary').mockResolvedValue({
        overall: {
          impressions: 18000,
          clicks: 720,
          conversions: 72,
          spend: 360,
          revenue: 1440,
          ctr: 0.04,
          cpc: 0.5,
          cpm: 20,
          cvr: 0.1,
          cpa: 5,
          roas: 4.0,
        },
        channels: [
          {
            channel: 'house',
            metrics: {
              impressions: 10000,
              clicks: 400,
              conversions: 40,
              spend: 200,
              revenue: 800,
              ctr: 0.04,
              cpc: 0.5,
              cpm: 20,
              cvr: 0.1,
              cpa: 5,
              roas: 4.0,
            },
            adCount: 10,
            activeAdCount: 8,
            lastUpdated: new Date().toISOString(),
          },
          {
            channel: 'google',
            metrics: {
              impressions: 5000,
              clicks: 200,
              conversions: 20,
              spend: 100,
              revenue: 500, // Best ROAS
              ctr: 0.04,
              cpc: 0.5,
              cpm: 20,
              cvr: 0.1,
              cpa: 5,
              roas: 5.0, // Highest
            },
            adCount: 5,
            activeAdCount: 4,
            lastUpdated: new Date().toISOString(),
          },
          {
            channel: 'bing',
            metrics: {
              impressions: 3000,
              clicks: 120,
              conversions: 12,
              spend: 60,
              revenue: 180,
              ctr: 0.04,
              cpc: 0.5,
              cpm: 20,
              cvr: 0.1,
              cpa: 5,
              roas: 3.0,
            },
            adCount: 3,
            activeAdCount: 2,
            lastUpdated: new Date().toISOString(),
          },
        ],
        topPerformingAds: [],
        dateRange: { from: '2025-10-01', to: '2025-10-07' },
        generatedAt: new Date().toISOString(),
      })

      const comparison = await manager.getChannelComparison()

      expect(comparison.channels).toHaveLength(3)

      // Check percentages
      expect(comparison.channels[0].percentOfTotal.impressions).toBeCloseTo(55.56, 1) // 10000/18000 * 100
      expect(comparison.channels[1].percentOfTotal.impressions).toBeCloseTo(27.78, 1) // 5000/18000 * 100
      expect(comparison.channels[2].percentOfTotal.impressions).toBeCloseTo(16.67, 1) // 3000/18000 * 100

      // Winner should be Google (highest ROAS)
      expect(comparison.winner.channel).toBe('google')
      expect(comparison.winner.metric).toBe('roas')
      expect(comparison.winner.value).toBe(5.0)
      expect(comparison.winner.reason).toBe('Highest ROAS')
    })
  })

  describe('getTimeSeriesData', () => {
    it('should return time series from all channels', async () => {
      const dateRange = { from: '2025-10-01', to: '2025-10-07' }

      // Mock time series data
      vi.spyOn(manager as any, 'getHouseAdsTimeSeries').mockResolvedValue([
        {
          date: '2025-10-01',
          channel: 'house',
          metrics: {
            impressions: 1000,
            clicks: 40,
            conversions: 4,
            spend: 20,
            revenue: 80,
            ctr: 0.04,
            cpc: 0.5,
            cpm: 20,
            cvr: 0.1,
            cpa: 5,
            roas: 4.0,
          },
        },
      ])

      vi.spyOn(manager as any, 'getGoogleAdsTimeSeries').mockResolvedValue([
        {
          date: '2025-10-01',
          channel: 'google',
          metrics: {
            impressions: 500,
            clicks: 20,
            conversions: 2,
            spend: 10,
            revenue: 40,
            ctr: 0.04,
            cpc: 0.5,
            cpm: 20,
            cvr: 0.1,
            cpa: 5,
            roas: 4.0,
          },
        },
      ])

      vi.spyOn(manager as any, 'getBingAdsTimeSeries').mockResolvedValue([
        {
          date: '2025-10-01',
          channel: 'bing',
          metrics: {
            impressions: 300,
            clicks: 12,
            conversions: 1,
            spend: 6,
            revenue: 24,
            ctr: 0.04,
            cpc: 0.5,
            cpm: 20,
            cvr: 0.0833,
            cpa: 6,
            roas: 4.0,
          },
        },
      ])

      const timeSeries = await manager.getTimeSeriesData(dateRange)

      expect(timeSeries.dataPoints).toHaveLength(3)
      expect(timeSeries.dataPoints[0].channel).toBe('house')
      expect(timeSeries.dataPoints[1].channel).toBe('google')
      expect(timeSeries.dataPoints[2].channel).toBe('bing')
      expect(timeSeries.dateRange).toEqual(dateRange)
    })

    it('should sort data points by date', async () => {
      const dateRange = { from: '2025-10-01', to: '2025-10-03' }

      vi.spyOn(manager as any, 'getHouseAdsTimeSeries').mockResolvedValue([
        { date: '2025-10-03', channel: 'house', metrics: {} },
        { date: '2025-10-01', channel: 'house', metrics: {} },
        { date: '2025-10-02', channel: 'house', metrics: {} },
      ])

      vi.spyOn(manager as any, 'getGoogleAdsTimeSeries').mockResolvedValue([])
      vi.spyOn(manager as any, 'getBingAdsTimeSeries').mockResolvedValue([])

      const timeSeries = await manager.getTimeSeriesData(dateRange)

      // Should be sorted by date
      expect(timeSeries.dataPoints[0].date).toBe('2025-10-01')
      expect(timeSeries.dataPoints[1].date).toBe('2025-10-02')
      expect(timeSeries.dataPoints[2].date).toBe('2025-10-03')
    })
  })

  describe('getPerformanceBreakdown', () => {
    it('should break down performance by channel and day', async () => {
      // Mock dashboard summary
      vi.spyOn(manager, 'getDashboardSummary').mockResolvedValue({
        overall: { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0, ctr: 0, cpc: 0, cpm: 0, cvr: 0, cpa: 0, roas: 0 },
        channels: [
          {
            channel: 'house',
            metrics: { impressions: 1000, clicks: 40, conversions: 4, spend: 20, revenue: 80, ctr: 0.04, cpc: 0.5, cpm: 20, cvr: 0.1, cpa: 5, roas: 4.0 },
            adCount: 5,
            activeAdCount: 4,
            lastUpdated: new Date().toISOString(),
          },
        ],
        topPerformingAds: [],
        dateRange: { from: '2025-10-01', to: '2025-10-07' },
        generatedAt: new Date().toISOString(),
      })

      // Mock time series
      vi.spyOn(manager, 'getTimeSeriesData').mockResolvedValue({
        dataPoints: [
          {
            date: '2025-10-01',
            channel: 'house',
            metrics: { impressions: 500, clicks: 20, conversions: 2, spend: 10, revenue: 40, ctr: 0.04, cpc: 0.5, cpm: 20, cvr: 0.1, cpa: 5, roas: 4.0 },
          },
          {
            date: '2025-10-01',
            channel: 'google',
            metrics: { impressions: 300, clicks: 12, conversions: 1, spend: 6, revenue: 24, ctr: 0.04, cpc: 0.5, cpm: 20, cvr: 0.0833, cpa: 6, roas: 4.0 },
          },
        ],
        dateRange: { from: '2025-10-01', to: '2025-10-07' },
      })

      const breakdown = await manager.getPerformanceBreakdown()

      expect(breakdown.byChannel).toBeDefined()
      expect(breakdown.byDay).toBeDefined()
      expect(breakdown.byAd).toBeDefined()

      // byDay should aggregate channels
      expect(breakdown.byDay.length).toBeGreaterThan(0)
      expect(breakdown.byDay[0].date).toBe('2025-10-01')
      expect(breakdown.byDay[0].channels.house).toBeDefined()
      expect(breakdown.byDay[0].channels.google).toBeDefined()
      expect(breakdown.byDay[0].total).toBeDefined()
    })
  })

  describe('calculateMetrics', () => {
    it('should calculate all derived metrics correctly', () => {
      const raw = {
        impressions: 10000,
        clicks: 400,
        conversions: 40,
        spend: 200,
        revenue: 800,
      }

      const metrics = (manager as any).calculateMetrics(raw)

      expect(metrics.ctr).toBeCloseTo(0.04, 4) // 400/10000
      expect(metrics.cpc).toBeCloseTo(0.5, 4) // 200/400
      expect(metrics.cpm).toBeCloseTo(20, 4) // (200/10000)*1000
      expect(metrics.cvr).toBeCloseTo(0.1, 4) // 40/400
      expect(metrics.cpa).toBeCloseTo(5, 4) // 200/40
      expect(metrics.roas).toBeCloseTo(4.0, 4) // 800/200
    })

    it('should handle zero impressions', () => {
      const raw = {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        spend: 0,
        revenue: 0,
      }

      const metrics = (manager as any).calculateMetrics(raw)

      expect(metrics.ctr).toBe(0)
      expect(metrics.cpc).toBe(0)
      expect(metrics.cpm).toBe(0)
      expect(metrics.cvr).toBe(0)
      expect(metrics.cpa).toBe(0)
      expect(metrics.roas).toBe(0)
    })

    it('should handle zero clicks', () => {
      const raw = {
        impressions: 1000,
        clicks: 0,
        conversions: 0,
        spend: 0,
        revenue: 0,
      }

      const metrics = (manager as any).calculateMetrics(raw)

      expect(metrics.ctr).toBe(0)
      expect(metrics.cpc).toBe(0)
      expect(metrics.cvr).toBe(0)
    })
  })

  describe('aggregateMetrics', () => {
    it('should sum metrics from multiple sources', () => {
      const metrics1: UnifiedMetrics = {
        impressions: 1000,
        clicks: 40,
        conversions: 4,
        spend: 20,
        revenue: 80,
        ctr: 0.04,
        cpc: 0.5,
        cpm: 20,
        cvr: 0.1,
        cpa: 5,
        roas: 4.0,
      }

      const metrics2: UnifiedMetrics = {
        impressions: 500,
        clicks: 20,
        conversions: 2,
        spend: 10,
        revenue: 40,
        ctr: 0.04,
        cpc: 0.5,
        cpm: 20,
        cvr: 0.1,
        cpa: 5,
        roas: 4.0,
      }

      const aggregated = (manager as any).aggregateMetrics([metrics1, metrics2])

      expect(aggregated.impressions).toBe(1500)
      expect(aggregated.clicks).toBe(60)
      expect(aggregated.conversions).toBe(6)
      expect(aggregated.spend).toBe(30)
      expect(aggregated.revenue).toBe(120)

      // Derived metrics should be recalculated
      expect(aggregated.ctr).toBeCloseTo(0.04, 4) // 60/1500
      expect(aggregated.roas).toBeCloseTo(4.0, 4) // 120/30
    })

    it('should handle empty array', () => {
      const aggregated = (manager as any).aggregateMetrics([])

      expect(aggregated.impressions).toBe(0)
      expect(aggregated.clicks).toBe(0)
      expect(aggregated.conversions).toBe(0)
      expect(aggregated.spend).toBe(0)
      expect(aggregated.revenue).toBe(0)
    })
  })

  describe('channel performance queries', () => {
    it('should query house ads from database', async () => {
      const from = '2025-10-01T00:00:00.000Z'
      const to = '2025-10-07T23:59:59.999Z'

      const dbFirst = vi.fn().mockResolvedValue({
        ad_count: 10,
        active_ad_count: 8,
        impressions: 5000,
        clicks: 200,
        conversions: 20,
        spend: 100,
        revenue: 400,
      })

      env.ADS_DB.prepare = vi.fn(() => ({
        bind: vi.fn(() => ({
          first: dbFirst,
        })),
      })) as any

      const result = await (manager as any).getHouseAdsPerformance(from, to)

      expect(result.channel).toBe('house')
      expect(result.metrics.impressions).toBe(5000)
      expect(result.adCount).toBe(10)
      expect(result.activeAdCount).toBe(8)
      expect(dbFirst).toHaveBeenCalled()
    })

    it('should query Google ads from external metrics', async () => {
      const from = '2025-10-01T00:00:00.000Z'
      const to = '2025-10-07T23:59:59.999Z'

      const dbFirst = vi.fn().mockResolvedValue({
        ad_count: 5,
        active_ad_count: 4,
        impressions: 3000,
        clicks: 120,
        conversions: 12,
        spend: 60,
        revenue: 240,
      })

      env.ADS_DB.prepare = vi.fn(() => ({
        bind: vi.fn(() => ({
          first: dbFirst,
        })),
      })) as any

      const result = await (manager as any).getGoogleAdsPerformance(from, to)

      expect(result.channel).toBe('google')
      expect(result.metrics.impressions).toBe(3000)
      expect(dbFirst).toHaveBeenCalled()
    })

    it('should query Bing ads from external metrics', async () => {
      const from = '2025-10-01T00:00:00.000Z'
      const to = '2025-10-07T23:59:59.999Z'

      const dbFirst = vi.fn().mockResolvedValue({
        ad_count: 3,
        active_ad_count: 2,
        impressions: 2000,
        clicks: 80,
        conversions: 8,
        spend: 40,
        revenue: 160,
      })

      env.ADS_DB.prepare = vi.fn(() => ({
        bind: vi.fn(() => ({
          first: dbFirst,
        })),
      })) as any

      const result = await (manager as any).getBingAdsPerformance(from, to)

      expect(result.channel).toBe('bing')
      expect(result.metrics.impressions).toBe(2000)
      expect(dbFirst).toHaveBeenCalled()
    })
  })
})
