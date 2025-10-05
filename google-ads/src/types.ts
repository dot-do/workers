/**
 * Google Ads Worker Types
 * Integration with Google Ads API v19 and Google Ad Manager
 */

/**
 * OAuth tokens for Google Ads API
 */
export interface GoogleAdsOAuthTokens {
  accessToken: string
  refreshToken: string
  expiresAt: string // ISO timestamp
  scope: string
}

/**
 * Display ad submission to Google Ad Manager
 */
export interface DisplayAdSubmission {
  internalAdId: string
  creative: {
    imageUrl: string
    width: number
    height: number
    altText: string
  }
  targeting?: {
    locations?: string[]
    devices?: ('mobile' | 'desktop' | 'tablet')[]
    keywords?: string[]
  }
  bid: number // CPM bid in USD
  dailyBudget?: number
  totalBudget?: number
}

/**
 * External ad submission result
 */
export interface ExternalAdSubmission {
  id: string
  internalAdId: string
  externalAdId: string
  network: 'google'
  status: 'pending' | 'approved' | 'rejected' | 'running' | 'paused'
  submittedAt: string
  approvedAt?: string
  rejectionReason?: string
}

/**
 * Ad approval status from Google
 */
export interface AdApprovalStatus {
  externalAdId: string
  status: 'pending' | 'approved' | 'rejected' | 'running' | 'paused'
  reviewStatus?: string
  policyViolations?: string[]
  approvedAt?: string
  rejectionReason?: string
}

/**
 * Search campaign configuration
 */
export interface SearchCampaignConfig {
  name: string
  dailyBudget: number
  totalBudget?: number
  targeting?: {
    locations?: string[]
    languages?: string[]
    devices?: ('mobile' | 'desktop' | 'tablet')[]
  }
  bidStrategy?: 'manual_cpc' | 'maximize_clicks' | 'target_cpa' | 'target_roas'
}

/**
 * Search campaign
 */
export interface SearchCampaign {
  id: string
  externalCampaignId: string
  name: string
  status: 'enabled' | 'paused' | 'removed'
  dailyBudget: number
  totalBudget?: number
  spent: number
  metrics: SearchCampaignMetrics
  createdAt: string
  updatedAt: string
}

/**
 * Search ad configuration
 */
export interface SearchAdConfig {
  campaignId: string
  headline1: string // Max 30 chars
  headline2: string // Max 30 chars
  headline3?: string // Max 30 chars
  description1: string // Max 90 chars
  description2?: string // Max 90 chars
  displayUrl: string // Path1/Path2 format
  finalUrl: string // Landing page
  keywords: SearchKeywordConfig[]
  bid?: number // CPC bid (inherits from campaign if not set)
}

/**
 * Search ad
 */
export interface SearchAd {
  id: string
  campaignId: string
  externalAdId: string
  headline1: string
  headline2: string
  headline3?: string
  description1: string
  description2?: string
  displayUrl: string
  finalUrl: string
  status: 'enabled' | 'paused' | 'removed'
  keywords: SearchKeyword[]
  metrics: SearchAdMetrics
  createdAt: string
  updatedAt: string
}

/**
 * Search keyword configuration
 */
export interface SearchKeywordConfig {
  keyword: string
  matchType: 'exact' | 'phrase' | 'broad'
  bid: number // CPC bid
}

/**
 * Search keyword
 */
export interface SearchKeyword {
  id: string
  adId: string
  keyword: string
  matchType: 'exact' | 'phrase' | 'broad'
  bid: number
  qualityScore?: number // 1-10 from Google
  status: 'enabled' | 'paused' | 'removed'
  metrics: KeywordMetrics
}

/**
 * Campaign metrics
 */
export interface SearchCampaignMetrics {
  impressions: number
  clicks: number
  conversions: number
  spend: number
  revenue: number
  ctr: number
  cpc: number
  cvr: number
  roas: number
  averagePosition: number
}

/**
 * Ad metrics
 */
export interface SearchAdMetrics {
  impressions: number
  clicks: number
  conversions: number
  spend: number
  revenue: number
  ctr: number
  cpc: number
  cvr: number
  roas: number
}

/**
 * Keyword metrics
 */
export interface KeywordMetrics {
  impressions: number
  clicks: number
  conversions: number
  spend: number
  ctr: number
  cpc: number
  cvr: number
}

/**
 * Performance sync result
 */
export interface PerformanceSyncResult {
  campaignId: string
  date: string
  impressions: number
  clicks: number
  conversions: number
  spend: number
  revenue: number
  syncedAt: string
}
