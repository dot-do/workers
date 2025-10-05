/**
 * Cloudflare Browser Rendering Implementation
 */

import puppeteer from '@cloudflare/puppeteer'
import type { Env, BrowseOptions, BrowseResult } from './types'

export async function browseWithCloudflare(
  url: string,
  options: BrowseOptions,
  env: Env
): Promise<BrowseResult> {
  const startTime = Date.now()

  console.log(`[Cloudflare Browser] Browsing: ${url}`)

  // Launch browser with Cloudflare binding
  const browser = await puppeteer.launch(env.BROWSER)

  try {
    const page = await browser.newPage()

    // Set viewport if specified
    if (options.viewport) {
      await page.setViewport(options.viewport)
    }

    // Set user agent if specified
    if (options.userAgent) {
      await page.setUserAgent(options.userAgent)
    }

    // Set cookies if specified
    if (options.cookies && options.cookies.length > 0) {
      await page.setCookie(...options.cookies)
    }

    // Navigate to URL
    await page.goto(url, {
      waitUntil: options.waitUntil || 'domcontentloaded',
      timeout: options.timeout || 30000,
    })

    // Inject CSS if specified
    if (options.css) {
      await page.addStyleTag({ content: options.css })
    }

    // Execute JavaScript if specified
    if (options.javascript) {
      await page.evaluate(options.javascript)
    }

    // Extract content
    const html = await page.content()
    const text = await page.evaluate(() => document.body.innerText)
    const title = await page.title()

    // Take screenshot if requested
    let screenshot: string | undefined
    if (options.screenshot) {
      const screenshotBuffer = await page.screenshot({
        fullPage: options.screenshot.fullPage,
        type: options.screenshot.format || 'png',
        quality: options.screenshot.quality,
      })

      // Convert to base64
      screenshot = Buffer.from(screenshotBuffer).toString('base64')
    }

    const loadTime = Date.now() - startTime

    return {
      html,
      text,
      screenshot,
      metadata: {
        url,
        title,
        statusCode: 200,
        loadTime,
        timestamp: new Date().toISOString(),
      },
      cached: false,
    }
  } finally {
    await browser.close()
  }
}

/**
 * Get cached browse result or fetch new one
 */
export async function browseWithCache(
  url: string,
  options: BrowseOptions,
  env: Env
): Promise<BrowseResult> {
  // Check cache if enabled
  if (options.cache !== false) {
    const cacheKey = generateCacheKey(url, options)
    const cached = await env.BROWSE_CACHE.get(cacheKey, 'json')

    if (cached) {
      console.log(`[Cloudflare Browser] Cache hit: ${url}`)
      return { ...cached, cached: true } as BrowseResult
    }
  }

  // Fetch fresh content
  const result = await browseWithCloudflare(url, options, env)

  // Store in cache if enabled
  if (options.cache !== false) {
    const cacheKey = generateCacheKey(url, options)
    const cacheTtl = options.cacheTtl || 3600 // 1 hour default

    await env.BROWSE_CACHE.put(
      cacheKey,
      JSON.stringify(result),
      { expirationTtl: cacheTtl }
    )
  }

  return result
}

/**
 * Generate cache key from URL and options
 */
function generateCacheKey(url: string, options: BrowseOptions): string {
  const params = {
    url,
    viewport: options.viewport,
    javascript: options.javascript,
    css: options.css,
    screenshot: options.screenshot,
  }

  return `browse:${Buffer.from(JSON.stringify(params)).toString('base64')}`
}
