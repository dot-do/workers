import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  GracefulShutdown,
  ShutdownState,
  ShutdownConfig,
  ShutdownEvent,
  CleanupHook,
  RequestTracker,
} from '../src/index'

describe('GracefulShutdown', () => {
  let shutdown: GracefulShutdown

  beforeEach(() => {
    shutdown = new GracefulShutdown()
  })

  afterEach(async () => {
    // Clean up any pending shutdown
    if (shutdown.getState() !== ShutdownState.Running) {
      await shutdown.reset()
    }
  })

  describe('Basic Lifecycle', () => {
    it('should start in Running state', () => {
      expect(shutdown.getState()).toBe(ShutdownState.Running)
    })

    it('should transition to Draining state when shutdown initiated', async () => {
      shutdown.initiateShutdown()
      expect(shutdown.getState()).toBe(ShutdownState.Draining)
    })

    it('should transition to Shutdown state when complete', async () => {
      const result = await shutdown.initiateShutdown()
      expect(result.success).toBe(true)
      expect(shutdown.getState()).toBe(ShutdownState.Shutdown)
    })

    it('should not allow new requests when draining', () => {
      shutdown.initiateShutdown()
      expect(shutdown.canAcceptRequest()).toBe(false)
    })

    it('should allow requests when running', () => {
      expect(shutdown.canAcceptRequest()).toBe(true)
    })

    it('should be idempotent for multiple shutdown calls', async () => {
      const promise1 = shutdown.initiateShutdown()
      const promise2 = shutdown.initiateShutdown()

      const [result1, result2] = await Promise.all([promise1, promise2])
      expect(result1).toBe(result2) // Same promise reference
    })
  })

  describe('In-Flight Request Tracking', () => {
    it('should track in-flight requests', () => {
      const tracker = shutdown.trackRequest('req-1')
      expect(shutdown.getInFlightCount()).toBe(1)
      tracker.complete()
      expect(shutdown.getInFlightCount()).toBe(0)
    })

    it('should track multiple concurrent requests', () => {
      const tracker1 = shutdown.trackRequest('req-1')
      const tracker2 = shutdown.trackRequest('req-2')
      const tracker3 = shutdown.trackRequest('req-3')

      expect(shutdown.getInFlightCount()).toBe(3)

      tracker1.complete()
      expect(shutdown.getInFlightCount()).toBe(2)

      tracker2.complete()
      tracker3.complete()
      expect(shutdown.getInFlightCount()).toBe(0)
    })

    it('should wait for in-flight requests to complete during shutdown', async () => {
      const tracker = shutdown.trackRequest('req-1')
      const shutdownPromise = shutdown.initiateShutdown()

      // Shutdown should be pending
      expect(shutdown.getState()).toBe(ShutdownState.Draining)

      // Simulate request completion after delay
      setTimeout(() => tracker.complete(), 50)

      const result = await shutdownPromise
      expect(result.success).toBe(true)
      expect(shutdown.getInFlightCount()).toBe(0)
    })

    it('should report request IDs when getting in-flight requests', () => {
      shutdown.trackRequest('req-1')
      shutdown.trackRequest('req-2')

      const inFlight = shutdown.getInFlightRequests()
      expect(inFlight).toContain('req-1')
      expect(inFlight).toContain('req-2')
    })

    it('should auto-generate request ID if not provided', () => {
      const tracker = shutdown.trackRequest()
      expect(tracker.id).toBeDefined()
      expect(typeof tracker.id).toBe('string')
      tracker.complete()
    })

    it('should not track new requests when draining', () => {
      shutdown.initiateShutdown()
      expect(() => shutdown.trackRequest('req-1')).toThrow('Cannot accept new requests')
    })

    it('should handle request completion with error', () => {
      const tracker = shutdown.trackRequest('req-1')
      tracker.completeWithError(new Error('Request failed'))
      expect(shutdown.getInFlightCount()).toBe(0)
    })
  })

  describe('Cleanup Hooks', () => {
    it('should register cleanup hooks', () => {
      const cleanup = vi.fn().mockResolvedValue(undefined)
      shutdown.registerCleanup('test-cleanup', cleanup)

      expect(shutdown.getRegisteredCleanups()).toContain('test-cleanup')
    })

    it('should execute cleanup hooks during shutdown', async () => {
      const cleanup = vi.fn().mockResolvedValue(undefined)
      shutdown.registerCleanup('test-cleanup', cleanup)

      await shutdown.initiateShutdown()

      expect(cleanup).toHaveBeenCalled()
    })

    it('should execute cleanup hooks in priority order', async () => {
      const executionOrder: string[] = []

      shutdown.registerCleanup('first', async () => {
        executionOrder.push('first')
      }, { priority: 100 })

      shutdown.registerCleanup('second', async () => {
        executionOrder.push('second')
      }, { priority: 50 })

      shutdown.registerCleanup('third', async () => {
        executionOrder.push('third')
      }, { priority: 75 })

      await shutdown.initiateShutdown()

      // Higher priority = executed first
      expect(executionOrder).toEqual(['first', 'third', 'second'])
    })

    it('should handle cleanup hook failures gracefully', async () => {
      const failingCleanup = vi.fn().mockRejectedValue(new Error('Cleanup failed'))
      const successCleanup = vi.fn().mockResolvedValue(undefined)

      shutdown.registerCleanup('failing', failingCleanup)
      shutdown.registerCleanup('success', successCleanup)

      const result = await shutdown.initiateShutdown()

      // All cleanups should be attempted
      expect(failingCleanup).toHaveBeenCalled()
      expect(successCleanup).toHaveBeenCalled()

      // Result should indicate partial failure
      expect(result.cleanupErrors).toBeDefined()
      expect(result.cleanupErrors?.length).toBe(1)
    })

    it('should respect cleanup hook timeout', async () => {
      const slowCleanup = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 5000))
      )

      shutdown.registerCleanup('slow', slowCleanup, { timeout: 50 })

      const result = await shutdown.initiateShutdown()

      expect(result.cleanupErrors).toBeDefined()
      expect(result.cleanupErrors?.[0]?.message).toContain('timeout')
    })

    it('should allow unregistering cleanup hooks', () => {
      shutdown.registerCleanup('temp', vi.fn())
      expect(shutdown.getRegisteredCleanups()).toContain('temp')

      shutdown.unregisterCleanup('temp')
      expect(shutdown.getRegisteredCleanups()).not.toContain('temp')
    })
  })

  describe('WebSocket Connection Management', () => {
    it('should track WebSocket connections', () => {
      const mockWs = { close: vi.fn() }
      shutdown.trackWebSocket('ws-1', mockWs as unknown as WebSocket)

      expect(shutdown.getWebSocketCount()).toBe(1)
    })

    it('should close WebSocket connections during shutdown', async () => {
      const mockWs = { close: vi.fn(), readyState: 1 }
      shutdown.trackWebSocket('ws-1', mockWs as unknown as WebSocket)

      await shutdown.initiateShutdown()

      expect(mockWs.close).toHaveBeenCalledWith(1001, 'Server shutting down')
    })

    it('should untrack closed WebSocket connections', () => {
      const mockWs = { close: vi.fn() }
      shutdown.trackWebSocket('ws-1', mockWs as unknown as WebSocket)
      expect(shutdown.getWebSocketCount()).toBe(1)

      shutdown.untrackWebSocket('ws-1')
      expect(shutdown.getWebSocketCount()).toBe(0)
    })

    it('should handle multiple WebSocket connections', async () => {
      const mockWs1 = { close: vi.fn(), readyState: 1 }
      const mockWs2 = { close: vi.fn(), readyState: 1 }

      shutdown.trackWebSocket('ws-1', mockWs1 as unknown as WebSocket)
      shutdown.trackWebSocket('ws-2', mockWs2 as unknown as WebSocket)

      await shutdown.initiateShutdown()

      expect(mockWs1.close).toHaveBeenCalled()
      expect(mockWs2.close).toHaveBeenCalled()
    })
  })

  describe('Timeout Handling', () => {
    it('should respect shutdown timeout', async () => {
      const config: ShutdownConfig = { timeout: 100 }
      shutdown = new GracefulShutdown(config)

      // Track a request that never completes
      shutdown.trackRequest('stuck-request')

      const result = await shutdown.initiateShutdown()

      expect(result.success).toBe(false)
      expect(result.timedOut).toBe(true)
      expect(result.remainingRequests).toBe(1)
    })

    it('should force shutdown after timeout', async () => {
      shutdown = new GracefulShutdown({ timeout: 50 })

      const tracker = shutdown.trackRequest('req-1')
      const result = await shutdown.initiateShutdown()

      expect(result.timedOut).toBe(true)
      expect(shutdown.getState()).toBe(ShutdownState.Shutdown)

      // Request is still tracked but shutdown completed
      tracker.complete() // Clean up
    })

    it('should allow configurable grace period for WebSockets', async () => {
      shutdown = new GracefulShutdown({ webSocketGracePeriod: 100 })

      const mockWs = {
        close: vi.fn(),
        readyState: 1
      }
      shutdown.trackWebSocket('ws-1', mockWs as unknown as WebSocket)

      const startTime = Date.now()
      await shutdown.initiateShutdown()
      const elapsed = Date.now() - startTime

      // Should wait grace period before closing
      expect(elapsed).toBeGreaterThanOrEqual(90) // Allow some tolerance
    })
  })

  describe('Event Emission', () => {
    it('should emit shutdown initiated event', async () => {
      const listener = vi.fn()
      shutdown.on('shutdown:initiated', listener)

      await shutdown.initiateShutdown()

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'shutdown:initiated' })
      )
    })

    it('should emit draining event with request count', async () => {
      const listener = vi.fn()
      shutdown.on('shutdown:draining', listener)

      shutdown.trackRequest('req-1')
      setTimeout(() => shutdown.getInFlightRequests().forEach(() => {}), 10)

      shutdown.initiateShutdown()

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'shutdown:draining',
          inFlightCount: 1,
        })
      )
    })

    it('should emit complete event', async () => {
      const listener = vi.fn()
      shutdown.on('shutdown:complete', listener)

      await shutdown.initiateShutdown()

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'shutdown:complete' })
      )
    })

    it('should emit timeout event when shutdown times out', async () => {
      shutdown = new GracefulShutdown({ timeout: 50 })
      const listener = vi.fn()
      shutdown.on('shutdown:timeout', listener)

      shutdown.trackRequest('stuck-request')
      await shutdown.initiateShutdown()

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'shutdown:timeout',
          remainingRequests: 1,
        })
      )
    })

    it('should support removing event listeners', () => {
      const listener = vi.fn()
      shutdown.on('shutdown:initiated', listener)
      shutdown.off('shutdown:initiated', listener)

      shutdown.initiateShutdown()

      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('Configuration', () => {
    it('should use default timeout of 30 seconds', () => {
      expect(shutdown.getConfig().timeout).toBe(30000)
    })

    it('should allow custom timeout configuration', () => {
      shutdown = new GracefulShutdown({ timeout: 5000 })
      expect(shutdown.getConfig().timeout).toBe(5000)
    })

    it('should allow custom WebSocket close code', async () => {
      shutdown = new GracefulShutdown({ webSocketCloseCode: 1000 })

      const mockWs = { close: vi.fn(), readyState: 1 }
      shutdown.trackWebSocket('ws-1', mockWs as unknown as WebSocket)

      await shutdown.initiateShutdown()

      expect(mockWs.close).toHaveBeenCalledWith(1000, expect.any(String))
    })

    it('should allow custom WebSocket close message', async () => {
      shutdown = new GracefulShutdown({ webSocketCloseMessage: 'Goodbye' })

      const mockWs = { close: vi.fn(), readyState: 1 }
      shutdown.trackWebSocket('ws-1', mockWs as unknown as WebSocket)

      await shutdown.initiateShutdown()

      expect(mockWs.close).toHaveBeenCalledWith(expect.any(Number), 'Goodbye')
    })
  })

  describe('State Persistence', () => {
    it('should call state persistence hook before shutdown', async () => {
      const persistState = vi.fn().mockResolvedValue(undefined)
      shutdown.onPersistState(persistState)

      await shutdown.initiateShutdown()

      expect(persistState).toHaveBeenCalled()
    })

    it('should pass shutdown context to persistence hook', async () => {
      const persistState = vi.fn().mockResolvedValue(undefined)
      shutdown.onPersistState(persistState)

      await shutdown.initiateShutdown()

      expect(persistState).toHaveBeenCalledWith(
        expect.objectContaining({
          inFlightRequests: expect.any(Array),
          timestamp: expect.any(Number),
        })
      )
    })

    it('should continue shutdown even if persistence fails', async () => {
      const persistState = vi.fn().mockRejectedValue(new Error('Storage full'))
      shutdown.onPersistState(persistState)

      const result = await shutdown.initiateShutdown()

      expect(result.success).toBe(true)
      expect(result.persistenceError).toBeDefined()
    })
  })

  describe('Request Context Wrapper', () => {
    it('should provide middleware-style request wrapping', async () => {
      const handler = vi.fn().mockResolvedValue(new Response('OK'))

      const wrappedHandler = shutdown.wrapHandler(handler)
      const response = await wrappedHandler(new Request('https://example.com'))

      expect(response.status).toBe(200)
      expect(shutdown.getInFlightCount()).toBe(0) // Request completed
    })

    it('should return 503 when draining', async () => {
      const handler = vi.fn().mockResolvedValue(new Response('OK'))

      shutdown.initiateShutdown()

      const wrappedHandler = shutdown.wrapHandler(handler)
      const response = await wrappedHandler(new Request('https://example.com'))

      expect(response.status).toBe(503)
      expect(handler).not.toHaveBeenCalled()
    })

    it('should track request even if handler throws', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('Handler error'))

      const wrappedHandler = shutdown.wrapHandler(handler)

      await expect(
        wrappedHandler(new Request('https://example.com'))
      ).rejects.toThrow('Handler error')

      expect(shutdown.getInFlightCount()).toBe(0) // Request completed despite error
    })
  })

  describe('Shutdown Result', () => {
    it('should report successful shutdown', async () => {
      const result = await shutdown.initiateShutdown()

      expect(result.success).toBe(true)
      expect(result.duration).toBeDefined()
      expect(typeof result.duration).toBe('number')
    })

    it('should report shutdown statistics', async () => {
      shutdown.trackRequest('req-1').complete()

      const cleanup = vi.fn().mockResolvedValue(undefined)
      shutdown.registerCleanup('test', cleanup)

      const result = await shutdown.initiateShutdown()

      expect(result.requestsDrained).toBe(1)
      expect(result.cleanupsExecuted).toBe(1)
    })
  })

  describe('Reset Functionality', () => {
    it('should allow reset for testing', async () => {
      await shutdown.initiateShutdown()
      expect(shutdown.getState()).toBe(ShutdownState.Shutdown)

      await shutdown.reset()
      expect(shutdown.getState()).toBe(ShutdownState.Running)
    })

    it('should clear all tracked state on reset', async () => {
      shutdown.trackRequest('req-1').complete()
      shutdown.registerCleanup('test', vi.fn())

      await shutdown.reset()

      expect(shutdown.getInFlightCount()).toBe(0)
      expect(shutdown.getRegisteredCleanups()).toHaveLength(0)
    })
  })
})

describe('ShutdownState enum', () => {
  it('should have correct state values', () => {
    expect(ShutdownState.Running).toBe('running')
    expect(ShutdownState.Draining).toBe('draining')
    expect(ShutdownState.Shutdown).toBe('shutdown')
  })
})

describe('Type exports', () => {
  it('should export all required types', () => {
    // This test verifies type exports compile correctly
    const config: ShutdownConfig = {
      timeout: 5000,
      webSocketGracePeriod: 1000,
      webSocketCloseCode: 1001,
      webSocketCloseMessage: 'Goodbye',
    }

    const event: ShutdownEvent = {
      type: 'shutdown:initiated',
      timestamp: Date.now(),
    }

    expect(config).toBeDefined()
    expect(event).toBeDefined()
  })
})
