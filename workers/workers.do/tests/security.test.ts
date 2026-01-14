/**
 * Security Tests for workers.do
 *
 * TDD RED Phase - These tests define security requirements that are
 * NOT yet implemented. They should all FAIL initially.
 *
 * Security issues identified:
 * 1. getUserId() uses weak token derivation (first 8 chars)
 * 2. CORS allows all origins (*)
 * 3. serve404() has XSS vulnerability (unescaped appId)
 * 4. No rate limiting
 * 5. No input validation on deploy requests
 * 6. No proper authorization checks
 *
 * Run with: npx vitest run tests/security.test.ts
 */

import { env, SELF } from 'cloudflare:test'
import { describe, it, expect } from 'vitest'

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Helper to create a fetch request
 */
function createRequest(path: string, options?: RequestInit): Request {
  return new Request(`https://workers.do${path}`, options)
}

/**
 * Helper to create a request with authorization
 */
function createAuthRequest(path: string, token: string, options?: RequestInit): Request {
  return new Request(`https://workers.do${path}`, {
    ...options,
    headers: {
      ...options?.headers,
      'Authorization': `Bearer ${token}`,
    },
  })
}

// ============================================================================
// Security Tests
// ============================================================================

describe('Security', () => {
  describe('Authorization header validation', () => {
    /**
     * Test: Protected endpoints should reject requests without Authorization header
     *
     * Currently: Anonymous users get 'anonymous' user ID and can access DO
     * Expected: Protected endpoints should return 401 Unauthorized
     */
    it('should reject requests to /workers without Authorization header', async () => {
      const response = await SELF.fetch(createRequest('/workers'))

      // Consume body to avoid storage isolation issues
      const body = await response.text()

      // This test should FAIL because currently anonymous users are allowed
      expect(response.status).toBe(401)

      // Parse body only if it's JSON
      if (response.headers.get('Content-Type')?.includes('application/json')) {
        const data = JSON.parse(body) as { error: string }
        expect(data.error).toContain('Authorization')
      }
    })

    /**
     * Test: Invalid Authorization header format should be rejected
     */
    it('should reject requests with invalid Authorization header format', async () => {
      const response = await SELF.fetch(createRequest('/workers', {
        headers: { 'Authorization': 'InvalidFormat token123' }
      }))

      // Consume body to avoid storage isolation issues
      const body = await response.text()

      // This test should FAIL because currently any format is accepted
      expect(response.status).toBe(401)

      // Parse body only if it's JSON
      if (response.headers.get('Content-Type')?.includes('application/json')) {
        const data = JSON.parse(body) as { error: string }
        expect(data.error).toContain('Invalid')
      }
    })

    /**
     * Test: Empty bearer token should be rejected
     */
    it('should reject requests with empty bearer token', async () => {
      const response = await SELF.fetch(createRequest('/workers', {
        headers: { 'Authorization': 'Bearer ' }
      }))

      // Consume body to avoid storage isolation issues
      await response.text()

      // This test should FAIL because empty tokens become 'anonymous'
      expect(response.status).toBe(401)
    })
  })

  describe('User ID derivation', () => {
    /**
     * Test: User ID should be derived using proper cryptographic hashing
     *
     * Currently: getUserId() uses token.slice(0, 8) which is weak:
     * - Similar tokens get same user ID
     * - Predictable mapping
     * - No cryptographic properties
     *
     * Expected: Use crypto.subtle.digest for proper hashing
     */
    it('should derive different user IDs for similar tokens', async () => {
      // Two tokens that share the same first 8 characters
      const token1 = 'abcd1234-token-one-unique-suffix'
      const token2 = 'abcd1234-token-two-different-suffix'

      // Make requests to get user-specific data
      const response1 = await SELF.fetch(createAuthRequest('/workers', token1))
      const response2 = await SELF.fetch(createAuthRequest('/workers', token2))

      // Consume bodies to avoid storage isolation issues
      await response1.text()
      await response2.text()

      // Currently both will route to the same user ID (user_abcd1234)
      // Check via response headers or a user-info endpoint
      const userId1 = response1.headers.get('X-User-Id')
      const userId2 = response2.headers.get('X-User-Id')

      // This test should FAIL because current implementation uses first 8 chars
      // Expected: Different tokens should produce different user IDs
      expect(userId1).not.toBe(userId2)
    })

    /**
     * Test: User ID should be consistent for same token
     */
    it('should derive consistent user ID for the same token', async () => {
      const token = 'consistent-test-token-12345'

      const response1 = await SELF.fetch(createAuthRequest('/workers', token))
      const response2 = await SELF.fetch(createAuthRequest('/workers', token))

      // Consume bodies to avoid storage isolation issues
      await response1.text()
      await response2.text()

      const userId1 = response1.headers.get('X-User-Id')
      const userId2 = response2.headers.get('X-User-Id')

      // This test might pass but relies on X-User-Id header being exposed
      expect(userId1).toBe(userId2)
    })

    /**
     * Test: User ID should use full cryptographic hash
     */
    it('should produce user IDs with cryptographic hash length', async () => {
      const token = 'test-token-for-hash-length'
      const response = await SELF.fetch(createAuthRequest('/workers', token))

      // Consume body to avoid storage isolation issues
      await response.text()

      const userId = response.headers.get('X-User-Id')

      // Should be a full hash, not just 8 chars
      // Current: user_abcd1234 (13 chars)
      // Expected: user_<sha256-hex> (69+ chars)
      expect(userId?.length).toBeGreaterThan(30)
    })
  })

  describe('XSS prevention in error responses', () => {
    /**
     * Test: 404 responses should escape HTML in appId
     *
     * Currently: serve404() directly interpolates appId into HTML
     * Vulnerable to: <script>alert('xss')</script>
     *
     * Expected: HTML entities should be escaped
     */
    it('should escape HTML entities in 404 error page', async () => {
      // Request with XSS payload in path (not subdomain, to avoid URL encoding issues)
      // Using a path-based app ID with malicious content
      const xssPayload = '<script>alert("xss")</script>'
      const maliciousRequest = new Request(
        `https://workers.do/apps/${xssPayload}/test`,
        { method: 'GET' }
      )

      const response = await SELF.fetch(maliciousRequest)

      // Get response body
      const html = await response.text()

      // This test should FAIL because serve404() doesn't escape HTML
      // The raw script tag should NOT appear in the response
      expect(html).not.toContain('<script>alert')
      expect(html).not.toContain('</script>')

      // Should contain escaped versions instead if appId is reflected
      // expect(html).toContain('&lt;script&gt;')
    })

    /**
     * Test: Error messages should not reflect user input without escaping
     */
    it('should escape HTML in all error messages', async () => {
      const xssPayload = '"><img src=x onerror=alert(1)>'

      const response = await SELF.fetch(createRequest(`/api/deployments/${xssPayload}`))

      const body = await response.text()

      // Should not contain unescaped HTML
      expect(body).not.toContain('onerror=')
      expect(body).not.toContain('<img')
    })
  })

  describe('CORS origin restrictions', () => {
    /**
     * Test: CORS should not allow all origins
     *
     * Currently: origin: '*' allows any website to make requests
     * Expected: Whitelist of allowed origins
     */
    it('should not set Access-Control-Allow-Origin to *', async () => {
      const response = await SELF.fetch(createRequest('/health', {
        headers: { 'Origin': 'https://malicious-site.com' }
      }))

      // Consume body to avoid storage isolation issues
      await response.text()

      const corsHeader = response.headers.get('Access-Control-Allow-Origin')

      // This test should FAIL because CORS currently allows all origins
      expect(corsHeader).not.toBe('*')
    })

    /**
     * Test: CORS should allow legitimate origins
     */
    it('should allow requests from workers.do domain', async () => {
      const response = await SELF.fetch(createRequest('/health', {
        headers: { 'Origin': 'https://app.workers.do' }
      }))

      // Consume body to avoid storage isolation issues
      await response.text()

      const corsHeader = response.headers.get('Access-Control-Allow-Origin')

      // Should allow workers.do subdomains
      expect(corsHeader).toBe('https://app.workers.do')
    })

    /**
     * Test: CORS should reject unknown origins
     */
    it('should reject requests from unknown origins', async () => {
      const response = await SELF.fetch(createRequest('/api/deploy', {
        method: 'POST',
        headers: {
          'Origin': 'https://attacker.com',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: 'test', code: 'export default {}' })
      }))

      // Consume body to avoid storage isolation issues
      await response.text()

      const corsHeader = response.headers.get('Access-Control-Allow-Origin')

      // Should not reflect the attacker's origin
      expect(corsHeader).not.toBe('https://attacker.com')
      expect(corsHeader).toBeNull()
    })

    /**
     * Test: CORS preflight should validate origin
     */
    it('should reject OPTIONS preflight from unknown origins', async () => {
      const response = await SELF.fetch(createRequest('/api/deploy', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://unknown-site.com',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      }))

      // Consume body to avoid storage isolation issues
      await response.text()

      const corsHeader = response.headers.get('Access-Control-Allow-Origin')

      // This should FAIL because current CORS allows all
      expect(corsHeader).not.toBe('*')
      expect(corsHeader).not.toBe('https://unknown-site.com')
    })
  })

  describe('Rate limiting', () => {
    /**
     * Test: Requests should be rate limited per user/IP
     *
     * Currently: No rate limiting implemented
     * Expected: Return 429 Too Many Requests after threshold
     */
    it('should rate limit excessive requests', async () => {
      const token = 'rate-limit-test-token'

      // Make many sequential requests (not parallel to avoid storage issues)
      let rateLimitedCount = 0
      for (let i = 0; i < 50; i++) {
        const response = await SELF.fetch(createAuthRequest('/health', token))
        // Consume body to avoid storage isolation issues
        await response.text()
        if (response.status === 429) {
          rateLimitedCount++
        }
      }

      // This test should FAIL because no rate limiting exists
      expect(rateLimitedCount).toBeGreaterThan(0)
    })

    /**
     * Test: Rate limit headers should be present
     */
    it('should include rate limit headers in response', async () => {
      const response = await SELF.fetch(createAuthRequest('/workers', 'test-token'))

      // Consume body to avoid storage isolation issues
      await response.text()

      // Standard rate limit headers
      const remaining = response.headers.get('X-RateLimit-Remaining')
      const limit = response.headers.get('X-RateLimit-Limit')
      const reset = response.headers.get('X-RateLimit-Reset')

      // This test should FAIL because headers are not implemented
      expect(remaining).not.toBeNull()
      expect(limit).not.toBeNull()
      expect(reset).not.toBeNull()
    })

    /**
     * Test: Rate limits should reset after window
     */
    it('should reset rate limits after time window', async () => {
      const response = await SELF.fetch(createAuthRequest('/workers', 'test-token'))

      // Consume body to avoid storage isolation issues
      await response.text()

      const reset = response.headers.get('X-RateLimit-Reset')

      // Reset time should be in the future but within reasonable window
      if (reset) {
        const resetTime = parseInt(reset, 10)
        const now = Math.floor(Date.now() / 1000)
        expect(resetTime).toBeGreaterThan(now)
        expect(resetTime - now).toBeLessThan(3600) // Within 1 hour
      }

      // This test should FAIL because header doesn't exist
      expect(reset).not.toBeNull()
    })
  })

  describe('Input validation on deploy requests', () => {
    /**
     * Test: Deploy should validate name format
     *
     * Currently: No validation on name field
     * Expected: Reject invalid names (special chars, too long, etc.)
     */
    it('should reject deploy with invalid worker name', async () => {
      const response = await SELF.fetch(createRequest('/api/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          name: '../../../etc/passwd', // Path traversal attempt
          code: 'export default {}'
        })
      }))

      const data = await response.json() as { success: boolean; error?: string }

      // This test should FAIL because no validation exists
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('invalid')
    })

    /**
     * Test: Deploy should reject names with special characters
     */
    it('should reject deploy with special characters in name', async () => {
      const response = await SELF.fetch(createRequest('/api/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          name: 'worker<script>alert(1)</script>',
          code: 'export default {}'
        })
      }))

      const data = await response.json() as { success: boolean; error?: string }

      // This test should FAIL because no validation exists
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    /**
     * Test: Deploy should validate name length
     */
    it('should reject deploy with excessively long name', async () => {
      const response = await SELF.fetch(createRequest('/api/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          name: 'a'.repeat(1000), // Very long name
          code: 'export default {}'
        })
      }))

      const data = await response.json() as { success: boolean; error?: string }

      // This test should FAIL because no length validation exists
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('length')
    })

    /**
     * Test: Deploy should require code field
     */
    it('should reject deploy without code field', async () => {
      const response = await SELF.fetch(createRequest('/api/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          name: 'valid-name'
          // Missing code field
        })
      }))

      const data = await response.json() as { success: boolean; error?: string }

      // Should validate required fields
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('code')
    })

    /**
     * Test: Deploy should validate code is a string
     */
    it('should reject deploy with non-string code', async () => {
      const response = await SELF.fetch(createRequest('/api/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          name: 'valid-name',
          code: { malicious: 'object' } // Not a string
        })
      }))

      const data = await response.json() as { success: boolean; error?: string }

      // This test should FAIL because no type validation exists
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    /**
     * Test: Deploy should reject excessively large code
     */
    it('should reject deploy with code exceeding size limit', async () => {
      const response = await SELF.fetch(createRequest('/api/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          name: 'valid-name',
          code: 'x'.repeat(10 * 1024 * 1024) // 10MB of code
        })
      }))

      const data = await response.json() as { success: boolean; error?: string }

      // This test should FAIL because no size limit exists
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('size')
    })

    /**
     * Test: Deploy should validate language option
     */
    it('should reject deploy with invalid language option', async () => {
      const response = await SELF.fetch(createRequest('/api/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          name: 'valid-name',
          code: 'export default {}',
          language: 'python' // Not a valid language option
        })
      }))

      const data = await response.json() as { success: boolean; error?: string }

      // This test should FAIL because no enum validation exists
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })
  })

  describe('Content-Type validation', () => {
    /**
     * Test: POST endpoints should require proper Content-Type
     */
    it('should reject POST without Content-Type header', async () => {
      const response = await SELF.fetch(createRequest('/api/deploy', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token'
          // Missing Content-Type
        },
        body: '{"name": "test", "code": "export default {}"}'
      }))

      // Should require Content-Type: application/json
      expect(response.status).toBe(415) // Unsupported Media Type
    })

    /**
     * Test: Should reject non-JSON Content-Type for JSON endpoints
     */
    it('should reject non-JSON Content-Type', async () => {
      const response = await SELF.fetch(createRequest('/api/deploy', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'text/plain'
        },
        body: '{"name": "test", "code": "export default {}"}'
      }))

      // Should reject non-JSON content types
      expect(response.status).toBe(415)
    })
  })
})
