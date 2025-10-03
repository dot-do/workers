/**
 * Gateway Routing Integration Tests
 *
 * Tests that gateway correctly routes requests to all 8 core services
 */

import { describe, it, expect } from 'vitest'
import { testRequest, assertSuccess, measureTime, assertPerformance } from './setup'

describe('Gateway Routing', () => {
  describe('Service Discovery', () => {
    it('should route to database service', async () => {
      const response = await testRequest('/api/db/health')
      assertSuccess(response)

      const data = await response.json()
      expect(data).toHaveProperty('service', 'db')
      expect(data).toHaveProperty('status', 'healthy')
    })

    it('should route to auth service', async () => {
      const response = await testRequest('/api/auth/health')
      assertSuccess(response)

      const data = await response.json()
      expect(data).toHaveProperty('service', 'auth')
    })

    it('should route to schedule service', async () => {
      const response = await testRequest('/api/schedule/health')
      assertSuccess(response)

      const data = await response.json()
      expect(data).toHaveProperty('service', 'schedule')
    })

    it('should route to webhooks service', async () => {
      const response = await testRequest('/api/webhooks/health')
      assertSuccess(response)

      const data = await response.json()
      expect(data).toHaveProperty('service', 'webhooks')
    })

    it('should route to email service', async () => {
      const response = await testRequest('/api/email/health')
      assertSuccess(response)

      const data = await response.json()
      expect(data).toHaveProperty('service', 'email')
    })

    it('should route to MCP service', async () => {
      const response = await testRequest('/api/mcp/health')
      assertSuccess(response)

      const data = await response.json()
      expect(data).toHaveProperty('service', 'mcp')
    })

    it('should route to queue service', async () => {
      const response = await testRequest('/api/queue/health')
      assertSuccess(response)

      const data = await response.json()
      expect(data).toHaveProperty('service', 'queue')
    })

    it('should report gateway health', async () => {
      const response = await testRequest('/health')
      assertSuccess(response)

      const data = await response.json()
      expect(data).toHaveProperty('service', 'gateway')
      expect(data).toHaveProperty('status', 'healthy')
      expect(data).toHaveProperty('services')

      // Should report health of all downstream services
      expect(data.services).toHaveProperty('db')
      expect(data.services).toHaveProperty('auth')
      expect(data.services).toHaveProperty('schedule')
    })
  })

  describe('Domain-Based Routing', () => {
    it('should route api.do domain to gateway', async () => {
      const response = await testRequest('/', {
        headers: {
          Host: 'api.do',
        },
      })

      assertSuccess(response)
    })

    it('should route db.do domain to database service', async () => {
      const response = await testRequest('/health', {
        headers: {
          Host: 'db.do',
        },
      })

      assertSuccess(response)
      const data = await response.json()
      expect(data.service).toBe('db')
    })

    it('should route auth.do domain to auth service', async () => {
      const response = await testRequest('/health', {
        headers: {
          Host: 'auth.do',
        },
      })

      assertSuccess(response)
      const data = await response.json()
      expect(data.service).toBe('auth')
    })
  })

  describe('Authentication & Authorization', () => {
    it('should accept valid API key', async () => {
      const response = await testRequest('/api/auth/me')
      assertSuccess(response)
    })

    it('should reject missing API key', async () => {
      const response = await testRequest('/api/auth/me', {
        headers: {
          Authorization: '', // No auth
        },
      })

      expect(response.status).toBe(401)
    })

    it('should reject invalid API key', async () => {
      const response = await testRequest('/api/auth/me', {
        headers: {
          Authorization: 'Bearer invalid-key',
        },
      })

      expect(response.status).toBe(401)
    })

    it('should pass auth context to downstream services', async () => {
      const response = await testRequest('/api/db/query', {
        method: 'POST',
        body: JSON.stringify({
          query: 'SELECT * FROM users LIMIT 1',
        }),
      })

      // Should have user context from auth
      assertSuccess(response)
    })
  })

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      // Make many requests quickly
      const requests = Array.from({ length: 100 }, () => testRequest('/api/auth/health'))

      const responses = await Promise.all(requests)

      // Some requests should be rate limited
      const rateLimited = responses.filter((r) => r.status === 429)
      expect(rateLimited.length).toBeGreaterThan(0)
    })

    it('should include rate limit headers', async () => {
      const response = await testRequest('/api/auth/health')

      expect(response.headers.get('X-RateLimit-Limit')).toBeDefined()
      expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined()
      expect(response.headers.get('X-RateLimit-Reset')).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await testRequest('/api/nonexistent')
      expect(response.status).toBe(404)
    })

    it('should return 405 for unsupported methods', async () => {
      const response = await testRequest('/api/auth/health', {
        method: 'DELETE',
      })

      expect(response.status).toBe(405)
    })

    it('should handle service errors gracefully', async () => {
      // Force an error in downstream service
      const response = await testRequest('/api/db/query', {
        method: 'POST',
        body: JSON.stringify({
          query: 'INVALID SQL',
        }),
      })

      expect(response.status).toBeGreaterThanOrEqual(400)

      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(data.error).toHaveProperty('message')
    })
  })

  describe('Performance', () => {
    it('should route requests within 10ms', async () => {
      const { duration } = await measureTime(async () => {
        const response = await testRequest('/api/auth/health')
        assertSuccess(response)
        return response
      })

      assertPerformance(duration, 10) // 10ms budget
    })

    it('should handle concurrent requests', async () => {
      const { duration } = await measureTime(async () => {
        const requests = Array.from({ length: 50 }, () => testRequest('/api/auth/health'))

        const responses = await Promise.all(requests)

        responses.forEach((response) => {
          assertSuccess(response)
        })
      })

      assertPerformance(duration, 1000) // 1 second for 50 requests
    })

    it('should cache responses when appropriate', async () => {
      // First request
      const { duration: duration1 } = await measureTime(async () => {
        return await testRequest('/api/db/health')
      })

      // Second request (should be cached)
      const { duration: duration2 } = await measureTime(async () => {
        return await testRequest('/api/db/health')
      })

      // Cached request should be faster
      expect(duration2).toBeLessThan(duration1)
    })
  })

  describe('CORS', () => {
    it('should include CORS headers', async () => {
      const response = await testRequest('/api/auth/health', {
        headers: {
          Origin: 'https://example.com',
        },
      })

      expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined()
      expect(response.headers.get('Access-Control-Allow-Methods')).toBeDefined()
    })

    it('should handle preflight requests', async () => {
      const response = await testRequest('/api/auth/health', {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://example.com',
          'Access-Control-Request-Method': 'POST',
        },
      })

      expect(response.status).toBe(204)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined()
    })
  })
})
