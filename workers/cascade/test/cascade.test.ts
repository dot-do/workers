/**
 * Tests for Cascade Queue Worker
 *
 * Tests the CascadeQueueDO implementation for ~> and <~ operators.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  CascadeQueueDO,
  CascadeError,
  TargetNotFoundError,
  CascadeTimeoutError,
  CascadeRejectedError,
  generateOperationId,
  generateCorrelationId,
  calculateBackoff,
  createRelationshipKey,
  DEFAULT_CASCADE_CONFIG,
  INITIAL_STATS,
  type CascadeOperation,
  type CascadeOperator,
  type CascadeAction,
  type CascadeQueueConfig,
  type EnqueueOptions,
} from '../src/cascade.js'
import {
  createMockState,
  createMockEnv,
  createMockNamespace,
  createSampleOperation,
  createSampleOperations,
  createSampleEnqueueOptions,
  createSampleStats,
  spyOnStorage,
  type MockDOState,
  type MockCascadeEnv,
} from './helpers.js'

describe('Cascade Queue Worker', () => {
  let mockState: MockDOState
  let mockEnv: MockCascadeEnv
  let cascadeQueue: CascadeQueueDO

  beforeEach(() => {
    vi.clearAllMocks()
    mockState = createMockState()
    mockEnv = createMockEnv()
    cascadeQueue = new CascadeQueueDO(mockState as any, mockEnv as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Utility Functions', () => {
    describe('generateOperationId', () => {
      it('should generate unique IDs', () => {
        const id1 = generateOperationId()
        const id2 = generateOperationId()

        expect(id1).not.toBe(id2)
        expect(id1).toMatch(/^cop_[a-z0-9]+_[a-z0-9]+$/)
        expect(id2).toMatch(/^cop_[a-z0-9]+_[a-z0-9]+$/)
      })
    })

    describe('generateCorrelationId', () => {
      it('should generate unique correlation IDs', () => {
        const id1 = generateCorrelationId()
        const id2 = generateCorrelationId()

        expect(id1).not.toBe(id2)
        expect(id1).toMatch(/^ccor_[a-z0-9]+_[a-z0-9]+$/)
      })
    })

    describe('calculateBackoff', () => {
      it('should calculate exponential backoff', () => {
        const policy = DEFAULT_CASCADE_CONFIG.retryPolicy

        const backoff0 = calculateBackoff(0, policy)
        const backoff1 = calculateBackoff(1, policy)
        const backoff2 = calculateBackoff(2, policy)

        // With jitter, values will vary, but should follow exponential pattern
        expect(backoff0).toBeGreaterThanOrEqual(policy.initialBackoffMs)
        expect(backoff1).toBeGreaterThan(backoff0)
        expect(backoff2).toBeGreaterThan(backoff1)
      })

      it('should respect max backoff', () => {
        const policy = { ...DEFAULT_CASCADE_CONFIG.retryPolicy, maxBackoffMs: 5000 }

        const backoff = calculateBackoff(100, policy)

        expect(backoff).toBeLessThanOrEqual(policy.maxBackoffMs * (1 + policy.jitterFactor))
      })
    })

    describe('createRelationshipKey', () => {
      it('should create consistent relationship keys', () => {
        const key = createRelationshipKey('UserDO', 'user-123', 'orders', 'Order')

        expect(key).toBe('UserDO:user-123:orders:Order')
      })
    })
  })

  describe('Error Classes', () => {
    describe('CascadeError', () => {
      it('should create error with correct properties', () => {
        const error = new CascadeError('Test error', 'TEST_CODE', 'op-123', true)

        expect(error.message).toBe('Test error')
        expect(error.code).toBe('TEST_CODE')
        expect(error.operationId).toBe('op-123')
        expect(error.retryable).toBe(true)
        expect(error.name).toBe('CascadeError')
      })
    })

    describe('TargetNotFoundError', () => {
      it('should create error with target information', () => {
        const error = new TargetNotFoundError('op-123', 'UserDO', 'user-456')

        expect(error.message).toContain('UserDO')
        expect(error.message).toContain('user-456')
        expect(error.code).toBe('TARGET_NOT_FOUND')
        expect(error.retryable).toBe(false)
      })
    })

    describe('CascadeTimeoutError', () => {
      it('should create timeout error', () => {
        const error = new CascadeTimeoutError('op-123', 5000)

        expect(error.message).toContain('5000ms')
        expect(error.code).toBe('TIMEOUT')
        expect(error.retryable).toBe(true)
      })
    })

    describe('CascadeRejectedError', () => {
      it('should create rejected error', () => {
        const error = new CascadeRejectedError('op-123', 'Invalid payload')

        expect(error.message).toContain('Invalid payload')
        expect(error.code).toBe('REJECTED')
        expect(error.retryable).toBe(false)
      })
    })
  })

  describe('Default Configuration', () => {
    it('should have reasonable defaults', () => {
      expect(DEFAULT_CASCADE_CONFIG.batchSize).toBe(100)
      expect(DEFAULT_CASCADE_CONFIG.concurrency).toBe(10)
      expect(DEFAULT_CASCADE_CONFIG.retryPolicy.maxRetries).toBe(5)
      expect(DEFAULT_CASCADE_CONFIG.deadLetter.enabled).toBe(true)
    })

    it('should have initial stats with zero values', () => {
      expect(INITIAL_STATS.totalEnqueued).toBe(0)
      expect(INITIAL_STATS.totalCompleted).toBe(0)
      expect(INITIAL_STATS.pendingCount).toBe(0)
    })
  })

  describe('CascadeQueueDO', () => {
    describe('Enqueue Operations', () => {
      it('should enqueue a forward soft cascade (~>) operation', async () => {
        const op = await cascadeQueue.enqueue(
          '~>',
          'update',
          {
            doClass: 'UserDO',
            doId: 'user-123',
            entityType: 'User',
            entityId: 'user-123',
          },
          {
            doClass: 'OrderDO',
            doId: 'order-456',
            entityType: 'Order',
            relationship: 'user_orders',
          },
          { status: 'updated' }
        )

        expect(op.id).toMatch(/^cop_/)
        expect(op.operator).toBe('~>')
        expect(op.action).toBe('update')
        expect(op.status).toBe('pending')
        expect(op.source.doClass).toBe('UserDO')
        expect(op.target.doClass).toBe('OrderDO')
      })

      it('should enqueue a reverse soft cascade (<~) operation', async () => {
        const op = await cascadeQueue.enqueue(
          '<~',
          'notify',
          {
            doClass: 'OrderDO',
            doId: 'order-456',
            entityType: 'Order',
            entityId: 'order-456',
          },
          {
            doClass: 'UserDO',
            doId: 'user-123',
            entityType: 'User',
            relationship: 'order_user',
          },
          { notification: 'order_updated' }
        )

        expect(op.operator).toBe('<~')
        expect(op.action).toBe('notify')
      })

      it('should support all action types', async () => {
        const actions: CascadeAction[] = ['update', 'delete', 'notify', 'sync', 'custom']

        for (const action of actions) {
          const op = await cascadeQueue.enqueue(
            '~>',
            action,
            {
              doClass: 'TestDO',
              doId: 'test-123',
              entityType: 'Test',
              entityId: 'test-123',
            },
            {
              doClass: 'TargetDO',
              entityType: 'Target',
              relationship: 'test_targets',
            },
            {}
          )

          expect(op.action).toBe(action)
        }
      })

      it('should apply enqueue options', async () => {
        const options: EnqueueOptions = {
          priority: 'high',
          correlationId: 'custom-correlation-id',
          causationId: 'parent-operation-id',
          tags: ['urgent', 'user-request'],
          metadata: { source: 'test' },
          delayMs: 5000,
        }

        const op = await cascadeQueue.enqueue(
          '~>',
          'update',
          {
            doClass: 'UserDO',
            doId: 'user-123',
            entityType: 'User',
            entityId: 'user-123',
          },
          {
            doClass: 'OrderDO',
            entityType: 'Order',
            relationship: 'user_orders',
          },
          {},
          options
        )

        expect(op.metadata.priority).toBe('high')
        expect(op.metadata.correlationId).toBe('custom-correlation-id')
        expect(op.metadata.causationId).toBe('parent-operation-id')
        expect(op.metadata.tags).toContain('urgent')
        expect(op.retry.nextRetryAt).toBeGreaterThan(Date.now())
      })

      it('should reject duplicate idempotency keys', async () => {
        const idempotencyKey = 'unique-key-123'

        await cascadeQueue.enqueue(
          '~>',
          'update',
          {
            doClass: 'UserDO',
            doId: 'user-123',
            entityType: 'User',
            entityId: 'user-123',
          },
          {
            doClass: 'OrderDO',
            entityType: 'Order',
            relationship: 'user_orders',
          },
          {},
          { idempotencyKey }
        )

        await expect(
          cascadeQueue.enqueue(
            '~>',
            'update',
            {
              doClass: 'UserDO',
              doId: 'user-123',
              entityType: 'User',
              entityId: 'user-123',
            },
            {
              doClass: 'OrderDO',
              entityType: 'Order',
              relationship: 'user_orders',
            },
            {},
            { idempotencyKey }
          )
        ).rejects.toThrow('Duplicate operation')
      })

      it('should update stats on enqueue', async () => {
        await cascadeQueue.enqueue(
          '~>',
          'update',
          {
            doClass: 'UserDO',
            doId: 'user-123',
            entityType: 'User',
            entityId: 'user-123',
          },
          {
            doClass: 'OrderDO',
            entityType: 'Order',
            relationship: 'user_orders',
          },
          {}
        )

        const stats = await cascadeQueue.getStats()

        expect(stats.totalEnqueued).toBe(1)
        expect(stats.pendingCount).toBe(1)
        expect(stats.byOperator['~>'].enqueued).toBe(1)
        expect(stats.byAction.update.enqueued).toBe(1)
      })

      it('should schedule alarm on first enqueue', async () => {
        await cascadeQueue.enqueue(
          '~>',
          'update',
          {
            doClass: 'UserDO',
            doId: 'user-123',
            entityType: 'User',
            entityId: 'user-123',
          },
          {
            doClass: 'OrderDO',
            entityType: 'Order',
            relationship: 'user_orders',
          },
          {}
        )

        expect(mockState.storage.setAlarm).toHaveBeenCalled()
      })
    })

    describe('Statistics', () => {
      it('should return stats', async () => {
        const stats = await cascadeQueue.getStats()

        expect(stats).toBeDefined()
        expect(stats.totalEnqueued).toBe(0)
        expect(stats.byOperator).toBeDefined()
        expect(stats.byAction).toBeDefined()
      })
    })

    describe('Configuration', () => {
      it('should return default config', async () => {
        const config = await cascadeQueue.getConfig()

        expect(config.batchSize).toBe(DEFAULT_CASCADE_CONFIG.batchSize)
        expect(config.concurrency).toBe(DEFAULT_CASCADE_CONFIG.concurrency)
      })

      it('should update config', async () => {
        const config = await cascadeQueue.updateConfig({
          batchSize: 50,
          concurrency: 5,
        })

        expect(config.batchSize).toBe(50)
        expect(config.concurrency).toBe(5)
      })
    })

    describe('Dead Letter Queue', () => {
      it('should return empty dead letter queue initially', async () => {
        const result = await cascadeQueue.getDeadLetterQueue()

        expect(result.operations).toEqual([])
        expect(result.cursor).toBeUndefined()
      })
    })

    describe('HTTP Handler', () => {
      it('should handle /enqueue POST', async () => {
        const request = new Request('http://internal/enqueue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            operator: '~>',
            action: 'update',
            source: {
              doClass: 'UserDO',
              doId: 'user-123',
              entityType: 'User',
              entityId: 'user-123',
            },
            target: {
              doClass: 'OrderDO',
              entityType: 'Order',
              relationship: 'user_orders',
            },
            payload: { test: true },
          }),
        })

        const response = await cascadeQueue.fetch(request)

        expect(response.status).toBe(200)
        const body = await response.json()
        expect(body.id).toMatch(/^cop_/)
        expect(body.operator).toBe('~>')
      })

      it('should handle /stats GET', async () => {
        const request = new Request('http://internal/stats', {
          method: 'GET',
        })

        const response = await cascadeQueue.fetch(request)

        expect(response.status).toBe(200)
        const stats = await response.json()
        expect(stats.totalEnqueued).toBeDefined()
      })

      it('should handle /config GET', async () => {
        const request = new Request('http://internal/config', {
          method: 'GET',
        })

        const response = await cascadeQueue.fetch(request)

        expect(response.status).toBe(200)
        const config = await response.json()
        expect(config.batchSize).toBeDefined()
      })

      it('should handle /config PATCH', async () => {
        const request = new Request('http://internal/config', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batchSize: 50 }),
        })

        const response = await cascadeQueue.fetch(request)

        expect(response.status).toBe(200)
        const config = await response.json()
        expect(config.batchSize).toBe(50)
      })

      it('should handle /dead-letter GET', async () => {
        const request = new Request('http://internal/dead-letter', {
          method: 'GET',
        })

        const response = await cascadeQueue.fetch(request)

        expect(response.status).toBe(200)
        const result = await response.json()
        expect(result.operations).toBeDefined()
      })

      it('should return 404 for unknown routes', async () => {
        const request = new Request('http://internal/unknown', {
          method: 'GET',
        })

        const response = await cascadeQueue.fetch(request)

        expect(response.status).toBe(404)
      })
    })
  })

  describe('Sample Data Helpers', () => {
    it('should create sample operations', () => {
      const op = createSampleOperation()

      expect(op.id).toMatch(/^cop_/)
      expect(op.operator).toBe('~>')
      expect(op.status).toBe('pending')
    })

    it('should create sample operations with overrides', () => {
      const op = createSampleOperation({
        operator: '<~',
        action: 'delete',
      })

      expect(op.operator).toBe('<~')
      expect(op.action).toBe('delete')
    })

    it('should create multiple sample operations', () => {
      const ops = createSampleOperations(5)

      expect(ops).toHaveLength(5)
      expect(ops.map((op) => op.id)).toEqual([...new Set(ops.map((op) => op.id))])
    })

    it('should create sample stats', () => {
      const stats = createSampleStats()

      expect(stats.totalEnqueued).toBe(100)
      expect(stats.totalCompleted).toBe(80)
    })
  })
})

describe('Integration Tests', () => {
  let mockState: MockDOState
  let mockEnv: MockCascadeEnv
  let cascadeQueue: CascadeQueueDO

  beforeEach(() => {
    vi.clearAllMocks()
    mockState = createMockState()

    // Create mock target namespace that accepts cascade requests
    const targetNamespace = createMockNamespace(async (request) => {
      if (request.url.includes('/cascade')) {
        return new Response(JSON.stringify({ processed: true }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return new Response('Not Found', { status: 404 })
    })

    mockEnv = createMockEnv({
      targetNamespaces: {
        OrderDO: targetNamespace,
        UserDO: targetNamespace,
      },
    })

    cascadeQueue = new CascadeQueueDO(mockState as any, mockEnv as any)
  })

  it('should handle full enqueue-process cycle', async () => {
    // Enqueue an operation
    const op = await cascadeQueue.enqueue(
      '~>',
      'update',
      {
        doClass: 'UserDO',
        doId: 'user-123',
        entityType: 'User',
        entityId: 'user-123',
      },
      {
        doClass: 'OrderDO',
        doId: 'order-456',
        entityType: 'Order',
        relationship: 'user_orders',
      },
      { updated: true }
    )

    expect(op.status).toBe('pending')

    // Check stats after enqueue
    let stats = await cascadeQueue.getStats()
    expect(stats.totalEnqueued).toBe(1)
    expect(stats.pendingCount).toBe(1)

    // Trigger processing
    const results = await cascadeQueue.processBatch()

    // Check processing results
    expect(results).toHaveLength(1)
    expect(results[0].operationId).toBe(op.id)
    expect(results[0].success).toBe(true)

    // Check stats after processing
    stats = await cascadeQueue.getStats()
    expect(stats.totalCompleted).toBe(1)
    expect(stats.pendingCount).toBe(0)
  })

  it('should handle multiple operations with priorities', async () => {
    // Enqueue operations with different priorities
    await cascadeQueue.enqueue(
      '~>',
      'update',
      {
        doClass: 'UserDO',
        doId: 'user-1',
        entityType: 'User',
        entityId: 'user-1',
      },
      {
        doClass: 'OrderDO',
        doId: 'order-1',
        entityType: 'Order',
        relationship: 'user_orders',
      },
      {},
      { priority: 'low' }
    )

    await cascadeQueue.enqueue(
      '~>',
      'update',
      {
        doClass: 'UserDO',
        doId: 'user-2',
        entityType: 'User',
        entityId: 'user-2',
      },
      {
        doClass: 'OrderDO',
        doId: 'order-2',
        entityType: 'Order',
        relationship: 'user_orders',
      },
      {},
      { priority: 'critical' }
    )

    await cascadeQueue.enqueue(
      '<~',
      'notify',
      {
        doClass: 'OrderDO',
        doId: 'order-3',
        entityType: 'Order',
        entityId: 'order-3',
      },
      {
        doClass: 'UserDO',
        doId: 'user-3',
        entityType: 'User',
        relationship: 'order_user',
      },
      {},
      { priority: 'high' }
    )

    const stats = await cascadeQueue.getStats()
    expect(stats.totalEnqueued).toBe(3)
    expect(stats.pendingCount).toBe(3)
    expect(stats.byOperator['~>'].enqueued).toBe(2)
    expect(stats.byOperator['<~'].enqueued).toBe(1)
  })
})
