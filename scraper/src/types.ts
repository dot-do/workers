/**
 * Scraper Worker Types
 */

export interface Env {
  // R2 bucket binding
  SCREENSHOT_CACHE: R2Bucket

  // Service bindings
  BROWSE_SERVICE: any
  DB_SERVICE: any
  AUTH_SERVICE: any

  // Environment variables
  ENVIRONMENT: string
  LOG_LEVEL: string
  DEFAULT_CACHE_TTL: string
  MAX_SCREENSHOT_SIZE: string
}

export interface ScreenshotOptions {
  /**
   * Capture full page screenshot
   * @default false
   */
  fullPage?: boolean

  /**
   * CSS selector to capture specific element
   */
  selector?: string

  /**
   * Viewport dimensions
   */
  viewport?: {
    width: number
    height: number
  }

  /**
   * Image format
   * @default 'png'
   */
  format?: 'png' | 'jpeg'

  /**
   * Image quality (for JPEG)
   * @default 80
   */
  quality?: number

  /**
   * Wait for specific condition
   * @default 'domcontentloaded'
   */
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2'

  /**
   * Maximum timeout in milliseconds
   * @default 30000
   */
  timeout?: number

  /**
   * Use stealth mode (BrowserBase)
   * @default false
   */
  stealth?: boolean

  /**
   * Cache the screenshot
   * @default true
   */
  cache?: boolean

  /**
   * Cache TTL in seconds
   * @default 86400 (24 hours)
   */
  cacheTtl?: number

  /**
   * Custom user agent
   */
  userAgent?: string

  /**
   * JavaScript to execute before screenshot
   */
  javascript?: string

  /**
   * CSS to inject before screenshot
   */
  css?: string
}

export interface ScreenshotResult {
  /**
   * Screenshot image (base64)
   */
  image: string

  /**
   * Image format
   */
  format: 'png' | 'jpeg'

  /**
   * Image size in bytes
   */
  size: number

  /**
   * Screenshot metadata
   */
  metadata: {
    url: string
    title: string
    viewport: { width: number; height: number }
    timestamp: string
    renderTime: number
  }

  /**
   * Whether served from cache
   */
  cached: boolean

  /**
   * Cache key (for debugging)
   */
  cacheKey?: string
}
