/**
 * Search Ad Experimentation
 * Specialized experiment types and helpers for search advertising
 */

import type { VariantConfig, ExperimentConfig, ExperimentType, AssignmentContext, Observation } from './types'

/**
 * Search Ad Variant Type
 * What aspect of the search ad to test
 */
export enum SearchAdVariantType {
  /** Test different headlines */
  Headline = 'headline',
  /** Test different descriptions */
  Description = 'description',
  /** Test different keyword lists */
  Keywords = 'keywords',
  /** Test different bid amounts */
  Bid = 'bid',
  /** Test different landing pages */
  LandingPage = 'landing_page',
  /** Test different ad extensions */
  Extensions = 'extensions',
  /** Test different match types */
  MatchType = 'match_type',
  /** Test complete ad variations */
  FullAd = 'full_ad',
}

/**
 * Search Ad Variant Configuration
 */
export interface SearchAdVariantConfig {
  /** Variant type */
  type: SearchAdVariantType

  /** For headline testing */
  headlines?: {
    headline1: string
    headline2: string
    headline3?: string
  }

  /** For description testing */
  descriptions?: {
    description1: string
    description2?: string
  }

  /** For keyword testing */
  keywords?: Array<{
    keyword: string
    matchType: 'exact' | 'phrase' | 'broad'
    bid?: number
  }>

  /** For bid testing */
  bid?: number

  /** For landing page testing */
  landingPage?: {
    url: string
    path1?: string
    path2?: string
  }

  /** For extension testing */
  extensions?: Array<{
    type: 'sitelink' | 'callout' | 'structured_snippet' | 'call' | 'location' | 'price' | 'promotion' | 'image'
    config: Record<string, any>
  }>

  /** For match type testing */
  matchType?: 'exact' | 'phrase' | 'broad'

  /** For full ad testing */
  fullAd?: {
    headlines: {
      headline1: string
      headline2: string
      headline3?: string
    }
    descriptions: {
      description1: string
      description2?: string
    }
    landingPage: {
      url: string
      path1?: string
      path2?: string
    }
    keywords: Array<{
      keyword: string
      matchType: 'exact' | 'phrase' | 'broad'
      bid?: number
    }>
    extensions?: any[]
  }

  /** Additional metadata */
  metadata?: Record<string, any>
}

/**
 * Search Ad Experiment Metrics
 */
export interface SearchAdMetrics {
  /** Standard metrics */
  impressions: number
  clicks: number
  conversions: number
  spend: number
  revenue: number

  /** Calculated metrics */
  ctr: number // Click-through rate
  cpc: number // Cost per click
  cvr: number // Conversion rate
  cpa: number // Cost per acquisition
  roas: number // Return on ad spend

  /** Quality metrics */
  qualityScore?: number // 1-10 from platform
  averagePosition?: number
  impressionShare?: number

  /** Search-specific */
  searchImpressions?: number
  displayImpressions?: number
  topImpressionRate?: number
  absoluteTopImpressionRate?: number
}

/**
 * Search Ad Assignment Context
 * Extended context for search ads
 */
export interface SearchAdContext extends AssignmentContext {
  /** Search query that triggered the ad */
  searchQuery?: string

  /** User's location */
  location?: string

  /** Device type */
  device: 'mobile' | 'desktop' | 'tablet'

  /** Time of day (0-23) */
  hourOfDay?: number

  /** Day of week (0-6, Sunday-Saturday) */
  dayOfWeek?: number

  /** Network (search, display, search_partners) */
  network?: 'search' | 'display' | 'search_partners'

  /** Additional targeting context */
  targeting?: {
    age?: string
    gender?: string
    income?: string
  }
}

/**
 * Create Search Ad Experiment
 * Helper function to create a search ad experiment with proper config
 */
export function createSearchAdExperiment(
  name: string,
  variantType: SearchAdVariantType,
  variants: SearchAdVariantConfig[],
  options: {
    experimentType?: ExperimentType
    primaryMetric?: 'ctr' | 'cvr' | 'roas' | 'cpa'
    trafficAllocation?: number
    minSampleSize?: number
    autoPromoteWinner?: boolean
    metadata?: Record<string, any>
  } = {}
): { config: ExperimentConfig; variants: VariantConfig[] } {
  // Default to Thompson Sampling for search ads (balances exploration/exploitation)
  const experimentType = options.experimentType || 'thompson_sampling'

  // Default to CTR as primary metric (most common for search ads)
  const primaryMetric = options.primaryMetric || 'ctr'

  // Secondary metrics for comprehensive analysis
  const secondaryMetrics = ['clicks', 'conversions', 'spend', 'cpc', 'cvr', 'roas', 'quality_score']

  const config: ExperimentConfig = {
    name,
    type: experimentType,
    hypothesis: `Testing ${variantType} variations to improve ${primaryMetric}`,
    primaryMetric,
    secondaryMetrics,
    trafficAllocation: options.trafficAllocation || 1.0,
    minSampleSize: options.minSampleSize || 1000, // Default 1000 impressions per variant
    significanceThreshold: 0.95,
    autoPromoteWinner: options.autoPromoteWinner !== false, // Default true
    metadata: {
      variantType,
      ...options.metadata,
    },
  }

  const variantConfigs: VariantConfig[] = variants.map((v, index) => ({
    name: v.metadata?.name || `Variant ${index + 1}`,
    description: v.metadata?.description,
    isControl: index === 0, // First variant is control
    config: v,
  }))

  return { config, variants: variantConfigs }
}

/**
 * Calculate Search Ad Metrics
 * Helper to calculate all derived metrics from raw data
 */
export function calculateSearchAdMetrics(raw: {
  impressions: number
  clicks: number
  conversions: number
  spend: number
  revenue: number
  qualityScore?: number
  averagePosition?: number
}): SearchAdMetrics {
  const ctr = raw.impressions > 0 ? raw.clicks / raw.impressions : 0
  const cpc = raw.clicks > 0 ? raw.spend / raw.clicks : 0
  const cvr = raw.clicks > 0 ? raw.conversions / raw.clicks : 0
  const cpa = raw.conversions > 0 ? raw.spend / raw.conversions : 0
  const roas = raw.spend > 0 ? raw.revenue / raw.spend : 0

  return {
    impressions: raw.impressions,
    clicks: raw.clicks,
    conversions: raw.conversions,
    spend: raw.spend,
    revenue: raw.revenue,
    ctr,
    cpc,
    cvr,
    cpa,
    roas,
    qualityScore: raw.qualityScore,
    averagePosition: raw.averagePosition,
  }
}

/**
 * Record Search Ad Observation
 * Helper to create observations for search ad experiments
 */
export function createSearchAdObservation(
  assignmentId: string,
  experimentId: string,
  variantId: string,
  event: 'impression' | 'click' | 'conversion',
  value: number,
  metadata?: Record<string, any>
): Observation {
  return {
    id: crypto.randomUUID(),
    assignmentId,
    experimentId,
    variantId,
    metric: event,
    value,
    timestamp: new Date().toISOString(),
    metadata,
  }
}

/**
 * Search Ad Experiment Templates
 */

/**
 * Headline Test Template
 */
export function createHeadlineTest(
  name: string,
  headlines: Array<{ headline1: string; headline2: string; headline3?: string }>,
  options?: { trafficAllocation?: number; minSampleSize?: number }
): { config: ExperimentConfig; variants: VariantConfig[] } {
  const variants: SearchAdVariantConfig[] = headlines.map((h, index) => ({
    type: SearchAdVariantType.Headline,
    headlines: h,
    metadata: {
      name: `Headlines ${index + 1}`,
      description: `${h.headline1} | ${h.headline2}${h.headline3 ? ` | ${h.headline3}` : ''}`,
    },
  }))

  return createSearchAdExperiment(name, SearchAdVariantType.Headline, variants, {
    primaryMetric: 'ctr',
    ...options,
  })
}

/**
 * Description Test Template
 */
export function createDescriptionTest(
  name: string,
  descriptions: Array<{ description1: string; description2?: string }>,
  options?: { trafficAllocation?: number; minSampleSize?: number }
): { config: ExperimentConfig; variants: VariantConfig[] } {
  const variants: SearchAdVariantConfig[] = descriptions.map((d, index) => ({
    type: SearchAdVariantType.Description,
    descriptions: d,
    metadata: {
      name: `Description ${index + 1}`,
      description: `${d.description1}${d.description2 ? ` | ${d.description2}` : ''}`,
    },
  }))

  return createSearchAdExperiment(name, SearchAdVariantType.Description, variants, {
    primaryMetric: 'ctr',
    ...options,
  })
}

/**
 * Keyword Test Template
 */
export function createKeywordTest(
  name: string,
  keywordGroups: Array<
    Array<{
      keyword: string
      matchType: 'exact' | 'phrase' | 'broad'
      bid?: number
    }>
  >,
  options?: { trafficAllocation?: number; minSampleSize?: number }
): { config: ExperimentConfig; variants: VariantConfig[] } {
  const variants: SearchAdVariantConfig[] = keywordGroups.map((keywords, index) => ({
    type: SearchAdVariantType.Keywords,
    keywords,
    metadata: {
      name: `Keyword Group ${index + 1}`,
      description: `${keywords.length} keywords`,
    },
  }))

  return createSearchAdExperiment(name, SearchAdVariantType.Keywords, variants, {
    primaryMetric: 'cvr',
    ...options,
  })
}

/**
 * Bid Test Template
 */
export function createBidTest(
  name: string,
  bids: number[],
  options?: { trafficAllocation?: number; minSampleSize?: number }
): { config: ExperimentConfig; variants: VariantConfig[] } {
  const variants: SearchAdVariantConfig[] = bids.map((bid, index) => ({
    type: SearchAdVariantType.Bid,
    bid,
    metadata: {
      name: `Bid $${bid}`,
      description: `CPC bid of $${bid}`,
    },
  }))

  return createSearchAdExperiment(name, SearchAdVariantType.Bid, variants, {
    primaryMetric: 'roas',
    ...options,
  })
}

/**
 * Landing Page Test Template
 */
export function createLandingPageTest(
  name: string,
  landingPages: Array<{ url: string; path1?: string; path2?: string }>,
  options?: { trafficAllocation?: number; minSampleSize?: number }
): { config: ExperimentConfig; variants: VariantConfig[] } {
  const variants: SearchAdVariantConfig[] = landingPages.map((lp, index) => ({
    type: SearchAdVariantType.LandingPage,
    landingPage: lp,
    metadata: {
      name: `Landing Page ${index + 1}`,
      description: lp.url,
    },
  }))

  return createSearchAdExperiment(name, SearchAdVariantType.LandingPage, variants, {
    primaryMetric: 'cvr',
    ...options,
  })
}

/**
 * Match Type Test Template
 */
export function createMatchTypeTest(
  name: string,
  keyword: string,
  matchTypes: Array<'exact' | 'phrase' | 'broad'>,
  options?: { trafficAllocation?: number; minSampleSize?: number }
): { config: ExperimentConfig; variants: VariantConfig[] } {
  const variants: SearchAdVariantConfig[] = matchTypes.map((matchType, index) => ({
    type: SearchAdVariantType.MatchType,
    keywords: [{ keyword, matchType }],
    matchType,
    metadata: {
      name: `${matchType} match`,
      description: `${keyword} (${matchType})`,
    },
  }))

  return createSearchAdExperiment(name, SearchAdVariantType.MatchType, variants, {
    primaryMetric: 'ctr',
    ...options,
  })
}

/**
 * Ad Extension Test Template
 */
export function createExtensionTest(
  name: string,
  extensionConfigs: Array<
    Array<{
      type: 'sitelink' | 'callout' | 'structured_snippet' | 'call' | 'location' | 'price' | 'promotion' | 'image'
      config: Record<string, any>
    }>
  >,
  options?: { trafficAllocation?: number; minSampleSize?: number }
): { config: ExperimentConfig; variants: VariantConfig[] } {
  const variants: SearchAdVariantConfig[] = extensionConfigs.map((extensions, index) => ({
    type: SearchAdVariantType.Extensions,
    extensions,
    metadata: {
      name: `Extensions Set ${index + 1}`,
      description: `${extensions.length} extensions`,
    },
  }))

  return createSearchAdExperiment(name, SearchAdVariantType.Extensions, variants, {
    primaryMetric: 'ctr',
    ...options,
  })
}

/**
 * Validation Helpers
 */

/**
 * Validate headline constraints
 */
export function validateHeadline(headline: string, maxLength: number = 30): { valid: boolean; error?: string } {
  if (!headline || headline.trim().length === 0) {
    return { valid: false, error: 'Headline cannot be empty' }
  }
  if (headline.length > maxLength) {
    return { valid: false, error: `Headline exceeds ${maxLength} characters (${headline.length})` }
  }
  return { valid: true }
}

/**
 * Validate description constraints
 */
export function validateDescription(description: string, maxLength: number = 90): { valid: boolean; error?: string } {
  if (!description || description.trim().length === 0) {
    return { valid: false, error: 'Description cannot be empty' }
  }
  if (description.length > maxLength) {
    return { valid: false, error: `Description exceeds ${maxLength} characters (${description.length})` }
  }
  return { valid: true }
}

/**
 * Validate keyword constraints
 */
export function validateKeyword(keyword: string): { valid: boolean; error?: string } {
  if (!keyword || keyword.trim().length === 0) {
    return { valid: false, error: 'Keyword cannot be empty' }
  }
  if (keyword.length > 80) {
    return { valid: false, error: 'Keyword exceeds 80 characters' }
  }
  // Check for invalid characters
  if (/[^\w\s\-\+\[\]"]/i.test(keyword)) {
    return { valid: false, error: 'Keyword contains invalid characters' }
  }
  return { valid: true }
}

/**
 * Validate search ad variant config
 */
export function validateSearchAdVariant(variant: SearchAdVariantConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  switch (variant.type) {
    case SearchAdVariantType.Headline:
      if (!variant.headlines) {
        errors.push('Headlines are required for headline test')
      } else {
        const h1 = validateHeadline(variant.headlines.headline1)
        if (!h1.valid) errors.push(`Headline 1: ${h1.error}`)

        const h2 = validateHeadline(variant.headlines.headline2)
        if (!h2.valid) errors.push(`Headline 2: ${h2.error}`)

        if (variant.headlines.headline3) {
          const h3 = validateHeadline(variant.headlines.headline3)
          if (!h3.valid) errors.push(`Headline 3: ${h3.error}`)
        }
      }
      break

    case SearchAdVariantType.Description:
      if (!variant.descriptions) {
        errors.push('Descriptions are required for description test')
      } else {
        const d1 = validateDescription(variant.descriptions.description1)
        if (!d1.valid) errors.push(`Description 1: ${d1.error}`)

        if (variant.descriptions.description2) {
          const d2 = validateDescription(variant.descriptions.description2)
          if (!d2.valid) errors.push(`Description 2: ${d2.error}`)
        }
      }
      break

    case SearchAdVariantType.Keywords:
      if (!variant.keywords || variant.keywords.length === 0) {
        errors.push('At least one keyword is required for keyword test')
      } else {
        variant.keywords.forEach((kw, index) => {
          const validation = validateKeyword(kw.keyword)
          if (!validation.valid) {
            errors.push(`Keyword ${index + 1}: ${validation.error}`)
          }
        })
      }
      break

    case SearchAdVariantType.Bid:
      if (variant.bid === undefined || variant.bid <= 0) {
        errors.push('Valid bid amount is required for bid test')
      }
      break

    case SearchAdVariantType.LandingPage:
      if (!variant.landingPage || !variant.landingPage.url) {
        errors.push('Landing page URL is required for landing page test')
      }
      break
  }

  return { valid: errors.length === 0, errors }
}
