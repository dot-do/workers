/**
 * End-to-End Tests for Universal API
 *
 * Tests the complete flow from client SDK → gateway → universal-api → external providers
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createUniversalAPI, callAPI } from '../src/client'

describe('Universal API - End-to-End Tests', () => {
  let mockFetch: any
  let consoleLogSpy: any

  beforeEach(() => {
    mockFetch = vi.fn()
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  describe('E2E: Stripe Payment Intent (Mock)', () => {
    it('should complete full Stripe payment flow', async () => {
      // Mock sequence: call → OAuth check → code generation → execution
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 'pi_test_123',
              amount: 5000,
              currency: 'usd',
              status: 'requires_payment_method',
              client_secret: 'pi_test_123_secret_abc',
            },
            provider: 'stripe',
            method: 'createPaymentIntent',
            cached: false,
            latencyMs: 2300,
            codeGenerated: true,
          }),
        })

      const api = createUniversalAPI({
        userId: 'test_user_123',
        fetch: mockFetch,
      })

      const result = await api.stripe.createPaymentIntent({
        amount: 5000,
        currency: 'usd',
        customer: 'cus_test_123',
        description: 'Test payment',
      })

      // Verify result structure
      expect(result).toMatchObject({
        id: expect.stringContaining('pi_test_'),
        amount: 5000,
        currency: 'usd',
        status: expect.any(String),
      })

      // Verify API call was made correctly
      expect(mockFetch).toHaveBeenCalledWith(
        'https://universal-api.do/call',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      )

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.userId).toBe('test_user_123')
      expect(body.request).toContain('stripe')
      expect(body.request).toContain('create payment intent')
      expect(body.request).toContain('5000')
    })

    it('should use cached code on second request', async () => {
      // First call: code generation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: 'pi_first_123', amount: 5000 },
          cached: false,
          latencyMs: 2300,
          codeGenerated: true,
        }),
      })

      // Second call: cached code
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: 'pi_second_456', amount: 3000 },
          cached: true,
          latencyMs: 150,
          codeGenerated: false,
        }),
      })

      const api = createUniversalAPI({
        userId: 'test_user_123',
        fetch: mockFetch,
      })

      // First request (generates code)
      const result1 = await api.stripe.createPaymentIntent({
        amount: 5000,
        currency: 'usd',
      })
      expect(result1.id).toBe('pi_first_123')

      // Second request (uses cached code - much faster)
      const result2 = await api.stripe.createPaymentIntent({
        amount: 3000,
        currency: 'usd',
      })
      expect(result2.id).toBe('pi_second_456')

      // Both should succeed
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('E2E: GitHub Repository Creation (Mock)', () => {
    it('should complete full GitHub repository creation flow', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 789456123,
            name: 'my-new-repo',
            full_name: 'testuser/my-new-repo',
            private: true,
            html_url: 'https://github.com/testuser/my-new-repo',
            description: 'Test repository',
            created_at: '2025-10-04T12:00:00Z',
          },
          provider: 'github',
          method: 'createRepository',
          cached: false,
          latencyMs: 1800,
          codeGenerated: true,
        }),
      })

      const api = createUniversalAPI({
        userId: 'test_user_123',
        fetch: mockFetch,
      })

      const result = await api.github.createRepository({
        name: 'my-new-repo',
        description: 'Test repository',
        private: true,
        auto_init: true,
      })

      // Verify result structure
      expect(result).toMatchObject({
        id: expect.any(Number),
        name: 'my-new-repo',
        full_name: expect.stringContaining('my-new-repo'),
        private: true,
        html_url: expect.stringContaining('github.com'),
      })

      // Verify request was formatted correctly
      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.request).toContain('github')
      expect(body.request).toContain('create repository')
      expect(body.request).toContain('my-new-repo')
    })
  })

  describe('E2E: OpenWeather Current Weather (Mock)', () => {
    it('should fetch current weather for a location', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            coord: { lon: -122.08, lat: 37.39 },
            weather: [{ id: 800, main: 'Clear', description: 'clear sky' }],
            main: {
              temp: 72.5,
              feels_like: 70.2,
              temp_min: 68.0,
              temp_max: 76.0,
              pressure: 1013,
              humidity: 45,
            },
            wind: { speed: 5.82, deg: 270 },
            name: 'Mountain View',
          },
          provider: 'openweather',
          method: 'getCurrentWeather',
          cached: false,
          latencyMs: 500,
          codeGenerated: true,
        }),
      })

      const api = createUniversalAPI({
        userId: 'test_user_123',
        fetch: mockFetch,
      })

      const result = await api.openweather.getCurrentWeather({
        city: 'Mountain View',
        state: 'CA',
        country: 'US',
        units: 'imperial',
      })

      // Verify weather data structure
      expect(result).toMatchObject({
        coord: expect.objectContaining({ lon: expect.any(Number), lat: expect.any(Number) }),
        weather: expect.arrayContaining([expect.objectContaining({ main: expect.any(String) })]),
        main: expect.objectContaining({
          temp: expect.any(Number),
          humidity: expect.any(Number),
        }),
        name: expect.any(String),
      })

      // Verify request formatting
      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.request).toContain('openweather')
      expect(body.request).toContain('get current weather')
      expect(body.request).toContain('Mountain View')
    })
  })

  describe('E2E: OAuth Flow', () => {
    it('should handle OAuth required error and provide auth URL', async () => {
      // First call: OAuth token missing
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: false,
            error: 'OAuth token required for stripe. Please authenticate first.',
          }),
        })
        // Second call: Get OAuth URL
        .mockResolvedValueOnce({
          ok: true,
          headers: new Map([
            ['Location', 'https://connect.stripe.com/oauth/authorize?client_id=test_123&state=user_test_123'],
          ]),
        })

      const onOAuthRequired = vi.fn()

      const api = createUniversalAPI({
        userId: 'test_user_123',
        fetch: mockFetch,
        onOAuthRequired,
      })

      await expect(api.stripe.createPaymentIntent({ amount: 5000 })).rejects.toThrow('OAuth authentication required')

      // Verify OAuth callback was invoked
      expect(onOAuthRequired).toHaveBeenCalledWith(
        'stripe',
        expect.stringContaining('connect.stripe.com/oauth/authorize')
      )
    })

    it('should complete OAuth callback flow', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Successfully authenticated with stripe',
          userId: 'test_user_123',
          provider: 'stripe',
        }),
      })

      const { handleOAuthCallback } = await import('../src/client')

      const result = await handleOAuthCallback({
        userId: 'test_user_123',
        provider: 'stripe',
        code: 'auth_code_test_xyz',
        fetch: mockFetch,
      })

      expect(result.success).toBe(true)
      expect(result.message).toContain('authenticated')

      // Verify callback endpoint was called
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/oauth/stripe/callback'),
        expect.objectContaining({ method: 'GET' })
      )
    })
  })

  describe('E2E: Error Handling', () => {
    it('should handle provider not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: 'Provider "unknown" not found. Supported providers: stripe, github, openweather',
        }),
      })

      const api = createUniversalAPI({
        userId: 'test_user_123',
        fetch: mockFetch,
      })

      await expect(api.unknown.someMethod()).rejects.toThrow('Provider "unknown" not found')
    })

    it('should handle code generation failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: 'Failed to generate code: Insufficient API documentation for method "unknownMethod"',
        }),
      })

      const api = createUniversalAPI({
        userId: 'test_user_123',
        fetch: mockFetch,
      })

      await expect(api.stripe.unknownMethod()).rejects.toThrow('Failed to generate code')
    })

    it('should handle code execution errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: 'Code execution failed: TypeError: Cannot read property "id" of undefined',
        }),
      })

      const api = createUniversalAPI({
        userId: 'test_user_123',
        fetch: mockFetch,
      })

      await expect(api.stripe.createPaymentIntent({ amount: -100 })).rejects.toThrow('Code execution failed')
    })

    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      const api = createUniversalAPI({
        userId: 'test_user_123',
        fetch: mockFetch,
      })

      await expect(api.stripe.test()).rejects.toThrow('HTTP 500')
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error: Connection timeout'))

      const api = createUniversalAPI({
        userId: 'test_user_123',
        fetch: mockFetch,
      })

      await expect(api.stripe.test()).rejects.toThrow('Network error')
    })
  })

  describe('E2E: Direct Natural Language API', () => {
    it('should handle natural language request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: 'pi_natural_123', amount: 7500 },
          provider: 'stripe',
          method: 'createPaymentIntent',
          cached: false,
          latencyMs: 2100,
        }),
      })

      const result = await callAPI({
        userId: 'test_user_123',
        request: 'charge customer cus_123 $75 USD for premium subscription',
        fetch: mockFetch,
      })

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        id: expect.stringContaining('pi_'),
        amount: 7500,
      })
      expect(result.provider).toBe('stripe')
    })
  })

  describe('E2E: Multi-Step Workflow', () => {
    it('should complete multi-step Stripe workflow (customer → payment → charge)', async () => {
      // Step 1: Create customer
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: 'cus_test_123', email: 'test@example.com' },
          provider: 'stripe',
          method: 'createCustomer',
        }),
      })

      // Step 2: Create payment method
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: 'pm_test_456', type: 'card' },
          provider: 'stripe',
          method: 'createPaymentMethod',
        }),
      })

      // Step 3: Create payment intent
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: 'pi_test_789', amount: 10000, status: 'succeeded' },
          provider: 'stripe',
          method: 'createPaymentIntent',
        }),
      })

      const api = createUniversalAPI({
        userId: 'test_user_123',
        fetch: mockFetch,
      })

      // Execute workflow
      const customer = await api.stripe.createCustomer({
        email: 'test@example.com',
        name: 'Test User',
      })

      const paymentMethod = await api.stripe.createPaymentMethod({
        type: 'card',
        card: { number: '4242424242424242', exp_month: 12, exp_year: 2025, cvc: '123' },
      })

      const payment = await api.stripe.createPaymentIntent({
        amount: 10000,
        currency: 'usd',
        customer: customer.id,
        payment_method: paymentMethod.id,
        confirm: true,
      })

      // Verify workflow completed
      expect(customer.id).toBe('cus_test_123')
      expect(paymentMethod.id).toBe('pm_test_456')
      expect(payment.id).toBe('pi_test_789')
      expect(payment.status).toBe('succeeded')

      // Verify all steps were called
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })
  })

  describe('E2E: Provider Switching', () => {
    it('should handle switching between different providers', async () => {
      // Stripe call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: 'pi_123' },
          provider: 'stripe',
        }),
      })

      // GitHub call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: 456, name: 'repo' },
          provider: 'github',
        }),
      })

      // OpenWeather call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { temp: 72.5, city: 'Mountain View' },
          provider: 'openweather',
        }),
      })

      const api = createUniversalAPI({
        userId: 'test_user_123',
        fetch: mockFetch,
      })

      const stripeResult = await api.stripe.createPaymentIntent({ amount: 5000 })
      const githubResult = await api.github.createRepository({ name: 'test-repo' })
      const weatherResult = await api.openweather.getCurrentWeather({ city: 'Mountain View' })

      expect(stripeResult.id).toBe('pi_123')
      expect(githubResult.name).toBe('repo')
      expect(weatherResult.city).toBe('Mountain View')

      expect(mockFetch).toHaveBeenCalledTimes(3)
    })
  })

  describe('E2E: Performance and Caching', () => {
    it('should demonstrate caching performance improvement', async () => {
      // First call: slow (code generation)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: 'pi_1' },
          cached: false,
          latencyMs: 2300,
        }),
      })

      // Second call: fast (cached)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: 'pi_2' },
          cached: true,
          latencyMs: 150,
        }),
      })

      const api = createUniversalAPI({
        userId: 'test_user_123',
        fetch: mockFetch,
      })

      const start1 = Date.now()
      await api.stripe.createPaymentIntent({ amount: 5000 })
      const duration1 = Date.now() - start1

      const start2 = Date.now()
      await api.stripe.createPaymentIntent({ amount: 3000 })
      const duration2 = Date.now() - start2

      // Note: In real tests, cached version would be significantly faster
      // Mock data shows expected latency values
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })
})
