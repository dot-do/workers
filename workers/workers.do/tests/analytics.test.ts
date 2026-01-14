/**
 * Analytics Middleware Tests
 *
 * Tests for request event capture, async sending via waitUntil,
 * error handling, batching, and Pipeline vs AnalyticsEngine detection.
 *
 * @module tests/analytics.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  captureRequestEvent,
  withAnalytics,
  AnalyticsBatcher,
  type RequestEvent,
  type Env
} from '../src/middleware/analytics'

// ============================================================================
// Mock Types
// ============================================================================

interface MockPipeline {
  send: ReturnType<typeof vi.fn>
}

interface MockAnalyticsEngine {
  writeDataPoint: ReturnType<typeof vi.fn>
}

interface MockExecutionContext {
  waitUntil: ReturnType<typeof vi.fn>
  passThroughOnException: () => void
}

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a mock ExecutionContext
 */
function createMockCtx(): MockExecutionContext {
  return {
    waitUntil: vi.fn(),
    passThroughOnException: vi.fn()
  }
}

/**
 * Create a mock Pipeline binding
 */
function createMockPipeline(): MockPipeline {
  return {
    send: vi.fn().mockResolvedValue(undefined)
  }
}

/**
 * Create a mock AnalyticsEngine binding
 */
function createMockAnalyticsEngine(): MockAnalyticsEngine {
  return {
    writeDataPoint: vi.fn()
  }
}

/**
 * Create a test request
 */
function createTestRequest(
  path: string = '/test',
  options: RequestInit & { cf?: Record<string, unknown> } = {}
): Request {
  const { cf, ...requestOptions } = options
  const request = new Request(`https://workers.do${path}`, requestOptions)

  // Attach CF properties if provided
  if (cf) {
    Object.defineProperty(request, 'cf', {
      value: cf,
      writable: false
    })
  }

  return request
}

/**
 * Create a test response
 */
function createTestResponse(
  status: number = 200,
  headers: Record<string, string> = {}
): Response {
  return new Response('OK', { status, headers })
}

// ============================================================================
// Request Event Capture Tests
// ============================================================================

describe('Request Event Capture', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleSpy.mockRestore()
    vi.restoreAllMocks()
  })

  describe('captureRequestEvent', () => {
    it('captures request event with correct fields', async () => {
      const mockPipeline = createMockPipeline()
      const mockCtx = createMockCtx()
      const env: Env = { analytics: mockPipeline as unknown as Env['analytics'] }

      const request = createTestRequest('/api/users', {
        method: 'POST',
        headers: {
          'User-Agent': 'TestAgent/1.0',
          'X-App-Id': 'test-app-123'
        },
        cf: {
          country: 'US',
          colo: 'SFO'
        }
      })
      const response = createTestResponse(201)

      captureRequestEvent(request, response, 'worker-1', 150, env, mockCtx as unknown as ExecutionContext)

      // Verify waitUntil was called
      expect(mockCtx.waitUntil).toHaveBeenCalledTimes(1)

      // Wait for the async operation
      const waitUntilPromise = mockCtx.waitUntil.mock.calls[0][0]
      await waitUntilPromise

      // Verify the event was sent
      expect(mockPipeline.send).toHaveBeenCalledTimes(1)
      const sentEvent = mockPipeline.send.mock.calls[0][0] as RequestEvent

      // Verify all fields
      expect(sentEvent.method).toBe('POST')
      expect(sentEvent.path).toBe('/api/users')
      expect(sentEvent.status).toBe(201)
      expect(sentEvent.duration_ms).toBe(150)
      expect(sentEvent.worker_id).toBe('worker-1')
      expect(sentEvent.user_agent).toBe('TestAgent/1.0')
      expect(sentEvent.app_id).toBe('test-app-123')
      expect(sentEvent.country).toBe('US')
      expect(sentEvent.colo).toBe('SFO')
      expect(sentEvent.request_id).toMatch(/^req_\d+_[a-z0-9]+$/)
      expect(sentEvent.timestamp).toBeDefined()
    })

    it('handles missing optional fields gracefully', async () => {
      const mockPipeline = createMockPipeline()
      const mockCtx = createMockCtx()
      const env: Env = { analytics: mockPipeline as unknown as Env['analytics'] }

      // Request without User-Agent, X-App-Id, or CF properties
      const request = createTestRequest('/simple')
      const response = createTestResponse(200)

      captureRequestEvent(request, response, 'worker-1', 50, env, mockCtx as unknown as ExecutionContext)

      const waitUntilPromise = mockCtx.waitUntil.mock.calls[0][0]
      await waitUntilPromise

      const sentEvent = mockPipeline.send.mock.calls[0][0] as RequestEvent

      // Verify optional fields are undefined (not empty strings)
      expect(sentEvent.user_agent).toBeUndefined()
      expect(sentEvent.app_id).toBeUndefined()
      expect(sentEvent.country).toBeUndefined()
      expect(sentEvent.colo).toBeUndefined()
    })

    it('generates unique request IDs', async () => {
      const mockPipeline = createMockPipeline()
      const env: Env = { analytics: mockPipeline as unknown as Env['analytics'] }

      const requestIds = new Set<string>()

      // Capture multiple events and collect request IDs
      for (let i = 0; i < 10; i++) {
        const mockCtx = createMockCtx()
        const request = createTestRequest('/test')
        const response = createTestResponse(200)

        captureRequestEvent(request, response, 'worker-1', 10, env, mockCtx as unknown as ExecutionContext)
        await mockCtx.waitUntil.mock.calls[0][0]
      }

      // Extract all request IDs
      for (const call of mockPipeline.send.mock.calls) {
        const event = call[0] as RequestEvent
        requestIds.add(event.request_id)
      }

      // All IDs should be unique
      expect(requestIds.size).toBe(10)
    })
  })
})

// ============================================================================
// waitUntil (Non-blocking) Tests
// ============================================================================

describe('Events are sent via waitUntil (non-blocking)', () => {
  it('uses waitUntil for async event sending', () => {
    const mockPipeline = createMockPipeline()
    const mockCtx = createMockCtx()
    const env: Env = { analytics: mockPipeline as unknown as Env['analytics'] }

    const request = createTestRequest('/test')
    const response = createTestResponse(200)

    captureRequestEvent(request, response, 'worker-1', 100, env, mockCtx as unknown as ExecutionContext)

    // waitUntil should be called with a promise
    expect(mockCtx.waitUntil).toHaveBeenCalledTimes(1)
    expect(mockCtx.waitUntil.mock.calls[0][0]).toBeInstanceOf(Promise)
  })

  it('does not block on analytics completion', async () => {
    // Create a slow pipeline that takes time to resolve
    const slowPipeline = {
      send: vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
    }
    const mockCtx = createMockCtx()
    const env: Env = { analytics: slowPipeline as unknown as Env['analytics'] }

    const request = createTestRequest('/test')
    const response = createTestResponse(200)

    const startTime = Date.now()
    captureRequestEvent(request, response, 'worker-1', 50, env, mockCtx as unknown as ExecutionContext)
    const elapsed = Date.now() - startTime

    // captureRequestEvent should return immediately (not wait for slow send)
    expect(elapsed).toBeLessThan(50)

    // But waitUntil was called with the promise
    expect(mockCtx.waitUntil).toHaveBeenCalledTimes(1)
  })

  it('skips analytics when no binding is present', async () => {
    const mockCtx = createMockCtx()
    const env: Env = {} // No analytics binding

    const request = createTestRequest('/test')
    const response = createTestResponse(200)

    captureRequestEvent(request, response, 'worker-1', 50, env, mockCtx as unknown as ExecutionContext)

    // waitUntil should still be called, but the promise should resolve immediately
    expect(mockCtx.waitUntil).toHaveBeenCalledTimes(1)

    // The promise should resolve without errors
    await expect(mockCtx.waitUntil.mock.calls[0][0]).resolves.toBeUndefined()
  })
})

// ============================================================================
// Error Handling Tests
// ============================================================================

describe('Analytics failures do not break requests', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  it('catches and logs pipeline send errors', async () => {
    const failingPipeline = {
      send: vi.fn().mockRejectedValue(new Error('Pipeline unavailable'))
    }
    const mockCtx = createMockCtx()
    const env: Env = { analytics: failingPipeline as unknown as Env['analytics'] }

    const request = createTestRequest('/test')
    const response = createTestResponse(200)

    captureRequestEvent(request, response, 'worker-1', 50, env, mockCtx as unknown as ExecutionContext)

    // The promise should not throw
    await expect(mockCtx.waitUntil.mock.calls[0][0]).resolves.toBeUndefined()

    // Error should be logged
    expect(consoleSpy).toHaveBeenCalledWith('Analytics error:', 'Pipeline unavailable')
  })

  it('catches and logs analytics engine errors', async () => {
    const failingAnalyticsEngine = {
      writeDataPoint: vi.fn().mockImplementation(() => {
        throw new Error('Analytics Engine quota exceeded')
      })
    }
    const mockCtx = createMockCtx()
    const env: Env = { analytics: failingAnalyticsEngine as unknown as Env['analytics'] }

    const request = createTestRequest('/test')
    const response = createTestResponse(200)

    captureRequestEvent(request, response, 'worker-1', 50, env, mockCtx as unknown as ExecutionContext)

    // The promise should not throw
    await expect(mockCtx.waitUntil.mock.calls[0][0]).resolves.toBeUndefined()

    // Error should be logged
    expect(consoleSpy).toHaveBeenCalledWith('Analytics error:', 'Analytics Engine quota exceeded')
  })

  it('handles non-Error exceptions gracefully', async () => {
    const failingPipeline = {
      send: vi.fn().mockRejectedValue('string error')
    }
    const mockCtx = createMockCtx()
    const env: Env = { analytics: failingPipeline as unknown as Env['analytics'] }

    const request = createTestRequest('/test')
    const response = createTestResponse(200)

    captureRequestEvent(request, response, 'worker-1', 50, env, mockCtx as unknown as ExecutionContext)

    // The promise should not throw
    await expect(mockCtx.waitUntil.mock.calls[0][0]).resolves.toBeUndefined()

    // Error should be logged as string
    expect(consoleSpy).toHaveBeenCalledWith('Analytics error:', 'string error')
  })
})

// ============================================================================
// withAnalytics Middleware Tests
// ============================================================================

describe('withAnalytics middleware', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  it('wraps handler and captures timing', async () => {
    const mockPipeline = createMockPipeline()
    const mockCtx = createMockCtx()
    const env: Env = { analytics: mockPipeline as unknown as Env['analytics'] }

    const handler = vi.fn().mockImplementation(async () => {
      // Simulate some processing time
      await new Promise(resolve => setTimeout(resolve, 10))
      return new Response('Hello', { status: 200 })
    })

    const wrappedHandler = withAnalytics(handler)
    const request = createTestRequest('/hello')

    const response = await wrappedHandler(request, env, mockCtx as unknown as ExecutionContext)

    // Handler should be called
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(request, env, mockCtx)

    // Response should be returned
    expect(response.status).toBe(200)

    // Analytics should be captured via waitUntil
    expect(mockCtx.waitUntil).toHaveBeenCalledTimes(1)

    // Wait for analytics
    await mockCtx.waitUntil.mock.calls[0][0]

    // Check captured event has reasonable duration
    const sentEvent = mockPipeline.send.mock.calls[0][0] as RequestEvent
    expect(sentEvent.duration_ms).toBeGreaterThanOrEqual(10)
  })

  it('extracts worker ID from X-Routed-To header', async () => {
    const mockPipeline = createMockPipeline()
    const mockCtx = createMockCtx()
    const env: Env = { analytics: mockPipeline as unknown as Env['analytics'] }

    const handler = vi.fn().mockResolvedValue(
      new Response('OK', {
        status: 200,
        headers: { 'X-Routed-To': 'my-worker-abc' }
      })
    )

    const wrappedHandler = withAnalytics(handler)
    const request = createTestRequest('/test')

    await wrappedHandler(request, env, mockCtx as unknown as ExecutionContext)
    await mockCtx.waitUntil.mock.calls[0][0]

    const sentEvent = mockPipeline.send.mock.calls[0][0] as RequestEvent
    expect(sentEvent.worker_id).toBe('my-worker-abc')
  })

  it('uses default worker ID when header is missing', async () => {
    const mockPipeline = createMockPipeline()
    const mockCtx = createMockCtx()
    const env: Env = { analytics: mockPipeline as unknown as Env['analytics'] }

    const handler = vi.fn().mockResolvedValue(new Response('OK', { status: 200 }))

    const wrappedHandler = withAnalytics(handler)
    const request = createTestRequest('/test')

    await wrappedHandler(request, env, mockCtx as unknown as ExecutionContext)
    await mockCtx.waitUntil.mock.calls[0][0]

    const sentEvent = mockPipeline.send.mock.calls[0][0] as RequestEvent
    expect(sentEvent.worker_id).toBe('workers-proxy')
  })

  it('captures error events and rethrows', async () => {
    const mockPipeline = createMockPipeline()
    const mockCtx = createMockCtx()
    const env: Env = { analytics: mockPipeline as unknown as Env['analytics'] }

    const handlerError = new Error('Handler crashed')
    const handler = vi.fn().mockRejectedValue(handlerError)

    const wrappedHandler = withAnalytics(handler)
    const request = createTestRequest('/test')

    // Should rethrow the error
    await expect(wrappedHandler(request, env, mockCtx as unknown as ExecutionContext))
      .rejects.toThrow('Handler crashed')

    // Analytics should still be captured
    expect(mockCtx.waitUntil).toHaveBeenCalledTimes(1)

    await mockCtx.waitUntil.mock.calls[0][0]

    // Error event should have 500 status
    const sentEvent = mockPipeline.send.mock.calls[0][0] as RequestEvent
    expect(sentEvent.status).toBe(500)
    expect(sentEvent.worker_id).toBe('workers-proxy')
  })
})

// ============================================================================
// AnalyticsBatcher Tests
// ============================================================================

describe('AnalyticsBatcher', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  describe('batch collection and flushing', () => {
    it('collects events without sending until batch size reached', () => {
      const mockPipeline = createMockPipeline()
      const mockCtx = createMockCtx()
      const env: Env = { analytics: mockPipeline as unknown as Env['analytics'] }

      const batcher = new AnalyticsBatcher(env, mockCtx as unknown as ExecutionContext, 5, 60000)

      // Add 4 events (under batch size of 5)
      for (let i = 0; i < 4; i++) {
        batcher.add({
          timestamp: new Date().toISOString(),
          worker_id: 'worker-1',
          method: 'GET',
          path: '/test',
          status: 200,
          duration_ms: 10,
          request_id: `req_${i}`
        })
      }

      // Should not have flushed yet
      expect(mockCtx.waitUntil).not.toHaveBeenCalled()
    })

    it('auto-flushes when batch size is reached', async () => {
      const mockPipeline = createMockPipeline()
      const mockCtx = createMockCtx()
      const env: Env = { analytics: mockPipeline as unknown as Env['analytics'] }

      const batcher = new AnalyticsBatcher(env, mockCtx as unknown as ExecutionContext, 3, 60000)

      // Add exactly batch size events
      for (let i = 0; i < 3; i++) {
        batcher.add({
          timestamp: new Date().toISOString(),
          worker_id: 'worker-1',
          method: 'GET',
          path: '/test',
          status: 200,
          duration_ms: 10,
          request_id: `req_${i}`
        })
      }

      // Should have triggered flush via waitUntil
      expect(mockCtx.waitUntil).toHaveBeenCalledTimes(1)

      // Wait for batch send to complete
      await mockCtx.waitUntil.mock.calls[0][0]

      // All 3 events should be sent
      expect(mockPipeline.send).toHaveBeenCalledTimes(3)
    })

    it('manual flush sends all pending events', async () => {
      const mockPipeline = createMockPipeline()
      const mockCtx = createMockCtx()
      const env: Env = { analytics: mockPipeline as unknown as Env['analytics'] }

      const batcher = new AnalyticsBatcher(env, mockCtx as unknown as ExecutionContext, 100, 60000)

      // Add 5 events (well under batch size)
      for (let i = 0; i < 5; i++) {
        batcher.add({
          timestamp: new Date().toISOString(),
          worker_id: 'worker-1',
          method: 'GET',
          path: '/test',
          status: 200,
          duration_ms: 10,
          request_id: `req_${i}`
        })
      }

      // Manual flush
      batcher.flush()

      expect(mockCtx.waitUntil).toHaveBeenCalledTimes(1)

      await mockCtx.waitUntil.mock.calls[0][0]

      // All 5 events should be sent
      expect(mockPipeline.send).toHaveBeenCalledTimes(5)
    })

    it('flush with no events does nothing', () => {
      const mockPipeline = createMockPipeline()
      const mockCtx = createMockCtx()
      const env: Env = { analytics: mockPipeline as unknown as Env['analytics'] }

      const batcher = new AnalyticsBatcher(env, mockCtx as unknown as ExecutionContext)

      // Flush with no events
      batcher.flush()

      // Should not call waitUntil
      expect(mockCtx.waitUntil).not.toHaveBeenCalled()
    })

    it('clears events after flush', async () => {
      const mockPipeline = createMockPipeline()
      const mockCtx = createMockCtx()
      const env: Env = { analytics: mockPipeline as unknown as Env['analytics'] }

      const batcher = new AnalyticsBatcher(env, mockCtx as unknown as ExecutionContext, 100, 60000)

      // Add events and flush
      batcher.add({
        timestamp: new Date().toISOString(),
        worker_id: 'worker-1',
        method: 'GET',
        path: '/test',
        status: 200,
        duration_ms: 10,
        request_id: 'req_1'
      })

      batcher.flush()
      await mockCtx.waitUntil.mock.calls[0][0]

      // Flush again should do nothing (events were cleared)
      batcher.flush()

      // Still only one waitUntil call
      expect(mockCtx.waitUntil).toHaveBeenCalledTimes(1)
    })
  })

  describe('flush interval', () => {
    it('auto-flushes when interval is exceeded', async () => {
      const mockPipeline = createMockPipeline()
      const mockCtx = createMockCtx()
      const env: Env = { analytics: mockPipeline as unknown as Env['analytics'] }

      // Create batcher with very short interval (1ms)
      const batcher = new AnalyticsBatcher(env, mockCtx as unknown as ExecutionContext, 100, 1)

      // Add one event
      batcher.add({
        timestamp: new Date().toISOString(),
        worker_id: 'worker-1',
        method: 'GET',
        path: '/test',
        status: 200,
        duration_ms: 10,
        request_id: 'req_1'
      })

      // Wait for interval to pass
      await new Promise(resolve => setTimeout(resolve, 5))

      // Add another event - should trigger interval-based flush
      batcher.add({
        timestamp: new Date().toISOString(),
        worker_id: 'worker-1',
        method: 'GET',
        path: '/test',
        status: 200,
        duration_ms: 10,
        request_id: 'req_2'
      })

      // Should have flushed due to interval
      expect(mockCtx.waitUntil).toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('handles batch send errors gracefully', async () => {
      const failingPipeline = {
        send: vi.fn().mockRejectedValue(new Error('Batch send failed'))
      }
      const mockCtx = createMockCtx()
      const env: Env = { analytics: failingPipeline as unknown as Env['analytics'] }

      const batcher = new AnalyticsBatcher(env, mockCtx as unknown as ExecutionContext, 2, 60000)

      // Add batch size events to trigger flush
      batcher.add({
        timestamp: new Date().toISOString(),
        worker_id: 'worker-1',
        method: 'GET',
        path: '/test',
        status: 200,
        duration_ms: 10,
        request_id: 'req_1'
      })
      batcher.add({
        timestamp: new Date().toISOString(),
        worker_id: 'worker-1',
        method: 'GET',
        path: '/test',
        status: 200,
        duration_ms: 10,
        request_id: 'req_2'
      })

      // Wait for batch send
      await mockCtx.waitUntil.mock.calls[0][0]

      // Error should be logged but not thrown
      expect(consoleSpy).toHaveBeenCalledWith('Batch analytics error:', 'Batch send failed')
    })

    it('skips batch send when no analytics binding', async () => {
      const mockCtx = createMockCtx()
      const env: Env = {} // No analytics binding

      const batcher = new AnalyticsBatcher(env, mockCtx as unknown as ExecutionContext, 2, 60000)

      // Add batch size events to trigger flush
      batcher.add({
        timestamp: new Date().toISOString(),
        worker_id: 'worker-1',
        method: 'GET',
        path: '/test',
        status: 200,
        duration_ms: 10,
        request_id: 'req_1'
      })
      batcher.add({
        timestamp: new Date().toISOString(),
        worker_id: 'worker-1',
        method: 'GET',
        path: '/test',
        status: 200,
        duration_ms: 10,
        request_id: 'req_2'
      })

      // Wait for batch send
      await mockCtx.waitUntil.mock.calls[0][0]

      // Should complete without error
      expect(consoleSpy).not.toHaveBeenCalled()
    })
  })
})

// ============================================================================
// Pipeline vs AnalyticsEngine Detection Tests
// ============================================================================

describe('Pipeline vs AnalyticsEngine detection', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  describe('single event sending', () => {
    it('uses Pipeline.send when "send" method exists', async () => {
      const mockPipeline = createMockPipeline()
      const mockCtx = createMockCtx()
      const env: Env = { analytics: mockPipeline as unknown as Env['analytics'] }

      const request = createTestRequest('/test')
      const response = createTestResponse(200)

      captureRequestEvent(request, response, 'worker-1', 50, env, mockCtx as unknown as ExecutionContext)
      await mockCtx.waitUntil.mock.calls[0][0]

      // Pipeline.send should be called
      expect(mockPipeline.send).toHaveBeenCalledTimes(1)
    })

    it('uses AnalyticsEngine.writeDataPoint when "send" method does not exist', async () => {
      const mockAnalyticsEngine = createMockAnalyticsEngine()
      const mockCtx = createMockCtx()
      const env: Env = { analytics: mockAnalyticsEngine as unknown as Env['analytics'] }

      const request = createTestRequest('/test', { method: 'POST' })
      const response = createTestResponse(201)

      captureRequestEvent(request, response, 'worker-1', 75, env, mockCtx as unknown as ExecutionContext)
      await mockCtx.waitUntil.mock.calls[0][0]

      // AnalyticsEngine.writeDataPoint should be called
      expect(mockAnalyticsEngine.writeDataPoint).toHaveBeenCalledTimes(1)

      const writeCall = mockAnalyticsEngine.writeDataPoint.mock.calls[0][0]
      expect(writeCall.indexes).toEqual(['worker-1'])
      expect(writeCall.blobs[0]).toBe('/test') // path
      expect(writeCall.blobs[1]).toBe('POST') // method
      expect(writeCall.blobs[2]).toMatch(/^req_/) // request_id
      expect(writeCall.doubles).toEqual([201, 75]) // status, duration
    })
  })

  describe('batch event sending', () => {
    it('sends batch events via Pipeline.send individually', async () => {
      const mockPipeline = createMockPipeline()
      const mockCtx = createMockCtx()
      const env: Env = { analytics: mockPipeline as unknown as Env['analytics'] }

      const batcher = new AnalyticsBatcher(env, mockCtx as unknown as ExecutionContext, 3, 60000)

      // Add batch size events
      for (let i = 0; i < 3; i++) {
        batcher.add({
          timestamp: new Date().toISOString(),
          worker_id: `worker-${i}`,
          method: 'GET',
          path: `/path-${i}`,
          status: 200,
          duration_ms: 10 * i,
          request_id: `req_${i}`
        })
      }

      await mockCtx.waitUntil.mock.calls[0][0]

      // Each event sent individually
      expect(mockPipeline.send).toHaveBeenCalledTimes(3)

      // Verify each event
      for (let i = 0; i < 3; i++) {
        const event = mockPipeline.send.mock.calls[i][0] as RequestEvent
        expect(event.worker_id).toBe(`worker-${i}`)
        expect(event.path).toBe(`/path-${i}`)
      }
    })

    it('sends batch events via AnalyticsEngine.writeDataPoint individually', async () => {
      const mockAnalyticsEngine = createMockAnalyticsEngine()
      const mockCtx = createMockCtx()
      const env: Env = { analytics: mockAnalyticsEngine as unknown as Env['analytics'] }

      const batcher = new AnalyticsBatcher(env, mockCtx as unknown as ExecutionContext, 3, 60000)

      // Add batch size events
      for (let i = 0; i < 3; i++) {
        batcher.add({
          timestamp: new Date().toISOString(),
          worker_id: `worker-${i}`,
          method: 'GET',
          path: `/path-${i}`,
          status: 200 + i,
          duration_ms: 10 * i,
          request_id: `req_${i}`
        })
      }

      await mockCtx.waitUntil.mock.calls[0][0]

      // Each event written individually
      expect(mockAnalyticsEngine.writeDataPoint).toHaveBeenCalledTimes(3)

      // Verify each data point
      for (let i = 0; i < 3; i++) {
        const dataPoint = mockAnalyticsEngine.writeDataPoint.mock.calls[i][0]
        expect(dataPoint.indexes).toEqual([`worker-${i}`])
        expect(dataPoint.blobs[0]).toBe(`/path-${i}`)
        expect(dataPoint.doubles[0]).toBe(200 + i)
      }
    })
  })

  describe('edge cases', () => {
    it('handles object with both send and writeDataPoint (prefers Pipeline)', async () => {
      // Edge case: an object that has both methods (should use Pipeline's send)
      const hybridBinding = {
        send: vi.fn().mockResolvedValue(undefined),
        writeDataPoint: vi.fn()
      }
      const mockCtx = createMockCtx()
      const env: Env = { analytics: hybridBinding as unknown as Env['analytics'] }

      const request = createTestRequest('/test')
      const response = createTestResponse(200)

      captureRequestEvent(request, response, 'worker-1', 50, env, mockCtx as unknown as ExecutionContext)
      await mockCtx.waitUntil.mock.calls[0][0]

      // Should use send (Pipeline) since 'send' in analytics is true
      expect(hybridBinding.send).toHaveBeenCalledTimes(1)
      expect(hybridBinding.writeDataPoint).not.toHaveBeenCalled()
    })
  })
})
