/**
 * Universal API Client SDK Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createUniversalAPI, callAPI, handleOAuthCallback } from '../src/client'

describe('Universal API Client SDK', () => {
  let mockFetch: any

  beforeEach(() => {
    mockFetch = vi.fn()
  })

  describe('createUniversalAPI - Magic Syntax', () => {
    it('should create proxy with magic api.provider.method syntax', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: 'pi_123', amount: 5000 },
          provider: 'stripe',
          method: 'createPaymentIntent',
        }),
      })

      const api = createUniversalAPI({
        userId: 'user_123',
        fetch: mockFetch,
      })

      const result = await api.stripe.createPaymentIntent({
        customer: 'cus_123',
        amount: 5000,
        currency: 'usd',
      })

      expect(result).toEqual({ id: 'pi_123', amount: 5000 })
      expect(mockFetch).toHaveBeenCalledWith(
        'https://universal-api.do/call',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('stripe'),
        })
      )

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.userId).toBe('user_123')
      expect(body.request).toContain('stripe')
      expect(body.request).toContain('create payment intent')
    })

    it('should convert camelCase method names to natural language', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: 'repo_123' },
        }),
      })

      const api = createUniversalAPI({
        userId: 'user_123',
        fetch: mockFetch,
      })

      await api.github.createRepository({
        name: 'my-repo',
        private: true,
      })

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.request).toContain('github')
      expect(body.request).toContain('create repository')
      expect(body.request).toContain('name')
      expect(body.request).toContain('my-repo')
    })

    it('should handle methods with no arguments', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { temperature: 72 },
        }),
      })

      const api = createUniversalAPI({
        userId: 'user_123',
        fetch: mockFetch,
      })

      await api.openweather.getCurrentWeather()

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.request).toBe('openweather get current weather')
    })

    it('should handle methods with multiple arguments', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {},
        }),
      })

      const api = createUniversalAPI({
        userId: 'user_123',
        fetch: mockFetch,
      })

      await api.stripe.chargeCustomer('cus_123', 5000, 'usd')

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.request).toContain('stripe')
      expect(body.request).toContain('charge customer')
      expect(body.request).toContain('cus_123')
      expect(body.request).toContain('5000')
    })

    it('should use custom API URL if provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      })

      const api = createUniversalAPI({
        apiUrl: 'https://custom-api.example.com',
        userId: 'user_123',
        fetch: mockFetch,
      })

      await api.stripe.test()

      expect(mockFetch).toHaveBeenCalledWith('https://custom-api.example.com/call', expect.anything())
    })

    it('should force specific provider if configured', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      })

      const api = createUniversalAPI({
        userId: 'user_123',
        provider: 'stripe',
        fetch: mockFetch,
      })

      await api.anyprovider.anyMethod()

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.provider).toBe('stripe')
    })

    it('should include metadata if provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      })

      const api = createUniversalAPI({
        userId: 'user_123',
        metadata: { orderId: 'order_123', source: 'checkout' },
        fetch: mockFetch,
      })

      await api.stripe.test()

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.metadata).toEqual({ orderId: 'order_123', source: 'checkout' })
    })
  })

  describe('OAuth Flow Handling', () => {
    it('should call onOAuthRequired when OAuth token missing', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: false,
            error: 'OAuth token required for stripe. Please authenticate first.',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: new Map([['Location', 'https://stripe.com/oauth/authorize?client_id=123']]),
        })

      const onOAuthRequired = vi.fn()

      const api = createUniversalAPI({
        userId: 'user_123',
        fetch: mockFetch,
        onOAuthRequired,
      })

      await expect(api.stripe.test()).rejects.toThrow('OAuth authentication required')

      expect(onOAuthRequired).toHaveBeenCalledWith('stripe', 'https://stripe.com/oauth/authorize?client_id=123')
    })

    it('should throw error if OAuth required but no handler', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: 'OAuth token required for stripe. Please authenticate first.',
        }),
      })

      const api = createUniversalAPI({
        userId: 'user_123',
        fetch: mockFetch,
      })

      await expect(api.stripe.test()).rejects.toThrow('OAuth token required')
    })
  })

  describe('Error Handling', () => {
    it('should throw error when API call fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: 'Provider not found',
        }),
      })

      const api = createUniversalAPI({
        userId: 'user_123',
        fetch: mockFetch,
      })

      await expect(api.unknown.test()).rejects.toThrow('Provider not found')
    })

    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      const api = createUniversalAPI({
        userId: 'user_123',
        fetch: mockFetch,
      })

      await expect(api.stripe.test()).rejects.toThrow('HTTP 500')
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const api = createUniversalAPI({
        userId: 'user_123',
        fetch: mockFetch,
      })

      await expect(api.stripe.test()).rejects.toThrow('Network error')
    })
  })

  describe('Proxy Non-Thenable Behavior', () => {
    it('should not be treated as a Promise', async () => {
      const api = createUniversalAPI({
        userId: 'user_123',
        fetch: mockFetch,
      })

      // Accessing .then should return undefined, making it non-thenable
      expect(api.then).toBeUndefined()
      expect(api.stripe.then).toBeUndefined()
    })
  })

  describe('callAPI - Direct Natural Language', () => {
    it('should call API with natural language request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: 'pi_123' },
          provider: 'stripe',
          method: 'createPaymentIntent',
        }),
      })

      const result = await callAPI({
        userId: 'user_123',
        request: 'charge customer cus_123 $50 for order #123',
        fetch: mockFetch,
      })

      expect(result.success).toBe(true)
      expect(result.data).toEqual({ id: 'pi_123' })
      expect(result.provider).toBe('stripe')
    })

    it('should use custom API URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      await callAPI({
        apiUrl: 'https://custom.example.com',
        userId: 'user_123',
        request: 'test',
        fetch: mockFetch,
      })

      expect(mockFetch).toHaveBeenCalledWith('https://custom.example.com/call', expect.anything())
    })

    it('should handle errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await callAPI({
        userId: 'user_123',
        request: 'test',
        fetch: mockFetch,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })

    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      })

      const result = await callAPI({
        userId: 'user_123',
        request: 'test',
        fetch: mockFetch,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('HTTP 401')
    })
  })

  describe('handleOAuthCallback', () => {
    it('should handle OAuth callback successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Successfully authenticated with stripe',
        }),
      })

      const result = await handleOAuthCallback({
        userId: 'user_123',
        provider: 'stripe',
        code: 'auth_code_xyz',
        fetch: mockFetch,
      })

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/oauth/stripe/callback'),
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('should use custom API URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      await handleOAuthCallback({
        apiUrl: 'https://custom.example.com',
        userId: 'user_123',
        provider: 'stripe',
        code: 'code',
        fetch: mockFetch,
      })

      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('https://custom.example.com/oauth'), expect.anything())
    })

    it('should handle callback errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('OAuth failed'))

      const result = await handleOAuthCallback({
        userId: 'user_123',
        provider: 'stripe',
        code: 'invalid_code',
        fetch: mockFetch,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('OAuth failed')
    })
  })

  describe('Provider Proxy Caching', () => {
    it('should cache provider proxies for reuse', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      })

      const api = createUniversalAPI({
        userId: 'user_123',
        fetch: mockFetch,
      })

      const stripe1 = api.stripe
      const stripe2 = api.stripe

      // Should return same proxy instance
      expect(stripe1).toBe(stripe2)
    })

    it('should create separate proxies for different providers', async () => {
      const api = createUniversalAPI({
        userId: 'user_123',
        fetch: mockFetch,
      })

      const stripe = api.stripe
      const github = api.github

      // Should be different proxy instances
      expect(stripe).not.toBe(github)
    })
  })
})
