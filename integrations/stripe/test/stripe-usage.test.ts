/**
 * Tests: payments.do Usage Recording Operations
 *
 * These tests define the contract for metered billing usage recording.
 * StripeDO must implement these operations via the Stripe Connect platform.
 *
 * @see ARCHITECTURE.md - payments.do (workers/stripe)
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createMockState,
  createMockEnv,
  type MockDOState,
  type MockStripeEnv,
} from './helpers.js'

/**
 * Interface definition for StripeDO usage operations
 */
interface StripeDOContract {
  // Usage recording operations
  recordUsage(params: {
    subscriptionItemId: string
    quantity: number
    timestamp?: number
    action?: 'increment' | 'set'
  }): Promise<{
    id: string
    quantity: number
    subscription_item: string
    timestamp: number
  }>

  // For convenience wrapper
  recordUsageForCustomer(params: {
    customerId: string
    quantity: number
    timestamp?: number
  }): Promise<{
    id: string
    quantity: number
  }>

  // Subscription operations (needed for setup)
  createSubscription(params: {
    customer: string
    items: Array<{ price: string }>
  }): Promise<{
    id: string
    items: { data: Array<{ id: string; price: { id: string } }> }
  }>

  // RPC interface
  hasMethod(name: string): boolean
  invoke(method: string, params: unknown[]): Promise<unknown>

  // HTTP handlers
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

describe('StripeDO Usage Recording Operations', () => {
  let ctx: MockDOState
  let env: MockStripeEnv
  let StripeDO: new (ctx: MockDOState, env: MockStripeEnv) => StripeDOContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    StripeDO = await loadStripeDO()
  })

  describe('recordUsage()', () => {
    it('should record usage with required parameters', async () => {
      const instance = new StripeDO(ctx, env)
      // Create a subscription first to get a subscription item ID
      const subscription = await instance.createSubscription({
        customer: 'cus_test123',
        items: [{ price: 'price_metered' }],
      })
      const subscriptionItemId = subscription.items.data[0].id

      const usage = await instance.recordUsage({
        subscriptionItemId,
        quantity: 100,
      })

      expect(usage.id).toMatch(/^mbur_/)
      expect(usage.quantity).toBe(100)
      expect(usage.subscription_item).toBe(subscriptionItemId)
      expect(usage.timestamp).toBeDefined()
    })

    it('should record usage with custom timestamp', async () => {
      const instance = new StripeDO(ctx, env)
      const subscription = await instance.createSubscription({
        customer: 'cus_test123',
        items: [{ price: 'price_metered' }],
      })
      const subscriptionItemId = subscription.items.data[0].id

      const customTimestamp = Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
      const usage = await instance.recordUsage({
        subscriptionItemId,
        quantity: 50,
        timestamp: customTimestamp,
      })

      expect(usage.timestamp).toBe(customTimestamp)
    })

    it('should support increment action (default)', async () => {
      const instance = new StripeDO(ctx, env)
      const subscription = await instance.createSubscription({
        customer: 'cus_test123',
        items: [{ price: 'price_metered' }],
      })
      const subscriptionItemId = subscription.items.data[0].id

      const usage = await instance.recordUsage({
        subscriptionItemId,
        quantity: 25,
        action: 'increment',
      })

      expect(usage.quantity).toBe(25)
    })

    it('should support set action', async () => {
      const instance = new StripeDO(ctx, env)
      const subscription = await instance.createSubscription({
        customer: 'cus_test123',
        items: [{ price: 'price_metered' }],
      })
      const subscriptionItemId = subscription.items.data[0].id

      const usage = await instance.recordUsage({
        subscriptionItemId,
        quantity: 1000,
        action: 'set',
      })

      expect(usage.quantity).toBe(1000)
    })

    it('should reject negative quantity', async () => {
      const instance = new StripeDO(ctx, env)
      await expect(
        instance.recordUsage({
          subscriptionItemId: 'si_test',
          quantity: -10,
        })
      ).rejects.toThrow(/quantity|invalid|negative/i)
    })

    it('should reject missing subscription item ID', async () => {
      const instance = new StripeDO(ctx, env)
      await expect(
        instance.recordUsage({
          subscriptionItemId: '',
          quantity: 100,
        })
      ).rejects.toThrow(/subscriptionItemId|required/i)
    })

    it('should reject zero quantity', async () => {
      const instance = new StripeDO(ctx, env)
      await expect(
        instance.recordUsage({
          subscriptionItemId: 'si_test',
          quantity: 0,
        })
      ).rejects.toThrow(/quantity|zero|invalid/i)
    })
  })

  describe('recordUsageForCustomer()', () => {
    it('should record usage by customer ID', async () => {
      const instance = new StripeDO(ctx, env)
      // Create subscription for the customer
      await instance.createSubscription({
        customer: 'cus_usage_test',
        items: [{ price: 'price_metered' }],
      })

      const usage = await instance.recordUsageForCustomer({
        customerId: 'cus_usage_test',
        quantity: 500,
      })

      expect(usage.id).toBeDefined()
      expect(usage.quantity).toBe(500)
    })

    it('should reject non-existent customer', async () => {
      const instance = new StripeDO(ctx, env)
      await expect(
        instance.recordUsageForCustomer({
          customerId: 'cus_nonexistent',
          quantity: 100,
        })
      ).rejects.toThrow(/customer|subscription|not found/i)
    })
  })

  describe('HTTP API for usage', () => {
    it('should handle POST /api/usage', async () => {
      const instance = new StripeDO(ctx, env)
      const subscription = await instance.createSubscription({
        customer: 'cus_test123',
        items: [{ price: 'price_metered' }],
      })
      const subscriptionItemId = subscription.items.data[0].id

      const request = new Request('https://payments.do/api/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionItemId,
          quantity: 200,
        }),
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(201)

      const data = (await response.json()) as { id: string; quantity: number }
      expect(data.id).toMatch(/^mbur_/)
      expect(data.quantity).toBe(200)
    })

    it('should handle POST /api/usage with customer ID', async () => {
      const instance = new StripeDO(ctx, env)
      await instance.createSubscription({
        customer: 'cus_api_test',
        items: [{ price: 'price_metered' }],
      })

      const request = new Request('https://payments.do/api/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: 'cus_api_test',
          quantity: 150,
        }),
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(201)

      const data = (await response.json()) as { quantity: number }
      expect(data.quantity).toBe(150)
    })

    it('should return 400 for invalid usage data', async () => {
      const instance = new StripeDO(ctx, env)
      const request = new Request('https://payments.do/api/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Missing required fields
        }),
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(400)
    })
  })

  describe('RPC interface for usage', () => {
    it('should expose recordUsage method via RPC', async () => {
      const instance = new StripeDO(ctx, env)
      expect(instance.hasMethod('recordUsage')).toBe(true)

      const subscription = await instance.createSubscription({
        customer: 'cus_rpc_test',
        items: [{ price: 'price_metered' }],
      })

      const result = (await instance.invoke('recordUsage', [
        {
          subscriptionItemId: subscription.items.data[0].id,
          quantity: 300,
        },
      ])) as { quantity: number }
      expect(result.quantity).toBe(300)
    })

    it('should expose recordUsageForCustomer method via RPC', async () => {
      const instance = new StripeDO(ctx, env)
      expect(instance.hasMethod('recordUsageForCustomer')).toBe(true)

      await instance.createSubscription({
        customer: 'cus_rpc_customer',
        items: [{ price: 'price_metered' }],
      })

      const result = (await instance.invoke('recordUsageForCustomer', [
        {
          customerId: 'cus_rpc_customer',
          quantity: 400,
        },
      ])) as { quantity: number }
      expect(result.quantity).toBe(400)
    })
  })

  describe('Batch usage recording', () => {
    it('should handle multiple usage records in sequence', async () => {
      const instance = new StripeDO(ctx, env)
      const subscription = await instance.createSubscription({
        customer: 'cus_batch_test',
        items: [{ price: 'price_metered' }],
      })
      const subscriptionItemId = subscription.items.data[0].id

      const results = await Promise.all([
        instance.recordUsage({ subscriptionItemId, quantity: 10 }),
        instance.recordUsage({ subscriptionItemId, quantity: 20 }),
        instance.recordUsage({ subscriptionItemId, quantity: 30 }),
      ])

      expect(results).toHaveLength(3)
      expect(results[0].quantity).toBe(10)
      expect(results[1].quantity).toBe(20)
      expect(results[2].quantity).toBe(30)
    })
  })
})
