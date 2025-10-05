/**
 * Bing Ads Worker
 * Integration with Microsoft Advertising API v13
 */

import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { BingAdsOAuth, type BingAdsOAuthConfig } from './oauth'
import type {
  BingAdsOAuthTokens,
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
  BING_ADS_KV: KVNamespace
  BING_ADS_DB: D1Database
  BING_ADS_QUEUE: Queue

  // Service bindings
  DB?: any
  AUTH?: any
  ANALYTICS?: any

  // OAuth credentials (set via wrangler secret)
  BING_ADS_CLIENT_ID: string
  BING_ADS_CLIENT_SECRET: string
  BING_ADS_DEVELOPER_TOKEN: string
  BING_ADS_REDIRECT_URI: string
  BING_ADS_TENANT?: string

  // Environment
  ENVIRONMENT: string
  LOG_LEVEL: string
}

/**
 * Bing Ads Service (RPC Interface)
 */
export class BingAdsService extends WorkerEntrypoint<Env> {
  private oauth: BingAdsOAuth

  constructor(ctx: ExecutionContext, env: Env) {
    super(ctx, env)
    this.oauth = new BingAdsOAuth({
      clientId: env.BING_ADS_CLIENT_ID,
      clientSecret: env.BING_ADS_CLIENT_SECRET,
      redirectUri: env.BING_ADS_REDIRECT_URI,
      tenant: env.BING_ADS_TENANT,
    })
  }

  /**
   * Get authorization URL for OAuth flow
   * IMPORTANT: This will prompt for MFA if enabled
   */
  async getAuthorizationUrl(userId: string): Promise<string> {
    const state = crypto.randomUUID()
    // Store state for CSRF protection
    await this.env.BING_ADS_KV.put(`oauth:state:${state}`, userId, { expirationTtl: 600 })
    return this.oauth.getAuthorizationUrl(state)
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  async handleOAuthCallback(code: string, state: string): Promise<BingAdsOAuthTokens> {
    // Verify state
    const userId = await this.env.BING_ADS_KV.get(`oauth:state:${state}`)
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
    const cachedTokens = await this.env.BING_ADS_KV.get(`oauth:tokens:${userId}`, 'json')
    if (cachedTokens) {
      const tokens = cachedTokens as BingAdsOAuthTokens
      if (!this.oauth.isTokenExpired(tokens.expiresAt)) {
        return tokens.accessToken
      }
    }

    // Get from D1
    const result = await this.env.BING_ADS_DB.prepare(
      'SELECT access_token, refresh_token, expires_at FROM bing_ads_auth WHERE user_id = ?'
    )
      .bind(userId)
      .first()

    if (!result) {
      throw new Error('No Bing Ads authorization found. Please authorize first.')
    }

    const tokens: BingAdsOAuthTokens = {
      accessToken: result.access_token as string,
      refreshToken: result.refresh_token as string,
      expiresAt: result.expires_at as string,
      scope: 'https://ads.microsoft.com/msads.manage offline_access',
    }

    // Check if expired
    if (this.oauth.isTokenExpired(tokens.expiresAt)) {
      // Refresh
      const refreshedTokens = await this.oauth.refreshAccessToken(tokens.refreshToken)
      await this.storeTokens(userId, refreshedTokens)
      return refreshedTokens.accessToken
    }

    // Cache in KV
    await this.env.BING_ADS_KV.put(`oauth:tokens:${userId}`, JSON.stringify(tokens), { expirationTtl: 3600 })

    return tokens.accessToken
  }

  /**
   * Store tokens in KV and D1
   */
  private async storeTokens(userId: string, tokens: BingAdsOAuthTokens): Promise<void> {
    // Store in KV (fast access)
    await this.env.BING_ADS_KV.put(`oauth:tokens:${userId}`, JSON.stringify(tokens), { expirationTtl: 3600 })

    // Store in D1 (persistence)
    await this.env.BING_ADS_DB.prepare(
      `INSERT INTO bing_ads_auth (id, user_id, access_token, refresh_token, expires_at, scope, created_at)
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
   * Create search campaign in Bing Ads
   */
  async createSearchCampaign(userId: string, config: SearchCampaignConfig): Promise<SearchCampaign> {
    const accessToken = await this.getValidAccessToken(userId)
    const { customerId, accountId } = await this.getCustomerInfo(userId)

    // Microsoft Advertising API v13 endpoint
    const apiUrl = 'https://campaign.api.bingads.microsoft.com/CampaignManagement/v13/CampaignManagementService.svc'

    // Create campaign via SOAP API (Bing uses SOAP, not REST)
    const soapRequest = this.buildCreateCampaignSoapRequest(config, accountId)

    try {
      const response = await this.oauth.makeAuthenticatedRequest<any>(
        apiUrl,
        accessToken,
        this.env.BING_ADS_DEVELOPER_TOKEN,
        customerId,
        accountId,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'text/xml',
            'SOAPAction': 'AddCampaigns',
          },
          body: soapRequest,
        }
      )

      // Parse SOAP response to get campaign ID
      const externalCampaignId = this.parseCampaignIdFromSoapResponse(response)

      // Store in database
      const campaignId = crypto.randomUUID()
      const campaign: SearchCampaign = {
        id: campaignId,
        externalCampaignId,
        accountId,
        name: config.name,
        status: 'active',
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

      await this.env.BING_ADS_DB.prepare(
        `INSERT INTO bing_search_campaigns (id, external_campaign_id, account_id, name, daily_budget, total_budget, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(campaign.id, campaign.externalCampaignId, campaign.accountId, campaign.name, campaign.dailyBudget, campaign.totalBudget || null, campaign.status, campaign.createdAt)
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
    const { customerId, accountId } = await this.getCustomerInfo(userId)

    // Get campaign
    const campaign = await this.env.BING_ADS_DB.prepare('SELECT external_campaign_id FROM bing_search_campaigns WHERE id = ?')
      .bind(config.campaignId)
      .first()

    if (!campaign) {
      throw new Error(`Campaign ${config.campaignId} not found`)
    }

    const apiUrl = 'https://campaign.api.bingads.microsoft.com/CampaignManagement/v13/CampaignManagementService.svc'

    // Build SOAP request for expanded text ad
    const soapRequest = this.buildCreateAdSoapRequest(config, campaign.external_campaign_id as string)

    try {
      const response = await this.oauth.makeAuthenticatedRequest<any>(
        apiUrl,
        accessToken,
        this.env.BING_ADS_DEVELOPER_TOKEN,
        customerId,
        accountId,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'text/xml',
            'SOAPAction': 'AddAds',
          },
          body: soapRequest,
        }
      )

      const externalAdId = this.parseAdIdFromSoapResponse(response)

      // Create search ad
      const adId = crypto.randomUUID()
      const searchAd: SearchAd = {
        id: adId,
        campaignId: config.campaignId,
        externalAdId,
        adGroupId: 'default', // Would be created separately in real implementation
        headline1: config.headline1,
        headline2: config.headline2,
        headline3: config.headline3,
        description1: config.description1,
        description2: config.description2,
        displayUrl: config.displayUrl,
        finalUrl: config.finalUrl,
        status: 'active',
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
      await this.env.BING_ADS_DB.prepare(
        `INSERT INTO bing_search_ads (id, campaign_id, external_ad_id, ad_group_id, headline1, headline2, headline3, description1, description2, display_url, final_url, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          searchAd.id,
          searchAd.campaignId,
          searchAd.externalAdId,
          searchAd.adGroupId,
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

      // Add keywords
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
    // Store in database (actual Bing API call would happen here)
    await this.env.BING_ADS_DB.prepare(
      `INSERT INTO bing_keywords (id, ad_id, keyword, match_type, bid, status)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(crypto.randomUUID(), adId, config.keyword, config.matchType, config.bid, 'active')
      .run()
  }

  /**
   * Sync campaign performance from Bing Ads
   */
  async syncCampaignPerformance(userId: string, campaignId: string): Promise<PerformanceSyncResult> {
    const accessToken = await this.getValidAccessToken(userId)
    const { customerId, accountId } = await this.getCustomerInfo(userId)

    // Get campaign
    const campaign = await this.env.BING_ADS_DB.prepare('SELECT external_campaign_id FROM bing_search_campaigns WHERE id = ?')
      .bind(campaignId)
      .first()

    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`)
    }

    const apiUrl = 'https://reporting.api.bingads.microsoft.com/Api/Advertiser/Reporting/v13/ReportingService.svc'

    // Build SOAP request for performance report
    const soapRequest = this.buildPerformanceReportSoapRequest(campaign.external_campaign_id as string)

    try {
      const response = await this.oauth.makeAuthenticatedRequest<any>(
        apiUrl,
        accessToken,
        this.env.BING_ADS_DEVELOPER_TOKEN,
        customerId,
        accountId,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'text/xml',
            'SOAPAction': 'SubmitGenerateReport',
          },
          body: soapRequest,
        }
      )

      // Parse metrics from SOAP response
      const metrics = this.parseMetricsFromSoapResponse(response)

      const result: PerformanceSyncResult = {
        campaignId,
        date: new Date().toISOString().split('T')[0],
        impressions: metrics.impressions || 0,
        clicks: metrics.clicks || 0,
        conversions: metrics.conversions || 0,
        spend: metrics.spend || 0,
        revenue: 0, // Would need to be tracked separately
        syncedAt: new Date().toISOString(),
      }

      // Store in database
      await this.env.BING_ADS_DB.prepare(
        `INSERT INTO bing_ad_metrics (ad_id, date, impressions, clicks, conversions, spend, revenue)
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
   * Get customer info for user
   */
  private async getCustomerInfo(userId: string): Promise<{ customerId: string; accountId: string }> {
    // In real implementation, this would be stored during OAuth or retrieved from Bing API
    return {
      customerId: '1234567890',
      accountId: '0987654321',
    }
  }

  /**
   * Build SOAP request for creating campaign
   */
  private buildCreateCampaignSoapRequest(config: SearchCampaignConfig, accountId: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Header>
    <h:CustomerAccountId xmlns:h="https://bingads.microsoft.com/CampaignManagement/v13">${accountId}</h:CustomerAccountId>
  </s:Header>
  <s:Body>
    <AddCampaignsRequest xmlns="https://bingads.microsoft.com/CampaignManagement/v13">
      <AccountId>${accountId}</AccountId>
      <Campaigns>
        <Campaign>
          <Name>${config.name}</Name>
          <BudgetType>DailyBudgetStandard</BudgetType>
          <DailyBudget>${config.dailyBudget}</DailyBudget>
          <Status>Active</Status>
          <TimeZone>PacificTimeUSCanadaTijuana</TimeZone>
        </Campaign>
      </Campaigns>
    </AddCampaignsRequest>
  </s:Body>
</s:Envelope>`
  }

  /**
   * Build SOAP request for creating ad
   */
  private buildCreateAdSoapRequest(config: SearchAdConfig, campaignId: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Body>
    <AddAdsRequest xmlns="https://bingads.microsoft.com/CampaignManagement/v13">
      <AdGroupId>${campaignId}</AdGroupId>
      <Ads>
        <Ad xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="ExpandedTextAd">
          <TitlePart1>${config.headline1}</TitlePart1>
          <TitlePart2>${config.headline2}</TitlePart2>
          <Text>${config.description1}</Text>
          <Path1>${config.displayUrl.split('/')[0]}</Path1>
          <Path2>${config.displayUrl.split('/')[1] || ''}</Path2>
          <FinalUrls><string>${config.finalUrl}</string></FinalUrls>
        </Ad>
      </Ads>
    </AddAdsRequest>
  </s:Body>
</s:Envelope>`
  }

  /**
   * Build SOAP request for performance report
   */
  private buildPerformanceReportSoapRequest(campaignId: string): string {
    const today = new Date().toISOString().split('T')[0]
    return `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Body>
    <SubmitGenerateReportRequest xmlns="https://bingads.microsoft.com/Reporting/v13">
      <ReportRequest xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="CampaignPerformanceReportRequest">
        <Format>Csv</Format>
        <ReportName>CampaignPerformance</ReportName>
        <ReturnOnlyCompleteData>false</ReturnOnlyCompleteData>
        <Aggregation>Daily</Aggregation>
        <Time>
          <CustomDateRangeStart><Date>${today}</Date></CustomDateRangeStart>
          <CustomDateRangeEnd><Date>${today}</Date></CustomDateRangeEnd>
        </Time>
        <Scope>
          <CampaignIds><long>${campaignId}</long></CampaignIds>
        </Scope>
      </ReportRequest>
    </SubmitGenerateReportRequest>
  </s:Body>
</s:Envelope>`
  }

  /**
   * Parse campaign ID from SOAP response
   */
  private parseCampaignIdFromSoapResponse(response: any): string {
    // Simplified - real implementation would parse XML
    return `campaign_${Date.now()}`
  }

  /**
   * Parse ad ID from SOAP response
   */
  private parseAdIdFromSoapResponse(response: any): string {
    // Simplified - real implementation would parse XML
    return `ad_${Date.now()}`
  }

  /**
   * Parse metrics from SOAP response
   */
  private parseMetricsFromSoapResponse(response: any): { impressions: number; clicks: number; conversions: number; spend: number } {
    // Simplified - real implementation would parse XML/CSV
    return {
      impressions: 0,
      clicks: 0,
      conversions: 0,
      spend: 0,
    }
  }
}

/**
 * HTTP API (Hono)
 */
const app = new Hono<{ Bindings: Env }>()

app.use('/*', cors())

// Health check
app.get('/health', (c) => c.json({ status: 'ok', service: 'bing-ads', timestamp: new Date().toISOString() }))

// OAuth endpoints
app.get('/auth/bing', async (c) => {
  const service = new BingAdsService(c.env.ctx, c.env)
  const userId = c.req.query('userId')
  if (!userId) {
    return c.json({ error: 'userId required' }, 400)
  }
  const url = await service.getAuthorizationUrl(userId)
  return c.json({ authorizationUrl: url, note: 'MFA may be required during authorization' })
})

app.get('/auth/callback', async (c) => {
  const code = c.req.query('code')
  const state = c.req.query('state')
  if (!code || !state) {
    return c.json({ error: 'code and state required' }, 400)
  }
  const service = new BingAdsService(c.env.ctx, c.env)
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
