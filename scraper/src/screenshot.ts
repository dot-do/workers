/**
 * Screenshot Implementation
 */

import type { Env, ScreenshotOptions, ScreenshotResult } from './types'

export async function captureScreenshot(
  url: string,
  options: ScreenshotOptions,
  env: Env
): Promise<ScreenshotResult> {
  const startTime = Date.now()

  console.log(`[Screenshot] Capturing: ${url}`)

  // Check cache first
  if (options.cache !== false) {
    const cached = await getFromCache(url, options, env)
    if (cached) {
      console.log(`[Screenshot] Cache hit: ${url}`)
      return cached
    }
  }

  // Capture screenshot via browse service
  const browseOptions = {
    viewport: options.viewport || { width: 1280, height: 1024 },
    waitUntil: options.waitUntil || 'domcontentloaded',
    timeout: options.timeout || 30000,
    userAgent: options.userAgent,
    javascript: options.javascript,
    css: options.css,
    screenshot: {
      fullPage: options.fullPage || false,
      selector: options.selector,
      format: options.format || 'png',
      quality: options.quality,
    },
    cache: false, // Don't cache in browse service
  }

  // Use stealth mode if requested
  const browseResult = options.stealth
    ? await env.BROWSE_SERVICE.browseStealth(url, browseOptions)
    : await env.BROWSE_SERVICE.browse(url, browseOptions)

  if (!browseResult.screenshot) {
    throw new Error('Failed to capture screenshot')
  }

  // Validate screenshot size
  const imageBuffer = Buffer.from(browseResult.screenshot, 'base64')
  const imageSize = imageBuffer.length
  const maxSize = parseInt(env.MAX_SCREENSHOT_SIZE)

  if (imageSize > maxSize) {
    throw new Error(`Screenshot too large: ${imageSize} bytes (max: ${maxSize} bytes)`)
  }

  const renderTime = Date.now() - startTime

  const result: ScreenshotResult = {
    image: browseResult.screenshot,
    format: options.format || 'png',
    size: imageSize,
    metadata: {
      url: browseResult.metadata.url,
      title: browseResult.metadata.title,
      viewport: options.viewport || { width: 1280, height: 1024 },
      timestamp: new Date().toISOString(),
      renderTime,
    },
    cached: false,
  }

  // Store in cache
  if (options.cache !== false) {
    await storeInCache(url, options, result, env)
  }

  return result
}

/**
 * Get screenshot from R2 cache
 */
async function getFromCache(
  url: string,
  options: ScreenshotOptions,
  env: Env
): Promise<ScreenshotResult | null> {
  const cacheKey = generateCacheKey(url, options)

  try {
    const cached = await env.SCREENSHOT_CACHE.get(cacheKey, 'json')

    if (cached) {
      return {
        ...cached,
        cached: true,
        cacheKey,
      } as ScreenshotResult
    }
  } catch (error) {
    console.error('[Screenshot] Cache read error:', error)
  }

  return null
}

/**
 * Store screenshot in R2 cache
 */
async function storeInCache(
  url: string,
  options: ScreenshotOptions,
  result: ScreenshotResult,
  env: Env
): Promise<void> {
  const cacheKey = generateCacheKey(url, options)
  const cacheTtl = options.cacheTtl || parseInt(env.DEFAULT_CACHE_TTL)

  try {
    // Store with expiration metadata
    const expiresAt = new Date(Date.now() + cacheTtl * 1000).toISOString()

    await env.SCREENSHOT_CACHE.put(
      cacheKey,
      JSON.stringify(result),
      {
        customMetadata: {
          url,
          expiresAt,
          format: result.format,
          size: result.size.toString(),
        },
      }
    )

    console.log(`[Screenshot] Cached: ${cacheKey} (TTL: ${cacheTtl}s)`)
  } catch (error) {
    console.error('[Screenshot] Cache write error:', error)
  }
}

/**
 * Generate cache key from URL and options
 */
function generateCacheKey(url: string, options: ScreenshotOptions): string {
  const params = {
    url,
    fullPage: options.fullPage,
    selector: options.selector,
    viewport: options.viewport,
    format: options.format,
    quality: options.quality,
    stealth: options.stealth,
  }

  // Create hash from params
  const hash = Buffer.from(JSON.stringify(params)).toString('base64url')

  return `screenshot:${hash}`
}

/**
 * Delete expired screenshots from cache
 */
export async function cleanupExpiredScreenshots(env: Env): Promise<{ deleted: number }> {
  let deleted = 0
  const now = new Date()

  try {
    // List all objects in bucket
    const list = await env.SCREENSHOT_CACHE.list()

    for (const object of list.objects) {
      const metadata = object.customMetadata
      if (metadata?.expiresAt) {
        const expiresAt = new Date(metadata.expiresAt)
        if (expiresAt < now) {
          await env.SCREENSHOT_CACHE.delete(object.key)
          deleted++
        }
      }
    }

    console.log(`[Screenshot] Cleanup: deleted ${deleted} expired screenshots`)
  } catch (error) {
    console.error('[Screenshot] Cleanup error:', error)
  }

  return { deleted }
}
