import { describe, test, expect } from 'vitest'
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'

// Domain pattern: looks like a domain (contains a dot and is not a scoped package)
const DOMAIN_PATTERN = /^[a-z0-9-]+\.[a-z]+$/

// Common parking page indicators
const PARKING_INDICATORS = [
  'domain is for sale',
  'buy this domain',
  'domain parking',
  'parked domain',
  'this domain may be for sale',
  'domain available',
  'godaddy',
  'hugedomains',
  'sedo.com',
  'afternic',
  'dan.com',
  'undeveloped',
  'this webpage is parked',
  'domain registered at',
  'coming soon page',
  'under construction',
  'namecheap',
  'domainsponsor',
  'bodis',
  'above.com',
  'domainmarket',
]

// Timeout per domain request (ms)
const REQUEST_TIMEOUT = 10000

// Slow response threshold (ms)
const SLOW_THRESHOLD = 5000

/**
 * Extract domain-style package names from sdks directory package.json files
 */
function extractDomains(): string[] {
  const sdksDir = join(__dirname, '..', 'sdks')
  const domains: string[] = []

  try {
    const entries = readdirSync(sdksDir, { withFileTypes: true })

    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      const packageJsonPath = join(sdksDir, entry.name, 'package.json')
      try {
        const content = readFileSync(packageJsonPath, 'utf-8')
        const pkg = JSON.parse(content)
        const name = pkg.name as string

        // Check if package name looks like a domain
        if (name && DOMAIN_PATTERN.test(name)) {
          domains.push(name)
        }
      } catch {
        // Skip packages without valid package.json
      }
    }
  } catch (error) {
    console.error('Failed to read sdks directory:', error)
  }

  return domains.sort()
}

/**
 * Check if response body contains parking page indicators
 */
function isParkingPage(body: string): boolean {
  const lowerBody = body.toLowerCase()
  return PARKING_INDICATORS.some((indicator) => lowerBody.includes(indicator))
}

/**
 * Fetch a domain with timeout
 */
async function fetchWithTimeout(url: string, timeout: number): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'workers.do-domain-health-check/1.0',
        Accept: 'text/html,application/json,*/*',
      },
    })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

// Extract domains from SDK packages
const domains = extractDomains()

describe('Domain Health Checks', () => {
  test('should have domains to test', () => {
    expect(domains.length).toBeGreaterThan(0)
    console.log(`Found ${domains.length} domains to test:`, domains)
  })

  test.each(domains)(
    '%s responds correctly',
    async (domain) => {
      const url = `https://${domain}/`
      const startTime = Date.now()

      let response: Response
      try {
        response = await fetchWithTimeout(url, REQUEST_TIMEOUT)
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error(`Request to ${domain} timed out after ${REQUEST_TIMEOUT}ms`)
        }
        throw error
      }

      const elapsed = Date.now() - startTime

      // Warn about slow responses
      if (elapsed > SLOW_THRESHOLD) {
        console.warn(`[WARNING] ${domain}: Slow response (${elapsed}ms > ${SLOW_THRESHOLD}ms threshold)`)
      }

      // Check for redirects to unexpected domains
      const finalUrl = response.url
      const finalHostname = new URL(finalUrl).hostname
      if (finalHostname !== domain && !finalHostname.endsWith(`.${domain}`)) {
        console.warn(`[WARNING] ${domain}: Redirected to unexpected domain: ${finalHostname}`)
      }

      // Log content type (informational)
      const contentType = response.headers.get('content-type') || 'unknown'
      if (!contentType.includes('application/json')) {
        console.info(`[INFO] ${domain}: Content-Type is ${contentType}`)
      }

      // Verify response status is 2xx or 3xx
      expect(response.status).toBeGreaterThanOrEqual(200)
      expect(response.status).toBeLessThan(400)

      // Check for parking page indicators in body
      const body = await response.text()
      const isParked = isParkingPage(body)

      if (isParked) {
        throw new Error(`${domain} appears to be a parking page. Check the domain configuration.`)
      }

      // Log success
      console.log(`[OK] ${domain}: ${response.status} in ${elapsed}ms`)
    },
    REQUEST_TIMEOUT + 5000 // Per-test timeout slightly higher than fetch timeout
  )
})

describe('Domain List', () => {
  test('logs all discovered domains', () => {
    console.log('\n=== Discovered Domains ===')
    domains.forEach((domain) => {
      console.log(`  - ${domain}`)
    })
    console.log(`\nTotal: ${domains.length} domains`)
    expect(true).toBe(true)
  })
})
