/**
 * RelationshipMixin Tests
 *
 * Tests for the RelationshipMixin that provides cascade operations
 * for relationships between Durable Objects.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DOCore, type DOState, type DOEnv } from '../src/index.js'
import {
  applyRelationshipMixin,
  RelationshipBase,
  type RelationshipDefinition,
  type CascadeEvent,
  type CascadeOperation,
  type QueuedCascade,
} from '../src/relationship-mixin.js'
import { createMockState } from './helpers.js'

// Create test class using the mixin
const RelationshipDO = applyRelationshipMixin(DOCore)

// Mock DO namespace and stub for cascade tests
function createMockDONamespace(responses: Map<string, Response> = new Map()) {
  const stubs = new Map<string, { fetch: ReturnType<typeof vi.fn> }>()

  return {
    idFromName: vi.fn((name: string) => ({
      toString: () => name,
      equals: (other: { toString: () => string }) => other.toString() === name,
    })),
    idFromString: vi.fn((hexId: string) => ({
      toString: () => hexId,
      equals: (other: { toString: () => string }) => other.toString() === hexId,
    })),
    newUniqueId: vi.fn(() => {
      const id = `unique-${crypto.randomUUID()}`
      return {
        toString: () => id,
        equals: (other: { toString: () => string }) => other.toString() === id,
      }
    }),
    get: vi.fn((id: { toString: () => string }) => {
      const idStr = id.toString()
      if (!stubs.has(idStr)) {
        stubs.set(idStr, {
          fetch: vi.fn(async () => {
            return responses.get(idStr) ?? new Response('OK', { status: 200 })
          }),
        })
      }
      return stubs.get(idStr)!
    }),
    _stubs: stubs,
  }
}

describe('RelationshipMixin', () => {
  describe('Mixin Application', () => {
    it('should create a class with Relationship methods', () => {
      expect(RelationshipDO).toBeDefined()
      expect(RelationshipDO.prototype.defineRelation).toBeDefined()
      expect(RelationshipDO.prototype.undefineRelation).toBeDefined()
      expect(RelationshipDO.prototype.hasRelation).toBeDefined()
      expect(RelationshipDO.prototype.getRelation).toBeDefined()
      expect(RelationshipDO.prototype.listRelations).toBeDefined()
      expect(RelationshipDO.prototype.triggerCascade).toBeDefined()
      expect(RelationshipDO.prototype.processSoftCascades).toBeDefined()
      expect(RelationshipDO.prototype.getQueuedCascades).toBeDefined()
      expect(RelationshipDO.prototype.onCascadeEvent).toBeDefined()
      expect(RelationshipDO.prototype.offCascadeEvent).toBeDefined()
    })

    it('should extend DOCore', () => {
      const state = createMockState()
      const instance = new RelationshipDO(state, {})

      expect(instance).toBeInstanceOf(DOCore)
    })
  })

  describe('Relationship Definition', () => {
    let instance: InstanceType<typeof RelationshipDO>

    beforeEach(() => {
      const state = createMockState()
      instance = new RelationshipDO(state, {})
    })

    describe('defineRelation()', () => {
      it('should define a relationship with required fields', () => {
        const definition: RelationshipDefinition = {
          type: '->',
          targetDOBinding: 'POSTS',
          targetIdResolver: (entity) => (entity as { id: string }).id,
        }

        instance.defineRelation('user-posts', definition)

        expect(instance.hasRelation('user-posts')).toBe(true)
      })

      it('should define a relationship with all options', () => {
        const definition: RelationshipDefinition = {
          type: '~>',
          targetDOBinding: 'COMMENTS',
          targetIdResolver: (entity) => (entity as { id: string }).id,
          cascadeFields: ['authorId', 'authorName'],
          onDelete: 'nullify',
          onUpdate: 'ignore',
        }

        instance.defineRelation('user-comments', definition)

        const stored = instance.getRelation('user-comments')
        expect(stored).toBeDefined()
        expect(stored?.type).toBe('~>')
        expect(stored?.cascadeFields).toEqual(['authorId', 'authorName'])
        expect(stored?.onDelete).toBe('nullify')
        expect(stored?.onUpdate).toBe('ignore')
      })

      it('should set default values for onDelete and onUpdate', () => {
        instance.defineRelation('test', {
          type: '->',
          targetDOBinding: 'TEST',
          targetIdResolver: () => 'id',
        })

        const stored = instance.getRelation('test')
        expect(stored?.onDelete).toBe('cascade')
        expect(stored?.onUpdate).toBe('cascade')
      })

      it('should throw for invalid relationship type', () => {
        expect(() => {
          instance.defineRelation('invalid', {
            type: 'invalid' as any,
            targetDOBinding: 'TEST',
            targetIdResolver: () => 'id',
          })
        }).toThrow('Invalid relationship type')
      })

      it('should throw for missing targetDOBinding', () => {
        expect(() => {
          instance.defineRelation('invalid', {
            type: '->',
            targetDOBinding: '',
            targetIdResolver: () => 'id',
          })
        }).toThrow('targetDOBinding is required')
      })

      it('should throw for non-function targetIdResolver', () => {
        expect(() => {
          instance.defineRelation('invalid', {
            type: '->',
            targetDOBinding: 'TEST',
            targetIdResolver: 'not a function' as any,
          })
        }).toThrow('targetIdResolver must be a function')
      })

      it('should support all relationship types', () => {
        const types: Array<'->' | '<-' | '~>' | '<~'> = ['->', '<-', '~>', '<~']

        types.forEach((type, index) => {
          instance.defineRelation(`rel-${index}`, {
            type,
            targetDOBinding: 'TEST',
            targetIdResolver: () => 'id',
          })
          expect(instance.getRelation(`rel-${index}`)?.type).toBe(type)
        })
      })
    })

    describe('undefineRelation()', () => {
      it('should remove an existing relationship', () => {
        instance.defineRelation('test', {
          type: '->',
          targetDOBinding: 'TEST',
          targetIdResolver: () => 'id',
        })

        const removed = instance.undefineRelation('test')

        expect(removed).toBe(true)
        expect(instance.hasRelation('test')).toBe(false)
      })

      it('should return false for non-existent relationship', () => {
        const removed = instance.undefineRelation('nonexistent')

        expect(removed).toBe(false)
      })
    })

    describe('hasRelation()', () => {
      it('should return true for existing relationship', () => {
        instance.defineRelation('test', {
          type: '->',
          targetDOBinding: 'TEST',
          targetIdResolver: () => 'id',
        })

        expect(instance.hasRelation('test')).toBe(true)
      })

      it('should return false for non-existent relationship', () => {
        expect(instance.hasRelation('nonexistent')).toBe(false)
      })
    })

    describe('getRelation()', () => {
      it('should return relationship definition', () => {
        const definition: RelationshipDefinition = {
          type: '->',
          targetDOBinding: 'TEST',
          targetIdResolver: () => 'id',
        }

        instance.defineRelation('test', definition)

        const stored = instance.getRelation('test')
        expect(stored).toBeDefined()
        expect(stored?.targetDOBinding).toBe('TEST')
      })

      it('should return undefined for non-existent relationship', () => {
        const stored = instance.getRelation('nonexistent')

        expect(stored).toBeUndefined()
      })
    })

    describe('listRelations()', () => {
      it('should return empty array when no relationships defined', () => {
        const relations = instance.listRelations()

        expect(relations).toEqual([])
      })

      it('should return all defined relationships', () => {
        instance.defineRelation('rel1', {
          type: '->',
          targetDOBinding: 'TEST1',
          targetIdResolver: () => 'id1',
        })
        instance.defineRelation('rel2', {
          type: '~>',
          targetDOBinding: 'TEST2',
          targetIdResolver: () => 'id2',
        })

        const relations = instance.listRelations()

        expect(relations).toHaveLength(2)
        expect(relations.find(r => r.name === 'rel1')).toBeDefined()
        expect(relations.find(r => r.name === 'rel2')).toBeDefined()
      })
    })
  })

  describe('Hard Cascade Operations', () => {
    let instance: InstanceType<typeof RelationshipDO>
    let mockDONamespace: ReturnType<typeof createMockDONamespace>
    let state: DOState

    beforeEach(() => {
      state = createMockState()
      mockDONamespace = createMockDONamespace()

      const env: DOEnv = {
        POSTS: mockDONamespace,
      }

      instance = new RelationshipDO(state, env)

      instance.defineRelation('user-posts', {
        type: '->',
        targetDOBinding: 'POSTS',
        targetIdResolver: (entity) => (entity as { id: string }).id,
        onDelete: 'cascade',
      })
    })

    describe('triggerCascade()', () => {
      it('should execute hard cascade synchronously', async () => {
        const entity = { id: 'user-123', name: 'John' }

        const results = await instance.triggerCascade('delete', entity)

        expect(results).toHaveLength(1)
        expect(results[0]?.success).toBe(true)
        expect(results[0]?.isHard).toBe(true)
        expect(results[0]?.relationshipName).toBe('user-posts')
        expect(results[0]?.targetId).toBe('user-123')
      })

      it('should call target DO with cascade request', async () => {
        const entity = { id: 'user-123', name: 'John' }

        await instance.triggerCascade('delete', entity)

        expect(mockDONamespace.idFromName).toHaveBeenCalledWith('user-123')
        expect(mockDONamespace.get).toHaveBeenCalled()

        const stub = mockDONamespace._stubs.get('user-123')
        expect(stub?.fetch).toHaveBeenCalled()
      })

      it('should include correct headers in cascade request', async () => {
        const entity = { id: 'user-123', name: 'John' }

        await instance.triggerCascade('delete', entity)

        const stub = mockDONamespace._stubs.get('user-123')
        const fetchCall = stub?.fetch.mock.calls[0]
        const request = fetchCall?.[0] as Request

        expect(request.headers.get('X-Cascade-Action')).toBe('cascade-delete')
        expect(request.headers.get('X-Cascade-Relationship')).toBe('user-posts')
        expect(request.headers.get('Content-Type')).toBe('application/json')
      })

      it('should handle cascade failure', async () => {
        // Create namespace with error response
        const errorNamespace = createMockDONamespace(
          new Map([['user-123', new Response('Error', { status: 500 })]])
        )

        const env: DOEnv = { POSTS: errorNamespace }
        const errorInstance = new RelationshipDO(createMockState(), env)

        errorInstance.defineRelation('user-posts', {
          type: '->',
          targetDOBinding: 'POSTS',
          targetIdResolver: (entity) => (entity as { id: string }).id,
        })

        const results = await errorInstance.triggerCascade('delete', { id: 'user-123' })

        expect(results[0]?.success).toBe(false)
        expect(results[0]?.error).toContain('500')
      })

      it('should handle missing DO binding', async () => {
        const env: DOEnv = {} // No POSTS binding
        const errorInstance = new RelationshipDO(createMockState(), env)

        errorInstance.defineRelation('user-posts', {
          type: '->',
          targetDOBinding: 'POSTS',
          targetIdResolver: (entity) => (entity as { id: string }).id,
        })

        const results = await errorInstance.triggerCascade('delete', { id: 'user-123' })

        expect(results[0]?.success).toBe(false)
        expect(results[0]?.error).toContain('DO binding not found')
      })

      it('should handle targetIdResolver error', async () => {
        instance.defineRelation('broken', {
          type: '->',
          targetDOBinding: 'POSTS',
          targetIdResolver: () => {
            throw new Error('Cannot resolve ID')
          },
        })

        const results = await instance.triggerCascade('delete', { id: 'user-123' })

        const brokenResult = results.find(r => r.relationshipName === 'broken')
        expect(brokenResult?.success).toBe(false)
        expect(brokenResult?.error).toContain('Failed to resolve target ID')
      })

      it('should cascade on create operation', async () => {
        const entity = { id: 'user-123', name: 'John' }

        const results = await instance.triggerCascade('create', entity)

        expect(results[0]?.success).toBe(true)

        const stub = mockDONamespace._stubs.get('user-123')
        const request = stub?.fetch.mock.calls[0]?.[0] as Request
        expect(request.headers.get('X-Cascade-Action')).toBe('cascade-create')
      })

      it('should cascade on update operation', async () => {
        const entity = { id: 'user-123', name: 'John Updated' }

        const results = await instance.triggerCascade('update', entity)

        expect(results[0]?.success).toBe(true)

        const stub = mockDONamespace._stubs.get('user-123')
        const request = stub?.fetch.mock.calls[0]?.[0] as Request
        expect(request.headers.get('X-Cascade-Action')).toBe('cascade-update')
      })

      it('should skip update cascade when onUpdate is ignore', async () => {
        instance.undefineRelation('user-posts')
        instance.defineRelation('user-posts', {
          type: '->',
          targetDOBinding: 'POSTS',
          targetIdResolver: (entity) => (entity as { id: string }).id,
          onUpdate: 'ignore',
        })

        const results = await instance.triggerCascade('update', { id: 'user-123' })

        // Should have no results since update is ignored
        expect(results).toHaveLength(0)
      })

      it('should handle nullify on delete', async () => {
        instance.undefineRelation('user-posts')
        instance.defineRelation('user-posts', {
          type: '->',
          targetDOBinding: 'POSTS',
          targetIdResolver: (entity) => (entity as { id: string }).id,
          onDelete: 'nullify',
          cascadeFields: ['authorId'],
        })

        await instance.triggerCascade('delete', { id: 'user-123' })

        const stub = mockDONamespace._stubs.get('user-123')
        const request = stub?.fetch.mock.calls[0]?.[0] as Request
        expect(request.headers.get('X-Cascade-Action')).toBe('cascade-nullify')
      })

      it('should track cascade duration', async () => {
        const results = await instance.triggerCascade('delete', { id: 'user-123' })

        expect(results[0]?.durationMs).toBeGreaterThanOrEqual(0)
      })
    })
  })

  describe('Soft Cascade Operations', () => {
    let instance: InstanceType<typeof RelationshipDO>
    let state: DOState

    beforeEach(() => {
      state = createMockState()
      const mockDONamespace = createMockDONamespace()

      const env: DOEnv = {
        NOTIFICATIONS: mockDONamespace,
      }

      instance = new RelationshipDO(state, env)

      instance.defineRelation('user-notifications', {
        type: '~>',
        targetDOBinding: 'NOTIFICATIONS',
        targetIdResolver: (entity) => (entity as { id: string }).id,
      })
    })

    describe('triggerCascade() for soft cascades', () => {
      it('should queue soft cascade instead of executing immediately', async () => {
        const entity = { id: 'user-123', name: 'John' }

        const results = await instance.triggerCascade('delete', entity)

        expect(results[0]?.success).toBe(true)
        expect(results[0]?.isHard).toBe(false)

        const queued = await instance.getQueuedCascades()
        expect(queued).toHaveLength(1)
        expect(queued[0]?.relationshipName).toBe('user-notifications')
        expect(queued[0]?.operation).toBe('delete')
        expect(queued[0]?.targetId).toBe('user-123')
      })

      it('should store entity data in queued cascade', async () => {
        const entity = { id: 'user-123', name: 'John', email: 'john@example.com' }

        await instance.triggerCascade('delete', entity)

        const queued = await instance.getQueuedCascades()
        expect(queued[0]?.entity).toEqual(entity)
      })
    })

    describe('getQueuedCascades()', () => {
      it('should return empty array when no cascades queued', async () => {
        const queued = await instance.getQueuedCascades()

        expect(queued).toEqual([])
      })

      it('should return all queued cascades', async () => {
        await instance.triggerCascade('delete', { id: 'user-1' })
        await instance.triggerCascade('delete', { id: 'user-2' })
        await instance.triggerCascade('update', { id: 'user-3' })

        const queued = await instance.getQueuedCascades()

        expect(queued).toHaveLength(3)
      })
    })

    describe('processSoftCascades()', () => {
      it('should process queued cascades', async () => {
        await instance.triggerCascade('delete', { id: 'user-123' })

        // Verify queued
        let queued = await instance.getQueuedCascades()
        expect(queued).toHaveLength(1)

        // Process
        const results = await instance.processSoftCascades()

        expect(results).toHaveLength(1)
        expect(results[0]?.success).toBe(true)
        expect(results[0]?.isHard).toBe(false) // Marked as soft

        // Verify removed from queue
        queued = await instance.getQueuedCascades()
        expect(queued).toHaveLength(0)
      })

      it('should keep failed cascades in queue', async () => {
        // Create with failing namespace
        const failingNamespace = createMockDONamespace(
          new Map([['user-123', new Response('Error', { status: 500 })]])
        )

        const failingEnv: DOEnv = { NOTIFICATIONS: failingNamespace }
        const failingInstance = new RelationshipDO(createMockState(), failingEnv)

        failingInstance.defineRelation('user-notifications', {
          type: '~>',
          targetDOBinding: 'NOTIFICATIONS',
          targetIdResolver: (entity) => (entity as { id: string }).id,
        })

        await failingInstance.triggerCascade('delete', { id: 'user-123' })

        // Process (should fail)
        const results = await failingInstance.processSoftCascades()
        expect(results[0]?.success).toBe(false)

        // Should still be in queue
        const queued = await failingInstance.getQueuedCascades()
        expect(queued).toHaveLength(1)
        expect(queued[0]?.retryCount).toBe(1)
      })

      it('should remove cascade if relationship no longer exists', async () => {
        await instance.triggerCascade('delete', { id: 'user-123' })

        // Remove the relationship
        instance.undefineRelation('user-notifications')

        // Process
        await instance.processSoftCascades()

        // Should be removed from queue
        const queued = await instance.getQueuedCascades()
        expect(queued).toHaveLength(0)
      })
    })
  })

  describe('Mixed Hard and Soft Cascades', () => {
    let instance: InstanceType<typeof RelationshipDO>

    beforeEach(() => {
      const state = createMockState()
      const mockDONamespace1 = createMockDONamespace()
      const mockDONamespace2 = createMockDONamespace()

      const env: DOEnv = {
        POSTS: mockDONamespace1,
        NOTIFICATIONS: mockDONamespace2,
      }

      instance = new RelationshipDO(state, env)

      // Hard cascade
      instance.defineRelation('user-posts', {
        type: '->',
        targetDOBinding: 'POSTS',
        targetIdResolver: (entity) => (entity as { id: string }).id,
      })

      // Soft cascade
      instance.defineRelation('user-notifications', {
        type: '~>',
        targetDOBinding: 'NOTIFICATIONS',
        targetIdResolver: (entity) => (entity as { id: string }).id,
      })
    })

    it('should execute hard cascades and queue soft cascades', async () => {
      const results = await instance.triggerCascade('delete', { id: 'user-123' })

      // Should have both results
      expect(results).toHaveLength(2)

      // Hard cascade executed
      const hardResult = results.find(r => r.relationshipName === 'user-posts')
      expect(hardResult?.isHard).toBe(true)
      expect(hardResult?.success).toBe(true)

      // Soft cascade queued
      const softResult = results.find(r => r.relationshipName === 'user-notifications')
      expect(softResult?.isHard).toBe(false)
      expect(softResult?.success).toBe(true)

      // Check queue
      const queued = await instance.getQueuedCascades()
      expect(queued).toHaveLength(1)
      expect(queued[0]?.relationshipName).toBe('user-notifications')
    })
  })

  describe('Cascade Events', () => {
    let instance: InstanceType<typeof RelationshipDO>
    let mockDONamespace: ReturnType<typeof createMockDONamespace>

    beforeEach(() => {
      const state = createMockState()
      mockDONamespace = createMockDONamespace()

      const env: DOEnv = {
        POSTS: mockDONamespace,
      }

      instance = new RelationshipDO(state, env)

      instance.defineRelation('user-posts', {
        type: '->',
        targetDOBinding: 'POSTS',
        targetIdResolver: (entity) => (entity as { id: string }).id,
      })
    })

    it('should emit cascade:started event', async () => {
      const events: CascadeEvent[] = []
      instance.onCascadeEvent((event) => events.push(event))

      await instance.triggerCascade('delete', { id: 'user-123' })

      const startedEvent = events.find(e => e.type === 'cascade:started')
      expect(startedEvent).toBeDefined()
      expect(startedEvent?.relationshipName).toBe('user-posts')
      expect(startedEvent?.operation).toBe('delete')
    })

    it('should emit cascade:completed event on success', async () => {
      const events: CascadeEvent[] = []
      instance.onCascadeEvent((event) => events.push(event))

      await instance.triggerCascade('delete', { id: 'user-123' })

      const completedEvent = events.find(e => e.type === 'cascade:completed')
      expect(completedEvent).toBeDefined()
    })

    it('should emit cascade:failed event on failure', async () => {
      const failingNamespace = createMockDONamespace(
        new Map([['user-123', new Response('Error', { status: 500 })]])
      )

      const failingEnv: DOEnv = { POSTS: failingNamespace }
      const failingInstance = new RelationshipDO(createMockState(), failingEnv)

      failingInstance.defineRelation('user-posts', {
        type: '->',
        targetDOBinding: 'POSTS',
        targetIdResolver: (entity) => (entity as { id: string }).id,
      })

      const events: CascadeEvent[] = []
      failingInstance.onCascadeEvent((event) => events.push(event))

      await failingInstance.triggerCascade('delete', { id: 'user-123' })

      const failedEvent = events.find(e => e.type === 'cascade:failed')
      expect(failedEvent).toBeDefined()
      expect(failedEvent?.error).toBeDefined()
    })

    it('should emit cascade:queued event for soft cascades', async () => {
      instance.defineRelation('soft-rel', {
        type: '~>',
        targetDOBinding: 'POSTS',
        targetIdResolver: (entity) => (entity as { id: string }).id,
      })

      const events: CascadeEvent[] = []
      instance.onCascadeEvent((event) => events.push(event))

      await instance.triggerCascade('delete', { id: 'user-123' })

      const queuedEvent = events.find(e => e.type === 'cascade:queued')
      expect(queuedEvent).toBeDefined()
      expect(queuedEvent?.relationshipName).toBe('soft-rel')
    })

    it('should support multiple event handlers', async () => {
      const events1: CascadeEvent[] = []
      const events2: CascadeEvent[] = []

      instance.onCascadeEvent((event) => events1.push(event))
      instance.onCascadeEvent((event) => events2.push(event))

      await instance.triggerCascade('delete', { id: 'user-123' })

      expect(events1.length).toBeGreaterThan(0)
      expect(events2.length).toBe(events1.length)
    })

    it('should unregister event handlers', async () => {
      const events: CascadeEvent[] = []
      const handler = (event: CascadeEvent) => events.push(event)

      instance.onCascadeEvent(handler)
      instance.offCascadeEvent(handler)

      await instance.triggerCascade('delete', { id: 'user-123' })

      expect(events).toHaveLength(0)
    })

    it('should handle async event handlers', async () => {
      let processed = false
      instance.onCascadeEvent(async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        processed = true
      })

      await instance.triggerCascade('delete', { id: 'user-123' })

      expect(processed).toBe(true)
    })

    it('should not throw if event handler errors', async () => {
      instance.onCascadeEvent(() => {
        throw new Error('Handler error')
      })

      await expect(
        instance.triggerCascade('delete', { id: 'user-123' })
      ).resolves.toBeDefined()
    })
  })

  describe('Restrict Behavior', () => {
    it('should throw when delete is restricted and cascade fails', async () => {
      const state = createMockState()
      const mockDONamespace = createMockDONamespace(
        new Map([['user-123', new Response('Has related entities', { status: 409 })]])
      )

      const env: DOEnv = { POSTS: mockDONamespace }
      const restrictInstance = new RelationshipDO(state, env)

      restrictInstance.defineRelation('user-posts', {
        type: '->',
        targetDOBinding: 'POSTS',
        targetIdResolver: (entity) => (entity as { id: string }).id,
        onDelete: 'restrict',
      })

      await expect(
        restrictInstance.triggerCascade('delete', { id: 'user-123' })
      ).rejects.toThrow('Delete restricted by relationship')
    })
  })

  describe('RelationshipBase', () => {
    it('should work as pre-composed class', () => {
      const state = createMockState()
      const instance = new RelationshipBase(state, {})

      expect(instance).toBeInstanceOf(DOCore)
      expect(typeof instance.defineRelation).toBe('function')
      expect(typeof instance.triggerCascade).toBe('function')
    })

    it('should support defining relationships', () => {
      const state = createMockState()
      const instance = new RelationshipBase(state, {})

      instance.defineRelation('test', {
        type: '->',
        targetDOBinding: 'TEST',
        targetIdResolver: () => 'id',
      })

      expect(instance.hasRelation('test')).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty entity', async () => {
      const state = createMockState()
      const mockDONamespace = createMockDONamespace()
      const env: DOEnv = { POSTS: mockDONamespace }
      const instance = new RelationshipDO(state, env)

      instance.defineRelation('test', {
        type: '->',
        targetDOBinding: 'POSTS',
        targetIdResolver: () => 'fixed-id',
      })

      const results = await instance.triggerCascade('delete', {})

      expect(results).toHaveLength(1)
      expect(results[0]?.targetId).toBe('fixed-id')
    })

    it('should handle null targetId from resolver', async () => {
      const state = createMockState()
      const mockDONamespace = createMockDONamespace()
      const env: DOEnv = { POSTS: mockDONamespace }
      const instance = new RelationshipDO(state, env)

      instance.defineRelation('test', {
        type: '->',
        targetDOBinding: 'POSTS',
        targetIdResolver: (entity) => (entity as { id?: string }).id ?? '',
      })

      const results = await instance.triggerCascade('delete', { notId: 'value' })

      expect(results[0]?.targetId).toBe('')
    })

    it('should handle multiple cascades to same target', async () => {
      const state = createMockState()
      const mockDONamespace = createMockDONamespace()
      const env: DOEnv = { POSTS: mockDONamespace }
      const instance = new RelationshipDO(state, env)

      instance.defineRelation('rel1', {
        type: '->',
        targetDOBinding: 'POSTS',
        targetIdResolver: (entity) => (entity as { id: string }).id,
      })

      instance.defineRelation('rel2', {
        type: '->',
        targetDOBinding: 'POSTS',
        targetIdResolver: (entity) => (entity as { id: string }).id,
      })

      const results = await instance.triggerCascade('delete', { id: 'user-123' })

      expect(results).toHaveLength(2)
      expect(results.every(r => r.success)).toBe(true)
    })
  })
})
