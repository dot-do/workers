/**
 * Screenshot Capture and Comparison
 * Takes screenshots of domains and detects visual changes
 */

import type { Env, ScreenshotResult } from './types'

/**
 * Capture screenshot of a domain
 */
export async function captureScreenshot(domain: string, env: Env): Promise<ScreenshotResult> {
  const url = `https://${domain}`
  const timestamp = new Date().toISOString()

  try {
    if (!env.BROWSERLESS_API_KEY) {
      return {
        domain,
        url,
        timestamp,
        success: false,
        error: 'Browserless API key not configured',
      }
    }

    // Use Browserless API to capture screenshot
    const response = await fetch('https://chrome.browserless.io/screenshot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.BROWSERLESS_API_KEY}`,
      },
      body: JSON.stringify({
        url,
        options: {
          fullPage: true,
          type: 'png',
        },
      }),
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) {
      return {
        domain,
        url,
        timestamp,
        success: false,
        error: `Screenshot API failed: ${response.status} ${response.statusText}`,
      }
    }

    // Get screenshot as buffer
    const screenshotBuffer = await response.arrayBuffer()

    // Store in R2 (if available) or return base64
    let screenshotUrl: string | undefined

    // For now, we'll just compute a hash for comparison
    const compareHash = await computeImageHash(screenshotBuffer)

    return {
      domain,
      url,
      timestamp,
      success: true,
      screenshotUrl,
      compareHash,
    }
  } catch (error) {
    return {
      domain,
      url,
      timestamp,
      success: false,
      error: error instanceof Error ? error.message : 'Screenshot capture failed',
    }
  }
}

/**
 * Compare screenshot with previous version
 */
export async function compareScreenshot(
  domain: string,
  currentHash: string,
  previousHash: string,
  threshold: number = 0.05
): Promise<{ changed: boolean; similarity: number }> {
  // Simple hash comparison for now
  // In production, you'd use perceptual hashing or image diff algorithms
  const changed = currentHash !== previousHash

  // Calculate rough similarity (0-1)
  const similarity = currentHash === previousHash ? 1 : 0

  return {
    changed,
    similarity,
  }
}

/**
 * Compute simple hash of image buffer for comparison
 */
async function computeImageHash(buffer: ArrayBuffer): Promise<string> {
  // Use SubtleCrypto to hash the image data
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)

  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

  return hashHex
}

/**
 * Get previous screenshot hash from database
 */
export async function getPreviousScreenshotHash(domain: string, env: Env): Promise<string | null> {
  try {
    const stmt = env.DB.prepare('SELECT compareHash FROM screenshots WHERE domain = ? ORDER BY timestamp DESC LIMIT 1')

    const result = await stmt.bind(domain).first()

    return result?.compareHash as string | null
  } catch (error) {
    console.error('Error getting previous screenshot:', error)
    return null
  }
}

/**
 * Store screenshot result in database
 */
export async function storeScreenshotResult(result: ScreenshotResult, env: Env): Promise<boolean> {
  try {
    const stmt = env.DB.prepare(
      `INSERT INTO screenshots (domain, url, timestamp, success, screenshotUrl, error, compareHash, changeDetected)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )

    await stmt
      .bind(
        result.domain,
        result.url,
        result.timestamp,
        result.success ? 1 : 0,
        result.screenshotUrl || null,
        result.error || null,
        result.compareHash || null,
        result.changeDetected ? 1 : 0
      )
      .run()

    return true
  } catch (error) {
    console.error('Error storing screenshot:', error)
    return false
  }
}

/**
 * Perform screenshot check with change detection
 */
export async function performScreenshotCheck(domain: string, env: Env): Promise<ScreenshotResult> {
  // Capture new screenshot
  const result = await captureScreenshot(domain, env)

  if (!result.success || !result.compareHash) {
    return result
  }

  // Get previous screenshot hash
  const previousHash = await getPreviousScreenshotHash(domain, env)

  if (previousHash) {
    // Compare with previous
    const comparison = await compareScreenshot(domain, result.compareHash, previousHash)
    result.changeDetected = comparison.changed
  }

  // Store result
  await storeScreenshotResult(result, env)

  return result
}
