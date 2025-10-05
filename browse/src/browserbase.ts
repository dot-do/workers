/**
 * BrowserBase Stealth Mode Implementation
 */

import puppeteer from '@cloudflare/puppeteer'
import type { Env, BrowserBaseOptions, BrowseResult, BrowserBaseSession } from './types'

export async function browseWithBrowserBase(
  url: string,
  options: BrowserBaseOptions,
  env: Env
): Promise<BrowseResult> {
  if (!env.BROWSERBASE_API_KEY || !env.BROWSERBASE_PROJECT_ID) {
    throw new Error('BrowserBase credentials not configured')
  }

  const startTime = Date.now()

  console.log(`[BrowserBase] Creating stealth session for: ${url}`)

  // Create BrowserBase session
  const session = await createBrowserBaseSession(options, env)

  try {
    // Connect to BrowserBase session
    const browser = await puppeteer.connect({
      browserWSEndpoint: session.connectUrl,
    })

    const page = await browser.newPage()

    // Set viewport if specified
    if (options.viewport) {
      await page.setViewport(options.viewport)
    }

    // Set user agent if specified (though BrowserBase manages this)
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

    // Wait for CAPTCHA solving (BrowserBase handles this automatically)
    // Just add a small delay to allow processing
    await page.waitForTimeout(2000)

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

      screenshot = Buffer.from(screenshotBuffer).toString('base64')
    }

    const loadTime = Date.now() - startTime

    await browser.close()

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
    // Clean up BrowserBase session
    await closeBrowserBaseSession(session.id, env)
  }
}

/**
 * Create BrowserBase session with stealth settings
 */
async function createBrowserBaseSession(
  options: BrowserBaseOptions,
  env: Env
): Promise<BrowserBaseSession> {
  const response = await fetch('https://www.browserbase.com/v1/sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-BB-API-Key': env.BROWSERBASE_API_KEY!,
    },
    body: JSON.stringify({
      projectId: env.BROWSERBASE_PROJECT_ID,
      browserSettings: {
        advancedStealth: options.advancedStealth !== false,
      },
      proxies: options.proxies || false,
      timeout: options.timeout || 600000, // 10 minutes max
    }),
  })

  if (!response.ok) {
    throw new Error(`BrowserBase session creation failed: ${response.statusText}`)
  }

  const data = await response.json() as any

  return {
    id: data.id,
    connectUrl: data.connectUrl,
    status: data.status,
    createdAt: data.createdAt,
  }
}

/**
 * Close BrowserBase session
 */
async function closeBrowserBaseSession(sessionId: string, env: Env): Promise<void> {
  try {
    await fetch(`https://www.browserbase.com/v1/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: {
        'X-BB-API-Key': env.BROWSERBASE_API_KEY!,
      },
    })
  } catch (error) {
    console.error('[BrowserBase] Failed to close session:', error)
  }
}
