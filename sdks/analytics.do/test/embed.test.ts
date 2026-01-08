/**
 * Tests for analytics.do/embed - SSO Embedding
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createEmbedUrl,
  generateEmbedToken,
  verifyEmbedToken,
  configureEmbed,
  getEmbedConfig,
  type EmbedUser,
  type EmbedUrlOptions,
} from '../embed'

const TEST_SECRET = 'test-secret-key-for-hmac-signing-do-not-use-in-production'

describe('analytics.do/embed', () => {
  beforeEach(() => {
    // Reset config before each test
    configureEmbed({
      baseUrl: 'https://analytics.do',
      secret: TEST_SECRET,
      defaultSessionLength: 3600,
    })
  })

  describe('configureEmbed', () => {
    it('should configure embed settings', () => {
      configureEmbed({
        baseUrl: 'https://custom.analytics.do',
        secret: 'custom-secret',
        defaultSessionLength: 7200,
      })

      const config = getEmbedConfig()
      expect(config.baseUrl).toBe('https://custom.analytics.do')
      expect(config.secret).toBe('custom-secret')
      expect(config.defaultSessionLength).toBe(7200)
    })

    it('should merge partial config updates', () => {
      configureEmbed({ baseUrl: 'https://custom.analytics.do' })
      configureEmbed({ defaultSessionLength: 7200 })

      const config = getEmbedConfig()
      expect(config.baseUrl).toBe('https://custom.analytics.do')
      expect(config.defaultSessionLength).toBe(7200)
    })
  })

  describe('generateEmbedToken', () => {
    it('should generate a valid JWT token', async () => {
      const user: EmbedUser = {
        external_user_id: 'user_123',
        first_name: 'Alice',
        last_name: 'Johnson',
        email: 'alice@example.com',
        permissions: ['access_data', 'see_dashboards'],
        models: ['customer_facing'],
        user_attributes: { customer_id: 'cust_456' },
      }

      const token = await generateEmbedToken(user, TEST_SECRET, 3600)

      expect(token).toBeTruthy()
      expect(token.split('.')).toHaveLength(3) // header.payload.signature

      // Verify the token
      const payload = await verifyEmbedToken(token, TEST_SECRET)
      expect(payload.external_user_id).toBe('user_123')
      expect(payload.first_name).toBe('Alice')
      expect(payload.permissions).toEqual(['access_data', 'see_dashboards'])
    })

    it('should include session length in payload', async () => {
      const user: EmbedUser = {
        external_user_id: 'user_123',
        permissions: ['access_data'],
      }

      const token = await generateEmbedToken(user, TEST_SECRET, 7200)
      const payload = await verifyEmbedToken(token, TEST_SECRET)

      expect(payload.session_length).toBe(7200)
      expect(payload.exp).toBeGreaterThan(payload.iat)
      expect(payload.exp - payload.iat).toBe(7200)
    })

    it('should include optional filters and theme', async () => {
      const user: EmbedUser = {
        external_user_id: 'user_123',
        permissions: ['access_data'],
      }

      const token = await generateEmbedToken(user, TEST_SECRET, 3600, {
        filters: { period: 'last_30_days' },
        theme: 'dark',
      })

      const payload = await verifyEmbedToken(token, TEST_SECRET)
      expect(payload.filters).toEqual({ period: 'last_30_days' })
      expect(payload.theme).toBe('dark')
    })

    it('should generate unique nonces for each token', async () => {
      const user: EmbedUser = {
        external_user_id: 'user_123',
        permissions: ['access_data'],
      }

      const token1 = await generateEmbedToken(user, TEST_SECRET)
      const token2 = await generateEmbedToken(user, TEST_SECRET)

      const payload1 = await verifyEmbedToken(token1, TEST_SECRET)
      const payload2 = await verifyEmbedToken(token2, TEST_SECRET)

      expect(payload1.nonce).not.toBe(payload2.nonce)
    })
  })

  describe('verifyEmbedToken', () => {
    it('should verify a valid token', async () => {
      const user: EmbedUser = {
        external_user_id: 'user_123',
        permissions: ['access_data'],
      }

      const token = await generateEmbedToken(user, TEST_SECRET)
      const payload = await verifyEmbedToken(token, TEST_SECRET)

      expect(payload.external_user_id).toBe('user_123')
      expect(payload.permissions).toEqual(['access_data'])
    })

    it('should reject token with invalid signature', async () => {
      const user: EmbedUser = {
        external_user_id: 'user_123',
        permissions: ['access_data'],
      }

      const token = await generateEmbedToken(user, TEST_SECRET)
      const tamperedToken = token.slice(0, -5) + 'xxxxx'

      await expect(verifyEmbedToken(tamperedToken, TEST_SECRET)).rejects.toThrow(
        'Invalid token signature'
      )
    })

    it('should reject token signed with wrong secret', async () => {
      const user: EmbedUser = {
        external_user_id: 'user_123',
        permissions: ['access_data'],
      }

      const token = await generateEmbedToken(user, TEST_SECRET)

      await expect(verifyEmbedToken(token, 'wrong-secret')).rejects.toThrow(
        'Invalid token signature'
      )
    })

    it('should reject malformed token', async () => {
      await expect(verifyEmbedToken('not.a.valid.token', TEST_SECRET)).rejects.toThrow(
        'Invalid token format'
      )
      await expect(verifyEmbedToken('invalid', TEST_SECRET)).rejects.toThrow(
        'Invalid token format'
      )
    })

    it('should reject expired token', async () => {
      const user: EmbedUser = {
        external_user_id: 'user_123',
        permissions: ['access_data'],
      }

      // Create token that expires immediately
      const token = await generateEmbedToken(user, TEST_SECRET, -1)

      await expect(verifyEmbedToken(token, TEST_SECRET)).rejects.toThrow('Token has expired')
    })
  })

  describe('createEmbedUrl', () => {
    it('should create dashboard embed URL', async () => {
      const options: EmbedUrlOptions = {
        dashboard: 'customer_analytics',
        user: {
          external_user_id: 'user_123',
          permissions: ['access_data', 'see_dashboards'],
        },
      }

      const url = await createEmbedUrl(options)

      expect(url).toContain('https://analytics.do/embed')
      expect(url).toContain('dashboard=customer_analytics')
      expect(url).toContain('token=')

      // Verify token in URL is valid
      const urlObj = new URL(url)
      const token = urlObj.searchParams.get('token')
      expect(token).toBeTruthy()

      if (token) {
        const payload = await verifyEmbedToken(token, TEST_SECRET)
        expect(payload.external_user_id).toBe('user_123')
      }
    })

    it('should create report embed URL', async () => {
      const options: EmbedUrlOptions = {
        report: 'monthly_revenue',
        user: {
          external_user_id: 'user_123',
          permissions: ['access_data', 'see_reports'],
        },
      }

      const url = await createEmbedUrl(options)

      expect(url).toContain('report=monthly_revenue')
    })

    it('should create explore embed URL', async () => {
      const options: EmbedUrlOptions = {
        explore: 'orders',
        user: {
          external_user_id: 'user_123',
          permissions: ['access_data', 'explore_data'],
        },
      }

      const url = await createEmbedUrl(options)

      expect(url).toContain('explore=orders')
    })

    it('should include custom URL path', async () => {
      const options: EmbedUrlOptions = {
        url: '/custom/path',
        user: {
          external_user_id: 'user_123',
          permissions: ['access_data'],
        },
      }

      const url = await createEmbedUrl(options)

      expect(url).toContain('url=%2Fcustom%2Fpath')
    })

    it('should include target origin', async () => {
      const options: EmbedUrlOptions = {
        dashboard: 'test',
        user: {
          external_user_id: 'user_123',
          permissions: ['access_data'],
        },
        target_origin: 'https://example.com',
      }

      const url = await createEmbedUrl(options)

      expect(url).toContain('target_origin=https%3A%2F%2Fexample.com')
    })

    it('should include custom params', async () => {
      const options: EmbedUrlOptions = {
        dashboard: 'test',
        user: {
          external_user_id: 'user_123',
          permissions: ['access_data'],
        },
        params: {
          locale: 'en-US',
          timezone: 'America/New_York',
        },
      }

      const url = await createEmbedUrl(options)

      expect(url).toContain('locale=en-US')
      expect(url).toContain('timezone=America%2FNew_York')
    })

    it('should use custom session length', async () => {
      const options: EmbedUrlOptions = {
        dashboard: 'test',
        user: {
          external_user_id: 'user_123',
          permissions: ['access_data'],
        },
        session_length: 7200,
      }

      const url = await createEmbedUrl(options)
      const urlObj = new URL(url)
      const token = urlObj.searchParams.get('token')

      if (token) {
        const payload = await verifyEmbedToken(token, TEST_SECRET)
        expect(payload.session_length).toBe(7200)
      }
    })

    it('should include filters in token', async () => {
      const options: EmbedUrlOptions = {
        dashboard: 'test',
        user: {
          external_user_id: 'user_123',
          permissions: ['access_data'],
        },
        filters: {
          period: 'last_30_days',
          status: 'active',
        },
      }

      const url = await createEmbedUrl(options)
      const urlObj = new URL(url)
      const token = urlObj.searchParams.get('token')

      if (token) {
        const payload = await verifyEmbedToken(token, TEST_SECRET)
        expect(payload.filters).toEqual({
          period: 'last_30_days',
          status: 'active',
        })
      }
    })

    it('should include theme in token', async () => {
      const options: EmbedUrlOptions = {
        dashboard: 'test',
        user: {
          external_user_id: 'user_123',
          permissions: ['access_data'],
        },
        theme: 'dark',
      }

      const url = await createEmbedUrl(options)
      const urlObj = new URL(url)
      const token = urlObj.searchParams.get('token')

      if (token) {
        const payload = await verifyEmbedToken(token, TEST_SECRET)
        expect(payload.theme).toBe('dark')
      }
    })

    it('should use custom base URL from config', async () => {
      configureEmbed({
        baseUrl: 'https://custom.analytics.do',
        secret: TEST_SECRET,
      })

      const options: EmbedUrlOptions = {
        dashboard: 'test',
        user: {
          external_user_id: 'user_123',
          permissions: ['access_data'],
        },
      }

      const url = await createEmbedUrl(options)

      expect(url).toContain('https://custom.analytics.do/embed')
    })

    it('should throw error if no content specified', async () => {
      const options: EmbedUrlOptions = {
        user: {
          external_user_id: 'user_123',
          permissions: ['access_data'],
        },
      }

      await expect(createEmbedUrl(options)).rejects.toThrow(
        'Must specify one of: dashboard, report, explore, or url'
      )
    })

    it('should throw error if secret not configured', async () => {
      configureEmbed({ secret: undefined })

      const options: EmbedUrlOptions = {
        dashboard: 'test',
        user: {
          external_user_id: 'user_123',
          permissions: ['access_data'],
        },
      }

      await expect(createEmbedUrl(options)).rejects.toThrow('Embed secret not configured')
    })

    it('should support user attributes for row-level security', async () => {
      const options: EmbedUrlOptions = {
        dashboard: 'customer_analytics',
        user: {
          external_user_id: 'user_123',
          permissions: ['access_data'],
          user_attributes: {
            customer_id: 'cust_456',
            organization_id: 'org_789',
            tier: 'premium',
          },
        },
      }

      const url = await createEmbedUrl(options)
      const urlObj = new URL(url)
      const token = urlObj.searchParams.get('token')

      if (token) {
        const payload = await verifyEmbedToken(token, TEST_SECRET)
        expect(payload.user_attributes).toEqual({
          customer_id: 'cust_456',
          organization_id: 'org_789',
          tier: 'premium',
        })
      }
    })
  })

  describe('Integration: Full embed flow', () => {
    it('should support complete embed scenario', async () => {
      // Configure for a custom instance
      configureEmbed({
        baseUrl: 'https://myapp.analytics.do',
        secret: TEST_SECRET,
        defaultSessionLength: 3600,
      })

      // Create embed URL for a customer
      const embedUrl = await createEmbedUrl({
        dashboard: 'customer_analytics',
        user: {
          external_user_id: 'customer_abc',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          permissions: ['access_data', 'see_dashboards', 'download_data'],
          models: ['customer_facing'],
          user_attributes: {
            customer_id: 'customer_abc',
            organization_id: 'org_123',
            plan: 'enterprise',
          },
        },
        filters: {
          date_range: 'last_90_days',
        },
        theme: 'light',
        target_origin: 'https://myapp.com',
        session_length: 7200,
      })

      // Verify URL structure
      expect(embedUrl).toContain('https://myapp.analytics.do/embed')
      expect(embedUrl).toContain('dashboard=customer_analytics')
      expect(embedUrl).toContain('target_origin=https%3A%2F%2Fmyapp.com')

      // Extract and verify token
      const url = new URL(embedUrl)
      const token = url.searchParams.get('token')
      expect(token).toBeTruthy()

      if (token) {
        const payload = await verifyEmbedToken(token, TEST_SECRET)

        // Verify user info
        expect(payload.external_user_id).toBe('customer_abc')
        expect(payload.first_name).toBe('John')
        expect(payload.email).toBe('john@example.com')

        // Verify permissions
        expect(payload.permissions).toContain('access_data')
        expect(payload.permissions).toContain('see_dashboards')
        expect(payload.permissions).toContain('download_data')

        // Verify RLS attributes
        expect(payload.user_attributes?.customer_id).toBe('customer_abc')
        expect(payload.user_attributes?.organization_id).toBe('org_123')
        expect(payload.user_attributes?.plan).toBe('enterprise')

        // Verify filters and theme
        expect(payload.filters?.date_range).toBe('last_90_days')
        expect(payload.theme).toBe('light')

        // Verify session
        expect(payload.session_length).toBe(7200)
        expect(payload.exp - payload.iat).toBe(7200)
      }
    })
  })
})
