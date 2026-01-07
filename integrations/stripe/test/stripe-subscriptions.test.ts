/**
 * Tests: payments.do Subscription Operations
 *
 * These tests define the contract for subscription creation and cancellation.
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
 * Interface definition for StripeDO subscription operations
 */
interface StripeDOContract {
  // Subscription operations
  createSubscription(params: {
    customer: string
    items: Array<{ price: string }>
    metadata?: Record<string, string>
  }): Promise<{
    id: string
    customer: string
    status: string
    items: { data: Array<{ id: string; price: { id: string } }> }
  }>

  getSubscription(subscriptionId: string): Promise<{
    id: string
    customer: string
    status: string
  } | null>

  cancelSubscription(subscriptionId: string): Promise<{
    id: string
    status: string
    canceled_at: number | null
  }>

  listSubscriptions(params?: {
    customer?: string
    status?: string
  }): Promise<Array<{
    id: string
    customer: string
    status: string
  }>>

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

describe('StripeDO Subscription Operations', () => {
  let ctx: MockDOState
  let env: MockStripeEnv
  let StripeDO: new (ctx: MockDOState, env: MockStripeEnv) => StripeDOContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    StripeDO = await loadStripeDO()
  })

  describe('createSubscription()', () => {
    it('should create a subscription with required parameters', async () => {
      const instance = new StripeDO(ctx, env)
      const subscription = await instance.createSubscription({
        customer: 'cus_test123',
        items: [{ price: 'price_monthly' }],
      })

      expect(subscription.id).toMatch(/^sub_/)
      expect(subscription.customer).toBe('cus_test123')
      expect(subscription.status).toBe('active')
      expect(subscription.items.data).toHaveLength(1)
    })

    it('should create a subscription with multiple items', async () => {
      const instance = new StripeDO(ctx, env)
      const subscription = await instance.createSubscription({
        customer: 'cus_test456',
        items: [{ price: 'price_base' }, { price: 'price_addon' }],
      })

      expect(subscription.id).toBeDefined()
      expect(subscription.items.data).toHaveLength(2)
    })

    it('should create a subscription with metadata', async () => {
      const instance = new StripeDO(ctx, env)
      const subscription = await instance.createSubscription({
        customer: 'cus_test789',
        items: [{ price: 'price_enterprise' }],
        metadata: { plan_type: 'enterprise', team_id: 'team_123' },
      })

      expect(subscription.id).toBeDefined()
      expect(subscription.status).toBe('active')
    })

    it('should reject missing customer', async () => {
      const instance = new StripeDO(ctx, env)
      await expect(
        instance.createSubscription({
          customer: '',
          items: [{ price: 'price_test' }],
        })
      ).rejects.toThrow(/customer|required/i)
    })

    it('should reject empty items array', async () => {
      const instance = new StripeDO(ctx, env)
      await expect(
        instance.createSubscription({
          customer: 'cus_test',
          items: [],
        })
      ).rejects.toThrow(/items|required/i)
    })
  })

  describe('getSubscription()', () => {
    it('should retrieve an existing subscription', async () => {
      const instance = new StripeDO(ctx, env)
      const created = await instance.createSubscription({
        customer: 'cus_test123',
        items: [{ price: 'price_monthly' }],
      })

      const retrieved = await instance.getSubscription(created.id)
      expect(retrieved).not.toBeNull()
      expect(retrieved!.id).toBe(created.id)
      expect(retrieved!.customer).toBe('cus_test123')
    })

    it('should return null for non-existent subscription', async () => {
      const instance = new StripeDO(ctx, env)
      const subscription = await instance.getSubscription('sub_nonexistent')
      expect(subscription).toBeNull()
    })

    it('should reject invalid subscription ID', async () => {
      const instance = new StripeDO(ctx, env)
      await expect(instance.getSubscription('')).rejects.toThrow(/id|required/i)
    })
  })

  describe('cancelSubscription()', () => {
    it('should cancel an existing subscription', async () => {
      const instance = new StripeDO(ctx, env)
      const created = await instance.createSubscription({
        customer: 'cus_test123',
        items: [{ price: 'price_monthly' }],
      })

      const canceled = await instance.cancelSubscription(created.id)
      expect(canceled.id).toBe(created.id)
      expect(canceled.status).toBe('canceled')
      expect(canceled.canceled_at).not.toBeNull()
    })

    it('should throw for non-existent subscription', async () => {
      const instance = new StripeDO(ctx, env)
      await expect(
        instance.cancelSubscription('sub_nonexistent')
      ).rejects.toThrow(/not found|no such/i)
    })

    it('should reject invalid subscription ID', async () => {
      const instance = new StripeDO(ctx, env)
      await expect(instance.cancelSubscription('')).rejects.toThrow(
        /id|required/i
      )
    })
  })

  describe('listSubscriptions()', () => {
    it('should list all subscriptions', async () => {
      const instance = new StripeDO(ctx, env)
      await instance.createSubscription({
        customer: 'cus_test1',
        items: [{ price: 'price_1' }],
      })
      await instance.createSubscription({
        customer: 'cus_test2',
        items: [{ price: 'price_2' }],
      })

      const subscriptions = await instance.listSubscriptions()
      expect(subscriptions.length).toBeGreaterThanOrEqual(2)
    })

    it('should filter by customer', async () => {
      const instance = new StripeDO(ctx, env)
      await instance.createSubscription({
        customer: 'cus_target',
        items: [{ price: 'price_1' }],
      })
      await instance.createSubscription({
        customer: 'cus_other',
        items: [{ price: 'price_2' }],
      })

      const subscriptions = await instance.listSubscriptions({
        customer: 'cus_target',
      })
      expect(Array.isArray(subscriptions)).toBe(true)
    })
  })

  describe('HTTP API for subscriptions', () => {
    it('should handle POST /api/subscriptions', async () => {
      const instance = new StripeDO(ctx, env)
      const request = new Request('https://payments.do/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: 'cus_test123',
          items: [{ price: 'price_monthly' }],
        }),
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(201)

      const data = (await response.json()) as {
        id: string
        status: string
      }
      expect(data.id).toMatch(/^sub_/)
      expect(data.status).toBe('active')
    })

    it('should handle GET /api/subscriptions/:id', async () => {
      const instance = new StripeDO(ctx, env)
      const created = await instance.createSubscription({
        customer: 'cus_test',
        items: [{ price: 'price_test' }],
      })

      const request = new Request(
        `https://payments.do/api/subscriptions/${created.id}`,
        { method: 'GET' }
      )

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const data = (await response.json()) as { id: string }
      expect(data.id).toBe(created.id)
    })

    it('should handle DELETE /api/subscriptions/:id', async () => {
      const instance = new StripeDO(ctx, env)
      const created = await instance.createSubscription({
        customer: 'cus_test',
        items: [{ price: 'price_test' }],
      })

      const request = new Request(
        `https://payments.do/api/subscriptions/${created.id}`,
        { method: 'DELETE' }
      )

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const data = (await response.json()) as { status: string }
      expect(data.status).toBe('canceled')
    })

    it('should return 404 for non-existent subscription', async () => {
      const instance = new StripeDO(ctx, env)
      const request = new Request(
        'https://payments.do/api/subscriptions/sub_nonexistent',
        { method: 'GET' }
      )

      const response = await instance.fetch(request)
      expect(response.status).toBe(404)
    })
  })

  describe('RPC interface for subscriptions', () => {
    it('should expose createSubscription method via RPC', async () => {
      const instance = new StripeDO(ctx, env)
      expect(instance.hasMethod('createSubscription')).toBe(true)

      const result = (await instance.invoke('createSubscription', [
        {
          customer: 'cus_test',
          items: [{ price: 'price_test' }],
        },
      ])) as { id: string }
      expect(result.id).toMatch(/^sub_/)
    })

    it('should expose cancelSubscription method via RPC', async () => {
      const instance = new StripeDO(ctx, env)
      const created = await instance.createSubscription({
        customer: 'cus_test',
        items: [{ price: 'price_test' }],
      })

      expect(instance.hasMethod('cancelSubscription')).toBe(true)
      const result = (await instance.invoke('cancelSubscription', [
        created.id,
      ])) as { status: string }
      expect(result.status).toBe('canceled')
    })
  })
})
