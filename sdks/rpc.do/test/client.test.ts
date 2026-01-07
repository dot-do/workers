/**
 * TDD RED Phase Tests for rpc.do client
 *
 * These tests define the expected behavior for WebSocket transport with HTTP fallback.
 * They should ALL FAIL until the GREEN phase implements the functionality.
 *
 * Test coverage:
 * - BaseURL configuration (default and custom)
 * - WebSocket transport (wss:// connection, RPC message format)
 * - HTTP fallback (on WS failure, proper headers)
 * - Transport selection (auto, ws, http modes)
 * - Environment configuration (global env, per-client env)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createClient, DEFAULT_BASE_URL, setEnv, getEnv, getDefaultApiKeySync } from '../index'

// =============================================================================
// Polyfills for test environment
// =============================================================================

// CloseEvent polyfill for Node.js
if (typeof globalThis.CloseEvent === 'undefined') {
  globalThis.CloseEvent = class CloseEvent extends Event {
    code: number
    reason: string
    wasClean: boolean

    constructor(type: string, eventInitDict?: { code?: number; reason?: string; wasClean?: boolean }) {
      super(type)
      this.code = eventInitDict?.code ?? 1000
      this.reason = eventInitDict?.reason ?? ''
      this.wasClean = eventInitDict?.wasClean ?? true
    }
  } as typeof CloseEvent
}

// =============================================================================
// Mock Setup
// =============================================================================

// Mock WebSocket class for transport tests
class MockWebSocket {
  static instances: MockWebSocket[] = []
  static mockBehavior: 'success' | 'fail' | 'timeout' = 'success'

  url: string
  readyState: number = 0 // CONNECTING
  onopen: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  sentMessages: string[] = []

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)

    // Simulate async connection behavior
    setTimeout(() => {
      if (MockWebSocket.mockBehavior === 'success') {
        this.readyState = 1 // OPEN
        this.onopen?.(new Event('open'))
      } else if (MockWebSocket.mockBehavior === 'fail') {
        this.readyState = 3 // CLOSED
        this.onerror?.(new Event('error'))
        this.onclose?.(new CloseEvent('close', { code: 1006, reason: 'Connection failed' }))
      }
      // 'timeout' behavior: never fires events
    }, 10)
  }

  send(data: string) {
    this.sentMessages.push(data)
    // Simulate response for successful connections
    if (this.readyState === 1) {
      const request = JSON.parse(data)
      setTimeout(() => {
        this.onmessage?.(new MessageEvent('message', {
          data: JSON.stringify({
            id: request.id,
            result: { success: true, method: request.method },
          }),
        }))
      }, 5)
    }
  }

  close() {
    this.readyState = 3 // CLOSED
    this.onclose?.(new CloseEvent('close', { code: 1000, reason: 'Normal closure' }))
  }

  static reset() {
    MockWebSocket.instances = []
    MockWebSocket.mockBehavior = 'success'
  }
}

// =============================================================================
// Test Suites
// =============================================================================

describe('rpc.do client', () => {
  let originalFetch: typeof globalThis.fetch
  let originalWebSocket: typeof globalThis.WebSocket
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // Save originals
    originalFetch = globalThis.fetch
    originalWebSocket = globalThis.WebSocket

    // Setup fetch mock
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: { success: true } }),
    })
    globalThis.fetch = fetchMock

    // Setup WebSocket mock
    globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket
    MockWebSocket.reset()

    // Clear global env
    setEnv({})
  })

  afterEach(() => {
    // Restore originals
    globalThis.fetch = originalFetch
    globalThis.WebSocket = originalWebSocket
    vi.restoreAllMocks()
  })

  // ===========================================================================
  // BaseURL Configuration Tests
  // ===========================================================================

  describe('BaseURL Configuration', () => {
    it('should default to https://rpc.do', () => {
      expect(DEFAULT_BASE_URL).toBe('https://rpc.do')
    })

    it('should use custom baseURL when provided', async () => {
      const customBaseURL = 'https://custom.example.com'
      const client = createClient<{ test(): Promise<void> }>('my-service', {
        baseURL: customBaseURL,
        transport: 'http', // Force HTTP for this test
      })

      await client.test()

      expect(fetchMock).toHaveBeenCalledWith(
        `${customBaseURL}/my-service`,
        expect.any(Object)
      )
    })

    it('should use baseURL for all RPC calls', async () => {
      const client = createClient<{
        method1(): Promise<void>
        method2(arg: string): Promise<void>
      }>('test-service', { transport: 'http' })

      await client.method1()
      await client.method2('arg')

      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(fetchMock).toHaveBeenNthCalledWith(1, `${DEFAULT_BASE_URL}/test-service`, expect.any(Object))
      expect(fetchMock).toHaveBeenNthCalledWith(2, `${DEFAULT_BASE_URL}/test-service`, expect.any(Object))
    })

    it('should support deprecated baseUrl option for backwards compatibility', async () => {
      const client = createClient<{ test(): Promise<void> }>('my-service', {
        baseUrl: 'https://legacy.example.com',
        transport: 'http',
      })

      await client.test()

      expect(fetchMock).toHaveBeenCalledWith(
        'https://legacy.example.com/my-service',
        expect.any(Object)
      )
    })

    it('should prefer baseURL over deprecated baseUrl', async () => {
      const client = createClient<{ test(): Promise<void> }>('my-service', {
        baseURL: 'https://new.example.com',
        baseUrl: 'https://old.example.com',
        transport: 'http',
      })

      await client.test()

      expect(fetchMock).toHaveBeenCalledWith(
        'https://new.example.com/my-service',
        expect.any(Object)
      )
    })
  })

  // ===========================================================================
  // WebSocket Transport Tests
  // ===========================================================================

  describe('WebSocket Transport', () => {
    it('should attempt WebSocket connection first when transport is auto', async () => {
      MockWebSocket.mockBehavior = 'success'

      const client = createClient<{ test(): Promise<{ success: boolean }> }>('my-service', {
        transport: 'auto',
      })

      // This test should FAIL because WS transport is not implemented
      // When implemented, WS should be attempted before HTTP
      const result = await client.test()

      // Verify WebSocket was instantiated
      expect(MockWebSocket.instances.length).toBeGreaterThan(0)
      expect(MockWebSocket.instances[0].url).toContain('wss://')
    })

    it('should use wss:// protocol for https:// baseURL', async () => {
      MockWebSocket.mockBehavior = 'success'

      const client = createClient<{ test(): Promise<void> }>('my-service', {
        baseURL: 'https://rpc.do',
        transport: 'ws',
      })

      // Should fail - WS transport not implemented
      await client.test()

      expect(MockWebSocket.instances.length).toBe(1)
      expect(MockWebSocket.instances[0].url).toBe('wss://rpc.do/ws/my-service')
    })

    it('should use ws:// protocol for http:// baseURL', async () => {
      MockWebSocket.mockBehavior = 'success'

      const client = createClient<{ test(): Promise<void> }>('my-service', {
        baseURL: 'http://localhost:8787',
        transport: 'ws',
      })

      await client.test()

      expect(MockWebSocket.instances.length).toBe(1)
      expect(MockWebSocket.instances[0].url).toBe('ws://localhost:8787/ws/my-service')
    })

    it('should handle successful WS connection', async () => {
      MockWebSocket.mockBehavior = 'success'

      const client = createClient<{ getData(): Promise<{ success: boolean; method: string }> }>('my-service', {
        transport: 'ws',
      })

      const result = await client.getData()

      expect(result).toEqual({ success: true, method: 'getData' })
    })

    it('should send RPC requests over WebSocket in JSON-RPC format', async () => {
      MockWebSocket.mockBehavior = 'success'

      const client = createClient<{ myMethod(arg1: string, arg2: number): Promise<void> }>('my-service', {
        transport: 'ws',
      })

      await client.myMethod('hello', 42)

      // Wait for WS connection and message
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(MockWebSocket.instances.length).toBe(1)
      const ws = MockWebSocket.instances[0]
      expect(ws.sentMessages.length).toBe(1)

      const sentRequest = JSON.parse(ws.sentMessages[0])
      expect(sentRequest).toMatchObject({
        method: 'myMethod',
        params: ['hello', 42],
      })
      expect(sentRequest.id).toBeDefined()
    })

    it('should reuse WebSocket connection for multiple calls', async () => {
      MockWebSocket.mockBehavior = 'success'

      const client = createClient<{
        call1(): Promise<void>
        call2(): Promise<void>
      }>('my-service', { transport: 'ws' })

      await client.call1()
      await client.call2()

      // Should reuse same WebSocket connection
      expect(MockWebSocket.instances.length).toBe(1)
      expect(MockWebSocket.instances[0].sentMessages.length).toBe(2)
    })

    it('should handle WS connection timeout', async () => {
      MockWebSocket.mockBehavior = 'timeout'

      const client = createClient<{ test(): Promise<void> }>('my-service', {
        transport: 'ws',
        timeout: 50, // Short timeout for test
      })

      // Should timeout and reject
      await expect(client.test()).rejects.toThrow(/timeout|connection/i)
    }, 2000) // Test timeout
  })

  // ===========================================================================
  // HTTP Fallback Tests
  // ===========================================================================

  describe('HTTP Fallback', () => {
    it('should fall back to HTTP POST when WS connection fails', async () => {
      MockWebSocket.mockBehavior = 'fail'

      const client = createClient<{ test(): Promise<{ success: boolean }> }>('my-service', {
        transport: 'auto',
      })

      const result = await client.test()

      // Should have attempted WebSocket first
      expect(MockWebSocket.instances.length).toBeGreaterThan(0)

      // Should have fallen back to HTTP
      expect(fetchMock).toHaveBeenCalled()
      expect(result).toEqual({ success: true })
    })

    it('should include Content-Type: application/json header', async () => {
      const client = createClient<{ test(): Promise<void> }>('my-service', {
        transport: 'http',
      })

      await client.test()

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )
    })

    it('should include Authorization header when apiKey is provided', async () => {
      const client = createClient<{ test(): Promise<void> }>('my-service', {
        apiKey: 'test-api-key',
        transport: 'http',
      })

      await client.test()

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
          }),
        })
      )
    })

    it('should handle HTTP errors gracefully', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      const client = createClient<{ test(): Promise<void> }>('my-service', {
        transport: 'http',
        retry: { attempts: 1 }, // No retries for this test
      })

      await expect(client.test()).rejects.toThrow(/500|Internal Server Error/)
    })

    it('should handle HTTP 4xx errors without retry', async () => {
      // BUG: Current implementation DOES retry 4xx errors due to try-catch structure
      // The throw on 4xx is caught by the enclosing try-catch and retried
      // This test documents expected behavior - should NOT retry 4xx
      fetchMock.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      })

      const client = createClient<{ test(): Promise<void> }>('my-service', {
        transport: 'http',
        retry: { attempts: 3 },
      })

      await expect(client.test()).rejects.toThrow(/401|Unauthorized/)
      // Expected: Should not retry 4xx errors (client errors)
      // Current bug: Does retry because throw is caught by try-catch
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('should handle HTTP 5xx errors with retry', async () => {
      // 5xx should be retried, 4xx should not
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      const client = createClient<{ test(): Promise<void> }>('my-service', {
        transport: 'http',
        retry: { attempts: 3, delay: 10 },
      })

      await expect(client.test()).rejects.toThrow(/500|Internal Server Error/)
      // Should retry 5xx errors
      expect(fetchMock).toHaveBeenCalledTimes(3)
    })

    it('should retry failed HTTP requests with exponential backoff', async () => {
      fetchMock
        .mockResolvedValueOnce({ ok: false, status: 503, statusText: 'Service Unavailable' })
        .mockResolvedValueOnce({ ok: false, status: 503, statusText: 'Service Unavailable' })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ result: 'ok' }) })

      const client = createClient<{ test(): Promise<string> }>('my-service', {
        transport: 'http',
        retry: { attempts: 3, delay: 10, backoff: 'exponential' },
      })

      const result = await client.test()

      expect(fetchMock).toHaveBeenCalledTimes(3)
      expect(result).toBe('ok')
    })

    it('should handle RPC error responses', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          error: {
            code: -32600,
            message: 'Invalid Request',
            data: { details: 'missing params' },
          },
        }),
      })

      const client = createClient<{ test(): Promise<void> }>('my-service', {
        transport: 'http',
      })

      await expect(client.test()).rejects.toThrow('Invalid Request')
    })
  })

  // ===========================================================================
  // Transport Selection Tests
  // ===========================================================================

  describe('Transport Selection', () => {
    it('should use http transport when explicitly set', async () => {
      const client = createClient<{ test(): Promise<void> }>('my-service', {
        transport: 'http',
      })

      await client.test()

      // Should only use HTTP, not WebSocket
      expect(MockWebSocket.instances.length).toBe(0)
      expect(fetchMock).toHaveBeenCalled()
    })

    it('should use ws transport when explicitly set', async () => {
      MockWebSocket.mockBehavior = 'success'

      const client = createClient<{ test(): Promise<void> }>('my-service', {
        transport: 'ws',
      })

      await client.test()

      // Should use WebSocket, not HTTP
      expect(MockWebSocket.instances.length).toBe(1)
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('should remember WS failure and use HTTP until reconnect', async () => {
      MockWebSocket.mockBehavior = 'fail'

      const client = createClient<{
        call1(): Promise<void>
        call2(): Promise<void>
      }>('my-service', { transport: 'auto' })

      // First call - should try WS, fail, fall back to HTTP
      await client.call1()

      expect(MockWebSocket.instances.length).toBe(1)
      expect(fetchMock).toHaveBeenCalledTimes(1)

      // Reset mock to track second call
      fetchMock.mockClear()
      MockWebSocket.reset()

      // Second call - should skip WS attempt and go directly to HTTP
      await client.call2()

      // Should NOT attempt WS again immediately after failure
      expect(MockWebSocket.instances.length).toBe(0)
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('should emit transport change events', async () => {
      MockWebSocket.mockBehavior = 'fail'

      const transportChangeHandler = vi.fn()

      const client = createClient<{ test(): Promise<void> }>('my-service', {
        transport: 'auto',
        timeout: 100,
      })

      client.on('transportChange', transportChangeHandler)

      await client.test()

      expect(transportChangeHandler).toHaveBeenCalledWith({
        from: 'ws',
        to: 'http',
        reason: expect.any(String),
      })
    }, 2000)

    it('should attempt WS reconnection after backoff period', async () => {
      MockWebSocket.mockBehavior = 'fail'

      const client = createClient<{ test(): Promise<void> }>('my-service', {
        transport: 'auto',
        timeout: 50,
        wsBackoffPeriod: 100, // Short backoff for test
      })

      // First call - WS fails, falls back to HTTP
      await client.test()

      expect(MockWebSocket.instances.length).toBe(1)

      MockWebSocket.reset()
      MockWebSocket.mockBehavior = 'success'

      // Wait for backoff period to pass
      await new Promise(resolve => setTimeout(resolve, 150))

      fetchMock.mockClear()

      // Next call should attempt WS again
      await client.test()

      // Should try WS again after backoff
      expect(MockWebSocket.instances.length).toBe(1)
    }, 2000)

    it('should support forced transport switch via method', async () => {
      const client = createClient<{ test(): Promise<void> }>('my-service', {
        transport: 'auto',
      })

      client.setTransport('http')

      await client.test()

      expect(MockWebSocket.instances.length).toBe(0)
      expect(fetchMock).toHaveBeenCalled()
    })

    it('should expose current transport state', () => {
      const client = createClient<{ test(): Promise<void> }>('my-service', {
        transport: 'auto',
      })

      const transport = client.getTransport()

      expect(['ws', 'http', 'auto', 'connecting']).toContain(transport)
    })
  })

  // ===========================================================================
  // Environment Configuration Tests
  // ===========================================================================

  describe('Environment Configuration', () => {
    it('should use API key from global env when set', async () => {
      setEnv({ DO_API_KEY: 'global-api-key' })

      const client = createClient<{ test(): Promise<void> }>('my-service', {
        transport: 'http',
      })

      await client.test()

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer global-api-key',
          }),
        })
      )
    })

    it('should prefer explicit apiKey over env', async () => {
      setEnv({ DO_API_KEY: 'global-api-key' })

      const client = createClient<{ test(): Promise<void> }>('my-service', {
        apiKey: 'explicit-api-key',
        transport: 'http',
      })

      await client.test()

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer explicit-api-key',
          }),
        })
      )
    })

    it('should support env option for per-client config', async () => {
      setEnv({ DO_API_KEY: 'global-api-key' })

      const client = createClient<{ test(): Promise<void> }>('my-service', {
        env: { DO_API_KEY: 'per-client-api-key' },
        transport: 'http',
      })

      await client.test()

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer per-client-api-key',
          }),
        })
      )
    })

    it('should check multiple env vars for API key', () => {
      // DO_API_KEY takes priority
      setEnv({ ORG_AI_API_KEY: 'org-key', DO_API_KEY: 'do-key' })
      expect(getDefaultApiKeySync()).toBe('do-key')

      // Falls back to ORG_AI_API_KEY
      setEnv({ ORG_AI_API_KEY: 'org-key' })
      expect(getDefaultApiKeySync()).toBe('org-key')

      // Falls back to DO_TOKEN
      setEnv({ DO_TOKEN: 'do-token' })
      expect(getDefaultApiKeySync()).toBe('do-token')

      // Falls back to ORG_AI_TOKEN
      setEnv({ ORG_AI_TOKEN: 'org-token' })
      expect(getDefaultApiKeySync()).toBe('org-token')
    })

    it('should return null from getEnv when not configured', () => {
      // Reset to ensure clean state
      setEnv(null as unknown as Record<string, string>)

      // Note: This relies on setEnv allowing null, which it currently doesn't
      // This test documents expected behavior
      expect(getEnv()).toBeNull()
    })

    it('should use token option when apiKey not provided', async () => {
      const client = createClient<{ test(): Promise<void> }>('my-service', {
        token: 'oauth-token',
        transport: 'http',
      })

      await client.test()

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer oauth-token',
          }),
        })
      )
    })
  })

  // ===========================================================================
  // Connection State Tests
  // ===========================================================================

  describe('Connection State', () => {
    it('should report connection state', () => {
      const client = createClient<{ test(): Promise<void> }>('my-service', {
        transport: 'ws',
      })

      expect(typeof client.isConnected).toBe('function')
      expect(client.isConnected()).toBe(false)
    })

    it('should support disconnect method', async () => {
      MockWebSocket.mockBehavior = 'success'

      const client = createClient<{ test(): Promise<void> }>('my-service', {
        transport: 'ws',
        timeout: 100,
      })

      await client.test()

      expect(typeof client.disconnect).toBe('function')

      await client.disconnect()

      expect(MockWebSocket.instances[0].readyState).toBe(3) // CLOSED
    }, 2000)

    it('should support close method for cleanup', async () => {
      const client = createClient<{ test(): Promise<void> }>('my-service')

      expect(typeof client.close).toBe('function')

      // Should not throw
      await client.close()
    })
  })

  // ===========================================================================
  // Request/Response Handling Tests
  // ===========================================================================

  describe('Request/Response Handling', () => {
    it('should generate unique request IDs', async () => {
      const client = createClient<{ test(): Promise<void> }>('my-service', {
        transport: 'http',
      })

      await client.test()
      await client.test()

      const calls = fetchMock.mock.calls
      const body1 = JSON.parse(calls[0][1].body)
      const body2 = JSON.parse(calls[1][1].body)

      expect(body1.id).toBeDefined()
      expect(body2.id).toBeDefined()
      expect(body1.id).not.toBe(body2.id)
    })

    it('should handle request timeout', async () => {
      // Mock fetch to respect AbortSignal
      fetchMock.mockImplementation((_url: string, init: RequestInit) => {
        return new Promise<Response>((resolve, reject) => {
          const timeoutHandle = setTimeout(() => {
            resolve({
              ok: true,
              json: () => Promise.resolve({ result: 'delayed' }),
            } as Response)
          }, 500)

          // Properly handle abort signal
          if (init?.signal) {
            if (init.signal.aborted) {
              clearTimeout(timeoutHandle)
              reject(new DOMException('The operation was aborted', 'AbortError'))
              return
            }
            init.signal.addEventListener('abort', () => {
              clearTimeout(timeoutHandle)
              reject(new DOMException('The operation was aborted', 'AbortError'))
            })
          }
        })
      })

      const client = createClient<{ test(): Promise<void> }>('my-service', {
        transport: 'http',
        timeout: 50, // Short timeout
        retry: { attempts: 1 },
      })

      await expect(client.test()).rejects.toThrow(/abort/i)
    }, 2000) // Set test timeout

    it('should serialize complex parameters correctly', async () => {
      const client = createClient<{
        complexMethod(data: { nested: { value: number }; array: string[] }): Promise<void>
      }>('my-service', { transport: 'http' })

      const complexData = {
        nested: { value: 42 },
        array: ['a', 'b', 'c'],
      }

      await client.complexMethod(complexData)

      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.params[0]).toEqual(complexData)
    })

    it('should handle null and undefined parameters', async () => {
      const client = createClient<{
        methodWithNulls(a: null, b: undefined, c: string): Promise<void>
      }>('my-service', { transport: 'http' })

      await client.methodWithNulls(null, undefined, 'test')

      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      // Note: JSON.stringify converts undefined to null in arrays
      // This is standard JSON behavior
      expect(body.params).toEqual([null, null, 'test'])
    })

    it('should preserve undefined in params when using WS transport', async () => {
      // WS transport uses JSON which converts undefined to null
      // This test verifies WS is actually used and params are serialized
      MockWebSocket.mockBehavior = 'success'

      const client = createClient<{
        methodWithUndefined(a: null, b: undefined, c: string): Promise<void>
      }>('my-service', { transport: 'ws', timeout: 100 })

      await client.methodWithUndefined(null, undefined, 'test')

      // Verify WS was actually used
      expect(MockWebSocket.instances.length).toBe(1)
      const ws = MockWebSocket.instances[0]

      // WS transport uses JSON, which converts undefined to null in arrays
      const sentRequest = JSON.parse(ws.sentMessages[0])
      // Note: JSON.stringify converts undefined to null in arrays
      expect(sentRequest.params).toEqual([null, null, 'test'])
    }, 2000)
  })

  // ===========================================================================
  // Proxy Behavior Tests
  // ===========================================================================

  describe('Proxy Behavior', () => {
    it('should not be thenable (avoid Promise confusion)', () => {
      const client = createClient<{ test(): Promise<void> }>('my-service')

      expect(client.then).toBeUndefined()
      expect(client.catch).toBeUndefined()
      expect(client.finally).toBeUndefined()
    })

    it('should support arbitrary method names', async () => {
      const client = createClient<{
        getUserById(id: string): Promise<{ id: string }>
        createOrder(items: string[]): Promise<{ orderId: string }>
        'nested.method'(): Promise<void>
      }>('my-service', { transport: 'http' })

      await client.getUserById('123')
      await client.createOrder(['item1', 'item2'])

      expect(fetchMock).toHaveBeenCalledTimes(2)

      const body1 = JSON.parse(fetchMock.mock.calls[0][1].body)
      const body2 = JSON.parse(fetchMock.mock.calls[1][1].body)

      expect(body1.method).toBe('getUserById')
      expect(body2.method).toBe('createOrder')
    })
  })
})
