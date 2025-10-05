/**
 * Bing Ads Worker Types
 * Integration with Microsoft Advertising API v13
 */

/**
 * OAuth tokens for Bing Ads API
 */
export interface BingAdsOAuthTokens {
  accessToken: string
  refreshToken: string
  expiresAt: string // ISO timestamp
  scope: string
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
  bidStrategy?: 'manual_cpc' | 'enhanced_cpc' | 'maximize_clicks' | 'target_cpa'
}

/**
 * Search campaign
 */
export interface SearchCampaign {
  id: string
  externalCampaignId: string
  accountId: string
  name: string
  status: 'active' | 'paused' | 'deleted'
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
  bid?: number // CPC bid
}

/**
 * Search ad
 */
export interface SearchAd {
  id: string
  campaignId: string
  externalAdId: string
  adGroupId: string
  headline1: string
  headline2: string
  headline3?: string
  description1: string
  description2?: string
  displayUrl: string
  finalUrl: string
  status: 'active' | 'paused' | 'deleted'
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
  qualityScore?: number // 1-10 from Bing
  status: 'active' | 'paused' | 'deleted'
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
