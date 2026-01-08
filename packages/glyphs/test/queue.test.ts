import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * RED Phase Tests: Queue Glyph (卌)
 *
 * These tests define the API contract for the queue glyph (卌) which provides
 * queue operations with push/pop, consumer registration, and backpressure support.
 *
 * Current state: The queue glyph does not exist yet, so these tests should FAIL.
 * This is expected for RED phase TDD.
 *
 * Visual metaphor: 卌 looks like items standing in a line - a queue.
 */

// Import will fail until queue glyph is implemented
// This is expected for RED phase TDD
import { 卌, q } from '../src/queue'

// Test interfaces
interface Task {
  id: string
  type: string
  payload: unknown
}

interface EmailTask {
  to: string
  subject: string
  body: string
}

describe('Queue Glyph (卌)', () => {
  describe('Queue Creation', () => {
    it('should create a typed queue with 卌<T>()', () => {
      const tasks = 卌<Task>()

      expect(tasks).toBeDefined()
      expect(typeof tasks.push).toBe('function')
      expect(typeof tasks.pop).toBe('function')
    })

    it('should create a queue with ASCII alias q<T>()', () => {
      const tasks = q<Task>()

      expect(tasks).toBeDefined()
      expect(typeof tasks.push).toBe('function')
      expect(typeof tasks.pop).toBe('function')
    })

    it('should create a queue with options', () => {
      const tasks = 卌<Task>({ maxSize: 100 })

      expect(tasks).toBeDefined()
      expect(tasks.maxSize).toBe(100)
    })

    it('should create a queue with timeout option', () => {
      const tasks = 卌<Task>({ timeout: 5000 })

      expect(tasks).toBeDefined()
      expect(tasks.timeout).toBe(5000)
    })

    it('should create a queue with concurrency option', () => {
      const tasks = 卌<Task>({ concurrency: 5 })

      expect(tasks).toBeDefined()
      expect(tasks.concurrency).toBe(5)
    })
  })

  describe('Basic Queue Operations', () => {
    let tasks: ReturnType<typeof 卌<Task>>

    beforeEach(() => {
      tasks = 卌<Task>()
    })

    describe('push()', () => {
      it('should push an item to the queue', async () => {
        const task: Task = { id: '1', type: 'email', payload: { to: 'alice@example.com' } }

        await tasks.push(task)

        expect(tasks.length).toBe(1)
      })

      it('should push multiple items in order', async () => {
        const task1: Task = { id: '1', type: 'email', payload: {} }
        const task2: Task = { id: '2', type: 'sms', payload: {} }
        const task3: Task = { id: '3', type: 'push', payload: {} }

        await tasks.push(task1)
        await tasks.push(task2)
        await tasks.push(task3)

        expect(tasks.length).toBe(3)
      })

      it('should return the queue for chaining', async () => {
        const task: Task = { id: '1', type: 'email', payload: {} }

        const result = await tasks.push(task)

        // push should be chainable or return void/the queue
        expect(result === undefined || result === tasks).toBe(true)
      })
    })

    describe('pop()', () => {
      it('should pop the first item from the queue (FIFO)', async () => {
        const task1: Task = { id: '1', type: 'first', payload: {} }
        const task2: Task = { id: '2', type: 'second', payload: {} }

        await tasks.push(task1)
        await tasks.push(task2)

        const popped = await tasks.pop()

        expect(popped).toEqual(task1)
        expect(tasks.length).toBe(1)
      })

      it('should return undefined when queue is empty', async () => {
        const result = await tasks.pop()

        expect(result).toBeUndefined()
      })

      it('should remove the item from the queue', async () => {
        const task: Task = { id: '1', type: 'email', payload: {} }

        await tasks.push(task)
        expect(tasks.length).toBe(1)

        await tasks.pop()
        expect(tasks.length).toBe(0)
      })
    })

    describe('peek()', () => {
      it('should return the first item without removing it', async () => {
        const task1: Task = { id: '1', type: 'first', payload: {} }
        const task2: Task = { id: '2', type: 'second', payload: {} }

        await tasks.push(task1)
        await tasks.push(task2)

        const peeked = tasks.peek()

        expect(peeked).toEqual(task1)
        expect(tasks.length).toBe(2) // Length unchanged
      })

      it('should return undefined when queue is empty', () => {
        const result = tasks.peek()

        expect(result).toBeUndefined()
      })
    })
  })

  describe('Batch Operations', () => {
    let tasks: ReturnType<typeof 卌<Task>>

    beforeEach(() => {
      tasks = 卌<Task>()
    })

    describe('pushMany()', () => {
      it('should push multiple items at once', async () => {
        const items: Task[] = [
          { id: '1', type: 'a', payload: {} },
          { id: '2', type: 'b', payload: {} },
          { id: '3', type: 'c', payload: {} },
        ]

        await tasks.pushMany(items)

        expect(tasks.length).toBe(3)
      })

      it('should maintain order when pushing many items', async () => {
        const items: Task[] = [
          { id: '1', type: 'first', payload: {} },
          { id: '2', type: 'second', payload: {} },
          { id: '3', type: 'third', payload: {} },
        ]

        await tasks.pushMany(items)

        const first = await tasks.pop()
        const second = await tasks.pop()
        const third = await tasks.pop()

        expect(first?.id).toBe('1')
        expect(second?.id).toBe('2')
        expect(third?.id).toBe('3')
      })

      it('should handle empty array', async () => {
        await tasks.pushMany([])

        expect(tasks.length).toBe(0)
      })
    })

    describe('popMany()', () => {
      it('should pop multiple items at once', async () => {
        const items: Task[] = [
          { id: '1', type: 'a', payload: {} },
          { id: '2', type: 'b', payload: {} },
          { id: '3', type: 'c', payload: {} },
          { id: '4', type: 'd', payload: {} },
        ]

        await tasks.pushMany(items)
        const popped = await tasks.popMany(2)

        expect(popped).toHaveLength(2)
        expect(popped[0].id).toBe('1')
        expect(popped[1].id).toBe('2')
        expect(tasks.length).toBe(2)
      })

      it('should return fewer items if queue has less than requested', async () => {
        await tasks.push({ id: '1', type: 'only', payload: {} })

        const popped = await tasks.popMany(5)

        expect(popped).toHaveLength(1)
        expect(tasks.length).toBe(0)
      })

      it('should return empty array when queue is empty', async () => {
        const popped = await tasks.popMany(3)

        expect(popped).toEqual([])
      })
    })
  })

  describe('Queue State Properties', () => {
    let tasks: ReturnType<typeof 卌<Task>>

    beforeEach(() => {
      tasks = 卌<Task>({ maxSize: 3 })
    })

    describe('length', () => {
      it('should return 0 for empty queue', () => {
        expect(tasks.length).toBe(0)
      })

      it('should return correct count after operations', async () => {
        await tasks.push({ id: '1', type: 'a', payload: {} })
        expect(tasks.length).toBe(1)

        await tasks.push({ id: '2', type: 'b', payload: {} })
        expect(tasks.length).toBe(2)

        await tasks.pop()
        expect(tasks.length).toBe(1)
      })
    })

    describe('isEmpty', () => {
      it('should return true for empty queue', () => {
        expect(tasks.isEmpty).toBe(true)
      })

      it('should return false when queue has items', async () => {
        await tasks.push({ id: '1', type: 'a', payload: {} })

        expect(tasks.isEmpty).toBe(false)
      })

      it('should return true after all items are popped', async () => {
        await tasks.push({ id: '1', type: 'a', payload: {} })
        await tasks.pop()

        expect(tasks.isEmpty).toBe(true)
      })
    })

    describe('isFull', () => {
      it('should return false when queue has capacity', async () => {
        await tasks.push({ id: '1', type: 'a', payload: {} })

        expect(tasks.isFull).toBe(false)
      })

      it('should return true when queue reaches maxSize', async () => {
        await tasks.push({ id: '1', type: 'a', payload: {} })
        await tasks.push({ id: '2', type: 'b', payload: {} })
        await tasks.push({ id: '3', type: 'c', payload: {} })

        expect(tasks.isFull).toBe(true)
      })

      it('should return false for unbounded queue', () => {
        const unbounded = 卌<Task>() // No maxSize

        expect(unbounded.isFull).toBe(false)
      })
    })
  })

  describe('Tagged Template Usage', () => {
    it('should push to queue via tagged template', async () => {
      const taskData = { id: '1', type: 'email', to: 'alice@example.com' }

      await 卌`task ${taskData}`

      // The global/default queue should have the task
      // Implementation may vary - this tests the tagged template syntax works
    })

    it('should push with ASCII alias via tagged template', async () => {
      const taskData = { id: '1', type: 'sms', to: '+1234567890' }

      await q`task ${taskData}`
    })

    it('should parse task type from template string', async () => {
      const emailData = { to: 'bob@example.com', subject: 'Hello' }

      // Format: 卌`type:action ${data}`
      await 卌`email:send ${emailData}`
    })
  })

  describe('Consumer Pattern - process()', () => {
    let tasks: ReturnType<typeof 卌<Task>>

    beforeEach(() => {
      vi.useFakeTimers()
      tasks = 卌<Task>()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should register a consumer with process()', async () => {
      const handler = vi.fn()

      const stop = tasks.process(handler)

      expect(typeof stop).toBe('function')
    })

    it('should call handler for each item in queue', async () => {
      const processed: Task[] = []
      const handler = vi.fn(async (task: Task) => {
        processed.push(task)
      })

      tasks.process(handler)

      await tasks.push({ id: '1', type: 'a', payload: {} })
      await tasks.push({ id: '2', type: 'b', payload: {} })

      // Allow async processing
      await vi.runAllTimersAsync()

      expect(processed).toHaveLength(2)
      expect(processed[0].id).toBe('1')
      expect(processed[1].id).toBe('2')
    })

    it('should stop processing when stop function is called', async () => {
      const handler = vi.fn()

      const stop = tasks.process(handler)

      await tasks.push({ id: '1', type: 'a', payload: {} })
      await vi.runAllTimersAsync()

      stop()

      await tasks.push({ id: '2', type: 'b', payload: {} })
      await vi.runAllTimersAsync()

      // Handler should only have been called once (before stop)
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('should process with specified concurrency', async () => {
      const processingOrder: string[] = []
      const handler = vi.fn(async (task: Task) => {
        processingOrder.push(`start:${task.id}`)
        await new Promise(resolve => setTimeout(resolve, 100))
        processingOrder.push(`end:${task.id}`)
      })

      tasks.process(handler, { concurrency: 2 })

      await tasks.push({ id: '1', type: 'a', payload: {} })
      await tasks.push({ id: '2', type: 'b', payload: {} })
      await tasks.push({ id: '3', type: 'c', payload: {} })

      // With concurrency 2, tasks 1 and 2 should start before 3
      await vi.advanceTimersByTimeAsync(50)

      expect(processingOrder).toContain('start:1')
      expect(processingOrder).toContain('start:2')
      expect(processingOrder).not.toContain('start:3')
    })

    it('should retry failed tasks with retries option', async () => {
      let attempts = 0
      const handler = vi.fn(async () => {
        attempts++
        if (attempts < 3) {
          throw new Error('Temporary failure')
        }
      })

      tasks.process(handler, { retries: 3 })

      await tasks.push({ id: '1', type: 'a', payload: {} })
      await vi.runAllTimersAsync()

      expect(attempts).toBe(3)
    })

    it('should wait retryDelay between retries', async () => {
      let attempts = 0
      const attemptTimes: number[] = []

      const handler = vi.fn(async () => {
        attempts++
        attemptTimes.push(Date.now())
        if (attempts < 3) {
          throw new Error('Temporary failure')
        }
      })

      tasks.process(handler, { retries: 3, retryDelay: 1000 })

      await tasks.push({ id: '1', type: 'a', payload: {} })

      // First attempt
      await vi.advanceTimersByTimeAsync(0)
      expect(attempts).toBe(1)

      // Wait for retry delay
      await vi.advanceTimersByTimeAsync(1000)
      expect(attempts).toBe(2)

      // Wait for another retry delay
      await vi.advanceTimersByTimeAsync(1000)
      expect(attempts).toBe(3)
    })

    it('should use global process method 卌.process()', async () => {
      const handler = vi.fn()

      const stop = 卌.process(handler)

      expect(typeof stop).toBe('function')
      stop()
    })
  })

  describe('Backpressure', () => {
    let tasks: ReturnType<typeof 卌<Task>>

    beforeEach(() => {
      vi.useFakeTimers()
      tasks = 卌<Task>({ maxSize: 2 })
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should block push when queue is full', async () => {
      await tasks.push({ id: '1', type: 'a', payload: {} })
      await tasks.push({ id: '2', type: 'b', payload: {} })

      expect(tasks.isFull).toBe(true)

      let pushResolved = false
      const pushPromise = tasks.push({ id: '3', type: 'c', payload: {} }).then(() => {
        pushResolved = true
      })

      // Push should not resolve immediately
      await vi.advanceTimersByTimeAsync(0)
      expect(pushResolved).toBe(false)

      // Pop an item to make space
      await tasks.pop()

      // Now push should resolve
      await pushPromise
      expect(pushResolved).toBe(true)
    })

    it('should allow non-blocking push with tryPush()', async () => {
      await tasks.push({ id: '1', type: 'a', payload: {} })
      await tasks.push({ id: '2', type: 'b', payload: {} })

      const result = tasks.tryPush({ id: '3', type: 'c', payload: {} })

      expect(result).toBe(false)
      expect(tasks.length).toBe(2)
    })

    it('should return true from tryPush() when space available', async () => {
      await tasks.push({ id: '1', type: 'a', payload: {} })

      const result = tasks.tryPush({ id: '2', type: 'b', payload: {} })

      expect(result).toBe(true)
      expect(tasks.length).toBe(2)
    })
  })

  describe('Clear and Drain', () => {
    let tasks: ReturnType<typeof 卌<Task>>

    beforeEach(() => {
      tasks = 卌<Task>()
    })

    it('should clear all items from queue', async () => {
      await tasks.push({ id: '1', type: 'a', payload: {} })
      await tasks.push({ id: '2', type: 'b', payload: {} })
      await tasks.push({ id: '3', type: 'c', payload: {} })

      tasks.clear()

      expect(tasks.length).toBe(0)
      expect(tasks.isEmpty).toBe(true)
    })

    it('should drain all items and return them', async () => {
      await tasks.push({ id: '1', type: 'a', payload: {} })
      await tasks.push({ id: '2', type: 'b', payload: {} })
      await tasks.push({ id: '3', type: 'c', payload: {} })

      const drained = tasks.drain()

      expect(drained).toHaveLength(3)
      expect(drained[0].id).toBe('1')
      expect(tasks.length).toBe(0)
    })
  })

  describe('Async Iteration', () => {
    let tasks: ReturnType<typeof 卌<Task>>

    beforeEach(() => {
      vi.useFakeTimers()
      tasks = 卌<Task>()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should support async iteration over queue items', async () => {
      await tasks.push({ id: '1', type: 'a', payload: {} })
      await tasks.push({ id: '2', type: 'b', payload: {} })
      await tasks.push({ id: '3', type: 'c', payload: {} })

      const items: Task[] = []
      for await (const item of tasks) {
        items.push(item)
        if (items.length === 3) break // Prevent infinite loop in test
      }

      expect(items).toHaveLength(3)
    })

    it('should wait for new items when queue is empty', async () => {
      const items: Task[] = []

      // Start async iteration
      const iterationPromise = (async () => {
        for await (const item of tasks) {
          items.push(item)
          if (items.length === 2) break
        }
      })()

      // Queue starts empty
      expect(items).toHaveLength(0)

      // Push first item
      await tasks.push({ id: '1', type: 'a', payload: {} })
      await vi.advanceTimersByTimeAsync(0)
      expect(items).toHaveLength(1)

      // Push second item
      await tasks.push({ id: '2', type: 'b', payload: {} })
      await vi.advanceTimersByTimeAsync(0)

      await iterationPromise
      expect(items).toHaveLength(2)
    })
  })

  describe('Type Safety', () => {
    it('should enforce type constraints on push', async () => {
      const emailQueue = 卌<EmailTask>()

      // This should compile - correct type
      await emailQueue.push({
        to: 'alice@example.com',
        subject: 'Hello',
        body: 'World',
      })

      // TypeScript should catch: wrong type (not enforced at runtime in tests)
      // await emailQueue.push({ id: '1', type: 'wrong' }) // TS error expected
    })

    it('should infer correct type from pop()', async () => {
      const emailQueue = 卌<EmailTask>()
      await emailQueue.push({
        to: 'alice@example.com',
        subject: 'Hello',
        body: 'World',
      })

      const email = await emailQueue.pop()

      // TypeScript should infer email as EmailTask | undefined
      if (email) {
        expect(email.to).toBe('alice@example.com')
        expect(email.subject).toBe('Hello')
        expect(email.body).toBe('World')
      }
    })
  })

  describe('Queue Events', () => {
    let tasks: ReturnType<typeof 卌<Task>>

    beforeEach(() => {
      tasks = 卌<Task>()
    })

    it('should emit event when item is pushed', async () => {
      const onPush = vi.fn()
      tasks.on('push', onPush)

      await tasks.push({ id: '1', type: 'a', payload: {} })

      expect(onPush).toHaveBeenCalledWith(
        expect.objectContaining({ id: '1' })
      )
    })

    it('should emit event when item is popped', async () => {
      const onPop = vi.fn()
      tasks.on('pop', onPop)

      await tasks.push({ id: '1', type: 'a', payload: {} })
      await tasks.pop()

      expect(onPop).toHaveBeenCalledWith(
        expect.objectContaining({ id: '1' })
      )
    })

    it('should emit event when queue becomes empty', async () => {
      const onEmpty = vi.fn()
      tasks.on('empty', onEmpty)

      await tasks.push({ id: '1', type: 'a', payload: {} })
      await tasks.pop()

      expect(onEmpty).toHaveBeenCalled()
    })

    it('should emit event when queue becomes full', async () => {
      const bounded = 卌<Task>({ maxSize: 2 })
      const onFull = vi.fn()
      bounded.on('full', onFull)

      await bounded.push({ id: '1', type: 'a', payload: {} })
      await bounded.push({ id: '2', type: 'b', payload: {} })

      expect(onFull).toHaveBeenCalled()
    })

    it('should remove event listener with off()', async () => {
      const onPush = vi.fn()
      tasks.on('push', onPush)
      tasks.off('push', onPush)

      await tasks.push({ id: '1', type: 'a', payload: {} })

      expect(onPush).not.toHaveBeenCalled()
    })
  })

  describe('Dispose and Cleanup', () => {
    it('should have a dispose method', () => {
      const tasks = 卌<Task>()

      expect(typeof tasks.dispose).toBe('function')
    })

    it('should clean up resources on dispose', async () => {
      const tasks = 卌<Task>()
      const handler = vi.fn()

      tasks.process(handler)
      await tasks.push({ id: '1', type: 'a', payload: {} })

      tasks.dispose()

      // After dispose, the queue should be cleared and processing stopped
      expect(tasks.length).toBe(0)
    })

    it('should reject new operations after dispose', async () => {
      const tasks = 卌<Task>()
      tasks.dispose()

      await expect(tasks.push({ id: '1', type: 'a', payload: {} }))
        .rejects.toThrow()
    })
  })

  describe('Named Queues', () => {
    it('should create named queues', () => {
      const emailQueue = 卌<EmailTask>('email')
      const taskQueue = 卌<Task>('tasks')

      expect(emailQueue.name).toBe('email')
      expect(taskQueue.name).toBe('tasks')
    })

    it('should return same queue instance for same name', () => {
      const queue1 = 卌<Task>('shared')
      const queue2 = 卌<Task>('shared')

      expect(queue1).toBe(queue2)
    })

    it('should return different queue instances for different names', () => {
      const queue1 = 卌<Task>('queue-a')
      const queue2 = 卌<Task>('queue-b')

      expect(queue1).not.toBe(queue2)
    })
  })
})
