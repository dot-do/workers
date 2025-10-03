import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MCPServer } from '../src/index'
import type { Env } from '../src/types'

describe('MCP Server', () => {
  let server: MCPServer
  let mockEnv: Env

  beforeEach(() => {
    mockEnv = {
      DB: {
        query: vi.fn(),
        get: vi.fn(),
        list: vi.fn(),
        upsert: vi.fn(),
        delete: vi.fn(),
        search: vi.fn()
      },
      AI: {
        generate: vi.fn(),
        stream: vi.fn(),
        embed: vi.fn(),
        analyze: vi.fn()
      },
      AUTH: {
        validateToken: vi.fn(),
        createApiKey: vi.fn(),
        listApiKeys: vi.fn(),
        revokeApiKey: vi.fn()
      },
      QUEUE: {
        enqueue: vi.fn(),
        getStatus: vi.fn(),
        listJobs: vi.fn()
      },
      WORKFLOWS: {
        start: vi.fn(),
        getStatus: vi.fn(),
        listWorkflows: vi.fn(),
        listExecutions: vi.fn()
      }
    } as unknown as Env

    server = new MCPServer({} as any, mockEnv)
  })

  describe('Health Check', () => {
    it('should return health status', async () => {
      const request = new Request('http://localhost/health')
      const response = await server.fetch(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        status: 'ok',
        service: 'mcp-server',
        version: '1.0.0'
      })
    })
  })

  describe('Server Info', () => {
    it('should return server capabilities', async () => {
      const request = new Request('http://localhost/')
      const response = await server.fetch(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.name).toBe('do-mcp-server')
      expect(data.protocol).toBe('mcp/2024-11-05')
      expect(data.capabilities).toHaveProperty('tools')
      expect(data.capabilities).toHaveProperty('resources')
    })
  })

  describe('JSON-RPC Protocol', () => {
    it('should handle initialize request', async () => {
      const request = new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {} },
            clientInfo: { name: 'test-client', version: '1.0.0' }
          }
        })
      })

      const response = await server.fetch(request)
      const data = await response.json()

      expect(data.jsonrpc).toBe('2.0')
      expect(data.id).toBe(1)
      expect(data.result).toHaveProperty('protocolVersion', '2024-11-05')
      expect(data.result).toHaveProperty('capabilities')
      expect(data.result).toHaveProperty('serverInfo')
    })

    it('should reject invalid JSON-RPC version', async () => {
      const request = new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '1.0',
          id: 1,
          method: 'initialize'
        })
      })

      const response = await server.fetch(request)
      const data = await response.json()

      expect(data.jsonrpc).toBe('2.0')
      expect(data.error).toBeDefined()
      expect(data.error.code).toBe(-32600)
    })

    it('should handle unknown method', async () => {
      const request = new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'unknown_method'
        })
      })

      const response = await server.fetch(request)
      const data = await response.json()

      expect(data.jsonrpc).toBe('2.0')
      expect(data.error).toBeDefined()
      expect(data.error.code).toBe(-32601)
      expect(data.error.message).toContain('Method not found')
    })
  })

  describe('Tools', () => {
    it('should list all tools for authenticated users', async () => {
      mockEnv.AUTH.validateToken = vi.fn().mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com'
      })

      const request = new Request('http://localhost/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list'
        })
      })

      const response = await server.fetch(request)
      const data = await response.json()

      expect(data.jsonrpc).toBe('2.0')
      expect(data.result).toHaveProperty('tools')
      expect(Array.isArray(data.result.tools)).toBe(true)
      expect(data.result.tools.length).toBeGreaterThan(15) // Should have 20+ tools
    })

    it('should list only public tools for anonymous users', async () => {
      const request = new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list'
        })
      })

      const response = await server.fetch(request)
      const data = await response.json()

      expect(data.jsonrpc).toBe('2.0')
      expect(data.result).toHaveProperty('tools')
      expect(Array.isArray(data.result.tools)).toBe(true)
      // Should only have public tools (db_search)
      expect(data.result.tools.length).toBeLessThan(5)
    })
  })

  describe('Resources', () => {
    it('should list available resources', async () => {
      const request = new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'resources/list'
        })
      })

      const response = await server.fetch(request)
      const data = await response.json()

      expect(data.jsonrpc).toBe('2.0')
      expect(data.result).toHaveProperty('resources')
      expect(Array.isArray(data.result.resources)).toBe(true)
      expect(data.result.resources.length).toBeGreaterThan(0)
    })

    it('should read resource content', async () => {
      const request = new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'resources/read',
          params: { uri: 'docs://tool-catalog' }
        })
      })

      const response = await server.fetch(request)
      const data = await response.json()

      expect(data.jsonrpc).toBe('2.0')
      expect(data.result).toHaveProperty('contents')
      expect(Array.isArray(data.result.contents)).toBe(true)
      expect(data.result.contents[0]).toHaveProperty('uri')
      expect(data.result.contents[0]).toHaveProperty('text')
    })
  })

  describe('Tool Execution', () => {
    it('should execute db_search without authentication', async () => {
      mockEnv.DB.search = vi.fn().mockResolvedValue({
        results: [
          { id: 'test-1', score: 0.9 },
          { id: 'test-2', score: 0.8 }
        ]
      })

      const request = new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'db_search',
            arguments: {
              query: 'test query',
              mode: 'hybrid',
              limit: 10
            }
          }
        })
      })

      const response = await server.fetch(request)
      const data = await response.json()

      expect(data.jsonrpc).toBe('2.0')
      expect(data.result).toBeDefined()
      expect(mockEnv.DB.search).toHaveBeenCalledWith({
        query: 'test query',
        mode: 'hybrid',
        limit: 10,
        alpha: 0.5
      })
    })

    it('should require authentication for protected tools', async () => {
      const request = new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'db_upsert',
            arguments: {
              namespace: 'test',
              id: 'test-id',
              type: 'Thing',
              data: { name: 'Test' }
            }
          }
        })
      })

      const response = await server.fetch(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.jsonrpc).toBe('2.0')
      expect(data.error).toBeDefined()
      expect(data.error.code).toBe(-32000)
      expect(data.error.message).toContain('Authentication required')
    })

    it('should execute authenticated tools with valid token', async () => {
      mockEnv.AUTH.validateToken = vi.fn().mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com'
      })

      mockEnv.DB.upsert = vi.fn().mockResolvedValue({
        success: true,
        id: 'test-id'
      })

      const request = new Request('http://localhost/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'db_upsert',
            arguments: {
              namespace: 'user:user-123',
              id: 'test-id',
              type: 'Thing',
              data: { name: 'Test Entity' }
            }
          }
        })
      })

      const response = await server.fetch(request)
      const data = await response.json()

      expect(data.jsonrpc).toBe('2.0')
      expect(data.result).toBeDefined()
      expect(data.result.success).toBe(true)
      expect(mockEnv.DB.upsert).toHaveBeenCalled()
    })
  })
})
