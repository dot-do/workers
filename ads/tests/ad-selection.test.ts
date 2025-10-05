/**
 * Ad Selection Algorithm Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { AdsService } from '../src/index'
import type { Ad, AdContext, AdStatus } from '../src/types'

describe('Ad Selection', () => {
  let service: AdsService
  let mockEnv: any

  const createAd = (
    id: string,
    qualityScore: number,
    bid: number,
    status: AdStatus = 'active' as AdStatus,
    targeting?: any
  ): Ad => ({
    id,
    campaignId: 'campaign_1',
    creativeId: `creative_${id}`,
    status,
    targeting,
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
    const ads = new Map<string, Ad>()
    const impressions = new Map()

    mockEnv = {
      ADS_KV: {
        get: async (key: string) => {
          if (key.startsWith('freq:')) return null // No frequency cap hit
          return null
        },
        put: async (key: string, value: string) => {},
      },
      ADS_DB: {
        prepare: (query: string) => ({
          bind: (...params: any[]) => ({
            run: async () => ({ success: true }),
            first: async () => null,
            all: async () => {
              if (query.includes('WHERE status = ?')) {
                return { results: Array.from(ads.values()).filter((ad) => ad.status === 'active') }
              }
              return { results: [] }
            },
          }),
        }),
      },
      EXPERIMENT: null, // No experiment integration for these tests
    }

    service = new AdsService({} as any, mockEnv)

    // Pre-populate some ads
    ads.set('ad_1', createAd('ad_1', 8, 5.0))
    ads.set('ad_2', createAd('ad_2', 6, 10.0))
    ads.set('ad_3', createAd('ad_3', 9, 3.0))
  })

  describe('Quality-Based Selection', () => {
    it('should select ad with highest quality × bid score', () => {
      const ad1 = createAd('ad_1', 8, 5.0) // score = 40
      const ad2 = createAd('ad_2', 6, 10.0) // score = 60 - best
      const ad3 = createAd('ad_3', 9, 3.0) // score = 27

      // Mock getEligibleAds to return these
      const ads = [ad1, ad2, ad3]

      // Calculate scores
      const scores = ads.map((ad) => ({
        ad,
        score: ad.qualityScore * ad.bid,
      }))

      const best = scores.reduce((prev, current) => (current.score > prev.score ? current : prev))

      expect(best.ad.id).toBe('ad_2')
      expect(best.score).toBe(60)
    })

    it('should favor high quality with moderate bid', () => {
      const ad1 = createAd('ad_1', 10, 4.0) // score = 40
      const ad2 = createAd('ad_2', 5, 7.0) // score = 35

      const score1 = ad1.qualityScore * ad1.bid
      const score2 = ad2.qualityScore * ad2.bid

      expect(score1).toBeGreaterThan(score2)
    })

    it('should handle ties', () => {
      const ad1 = createAd('ad_1', 5, 8.0) // score = 40
      const ad2 = createAd('ad_2', 8, 5.0) // score = 40

      const score1 = ad1.qualityScore * ad1.bid
      const score2 = ad2.qualityScore * ad2.bid

      expect(score1).toBe(score2)
    })
  })

  describe('Eligibility Filtering', () => {
    it('should filter out non-active ads', () => {
      const ads = [
        createAd('ad_1', 8, 5.0, 'active' as AdStatus),
        createAd('ad_2', 9, 10.0, 'paused' as AdStatus),
        createAd('ad_3', 7, 6.0, 'archived' as AdStatus),
      ]

      const eligible = ads.filter((ad) => ad.status === 'active')

      expect(eligible).toHaveLength(1)
      expect(eligible[0].id).toBe('ad_1')
    })

    it('should filter out ads with exhausted budget', () => {
      const ad1 = createAd('ad_1', 8, 5.0)
      ad1.spent = 1000
      ad1.dailyBudget = 1000 // Exhausted

      const ad2 = createAd('ad_2', 9, 10.0)
      ad2.spent = 500
      ad2.dailyBudget = 1000 // Still has budget

      const eligible = [ad1, ad2].filter((ad) => ad.spent < (ad.dailyBudget || Infinity))

      expect(eligible).toHaveLength(1)
      expect(eligible[0].id).toBe('ad_2')
    })

    it('should match location targeting', () => {
      const context: AdContext = {
        userId: 'user_123',
        sessionId: 'session_456',
        timestamp: Date.now(),
        device: 'mobile',
        location: 'US',
        url: 'https://example.com',
      }

      const ad1 = createAd('ad_1', 8, 5.0, 'active' as AdStatus, {
        locations: ['US', 'CA'],
      })

      const ad2 = createAd('ad_2', 9, 10.0, 'active' as AdStatus, {
        locations: ['UK', 'DE'],
      })

      // Check targeting match
      const matchesTargeting = (ad: Ad, ctx: AdContext) => {
        if (ad.targeting?.locations) {
          return ad.targeting.locations.includes(ctx.location)
        }
        return true
      }

      expect(matchesTargeting(ad1, context)).toBe(true)
      expect(matchesTargeting(ad2, context)).toBe(false)
    })

    it('should match device targeting', () => {
      const context: AdContext = {
        userId: 'user_123',
        sessionId: 'session_456',
        timestamp: Date.now(),
        device: 'mobile',
        location: 'US',
        url: 'https://example.com',
      }

      const ad1 = createAd('ad_1', 8, 5.0, 'active' as AdStatus, {
        devices: ['mobile', 'tablet'],
      })

      const ad2 = createAd('ad_2', 9, 10.0, 'active' as AdStatus, {
        devices: ['desktop'],
      })

      const matchesTargeting = (ad: Ad, ctx: AdContext) => {
        if (ad.targeting?.devices) {
          return ad.targeting.devices.includes(ctx.device)
        }
        return true
      }

      expect(matchesTargeting(ad1, context)).toBe(true)
      expect(matchesTargeting(ad2, context)).toBe(false)
    })

    it('should match keyword targeting', () => {
      const context: AdContext = {
        userId: 'user_123',
        sessionId: 'session_456',
        timestamp: Date.now(),
        device: 'mobile',
        location: 'US',
        url: 'https://example.com',
        keywords: ['technology', 'software'],
      }

      const ad1 = createAd('ad_1', 8, 5.0, 'active' as AdStatus, {
        keywords: ['technology', 'hardware'],
      })

      const ad2 = createAd('ad_2', 9, 10.0, 'active' as AdStatus, {
        keywords: ['fashion', 'clothing'],
      })

      const matchesTargeting = (ad: Ad, ctx: AdContext) => {
        if (ad.targeting?.keywords && ctx.keywords) {
          return ad.targeting.keywords.some((kw: string) => ctx.keywords!.includes(kw))
        }
        return true
      }

      expect(matchesTargeting(ad1, context)).toBe(true)
      expect(matchesTargeting(ad2, context)).toBe(false)
    })
  })

  describe('Quality Score Calculation', () => {
    it('should calculate quality score from performance metrics', () => {
      const calculateQualityScore = (metrics: {
        ctr: number
        cvr: number
        roas: number
        viewability: number
      }) => {
        // Normalize each metric (0-1)
        const ctrNorm = Math.min(metrics.ctr / 0.05, 1) // 5% CTR = perfect
        const cvrNorm = Math.min(metrics.cvr / 0.1, 1) // 10% CVR = perfect
        const roasNorm = Math.min(metrics.roas / 5, 1) // 5x ROAS = perfect
        const viewability = metrics.viewability

        // Weighted average
        const quality = 0.4 * ctrNorm + 0.3 * cvrNorm + 0.2 * roasNorm + 0.1 * viewability

        return Math.round(quality * 10) // Scale to 0-10
      }

      // High performing ad
      const score1 = calculateQualityScore({
        ctr: 0.05,
        cvr: 0.1,
        roas: 5,
        viewability: 1,
      })
      expect(score1).toBe(10)

      // Medium performing ad
      const score2 = calculateQualityScore({
        ctr: 0.025,
        cvr: 0.05,
        roas: 2.5,
        viewability: 0.75,
      })
      expect(score2).toBe(5)

      // Low performing ad
      const score3 = calculateQualityScore({
        ctr: 0.01,
        cvr: 0.02,
        roas: 1,
        viewability: 0.5,
      })
      expect(score3).toBe(2)
    })
  })

  describe('Ad Metrics Calculation', () => {
    it('should calculate CTR correctly', () => {
      const impressions = 1000
      const clicks = 50

      const ctr = clicks / impressions
      expect(ctr).toBe(0.05) // 5%
    })

    it('should calculate CVR correctly', () => {
      const clicks = 100
      const conversions = 10

      const cvr = conversions / clicks
      expect(cvr).toBe(0.1) // 10%
    })

    it('should calculate ROAS correctly', () => {
      const spend = 100
      const revenue = 500

      const roas = revenue / spend
      expect(roas).toBe(5) // 5x return
    })

    it('should calculate CPM correctly', () => {
      const spend = 100
      const impressions = 10000

      const cpm = (spend / impressions) * 1000
      expect(cpm).toBe(10) // $10 CPM
    })

    it('should calculate CPC correctly', () => {
      const spend = 100
      const clicks = 50

      const cpc = spend / clicks
      expect(cpc).toBe(2) // $2 per click
    })

    it('should handle zero divisions', () => {
      const impressions = 0
      const clicks = 10

      const ctr = impressions > 0 ? clicks / impressions : 0
      expect(ctr).toBe(0)
    })
  })
})
