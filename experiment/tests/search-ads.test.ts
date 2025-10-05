/**
 * Search Ad Experimentation Tests
 */

import { describe, it, expect } from 'vitest'
import {
  SearchAdVariantType,
  createSearchAdExperiment,
  createHeadlineTest,
  createDescriptionTest,
  createKeywordTest,
  createBidTest,
  createLandingPageTest,
  createMatchTypeTest,
  createExtensionTest,
  calculateSearchAdMetrics,
  createSearchAdObservation,
  validateHeadline,
  validateDescription,
  validateKeyword,
  validateSearchAdVariant,
} from '../src/search-ads'

describe('Search Ad Experimentation', () => {
  describe('createSearchAdExperiment', () => {
    it('should create experiment with default settings', () => {
      const variants = [
        {
          type: SearchAdVariantType.Headline,
          headlines: { headline1: 'Test 1', headline2: 'Test 2' },
        },
        {
          type: SearchAdVariantType.Headline,
          headlines: { headline1: 'Test A', headline2: 'Test B' },
        },
      ]

      const { config, variants: variantConfigs } = createSearchAdExperiment(
        'Headline Test',
        SearchAdVariantType.Headline,
        variants
      )

      expect(config.name).toBe('Headline Test')
      expect(config.type).toBe('thompson_sampling') // Default
      expect(config.primaryMetric).toBe('ctr') // Default
      expect(config.trafficAllocation).toBe(1.0)
      expect(config.minSampleSize).toBe(1000)
      expect(config.significanceThreshold).toBe(0.95)
      expect(config.autoPromoteWinner).toBe(true)

      expect(variantConfigs).toHaveLength(2)
      expect(variantConfigs[0].isControl).toBe(true)
      expect(variantConfigs[1].isControl).toBe(false)
    })

    it('should support custom options', () => {
      const variants = [
        {
          type: SearchAdVariantType.Bid,
          bid: 2.0,
        },
      ]

      const { config } = createSearchAdExperiment('Bid Test', SearchAdVariantType.Bid, variants, {
        experimentType: 'ab_test',
        primaryMetric: 'roas',
        trafficAllocation: 0.5,
        minSampleSize: 5000,
        autoPromoteWinner: false,
        metadata: { campaign: 'test-campaign' },
      })

      expect(config.type).toBe('ab_test')
      expect(config.primaryMetric).toBe('roas')
      expect(config.trafficAllocation).toBe(0.5)
      expect(config.minSampleSize).toBe(5000)
      expect(config.autoPromoteWinner).toBe(false)
      expect(config.metadata?.campaign).toBe('test-campaign')
    })

    it('should include secondary metrics', () => {
      const variants = [
        {
          type: SearchAdVariantType.Headline,
          headlines: { headline1: 'Test', headline2: 'Test' },
        },
      ]

      const { config } = createSearchAdExperiment('Test', SearchAdVariantType.Headline, variants)

      expect(config.secondaryMetrics).toContain('clicks')
      expect(config.secondaryMetrics).toContain('conversions')
      expect(config.secondaryMetrics).toContain('spend')
      expect(config.secondaryMetrics).toContain('cpc')
      expect(config.secondaryMetrics).toContain('cvr')
      expect(config.secondaryMetrics).toContain('roas')
      expect(config.secondaryMetrics).toContain('quality_score')
    })
  })

  describe('createHeadlineTest', () => {
    it('should create headline experiment', () => {
      const headlines = [
        { headline1: 'Buy Now', headline2: 'Save 50%' },
        { headline1: 'Shop Today', headline2: 'Huge Savings' },
        { headline1: 'Limited Offer', headline2: 'Don't Miss Out', headline3: 'Act Fast' },
      ]

      const { config, variants } = createHeadlineTest('Headline Test', headlines)

      expect(config.name).toBe('Headline Test')
      expect(config.primaryMetric).toBe('ctr')
      expect(variants).toHaveLength(3)

      expect(variants[0].name).toBe('Headlines 1')
      expect(variants[0].config.headlines?.headline1).toBe('Buy Now')

      expect(variants[2].config.headlines?.headline3).toBe('Act Fast')
    })

    it('should support custom options', () => {
      const headlines = [
        { headline1: 'Test 1', headline2: 'Test 2' },
        { headline1: 'Test A', headline2: 'Test B' },
      ]

      const { config } = createHeadlineTest('Test', headlines, {
        trafficAllocation: 0.8,
        minSampleSize: 2000,
      })

      expect(config.trafficAllocation).toBe(0.8)
      expect(config.minSampleSize).toBe(2000)
    })
  })

  describe('createDescriptionTest', () => {
    it('should create description experiment', () => {
      const descriptions = [
        { description1: 'Get 50% off on all items today' },
        { description1: 'Limited time offer', description2: 'Free shipping included' },
      ]

      const { config, variants } = createDescriptionTest('Description Test', descriptions)

      expect(config.name).toBe('Description Test')
      expect(config.primaryMetric).toBe('ctr')
      expect(variants).toHaveLength(2)

      expect(variants[0].config.descriptions?.description1).toBe('Get 50% off on all items today')
      expect(variants[1].config.descriptions?.description2).toBe('Free shipping included')
    })
  })

  describe('createKeywordTest', () => {
    it('should create keyword experiment', () => {
      const keywordGroups = [
        [
          { keyword: 'buy shoes', matchType: 'exact' as const, bid: 2.5 },
          { keyword: 'purchase shoes', matchType: 'phrase' as const, bid: 2.0 },
        ],
        [
          { keyword: 'shoe store', matchType: 'broad' as const, bid: 1.5 },
          { keyword: 'footwear', matchType: 'exact' as const, bid: 3.0 },
        ],
      ]

      const { config, variants } = createKeywordTest('Keyword Test', keywordGroups)

      expect(config.name).toBe('Keyword Test')
      expect(config.primaryMetric).toBe('cvr')
      expect(variants).toHaveLength(2)

      expect(variants[0].config.keywords).toHaveLength(2)
      expect(variants[0].config.keywords?.[0].keyword).toBe('buy shoes')
      expect(variants[0].config.keywords?.[0].matchType).toBe('exact')
      expect(variants[0].config.keywords?.[0].bid).toBe(2.5)
    })
  })

  describe('createBidTest', () => {
    it('should create bid experiment', () => {
      const bids = [2.0, 2.5, 3.0, 3.5]

      const { config, variants } = createBidTest('Bid Test', bids)

      expect(config.name).toBe('Bid Test')
      expect(config.primaryMetric).toBe('roas')
      expect(variants).toHaveLength(4)

      expect(variants[0].name).toBe('Bid $2')
      expect(variants[0].config.bid).toBe(2.0)

      expect(variants[3].name).toBe('Bid $3.5')
      expect(variants[3].config.bid).toBe(3.5)
    })
  })

  describe('createLandingPageTest', () => {
    it('should create landing page experiment', () => {
      const landingPages = [
        { url: 'https://example.com/sale', path1: 'summer', path2: 'sale' },
        { url: 'https://example.com/discount', path1: 'special', path2: 'offer' },
      ]

      const { config, variants } = createLandingPageTest('Landing Page Test', landingPages)

      expect(config.name).toBe('Landing Page Test')
      expect(config.primaryMetric).toBe('cvr')
      expect(variants).toHaveLength(2)

      expect(variants[0].config.landingPage?.url).toBe('https://example.com/sale')
      expect(variants[0].config.landingPage?.path1).toBe('summer')
      expect(variants[0].config.landingPage?.path2).toBe('sale')
    })
  })

  describe('createMatchTypeTest', () => {
    it('should create match type experiment', () => {
      const keyword = 'running shoes'
      const matchTypes: Array<'exact' | 'phrase' | 'broad'> = ['exact', 'phrase', 'broad']

      const { config, variants } = createMatchTypeTest('Match Type Test', keyword, matchTypes)

      expect(config.name).toBe('Match Type Test')
      expect(config.primaryMetric).toBe('ctr')
      expect(variants).toHaveLength(3)

      expect(variants[0].name).toBe('exact match')
      expect(variants[0].config.matchType).toBe('exact')
      expect(variants[0].config.keywords?.[0].keyword).toBe('running shoes')

      expect(variants[2].name).toBe('broad match')
      expect(variants[2].config.matchType).toBe('broad')
    })
  })

  describe('createExtensionTest', () => {
    it('should create extension experiment', () => {
      const extensionConfigs = [
        [
          { type: 'sitelink' as const, config: { text: 'Shop Now', url: 'https://example.com/shop' } },
          { type: 'callout' as const, config: { text: 'Free Shipping' } },
        ],
        [
          { type: 'sitelink' as const, config: { text: 'Learn More', url: 'https://example.com/learn' } },
          { type: 'call' as const, config: { phoneNumber: '1-800-123-4567' } },
          { type: 'location' as const, config: { address: '123 Main St' } },
        ],
      ]

      const { config, variants } = createExtensionTest('Extension Test', extensionConfigs)

      expect(config.name).toBe('Extension Test')
      expect(config.primaryMetric).toBe('ctr')
      expect(variants).toHaveLength(2)

      expect(variants[0].config.extensions).toHaveLength(2)
      expect(variants[0].config.extensions?.[0].type).toBe('sitelink')

      expect(variants[1].config.extensions).toHaveLength(3)
      expect(variants[1].config.extensions?.[2].type).toBe('location')
    })
  })

  describe('calculateSearchAdMetrics', () => {
    it('should calculate all derived metrics', () => {
      const raw = {
        impressions: 10000,
        clicks: 400,
        conversions: 40,
        spend: 200,
        revenue: 800,
        qualityScore: 8,
        averagePosition: 2.5,
      }

      const metrics = calculateSearchAdMetrics(raw)

      expect(metrics.impressions).toBe(10000)
      expect(metrics.clicks).toBe(400)
      expect(metrics.conversions).toBe(40)
      expect(metrics.spend).toBe(200)
      expect(metrics.revenue).toBe(800)

      expect(metrics.ctr).toBeCloseTo(0.04, 4) // 400/10000
      expect(metrics.cpc).toBeCloseTo(0.5, 4) // 200/400
      expect(metrics.cvr).toBeCloseTo(0.1, 4) // 40/400
      expect(metrics.cpa).toBeCloseTo(5, 4) // 200/40
      expect(metrics.roas).toBeCloseTo(4.0, 4) // 800/200

      expect(metrics.qualityScore).toBe(8)
      expect(metrics.averagePosition).toBe(2.5)
    })

    it('should handle zero impressions', () => {
      const raw = {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        spend: 0,
        revenue: 0,
      }

      const metrics = calculateSearchAdMetrics(raw)

      expect(metrics.ctr).toBe(0)
      expect(metrics.cpc).toBe(0)
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

      const metrics = calculateSearchAdMetrics(raw)

      expect(metrics.ctr).toBe(0)
      expect(metrics.cpc).toBe(0)
      expect(metrics.cvr).toBe(0)
    })

    it('should handle zero conversions', () => {
      const raw = {
        impressions: 1000,
        clicks: 50,
        conversions: 0,
        spend: 25,
        revenue: 0,
      }

      const metrics = calculateSearchAdMetrics(raw)

      expect(metrics.ctr).toBeCloseTo(0.05, 4)
      expect(metrics.cpc).toBeCloseTo(0.5, 4)
      expect(metrics.cvr).toBe(0)
      expect(metrics.cpa).toBe(0)
      expect(metrics.roas).toBe(0)
    })
  })

  describe('createSearchAdObservation', () => {
    it('should create observation with all fields', () => {
      const observation = createSearchAdObservation(
        'assignment-123',
        'experiment-456',
        'variant-789',
        'click',
        1,
        { searchQuery: 'running shoes', device: 'mobile' }
      )

      expect(observation.assignmentId).toBe('assignment-123')
      expect(observation.experimentId).toBe('experiment-456')
      expect(observation.variantId).toBe('variant-789')
      expect(observation.metric).toBe('click')
      expect(observation.value).toBe(1)
      expect(observation.timestamp).toBeDefined()
      expect(observation.metadata?.searchQuery).toBe('running shoes')
      expect(observation.metadata?.device).toBe('mobile')
    })

    it('should generate unique IDs', () => {
      const obs1 = createSearchAdObservation('a', 'b', 'c', 'impression', 1)
      const obs2 = createSearchAdObservation('a', 'b', 'c', 'impression', 1)

      expect(obs1.id).not.toBe(obs2.id)
    })
  })

  describe('validateHeadline', () => {
    it('should accept valid headlines', () => {
      const result = validateHeadline('Buy Running Shoes Today')

      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should reject empty headlines', () => {
      const result = validateHeadline('')

      expect(result.valid).toBe(false)
      expect(result.error).toContain('empty')
    })

    it('should reject headlines over 30 characters', () => {
      const result = validateHeadline('This is a very long headline that exceeds thirty characters')

      expect(result.valid).toBe(false)
      expect(result.error).toContain('exceeds 30 characters')
    })

    it('should support custom max length', () => {
      const result = validateHeadline('Test', 3)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('exceeds 3 characters')
    })

    it('should reject whitespace-only headlines', () => {
      const result = validateHeadline('   ')

      expect(result.valid).toBe(false)
      expect(result.error).toContain('empty')
    })

    it('should accept headlines at exactly max length', () => {
      const result = validateHeadline('A'.repeat(30))

      expect(result.valid).toBe(true)
    })
  })

  describe('validateDescription', () => {
    it('should accept valid descriptions', () => {
      const result = validateDescription('Get 50% off on all running shoes. Free shipping on orders over $50.')

      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should reject empty descriptions', () => {
      const result = validateDescription('')

      expect(result.valid).toBe(false)
      expect(result.error).toContain('empty')
    })

    it('should reject descriptions over 90 characters', () => {
      const result = validateDescription('A'.repeat(91))

      expect(result.valid).toBe(false)
      expect(result.error).toContain('exceeds 90 characters')
    })

    it('should support custom max length', () => {
      const result = validateDescription('Test', 3)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('exceeds 3 characters')
    })

    it('should accept descriptions at exactly max length', () => {
      const result = validateDescription('A'.repeat(90))

      expect(result.valid).toBe(true)
    })
  })

  describe('validateKeyword', () => {
    it('should accept valid keywords', () => {
      const validKeywords = [
        'running shoes',
        'buy-now',
        'best+deals',
        '[exact match]',
        '"phrase match"',
        'single',
      ]

      validKeywords.forEach((kw) => {
        const result = validateKeyword(kw)
        expect(result.valid).toBe(true)
      })
    })

    it('should reject empty keywords', () => {
      const result = validateKeyword('')

      expect(result.valid).toBe(false)
      expect(result.error).toContain('empty')
    })

    it('should reject keywords over 80 characters', () => {
      const result = validateKeyword('A'.repeat(81))

      expect(result.valid).toBe(false)
      expect(result.error).toContain('exceeds 80 characters')
    })

    it('should reject keywords with invalid characters', () => {
      const invalidKeywords = ['test!', 'test@domain', 'test#tag', 'test$price', 'test%off']

      invalidKeywords.forEach((kw) => {
        const result = validateKeyword(kw)
        expect(result.valid).toBe(false)
        expect(result.error).toContain('invalid characters')
      })
    })

    it('should accept keywords at exactly max length', () => {
      const result = validateKeyword('A'.repeat(80))

      expect(result.valid).toBe(true)
    })
  })

  describe('validateSearchAdVariant', () => {
    it('should validate headline variant', () => {
      const variant = {
        type: SearchAdVariantType.Headline,
        headlines: {
          headline1: 'Buy Now',
          headline2: 'Save 50%',
          headline3: 'Limited Time',
        },
      }

      const result = validateSearchAdVariant(variant)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject headline variant with invalid headlines', () => {
      const variant = {
        type: SearchAdVariantType.Headline,
        headlines: {
          headline1: '', // Empty
          headline2: 'A'.repeat(40), // Too long
        },
      }

      const result = validateSearchAdVariant(variant)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Headline 1: Headline cannot be empty')
      expect(result.errors.some((e) => e.includes('Headline 2'))).toBe(true)
    })

    it('should reject headline variant without headlines', () => {
      const variant = {
        type: SearchAdVariantType.Headline,
      }

      const result = validateSearchAdVariant(variant)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Headlines are required for headline test')
    })

    it('should validate description variant', () => {
      const variant = {
        type: SearchAdVariantType.Description,
        descriptions: {
          description1: 'Get 50% off on all items',
          description2: 'Free shipping',
        },
      }

      const result = validateSearchAdVariant(variant)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject description variant with invalid descriptions', () => {
      const variant = {
        type: SearchAdVariantType.Description,
        descriptions: {
          description1: 'A'.repeat(100), // Too long
        },
      }

      const result = validateSearchAdVariant(variant)

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('Description 1'))).toBe(true)
    })

    it('should validate keyword variant', () => {
      const variant = {
        type: SearchAdVariantType.Keywords,
        keywords: [
          { keyword: 'running shoes', matchType: 'exact' as const },
          { keyword: 'buy shoes', matchType: 'phrase' as const, bid: 2.5 },
        ],
      }

      const result = validateSearchAdVariant(variant)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject keyword variant with invalid keywords', () => {
      const variant = {
        type: SearchAdVariantType.Keywords,
        keywords: [
          { keyword: 'test!@#', matchType: 'exact' as const }, // Invalid characters
          { keyword: '', matchType: 'phrase' as const }, // Empty
        ],
      }

      const result = validateSearchAdVariant(variant)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should reject keyword variant without keywords', () => {
      const variant = {
        type: SearchAdVariantType.Keywords,
        keywords: [],
      }

      const result = validateSearchAdVariant(variant)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('At least one keyword is required for keyword test')
    })

    it('should validate bid variant', () => {
      const variant = {
        type: SearchAdVariantType.Bid,
        bid: 2.5,
      }

      const result = validateSearchAdVariant(variant)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject bid variant with invalid bid', () => {
      const invalidBids = [
        { type: SearchAdVariantType.Bid, bid: 0 },
        { type: SearchAdVariantType.Bid, bid: -5 },
        { type: SearchAdVariantType.Bid },
      ]

      invalidBids.forEach((variant) => {
        const result = validateSearchAdVariant(variant as any)
        expect(result.valid).toBe(false)
        expect(result.errors).toContain('Valid bid amount is required for bid test')
      })
    })

    it('should validate landing page variant', () => {
      const variant = {
        type: SearchAdVariantType.LandingPage,
        landingPage: {
          url: 'https://example.com/sale',
          path1: 'summer',
          path2: 'sale',
        },
      }

      const result = validateSearchAdVariant(variant)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject landing page variant without URL', () => {
      const variants = [
        { type: SearchAdVariantType.LandingPage },
        { type: SearchAdVariantType.LandingPage, landingPage: { path1: 'test' } },
      ]

      variants.forEach((variant) => {
        const result = validateSearchAdVariant(variant as any)
        expect(result.valid).toBe(false)
        expect(result.errors).toContain('Landing page URL is required for landing page test')
      })
    })
  })
})
