import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ThingsService } from '../src/index'

describe('ThingsService', () => {
  let service: ThingsService
  let mockEnv: any
  let mockCtx: any

  beforeEach(() => {
    // Mock database service
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

    mockCtx = {}
    service = new ThingsService(mockCtx as any, mockEnv)
  })

  describe('getThing', () => {
    it('should return null when thing does not exist', async () => {
      mockEnv.DB.getThing.mockResolvedValue(null)

      const result = await service.getThing('test', 'non-existent')

      expect(result).toBeNull()
      expect(mockEnv.DB.getThing).toHaveBeenCalledWith('test', 'non-existent')
    })

    it('should return thing with relationships', async () => {
      const mockThing = {
        ns: 'test',
        id: 'test-thing',
        type: 'Thing',
        data: { name: 'Test' },
      }

      const mockRelationships = [
        { type: 'related', toNs: 'test', toId: 'other-thing' },
      ]

      mockEnv.DB.getThing.mockResolvedValue(mockThing)
      mockEnv.DB.getRelationshipsFrom.mockResolvedValue(mockRelationships)

      const result = await service.getThing('test', 'test-thing')

      expect(result).toEqual({
        ...mockThing,
        relationships: mockRelationships,
        generations: [],
      })
    })

    it('should format as MDX when requested', async () => {
      const mockThing = {
        ns: 'test',
        id: 'test-thing',
        type: 'Thing',
        data: { name: 'Test Thing' },
        content: 'This is content',
      }

      mockEnv.DB.getThing.mockResolvedValue(mockThing)
      mockEnv.DB.getRelationshipsFrom.mockResolvedValue([])

      const result = await service.getThing('test', 'test-thing', 'mdx')

      expect(typeof result).toBe('string')
      expect(result).toContain('---')
      expect(result).toContain('ns: test')
      expect(result).toContain('id: test-thing')
      expect(result).toContain('# Test Thing')
    })

    it('should format as JSON-LD when requested', async () => {
      const mockThing = {
        ns: 'test',
        id: 'test-thing',
        type: 'Person',
        data: { name: 'John Doe', email: 'john@example.com' },
      }

      mockEnv.DB.getThing.mockResolvedValue(mockThing)
      mockEnv.DB.getRelationshipsFrom.mockResolvedValue([])

      const result = await service.getThing('test', 'test-thing', 'json-ld')

      expect(result).toEqual({
        '@context': 'https://schema.org',
        '@type': 'Person',
        '@id': 'https://test.do/test-thing',
        name: 'John Doe',
        email: 'john@example.com',
      })
    })
  })

  describe('createThing', () => {
    it('should create thing with generated ID', async () => {
      const mockCreated = {
        ns: 'test',
        id: 'new-thing',
        type: 'Thing',
        data: { name: 'New Thing' },
      }

      mockEnv.DB.createThing.mockResolvedValue(mockCreated)

      const result = await service.createThing({
        ns: 'test',
        type: 'Thing',
        data: { name: 'New Thing' },
        visibility: 'public',
      })

      expect(result).toEqual(mockCreated)
      expect(mockEnv.DB.createThing).toHaveBeenCalledWith(
        expect.objectContaining({
          ns: 'test',
          id: 'new-thing',
          type: 'Thing',
          data: { name: 'New Thing' },
          visibility: 'public',
        })
      )
    })

    it('should use provided ID if given', async () => {
      const mockCreated = {
        ns: 'test',
        id: 'custom-id',
        type: 'Thing',
        data: {},
      }

      mockEnv.DB.createThing.mockResolvedValue(mockCreated)

      await service.createThing({
        ns: 'test',
        id: 'custom-id',
        type: 'Thing',
        data: {},
        visibility: 'public',
      })

      expect(mockEnv.DB.createThing).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'custom-id',
        })
      )
    })

    it('should validate input and throw on invalid data', async () => {
      await expect(
        service.createThing({
          ns: '',
          type: 'Thing',
          data: {},
        } as any)
      ).rejects.toThrow()
    })
  })

  describe('updateThing', () => {
    it('should update thing with valid data', async () => {
      const mockUpdated = {
        ns: 'test',
        id: 'test-thing',
        type: 'Thing',
        data: { name: 'Updated' },
      }

      mockEnv.DB.updateThing.mockResolvedValue(mockUpdated)

      const result = await service.updateThing('test', 'test-thing', {
        data: { name: 'Updated' },
      })

      expect(result).toEqual(mockUpdated)
      expect(mockEnv.DB.updateThing).toHaveBeenCalledWith(
        'test',
        'test-thing',
        { data: { name: 'Updated' } }
      )
    })
  })

  describe('deleteThing', () => {
    it('should delete thing and return true', async () => {
      mockEnv.DB.deleteThing.mockResolvedValue(true)

      const result = await service.deleteThing('test', 'test-thing')

      expect(result).toBe(true)
      expect(mockEnv.DB.deleteThing).toHaveBeenCalledWith('test', 'test-thing')
    })
  })

  describe('listThings', () => {
    it('should list things with default options', async () => {
      const mockThings = [
        { ns: 'test', id: 'thing-1', type: 'Thing' },
        { ns: 'test', id: 'thing-2', type: 'Thing' },
      ]

      mockEnv.DB.listThings.mockResolvedValue(mockThings)

      const result = await service.listThings('test')

      expect(result).toEqual(mockThings)
      expect(mockEnv.DB.listThings).toHaveBeenCalledWith('test', undefined, 100, 0)
    })

    it('should list things with custom options', async () => {
      const mockThings = [{ ns: 'test', id: 'thing-1', type: 'Person' }]

      mockEnv.DB.listThings.mockResolvedValue(mockThings)

      await service.listThings('test', {
        type: 'Person',
        limit: 50,
        offset: 10,
      })

      expect(mockEnv.DB.listThings).toHaveBeenCalledWith('test', 'Person', 50, 10)
    })
  })

  describe('searchThings', () => {
    it('should search things', async () => {
      const mockResults = [
        { ns: 'test', id: 'result-1', type: 'Thing' },
        { ns: 'test', id: 'result-2', type: 'Thing' },
      ]

      mockEnv.DB.searchThings.mockResolvedValue(mockResults)

      const result = await service.searchThings('test query', 'test', 20)

      expect(result).toEqual(mockResults)
      expect(mockEnv.DB.searchThings).toHaveBeenCalledWith('test query', 'test', 20)
    })
  })

  describe('slugify', () => {
    it('should convert text to URL-safe slug', () => {
      // Access via creating instance and calling private method via reflection
      const instance = service as any

      expect(instance.slugify('Hello World')).toBe('hello-world')
      expect(instance.slugify('Software Developers')).toBe('software-developers')
      expect(instance.slugify('Test!!123')).toBe('test-123')
      expect(instance.slugify('  trim spaces  ')).toBe('trim-spaces')
    })
  })
})
