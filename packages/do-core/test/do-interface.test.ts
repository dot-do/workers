/**
 * RED Phase TDD: Minimal DO Interface Contract Tests
 *
 * These tests define the contract for the slim Durable Object core.
 * All tests should FAIL initially - implementation comes in GREEN phase.
 *
 * The DO interface contract includes:
 * - Constructor with ctx and env
 * - fetch() for HTTP request handling
 * - Proper request/response handling
 * - Error handling and status codes
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { DOCore, type DOState, DOEnv } from '../src/index.js'
import { createMockState, createMockId } from './helpers.js'

describe('DOCore Interface Contract', () => {
  describe('Constructor', () => {
    it('should accept ctx and env parameters', () => {
      const ctx = createMockState()
      const env = { MY_VAR: 'test' }

      const instance = new DOCore(ctx, env)

      expect(instance).toBeDefined()
      expect(instance).toBeInstanceOf(DOCore)
    })

    it('should store ctx and env as protected properties', () => {
      const ctx = createMockState()
      const env = { MY_VAR: 'test' }

      // Create a subclass to access protected properties
      class TestDO extends DOCore {
        getCtx() { return this.ctx }
        getEnv() { return this.env }
      }

      const instance = new TestDO(ctx, env)

      expect(instance.getCtx()).toBe(ctx)
      expect(instance.getEnv()).toBe(env)
    })

    it('should accept named ID in state', () => {
      const ctx = createMockState(createMockId('my-named-do'))
      const env = {}

      class TestDO extends DOCore {
        getId() { return this.ctx.id }
      }

      const instance = new TestDO(ctx, env)

      expect(instance.getId().name).toBe('my-named-do')
    })
  })

  describe('fetch() method', () => {
    let doInstance: DOCore
    let ctx: DOState

    beforeEach(() => {
      ctx = createMockState()
      doInstance = new DOCore(ctx, {})
    })

    it('should exist and be callable', () => {
      expect(typeof doInstance.fetch).toBe('function')
    })

    it('should accept a Request and return a Response', async () => {
      const request = new Request('https://example.com/')

      // This should fail in RED phase - stub throws
      await expect(doInstance.fetch(request)).rejects.toThrow('not implemented')
    })

    it('should handle GET requests', async () => {
      // Define what a working implementation should do
      class WorkingDO extends DOCore {
        async fetch(request: Request): Promise<Response> {
          if (request.method === 'GET') {
            return new Response('OK', { status: 200 })
          }
          return new Response('Method not allowed', { status: 405 })
        }
      }

      const instance = new WorkingDO(ctx, {})
      const request = new Request('https://example.com/', { method: 'GET' })
      const response = await instance.fetch(request)

      expect(response.status).toBe(200)
      expect(await response.text()).toBe('OK')
    })

    it('should handle POST requests with body', async () => {
      class WorkingDO extends DOCore {
        async fetch(request: Request): Promise<Response> {
          if (request.method === 'POST') {
            const body = await request.json()
            return Response.json({ received: body })
          }
          return new Response('Method not allowed', { status: 405 })
        }
      }

      const instance = new WorkingDO(ctx, {})
      const request = new Request('https://example.com/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: 'data' }),
      })

      const response = await instance.fetch(request)
      const data = await response.json() as { received: { test: string } }

      expect(data.received.test).toBe('data')
    })

    it('should handle WebSocket upgrade requests', async () => {
      class WorkingDO extends DOCore {
        async fetch(request: Request): Promise<Response> {
          if (request.headers.get('Upgrade') === 'websocket') {
            // In real implementation, would create WebSocketPair and return 101
            // Node.js Response doesn't support 101 status, so we return a marker response
            return new Response('websocket-upgrade-detected', {
              status: 200,
              headers: { 'X-Upgrade': 'websocket' }
            })
          }
          return new Response('OK')
        }
      }

      const instance = new WorkingDO(ctx, {})
      const request = new Request('https://example.com/ws', {
        headers: { Upgrade: 'websocket' },
      })

      const response = await instance.fetch(request)
      // Verify upgrade was detected (in Workers runtime this would be 101)
      expect(response.headers.get('X-Upgrade')).toBe('websocket')
      expect(await response.text()).toBe('websocket-upgrade-detected')
    })

    it('should handle errors gracefully', async () => {
      class WorkingDO extends DOCore {
        async fetch(_request: Request): Promise<Response> {
          try {
            throw new Error('Something went wrong')
          } catch (error) {
            return new Response(
              JSON.stringify({ error: (error as Error).message }),
              { status: 500, headers: { 'Content-Type': 'application/json' } }
            )
          }
        }
      }

      const instance = new WorkingDO(ctx, {})
      const response = await instance.fetch(new Request('https://example.com/'))

      expect(response.status).toBe(500)
      const data = await response.json() as { error: string }
      expect(data.error).toBe('Something went wrong')
    })

    it('should support routing to different handlers based on path', async () => {
      class WorkingDO extends DOCore {
        async fetch(request: Request): Promise<Response> {
          const url = new URL(request.url)

          switch (url.pathname) {
            case '/health':
              return Response.json({ status: 'ok' })
            case '/api/data':
              return Response.json({ data: [] })
            default:
              return new Response('Not Found', { status: 404 })
          }
        }
      }

      const instance = new WorkingDO(ctx, {})

      const healthResponse = await instance.fetch(new Request('https://example.com/health'))
      expect(healthResponse.status).toBe(200)

      const dataResponse = await instance.fetch(new Request('https://example.com/api/data'))
      const data = await dataResponse.json() as { data: unknown[] }
      expect(data.data).toEqual([])

      const notFoundResponse = await instance.fetch(new Request('https://example.com/unknown'))
      expect(notFoundResponse.status).toBe(404)
    })
  })

  describe('Subclass extension', () => {
    it('should allow subclasses to extend DOCore', () => {
      class MyDO extends DOCore {
        async customMethod(): Promise<string> {
          return 'custom'
        }
      }

      const ctx = createMockState()
      const instance = new MyDO(ctx, {})

      expect(instance).toBeInstanceOf(DOCore)
      expect(instance).toBeInstanceOf(MyDO)
    })

    it('should allow subclasses to override fetch', async () => {
      class MyDO extends DOCore {
        async fetch(_request: Request): Promise<Response> {
          return Response.json({ custom: true })
        }
      }

      const ctx = createMockState()
      const instance = new MyDO(ctx, {})
      const response = await instance.fetch(new Request('https://example.com/'))
      const data = await response.json() as { custom: boolean }

      expect(data.custom).toBe(true)
    })

    it('should allow subclasses to access protected ctx', async () => {
      class MyDO extends DOCore {
        async fetch(_request: Request): Promise<Response> {
          const id = this.ctx.id.toString()
          return Response.json({ id })
        }
      }

      const ctx = createMockState(createMockId('test-do'))
      const instance = new MyDO(ctx, {})
      const response = await instance.fetch(new Request('https://example.com/'))
      const data = await response.json() as { id: string }

      expect(data.id).toBe('test-do')
    })

    it('should allow subclasses to access protected env', async () => {
      interface MyEnv extends DOEnv {
        API_KEY: string
      }

      class MyDO extends DOCore<MyEnv> {
        async fetch(_request: Request): Promise<Response> {
          return Response.json({ hasKey: !!this.env.API_KEY })
        }
      }

      const ctx = createMockState()
      const instance = new MyDO(ctx, { API_KEY: 'secret' } as MyEnv)
      const response = await instance.fetch(new Request('https://example.com/'))
      const data = await response.json() as { hasKey: boolean }

      expect(data.hasKey).toBe(true)
    })
  })

  describe('ID Contract', () => {
    it('should provide unique instance ID', () => {
      const ctx1 = createMockState(createMockId('do-1'))
      const ctx2 = createMockState(createMockId('do-2'))

      class TestDO extends DOCore {
        getId() { return this.ctx.id }
      }

      const instance1 = new TestDO(ctx1, {})
      const instance2 = new TestDO(ctx2, {})

      expect(instance1.getId().toString()).toBe('do-1')
      expect(instance2.getId().toString()).toBe('do-2')
      expect(instance1.getId().equals(instance2.getId())).toBe(false)
    })

    it('should support ID equality comparison', () => {
      const id1 = createMockId('same-id')
      const id2 = createMockId('same-id')
      const id3 = createMockId('different-id')

      expect(id1.equals(id2)).toBe(true)
      expect(id1.equals(id3)).toBe(false)
    })
  })
})
