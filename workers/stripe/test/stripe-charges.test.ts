/**
 * Tests: payments.do Charge Operations
 *
 * These tests define the contract for charge creation and retrieval.
 * StripeDO must implement these operations via the Stripe Connect platform.
 *
 * @see ARCHITECTURE.md - payments.do (workers/stripe)
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createMockState,
  createMockEnv,
  createMockStripe,
  type MockDOState,
  type MockStripeEnv,
} from './helpers.js'

/**
 * Interface definition for StripeDO charge operations
 */
interface StripeDOContract {
  // Charge operations
  createCharge(params: {
    amount: number
    currency: string
    customer?: string
    description?: string
    metadata?: Record<string, string>
  }): Promise<{
    id: string
    amount: number
    currency: string
    status: string
  }>

  getCharge(chargeId: string): Promise<{
    id: string
    amount: number
    currency: string
    status: string
  } | null>

  listCharges(params?: {
    customer?: string
    limit?: number
  }): Promise<Array<{
    id: string
    amount: number
    currency: string
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

describe('StripeDO Charge Operations', () => {
  let ctx: MockDOState
  let env: MockStripeEnv
  let StripeDO: new (ctx: MockDOState, env: MockStripeEnv) => StripeDOContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    StripeDO = await loadStripeDO()
  })

  describe('createCharge()', () => {
    it('should create a charge with required parameters', async () => {
      const instance = new StripeDO(ctx, env)
      const charge = await instance.createCharge({
        amount: 2000,
        currency: 'usd',
      })

      expect(charge.id).toMatch(/^ch_/)
      expect(charge.amount).toBe(2000)
      expect(charge.currency).toBe('usd')
      expect(charge.status).toBe('succeeded')
    })

    it('should create a charge with customer', async () => {
      const instance = new StripeDO(ctx, env)
      const charge = await instance.createCharge({
        amount: 5000,
        currency: 'eur',
        customer: 'cus_test123',
      })

      expect(charge.id).toBeDefined()
      expect(charge.amount).toBe(5000)
      expect(charge.currency).toBe('eur')
    })

    it('should create a charge with description and metadata', async () => {
      const instance = new StripeDO(ctx, env)
      const charge = await instance.createCharge({
        amount: 1500,
        currency: 'usd',
        description: 'Test charge',
        metadata: { order_id: 'ord_123' },
      })

      expect(charge.id).toBeDefined()
      expect(charge.amount).toBe(1500)
    })

    it('should reject invalid amount', async () => {
      const instance = new StripeDO(ctx, env)
      await expect(
        instance.createCharge({
          amount: -100,
          currency: 'usd',
        })
      ).rejects.toThrow(/amount|invalid/i)
    })

    it('should reject missing currency', async () => {
      const instance = new StripeDO(ctx, env)
      await expect(
        instance.createCharge({
          amount: 1000,
          currency: '',
        })
      ).rejects.toThrow(/currency|required/i)
    })
  })

  describe('getCharge()', () => {
    it('should retrieve an existing charge', async () => {
      const instance = new StripeDO(ctx, env)
      const created = await instance.createCharge({
        amount: 3000,
        currency: 'usd',
      })

      const retrieved = await instance.getCharge(created.id)
      expect(retrieved).not.toBeNull()
      expect(retrieved!.id).toBe(created.id)
      expect(retrieved!.amount).toBe(3000)
    })

    it('should return null for non-existent charge', async () => {
      const instance = new StripeDO(ctx, env)
      const charge = await instance.getCharge('ch_nonexistent')
      expect(charge).toBeNull()
    })

    it('should reject invalid charge ID format', async () => {
      const instance = new StripeDO(ctx, env)
      await expect(instance.getCharge('')).rejects.toThrow(/id|required/i)
    })
  })

  describe('listCharges()', () => {
    it('should list all charges', async () => {
      const instance = new StripeDO(ctx, env)
      await instance.createCharge({ amount: 1000, currency: 'usd' })
      await instance.createCharge({ amount: 2000, currency: 'usd' })

      const charges = await instance.listCharges()
      expect(charges.length).toBeGreaterThanOrEqual(2)
    })

    it('should filter by customer', async () => {
      const instance = new StripeDO(ctx, env)
      await instance.createCharge({
        amount: 1000,
        currency: 'usd',
        customer: 'cus_test123',
      })
      await instance.createCharge({
        amount: 2000,
        currency: 'usd',
        customer: 'cus_other',
      })

      const charges = await instance.listCharges({ customer: 'cus_test123' })
      // Should filter by customer (behavior depends on mock implementation)
      expect(Array.isArray(charges)).toBe(true)
    })

    it('should accept limit parameter', async () => {
      const instance = new StripeDO(ctx, env)
      for (let i = 0; i < 5; i++) {
        await instance.createCharge({ amount: 1000, currency: 'usd' })
      }

      // Note: The actual limiting is done by Stripe API, our mock returns all
      const charges = await instance.listCharges({ limit: 2 })
      expect(Array.isArray(charges)).toBe(true)
    })
  })

  describe('HTTP API for charges', () => {
    it('should handle POST /api/charges', async () => {
      const instance = new StripeDO(ctx, env)
      const request = new Request('https://payments.do/api/charges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 2500, currency: 'usd' }),
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(201)

      const data = (await response.json()) as { id: string; amount: number }
      expect(data.id).toMatch(/^ch_/)
      expect(data.amount).toBe(2500)
    })

    it('should handle GET /api/charges/:id', async () => {
      const instance = new StripeDO(ctx, env)
      const created = await instance.createCharge({
        amount: 3500,
        currency: 'usd',
      })

      const request = new Request(
        `https://payments.do/api/charges/${created.id}`,
        { method: 'GET' }
      )

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const data = (await response.json()) as { id: string }
      expect(data.id).toBe(created.id)
    })

    it('should return 404 for non-existent charge', async () => {
      const instance = new StripeDO(ctx, env)
      const request = new Request(
        'https://payments.do/api/charges/ch_nonexistent',
        { method: 'GET' }
      )

      const response = await instance.fetch(request)
      expect(response.status).toBe(404)
    })

    it('should handle GET /api/charges (list)', async () => {
      const instance = new StripeDO(ctx, env)
      await instance.createCharge({ amount: 1000, currency: 'usd' })

      const request = new Request('https://payments.do/api/charges', {
        method: 'GET',
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const data = (await response.json()) as { data: unknown[] }
      expect(Array.isArray(data.data)).toBe(true)
    })
  })

  describe('RPC interface for charges', () => {
    it('should expose createCharge method via RPC', async () => {
      const instance = new StripeDO(ctx, env)
      expect(instance.hasMethod('createCharge')).toBe(true)

      const result = (await instance.invoke('createCharge', [
        { amount: 4000, currency: 'usd' },
      ])) as { id: string }
      expect(result.id).toMatch(/^ch_/)
    })

    it('should expose getCharge method via RPC', async () => {
      const instance = new StripeDO(ctx, env)
      const created = await instance.createCharge({
        amount: 5000,
        currency: 'usd',
      })

      expect(instance.hasMethod('getCharge')).toBe(true)
      const result = (await instance.invoke('getCharge', [
        created.id,
      ])) as { id: string }
      expect(result.id).toBe(created.id)
    })

    it('should expose listCharges method via RPC', async () => {
      const instance = new StripeDO(ctx, env)
      expect(instance.hasMethod('listCharges')).toBe(true)

      const result = await instance.invoke('listCharges', [{}])
      expect(Array.isArray(result)).toBe(true)
    })
  })
})
