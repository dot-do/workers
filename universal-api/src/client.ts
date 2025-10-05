/**
 * Universal API Client SDK
 *
 * Provides magic syntax for calling any external API:
 *
 * @example
 * const api = createUniversalAPI({ apiUrl: 'https://universal-api.do', userId: 'user_123' })
 *
 * // AI automatically determines this is Stripe payment intent creation
 * const result = await api.stripe.createPaymentIntent({
 *   customer: 'cus_123',
 *   amount: 5000,
 *   currency: 'usd'
 * })
 *
 * // AI automatically determines this is GitHub repo creation
 * const repo = await api.github.createRepository({
 *   name: 'my-repo',
 *   private: true
 * })
 */

export interface UniversalAPIConfig {
  /**
   * URL of Universal API service
   * @default 'https://universal-api.do'
   */
  apiUrl?: string

  /**
   * User ID for authentication
   */
  userId: string

  /**
   * Optional: Force specific provider
   */
  provider?: string

  /**
   * Optional: Additional metadata
   */
  metadata?: Record<string, any>

  /**
   * Optional: Custom fetch implementation
   */
  fetch?: typeof fetch

  /**
   * Optional: OAuth redirect handler
   * Called when OAuth authentication is required
   */
  onOAuthRequired?: (provider: string, authUrl: string) => void | Promise<void>
}

export interface UniversalAPIResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  provider?: string
  method?: string
  cached?: boolean
  latencyMs?: number
  codeGenerated?: boolean
}

/**
 * Create a Universal API client with magic syntax
 *
 * Uses JavaScript Proxy to intercept property access and method calls,
 * converting them into natural language requests to the AI-powered API.
 *
 * @param config - Configuration options
 * @returns Proxy object with magic API syntax
 */
export function createUniversalAPI(config: UniversalAPIConfig): any {
  const {
    apiUrl = 'https://universal-api.do',
    userId,
    provider,
    metadata,
    fetch: customFetch = globalThis.fetch,
    onOAuthRequired,
  } = config

  // Cache for provider proxies
  const providerProxies = new Map<string, any>()

  /**
   * Create a proxy for a specific provider (e.g., api.stripe)
   */
  function createProviderProxy(providerName: string): any {
    return new Proxy(
      {},
      {
        get(_target, methodName: string) {
          if (typeof methodName !== 'string') {
            return undefined
          }

          // Return async function that makes API call
          return async (...args: any[]) => {
            // Convert method call to natural language request
            const request = buildRequest(providerName, methodName, args)

            // Call Universal API
            const response = await callUniversalAPI(request)

            // Handle OAuth required
            if (!response.success && response.error?.includes('OAuth token required')) {
              if (onOAuthRequired) {
                // Get OAuth URL
                const authUrl = await getOAuthUrl(providerName)
                if (authUrl) {
                  await onOAuthRequired(providerName, authUrl)
                  throw new Error(`OAuth authentication required for ${providerName}. Please complete authentication and retry.`)
                }
              }
              throw new Error(response.error)
            }

            // Throw on error
            if (!response.success) {
              throw new Error(response.error || 'Unknown error occurred')
            }

            return response.data
          }
        },
      }
    )
  }

  /**
   * Build natural language request from method call
   */
  function buildRequest(providerName: string, methodName: string, args: any[]): string {
    // Convert camelCase to space-separated words
    const methodWords = methodName
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .toLowerCase()

    // Handle different argument patterns
    if (args.length === 0) {
      return `${providerName} ${methodWords}`
    }

    if (args.length === 1 && typeof args[0] === 'object') {
      // Single object argument - common pattern
      const params = args[0]
      const paramStrings = Object.entries(params).map(([key, value]) => {
        if (typeof value === 'string') {
          return `${key}: "${value}"`
        }
        return `${key}: ${value}`
      })
      return `${providerName} ${methodWords} with ${paramStrings.join(', ')}`
    }

    // Multiple arguments - convert to string
    return `${providerName} ${methodWords} with arguments: ${JSON.stringify(args)}`
  }

  /**
   * Call Universal API endpoint
   */
  async function callUniversalAPI(request: string): Promise<UniversalAPIResponse> {
    try {
      const response = await customFetch(`${apiUrl}/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          request,
          provider: provider,
          metadata,
        }),
      })

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        }
      }

      const data = await response.json()
      return data
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      }
    }
  }

  /**
   * Get OAuth authorization URL
   */
  async function getOAuthUrl(providerName: string): Promise<string | null> {
    try {
      const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/oauth/callback` : 'http://localhost:3000/oauth/callback'

      const response = await customFetch(`${apiUrl}/oauth/${providerName}/authorize?userId=${userId}&redirectUri=${encodeURIComponent(redirectUri)}`, {
        method: 'GET',
        redirect: 'manual', // Don't follow redirect
      })

      // Get redirect URL from Location header
      const authUrl = response.headers.get('Location')
      return authUrl
    } catch (error) {
      console.error('Failed to get OAuth URL:', error)
      return null
    }
  }

  // Return root proxy that creates provider proxies
  return new Proxy(
    {},
    {
      get(_target, providerName: string) {
        if (typeof providerName !== 'string') {
          return undefined
        }

        // Special properties
        if (providerName === 'then') {
          // Make the proxy non-thenable (not a Promise)
          return undefined
        }

        // Return cached or create new provider proxy
        if (!providerProxies.has(providerName)) {
          providerProxies.set(providerName, createProviderProxy(providerName))
        }

        return providerProxies.get(providerName)
      },
    }
  )
}

/**
 * Alternative: Direct call with natural language
 *
 * For cases where the magic syntax doesn't work or you want explicit control:
 *
 * @example
 * const result = await callAPI({
 *   apiUrl: 'https://universal-api.do',
 *   userId: 'user_123',
 *   request: 'charge customer cus_123 $50 for order #123'
 * })
 */
export async function callAPI(config: UniversalAPIConfig & { request: string }): Promise<UniversalAPIResponse> {
  const { apiUrl = 'https://universal-api.do', userId, request, provider, metadata, fetch: customFetch = globalThis.fetch } = config

  try {
    const response = await customFetch(`${apiUrl}/call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        request,
        provider,
        metadata,
      }),
    })

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      }
    }

    return await response.json()
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    }
  }
}

/**
 * Handle OAuth callback
 *
 * Call this from your OAuth callback route:
 *
 * @example
 * // In your /oauth/callback route:
 * const url = new URL(request.url)
 * const code = url.searchParams.get('code')
 * const userId = url.searchParams.get('state') // Pass userId as state
 *
 * await handleOAuthCallback({
 *   apiUrl: 'https://universal-api.do',
 *   userId,
 *   provider: 'stripe',
 *   code
 * })
 */
export async function handleOAuthCallback(config: {
  apiUrl?: string
  userId: string
  provider: string
  code: string
  fetch?: typeof fetch
}): Promise<{ success: boolean; error?: string }> {
  const { apiUrl = 'https://universal-api.do', userId, provider, code, fetch: customFetch = globalThis.fetch } = config

  try {
    const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/oauth/callback` : 'http://localhost:3000/oauth/callback'

    const response = await customFetch(`${apiUrl}/oauth/${provider}/callback?userId=${userId}&code=${code}&redirectUri=${encodeURIComponent(redirectUri)}`, {
      method: 'GET',
    })

    const data = await response.json()
    return data
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'OAuth callback failed',
    }
  }
}
