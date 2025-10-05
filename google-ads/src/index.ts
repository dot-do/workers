/**
 * Google Ads Worker
 * Integration with Google Ads API v19 and Google Ad Manager
 */

import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { GoogleAdsOAuth, type GoogleAdsOAuthConfig } from './oauth'
import type {
  GoogleAdsOAuthTokens,
  DisplayAdSubmission,
  ExternalAdSubmission,
  AdApprovalStatus,
  SearchCampaignConfig,
  SearchCampaign,
  SearchAdConfig,
  SearchAd,
  PerformanceSyncResult,
} from './types'

/**
 * Environment bindings
 */
export interface Env {
  GOOGLE_ADS_KV: KVNamespace
  GOOGLE_ADS_DB: D1Database
  GOOGLE_ADS_QUEUE: Queue

  // Service bindings
  DB?: any
  AUTH?: any
  ANALYTICS?: any

  // OAuth credentials (set via wrangler secret)
  GOOGLE_ADS_CLIENT_ID: string
  GOOGLE_ADS_CLIENT_SECRET: string
  GOOGLE_ADS_DEVELOPER_TOKEN: string
  GOOGLE_ADS_REDIRECT_URI: string

  // Environment
  ENVIRONMENT: string
  LOG_LEVEL: string
}

/**
 * Google Ads Service (RPC Interface)
 */
export class GoogleAdsService extends WorkerEntrypoint<Env> {
  private oauth: GoogleAdsOAuth

  constructor(ctx: ExecutionContext, env: Env) {
    super(ctx, env)
    this.oauth = new GoogleAdsOAuth({
      clientId: env.GOOGLE_ADS_CLIENT_ID,
      clientSecret: env.GOOGLE_ADS_CLIENT_SECRET,
      developerToken: env.GOOGLE_ADS_DEVELOPER_TOKEN,
      redirectUri: env.GOOGLE_ADS_REDIRECT_URI,
    })
  }

  /**
   * Get authorization URL for OAuth flow
   */
  async getAuthorizationUrl(userId: string): Promise<string> {
    const state = crypto.randomUUID()
    // Store state for CSRF protection
    await this.env.GOOGLE_ADS_KV.put(`oauth:state:${state}`, userId, { expirationTtl: 600 })
    return this.oauth.getAuthorizationUrl(state)
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  async handleOAuthCallback(code: string, state: string): Promise<GoogleAdsOAuthTokens> {
    // Verify state
    const userId = await this.env.GOOGLE_ADS_KV.get(`oauth:state:${state}`)
    if (!userId) {
      throw new Error('Invalid or expired OAuth state')
    }

    // Exchange code for tokens
    const tokens = await this.oauth.exchangeCodeForTokens(code)

    // Store tokens in KV (for fast access) and D1 (for persistence)
    await this.storeTokens(userId, tokens)

    return tokens
  }

  /**
   * Get valid access token (refresh if needed)
   */
  private async getValidAccessToken(userId: string): Promise<string> {
    // Try KV first (fast)
    const cachedTokens = await this.env.GOOGLE_ADS_KV.get(`oauth:tokens:${userId}`, 'json')
    if (cachedTokens) {
      const tokens = cachedTokens as GoogleAdsOAuthTokens
      if (!this.oauth.isTokenExpired(tokens.expiresAt)) {
        return tokens.accessToken
      }
    }

    // Get from D1
    const result = await this.env.GOOGLE_ADS_DB.prepare(
      'SELECT access_token, refresh_token, expires_at FROM google_ads_auth WHERE user_id = ?'
    )
      .bind(userId)
      .first()

    if (!result) {
      throw new Error('No Google Ads authorization found. Please authorize first.')
    }

    const tokens: GoogleAdsOAuthTokens = {
      accessToken: result.access_token as string,
      refreshToken: result.refresh_token as string,
      expiresAt: result.expires_at as string,
      scope: 'https://www.googleapis.com/auth/adwords',
    }

    // Check if expired
    if (this.oauth.isTokenExpired(tokens.expiresAt)) {
      // Refresh
      const refreshedTokens = await this.oauth.refreshAccessToken(tokens.refreshToken)
      await this.storeTokens(userId, refreshedTokens)
      return refreshedTokens.accessToken
    }

    // Cache in KV
    await this.env.GOOGLE_ADS_KV.put(`oauth:tokens:${userId}`, JSON.stringify(tokens), { expirationTtl: 3600 })

    return tokens.accessToken
  }

  /**
   * Store tokens in KV and D1
   */
  private async storeTokens(userId: string, tokens: GoogleAdsOAuthTokens): Promise<void> {
    // Store in KV (fast access)
    await this.env.GOOGLE_ADS_KV.put(`oauth:tokens:${userId}`, JSON.stringify(tokens), { expirationTtl: 3600 })

    // Store in D1 (persistence)
    await this.env.GOOGLE_ADS_DB.prepare(
      `INSERT INTO google_ads_auth (id, user_id, access_token, refresh_token, expires_at, scope, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         access_token = excluded.access_token,
         refresh_token = excluded.refresh_token,
         expires_at = excluded.expires_at`
    )
      .bind(
        crypto.randomUUID(),
        userId,
        tokens.accessToken,
        tokens.refreshToken,
        tokens.expiresAt,
        tokens.scope,
        new Date().toISOString()
      )
      .run()
  }

  /**
   * Submit display ad to Google Ad Manager
   * NOTE: This is a simplified implementation. Full Google Ad Manager integration
   * requires complex API calls to create orders, line items, and creatives.
   */
  async submitDisplayAd(userId: string, submission: DisplayAdSubmission): Promise<ExternalAdSubmission> {
    const accessToken = await this.getValidAccessToken(userId)

    // In a real implementation, this would:
    // 1. Upload creative to Google Ad Manager
    // 2. Create or get ad unit
    // 3. Create order and line item
    // 4. Set targeting and budget
    // For now, we'll create a mock submission

    const externalAdId = `gam_${Date.now()}`
    const submissionId = crypto.randomUUID()

    const result: ExternalAdSubmission = {
      id: submissionId,
      internalAdId: submission.internalAdId,
      externalAdId,
      network: 'google',
      status: 'pending',
      submittedAt: new Date().toISOString(),
    }

    // Store in database
    await this.env.GOOGLE_ADS_DB.prepare(
      `INSERT INTO google_display_ads (id, internal_ad_id, external_ad_id, status, submitted_at)
       VALUES (?, ?, ?, ?, ?)`
    )
      .bind(result.id, result.internalAdId, result.externalAdId, result.status, result.submittedAt)
      .run()

    // Queue for async processing (upload creative, create ad unit, etc.)
    await this.env.GOOGLE_ADS_QUEUE.send({
      type: 'submit_display_ad',
      userId,
      submission,
      submissionId,
    })

    return result
  }

  /**
   * Get ad status from Google Ad Manager
   */
  async getAdStatus(userId: string, externalAdId: string): Promise<AdApprovalStatus> {
    // Get from database
    const result = await this.env.GOOGLE_ADS_DB.prepare(
      'SELECT external_ad_id, status, approved_at, rejection_reason FROM google_display_ads WHERE external_ad_id = ?'
    )
      .bind(externalAdId)
      .first()

    if (!result) {
      throw new Error(`Ad ${externalAdId} not found`)
    }

    return {
      externalAdId: result.external_ad_id as string,
      status: result.status as 'pending' | 'approved' | 'rejected' | 'running' | 'paused',
      approvedAt: result.approved_at as string | undefined,
      rejectionReason: result.rejection_reason as string | undefined,
    }
  }

  /**
   * Create search campaign in Google Ads
   */
  async createSearchCampaign(userId: string, config: SearchCampaignConfig): Promise<SearchCampaign> {
    const accessToken = await this.getValidAccessToken(userId)

    // Google Ads API v19 endpoint for creating campaigns
    const customerId = await this.getCustomerId(userId)
    const apiUrl = `https://googleads.googleapis.com/v19/customers/${customerId}/campaigns:mutate`

    // Create campaign resource
    const campaignResource = {
      operations: [
        {
          create: {
            name: config.name,
            status: 'ENABLED',
            advertisingChannelType: 'SEARCH',
            biddingStrategyType: config.bidStrategy?.toUpperCase() || 'MANUAL_CPC',
            campaignBudget: {
              amountMicros: config.dailyBudget * 1000000, // Convert to micros
              deliveryMethod: 'STANDARD',
            },
            targetingSetting: {
              targetRestrictions: [],
            },
          },
        },
      ],
    }

    try {
      const response = await this.oauth.makeAuthenticatedRequest<{ results: Array<{ resourceName: string }> }>(
        apiUrl,
        accessToken,
        {
          method: 'POST',
          body: JSON.stringify(campaignResource),
        }
      )

      const externalCampaignId = response.results[0].resourceName

      // Store in database
      const campaignId = crypto.randomUUID()
      const campaign: SearchCampaign = {
        id: campaignId,
        externalCampaignId,
        name: config.name,
        status: 'enabled',
        dailyBudget: config.dailyBudget,
        totalBudget: config.totalBudget,
        spent: 0,
        metrics: {
          impressions: 0,
          clicks: 0,
          conversions: 0,
          spend: 0,
          revenue: 0,
          ctr: 0,
          cpc: 0,
          cvr: 0,
          roas: 0,
          averagePosition: 0,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await this.env.GOOGLE_ADS_DB.prepare(
        `INSERT INTO google_search_campaigns (id, external_campaign_id, name, daily_budget, total_budget, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(campaign.id, campaign.externalCampaignId, campaign.name, campaign.dailyBudget, campaign.totalBudget || null, campaign.status, campaign.createdAt)
        .run()

      return campaign
    } catch (error) {
      console.error('Failed to create search campaign:', error)
      throw new Error(`Failed to create search campaign: ${error}`)
    }
  }

  /**
   * Create search ad in campaign
   */
  async createSearchAd(userId: string, config: SearchAdConfig): Promise<SearchAd> {
    const accessToken = await this.getValidAccessToken(userId)

    // Get campaign to find customer ID
    const campaign = await this.env.GOOGLE_ADS_DB.prepare('SELECT external_campaign_id FROM google_search_campaigns WHERE id = ?')
      .bind(config.campaignId)
      .first()

    if (!campaign) {
      throw new Error(`Campaign ${config.campaignId} not found`)
    }

    const customerId = await this.getCustomerId(userId)
    const apiUrl = `https://googleads.googleapis.com/v19/customers/${customerId}/adGroupAds:mutate`

    // Create expanded text ad
    const adResource = {
      operations: [
        {
          create: {
            adGroup: campaign.external_campaign_id,
            status: 'ENABLED',
            ad: {
              expandedTextAd: {
                headlinePart1: config.headline1,
                headlinePart2: config.headline2,
                headlinePart3: config.headline3,
                description: config.description1,
                description2: config.description2,
                path1: config.displayUrl.split('/')[0],
                path2: config.displayUrl.split('/')[1],
              },
              finalUrls: [config.finalUrl],
            },
          },
        },
      ],
    }

    try {
      const response = await this.oauth.makeAuthenticatedRequest<{ results: Array<{ resourceName: string }> }>(apiUrl, accessToken, {
        method: 'POST',
        body: JSON.stringify(adResource),
      })

      const externalAdId = response.results[0].resourceName

      // Create search ad
      const adId = crypto.randomUUID()
      const searchAd: SearchAd = {
        id: adId,
        campaignId: config.campaignId,
        externalAdId,
        headline1: config.headline1,
        headline2: config.headline2,
        headline3: config.headline3,
        description1: config.description1,
        description2: config.description2,
        displayUrl: config.displayUrl,
        finalUrl: config.finalUrl,
        status: 'enabled',
        keywords: [],
        metrics: {
          impressions: 0,
          clicks: 0,
          conversions: 0,
          spend: 0,
          revenue: 0,
          ctr: 0,
          cpc: 0,
          cvr: 0,
          roas: 0,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Store in database
      await this.env.GOOGLE_ADS_DB.prepare(
        `INSERT INTO google_search_ads (id, campaign_id, external_ad_id, headline1, headline2, headline3, description1, description2, display_url, final_url, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          searchAd.id,
          searchAd.campaignId,
          searchAd.externalAdId,
          searchAd.headline1,
          searchAd.headline2,
          searchAd.headline3 || null,
          searchAd.description1,
          searchAd.description2 || null,
          searchAd.displayUrl,
          searchAd.finalUrl,
          searchAd.status,
          searchAd.createdAt
        )
        .run()

      // Add keywords (if provided)
      for (const keywordConfig of config.keywords) {
        await this.addKeyword(userId, searchAd.id, keywordConfig)
      }

      return searchAd
    } catch (error) {
      console.error('Failed to create search ad:', error)
      throw new Error(`Failed to create search ad: ${error}`)
    }
  }

  /**
   * Add keyword to ad
   */
  private async addKeyword(userId: string, adId: string, config: { keyword: string; matchType: string; bid: number }): Promise<void> {
    // Implementation would call Google Ads API to add keyword
    // For now, just store in database
    await this.env.GOOGLE_ADS_DB.prepare(
      `INSERT INTO google_keywords (id, ad_id, keyword, match_type, bid, status)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(crypto.randomUUID(), adId, config.keyword, config.matchType, config.bid, 'enabled')
      .run()
  }

  /**
   * Sync campaign performance from Google Ads
   */
  async syncCampaignPerformance(userId: string, campaignId: string): Promise<PerformanceSyncResult> {
    const accessToken = await this.getValidAccessToken(userId)

    // Get campaign
    const campaign = await this.env.GOOGLE_ADS_DB.prepare('SELECT external_campaign_id FROM google_search_campaigns WHERE id = ?')
      .bind(campaignId)
      .first()

    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`)
    }

    const customerId = await this.getCustomerId(userId)

    // Query Google Ads Reporting API
    const query = `
      SELECT
        campaign.id,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.cost_micros
      FROM campaign
      WHERE campaign.resource_name = '${campaign.external_campaign_id}'
        AND segments.date = TODAY
    `

    const apiUrl = `https://googleads.googleapis.com/v19/customers/${customerId}/googleAds:searchStream`

    try {
      const response = await this.oauth.makeAuthenticatedRequest<{ results: Array<{ metrics: any }> }>(apiUrl, accessToken, {
        method: 'POST',
        body: JSON.stringify({ query }),
      })

      const metrics = response.results[0]?.metrics

      const result: PerformanceSyncResult = {
        campaignId,
        date: new Date().toISOString().split('T')[0],
        impressions: metrics?.impressions || 0,
        clicks: metrics?.clicks || 0,
        conversions: metrics?.conversions || 0,
        spend: (metrics?.cost_micros || 0) / 1000000,
        revenue: 0, // Would need to be tracked separately
        syncedAt: new Date().toISOString(),
      }

      // Store in database
      await this.env.GOOGLE_ADS_DB.prepare(
        `INSERT INTO google_ad_metrics (ad_id, date, impressions, clicks, conversions, spend, revenue)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(ad_id, date) DO UPDATE SET
           impressions = excluded.impressions,
           clicks = excluded.clicks,
           conversions = excluded.conversions,
           spend = excluded.spend`
      )
        .bind(campaignId, result.date, result.impressions, result.clicks, result.conversions, result.spend, result.revenue)
        .run()

      return result
    } catch (error) {
      console.error('Failed to sync campaign performance:', error)
      throw new Error(`Failed to sync campaign performance: ${error}`)
    }
  }

  /**
   * Get customer ID for user
   */
  private async getCustomerId(userId: string): Promise<string> {
    // In a real implementation, this would be stored during OAuth flow
    // For now, return a placeholder
    return '1234567890'
  }
}

/**
 * HTTP API (Hono)
 */
const app = new Hono<{ Bindings: Env }>()

app.use('/*', cors())

// Health check
app.get('/health', (c) => c.json({ status: 'ok', service: 'google-ads', timestamp: new Date().toISOString() }))

// OAuth endpoints
app.get('/auth/google', async (c) => {
  const service = new GoogleAdsService(c.env.ctx, c.env)
  const userId = c.req.query('userId')
  if (!userId) {
    return c.json({ error: 'userId required' }, 400)
  }
  const url = await service.getAuthorizationUrl(userId)
  return c.json({ authorizationUrl: url })
})

app.get('/auth/callback', async (c) => {
  const code = c.req.query('code')
  const state = c.req.query('state')
  if (!code || !state) {
    return c.json({ error: 'code and state required' }, 400)
  }
  const service = new GoogleAdsService(c.env.ctx, c.env)
  try {
    const tokens = await service.handleOAuthCallback(code, state)
    return c.json({ success: true, expiresAt: tokens.expiresAt })
  } catch (error: any) {
    return c.json({ error: error.message }, 400)
  }
})

export default {
  fetch: app.fetch,
}
