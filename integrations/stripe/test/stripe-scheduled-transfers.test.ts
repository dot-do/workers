/**
 * Tests: payments.do Scheduled Transfer Operations
 *
 * These tests define the contract for scheduled and recurring transfer creation.
 * StripeDO must implement scheduled transfer operations for deferred payouts.
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
import type { ScheduledTransfer, Transfer } from '../src/stripe.js'

/**
 * Interface definition for StripeDO scheduled transfer operations
 */
interface StripeDOContract {
  // Scheduled transfer operations
  createScheduledTransfer(params: {
    amount: number
    currency: string
    destination: string
    scheduledAt: number
    description?: string
    metadata?: Record<string, string>
    recurring?: {
      interval: 'daily' | 'weekly' | 'monthly'
      count?: number
    }
  }): Promise<ScheduledTransfer>

  getScheduledTransfer(scheduledTransferId: string): Promise<ScheduledTransfer | null>

  listScheduledTransfers(params?: {
    destination?: string
    status?: ScheduledTransfer['status']
    limit?: number
  }): Promise<ScheduledTransfer[]>

  cancelScheduledTransfer(scheduledTransferId: string): Promise<ScheduledTransfer>

  executeScheduledTransfer(scheduledTransferId: string): Promise<Transfer>

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

describe('StripeDO Scheduled Transfer Operations', () => {
  let ctx: MockDOState
  let env: MockStripeEnv
  let StripeDO: new (ctx: MockDOState, env: MockStripeEnv) => StripeDOContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    StripeDO = await loadStripeDO()
  })

  describe('createScheduledTransfer()', () => {
    it('should create a scheduled transfer with required parameters', async () => {
      const instance = new StripeDO(ctx, env)
      const futureTime = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now

      const scheduledTransfer = await instance.createScheduledTransfer({
        amount: 10000,
        currency: 'usd',
        destination: 'acct_scheduled123',
        scheduledAt: futureTime,
      })

      expect(scheduledTransfer.id).toMatch(/^sched_tr_/)
      expect(scheduledTransfer.amount).toBe(10000)
      expect(scheduledTransfer.currency).toBe('usd')
      expect(scheduledTransfer.destination).toBe('acct_scheduled123')
      expect(scheduledTransfer.scheduledAt).toBe(futureTime)
      expect(scheduledTransfer.status).toBe('pending')
      expect(scheduledTransfer.nextExecutionAt).toBe(futureTime)
      expect(scheduledTransfer.transferIds).toEqual([])
    })

    it('should create a scheduled transfer with description and metadata', async () => {
      const instance = new StripeDO(ctx, env)
      const futureTime = Math.floor(Date.now() / 1000) + 7200

      const scheduledTransfer = await instance.createScheduledTransfer({
        amount: 5000,
        currency: 'eur',
        destination: 'acct_seller456',
        scheduledAt: futureTime,
        description: 'Scheduled monthly payout',
        metadata: {
          seller_id: 'seller_xyz',
          payout_type: 'monthly',
        },
      })

      expect(scheduledTransfer.id).toBeDefined()
      expect(scheduledTransfer.description).toBe('Scheduled monthly payout')
      expect(scheduledTransfer.metadata?.seller_id).toBe('seller_xyz')
    })

    it('should reject past scheduledAt timestamp', async () => {
      const instance = new StripeDO(ctx, env)
      const pastTime = Math.floor(Date.now() / 1000) - 3600 // 1 hour ago

      await expect(
        instance.createScheduledTransfer({
          amount: 10000,
          currency: 'usd',
          destination: 'acct_test',
          scheduledAt: pastTime,
        })
      ).rejects.toThrow(/future/i)
    })

    it('should reject invalid amount', async () => {
      const instance = new StripeDO(ctx, env)
      const futureTime = Math.floor(Date.now() / 1000) + 3600

      await expect(
        instance.createScheduledTransfer({
          amount: -1000,
          currency: 'usd',
          destination: 'acct_test',
          scheduledAt: futureTime,
        })
      ).rejects.toThrow(/amount|invalid|positive/i)
    })

    it('should reject missing destination', async () => {
      const instance = new StripeDO(ctx, env)
      const futureTime = Math.floor(Date.now() / 1000) + 3600

      await expect(
        instance.createScheduledTransfer({
          amount: 1000,
          currency: 'usd',
          destination: '',
          scheduledAt: futureTime,
        })
      ).rejects.toThrow(/destination|required/i)
    })
  })

  describe('getScheduledTransfer()', () => {
    it('should retrieve an existing scheduled transfer', async () => {
      const instance = new StripeDO(ctx, env)
      const futureTime = Math.floor(Date.now() / 1000) + 3600

      const created = await instance.createScheduledTransfer({
        amount: 15000,
        currency: 'usd',
        destination: 'acct_retrieve_test',
        scheduledAt: futureTime,
      })

      const retrieved = await instance.getScheduledTransfer(created.id)
      expect(retrieved).not.toBeNull()
      expect(retrieved!.id).toBe(created.id)
      expect(retrieved!.amount).toBe(15000)
      expect(retrieved!.status).toBe('pending')
    })

    it('should return null for non-existent scheduled transfer', async () => {
      const instance = new StripeDO(ctx, env)
      const scheduledTransfer = await instance.getScheduledTransfer('sched_tr_nonexistent')
      expect(scheduledTransfer).toBeNull()
    })

    it('should reject invalid scheduled transfer ID', async () => {
      const instance = new StripeDO(ctx, env)
      await expect(instance.getScheduledTransfer('')).rejects.toThrow(/id|required/i)
    })
  })

  describe('listScheduledTransfers()', () => {
    it('should list all scheduled transfers', async () => {
      const instance = new StripeDO(ctx, env)
      const futureTime = Math.floor(Date.now() / 1000) + 3600

      await instance.createScheduledTransfer({
        amount: 1000,
        currency: 'usd',
        destination: 'acct_list1',
        scheduledAt: futureTime,
      })
      await instance.createScheduledTransfer({
        amount: 2000,
        currency: 'usd',
        destination: 'acct_list2',
        scheduledAt: futureTime + 1000,
      })

      const scheduledTransfers = await instance.listScheduledTransfers()
      expect(scheduledTransfers.length).toBeGreaterThanOrEqual(2)
    })

    it('should filter by destination', async () => {
      const instance = new StripeDO(ctx, env)
      const futureTime = Math.floor(Date.now() / 1000) + 3600

      await instance.createScheduledTransfer({
        amount: 1000,
        currency: 'usd',
        destination: 'acct_target',
        scheduledAt: futureTime,
      })
      await instance.createScheduledTransfer({
        amount: 2000,
        currency: 'usd',
        destination: 'acct_other',
        scheduledAt: futureTime + 1000,
      })

      const scheduledTransfers = await instance.listScheduledTransfers({
        destination: 'acct_target',
      })
      expect(scheduledTransfers.length).toBe(1)
      expect(scheduledTransfers[0].destination).toBe('acct_target')
    })

    it('should filter by status', async () => {
      const instance = new StripeDO(ctx, env)
      const futureTime = Math.floor(Date.now() / 1000) + 3600

      const created = await instance.createScheduledTransfer({
        amount: 1000,
        currency: 'usd',
        destination: 'acct_status',
        scheduledAt: futureTime,
      })

      await instance.cancelScheduledTransfer(created.id)

      const pendingTransfers = await instance.listScheduledTransfers({ status: 'pending' })
      const canceledTransfers = await instance.listScheduledTransfers({ status: 'canceled' })

      expect(canceledTransfers.some(st => st.id === created.id)).toBe(true)
      expect(pendingTransfers.some(st => st.id === created.id)).toBe(false)
    })

    it('should accept limit parameter', async () => {
      const instance = new StripeDO(ctx, env)
      const futureTime = Math.floor(Date.now() / 1000) + 3600

      for (let i = 0; i < 5; i++) {
        await instance.createScheduledTransfer({
          amount: 1000,
          currency: 'usd',
          destination: `acct_limit_${i}`,
          scheduledAt: futureTime + i * 100,
        })
      }

      const scheduledTransfers = await instance.listScheduledTransfers({ limit: 2 })
      expect(scheduledTransfers.length).toBeLessThanOrEqual(2)
    })
  })

  describe('cancelScheduledTransfer()', () => {
    it('should cancel a pending scheduled transfer', async () => {
      const instance = new StripeDO(ctx, env)
      const futureTime = Math.floor(Date.now() / 1000) + 3600

      const created = await instance.createScheduledTransfer({
        amount: 10000,
        currency: 'usd',
        destination: 'acct_cancel_test',
        scheduledAt: futureTime,
      })

      const canceled = await instance.cancelScheduledTransfer(created.id)
      expect(canceled.id).toBe(created.id)
      expect(canceled.status).toBe('canceled')
    })

    it('should reject canceling non-existent scheduled transfer', async () => {
      const instance = new StripeDO(ctx, env)
      await expect(
        instance.cancelScheduledTransfer('sched_tr_nonexistent')
      ).rejects.toThrow(/not found/i)
    })

    it('should reject canceling already canceled scheduled transfer', async () => {
      const instance = new StripeDO(ctx, env)
      const futureTime = Math.floor(Date.now() / 1000) + 3600

      const created = await instance.createScheduledTransfer({
        amount: 10000,
        currency: 'usd',
        destination: 'acct_double_cancel',
        scheduledAt: futureTime,
      })

      await instance.cancelScheduledTransfer(created.id)

      await expect(
        instance.cancelScheduledTransfer(created.id)
      ).rejects.toThrow(/cannot cancel/i)
    })
  })

  describe('executeScheduledTransfer()', () => {
    it('should execute a scheduled transfer and create actual transfer', async () => {
      const instance = new StripeDO(ctx, env)
      const futureTime = Math.floor(Date.now() / 1000) + 3600

      const scheduled = await instance.createScheduledTransfer({
        amount: 10000,
        currency: 'usd',
        destination: 'acct_execute_test',
        scheduledAt: futureTime,
      })

      const transfer = await instance.executeScheduledTransfer(scheduled.id)
      expect(transfer.id).toMatch(/^tr_/)
      expect(transfer.amount).toBe(10000)
      expect(transfer.currency).toBe('usd')
      expect(transfer.destination).toBe('acct_execute_test')

      const updated = await instance.getScheduledTransfer(scheduled.id)
      expect(updated!.status).toBe('completed')
      expect(updated!.transferIds).toContain(transfer.id)
      expect(updated!.lastExecutedAt).toBeDefined()
    })

    it('should reject executing canceled scheduled transfer', async () => {
      const instance = new StripeDO(ctx, env)
      const futureTime = Math.floor(Date.now() / 1000) + 3600

      const scheduled = await instance.createScheduledTransfer({
        amount: 10000,
        currency: 'usd',
        destination: 'acct_execute_canceled',
        scheduledAt: futureTime,
      })

      await instance.cancelScheduledTransfer(scheduled.id)

      await expect(
        instance.executeScheduledTransfer(scheduled.id)
      ).rejects.toThrow(/canceled/i)
    })
  })

  describe('Recurring transfers', () => {
    it('should create a daily recurring scheduled transfer', async () => {
      const instance = new StripeDO(ctx, env)
      const futureTime = Math.floor(Date.now() / 1000) + 3600

      const scheduledTransfer = await instance.createScheduledTransfer({
        amount: 5000,
        currency: 'usd',
        destination: 'acct_recurring_daily',
        scheduledAt: futureTime,
        recurring: {
          interval: 'daily',
          count: 5,
        },
      })

      expect(scheduledTransfer.recurring).toBeDefined()
      expect(scheduledTransfer.recurring!.interval).toBe('daily')
      expect(scheduledTransfer.recurring!.count).toBe(5)
      expect(scheduledTransfer.recurring!.executedCount).toBe(0)
    })

    it('should create a weekly recurring scheduled transfer', async () => {
      const instance = new StripeDO(ctx, env)
      const futureTime = Math.floor(Date.now() / 1000) + 3600

      const scheduledTransfer = await instance.createScheduledTransfer({
        amount: 5000,
        currency: 'usd',
        destination: 'acct_recurring_weekly',
        scheduledAt: futureTime,
        recurring: {
          interval: 'weekly',
        },
      })

      expect(scheduledTransfer.recurring).toBeDefined()
      expect(scheduledTransfer.recurring!.interval).toBe('weekly')
      expect(scheduledTransfer.recurring!.count).toBeUndefined() // Infinite
    })

    it('should create a monthly recurring scheduled transfer', async () => {
      const instance = new StripeDO(ctx, env)
      const futureTime = Math.floor(Date.now() / 1000) + 3600

      const scheduledTransfer = await instance.createScheduledTransfer({
        amount: 10000,
        currency: 'usd',
        destination: 'acct_recurring_monthly',
        scheduledAt: futureTime,
        recurring: {
          interval: 'monthly',
          count: 12,
        },
      })

      expect(scheduledTransfer.recurring!.interval).toBe('monthly')
      expect(scheduledTransfer.recurring!.count).toBe(12)
    })

    it('should reject invalid recurring interval', async () => {
      const instance = new StripeDO(ctx, env)
      const futureTime = Math.floor(Date.now() / 1000) + 3600

      await expect(
        instance.createScheduledTransfer({
          amount: 5000,
          currency: 'usd',
          destination: 'acct_invalid_interval',
          scheduledAt: futureTime,
          recurring: {
            interval: 'yearly' as any,
          },
        })
      ).rejects.toThrow(/interval/i)
    })

    it('should reject invalid recurring count', async () => {
      const instance = new StripeDO(ctx, env)
      const futureTime = Math.floor(Date.now() / 1000) + 3600

      await expect(
        instance.createScheduledTransfer({
          amount: 5000,
          currency: 'usd',
          destination: 'acct_invalid_count',
          scheduledAt: futureTime,
          recurring: {
            interval: 'daily',
            count: -5,
          },
        })
      ).rejects.toThrow(/count/i)
    })

    it('should execute recurring transfer and schedule next execution', async () => {
      const instance = new StripeDO(ctx, env)
      const futureTime = Math.floor(Date.now() / 1000) + 3600

      const scheduled = await instance.createScheduledTransfer({
        amount: 5000,
        currency: 'usd',
        destination: 'acct_recurring_execute',
        scheduledAt: futureTime,
        recurring: {
          interval: 'daily',
          count: 3,
        },
      })

      // First execution
      await instance.executeScheduledTransfer(scheduled.id)

      const afterFirst = await instance.getScheduledTransfer(scheduled.id)
      expect(afterFirst!.status).toBe('pending')
      expect(afterFirst!.recurring!.executedCount).toBe(1)
      expect(afterFirst!.transferIds.length).toBe(1)
      expect(afterFirst!.nextExecutionAt).toBeGreaterThan(futureTime)

      // Second execution
      await instance.executeScheduledTransfer(scheduled.id)

      const afterSecond = await instance.getScheduledTransfer(scheduled.id)
      expect(afterSecond!.status).toBe('pending')
      expect(afterSecond!.recurring!.executedCount).toBe(2)
      expect(afterSecond!.transferIds.length).toBe(2)

      // Third and final execution
      await instance.executeScheduledTransfer(scheduled.id)

      const afterThird = await instance.getScheduledTransfer(scheduled.id)
      expect(afterThird!.status).toBe('completed')
      expect(afterThird!.recurring!.executedCount).toBe(3)
      expect(afterThird!.transferIds.length).toBe(3)
      expect(afterThird!.nextExecutionAt).toBeUndefined()
    })

    it('should execute infinite recurring transfer', async () => {
      const instance = new StripeDO(ctx, env)
      const futureTime = Math.floor(Date.now() / 1000) + 3600

      const scheduled = await instance.createScheduledTransfer({
        amount: 5000,
        currency: 'usd',
        destination: 'acct_recurring_infinite',
        scheduledAt: futureTime,
        recurring: {
          interval: 'weekly',
          // No count = infinite
        },
      })

      // Execute multiple times
      for (let i = 0; i < 5; i++) {
        await instance.executeScheduledTransfer(scheduled.id)
      }

      const afterExecutions = await instance.getScheduledTransfer(scheduled.id)
      expect(afterExecutions!.status).toBe('pending') // Still pending, not completed
      expect(afterExecutions!.recurring!.executedCount).toBe(5)
      expect(afterExecutions!.transferIds.length).toBe(5)
      expect(afterExecutions!.nextExecutionAt).toBeDefined()
    })
  })

  describe('HTTP API for scheduled transfers', () => {
    it('should handle POST /api/scheduled_transfers', async () => {
      const instance = new StripeDO(ctx, env)
      const futureTime = Math.floor(Date.now() / 1000) + 3600

      const request = new Request('https://payments.do/api/scheduled_transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 8000,
          currency: 'usd',
          destination: 'acct_http_scheduled',
          scheduledAt: futureTime,
        }),
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(201)

      const data = (await response.json()) as ScheduledTransfer
      expect(data.id).toMatch(/^sched_tr_/)
      expect(data.amount).toBe(8000)
      expect(data.destination).toBe('acct_http_scheduled')
      expect(data.status).toBe('pending')
    })

    it('should handle GET /api/scheduled_transfers/:id', async () => {
      const instance = new StripeDO(ctx, env)
      const futureTime = Math.floor(Date.now() / 1000) + 3600

      const created = await instance.createScheduledTransfer({
        amount: 12000,
        currency: 'usd',
        destination: 'acct_get_scheduled',
        scheduledAt: futureTime,
      })

      const request = new Request(
        `https://payments.do/api/scheduled_transfers/${created.id}`,
        { method: 'GET' }
      )

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const data = (await response.json()) as ScheduledTransfer
      expect(data.id).toBe(created.id)
    })

    it('should return 404 for non-existent scheduled transfer', async () => {
      const instance = new StripeDO(ctx, env)
      const request = new Request(
        'https://payments.do/api/scheduled_transfers/sched_tr_nonexistent',
        { method: 'GET' }
      )

      const response = await instance.fetch(request)
      expect(response.status).toBe(404)
    })

    it('should handle GET /api/scheduled_transfers (list)', async () => {
      const instance = new StripeDO(ctx, env)
      const futureTime = Math.floor(Date.now() / 1000) + 3600

      await instance.createScheduledTransfer({
        amount: 5000,
        currency: 'usd',
        destination: 'acct_list_scheduled',
        scheduledAt: futureTime,
      })

      const request = new Request('https://payments.do/api/scheduled_transfers', {
        method: 'GET',
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const data = (await response.json()) as { data: ScheduledTransfer[] }
      expect(Array.isArray(data.data)).toBe(true)
    })

    it('should handle DELETE /api/scheduled_transfers/:id', async () => {
      const instance = new StripeDO(ctx, env)
      const futureTime = Math.floor(Date.now() / 1000) + 3600

      const created = await instance.createScheduledTransfer({
        amount: 10000,
        currency: 'usd',
        destination: 'acct_delete_scheduled',
        scheduledAt: futureTime,
      })

      const request = new Request(
        `https://payments.do/api/scheduled_transfers/${created.id}`,
        { method: 'DELETE' }
      )

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const data = (await response.json()) as ScheduledTransfer
      expect(data.status).toBe('canceled')
    })

    it('should return 400 for invalid scheduled transfer data', async () => {
      const instance = new StripeDO(ctx, env)
      const pastTime = Math.floor(Date.now() / 1000) - 3600

      const request = new Request('https://payments.do/api/scheduled_transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 100,
          currency: 'usd',
          destination: 'acct_test',
          scheduledAt: pastTime, // Invalid: past time
        }),
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(400)
      const data = (await response.json()) as { error: string }
      expect(data.error).toMatch(/future/i)
    })
  })

  describe('RPC interface for scheduled transfers', () => {
    it('should expose createScheduledTransfer method via RPC', async () => {
      const instance = new StripeDO(ctx, env)
      const futureTime = Math.floor(Date.now() / 1000) + 3600

      expect(instance.hasMethod('createScheduledTransfer')).toBe(true)

      const result = (await instance.invoke('createScheduledTransfer', [
        {
          amount: 9000,
          currency: 'usd',
          destination: 'acct_rpc_scheduled',
          scheduledAt: futureTime,
        },
      ])) as ScheduledTransfer
      expect(result.id).toMatch(/^sched_tr_/)
    })

    it('should expose getScheduledTransfer method via RPC', async () => {
      const instance = new StripeDO(ctx, env)
      const futureTime = Math.floor(Date.now() / 1000) + 3600

      const created = await instance.createScheduledTransfer({
        amount: 6000,
        currency: 'usd',
        destination: 'acct_rpc_get_scheduled',
        scheduledAt: futureTime,
      })

      expect(instance.hasMethod('getScheduledTransfer')).toBe(true)
      const result = (await instance.invoke('getScheduledTransfer', [
        created.id,
      ])) as ScheduledTransfer
      expect(result.id).toBe(created.id)
    })

    it('should expose listScheduledTransfers method via RPC', async () => {
      const instance = new StripeDO(ctx, env)
      expect(instance.hasMethod('listScheduledTransfers')).toBe(true)

      const result = await instance.invoke('listScheduledTransfers', [{}])
      expect(Array.isArray(result)).toBe(true)
    })

    it('should expose cancelScheduledTransfer method via RPC', async () => {
      const instance = new StripeDO(ctx, env)
      const futureTime = Math.floor(Date.now() / 1000) + 3600

      const created = await instance.createScheduledTransfer({
        amount: 7000,
        currency: 'usd',
        destination: 'acct_rpc_cancel',
        scheduledAt: futureTime,
      })

      expect(instance.hasMethod('cancelScheduledTransfer')).toBe(true)
      const result = (await instance.invoke('cancelScheduledTransfer', [
        created.id,
      ])) as ScheduledTransfer
      expect(result.status).toBe('canceled')
    })
  })
})
