/**
 * Tests: payments.do Transfer Operations (Marketplace Payouts)
 *
 * These tests define the contract for transfer creation for marketplace payouts.
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
 * Interface definition for StripeDO transfer operations
 */
interface StripeDOContract {
  // Transfer operations
  createTransfer(params: {
    amount: number
    currency: string
    destination: string
    description?: string
    metadata?: Record<string, string>
  }): Promise<{
    id: string
    amount: number
    currency: string
    destination: string
  }>

  getTransfer(transferId: string): Promise<{
    id: string
    amount: number
    currency: string
    destination: string
  } | null>

  listTransfers(params?: {
    destination?: string
    limit?: number
  }): Promise<Array<{
    id: string
    amount: number
    currency: string
    destination: string
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

describe('StripeDO Transfer Operations (Marketplace Payouts)', () => {
  let ctx: MockDOState
  let env: MockStripeEnv
  let StripeDO: new (ctx: MockDOState, env: MockStripeEnv) => StripeDOContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    StripeDO = await loadStripeDO()
  })

  describe('createTransfer()', () => {
    it('should create a transfer with required parameters', async () => {
      const instance = new StripeDO(ctx, env)
      const transfer = await instance.createTransfer({
        amount: 10000,
        currency: 'usd',
        destination: 'acct_connected123',
      })

      expect(transfer.id).toMatch(/^tr_/)
      expect(transfer.amount).toBe(10000)
      expect(transfer.currency).toBe('usd')
      expect(transfer.destination).toBe('acct_connected123')
    })

    it('should create a transfer with description', async () => {
      const instance = new StripeDO(ctx, env)
      const transfer = await instance.createTransfer({
        amount: 5000,
        currency: 'eur',
        destination: 'acct_seller456',
        description: 'Monthly payout for seller',
      })

      expect(transfer.id).toBeDefined()
      expect(transfer.amount).toBe(5000)
      expect(transfer.currency).toBe('eur')
    })

    it('should create a transfer with metadata', async () => {
      const instance = new StripeDO(ctx, env)
      const transfer = await instance.createTransfer({
        amount: 7500,
        currency: 'usd',
        destination: 'acct_marketplace789',
        metadata: {
          order_id: 'ord_abc123',
          seller_id: 'seller_xyz',
        },
      })

      expect(transfer.id).toBeDefined()
      expect(transfer.amount).toBe(7500)
    })

    it('should reject invalid amount', async () => {
      const instance = new StripeDO(ctx, env)
      await expect(
        instance.createTransfer({
          amount: -1000,
          currency: 'usd',
          destination: 'acct_test',
        })
      ).rejects.toThrow(/amount|invalid|negative/i)
    })

    it('should reject zero amount', async () => {
      const instance = new StripeDO(ctx, env)
      await expect(
        instance.createTransfer({
          amount: 0,
          currency: 'usd',
          destination: 'acct_test',
        })
      ).rejects.toThrow(/amount|zero|invalid/i)
    })

    it('should reject missing destination', async () => {
      const instance = new StripeDO(ctx, env)
      await expect(
        instance.createTransfer({
          amount: 1000,
          currency: 'usd',
          destination: '',
        })
      ).rejects.toThrow(/destination|required/i)
    })

    it('should reject missing currency', async () => {
      const instance = new StripeDO(ctx, env)
      await expect(
        instance.createTransfer({
          amount: 1000,
          currency: '',
          destination: 'acct_test',
        })
      ).rejects.toThrow(/currency|required/i)
    })
  })

  describe('getTransfer()', () => {
    it('should retrieve an existing transfer', async () => {
      const instance = new StripeDO(ctx, env)
      const created = await instance.createTransfer({
        amount: 15000,
        currency: 'usd',
        destination: 'acct_retrieve_test',
      })

      const retrieved = await instance.getTransfer(created.id)
      expect(retrieved).not.toBeNull()
      expect(retrieved!.id).toBe(created.id)
      expect(retrieved!.amount).toBe(15000)
    })

    it('should return null for non-existent transfer', async () => {
      const instance = new StripeDO(ctx, env)
      const transfer = await instance.getTransfer('tr_nonexistent')
      expect(transfer).toBeNull()
    })

    it('should reject invalid transfer ID', async () => {
      const instance = new StripeDO(ctx, env)
      await expect(instance.getTransfer('')).rejects.toThrow(/id|required/i)
    })
  })

  describe('listTransfers()', () => {
    it('should list all transfers', async () => {
      const instance = new StripeDO(ctx, env)
      await instance.createTransfer({
        amount: 1000,
        currency: 'usd',
        destination: 'acct_list1',
      })
      await instance.createTransfer({
        amount: 2000,
        currency: 'usd',
        destination: 'acct_list2',
      })

      const transfers = await instance.listTransfers()
      expect(transfers.length).toBeGreaterThanOrEqual(2)
    })

    it('should filter by destination', async () => {
      const instance = new StripeDO(ctx, env)
      await instance.createTransfer({
        amount: 1000,
        currency: 'usd',
        destination: 'acct_target',
      })
      await instance.createTransfer({
        amount: 2000,
        currency: 'usd',
        destination: 'acct_other',
      })

      const transfers = await instance.listTransfers({
        destination: 'acct_target',
      })
      expect(Array.isArray(transfers)).toBe(true)
    })

    it('should accept limit parameter', async () => {
      const instance = new StripeDO(ctx, env)
      for (let i = 0; i < 5; i++) {
        await instance.createTransfer({
          amount: 1000,
          currency: 'usd',
          destination: `acct_limit_${i}`,
        })
      }

      // Note: The actual limiting is done by Stripe API, our mock returns all
      const transfers = await instance.listTransfers({ limit: 2 })
      expect(Array.isArray(transfers)).toBe(true)
    })
  })

  describe('HTTP API for transfers', () => {
    it('should handle POST /api/transfers', async () => {
      const instance = new StripeDO(ctx, env)
      const request = new Request('https://payments.do/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 8000,
          currency: 'usd',
          destination: 'acct_http_test',
        }),
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(201)

      const data = (await response.json()) as {
        id: string
        amount: number
        destination: string
      }
      expect(data.id).toMatch(/^tr_/)
      expect(data.amount).toBe(8000)
      expect(data.destination).toBe('acct_http_test')
    })

    it('should handle GET /api/transfers/:id', async () => {
      const instance = new StripeDO(ctx, env)
      const created = await instance.createTransfer({
        amount: 12000,
        currency: 'usd',
        destination: 'acct_get_test',
      })

      const request = new Request(
        `https://payments.do/api/transfers/${created.id}`,
        { method: 'GET' }
      )

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const data = (await response.json()) as { id: string }
      expect(data.id).toBe(created.id)
    })

    it('should return 404 for non-existent transfer', async () => {
      const instance = new StripeDO(ctx, env)
      const request = new Request(
        'https://payments.do/api/transfers/tr_nonexistent',
        { method: 'GET' }
      )

      const response = await instance.fetch(request)
      expect(response.status).toBe(404)
    })

    it('should handle GET /api/transfers (list)', async () => {
      const instance = new StripeDO(ctx, env)
      await instance.createTransfer({
        amount: 5000,
        currency: 'usd',
        destination: 'acct_list_test',
      })

      const request = new Request('https://payments.do/api/transfers', {
        method: 'GET',
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const data = (await response.json()) as { data: unknown[] }
      expect(Array.isArray(data.data)).toBe(true)
    })

    it('should return 400 for invalid transfer data', async () => {
      const instance = new StripeDO(ctx, env)
      const request = new Request('https://payments.do/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: -100, // Invalid
          currency: 'usd',
          destination: 'acct_test',
        }),
      })

      const response = await instance.fetch(request)
      // Validation errors are caught at the REST API level
      expect(response.status).toBe(400)
      const data = (await response.json()) as { error: string }
      expect(data.error).toMatch(/amount|invalid/i)
    })
  })

  describe('RPC interface for transfers', () => {
    it('should expose createTransfer method via RPC', async () => {
      const instance = new StripeDO(ctx, env)
      expect(instance.hasMethod('createTransfer')).toBe(true)

      const result = (await instance.invoke('createTransfer', [
        {
          amount: 9000,
          currency: 'usd',
          destination: 'acct_rpc_test',
        },
      ])) as { id: string }
      expect(result.id).toMatch(/^tr_/)
    })

    it('should expose getTransfer method via RPC', async () => {
      const instance = new StripeDO(ctx, env)
      const created = await instance.createTransfer({
        amount: 6000,
        currency: 'usd',
        destination: 'acct_rpc_get',
      })

      expect(instance.hasMethod('getTransfer')).toBe(true)
      const result = (await instance.invoke('getTransfer', [
        created.id,
      ])) as { id: string }
      expect(result.id).toBe(created.id)
    })

    it('should expose listTransfers method via RPC', async () => {
      const instance = new StripeDO(ctx, env)
      expect(instance.hasMethod('listTransfers')).toBe(true)

      const result = await instance.invoke('listTransfers', [{}])
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('Edge cases for marketplace payouts', () => {
    it('should handle large transfer amounts', async () => {
      const instance = new StripeDO(ctx, env)
      const transfer = await instance.createTransfer({
        amount: 100000000, // $1,000,000 in cents
        currency: 'usd',
        destination: 'acct_large_payout',
      })

      expect(transfer.amount).toBe(100000000)
    })

    it('should handle multiple currencies', async () => {
      const instance = new StripeDO(ctx, env)

      const usdTransfer = await instance.createTransfer({
        amount: 1000,
        currency: 'usd',
        destination: 'acct_multi_currency',
      })
      const eurTransfer = await instance.createTransfer({
        amount: 1000,
        currency: 'eur',
        destination: 'acct_multi_currency',
      })
      const gbpTransfer = await instance.createTransfer({
        amount: 1000,
        currency: 'gbp',
        destination: 'acct_multi_currency',
      })

      expect(usdTransfer.currency).toBe('usd')
      expect(eurTransfer.currency).toBe('eur')
      expect(gbpTransfer.currency).toBe('gbp')
    })
  })
})
