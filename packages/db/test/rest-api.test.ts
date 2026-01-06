/**
 * @dotdo/db - REST API Tests (RED Phase)
 *
 * Tests for HATEOAS REST API and Monaco Editor routes.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DB } from '../src/db'

// Mock execution context
const mockCtx = {
  waitUntil: vi.fn(),
  passThroughOnException: vi.fn(),
  storage: {
    sql: {
      exec: vi.fn().mockReturnValue({ toArray: () => [] }),
    },
  },
  acceptWebSocket: vi.fn(),
  setWebSocketAutoResponse: vi.fn(),
}

// Mock environment
const mockEnv = {
  DB_NAMESPACE: {
    idFromName: vi.fn(() => ({ toString: () => 'mock-id' })),
    get: vi.fn(),
  },
}

describe('HATEOAS REST API', () => {
  let db: DB

  beforeEach(() => {
    db = new DB(mockCtx as any, mockEnv)
  })

  describe('Root Discovery (/)', () => {
    it('should return HATEOAS discovery response', async () => {
      const request = new Request('https://database.do/')
      const response = await db.fetch(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/json')

      const body = await response.json() as {
        api: { name: string; version: string }
        links: { self: string; api: string; rpc: string }
        discover: { collections: unknown[]; methods: unknown[]; tools: unknown[] }
      }

      expect(body.api).toBeDefined()
      expect(body.api.name).toBeDefined()
      expect(body.links).toBeDefined()
      expect(body.links.self).toBe('https://database.do')
      expect(body.links.api).toBe('https://database.do/api')
      expect(body.links.rpc).toBe('https://database.do/rpc')
      expect(body.discover).toBeDefined()
      expect(body.discover.collections).toBeDefined()
      expect(body.discover.methods).toBeDefined()
      expect(body.discover.tools).toBeDefined()
    })

    it('should include request metadata', async () => {
      const request = new Request('https://database.do/', {
        headers: {
          'CF-Connecting-IP': '1.2.3.4',
          'CF-IPCountry': 'US',
          'User-Agent': 'TestClient/1.0',
        },
      })
      const response = await db.fetch(request)
      const body = await response.json() as { request: { origin: string; country: string } }

      expect(body.request.origin).toBe('1.2.3.4')
      expect(body.request.country).toBe('US')
    })
  })

  describe('API Routes (/api)', () => {
    describe('GET /api', () => {
      it('should list all collections', async () => {
        const request = new Request('https://database.do/api')
        const response = await db.fetch(request)

        expect(response.status).toBe(200)
        const body = await response.json() as { collections: Array<{ name: string; href: string }> }
        expect(body.collections).toBeDefined()
        expect(Array.isArray(body.collections)).toBe(true)
      })
    })

    describe('GET /api/:resource', () => {
      it('should list documents in collection', async () => {
        const request = new Request('https://database.do/api/users')
        const response = await db.fetch(request)

        expect(response.status).toBe(200)
        const body = await response.json() as { data: unknown[]; links: object }
        expect(body.data).toBeDefined()
        expect(Array.isArray(body.data)).toBe(true)
        expect(body.links).toBeDefined()
      })

      it('should support query parameters for pagination', async () => {
        const request = new Request('https://database.do/api/users?limit=10&offset=5')
        const response = await db.fetch(request)

        expect(response.status).toBe(200)
      })

      it('should support orderBy query parameter', async () => {
        const request = new Request('https://database.do/api/users?orderBy=createdAt&order=desc')
        const response = await db.fetch(request)

        expect(response.status).toBe(200)
      })
    })

    describe('GET /api/:resource/:id', () => {
      it('should return document with HATEOAS links', async () => {
        // First create a document
        const createRequest = new Request('https://database.do/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Test User' }),
        })
        const createResponse = await db.fetch(createRequest)
        const created = await createResponse.json() as { data: { id: string } }

        // Then fetch it
        const request = new Request(`https://database.do/api/users/${created.data.id}`)
        const response = await db.fetch(request)

        expect(response.status).toBe(200)
        const body = await response.json() as {
          data: { id: string; name: string }
          links: { self: string; edit: string; collection: string }
        }

        expect(body.data.name).toBe('Test User')
        expect(body.links.self).toContain(`/api/users/${created.data.id}`)
        expect(body.links.edit).toContain(`/~/users/${created.data.id}`)
        expect(body.links.collection).toContain('/api/users')
      })

      it('should return 404 for non-existent document', async () => {
        const request = new Request('https://database.do/api/users/nonexistent')
        const response = await db.fetch(request)

        expect(response.status).toBe(404)
        const body = await response.json() as { error: string }
        expect(body.error).toBe('Not found')
      })
    })

    describe('POST /api/:resource', () => {
      it('should create document and return with links', async () => {
        const request = new Request('https://database.do/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'New User', email: 'new@example.com' }),
        })
        const response = await db.fetch(request)

        expect(response.status).toBe(201)
        const body = await response.json() as {
          data: { id: string; name: string }
          links: { self: string; edit: string }
        }

        expect(body.data.id).toBeDefined()
        expect(body.data.name).toBe('New User')
        expect(body.links.self).toContain('/api/users/')
        expect(body.links.edit).toContain('/~/users/')
      })
    })

    describe('PUT /api/:resource/:id', () => {
      it('should update document and return with links', async () => {
        // Create first
        const createRequest = new Request('https://database.do/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Original' }),
        })
        const createResponse = await db.fetch(createRequest)
        const created = await createResponse.json() as { data: { id: string } }

        // Update
        const request = new Request(`https://database.do/api/users/${created.data.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Updated' }),
        })
        const response = await db.fetch(request)

        expect(response.status).toBe(200)
        const body = await response.json() as { data: { name: string } }
        expect(body.data.name).toBe('Updated')
      })

      it('should return 404 for non-existent document', async () => {
        const request = new Request('https://database.do/api/users/nonexistent', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Test' }),
        })
        const response = await db.fetch(request)

        expect(response.status).toBe(404)
      })

      it('should return 400 without ID', async () => {
        const request = new Request('https://database.do/api/users', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Test' }),
        })
        const response = await db.fetch(request)

        // PUT without ID should not match the route
        expect(response.status).toBe(405) // Method not allowed for this route
      })
    })

    describe('DELETE /api/:resource/:id', () => {
      it('should delete document', async () => {
        // Create first
        const createRequest = new Request('https://database.do/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'To Delete' }),
        })
        const createResponse = await db.fetch(createRequest)
        const created = await createResponse.json() as { data: { id: string } }

        // Delete
        const request = new Request(`https://database.do/api/users/${created.data.id}`, {
          method: 'DELETE',
        })
        const response = await db.fetch(request)

        expect(response.status).toBe(200)
        const body = await response.json() as { success: boolean }
        expect(body.success).toBe(true)

        // Verify deleted
        const getRequest = new Request(`https://database.do/api/users/${created.data.id}`)
        const getResponse = await db.fetch(getRequest)
        expect(getResponse.status).toBe(404)
      })

      it('should return 404 for non-existent document', async () => {
        const request = new Request('https://database.do/api/users/nonexistent', {
          method: 'DELETE',
        })
        const response = await db.fetch(request)

        expect(response.status).toBe(404)
      })
    })

    describe('Schema Routes', () => {
      it('should return all method schemas', async () => {
        const request = new Request('https://database.do/api/.schema')
        const response = await db.fetch(request)

        expect(response.status).toBe(200)
        const body = await response.json() as Record<string, object>
        expect(body.get).toBeDefined()
        expect(body.list).toBeDefined()
        expect(body.create).toBeDefined()
        expect(body.update).toBeDefined()
        expect(body.delete).toBeDefined()
      })

      it('should return specific method schema', async () => {
        const request = new Request('https://database.do/api/.schema/get')
        const response = await db.fetch(request)

        expect(response.status).toBe(200)
        const body = await response.json() as { params: string[]; returns: string }
        expect(body.params).toBeDefined()
        expect(body.returns).toBeDefined()
      })
    })
  })

  describe('Health Check', () => {
    it('should return health status', async () => {
      const request = new Request('https://database.do/health')
      const response = await db.fetch(request)

      expect(response.status).toBe(200)
      const body = await response.json() as { status: string }
      expect(body.status).toBe('ok')
    })
  })
})

describe('Monaco Editor Routes (/~)', () => {
  let db: DB

  beforeEach(() => {
    db = new DB(mockCtx as any, mockEnv)
  })

  describe('GET /~', () => {
    it('should return collection picker HTML', async () => {
      const request = new Request('https://database.do/~')
      const response = await db.fetch(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/html')

      const html = await response.text()
      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('Collections')
    })
  })

  describe('GET /~/:resource', () => {
    it('should return document list HTML', async () => {
      const request = new Request('https://database.do/~/users')
      const response = await db.fetch(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/html')

      const html = await response.text()
      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('users')
    })
  })

  describe('GET /~/:resource/:id', () => {
    it('should return Monaco editor HTML', async () => {
      // Create a document first
      await db.create('users', { id: 'test-user', name: 'Test' })

      const request = new Request('https://database.do/~/users/test-user')
      const response = await db.fetch(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/html')

      const html = await response.text()
      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('monaco-editor')
      expect(html).toContain('Save')
      expect(html).toContain('users/')
      expect(html).toContain('test-user')
    })

    it('should include save button that PUTs to /api', async () => {
      const request = new Request('https://database.do/~/users/test-id')
      const response = await db.fetch(request)
      const html = await response.text()

      // Check that the save action targets the REST API
      expect(html).toContain('/api/users/test-id')
      expect(html).toContain('PUT')
    })

    it('should support Ctrl+S keyboard shortcut', async () => {
      const request = new Request('https://database.do/~/users/test-id')
      const response = await db.fetch(request)
      const html = await response.text()

      expect(html).toContain('CtrlCmd')
      expect(html).toContain('KeyS')
    })

    it('should show empty JSON for non-existent document', async () => {
      const request = new Request('https://database.do/~/users/nonexistent')
      const response = await db.fetch(request)
      const html = await response.text()

      // Should still render editor with empty object
      expect(html).toContain('{}')
    })
  })
})
