/**
 * Tests: payments.do Webhook Handling
 *
 * These tests define the contract for Stripe webhook event handling.
 * StripeDO must implement webhook verification and event processing.
 *
 * @see ARCHITECTURE.md - payments.do (workers/stripe)
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createMockState,
  createMockEnv,
  createWebhookRequest,
  type MockDOState,
  type MockStripeEnv,
} from './helpers.js'

/**
 * Interface definition for StripeDO webhook operations
 */
interface StripeDOContract {
  // Webhook handling
  handleWebhook(request: Request): Promise<Response>

  // Get webhook event handlers
  getWebhookHandlers(): Record<string, (event: unknown) => Promise<void>>

  // Register custom webhook handler
  registerWebhookHandler(
    eventType: string,
    handler: (event: unknown) => Promise<void>
  ): void

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

describe('StripeDO Webhook Handling', () => {
  let ctx: MockDOState
  let env: MockStripeEnv
  let StripeDO: new (ctx: MockDOState, env: MockStripeEnv) => StripeDOContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    StripeDO = await loadStripeDO()
  })

  describe('handleWebhook()', () => {
    it('should process charge.succeeded event', async () => {
      const instance = new StripeDO(ctx, env)
      const request = createWebhookRequest('charge.succeeded', {
        id: 'ch_test123',
        object: 'charge',
        amount: 2000,
        currency: 'usd',
        status: 'succeeded',
      })

      const response = await instance.handleWebhook(request)
      expect(response.status).toBe(200)
    })

    it('should process customer.subscription.created event', async () => {
      const instance = new StripeDO(ctx, env)
      const request = createWebhookRequest('customer.subscription.created', {
        id: 'sub_test456',
        object: 'subscription',
        customer: 'cus_test123',
        status: 'active',
      })

      const response = await instance.handleWebhook(request)
      expect(response.status).toBe(200)
    })

    it('should process customer.subscription.deleted event', async () => {
      const instance = new StripeDO(ctx, env)
      const request = createWebhookRequest('customer.subscription.deleted', {
        id: 'sub_test789',
        object: 'subscription',
        customer: 'cus_test123',
        status: 'canceled',
      })

      const response = await instance.handleWebhook(request)
      expect(response.status).toBe(200)
    })

    it('should process invoice.paid event', async () => {
      const instance = new StripeDO(ctx, env)
      const request = createWebhookRequest('invoice.paid', {
        id: 'in_test123',
        object: 'invoice',
        customer: 'cus_test123',
        amount_paid: 5000,
        status: 'paid',
      })

      const response = await instance.handleWebhook(request)
      expect(response.status).toBe(200)
    })

    it('should process invoice.payment_failed event', async () => {
      const instance = new StripeDO(ctx, env)
      const request = createWebhookRequest('invoice.payment_failed', {
        id: 'in_failed123',
        object: 'invoice',
        customer: 'cus_test123',
        amount_due: 5000,
        status: 'uncollectible',
      })

      const response = await instance.handleWebhook(request)
      expect(response.status).toBe(200)
    })

    it('should process transfer.created event', async () => {
      const instance = new StripeDO(ctx, env)
      const request = createWebhookRequest('transfer.created', {
        id: 'tr_test123',
        object: 'transfer',
        amount: 10000,
        destination: 'acct_connected',
      })

      const response = await instance.handleWebhook(request)
      expect(response.status).toBe(200)
    })

    it('should handle unknown event types gracefully', async () => {
      const instance = new StripeDO(ctx, env)
      const request = createWebhookRequest('unknown.event.type', {
        id: 'unknown_123',
      })

      const response = await instance.handleWebhook(request)
      // Should acknowledge but not process unknown events
      expect(response.status).toBe(200)
    })

    it('should reject invalid webhook signature', async () => {
      const instance = new StripeDO(ctx, env)
      const request = new Request('https://payments.do/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Stripe-Signature': 'invalid_signature',
        },
        body: JSON.stringify({
          id: 'evt_test',
          type: 'charge.succeeded',
          data: { object: {} },
        }),
      })

      const response = await instance.handleWebhook(request)
      expect(response.status).toBe(400)
    })

    it('should reject missing webhook signature', async () => {
      const instance = new StripeDO(ctx, env)
      const request = new Request('https://payments.do/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'evt_test',
          type: 'charge.succeeded',
          data: { object: {} },
        }),
      })

      const response = await instance.handleWebhook(request)
      expect(response.status).toBe(400)
    })

    it('should reject invalid JSON payload', async () => {
      const instance = new StripeDO(ctx, env)
      const request = new Request('https://payments.do/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Stripe-Signature': 't=123,v1=abc',
        },
        body: 'not valid json {',
      })

      const response = await instance.handleWebhook(request)
      expect(response.status).toBe(400)
    })
  })

  describe('HTTP /webhooks endpoint', () => {
    it('should route POST /webhooks to handleWebhook', async () => {
      const instance = new StripeDO(ctx, env)
      const request = createWebhookRequest('charge.succeeded', {
        id: 'ch_routing_test',
        amount: 1000,
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)
    })

    it('should reject non-POST methods on /webhooks', async () => {
      const instance = new StripeDO(ctx, env)
      const request = new Request('https://payments.do/webhooks', {
        method: 'GET',
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(405)
    })
  })

  describe('Custom webhook handlers', () => {
    it('should allow registering custom event handlers', async () => {
      const instance = new StripeDO(ctx, env)
      let handlerCalled = false

      instance.registerWebhookHandler(
        'custom.event',
        async (event: unknown) => {
          handlerCalled = true
        }
      )

      const request = createWebhookRequest('custom.event', {
        id: 'custom_123',
        data: 'test',
      })

      await instance.handleWebhook(request)
      expect(handlerCalled).toBe(true)
    })

    it('should override default handlers with custom ones', async () => {
      const instance = new StripeDO(ctx, env)
      let customHandlerCalled = false

      instance.registerWebhookHandler(
        'charge.succeeded',
        async (event: unknown) => {
          customHandlerCalled = true
        }
      )

      const request = createWebhookRequest('charge.succeeded', {
        id: 'ch_override_test',
        amount: 1000,
      })

      await instance.handleWebhook(request)
      expect(customHandlerCalled).toBe(true)
    })

    it('should get list of registered handlers', async () => {
      const instance = new StripeDO(ctx, env)
      const handlers = instance.getWebhookHandlers()

      expect(handlers).toBeDefined()
      expect(typeof handlers).toBe('object')
    })
  })

  describe('Webhook event logging', () => {
    it('should store webhook events in storage', async () => {
      const instance = new StripeDO(ctx, env)
      const request = createWebhookRequest('charge.succeeded', {
        id: 'ch_log_test',
        amount: 3000,
      })

      await instance.handleWebhook(request)

      // Check that the event was stored
      const storedEvents = await ctx.storage.list({ prefix: 'webhook:' })
      expect(storedEvents.size).toBeGreaterThan(0)
    })
  })

  describe('Webhook idempotency', () => {
    it('should handle duplicate webhook events', async () => {
      const instance = new StripeDO(ctx, env)
      const request1 = createWebhookRequest('charge.succeeded', {
        id: 'ch_duplicate',
        amount: 1000,
      })
      const request2 = createWebhookRequest('charge.succeeded', {
        id: 'ch_duplicate',
        amount: 1000,
      })

      const response1 = await instance.handleWebhook(request1)
      const response2 = await instance.handleWebhook(request2)

      // Both should succeed (idempotent)
      expect(response1.status).toBe(200)
      expect(response2.status).toBe(200)
    })
  })

  describe('Connect webhook events', () => {
    it('should process account.updated event', async () => {
      const instance = new StripeDO(ctx, env)
      const request = createWebhookRequest('account.updated', {
        id: 'acct_connect123',
        object: 'account',
        charges_enabled: true,
        payouts_enabled: true,
      })

      const response = await instance.handleWebhook(request)
      expect(response.status).toBe(200)
    })

    it('should process payout.created event', async () => {
      const instance = new StripeDO(ctx, env)
      const request = createWebhookRequest('payout.created', {
        id: 'po_test123',
        object: 'payout',
        amount: 50000,
        arrival_date: Date.now() / 1000 + 86400,
      })

      const response = await instance.handleWebhook(request)
      expect(response.status).toBe(200)
    })

    it('should process payout.failed event', async () => {
      const instance = new StripeDO(ctx, env)
      const request = createWebhookRequest('payout.failed', {
        id: 'po_failed123',
        object: 'payout',
        amount: 50000,
        failure_code: 'account_closed',
      })

      const response = await instance.handleWebhook(request)
      expect(response.status).toBe(200)
    })
  })
})
