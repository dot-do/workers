import { describe, it, expect, vi, beforeEach } from 'vitest'
import app from '../src/index'

describe('Things HTTP API', () => {
  let mockEnv: any

  beforeEach(() => {
    mockEnv = {
      DB: {
        getThing: vi.fn(),
        createThing: vi.fn(),
        updateThing: vi.fn(),
        deleteThing: vi.fn(),
        listThings: vi.fn(),
        searchThings: vi.fn(),
        getRelationshipsFrom: vi.fn(),
      },
    }
  })

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const req = new Request('http://test/health')
      const res = await app.fetch(req, mockEnv)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual({
        status: 'healthy',
        service: 'things',
      })
    })
  })

  describe('GET /things/:ns/:id', () => {
    it('should return 404 when thing not found', async () => {
      mockEnv.DB.getThing.mockResolvedValue(null)

      const req = new Request('http://test/things/test/non-existent')
      const res = await app.fetch(req, mockEnv)

      expect(res.status).toBe(404)
    })

    it('should return thing as JSON', async () => {
      const mockThing = {
        ns: 'test',
        id: 'test-thing',
        type: 'Thing',
        data: { name: 'Test' },
      }

      mockEnv.DB.getThing.mockResolvedValue(mockThing)
      mockEnv.DB.getRelationshipsFrom.mockResolvedValue([])

      const req = new Request('http://test/things/test/test-thing')
      const res = await app.fetch(req, mockEnv)

      expect(res.status).toBe(200)
      expect(res.headers.get('content-type')).toContain('application/json')

      const body = (await res.json()) as any
      expect(body).toMatchObject(mockThing)
      expect(body.relationships).toBeDefined()
    })

    it('should return thing as MDX when format=mdx', async () => {
      const mockThing = {
        ns: 'test',
        id: 'test-thing',
        type: 'Thing',
        data: { name: 'Test' },
      }

      mockEnv.DB.getThing.mockResolvedValue(mockThing)
      mockEnv.DB.getRelationshipsFrom.mockResolvedValue([])

      const req = new Request('http://test/things/test/test-thing?format=mdx')
      const res = await app.fetch(req, mockEnv)

      expect(res.status).toBe(200)
      expect(res.headers.get('content-type')).toBe('text/markdown')

      const body = await res.text()
      expect(body).toContain('---')
      expect(body).toContain('ns: test')
    })

    it('should return thing as JSON-LD when format=json-ld', async () => {
      const mockThing = {
        ns: 'test',
        id: 'test-thing',
        type: 'Person',
        data: { name: 'John' },
      }

      mockEnv.DB.getThing.mockResolvedValue(mockThing)
      mockEnv.DB.getRelationshipsFrom.mockResolvedValue([])

      const req = new Request('http://test/things/test/test-thing?format=json-ld')
      const res = await app.fetch(req, mockEnv)

      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body).toHaveProperty('@context', 'https://schema.org')
      expect(body).toHaveProperty('@type', 'Person')
      expect(body).toHaveProperty('@id')
    })
  })

  describe('GET /things/:ns', () => {
    it('should list things in namespace', async () => {
      const mockThings = [
        { ns: 'test', id: 'thing-1', type: 'Thing' },
        { ns: 'test', id: 'thing-2', type: 'Thing' },
      ]

      mockEnv.DB.listThings.mockResolvedValue(mockThings)

      const req = new Request('http://test/things/test')
      const res = await app.fetch(req, mockEnv)

      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body).toEqual({
        things: mockThings,
        total: 2,
        limit: 100,
        offset: 0,
      })
    })

    it('should support pagination', async () => {
      mockEnv.DB.listThings.mockResolvedValue([])

      const req = new Request('http://test/things/test?limit=50&offset=10')
      const res = await app.fetch(req, mockEnv)

      expect(res.status).toBe(200)
      expect(mockEnv.DB.listThings).toHaveBeenCalledWith('test', undefined, 50, 10)
    })

    it('should support type filtering', async () => {
      mockEnv.DB.listThings.mockResolvedValue([])

      const req = new Request('http://test/things/test?type=Person')
      const res = await app.fetch(req, mockEnv)

      expect(res.status).toBe(200)
      expect(mockEnv.DB.listThings).toHaveBeenCalledWith('test', 'Person', 100, 0)
    })
  })

  describe('GET /search', () => {
    it('should return 400 when query missing', async () => {
      const req = new Request('http://test/search')
      const res = await app.fetch(req, mockEnv)

      expect(res.status).toBe(400)

      const body = await res.json()
      expect(body).toHaveProperty('error')
    })

    it('should search things', async () => {
      const mockResults = [
        { ns: 'test', id: 'result-1', type: 'Thing' },
      ]

      mockEnv.DB.searchThings.mockResolvedValue(mockResults)

      const req = new Request('http://test/search?q=test+query')
      const res = await app.fetch(req, mockEnv)

      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body).toEqual({
        query: 'test query',
        results: mockResults,
        total: 1,
      })
    })

    it('should support namespace filtering', async () => {
      mockEnv.DB.searchThings.mockResolvedValue([])

      const req = new Request('http://test/search?q=test&ns=onet')
      const res = await app.fetch(req, mockEnv)

      expect(res.status).toBe(200)
      expect(mockEnv.DB.searchThings).toHaveBeenCalledWith('test', 'onet', 10)
    })
  })

  describe('POST /things', () => {
    it('should create thing', async () => {
      const mockCreated = {
        ns: 'test',
        id: 'new-thing',
        type: 'Thing',
        data: { name: 'New' },
      }

      mockEnv.DB.createThing.mockResolvedValue(mockCreated)

      const req = new Request('http://test/things', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ns: 'test',
          type: 'Thing',
          data: { name: 'New' },
          visibility: 'public',
        }),
      })

      const res = await app.fetch(req, mockEnv)

      expect(res.status).toBe(201)

      const body = await res.json()
      expect(body).toEqual(mockCreated)
    })

    it('should return 400 on validation error', async () => {
      const req = new Request('http://test/things', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ns: '',
          type: 'Thing',
          data: {},
        }),
      })

      const res = await app.fetch(req, mockEnv)

      expect(res.status).toBe(400)

      const body = await res.json()
      expect(body).toHaveProperty('error', 'Validation error')
      expect(body).toHaveProperty('details')
    })
  })

  describe('PUT /things/:ns/:id', () => {
    it('should update thing', async () => {
      const mockUpdated = {
        ns: 'test',
        id: 'test-thing',
        type: 'Thing',
        data: { name: 'Updated' },
      }

      mockEnv.DB.updateThing.mockResolvedValue(mockUpdated)

      const req = new Request('http://test/things/test/test-thing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: { name: 'Updated' },
        }),
      })

      const res = await app.fetch(req, mockEnv)

      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body).toEqual(mockUpdated)
    })

    it('should return 404 when thing not found', async () => {
      mockEnv.DB.updateThing.mockResolvedValue(null)

      const req = new Request('http://test/things/test/non-existent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: { name: 'Updated' },
        }),
      })

      const res = await app.fetch(req, mockEnv)

      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /things/:ns/:id', () => {
    it('should delete thing', async () => {
      mockEnv.DB.deleteThing.mockResolvedValue(true)

      const req = new Request('http://test/things/test/test-thing', {
        method: 'DELETE',
      })

      const res = await app.fetch(req, mockEnv)

      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body).toEqual({ success: true })
    })

    it('should return 404 when thing not found', async () => {
      mockEnv.DB.deleteThing.mockResolvedValue(false)

      const req = new Request('http://test/things/test/non-existent', {
        method: 'DELETE',
      })

      const res = await app.fetch(req, mockEnv)

      expect(res.status).toBe(404)
    })
  })
})
