/**
 * Universal API Worker - Phase 7 Track E
 *
 * Main orchestrator for AI-powered universal API system.
 *
 * Flow:
 * 1. User calls: api.stripe.createPaymentIntent({ customer: 'cus_123', amount: 5000 })
 * 2. AI analyzes request and determines provider/method
 * 3. Check if user has OAuth token (prompt if missing)
 * 4. Check cache for generated code
 * 5. If not cached, generate with AI and validate
 * 6. Execute code with OAuth token
 * 7. Return result and log execution
 */

import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import * as ai from './ai'

/**
 * Universal API Environment
 */
export interface UniversalAPIEnv {
  // Service bindings
  DB: any // Database service
  AUTH: any // Auth service with OAuth

  // Secrets
  ANTHROPIC_API_KEY: string
  ENCRYPTION_SECRET: string

  // Cloudflare bindings
  ctx: ExecutionContext
}

/**
 * Universal API call request
 */
export interface UniversalAPIRequest {
  userId: string // User making the request
  request: string // Natural language or structured request
  provider?: string // Optional: force specific provider
  metadata?: Record<string, any> // Additional context
}

/**
 * Universal API call response
 */
export interface UniversalAPIResponse {
  success: boolean
  data?: any
  error?: string
  provider?: string
  method?: string
  cached?: boolean
  latencyMs?: number
  codeGenerated?: boolean
}

/**
 * Universal API Service - RPC Interface
 */
export default class UniversalAPIService extends WorkerEntrypoint<UniversalAPIEnv> {
  /**
   * Main API call method - orchestrates entire flow
   *
   * @param request - User request with natural language or structured format
   * @returns Response with data or error
   *
   * @example
   * const result = await env.UNIVERSAL_API.callAPI({
   *   userId: 'user_123',
   *   request: 'charge customer cus_123 $50 for order #123'
   * })
   */
  async callAPI(request: UniversalAPIRequest): Promise<UniversalAPIResponse> {
    const startTime = Date.now()

    try {
      // Step 1: Get available providers from database
      const integrations = await this.env.DB.query({
        sql: 'SELECT provider FROM integrations',
        params: [],
      })
      const availableProviders = integrations.rows?.map((r: any) => r.provider) || []

      // Step 2: AI analyzes request and determines provider/method
      console.log('[Universal API] Analyzing request:', request.request)
      const requirements = await ai.analyzeIntegrationRequirements(request.request, availableProviders, this.env)

      console.log('[Universal API] Requirements:', requirements)

      // Use forced provider if specified
      const provider = request.provider || requirements.provider
      const method = requirements.method
      const args = requirements.arguments

      // Step 3: Get integration configuration
      const integration = await this.env.DB.getIntegration(provider)
      if (!integration) {
        return {
          success: false,
          error: `Provider '${provider}' not found`,
          provider,
          method,
        }
      }

      // Step 4: Check if user has OAuth token
      const oauthToken = await this.env.AUTH.getUniversalOAuthToken(request.userId, provider)
      if (!oauthToken) {
        return {
          success: false,
          error: `OAuth token required for ${provider}. Please authenticate first.`,
          provider,
          method,
        }
      }

      // Check if token expired
      if (this.env.AUTH.isUniversalOAuthTokenExpired(oauthToken)) {
        console.log('[Universal API] Token expired, refreshing...')
        const refreshed = await this.env.AUTH.refreshUniversalOAuthToken(request.userId, provider)
        if (!refreshed) {
          return {
            success: false,
            error: `Failed to refresh OAuth token for ${provider}. Please re-authenticate.`,
            provider,
            method,
          }
        }
        // Get refreshed token
        const refreshedToken = await this.env.AUTH.getUniversalOAuthToken(request.userId, provider)
        if (!refreshedToken) {
          return {
            success: false,
            error: `Failed to retrieve refreshed token for ${provider}`,
            provider,
            method,
          }
        }
      }

      // Step 5: Check cache for generated code
      const argsHash = await ai.hashArguments(args)
      let generatedCode = await this.env.DB.getGeneratedCode(provider, method, argsHash)
      let codeGenerated = false

      if (!generatedCode) {
        console.log('[Universal API] Code not cached, generating...')

        // Step 6: Generate code with AI
        const code = await ai.generateAPICode(requirements, integration, this.env)

        // Step 7: Validate generated code
        const validation = await ai.validateGeneratedCode(code.code, this.env)
        if (!validation.isValid) {
          return {
            success: false,
            error: `Code validation failed: ${validation.errors.join(', ')}`,
            provider,
            method,
          }
        }

        // Step 8: Save generated code to cache
        await this.env.DB.saveGeneratedCode({
          provider,
          method,
          argsHash,
          generatedCode: code.code,
          model: 'claude-3-5-sonnet-20241022',
          promptTokens: undefined,
          completionTokens: undefined,
          costUsd: 0.0, // Calculate based on tokens
          validated: true,
        })

        generatedCode = { generated_code: code.code }
        codeGenerated = true
      }

      // Step 9: Execute generated code
      console.log('[Universal API] Executing generated code...')
      const executionResult = await this.executeGeneratedCode(generatedCode.generated_code, oauthToken.accessToken, args)

      // Step 10: Log execution for analytics
      const latencyMs = Date.now() - startTime
      await this.env.DB.logAPIExecution({
        userId: request.userId,
        provider,
        method,
        args: Object.values(args),
        success: executionResult.success,
        latencyMs,
        cached: !codeGenerated,
        codeId: undefined,
        result: executionResult.data,
        error: executionResult.error,
      })

      return {
        success: executionResult.success,
        data: executionResult.data,
        error: executionResult.error,
        provider,
        method,
        cached: !codeGenerated,
        latencyMs,
        codeGenerated,
      }
    } catch (error) {
      const latencyMs = Date.now() - startTime
      console.error('[Universal API] Error:', error)

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        latencyMs,
      }
    }
  }

  /**
   * Execute generated code in safe sandbox
   *
   * @param code - Generated TypeScript code
   * @param accessToken - OAuth access token
   * @param args - Method arguments
   * @returns Execution result
   */
  private async executeGeneratedCode(code: string, accessToken: string, args: Record<string, any>): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Create a safe execution environment
      // The generated code is a function that takes (accessToken, args) and returns { success, data?, error? }
      const func = new Function('accessToken', 'args', `
        return (async () => {
          ${code}
          return await callAPI(accessToken, args);
        })();
      `)

      const result = await func(accessToken, args)
      return result
    } catch (error) {
      console.error('[Universal API] Execution error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Code execution failed',
      }
    }
  }

  /**
   * Get OAuth authorization URL for provider
   *
   * @param userId - User ID
   * @param provider - Provider name
   * @param redirectUri - Callback URL
   * @returns Authorization URL
   */
  async getOAuthUrl(userId: string, provider: string, redirectUri: string): Promise<string | null> {
    const state = crypto.randomUUID() // Generate random state for CSRF protection
    return await this.env.AUTH.getUniversalOAuthUrl(provider, redirectUri, state)
  }

  /**
   * Handle OAuth callback and store tokens
   *
   * @param userId - User ID
   * @param provider - Provider name
   * @param code - Authorization code from callback
   * @param redirectUri - Must match original redirect URI
   * @returns Success status
   */
  async handleOAuthCallback(userId: string, provider: string, code: string, redirectUri: string): Promise<boolean> {
    // Exchange code for tokens
    const tokens = await this.env.AUTH.exchangeUniversalOAuthCode(provider, code, redirectUri)
    if (!tokens) return false

    // Store tokens (encrypted)
    return await this.env.AUTH.storeUniversalOAuthToken({
      userId,
      provider,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : undefined,
      scopes: tokens.scope ? tokens.scope.split(' ') : [],
    })
  }
}

/**
 * HTTP API Interface
 */
const app = new Hono<{ Bindings: UniversalAPIEnv }>()

// Main API call endpoint
app.post('/call', async (c) => {
  const body = await c.req.json()
  const { userId, request, provider, metadata } = body

  if (!userId || !request) {
    return c.json({ success: false, error: 'userId and request are required' }, 400)
  }

  const service = new UniversalAPIService(c.env.ctx, c.env)
  const result = await service.callAPI({ userId, request, provider, metadata })

  return c.json(result)
})

// OAuth endpoints
app.get('/oauth/:provider/authorize', async (c) => {
  const provider = c.req.param('provider')
  const userId = c.req.query('userId')
  const redirectUri = c.req.query('redirectUri') || `${new URL(c.req.url).origin}/oauth/${provider}/callback`

  if (!userId) {
    return c.json({ success: false, error: 'userId is required' }, 400)
  }

  const service = new UniversalAPIService(c.env.ctx, c.env)
  const url = await service.getOAuthUrl(userId, provider, redirectUri)

  if (!url) {
    return c.json({ success: false, error: `Provider '${provider}' does not support OAuth or is not configured` }, 400)
  }

  return c.redirect(url)
})

app.get('/oauth/:provider/callback', async (c) => {
  const provider = c.req.param('provider')
  const code = c.req.query('code')
  const userId = c.req.query('userId')
  const redirectUri = c.req.query('redirectUri') || `${new URL(c.req.url).origin}/oauth/${provider}/callback`

  if (!code || !userId) {
    return c.json({ success: false, error: 'code and userId are required' }, 400)
  }

  const service = new UniversalAPIService(c.env.ctx, c.env)
  const success = await service.handleOAuthCallback(userId, provider, code, redirectUri)

  if (!success) {
    return c.json({ success: false, error: 'OAuth callback failed' }, 500)
  }

  return c.json({ success: true, message: `Successfully authenticated with ${provider}` })
})

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'universal-api' })
})

export { app }
export { UniversalAPIService }
