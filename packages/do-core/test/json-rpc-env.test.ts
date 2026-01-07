/**
 * RED Phase TDD: json-rpc.ts Workers Environment Compatibility Tests
 *
 * These tests define the contract for Workers-compatible environment variable
 * access in JSON-RPC handlers.
 *
 * Problem: process.env is NOT available in Cloudflare Workers runtime.
 * Environment variables must come from wrangler bindings instead.
 *
 * Contract Requirements:
 * 1. Configuration works with Workers env bindings
 * 2. process.env is NOT accessed at runtime
 * 3. Fallback behavior when env vars are missing
 * 4. Compatible with vitest-pool-workers
 *
 * All tests should FAIL initially - implementation comes in GREEN phase.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createJsonRpcHandler,
  type JsonRpcHandler,
  type JsonRpcEnv,
} from '../src/json-rpc'

describe('JSON-RPC Workers Environment Compatibility', () => {
  let handler: JsonRpcHandler
  let originalProcessEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    handler = createJsonRpcHandler()
    // Save original process.env
    originalProcessEnv = { ...process.env }
  })

  afterEach(() => {
    // Restore original process.env
    process.env = originalProcessEnv
    vi.restoreAllMocks()
  })

  describe('Environment Bindings (not process.env)', () => {
    it('should get API_KEY from env bindings, not process.env', () => {
      // Set up conflicting values
      process.env.API_KEY = 'process-env-key-should-not-use'
      const env: JsonRpcEnv = { API_KEY: 'workers-binding-key' }

      const config = handler.getConfig(env)

      expect(config.apiKey).toBe('workers-binding-key')
      expect(config.apiKey).not.toBe('process-env-key-should-not-use')
    })

    it('should get DEBUG from env bindings, not process.env', () => {
      process.env.DEBUG = 'true'
      const env: JsonRpcEnv = { DEBUG: 'false' }

      const config = handler.getConfig(env)

      expect(config.debug).toBe(false)
    })

    it('should get MAX_BODY_SIZE from env bindings', () => {
      const env: JsonRpcEnv = { MAX_BODY_SIZE: '1048576' } // 1MB

      const config = handler.getConfig(env)

      expect(config.maxBodySize).toBe(1048576)
    })

    it('should get REQUEST_TIMEOUT from env bindings', () => {
      const env: JsonRpcEnv = { REQUEST_TIMEOUT: '30000' } // 30s

      const config = handler.getConfig(env)

      expect(config.timeout).toBe(30000)
    })

    it('should parse CORS_ORIGINS from env bindings', () => {
      const env: JsonRpcEnv = { CORS_ORIGINS: 'https://example.com,https://api.example.com' }

      const config = handler.getConfig(env)

      expect(config.corsOrigins).toEqual(['https://example.com', 'https://api.example.com'])
    })
  })

  describe('Fallback Behavior', () => {
    it('should use default maxBodySize when not specified', () => {
      const env: JsonRpcEnv = {}

      const config = handler.getConfig(env)

      expect(config.maxBodySize).toBe(1024 * 1024) // Default 1MB
    })

    it('should use default timeout when not specified', () => {
      const env: JsonRpcEnv = {}

      const config = handler.getConfig(env)

      expect(config.timeout).toBe(30000) // Default 30s
    })

    it('should default debug to false when not specified', () => {
      const env: JsonRpcEnv = {}

      const config = handler.getConfig(env)

      expect(config.debug).toBe(false)
    })

    it('should handle undefined apiKey gracefully', () => {
      const env: JsonRpcEnv = {}

      const config = handler.getConfig(env)

      expect(config.apiKey).toBeUndefined()
    })

    it('should default corsOrigins to empty array', () => {
      const env: JsonRpcEnv = {}

      const config = handler.getConfig(env)

      expect(config.corsOrigins).toEqual([])
    })
  })

  describe('process.env Access Prevention', () => {
    it('should prefer env binding over process.env when both exist', () => {
      // This test validates that even if process.env has a value,
      // the handler should use the Workers env binding instead
      const originalApiKey = process.env.API_KEY
      process.env.API_KEY = 'process-env-value-should-be-ignored'

      try {
        const env: JsonRpcEnv = { API_KEY: 'workers-binding-value' }
        const config = handler.getConfig(env)

        // The implementation must use env binding, not process.env
        expect(config.apiKey).toBe('workers-binding-value')
      } finally {
        if (originalApiKey !== undefined) {
          process.env.API_KEY = originalApiKey
        } else {
          delete process.env.API_KEY
        }
      }
    })

    it('should work when process object is not available (Workers-like)', () => {
      // Simulate Workers environment where process might not exist
      // by testing that the handler only uses the env parameter
      const env: JsonRpcEnv = { API_KEY: 'test-key', DEBUG: 'true' }

      // The implementation should only read from the env parameter
      // and never reference process.env
      const config = handler.getConfig(env)

      expect(config.apiKey).toBe('test-key')
      expect(config.debug).toBe(true)
    })

    it('should not fail when env binding is empty', () => {
      const env: JsonRpcEnv = {}

      // Should use defaults, not fall back to process.env
      const config = handler.getConfig(env)

      // Defaults should be applied
      expect(config.maxBodySize).toBe(1024 * 1024)
      expect(config.timeout).toBe(30000)
      expect(config.debug).toBe(false)
    })

    it('should explicitly NOT read from process.env', () => {
      // Set conflicting values in process.env
      const originalEnv = { ...process.env }
      process.env.DEBUG = 'true'
      process.env.MAX_BODY_SIZE = '999999'
      process.env.REQUEST_TIMEOUT = '1'

      try {
        // Pass empty env bindings
        const env: JsonRpcEnv = {}
        const config = handler.getConfig(env)

        // Should use DEFAULTS, not process.env values
        // If implementation reads process.env, these would not be defaults
        expect(config.debug).toBe(false) // Default, not process.env.DEBUG='true'
        expect(config.maxBodySize).toBe(1024 * 1024) // Default, not 999999
        expect(config.timeout).toBe(30000) // Default, not 1
      } finally {
        process.env = originalEnv
      }
    })
  })

  describe('Request Handling with Env', () => {
    it('should pass env to request handler', async () => {
      const env: JsonRpcEnv = {
        API_KEY: 'secret-key',
        DEBUG: 'true',
      }
      const request = new Request('https://example.com/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'ping',
          id: 1,
        }),
      })

      const response = await handler.handle(request, env)

      expect(response).toBeInstanceOf(Response)
      expect(response.headers.get('Content-Type')).toBe('application/json')
    })

    it('should use API_KEY from env for authentication', async () => {
      const env: JsonRpcEnv = { API_KEY: 'valid-key' }
      const request = new Request('https://example.com/rpc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-key',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'secure.method',
          id: 1,
        }),
      })

      const response = await handler.handle(request, env)

      expect(response.status).not.toBe(401)
    })

    it('should reject invalid API_KEY', async () => {
      const env: JsonRpcEnv = { API_KEY: 'correct-key' }
      const request = new Request('https://example.com/rpc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer wrong-key',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'secure.method',
          id: 1,
        }),
      })

      const response = await handler.handle(request, env)

      expect(response.status).toBe(401)
    })

    it('should respect DEBUG env binding for logging', async () => {
      const consoleSpy = vi.spyOn(console, 'log')
      const env: JsonRpcEnv = { DEBUG: 'true' }
      const request = new Request('https://example.com/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'test',
          id: 1,
        }),
      })

      await handler.handle(request, env)

      // Debug mode should enable logging
      expect(consoleSpy).toHaveBeenCalled()
    })

    it('should respect MAX_BODY_SIZE env binding', async () => {
      const env: JsonRpcEnv = { MAX_BODY_SIZE: '100' } // 100 bytes
      const largeBody = JSON.stringify({
        jsonrpc: '2.0',
        method: 'test',
        params: { data: 'x'.repeat(200) }, // Exceeds limit
        id: 1,
      })
      const request = new Request('https://example.com/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: largeBody,
      })

      const response = await handler.handle(request, env)

      expect(response.status).toBe(413) // Payload Too Large
    })
  })

  describe('JSON-RPC Protocol', () => {
    it('should return valid JSON-RPC 2.0 response', async () => {
      const env: JsonRpcEnv = {}
      const request = new Request('https://example.com/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'ping',
          id: 1,
        }),
      })

      const response = await handler.handle(request, env)
      const body = await response.json()

      expect(body).toHaveProperty('jsonrpc', '2.0')
      expect(body).toHaveProperty('id', 1)
      expect(body).toHaveProperty('result')
    })

    it('should handle method not found error', async () => {
      const env: JsonRpcEnv = {}
      const request = new Request('https://example.com/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'nonexistent.method',
          id: 1,
        }),
      })

      const response = await handler.handle(request, env)
      const body = await response.json()

      expect(body).toHaveProperty('jsonrpc', '2.0')
      expect(body).toHaveProperty('error')
      expect(body.error.code).toBe(-32601) // Method not found
    })

    it('should handle parse error for invalid JSON', async () => {
      const env: JsonRpcEnv = {}
      const request = new Request('https://example.com/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not valid json',
      })

      const response = await handler.handle(request, env)
      const body = await response.json()

      expect(body).toHaveProperty('error')
      expect(body.error.code).toBe(-32700) // Parse error
    })

    it('should handle batch requests', async () => {
      const env: JsonRpcEnv = {}
      const request = new Request('https://example.com/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([
          { jsonrpc: '2.0', method: 'ping', id: 1 },
          { jsonrpc: '2.0', method: 'ping', id: 2 },
        ]),
      })

      const response = await handler.handle(request, env)
      const body = await response.json()

      expect(Array.isArray(body)).toBe(true)
      expect(body).toHaveLength(2)
    })
  })

  describe('CORS Configuration from Env', () => {
    it('should set CORS headers from env bindings', async () => {
      const env: JsonRpcEnv = { CORS_ORIGINS: 'https://example.com' }
      const request = new Request('https://example.com/rpc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://example.com',
        },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'ping', id: 1 }),
      })

      const response = await handler.handle(request, env)

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com')
    })

    it('should reject requests from disallowed origins', async () => {
      const env: JsonRpcEnv = { CORS_ORIGINS: 'https://allowed.com' }
      const request = new Request('https://example.com/rpc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://evil.com',
        },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'ping', id: 1 }),
      })

      const response = await handler.handle(request, env)

      expect(response.headers.get('Access-Control-Allow-Origin')).not.toBe('https://evil.com')
    })

    it('should handle OPTIONS preflight requests', async () => {
      const env: JsonRpcEnv = { CORS_ORIGINS: 'https://example.com' }
      const request = new Request('https://example.com/rpc', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://example.com',
          'Access-Control-Request-Method': 'POST',
        },
      })

      const response = await handler.handle(request, env)

      expect(response.status).toBe(204)
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST')
    })
  })

  describe('Workers Runtime Compatibility', () => {
    it('should not rely on Node.js globals', async () => {
      // In Workers, Node.js globals like Buffer, __dirname, etc. don't exist
      const env: JsonRpcEnv = { API_KEY: 'test' }
      const request = new Request('https://example.com/rpc', {
        method: 'POST',
        body: JSON.stringify({ jsonrpc: '2.0', method: 'ping', id: 1 }),
      })

      // Should not throw due to missing Node.js globals
      const response = await handler.handle(request, env)
      expect(response).toBeInstanceOf(Response)
    })

    it('should use Web Crypto API, not Node crypto', async () => {
      // Workers use Web Crypto, not Node.js crypto
      const env: JsonRpcEnv = {}
      const request = new Request('https://example.com/rpc', {
        method: 'POST',
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'generateId',
          id: 1,
        }),
      })

      const response = await handler.handle(request, env)
      const body = await response.json()

      // Should have generated an ID using crypto.randomUUID()
      expect(body.result).toBeDefined()
    })

    it('should handle Request and Response correctly', async () => {
      const env: JsonRpcEnv = {}
      const headers = new Headers({ 'Content-Type': 'application/json' })
      const request = new Request('https://example.com/rpc', {
        method: 'POST',
        headers,
        body: JSON.stringify({ jsonrpc: '2.0', method: 'echo', params: ['hello'], id: 1 }),
      })

      const response = await handler.handle(request, env)

      expect(response).toBeInstanceOf(Response)
      expect(response.headers).toBeInstanceOf(Headers)
    })
  })
})
