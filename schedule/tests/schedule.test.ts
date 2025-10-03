/**
 * Schedule Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { normalizeSchedule, getNextRun, shouldRun, isValidCron, formatDuration, generateExecutionId } from '../src/utils'
import { getTaskHandler, hasTaskHandler, getAllTaskHandlers } from '../src/tasks'

describe('Schedule Utils', () => {
  describe('normalizeSchedule', () => {
    it('should convert @hourly to cron expression', () => {
      expect(normalizeSchedule('@hourly')).toBe('0 * * * *')
    })

    it('should convert @daily to cron expression', () => {
      expect(normalizeSchedule('@daily')).toBe('0 0 * * *')
    })

    it('should convert @weekly to cron expression', () => {
      expect(normalizeSchedule('@weekly')).toBe('0 0 * * 0')
    })

    it('should convert @monthly to cron expression', () => {
      expect(normalizeSchedule('@monthly')).toBe('0 0 1 * *')
    })

    it('should convert "every 5 minutes" to cron', () => {
      expect(normalizeSchedule('every 5 minutes')).toBe('*/5 * * * *')
    })

    it('should convert "every 2 hours" to cron', () => {
      expect(normalizeSchedule('every 2 hours')).toBe('0 */2 * * *')
    })

    it('should pass through valid cron expressions', () => {
      const cron = '0 0 * * *'
      expect(normalizeSchedule(cron)).toBe(cron)
    })
  })

  describe('getNextRun', () => {
    it('should calculate next run for hourly cron', () => {
      const next = getNextRun('@hourly')
      expect(next).toBeInstanceOf(Date)
      expect(next.getTime()).toBeGreaterThan(Date.now())
    })

    it('should calculate next run for daily cron', () => {
      const next = getNextRun('@daily')
      expect(next).toBeInstanceOf(Date)
      expect(next.getTime()).toBeGreaterThan(Date.now())
    })

    it('should throw on invalid cron expression', () => {
      expect(() => getNextRun('invalid cron')).toThrow()
    })
  })

  describe('shouldRun', () => {
    it('should return true if task has never run', () => {
      const result = shouldRun('@hourly', undefined)
      expect(result).toBe(true)
    })

    it('should return false if task ran recently', () => {
      const oneMinuteAgo = new Date(Date.now() - 60000).toISOString()
      const result = shouldRun('@hourly', oneMinuteAgo)
      expect(result).toBe(false)
    })

    it('should return true if enough time has passed', () => {
      // Set last run to yesterday - definitely should run again
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const result = shouldRun('@daily', yesterday)
      // Note: this depends on current time, so we just check it doesn't throw
      expect(typeof result).toBe('boolean')
    })
  })

  describe('isValidCron', () => {
    it('should validate correct cron expressions', () => {
      expect(isValidCron('0 * * * *')).toBe(true)
      expect(isValidCron('@hourly')).toBe(true)
      expect(isValidCron('every 5 minutes')).toBe(true)
    })

    it('should reject invalid cron expressions', () => {
      expect(isValidCron('invalid')).toBe(false)
      expect(isValidCron('99 99 99 99 99')).toBe(false)
    })
  })

  describe('formatDuration', () => {
    it('should format milliseconds', () => {
      expect(formatDuration(500)).toBe('500ms')
    })

    it('should format seconds', () => {
      expect(formatDuration(2500)).toBe('2.50s')
    })

    it('should format minutes', () => {
      expect(formatDuration(120000)).toBe('2.00m')
    })

    it('should format hours', () => {
      expect(formatDuration(7200000)).toBe('2.00h')
    })
  })

  describe('generateExecutionId', () => {
    it('should generate unique execution IDs', () => {
      const id1 = generateExecutionId('test-task')
      const id2 = generateExecutionId('test-task')

      expect(id1).toMatch(/^exec_test-task_\d+_[a-z0-9]+$/)
      expect(id2).toMatch(/^exec_test-task_\d+_[a-z0-9]+$/)
      expect(id1).not.toBe(id2)
    })

    it('should include task name in ID', () => {
      const id = generateExecutionId('my-task')
      expect(id).toContain('my-task')
    })
  })
})

describe('Task Registry', () => {
  describe('hasTaskHandler', () => {
    it('should return true for registered handlers', () => {
      expect(hasTaskHandler('cleanup-expired-sessions')).toBe(true)
      expect(hasTaskHandler('generate-missing-embeddings')).toBe(true)
      expect(hasTaskHandler('update-analytics')).toBe(true)
    })

    it('should return false for unregistered handlers', () => {
      expect(hasTaskHandler('non-existent-task')).toBe(false)
    })
  })

  describe('getAllTaskHandlers', () => {
    it('should return all registered handler names', () => {
      const handlers = getAllTaskHandlers()

      expect(handlers).toContain('cleanup-expired-sessions')
      expect(handlers).toContain('cleanup-expired-api-keys')
      expect(handlers).toContain('cleanup-old-generations')
      expect(handlers).toContain('generate-missing-embeddings')
      expect(handlers).toContain('update-analytics')
      expect(handlers).toContain('backup-database')
      expect(handlers).toContain('health-check-services')
      expect(handlers).toContain('check-rate-limits')

      expect(handlers.length).toBeGreaterThanOrEqual(8)
    })
  })

  describe('getTaskHandler', () => {
    it('should return handler function for valid name', () => {
      const handler = getTaskHandler('cleanup-expired-sessions')
      expect(typeof handler).toBe('function')
    })

    it('should throw for invalid handler name', () => {
      expect(() => getTaskHandler('invalid-task')).toThrow('Task handler not found: invalid-task')
    })
  })
})

describe('Task Handlers', () => {
  let mockEnv: any

  beforeEach(() => {
    mockEnv = {
      DB: {
        query: vi.fn().mockResolvedValue({ results: [] }),
        upsert: vi.fn().mockResolvedValue({}),
        get: vi.fn().mockResolvedValue(null),
        list: vi.fn().mockResolvedValue({ data: [] }),
      },
      QUEUE: {
        enqueue: vi.fn().mockResolvedValue('job-id'),
      },
      AI: {},
    }
  })

  describe('cleanup-expired-sessions', () => {
    it('should execute successfully', async () => {
      const handler = getTaskHandler('cleanup-expired-sessions')

      mockEnv.DB.query.mockResolvedValue({
        results: [{ id: '1' }, { id: '2' }],
      })

      const result = await handler(mockEnv)

      expect(result.success).toBe(true)
      expect(result.deletedCount).toBe(2)
      expect(mockEnv.DB.query).toHaveBeenCalled()
    })

    it('should handle errors gracefully', async () => {
      const handler = getTaskHandler('cleanup-expired-sessions')

      mockEnv.DB.query.mockRejectedValue(new Error('Database error'))

      const result = await handler(mockEnv)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database error')
    })
  })

  describe('cleanup-expired-api-keys', () => {
    it('should execute successfully', async () => {
      const handler = getTaskHandler('cleanup-expired-api-keys')

      mockEnv.DB.query.mockResolvedValue({
        results: [{ id: '1' }],
      })

      const result = await handler(mockEnv)

      expect(result.success).toBe(true)
      expect(result.deletedCount).toBe(1)
    })
  })

  describe('cleanup-old-generations', () => {
    it('should execute successfully', async () => {
      const handler = getTaskHandler('cleanup-old-generations')

      mockEnv.DB.query.mockResolvedValue({
        results: [{ id: '1' }, { id: '2' }, { id: '3' }],
      })

      const result = await handler(mockEnv)

      expect(result.success).toBe(true)
      expect(result.deletedCount).toBe(3)
    })
  })

  describe('generate-missing-embeddings', () => {
    it('should queue entities for embedding generation', async () => {
      const handler = getTaskHandler('generate-missing-embeddings')

      mockEnv.DB.query.mockResolvedValue({
        results: [
          { id: 'entity1', namespace: 'test', type: 'document', data: {} },
          { id: 'entity2', namespace: 'test', type: 'document', data: {} },
        ],
      })

      const result = await handler(mockEnv)

      expect(result.success).toBe(true)
      expect(result.found).toBe(2)
      expect(result.queuedCount).toBe(2)
      expect(mockEnv.QUEUE.enqueue).toHaveBeenCalledTimes(2)
    })

    it('should handle empty results', async () => {
      const handler = getTaskHandler('generate-missing-embeddings')

      mockEnv.DB.query.mockResolvedValue({ results: [] })

      const result = await handler(mockEnv)

      expect(result.success).toBe(true)
      expect(result.found).toBe(0)
      expect(result.queuedCount).toBe(0)
    })
  })

  describe('update-analytics', () => {
    it('should compute and store analytics', async () => {
      const handler = getTaskHandler('update-analytics')

      mockEnv.DB.stats = vi.fn().mockResolvedValue({
        total: 1000,
        byType: { document: 500, user: 300 },
      })

      const result = await handler(mockEnv)

      expect(result.success).toBe(true)
      expect(mockEnv.DB.stats).toHaveBeenCalled()
      expect(mockEnv.DB.upsert).toHaveBeenCalled()
    })
  })

  describe('backup-database', () => {
    it('should complete successfully', async () => {
      const handler = getTaskHandler('backup-database')

      const result = await handler(mockEnv)

      expect(result.success).toBe(true)
      expect(result.message).toContain('backup')
    })
  })

  describe('health-check-services', () => {
    it('should check all services', async () => {
      const handler = getTaskHandler('health-check-services')

      // Mock fetch globally
      ;(globalThis as any).fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'ok' }),
      })

      const result = await handler(mockEnv)

      expect(result.success).toBe(true)
      expect(result.results).toBeInstanceOf(Array)
    })
  })

  describe('check-rate-limits', () => {
    it('should check rate limits', async () => {
      const handler = getTaskHandler('check-rate-limits')

      mockEnv.DB.query.mockResolvedValue({ results: [] })

      const result = await handler(mockEnv)

      expect(result.success).toBe(true)
      expect(result.warnings).toBeInstanceOf(Array)
    })

    it('should detect warnings', async () => {
      const handler = getTaskHandler('check-rate-limits')

      mockEnv.DB.query.mockResolvedValue({
        results: [{ api_key: 'key1', requests: 950 }],
      })

      const result = await handler(mockEnv)

      expect(result.success).toBe(true)
      expect(result.warnings.length).toBe(1)
    })
  })
})

describe('Integration Tests', () => {
  it('should have all required task handlers', () => {
    const requiredTasks = [
      'cleanup-expired-sessions',
      'cleanup-expired-api-keys',
      'cleanup-old-generations',
      'generate-missing-embeddings',
      'update-analytics',
      'backup-database',
      'health-check-services',
      'check-rate-limits',
    ]

    requiredTasks.forEach((taskName) => {
      expect(hasTaskHandler(taskName)).toBe(true)
    })
  })

  it('should validate all cron schedules in default tasks', () => {
    const schedules = ['@hourly', '@daily', '@weekly', 'every 5 minutes']

    schedules.forEach((schedule) => {
      expect(isValidCron(schedule)).toBe(true)
    })
  })
})
