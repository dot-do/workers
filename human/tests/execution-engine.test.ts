/**
 * Tests for HumanFunctionExecution Durable Object
 *
 * Tests cover:
 * - Execution lifecycle (create ’ respond ’ complete)
 * - Timeout handling
 * - Retry logic with backoff
 * - Escalation
 * - Cancellation
 * - Audit trail
 * - State persistence
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { z } from 'zod'
import { HumanFunctionExecution } from '../src/execution-engine'
import type { HumanFunction } from '../src/types'

// ============================================================================
// Mock Setup
// ============================================================================

// Mock Durable Object Storage
class MockStorage {
  private data = new Map<string, any>()
  private alarmTime: number | null = null

  async get<T>(key: string): Promise<T | undefined> {
    return this.data.get(key)
  }

  async put(key: string, value: any): Promise<void> {
    this.data.set(key, value)
  }

  async delete(key: string): Promise<boolean> {
    return this.data.delete(key)
  }

  async setAlarm(time: number): Promise<void> {
    this.alarmTime = time
  }

  async deleteAlarm(): Promise<void> {
    this.alarmTime = null
  }

  getAlarmTime(): number | null {
    return this.alarmTime
  }

  clear(): void {
    this.data.clear()
    this.alarmTime = null
  }
}

// Mock Durable Object State
class MockDurableObjectState {
  storage: MockStorage

  constructor() {
    this.storage = new MockStorage()
  }
}

// Mock environment
const mockEnv = {
  DB: {},
  EMAIL: {},
  QUEUE: {},
}

// ============================================================================
// Test Fixtures
// ============================================================================

const createTestFunction = (overrides?: Partial<HumanFunction>): HumanFunction => ({
  name: 'test-function',
  description: 'Test function for unit tests',
  schema: {
    input: z.object({
      message: z.string(),
    }),
    output: z.object({
      response: z.string(),
    }),
  },
  routing: {
    channels: ['web'],
    assignees: ['user1', 'user2'],
    timeout: 5000, // 5 seconds for tests
    priority: 1,
  },
  ui: {
    prompt: (() => null) as any,
  },
  ...overrides,
})

// ============================================================================
// Tests
// ============================================================================

describe('HumanFunctionExecution', () => {
  let execution: HumanFunctionExecution
  let mockState: MockDurableObjectState

  beforeEach(() => {
    mockState = new MockDurableObjectState()
    execution = new HumanFunctionExecution(mockState as any, mockEnv)
  })

  describe('execute', () => {
    it('should create a new execution', async () => {
      const functionDef = createTestFunction()
      const input = { message: 'Hello' }

      const executionId = await execution.execute(functionDef, input, {
        channel: 'web',
        assignee: 'user1',
      })

      expect(executionId).toBeDefined()
      expect(executionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)

      // Verify state was persisted
      const status = await execution.getStatus()
      expect(status.executionId).toBe(executionId)
      expect(status.functionName).toBe('test-function')
      expect(status.status).toBe('pending')
      expect(status.input).toEqual(input)
      expect(status.assignee).toBe('user1')
    })

    it('should schedule timeout alarm', async () => {
      const functionDef = createTestFunction()
      const input = { message: 'Hello' }

      await execution.execute(functionDef, input, {})

      const alarmTime = mockState.storage.getAlarmTime()
      expect(alarmTime).not.toBeNull()
      expect(alarmTime).toBeGreaterThan(Date.now())
    })

    it('should validate input against schema', async () => {
      const functionDef = createTestFunction()
      const invalidInput = { invalid: 'field' }

      await expect(execution.execute(functionDef, invalidInput, {})).rejects.toThrow('Invalid input')
    })

    it('should add creation event to audit trail', async () => {
      const functionDef = createTestFunction()
      const input = { message: 'Hello' }

      await execution.execute(functionDef, input, {})

      const history = await execution.getHistory()
      expect(history).toHaveLength(1)
      expect(history[0].type).toBe('created')
      expect(history[0].actor).toBe('system')
    })

    it('should add assignment event when assignee provided', async () => {
      const functionDef = createTestFunction()
      const input = { message: 'Hello' }

      await execution.execute(functionDef, input, { assignee: 'user1' })

      const history = await execution.getHistory()
      expect(history).toHaveLength(2)
      expect(history[1].type).toBe('assigned')
      expect(history[1].data?.assignedTo).toBe('user1')
    })
  })

  describe('respond', () => {
    it('should record response and complete execution', async () => {
      const functionDef = createTestFunction()
      const input = { message: 'Hello' }
      const output = { response: 'Hi there!' }

      await execution.execute(functionDef, input, {})

      const success = await execution.respond(output, 'user1')
      expect(success).toBe(true)

      const status = await execution.getStatus()
      expect(status.status).toBe('completed')
      expect(status.output).toEqual(output)
    })

    it('should validate output against schema', async () => {
      const functionDef = createTestFunction()
      const input = { message: 'Hello' }
      const invalidOutput = { invalid: 'field' }

      await execution.execute(functionDef, input, {})

      await expect(execution.respond(invalidOutput, 'user1')).rejects.toThrow('Invalid output')
    })

    it('should add responded and completed events to audit trail', async () => {
      const functionDef = createTestFunction()
      const input = { message: 'Hello' }
      const output = { response: 'Hi there!' }

      await execution.execute(functionDef, input, {})
      await execution.respond(output, 'user1')

      const history = await execution.getHistory()
      expect(history.some((e) => e.type === 'responded')).toBe(true)
      expect(history.some((e) => e.type === 'completed')).toBe(true)
    })

    it('should cancel timeout alarm', async () => {
      const functionDef = createTestFunction()
      const input = { message: 'Hello' }
      const output = { response: 'Hi there!' }

      await execution.execute(functionDef, input, {})
      expect(mockState.storage.getAlarmTime()).not.toBeNull()

      await execution.respond(output, 'user1')
      expect(mockState.storage.getAlarmTime()).toBeNull()
    })

    it('should return false if already completed', async () => {
      const functionDef = createTestFunction()
      const input = { message: 'Hello' }
      const output = { response: 'Hi there!' }

      await execution.execute(functionDef, input, {})
      await execution.respond(output, 'user1')

      const secondResponse = await execution.respond({ response: 'Again' }, 'user2')
      expect(secondResponse).toBe(false)
    })

    it('should call onComplete hook if defined', async () => {
      const onComplete = vi.fn()
      const functionDef = createTestFunction({ onComplete })
      const input = { message: 'Hello' }
      const output = { response: 'Hi there!' }

      await execution.execute(functionDef, input, {})
      await execution.respond(output, 'user1')

      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          executionId: expect.any(String),
          output,
        })
      )
    })
  })

  describe('timeout', () => {
    it('should handle timeout and set status to timeout', async () => {
      const functionDef = createTestFunction()
      const input = { message: 'Hello' }

      await execution.execute(functionDef, input, {})
      await execution.timeout()

      const status = await execution.getStatus()
      expect(status.status).toBe('timeout')
    })

    it('should call onTimeout hook if defined', async () => {
      const onTimeout = vi.fn().mockResolvedValue({ response: 'Timed out' })
      const functionDef = createTestFunction({ onTimeout })
      const input = { message: 'Hello' }

      await execution.execute(functionDef, input, {})
      await execution.timeout()

      expect(onTimeout).toHaveBeenCalled()

      const status = await execution.getStatus()
      expect(status.output).toEqual({ response: 'Timed out' })
      expect(status.status).toBe('completed')
    })

    it('should add timeout event to audit trail', async () => {
      const functionDef = createTestFunction()
      const input = { message: 'Hello' }

      await execution.execute(functionDef, input, {})
      await execution.timeout()

      const history = await execution.getHistory()
      expect(history.some((e) => e.type === 'timeout')).toBe(true)
    })

    it('should not timeout if already completed', async () => {
      const functionDef = createTestFunction()
      const input = { message: 'Hello' }
      const output = { response: 'Hi there!' }

      await execution.execute(functionDef, input, {})
      await execution.respond(output, 'user1')

      const statusBefore = await execution.getStatus()
      await execution.timeout()
      const statusAfter = await execution.getStatus()

      expect(statusBefore.status).toBe('completed')
      expect(statusAfter.status).toBe('completed')
    })
  })

  describe('escalate', () => {
    it('should escalate to backup assignee', async () => {
      const functionDef = createTestFunction()
      const input = { message: 'Hello' }

      await execution.execute(functionDef, input, { assignee: 'user1' })

      const success = await execution.escalate('No response', 'user2')
      expect(success).toBe(true)

      const status = await execution.getStatus()
      expect(status.assignee).toBe('user2')
    })

    it('should add escalated event to audit trail', async () => {
      const functionDef = createTestFunction()
      const input = { message: 'Hello' }

      await execution.execute(functionDef, input, { assignee: 'user1' })
      await execution.escalate('No response', 'user2')

      const history = await execution.getHistory()
      expect(history.some((e) => e.type === 'escalated')).toBe(true)
    })

    it('should call onEscalate hook if defined', async () => {
      const onEscalate = vi.fn()
      const functionDef = createTestFunction({ onEscalate })
      const input = { message: 'Hello' }

      await execution.execute(functionDef, input, { assignee: 'user1' })
      await execution.escalate('No response', 'user2')

      expect(onEscalate).toHaveBeenCalledWith(expect.any(Object), 'No response')
    })

    it('should return false if already completed', async () => {
      const functionDef = createTestFunction()
      const input = { message: 'Hello' }
      const output = { response: 'Hi there!' }

      await execution.execute(functionDef, input, { assignee: 'user1' })
      await execution.respond(output, 'user1')

      const success = await execution.escalate('Too late', 'user2')
      expect(success).toBe(false)
    })

    it('should throw error if no backup assignee available', async () => {
      const functionDef = createTestFunction({
        routing: {
          channels: ['web'],
          assignees: ['user1'], // Only one assignee
        },
      })
      const input = { message: 'Hello' }

      await execution.execute(functionDef, input, { assignee: 'user1' })

      await expect(execution.escalate('No backup')).rejects.toThrow('No backup assignee available')
    })
  })

  describe('retry', () => {
    it('should retry failed execution', async () => {
      const functionDef = createTestFunction()
      const input = { message: 'Hello' }

      await execution.execute(functionDef, input, {})

      const success = await execution.retry()
      expect(success).toBe(true)

      const status = await execution.getStatus()
      expect(status.status).toBe('pending')
    })

    it('should increment attempts counter', async () => {
      const functionDef = createTestFunction()
      const input = { message: 'Hello' }

      await execution.execute(functionDef, input, {})

      const historyBefore = await execution.getHistory()
      await execution.retry()
      const historyAfter = await execution.getHistory()

      const retryEvent = historyAfter.find((e) => e.type === 'retry')
      expect(retryEvent).toBeDefined()
      expect(retryEvent?.data?.attempts).toBe(1)
    })

    it('should calculate exponential backoff delay', async () => {
      const functionDef = createTestFunction()
      const input = { message: 'Hello' }

      await execution.execute(functionDef, input, {})

      // First retry
      await execution.retry()
      const history1 = await execution.getHistory()
      const retry1 = history1.find((e) => e.type === 'retry')
      const delay1 = retry1?.data?.delay as number

      // Second retry
      await execution.retry()
      const history2 = await execution.getHistory()
      const retry2 = history2.reverse().find((e) => e.type === 'retry')
      const delay2 = retry2?.data?.delay as number

      // Exponential backoff: delay2 should be ~2x delay1
      expect(delay2).toBeGreaterThan(delay1)
      expect(delay2 / delay1).toBeCloseTo(2, 0)
    })

    it('should return false if max retries exceeded', async () => {
      const functionDef = createTestFunction()
      const input = { message: 'Hello' }

      await execution.execute(functionDef, input, {})

      // Exhaust retries
      await execution.retry() // 1
      await execution.retry() // 2
      await execution.retry() // 3

      const success = await execution.retry() // 4 - should fail
      expect(success).toBe(false)
    })

    it('should schedule retry alarm', async () => {
      const functionDef = createTestFunction()
      const input = { message: 'Hello' }

      await execution.execute(functionDef, input, {})

      mockState.storage.clear() // Clear initial alarm
      await execution.retry()

      const alarmTime = mockState.storage.getAlarmTime()
      expect(alarmTime).not.toBeNull()
      expect(alarmTime).toBeGreaterThan(Date.now())
    })
  })

  describe('cancel', () => {
    it('should cancel pending execution', async () => {
      const functionDef = createTestFunction()
      const input = { message: 'Hello' }

      await execution.execute(functionDef, input, {})

      const success = await execution.cancel('User cancelled')
      expect(success).toBe(true)

      const status = await execution.getStatus()
      expect(status.status).toBe('cancelled')
    })

    it('should add cancelled event to audit trail', async () => {
      const functionDef = createTestFunction()
      const input = { message: 'Hello' }

      await execution.execute(functionDef, input, {})
      await execution.cancel('User cancelled')

      const history = await execution.getHistory()
      expect(history.some((e) => e.type === 'cancelled')).toBe(true)
    })

    it('should call onCancel hook if defined', async () => {
      const onCancel = vi.fn()
      const functionDef = createTestFunction({ onCancel })
      const input = { message: 'Hello' }

      await execution.execute(functionDef, input, {})
      await execution.cancel('User cancelled')

      expect(onCancel).toHaveBeenCalled()
    })

    it('should return false if already completed', async () => {
      const functionDef = createTestFunction()
      const input = { message: 'Hello' }
      const output = { response: 'Hi there!' }

      await execution.execute(functionDef, input, {})
      await execution.respond(output, 'user1')

      const success = await execution.cancel('Too late')
      expect(success).toBe(false)
    })

    it('should cancel timeout alarm', async () => {
      const functionDef = createTestFunction()
      const input = { message: 'Hello' }

      await execution.execute(functionDef, input, {})
      expect(mockState.storage.getAlarmTime()).not.toBeNull()

      await execution.cancel('User cancelled')
      expect(mockState.storage.getAlarmTime()).toBeNull()
    })
  })

  describe('getStatus', () => {
    it('should return current execution status', async () => {
      const functionDef = createTestFunction()
      const input = { message: 'Hello' }

      const executionId = await execution.execute(functionDef, input, { assignee: 'user1' })

      const status = await execution.getStatus()

      expect(status).toMatchObject({
        executionId,
        functionName: 'test-function',
        status: 'pending',
        input,
        assignee: 'user1',
      })
    })
  })

  describe('getHistory', () => {
    it('should return complete audit trail', async () => {
      const functionDef = createTestFunction()
      const input = { message: 'Hello' }
      const output = { response: 'Hi there!' }

      await execution.execute(functionDef, input, { assignee: 'user1' })
      await execution.respond(output, 'user1')

      const history = await execution.getHistory()

      expect(history.length).toBeGreaterThan(0)
      expect(history.every((e) => e.timestamp)).toBe(true)
      expect(history.every((e) => e.type)).toBe(true)
    })
  })

  describe('state persistence', () => {
    it('should persist state across method calls', async () => {
      const functionDef = createTestFunction()
      const input = { message: 'Hello' }

      const executionId = await execution.execute(functionDef, input, {})

      // Create new instance with same storage
      const execution2 = new HumanFunctionExecution(mockState as any, mockEnv)

      const status = await execution2.getStatus()
      expect(status.executionId).toBe(executionId)
    })
  })

  describe('alarm', () => {
    it('should call timeout when alarm triggers after timeout', async () => {
      const functionDef = createTestFunction({ routing: { channels: ['web'], timeout: 100 } })
      const input = { message: 'Hello' }

      await execution.execute(functionDef, input, {})

      // Simulate alarm trigger
      await execution.alarm()

      const status = await execution.getStatus()
      expect(status.status).toBe('timeout')
    })
  })
})
