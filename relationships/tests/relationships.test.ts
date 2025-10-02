import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RelationshipsServiceLogic } from '../src/service'

describe('RelationshipsServiceLogic', () => {
  let service: RelationshipsServiceLogic
  let mockDB: any

  beforeEach(() => {
    // Mock database
    mockDB = {
      get: vi.fn(),
      put: vi.fn(),
      sql: vi.fn(),
    }

    service = new RelationshipsServiceLogic(mockDB)
  })

  describe('getRelationships', () => {
    it('should get outgoing relationships', async () => {
      const mockRelationships = [
        {
          ns: 'relationship',
          id: 'onet-software-developers-skills-schema-Programming',
          type: 'skills',
          fromNs: 'onet',
          fromId: 'software-developers',
          toNs: 'schema',
          toId: 'Programming',
          data: {},
          visibility: 'public',
        },
      ]

      mockDB.sql.mockResolvedValue({ data: mockRelationships })

      const result = await service.getRelationships('onet', 'software-developers')
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('skills')
      expect(mockDB.sql).toHaveBeenCalledWith(expect.stringContaining('WHERE fromNs = ? AND fromId = ?'), 'onet', 'software-developers', expect.any(Number), expect.any(Number))
    })

    it('should filter by relationship type', async () => {
      mockDB.sql.mockResolvedValue({ data: [] })

      await service.getRelationships('onet', 'software-developers', { type: 'skills' })
      expect(mockDB.sql).toHaveBeenCalledWith(expect.stringContaining('AND type = ?'), 'onet', 'software-developers', 'skills', expect.any(Number), expect.any(Number))
    })

    it('should respect limit and offset', async () => {
      mockDB.sql.mockResolvedValue({ data: [] })

      await service.getRelationships('onet', 'software-developers', {
        limit: 50,
        offset: 10,
      })

      expect(mockDB.sql).toHaveBeenCalledWith(expect.any(String), 'onet', 'software-developers', 50, 10)
    })

    it('should enrich with "to" thing data when requested', async () => {
      const mockRelationships = [
        {
          toNs: 'schema',
          toId: 'Programming',
        },
      ]

      const mockThing = { id: 'Programming', type: 'Skill' }

      mockDB.sql.mockResolvedValue({ data: mockRelationships })
      mockDB.get.mockResolvedValue(mockThing)

      const result = await service.getRelationships('onet', 'software-developers', {
        includeTo: true,
      })

      expect(result[0].toThing).toEqual(mockThing)
      expect(mockDB.get).toHaveBeenCalledWith('https://schema/Programming')
    })
  })

  describe('getIncomingRelationships', () => {
    it('should get incoming relationships', async () => {
      const mockRelationships = [
        {
          type: 'skills',
          fromNs: 'onet',
          fromId: 'software-developers',
          toNs: 'schema',
          toId: 'Programming',
        },
      ]

      mockDB.sql.mockResolvedValue({ data: mockRelationships })

      const result = await service.getIncomingRelationships('schema', 'Programming')
      expect(result).toHaveLength(1)
      expect(result[0].fromNs).toBe('onet')
      expect(mockDB.sql).toHaveBeenCalledWith(expect.stringContaining('WHERE toNs = ? AND toId = ?'), 'schema', 'Programming', expect.any(Number), expect.any(Number))
    })
  })

  describe('createRelationship', () => {
    it('should create a relationship', async () => {
      const mockFrom = { id: 'software-developers' }
      const mockTo = { id: 'Programming' }

      mockDB.get.mockImplementation((url: string) => {
        if (url.includes('software-developers')) return Promise.resolve(mockFrom)
        if (url.includes('Programming')) return Promise.resolve(mockTo)
        return Promise.resolve(null)
      })

      mockDB.sql.mockResolvedValue({ data: [] }) // No existing relationships (no cycle)
      mockDB.put.mockResolvedValue(undefined)

      const input = {
        type: 'skills',
        fromNs: 'onet',
        fromId: 'software-developers',
        toNs: 'schema',
        toId: 'Programming',
        data: { level: 'expert' },
      }

      const result = await service.createRelationship(input)

      expect(result.type).toBe('skills')
      expect(result.fromNs).toBe('onet')
      expect(result.toNs).toBe('schema')
      expect(result.data).toEqual({ level: 'expert' })
      expect(mockDB.put).toHaveBeenCalledWith(expect.stringContaining('https://relationship/'), expect.objectContaining(input))
    })

    it('should throw if source thing not found', async () => {
      mockDB.get.mockResolvedValue(null)

      const input = {
        type: 'skills',
        fromNs: 'onet',
        fromId: 'nonexistent',
        toNs: 'schema',
        toId: 'Programming',
      }

      await expect(service.createRelationship(input)).rejects.toThrow('Source or target thing not found')
    })

    it.skip('should throw if target thing not found', async () => {
      const mockFrom = { id: 'software-developers' }
      mockDB.get.mockImplementation((url: string) => {
        if (url.includes('software-developers')) return Promise.resolve(mockFrom)
        return Promise.resolve(null)
      })

      const input = {
        type: 'skills',
        fromNs: 'onet',
        fromId: 'software-developers',
        toNs: 'schema',
        toId: 'nonexistent',
      }

      await expect(service.createRelationship(input)).rejects.toThrow('Source or target thing not found')
    })

    it('should throw if would create cycle', async () => {
      const mockFrom = { id: 'A' }

      mockDB.get.mockImplementation(() => Promise.resolve(mockFrom))

      // Mock cycle: B -> A already exists
      mockDB.sql.mockResolvedValue({
        data: [
          {
            fromNs: 'test',
            fromId: 'B',
            toNs: 'test',
            toId: 'A',
            type: 'related',
          },
        ],
      })

      const input = {
        type: 'related',
        fromNs: 'test',
        fromId: 'A',
        toNs: 'test',
        toId: 'B',
      }

      await expect(service.createRelationship(input)).rejects.toThrow('Would create circular relationship')
    })

    it('should validate input schema', async () => {
      const invalidInput = {
        type: '',
        fromNs: 'test',
        fromId: 'A',
        toNs: 'test',
        toId: 'B',
      }

      await expect(service.createRelationship(invalidInput as any)).rejects.toThrow()
    })
  })

  describe('deleteRelationship', () => {
    it('should delete a relationship', async () => {
      mockDB.sql.mockResolvedValue(undefined)

      await service.deleteRelationship('test-rel-id')

      expect(mockDB.sql).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM relationships'), 'test-rel-id')
    })
  })

  describe('getRelationshipGraph', () => {
    it('should get relationship graph with depth 1', async () => {
      const mockThing = { id: 'A', type: 'Thing' }
      const mockRelationships = [
        {
          type: 'related',
          fromNs: 'test',
          fromId: 'A',
          toNs: 'test',
          toId: 'B',
          data: {},
        },
      ]
      const mockChildThing = { id: 'B', type: 'Thing' }

      mockDB.get.mockImplementation((url: string) => {
        if (url.includes('/A')) return Promise.resolve(mockThing)
        if (url.includes('/B')) return Promise.resolve(mockChildThing)
        return Promise.resolve(null)
      })

      mockDB.sql.mockResolvedValue({ data: mockRelationships })

      const result = await service.getRelationshipGraph('test', 'A', 1)

      expect(result.thing).toEqual(mockThing)
      expect(result.relationships).toHaveLength(1)
      expect(result.relationships[0].node).toBeDefined()
      expect(result.relationships[0].node!.thing).toEqual(mockChildThing)
    })

    it('should respect max depth of 5', async () => {
      await expect(service.getRelationshipGraph('test', 'A', 6)).rejects.toThrow('Depth must be between 0 and 5')
    })

    it('should throw if thing not found', async () => {
      mockDB.get.mockResolvedValue(null)

      await expect(service.getRelationshipGraph('test', 'nonexistent', 1)).rejects.toThrow('Thing not found')
    })

    it('should handle depth 0 (no traversal)', async () => {
      const mockThing = { id: 'A', type: 'Thing' }
      const mockRelationships = [{ type: 'related', toNs: 'test', toId: 'B' }]

      mockDB.get.mockResolvedValue(mockThing)
      mockDB.sql.mockResolvedValue({ data: mockRelationships })

      const result = await service.getRelationshipGraph('test', 'A', 0)

      expect(result.thing).toEqual(mockThing)
      expect(result.relationships).toHaveLength(1)
      expect(result.relationships[0].node).toBeUndefined()
    })
  })

  describe('wouldCreateCycle', () => {
    it('should detect simple cycle (A -> B, B -> A)', async () => {
      mockDB.sql.mockResolvedValue({
        data: [
          {
            fromNs: 'test',
            fromId: 'B',
            toNs: 'test',
            toId: 'A',
          },
        ],
      })

      const input = {
        type: 'related',
        fromNs: 'test',
        fromId: 'A',
        toNs: 'test',
        toId: 'B',
      }

      const result = await service.wouldCreateCycle(input)
      expect(result).toBe(true)
    })

    it('should detect complex cycle (A -> B -> C -> A)', async () => {
      mockDB.sql.mockImplementation((_sql: string, ...params: any[]) => {
        const [ns, id] = params
        if (ns === 'test' && id === 'B') {
          return Promise.resolve({ data: [{ toNs: 'test', toId: 'C' }] })
        }
        if (ns === 'test' && id === 'C') {
          return Promise.resolve({ data: [{ toNs: 'test', toId: 'A' }] })
        }
        return Promise.resolve({ data: [] })
      })

      const input = {
        type: 'related',
        fromNs: 'test',
        fromId: 'A',
        toNs: 'test',
        toId: 'B',
      }

      const result = await service.wouldCreateCycle(input)
      expect(result).toBe(true)
    })

    it('should not detect cycle when none exists', async () => {
      mockDB.sql.mockResolvedValue({ data: [] })

      const input = {
        type: 'related',
        fromNs: 'test',
        fromId: 'A',
        toNs: 'test',
        toId: 'B',
      }

      const result = await service.wouldCreateCycle(input)
      expect(result).toBe(false)
    })

    it('should handle visited nodes correctly', async () => {
      // Create a diamond pattern: A -> B, A -> C, B -> D, C -> D
      // Adding A -> B should not create a cycle
      mockDB.sql.mockImplementation((_sql: string, ...params: any[]) => {
        const [, id] = params
        if (id === 'B') return Promise.resolve({ data: [{ toNs: 'test', toId: 'D' }] })
        if (id === 'C') return Promise.resolve({ data: [{ toNs: 'test', toId: 'D' }] })
        if (id === 'D') return Promise.resolve({ data: [] })
        return Promise.resolve({ data: [] })
      })

      const input = {
        type: 'related',
        fromNs: 'test',
        fromId: 'A',
        toNs: 'test',
        toId: 'B',
      }

      const result = await service.wouldCreateCycle(input)
      expect(result).toBe(false)
    })
  })
})
