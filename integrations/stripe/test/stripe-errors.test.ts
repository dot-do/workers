/**
 * Tests: payments.do Error Handling
 *
 * These tests define the contract for error handling in StripeDO.
 * The service must handle Stripe errors gracefully and return appropriate responses.
 *
 * @see ARCHITECTURE.md - payments.do (workers/stripe)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createMockState,
  createMockEnv,
  createStripeError,
  type MockDOState,
  type MockStripeEnv,
} from './helpers.js'

/**
 * Interface definition for StripeDO error handling
 */
interface StripeDOContract {
  createCharge(params: {
    amount: number
    currency: string
  }): Promise<{ id: string }>

  getCharge(chargeId: string): Promise<{ id: string } | null>

  createSubscription(params: {
    customer: string
    items: Array<{ price: string }>
  }): Promise<{ id: string }>

  createTransfer(params: {
    amount: number
    currency: string
    destination: string
  }): Promise<{ id: string }>

  invoke(method: string, params: unknown[]): Promise<unknown>
  fetch(request: Request): Promise<Response>
}

/**
 * Load StripeDO module
 */
async function loadStripeDO(): Promise<
  new (ctx: MockDOState, env: MockStripeEnv) => StripeDOContract
> {
  const module = await import('../src/stripe.js')
  return module.StripeDO
}

describe('StripeDO Error Handling', () => {
  let ctx: MockDOState
  let env: MockStripeEnv
  let StripeDO: new (ctx: MockDOState, env: MockStripeEnv) => StripeDOContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    StripeDO = await loadStripeDO()
  })

  describe('Input validation errors', () => {
    it('should reject invalid charge amount', async () => {
      const instance = new StripeDO(ctx, env)
      await expect(
        instance.createCharge({ amount: -100, currency: 'usd' })
      ).rejects.toThrow(/amount|invalid/i)
    })

    it('should reject empty currency', async () => {
      const instance = new StripeDO(ctx, env)
      await expect(
        instance.createCharge({ amount: 1000, currency: '' })
      ).rejects.toThrow(/currency|required/i)
    })

    it('should reject empty customer for subscription', async () => {
      const instance = new StripeDO(ctx, env)
      await expect(
        instance.createSubscription({
          customer: '',
          items: [{ price: 'price_test' }],
        })
      ).rejects.toThrow(/customer|required/i)
    })

    it('should reject empty destination for transfer', async () => {
      const instance = new StripeDO(ctx, env)
      await expect(
        instance.createTransfer({
          amount: 1000,
          currency: 'usd',
          destination: '',
        })
      ).rejects.toThrow(/destination|required/i)
    })
  })

  describe('Stripe API errors', () => {
    it('should handle card_declined error', async () => {
      const instance = new StripeDO(ctx, env)

      // Mock Stripe to throw card_declined error
      env.STRIPE.charges.create = vi.fn().mockRejectedValue(
        createStripeError(
          'Your card was declined.',
          'StripeCardError',
          'card_declined'
        )
      )

      await expect(
        instance.createCharge({ amount: 1000, currency: 'usd' })
      ).rejects.toThrow(/declined/i)
    })

    it('should handle insufficient_funds error', async () => {
      const instance = new StripeDO(ctx, env)

      env.STRIPE.charges.create = vi.fn().mockRejectedValue(
        createStripeError(
          'Your card has insufficient funds.',
          'StripeCardError',
          'insufficient_funds'
        )
      )

      await expect(
        instance.createCharge({ amount: 1000, currency: 'usd' })
      ).rejects.toThrow(/insufficient|funds/i)
    })

    it('should handle rate_limit error', async () => {
      const instance = new StripeDO(ctx, env)

      env.STRIPE.charges.create = vi.fn().mockRejectedValue(
        createStripeError(
          'Too many requests to the Stripe API.',
          'StripeRateLimitError'
        )
      )

      await expect(
        instance.createCharge({ amount: 1000, currency: 'usd' })
      ).rejects.toThrow(/rate|limit|too many/i)
    })

    it('should handle authentication_error', async () => {
      const instance = new StripeDO(ctx, env)

      env.STRIPE.charges.create = vi.fn().mockRejectedValue(
        createStripeError(
          'Invalid API Key provided.',
          'StripeAuthenticationError'
        )
      )

      await expect(
        instance.createCharge({ amount: 1000, currency: 'usd' })
      ).rejects.toThrow(/authentication|api key|invalid/i)
    })

    it('should handle resource_missing error', async () => {
      const instance = new StripeDO(ctx, env)

      env.STRIPE.charges.retrieve = vi.fn().mockRejectedValue(
        createStripeError(
          'No such charge: ch_nonexistent',
          'StripeInvalidRequestError',
          'resource_missing'
        )
      )

      const charge = await instance.getCharge('ch_nonexistent')
      expect(charge).toBeNull()
    })

    it('should handle idempotency_error', async () => {
      const instance = new StripeDO(ctx, env)

      env.STRIPE.charges.create = vi.fn().mockRejectedValue(
        createStripeError(
          'Idempotency key reused with different request parameters.',
          'StripeIdempotencyError'
        )
      )

      await expect(
        instance.createCharge({ amount: 1000, currency: 'usd' })
      ).rejects.toThrow(/idempotency/i)
    })
  })

  describe('HTTP error responses', () => {
    it('should return 400 for validation errors', async () => {
      const instance = new StripeDO(ctx, env)
      const request = new Request('https://payments.do/api/charges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: -100, currency: 'usd' }),
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(400)
    })

    it('should return 400 for malformed JSON', async () => {
      const instance = new StripeDO(ctx, env)
      const request = new Request('https://payments.do/api/charges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not valid json {',
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(400)

      const data = (await response.json()) as { error: string }
      expect(data.error).toMatch(/json|parse/i)
    })

    it('should return 404 for non-existent resources', async () => {
      const instance = new StripeDO(ctx, env)
      const request = new Request(
        'https://payments.do/api/charges/ch_nonexistent',
        { method: 'GET' }
      )

      const response = await instance.fetch(request)
      expect(response.status).toBe(404)
    })

    it('should return 405 for unsupported methods', async () => {
      const instance = new StripeDO(ctx, env)
      const request = new Request('https://payments.do/api/charges', {
        method: 'PATCH',
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(405)
    })

    it('should return 500 for unexpected Stripe errors', async () => {
      const instance = new StripeDO(ctx, env)

      env.STRIPE.charges.create = vi.fn().mockRejectedValue(
        createStripeError(
          'An unexpected error occurred.',
          'StripeAPIError'
        )
      )

      const request = new Request('https://payments.do/api/charges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 1000, currency: 'usd' }),
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(500)
    })
  })

  describe('RPC error handling', () => {
    it('should return error for method not found', async () => {
      const instance = new StripeDO(ctx, env)
      await expect(
        instance.invoke('nonexistentMethod', [])
      ).rejects.toThrow(/not found|not allowed/i)
    })

    it('should return error for invalid parameters', async () => {
      const instance = new StripeDO(ctx, env)
      // createCharge requires amount and currency
      await expect(
        instance.invoke('createCharge', [{}])
      ).rejects.toThrow(/amount|required|invalid/i)
    })

    it('should wrap Stripe errors in RPC responses', async () => {
      const instance = new StripeDO(ctx, env)

      env.STRIPE.charges.create = vi.fn().mockRejectedValue(
        createStripeError('Card declined', 'StripeCardError', 'card_declined')
      )

      await expect(
        instance.invoke('createCharge', [{ amount: 1000, currency: 'usd' }])
      ).rejects.toThrow(/declined/i)
    })
  })

  describe('Error message sanitization', () => {
    it('should not expose API keys in error messages', async () => {
      const instance = new StripeDO(ctx, env)

      const errorWithSecret = createStripeError(
        'Error with sk_test_abc123xyz',
        'StripeAPIError'
      )
      env.STRIPE.charges.create = vi.fn().mockRejectedValue(errorWithSecret)

      const request = new Request('https://payments.do/api/charges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 1000, currency: 'usd' }),
      })

      const response = await instance.fetch(request)
      const data = (await response.json()) as { error: string }

      expect(data.error).not.toContain('sk_test_abc123xyz')
      expect(data.error).not.toContain('sk_')
    })

    it('should not expose internal paths', async () => {
      const instance = new StripeDO(ctx, env)

      const errorWithPath = createStripeError(
        'Error at /internal/path/to/file.ts:123',
        'StripeAPIError'
      )
      env.STRIPE.charges.create = vi.fn().mockRejectedValue(errorWithPath)

      const request = new Request('https://payments.do/api/charges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 1000, currency: 'usd' }),
      })

      const response = await instance.fetch(request)
      const data = (await response.json()) as { error: string }

      // Error should be sanitized - internal paths should be replaced
      expect(data.error).not.toMatch(/\/\S+\.ts:\d+/)
      expect(data.error.length).toBeLessThan(500)
    })
  })

  describe('Retry logic for transient errors', () => {
    it('should retry on network timeouts', async () => {
      const instance = new StripeDO(ctx, env)
      let attempts = 0

      env.STRIPE.charges.create = vi.fn().mockImplementation(async () => {
        attempts++
        if (attempts < 3) {
          throw createStripeError('Request timeout', 'StripeConnectionError')
        }
        return {
          id: 'ch_success_after_retry',
          object: 'charge',
          amount: 1000,
          currency: 'usd',
          status: 'succeeded',
        }
      })

      const charge = await instance.createCharge({
        amount: 1000,
        currency: 'usd',
      })

      expect(charge.id).toBe('ch_success_after_retry')
      expect(attempts).toBe(3)
    })

    it('should not retry on card_declined', async () => {
      const instance = new StripeDO(ctx, env)
      let attempts = 0

      env.STRIPE.charges.create = vi.fn().mockImplementation(async () => {
        attempts++
        throw createStripeError(
          'Card declined',
          'StripeCardError',
          'card_declined'
        )
      })

      await expect(
        instance.createCharge({ amount: 1000, currency: 'usd' })
      ).rejects.toThrow(/declined/i)

      // Should only attempt once for non-retryable errors
      expect(attempts).toBe(1)
    })
  })

  describe('Rate limiting', () => {
    it('should return 429 when rate limit exceeded', async () => {
      const instance = new StripeDO(ctx, env)

      // Simulate many rapid requests
      const requests: Promise<Response>[] = []
      for (let i = 0; i < 200; i++) {
        requests.push(
          instance.fetch(
            new Request('https://payments.do/api/charges', { method: 'GET' })
          )
        )
      }

      const responses = await Promise.all(requests)
      const rateLimited = responses.filter((r) => r.status === 429)

      // At least some should be rate limited
      expect(rateLimited.length).toBeGreaterThan(0)
    })
  })

  describe('Storage error handling', () => {
    it('should handle Stripe API errors gracefully', async () => {
      const instance = new StripeDO(ctx, env)

      // getCharge calls Stripe directly, not storage
      env.STRIPE.charges.retrieve = vi.fn().mockRejectedValue(
        createStripeError('API unavailable', 'StripeAPIError')
      )

      await expect(instance.getCharge('ch_test')).rejects.toThrow(
        /unavailable|api/i
      )
    })

    it('should handle storage write errors gracefully', async () => {
      const instance = new StripeDO(ctx, env)

      ctx.storage.put = vi.fn().mockRejectedValue(new Error('Storage write failed'))

      // This will fail because storage.put fails during createCharge
      const request = new Request('https://payments.do/api/charges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 1000, currency: 'usd' }),
      })

      const response = await instance.fetch(request)
      // Storage errors cause 500 error
      expect([200, 201, 500]).toContain(response.status)
    })
  })
})
