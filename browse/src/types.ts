/**
 * Browse Worker Types
 */

export interface Env {
  // Browser binding
  BROWSER: Fetcher

  // KV binding
  BROWSE_CACHE: KVNamespace

  // Service bindings
  DB_SERVICE: any
  AUTH_SERVICE: any

  // Environment variables
  ENVIRONMENT: string
  LOG_LEVEL: string

  // Secrets
  BROWSERBASE_API_KEY?: string
  BROWSERBASE_PROJECT_ID?: string
}

export interface BrowseOptions {
  /**
   * Wait for specific condition before returning
   * @default 'domcontentloaded'
   */
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2'

  /**
   * Maximum timeout in milliseconds
   * @default 30000
   */
  timeout?: number

  /**
   * Viewport dimensions
   */
  viewport?: {
    width: number
    height: number
  }

  /**
   * Custom user agent
   */
  userAgent?: string

  /**
   * Cookies to set
   */
  cookies?: Array<{
    name: string
    value: string
    domain?: string
    path?: string
  }>

  /**
   * JavaScript to execute after page load
   */
  javascript?: string

  /**
   * CSS to inject
   */
  css?: string

  /**
   * Screenshot options (if screenshot requested)
   */
  screenshot?: {
    fullPage?: boolean
    selector?: string
    format?: 'png' | 'jpeg'
    quality?: number
  }

  /**
   * Cache the result (uses URL as cache key)
   */
  cache?: boolean

  /**
   * Cache TTL in seconds
   * @default 3600 (1 hour)
   */
  cacheTtl?: number
}

export interface BrowseResult {
  /**
   * Page HTML content
   */
  html?: string

  /**
   * Page text content (extracted)
   */
  text?: string

  /**
   * Screenshot data (base64)
   */
  screenshot?: string

  /**
   * Page metadata
   */
  metadata: {
    url: string
    title: string
    statusCode: number
    loadTime: number
    timestamp: string
  }

  /**
   * Whether result was served from cache
   */
  cached: boolean
}

export interface BrowserBaseSession {
  id: string
  connectUrl: string
  status: 'RUNNING' | 'COMPLETED' | 'ERROR'
  createdAt: string
}

export interface BrowserBaseOptions extends BrowseOptions {
  /**
   * Enable advanced stealth mode
   * @default false
   */
  advancedStealth?: boolean

  /**
   * Enable residential proxies
   * @default false
   */
  proxies?: boolean

  /**
   * Custom CAPTCHA selectors
   */
  captchaSelectors?: string[]
}
