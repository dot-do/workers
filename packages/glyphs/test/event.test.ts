/**
 * Tests for 巛 (event/on) glyph - Event Emission
 *
 * This is a RED phase TDD test file. These tests define the API contract
 * for the event emission glyph before implementation exists.
 *
 * The 巛 glyph represents flowing water/river - a visual metaphor for
 * events flowing through the system.
 *
 * Covers:
 * - Tagged template emission: 巛`event.name ${data}`
 * - Subscription: 巛.on('event.name', handler)
 * - Pattern matching: 巛.on('user.*', handler)
 * - One-time listeners: 巛.once('event', handler)
 * - Unsubscription: 巛.off() and returned unsubscribe functions
 * - Programmatic emission: 巛.emit('event', data)
 * - ASCII alias: on
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
// These imports will fail until implementation exists - this is expected for RED phase
import { 巛, on } from '../src/event.js'

describe('巛 (event/on) glyph - Event Emission', () => {
  beforeEach(() => {
    // Reset event handlers between tests
    巛.removeAllListeners?.()
  })

  describe('Tagged Template Emission', () => {
    it('should emit event via tagged template with single value', async () => {
      const handler = vi.fn()
      巛.on('user.created', handler)

      const userData = { id: '123', email: 'alice@example.com' }
      await 巛`user.created ${userData}`

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'user.created',
          data: userData,
        })
      )
    })

    it('should emit event with timestamp and id in EventData', async () => {
      const handler = vi.fn()
      巛.on('test.event', handler)

      await 巛`test.event ${{ value: 42 }}`

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'test.event',
          data: { value: 42 },
          timestamp: expect.any(Number),
          id: expect.any(String),
        })
      )
    })

    it('should emit event with multiple values as array', async () => {
      const handler = vi.fn()
      巛.on('order.placed', handler)

      const orderId = 'order-123'
      const orderData = { items: ['item1', 'item2'], total: 100 }
      await 巛`order.placed ${orderId} ${orderData}`

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'order.placed',
          data: { values: [orderId, orderData] },
        })
      )
    })

    it('should emit event with no data when no interpolations', async () => {
      const handler = vi.fn()
      巛.on('app.ready', handler)

      await 巛`app.ready`

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'app.ready',
          data: undefined,
        })
      )
    })

    it('should handle dotted event names with multiple segments', async () => {
      const handler = vi.fn()
      巛.on('user.profile.updated', handler)

      await 巛`user.profile.updated ${{ field: 'avatar' }}`

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'user.profile.updated',
        })
      )
    })

    it('should return a promise that resolves after all handlers complete', async () => {
      const results: string[] = []
      巛.on('async.event', async () => {
        await new Promise(r => setTimeout(r, 10))
        results.push('handler1')
      })
      巛.on('async.event', async () => {
        results.push('handler2')
      })

      await 巛`async.event ${{ test: true }}`

      expect(results).toEqual(['handler1', 'handler2'])
    })
  })

  describe('Subscription with .on()', () => {
    it('should subscribe to exact event names', async () => {
      const handler = vi.fn()
      巛.on('user.created', handler)

      await 巛.emit('user.created', { id: '1' })

      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('should support multiple subscribers for same event', async () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      巛.on('shared.event', handler1)
      巛.on('shared.event', handler2)

      await 巛.emit('shared.event', { data: 'test' })

      expect(handler1).toHaveBeenCalledTimes(1)
      expect(handler2).toHaveBeenCalledTimes(1)
    })

    it('should return unsubscribe function from .on()', async () => {
      const handler = vi.fn()
      const unsubscribe = 巛.on('test.event', handler)

      await 巛.emit('test.event', 'first')
      expect(handler).toHaveBeenCalledTimes(1)

      unsubscribe()

      await 巛.emit('test.event', 'second')
      expect(handler).toHaveBeenCalledTimes(1) // Still 1, not called again
    })

    it('should not call handlers for non-matching events', async () => {
      const handler = vi.fn()
      巛.on('user.created', handler)

      await 巛.emit('user.deleted', { id: '1' })

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('Pattern Matching', () => {
    it('should match wildcard suffix pattern: user.*', async () => {
      const handler = vi.fn()
      巛.on('user.*', handler)

      await 巛.emit('user.created', { id: '1' })
      await 巛.emit('user.updated', { id: '1' })
      await 巛.emit('user.deleted', { id: '1' })

      expect(handler).toHaveBeenCalledTimes(3)
    })

    it('should match wildcard prefix pattern: *.created', async () => {
      const handler = vi.fn()
      巛.on('*.created', handler)

      await 巛.emit('user.created', { id: '1' })
      await 巛.emit('order.created', { id: '2' })
      await 巛.emit('product.updated', { id: '3' })

      expect(handler).toHaveBeenCalledTimes(2) // Only .created events
    })

    it('should match double wildcard: ** matches all events', async () => {
      const handler = vi.fn()
      巛.on('**', handler)

      await 巛.emit('user.created', { a: 1 })
      await 巛.emit('order.updated', { b: 2 })
      await 巛.emit('deep.nested.event', { c: 3 })

      expect(handler).toHaveBeenCalledTimes(3)
    })

    it('should match middle wildcard: user.*.completed', async () => {
      const handler = vi.fn()
      巛.on('user.*.completed', handler)

      await 巛.emit('user.signup.completed', {})
      await 巛.emit('user.purchase.completed', {})
      await 巛.emit('user.signup.started', {}) // Should not match

      expect(handler).toHaveBeenCalledTimes(2)
    })

    it('should not match partial event names', async () => {
      const handler = vi.fn()
      巛.on('user.*', handler)

      await 巛.emit('username', {}) // Should not match user.*

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('One-time Listeners with .once()', () => {
    it('should fire handler only once then auto-unsubscribe', async () => {
      const handler = vi.fn()
      巛.once('one.time', handler)

      await 巛.emit('one.time', 'first')
      await 巛.emit('one.time', 'second')
      await 巛.emit('one.time', 'third')

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          data: 'first',
        })
      )
    })

    it('should return unsubscribe function that works before emit', async () => {
      const handler = vi.fn()
      const unsubscribe = 巛.once('test.once', handler)

      unsubscribe()

      await 巛.emit('test.once', 'data')

      expect(handler).not.toHaveBeenCalled()
    })

    it('should support pattern matching with once()', async () => {
      const handler = vi.fn()
      巛.once('user.*', handler)

      await 巛.emit('user.created', { id: '1' })
      await 巛.emit('user.updated', { id: '1' }) // Should not trigger

      expect(handler).toHaveBeenCalledTimes(1)
    })
  })

  describe('Unsubscription with .off()', () => {
    it('should remove specific handler with .off(pattern, handler)', async () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      巛.on('test', handler1)
      巛.on('test', handler2)

      巛.off('test', handler1)

      await 巛.emit('test', 'data')

      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).toHaveBeenCalledTimes(1)
    })

    it('should remove all handlers for pattern when no handler specified', async () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      巛.on('test.event', handler1)
      巛.on('test.event', handler2)

      巛.off('test.event')

      await 巛.emit('test.event', 'data')

      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).not.toHaveBeenCalled()
    })
  })

  describe('Programmatic Emission with .emit()', () => {
    it('should emit event with name and data', async () => {
      const handler = vi.fn()
      巛.on('test.emit', handler)

      await 巛.emit('test.emit', { value: 42 })

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'test.emit',
          data: { value: 42 },
        })
      )
    })

    it('should emit event without data', async () => {
      const handler = vi.fn()
      巛.on('simple.event', handler)

      await 巛.emit('simple.event')

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'simple.event',
          data: undefined,
        })
      )
    })

    it('should return promise that resolves after handlers complete', async () => {
      const results: number[] = []

      巛.on('async', async () => {
        await new Promise(r => setTimeout(r, 5))
        results.push(1)
      })
      巛.on('async', () => {
        results.push(2)
      })

      await 巛.emit('async', {})

      expect(results).toContain(1)
      expect(results).toContain(2)
    })
  })

  describe('EventData Structure', () => {
    it('should include name, data, timestamp, and id', async () => {
      const handler = vi.fn()
      巛.on('structured.event', handler)

      const beforeTime = Date.now()
      await 巛.emit('structured.event', { payload: 'test' })
      const afterTime = Date.now()

      expect(handler).toHaveBeenCalledTimes(1)
      const eventData = handler.mock.calls[0][0]

      expect(eventData.name).toBe('structured.event')
      expect(eventData.data).toEqual({ payload: 'test' })
      expect(eventData.timestamp).toBeGreaterThanOrEqual(beforeTime)
      expect(eventData.timestamp).toBeLessThanOrEqual(afterTime)
      expect(typeof eventData.id).toBe('string')
      expect(eventData.id.length).toBeGreaterThan(0)
    })

    it('should generate unique ids for each event', async () => {
      const ids: string[] = []
      巛.on('unique.test', (event) => {
        ids.push(event.id)
      })

      await 巛.emit('unique.test', {})
      await 巛.emit('unique.test', {})
      await 巛.emit('unique.test', {})

      expect(new Set(ids).size).toBe(3) // All unique
    })
  })

  describe('Error Handling', () => {
    it('should not break other handlers when one throws', async () => {
      const errorHandler = vi.fn(() => {
        throw new Error('Handler failed')
      })
      const okHandler = vi.fn()

      巛.on('error.test', errorHandler)
      巛.on('error.test', okHandler)

      // Should not throw
      await 巛.emit('error.test', 'data')

      expect(errorHandler).toHaveBeenCalled()
      expect(okHandler).toHaveBeenCalled()
    })

    it('should handle async handler rejection', async () => {
      const rejectHandler = vi.fn(async () => {
        throw new Error('Async failure')
      })
      const okHandler = vi.fn()

      巛.on('async.error', rejectHandler)
      巛.on('async.error', okHandler)

      await 巛.emit('async.error', 'data')

      expect(rejectHandler).toHaveBeenCalled()
      expect(okHandler).toHaveBeenCalled()
    })
  })

  describe('ASCII Alias: on', () => {
    it('should export on as ASCII alias for 巛', () => {
      expect(on).toBe(巛)
    })

    it('should work identically to 巛 for subscription', async () => {
      const handler = vi.fn()
      on.on('alias.test', handler)

      await on.emit('alias.test', { via: 'ascii' })

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'alias.test',
          data: { via: 'ascii' },
        })
      )
    })

    it('should work identically for tagged template emission', async () => {
      const handler = vi.fn()
      on.on('template.alias', handler)

      await on`template.alias ${{ test: true }}`

      expect(handler).toHaveBeenCalledTimes(1)
    })
  })

  describe('Options and Configuration', () => {
    it('should support once option in .on() call', async () => {
      const handler = vi.fn()
      巛.on('options.once', handler, { once: true })

      await 巛.emit('options.once', 'first')
      await 巛.emit('options.once', 'second')

      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('should support priority option for handler ordering', async () => {
      const results: number[] = []

      巛.on('priority.test', () => results.push(1), { priority: 1 })
      巛.on('priority.test', () => results.push(2), { priority: 10 })
      巛.on('priority.test', () => results.push(3), { priority: 5 })

      await 巛.emit('priority.test', {})

      // Higher priority should run first
      expect(results).toEqual([2, 3, 1])
    })
  })

  describe('Pattern Utilities', () => {
    it('should expose matches() for pattern testing', () => {
      expect(巛.matches('user.*', 'user.created')).toBe(true)
      expect(巛.matches('user.*', 'user.updated')).toBe(true)
      expect(巛.matches('user.*', 'order.created')).toBe(false)
      expect(巛.matches('*.created', 'user.created')).toBe(true)
      expect(巛.matches('**', 'any.event.name')).toBe(true)
    })
  })

  describe('Listener Management', () => {
    it('should track listener count', () => {
      expect(巛.listenerCount?.('test')).toBe(0)

      巛.on('test', () => {})
      expect(巛.listenerCount?.('test')).toBe(1)

      巛.on('test', () => {})
      expect(巛.listenerCount?.('test')).toBe(2)
    })

    it('should list registered event patterns with eventNames()', () => {
      巛.on('user.created', () => {})
      巛.on('order.*', () => {})
      巛.on('**', () => {})

      const names = 巛.eventNames?.()

      expect(names).toContain('user.created')
      expect(names).toContain('order.*')
      expect(names).toContain('**')
    })

    it('should remove all listeners with removeAllListeners()', async () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      巛.on('event.a', handler1)
      巛.on('event.b', handler2)

      巛.removeAllListeners?.()

      await 巛.emit('event.a', {})
      await 巛.emit('event.b', {})

      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).not.toHaveBeenCalled()
    })

    it('should remove all listeners for specific pattern', async () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      巛.on('event.a', handler1)
      巛.on('event.b', handler2)

      巛.removeAllListeners?.('event.a')

      await 巛.emit('event.a', {})
      await 巛.emit('event.b', {})

      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).toHaveBeenCalled()
    })
  })
})

describe('巛 Type Safety', () => {
  it('should be callable as tagged template literal', () => {
    // This test verifies the type signature allows tagged template usage
    // The test will fail at runtime until implementation exists,
    // but TypeScript should not complain about the syntax
    const taggedCall = async () => {
      await 巛`test.event ${{ data: 'value' }}`
    }
    expect(taggedCall).toBeDefined()
  })

  it('should have proper method signatures', () => {
    // Verify the shape of the exported object
    expect(typeof 巛.on).toBe('function')
    expect(typeof 巛.once).toBe('function')
    expect(typeof 巛.off).toBe('function')
    expect(typeof 巛.emit).toBe('function')
    expect(typeof 巛.matches).toBe('function')
  })
})
