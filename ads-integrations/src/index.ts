import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { AdPlatform, PlatformAuthType, PlatformRateLimits, type PlatformAccount } from '@dot-do/ads-types'

// Local integration types (not in ads-types foundation package)
export interface PlatformCredentials {
  type: PlatformAuthType
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
  scopes: string[]
}

export interface PlatformConnection {
  id: string
  platform: AdPlatform
  accountId: string
  credentials: PlatformCredentials
  status: 'active' | 'error' | 'expired'
  lastSync: string
  createdAt: string
  updatedAt: string
}

export interface SyncResult {
  id: string
  connectionId: string
  type: 'campaigns' | 'audiences' | 'creatives'
  status: 'success' | 'error' | 'partial'
  recordsProcessed: number
  recordsFailed: number
  errors: string[]
  duration: number
  startedAt: string
  completedAt: string
}

// Environment bindings
export interface Env {
  DB: D1Database
  KV: KVNamespace
  INTEGRATIONS_QUEUE: Queue
  OAUTH_CLIENT_ID: string
  OAUTH_CLIENT_SECRET: string
  OAUTH_REDIRECT_URI: string
}

// Rate limiter for platform API calls
class RateLimiter {
  private tokens: Map<string, { count: number; resetAt: number }> = new Map()

  async checkLimit(platform: AdPlatform, accountId: string): Promise<boolean> {
    const limit = PlatformRateLimits[platform]
    const key = `${platform}:${accountId}`
    const now = Date.now()

    let bucket = this.tokens.get(key)
    if (!bucket || now >= bucket.resetAt) {
      const resetMs = limit.per === 'second' ? 1000 : limit.per === 'minute' ? 60000 : limit.per === 'hour' ? 3600000 : 86400000
      bucket = { count: 0, resetAt: now + resetMs }
      this.tokens.set(key, bucket)
    }

    if (bucket.count >= limit.requests) {
      return false
    }

    bucket.count++
    return true
  }

  async waitForToken(platform: AdPlatform, accountId: string): Promise<void> {
    const key = `${platform}:${accountId}`
    const bucket = this.tokens.get(key)
    if (!bucket) return

    const now = Date.now()
    if (now < bucket.resetAt) {
      await new Promise((resolve) => setTimeout(resolve, bucket.resetAt - now))
    }
  }
}

// OAuth2 helper
class OAuth2Helper {
  constructor(
    private clientId: string,
    private clientSecret: string,
    private redirectUri: string
  ) {}

  getAuthUrl(platform: AdPlatform, state: string): string {
    const scopes = this.getPlatformScopes(platform)
    const authUrls: Record<AdPlatform, string> = {
      [AdPlatform.GoogleAds]: 'https://accounts.google.com/o/oauth2/v2/auth',
      [AdPlatform.MetaAds]: 'https://www.facebook.com/v18.0/dialog/oauth',
      [AdPlatform.LinkedInAds]: 'https://www.linkedin.com/oauth/v2/authorization',
      [AdPlatform.MicrosoftAds]: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      [AdPlatform.TikTokAds]: 'https://business-api.tiktok.com/portal/auth',
      [AdPlatform.TwitterAds]: 'https://twitter.com/i/oauth2/authorize',
    }

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      state,
    })

    return `${authUrls[platform]}?${params}`
  }

  async exchangeCode(platform: AdPlatform, code: string): Promise<PlatformCredentials> {
    const tokenUrls: Record<AdPlatform, string> = {
      [AdPlatform.GoogleAds]: 'https://oauth2.googleapis.com/token',
      [AdPlatform.MetaAds]: 'https://graph.facebook.com/v18.0/oauth/access_token',
      [AdPlatform.LinkedInAds]: 'https://www.linkedin.com/oauth/v2/accessToken',
      [AdPlatform.MicrosoftAds]: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      [AdPlatform.TikTokAds]: 'https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/',
      [AdPlatform.TwitterAds]: 'https://api.twitter.com/2/oauth2/token',
    }

    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: this.redirectUri,
    })

    const response = await fetch(tokenUrls[platform], {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    })

    const data = (await response.json()) as any
    return {
      type: PlatformAuthType.OAuth2,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scopes: data.scope?.split(' ') || [],
    }
  }

  async refreshToken(platform: AdPlatform, refreshToken: string): Promise<PlatformCredentials> {
    const tokenUrls: Record<AdPlatform, string> = {
      [AdPlatform.GoogleAds]: 'https://oauth2.googleapis.com/token',
      [AdPlatform.MetaAds]: 'https://graph.facebook.com/v18.0/oauth/access_token',
      [AdPlatform.LinkedInAds]: 'https://www.linkedin.com/oauth/v2/accessToken',
      [AdPlatform.MicrosoftAds]: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      [AdPlatform.TikTokAds]: 'https://business-api.tiktok.com/open_api/v1.3/oauth2/refresh_token/',
      [AdPlatform.TwitterAds]: 'https://api.twitter.com/2/oauth2/token',
    }

    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    })

    const response = await fetch(tokenUrls[platform], {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    })

    const data = (await response.json()) as any
    return {
      type: PlatformAuthType.OAuth2,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scopes: data.scope?.split(' ') || [],
    }
  }

  private getPlatformScopes(platform: AdPlatform): string[] {
    const scopes: Record<AdPlatform, string[]> = {
      [AdPlatform.GoogleAds]: ['https://www.googleapis.com/auth/adwords'],
      [AdPlatform.MetaAds]: ['ads_management', 'ads_read', 'business_management'],
      [AdPlatform.LinkedInAds]: ['r_ads', 'rw_ads', 'r_ads_reporting'],
      [AdPlatform.MicrosoftAds]: ['https://ads.microsoft.com/msads.manage'],
      [AdPlatform.TikTokAds]: ['ad_management', 'campaign_management', 'reporting'],
      [AdPlatform.TwitterAds]: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
    }
    return scopes[platform]
  }
}

// Platform API client
class PlatformAPIClient {
  private rateLimiter = new RateLimiter()

  constructor(
    private platform: AdPlatform,
    private credentials: PlatformCredentials,
    private accountId: string
  ) {}

  async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    // Rate limiting
    const canProceed = await this.rateLimiter.checkLimit(this.platform, this.accountId)
    if (!canProceed) {
      await this.rateLimiter.waitForToken(this.platform, this.accountId)
    }

    // Build request
    const baseUrls: Record<AdPlatform, string> = {
      [AdPlatform.GoogleAds]: 'https://googleads.googleapis.com/v14',
      [AdPlatform.MetaAds]: 'https://graph.facebook.com/v18.0',
      [AdPlatform.LinkedInAds]: 'https://api.linkedin.com/rest',
      [AdPlatform.MicrosoftAds]: 'https://ads.api.bingads.microsoft.com/v13',
      [AdPlatform.TikTokAds]: 'https://business-api.tiktok.com/open_api/v1.3',
      [AdPlatform.TwitterAds]: 'https://ads-api.twitter.com/12',
    }

    const url = `${baseUrls[this.platform]}${endpoint}`
    const headers = {
      'Authorization': `Bearer ${this.credentials.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    }

    const response = await fetch(url, { ...options, headers })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API Error: ${response.status} - ${error}`)
    }

    return response.json()
  }

  async syncCampaigns(): Promise<any[]> {
    const endpoints: Record<AdPlatform, string> = {
      [AdPlatform.GoogleAds]: `/customers/${this.accountId}/campaigns`,
      [AdPlatform.MetaAds]: `/${this.accountId}/campaigns`,
      [AdPlatform.LinkedInAds]: `/adCampaigns?q=account&account=urn:li:sponsoredAccount:${this.accountId}`,
      [AdPlatform.MicrosoftAds]: `/Accounts/${this.accountId}/Campaigns`,
      [AdPlatform.TikTokAds]: `/campaign/get/?advertiser_id=${this.accountId}`,
      [AdPlatform.TwitterAds]: `/accounts/${this.accountId}/campaigns`,
    }

    const data = await this.makeRequest(endpoints[this.platform])
    return this.normalizeCampaigns(data)
  }

  async syncAudiences(): Promise<any[]> {
    const endpoints: Record<AdPlatform, string> = {
      [AdPlatform.GoogleAds]: `/customers/${this.accountId}/userLists`,
      [AdPlatform.MetaAds]: `/${this.accountId}/customaudiences`,
      [AdPlatform.LinkedInAds]: `/adTargetingEntities?q=account&account=urn:li:sponsoredAccount:${this.accountId}`,
      [AdPlatform.MicrosoftAds]: `/Accounts/${this.accountId}/Audiences`,
      [AdPlatform.TikTokAds]: `/dmp/custom_audience/list/?advertiser_id=${this.accountId}`,
      [AdPlatform.TwitterAds]: `/accounts/${this.accountId}/tailored_audiences`,
    }

    const data = await this.makeRequest(endpoints[this.platform])
    return this.normalizeAudiences(data)
  }

  async syncCreatives(): Promise<any[]> {
    const endpoints: Record<AdPlatform, string> = {
      [AdPlatform.GoogleAds]: `/customers/${this.accountId}/ads`,
      [AdPlatform.MetaAds]: `/${this.accountId}/ads`,
      [AdPlatform.LinkedInAds]: `/adCreatives?q=account&account=urn:li:sponsoredAccount:${this.accountId}`,
      [AdPlatform.MicrosoftAds]: `/Accounts/${this.accountId}/Ads`,
      [AdPlatform.TikTokAds]: `/ad/get/?advertiser_id=${this.accountId}`,
      [AdPlatform.TwitterAds]: `/accounts/${this.accountId}/ads`,
    }

    const data = await this.makeRequest(endpoints[this.platform])
    return this.normalizeCreatives(data)
  }

  private normalizeCampaigns(data: any): any[] {
    // Platform-specific normalization logic
    return Array.isArray(data) ? data : data.data || []
  }

  private normalizeAudiences(data: any): any[] {
    return Array.isArray(data) ? data : data.data || []
  }

  private normalizeCreatives(data: any): any[] {
    return Array.isArray(data) ? data : data.data || []
  }
}

// Main service
export class AdsIntegrationService extends WorkerEntrypoint<Env> {
  private oauth: OAuth2Helper

  constructor(ctx: ExecutionContext, env: Env) {
    super(ctx, env)
    this.oauth = new OAuth2Helper(env.OAUTH_CLIENT_ID, env.OAUTH_CLIENT_SECRET, env.OAUTH_REDIRECT_URI)
  }

  // RPC Methods

  async connect(platform: AdPlatform, accountId: string): Promise<{ authUrl: string; state: string }> {
    const state = crypto.randomUUID()
    await this.env.KV.put(`oauth:state:${state}`, JSON.stringify({ platform, accountId }), { expirationTtl: 600 })

    const authUrl = this.oauth.getAuthUrl(platform, state)
    return { authUrl, state }
  }

  async handleCallback(code: string, state: string): Promise<PlatformConnection> {
    const stateData = await this.env.KV.get(`oauth:state:${state}`, 'json')
    if (!stateData) throw new Error('Invalid or expired state')

    const { platform, accountId } = stateData as { platform: AdPlatform; accountId: string }
    const credentials = await this.oauth.exchangeCode(platform, code)

    const connectionId = crypto.randomUUID()
    const now = new Date().toISOString()

    const connection: PlatformConnection = {
      id: connectionId,
      platform,
      accountId,
      credentials,
      status: 'active',
      lastSync: now,
      createdAt: now,
      updatedAt: now,
    }

    await this.env.DB.prepare(
      `INSERT INTO platform_connections (id, platform, account_id, credentials, status, last_sync, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(connectionId, platform, accountId, JSON.stringify(credentials), 'active', now, now, now)
      .run()

    await this.env.KV.put(`connection:${connectionId}`, JSON.stringify(connection), { expirationTtl: 86400 })

    return connection
  }

  async refreshConnection(connectionId: string): Promise<PlatformConnection> {
    const connection = await this.getConnection(connectionId)
    if (!connection.credentials.refreshToken) {
      throw new Error('No refresh token available')
    }

    const newCredentials = await this.oauth.refreshToken(connection.platform, connection.credentials.refreshToken)

    await this.env.DB.prepare(`UPDATE platform_connections SET credentials = ?, updated_at = ? WHERE id = ?`)
      .bind(JSON.stringify(newCredentials), new Date().toISOString(), connectionId)
      .run()

    connection.credentials = newCredentials
    connection.updatedAt = new Date().toISOString()

    await this.env.KV.put(`connection:${connectionId}`, JSON.stringify(connection), { expirationTtl: 86400 })

    return connection
  }

  async getConnection(connectionId: string): Promise<PlatformConnection> {
    const cached = await this.env.KV.get(`connection:${connectionId}`, 'json')
    if (cached) return cached as PlatformConnection

    const result = await this.env.DB.prepare(`SELECT * FROM platform_connections WHERE id = ?`).bind(connectionId).first()

    if (!result) throw new Error('Connection not found')

    const connection: PlatformConnection = {
      id: result.id as string,
      platform: result.platform as AdPlatform,
      accountId: result.account_id as string,
      credentials: JSON.parse(result.credentials as string),
      status: result.status as 'active' | 'error' | 'expired',
      lastSync: result.last_sync as string,
      createdAt: result.created_at as string,
      updatedAt: result.updated_at as string,
    }

    await this.env.KV.put(`connection:${connectionId}`, JSON.stringify(connection), { expirationTtl: 86400 })

    return connection
  }

  async listConnections(platform?: AdPlatform): Promise<PlatformConnection[]> {
    const query = platform
      ? this.env.DB.prepare(`SELECT * FROM platform_connections WHERE platform = ? ORDER BY created_at DESC`).bind(platform)
      : this.env.DB.prepare(`SELECT * FROM platform_connections ORDER BY created_at DESC`)

    const results = await query.all()

    return results.results.map((row: any) => ({
      id: row.id,
      platform: row.platform,
      accountId: row.account_id,
      credentials: JSON.parse(row.credentials),
      status: row.status,
      lastSync: row.last_sync,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  }

  async syncPlatform(connectionId: string, syncType: 'campaigns' | 'audiences' | 'creatives'): Promise<SyncResult> {
    const connection = await this.getConnection(connectionId)

    // Check if token needs refresh
    if (connection.credentials.expiresAt && new Date(connection.credentials.expiresAt) < new Date()) {
      await this.refreshConnection(connectionId)
    }

    const client = new PlatformAPIClient(connection.platform, connection.credentials, connection.accountId)

    const syncId = crypto.randomUUID()
    const startTime = Date.now()
    let records: any[] = []
    let errors: string[] = []

    try {
      switch (syncType) {
        case 'campaigns':
          records = await client.syncCampaigns()
          break
        case 'audiences':
          records = await client.syncAudiences()
          break
        case 'creatives':
          records = await client.syncCreatives()
          break
      }

      // Store synced records
      for (const record of records) {
        await this.env.DB.prepare(
          `INSERT OR REPLACE INTO synced_${syncType} (id, connection_id, platform_id, data, synced_at)
           VALUES (?, ?, ?, ?, ?)`
        )
          .bind(crypto.randomUUID(), connectionId, record.id, JSON.stringify(record), new Date().toISOString())
          .run()
      }
    } catch (error) {
      errors.push((error as Error).message)
    }

    const result: SyncResult = {
      id: syncId,
      connectionId,
      type: syncType,
      status: errors.length > 0 ? 'error' : 'success',
      recordsProcessed: records.length,
      recordsFailed: errors.length,
      errors,
      duration: Date.now() - startTime,
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
    }

    // Update last sync time
    await this.env.DB.prepare(`UPDATE platform_connections SET last_sync = ? WHERE id = ?`)
      .bind(result.completedAt, connectionId)
      .run()

    return result
  }

  async disconnect(connectionId: string): Promise<void> {
    await this.env.DB.prepare(`DELETE FROM platform_connections WHERE id = ?`).bind(connectionId).run()
    await this.env.KV.delete(`connection:${connectionId}`)
  }

  async getAccountInfo(connectionId: string): Promise<PlatformAccount> {
    const connection = await this.getConnection(connectionId)
    const client = new PlatformAPIClient(connection.platform, connection.credentials, connection.accountId)

    const accountEndpoints: Record<AdPlatform, string> = {
      [AdPlatform.GoogleAds]: `/customers/${connection.accountId}`,
      [AdPlatform.MetaAds]: `/${connection.accountId}`,
      [AdPlatform.LinkedInAds]: `/adAccounts/${connection.accountId}`,
      [AdPlatform.MicrosoftAds]: `/Accounts/${connection.accountId}`,
      [AdPlatform.TikTokAds]: `/advertiser/info/?advertiser_ids=[${connection.accountId}]`,
      [AdPlatform.TwitterAds]: `/accounts/${connection.accountId}`,
    }

    const data = await client.makeRequest(accountEndpoints[connection.platform])

    return {
      id: connection.accountId,
      platform: connection.platform,
      accountId: connection.accountId,
      accountName: data.name || data.account_name || 'Unknown',
      currency: data.currency || 'USD',
      timezone: data.timezone || 'UTC',
      status: data.status || 'active',
      auth: {
        platform: connection.platform,
        type: connection.credentials.type,
        credentials: {},
        accessToken: connection.credentials.accessToken,
        refreshToken: connection.credentials.refreshToken,
        expiresAt: connection.credentials.expiresAt?.toISOString(),
      },
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    }
  }
}

// HTTP API
const app = new Hono<{ Bindings: Env }>()
app.use('*', cors())

app.post('/connect', async (c) => {
  const service = new AdsIntegrationService({} as any, c.env)
  const { platform, accountId } = await c.req.json()
  const result = await service.connect(platform, accountId)
  return c.json({ success: true, data: result })
})

app.get('/callback', async (c) => {
  const service = new AdsIntegrationService({} as any, c.env)
  const code = c.req.query('code')
  const state = c.req.query('state')
  if (!code || !state) return c.json({ success: false, error: 'Missing parameters' }, 400)
  const result = await service.handleCallback(code, state)
  return c.json({ success: true, data: result })
})

app.get('/connections', async (c) => {
  const service = new AdsIntegrationService({} as any, c.env)
  const platform = c.req.query('platform') as AdPlatform | undefined
  const result = await service.listConnections(platform)
  return c.json({ success: true, data: result })
})

app.get('/connections/:id', async (c) => {
  const service = new AdsIntegrationService({} as any, c.env)
  const result = await service.getConnection(c.req.param('id'))
  return c.json({ success: true, data: result })
})

app.post('/connections/:id/refresh', async (c) => {
  const service = new AdsIntegrationService({} as any, c.env)
  const result = await service.refreshConnection(c.req.param('id'))
  return c.json({ success: true, data: result })
})

app.post('/connections/:id/sync', async (c) => {
  const service = new AdsIntegrationService({} as any, c.env)
  const { type } = await c.req.json()
  const result = await service.syncPlatform(c.req.param('id'), type)
  return c.json({ success: true, data: result })
})

app.delete('/connections/:id', async (c) => {
  const service = new AdsIntegrationService({} as any, c.env)
  await service.disconnect(c.req.param('id'))
  return c.json({ success: true })
})

app.get('/connections/:id/account', async (c) => {
  const service = new AdsIntegrationService({} as any, c.env)
  const result = await service.getAccountInfo(c.req.param('id'))
  return c.json({ success: true, data: result })
})

export default app
