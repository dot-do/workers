/**
 * Ads Worker Types
 * Display ad serving with experimentation
 */

/**
 * Ad status
 */
export enum AdStatus {
  Draft = 'draft',
  Active = 'active',
  Paused = 'paused',
  Archived = 'archived',
}

/**
 * Ad configuration
 */
export interface Ad {
  id: string
  campaignId: string
  creativeId: string
  status: AdStatus

  /** Targeting */
  targeting?: {
    locations?: string[]
    devices?: ('mobile' | 'desktop' | 'tablet')[]
    ageMin?: number
    ageMax?: number
    languages?: string[]
    keywords?: string[]
  }

  /** Budget and bidding */
  bid: number // CPM or CPC bid
  dailyBudget?: number
  totalBudget?: number
  spent: number

  /** Quality */
  qualityScore: number // 0-10

  /** Performance metrics */
  metrics: AdMetrics

  /** Configuration */
  config: Record<string, any>

  createdAt: string
  updatedAt: string
}

/**
 * Ad metrics
 */
export interface AdMetrics {
  impressions: number
  clicks: number
  conversions: number
  spend: number
  revenue: number
  ctr: number
  cpc: number
  cpm: number
  cvr: number
  roas: number
}

/**
 * Ad request context
 */
export interface AdContext {
  userId: string
  sessionId: string
  timestamp: number

  /** Device and location */
  device: 'mobile' | 'desktop' | 'tablet'
  location: string

  /** Page context */
  url: string
  referrer?: string
  keywords?: string[]

  /** User features (for targeting) */
  userFeatures?: Record<string, any>
}

/**
 * Ad impression
 */
export interface AdImpression {
  id: string
  adId: string
  userId: string
  sessionId: string
  experimentId?: string
  assignmentId?: string // From experiment worker
  context: AdContext
  timestamp: string

  /** Quality metrics */
  viewability?: number
  position?: number
}

/**
 * Ad click
 */
export interface AdClick {
  id: string
  impressionId: string
  adId: string
  userId: string
  sessionId: string
  timestamp: string
}

/**
 * Ad conversion
 */
export interface AdConversion {
  id: string
  impressionId: string
  clickId?: string
  adId: string
  userId: string
  value: number
  timestamp: string
}

/**
 * Frequency cap
 */
export interface FrequencyCap {
  userId: string
  adId: string
  count: number
  windowStart: string
  windowEnd: string
}

/**
 * Ad selection result
 */
export interface AdSelectionResult {
  ad: Ad
  impression: AdImpression
  experimentAssignment?: {
    experimentId: string
    assignmentId: string
    variantId: string
  }
}
