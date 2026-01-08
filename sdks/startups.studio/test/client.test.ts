/**
 * Tests for startups.studio SDK client
 *
 * These tests verify the SDK structure, exports, and RPC call patterns.
 * The rpc.do client uses a proxy that converts method calls to RPC requests.
 *
 * Note: Nested namespaces (like client.health.check) become method calls
 * with dot-notation method names (e.g., "health.check").
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Startups, startups, type StartupsClient } from '../index'

// =============================================================================
// Mock Setup
// =============================================================================

describe('startups.studio SDK', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: {} }),
    })
    globalThis.fetch = fetchMock
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  // ===========================================================================
  // Client Creation Tests
  // ===========================================================================

  describe('Client Creation', () => {
    it('should create a client with default options', () => {
      const client = Startups()
      expect(client).toBeDefined()
    })

    it('should create a client with custom options', () => {
      const client = Startups({
        apiKey: 'test-api-key',
        baseURL: 'https://custom.startups.studio',
        transport: 'http',
      })
      expect(client).toBeDefined()
    })

    it('should export default client instance', () => {
      expect(startups).toBeDefined()
    })

    it('should not be thenable (avoid Promise confusion)', () => {
      const client = Startups()
      expect(client.then).toBeUndefined()
      expect(client.catch).toBeUndefined()
      expect(client.finally).toBeUndefined()
    })
  })

  // ===========================================================================
  // RPC Call Pattern Tests
  // ===========================================================================

  describe('RPC Call Patterns', () => {
    it('should make POST requests to the RPC endpoint', async () => {
      const client = Startups({ transport: 'http' })
      await client.overview()

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )
    })

    it('should include method name in RPC request body', async () => {
      const client = Startups({ transport: 'http' })
      await client.overview()

      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.method).toBe('overview')
      expect(body.params).toEqual([])
      expect(body.id).toBeDefined()
    })

    it('should include parameters in RPC request body', async () => {
      const client = Startups({ transport: 'http' })
      await client.get('startup_123')

      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.method).toBe('get')
      expect(body.params).toEqual(['startup_123'])
    })

    it('should serialize complex parameters correctly', async () => {
      const client = Startups({ transport: 'http' })
      const newStartup = {
        name: 'Test Startup',
        description: 'A test startup',
        priority: 'high' as const,
        tags: ['saas', 'ai'],
      }

      await client.create(newStartup)

      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.method).toBe('create')
      expect(body.params[0]).toEqual(newStartup)
    })

    it('should generate unique request IDs', async () => {
      const client = Startups({ transport: 'http' })

      await client.list()
      await client.stats()

      const body1 = JSON.parse(fetchMock.mock.calls[0][1].body)
      const body2 = JSON.parse(fetchMock.mock.calls[1][1].body)

      expect(body1.id).toBeDefined()
      expect(body2.id).toBeDefined()
      expect(body1.id).not.toBe(body2.id)
    })
  })

  // ===========================================================================
  // Authentication Tests
  // ===========================================================================

  describe('Authentication', () => {
    it('should include API key in Authorization header', async () => {
      const client = Startups({
        apiKey: 'test-api-key-12345',
        transport: 'http',
      })

      await client.list()

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key-12345',
          }),
        })
      )
    })

    it('should use token option when provided', async () => {
      const client = Startups({
        token: 'oauth-token-xyz',
        transport: 'http',
      })

      await client.list()

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer oauth-token-xyz',
          }),
        })
      )
    })

    it('should prefer apiKey over token', async () => {
      const client = Startups({
        apiKey: 'api-key-wins',
        token: 'token-loses',
        transport: 'http',
      })

      await client.list()

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer api-key-wins',
          }),
        })
      )
    })
  })

  // ===========================================================================
  // Top-level Method Tests
  // ===========================================================================

  describe('Top-level Methods', () => {
    it('should call overview', async () => {
      const client = Startups({ transport: 'http' })
      await client.overview()

      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.method).toBe('overview')
    })

    it('should call stats', async () => {
      const client = Startups({ transport: 'http' })
      await client.stats()

      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.method).toBe('stats')
    })

    it('should call create with startup data', async () => {
      const client = Startups({ transport: 'http' })
      await client.create({ name: 'My Startup', description: 'Test' })

      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.method).toBe('create')
      expect(body.params[0]).toEqual({ name: 'My Startup', description: 'Test' })
    })

    it('should call get with ID', async () => {
      const client = Startups({ transport: 'http' })
      await client.get('startup_123')

      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.method).toBe('get')
      expect(body.params[0]).toBe('startup_123')
    })

    it('should call list with filters', async () => {
      const client = Startups({ transport: 'http' })
      await client.list({ status: 'live', limit: 10 })

      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.method).toBe('list')
      expect(body.params[0]).toEqual({ status: 'live', limit: 10 })
    })

    it('should call update with ID and updates', async () => {
      const client = Startups({ transport: 'http' })
      await client.update('startup_123', { description: 'Updated' })

      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.method).toBe('update')
      expect(body.params[0]).toBe('startup_123')
      expect(body.params[1]).toEqual({ description: 'Updated' })
    })

    it('should call delete with ID', async () => {
      const client = Startups({ transport: 'http' })
      await client.delete('startup_123')

      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.method).toBe('delete')
      expect(body.params[0]).toBe('startup_123')
    })

    it('should call deploy with ID and options', async () => {
      const client = Startups({ transport: 'http' })
      await client.deploy('startup_123', { environment: 'production' })

      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.method).toBe('deploy')
      expect(body.params).toEqual(['startup_123', { environment: 'production' }])
    })

    it('should call rollback with ID and options', async () => {
      const client = Startups({ transport: 'http' })
      await client.rollback('startup_123', { steps: 2 })

      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.method).toBe('rollback')
      expect(body.params).toEqual(['startup_123', { steps: 2 }])
    })

    it('should call deploymentStatus with deployment ID', async () => {
      const client = Startups({ transport: 'http' })
      await client.deploymentStatus('deploy_abc')

      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.method).toBe('deploymentStatus')
      expect(body.params[0]).toBe('deploy_abc')
    })

    it('should call pause', async () => {
      const client = Startups({ transport: 'http' })
      await client.pause('startup_123')

      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.method).toBe('pause')
      expect(body.params[0]).toBe('startup_123')
    })

    it('should call resume', async () => {
      const client = Startups({ transport: 'http' })
      await client.resume('startup_123')

      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.method).toBe('resume')
      expect(body.params[0]).toBe('startup_123')
    })

    it('should call archive', async () => {
      const client = Startups({ transport: 'http' })
      await client.archive('startup_123')

      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.method).toBe('archive')
      expect(body.params[0]).toBe('startup_123')
    })

    it('should call restore', async () => {
      const client = Startups({ transport: 'http' })
      await client.restore('startup_123')

      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.method).toBe('restore')
      expect(body.params[0]).toBe('startup_123')
    })

    it('should call clone with ID and options', async () => {
      const client = Startups({ transport: 'http' })
      await client.clone('startup_123', { name: 'Cloned Startup', includeConfig: true })

      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.method).toBe('clone')
      expect(body.params[0]).toBe('startup_123')
      expect(body.params[1]).toEqual({ name: 'Cloned Startup', includeConfig: true })
    })
  })

  // ===========================================================================
  // Error Handling Tests
  // ===========================================================================

  describe('Error Handling', () => {
    it('should handle RPC errors', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          error: {
            code: -32600,
            message: 'Startup not found',
          },
        }),
      })

      const client = Startups({ transport: 'http' })

      await expect(client.get('nonexistent')).rejects.toThrow('Startup not found')
    })

    it('should handle network errors with retry', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'))

      const client = Startups({
        transport: 'http',
        retry: { attempts: 1 },
      })

      await expect(client.list()).rejects.toThrow('Network error')
    })

    it('should handle HTTP 500 errors', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      const client = Startups({
        transport: 'http',
        retry: { attempts: 1 },
      })

      await expect(client.list()).rejects.toThrow(/500|Internal Server Error/)
    })
  })

  // ===========================================================================
  // Response Handling Tests
  // ===========================================================================

  describe('Response Handling', () => {
    it('should return result from successful RPC response', async () => {
      const expectedStartup = {
        id: 'startup_123',
        name: 'My Startup',
        status: 'live',
      }

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ result: expectedStartup }),
      })

      const client = Startups({ transport: 'http' })
      const result = await client.get('startup_123')

      expect(result).toEqual(expectedStartup)
    })

    it('should return array result from list response', async () => {
      const expectedList = [
        { id: 'startup_1', name: 'Startup 1' },
        { id: 'startup_2', name: 'Startup 2' },
      ]

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ result: expectedList }),
      })

      const client = Startups({ transport: 'http' })
      const result = await client.list()

      expect(result).toEqual(expectedList)
    })
  })

  // ===========================================================================
  // Type Export Tests
  // ===========================================================================

  describe('Type Exports', () => {
    it('should export all required types', async () => {
      // This is a compile-time check - if types are not exported, this would fail
      const types = await import('../types')

      // Verify type definitions exist (they're just types so we check the module loaded)
      expect(types).toBeDefined()
    })
  })

  // ===========================================================================
  // Client Methods Tests
  // ===========================================================================

  describe('Client Methods', () => {
    it('should have isConnected method', () => {
      const client = Startups({ transport: 'http' })
      expect(typeof client.isConnected).toBe('function')
      expect(client.isConnected()).toBe(false)
    })

    it('should have disconnect method', async () => {
      const client = Startups({ transport: 'http' })
      expect(typeof client.disconnect).toBe('function')
      await client.disconnect() // Should not throw
    })

    it('should have close method', async () => {
      const client = Startups({ transport: 'http' })
      expect(typeof client.close).toBe('function')
      await client.close() // Should not throw
    })

    it('should have getTransport method', () => {
      const client = Startups({ transport: 'http' })
      expect(typeof client.getTransport).toBe('function')
      expect(['ws', 'http', 'auto', 'connecting']).toContain(client.getTransport())
    })

    it('should have setTransport method', () => {
      const client = Startups({ transport: 'auto' })
      expect(typeof client.setTransport).toBe('function')
      client.setTransport('http')
      // Should not throw
    })

    it('should have on method for transport events', () => {
      const client = Startups({ transport: 'http' })
      expect(typeof client.on).toBe('function')
      client.on('transportChange', () => {})
      // Should not throw
    })
  })
})
