/**
 * Tests for Projection system (CQRS read models)
 *
 * Projections transform event streams into queryable read models.
 * This is the RED phase - tests define the contract before implementation.
 *
 * @module projections.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  Projection,
  ProjectionHandler,
  ProjectionState,
  ProjectionRegistry,
  type ProjectionOptions,
} from '../src/projections.js'
import type { DomainEvent } from '../src/events.js'
import { createMockStorage, createMockState } from './helpers.js'

// ============================================================================
// Test Types
// ============================================================================

interface UserCreatedEvent {
  userId: string
  name: string
  email: string
}

interface UserUpdatedEvent {
  userId: string
  name?: string
  email?: string
}

interface UserDeletedEvent {
  userId: string
}

interface OrderCreatedEvent {
  orderId: string
  userId: string
  total: number
}

interface OrderCompletedEvent {
  orderId: string
  completedAt: number
}

// Read model types
interface UserReadModel {
  id: string
  name: string
  email: string
  createdAt: number
  updatedAt: number
}

interface UserStatsReadModel {
  totalUsers: number
  activeUsers: number
  deletedUsers: number
}

interface OrderReadModel {
  id: string
  userId: string
  total: number
  status: 'pending' | 'completed'
  createdAt: number
  completedAt?: number
}

// ============================================================================
// Helper functions
// ============================================================================

function createEvent<T>(
  type: string,
  data: T,
  options?: { id?: string; timestamp?: number; aggregateId?: string }
): DomainEvent<T> {
  return {
    id: options?.id ?? crypto.randomUUID(),
    type,
    data,
    timestamp: options?.timestamp ?? Date.now(),
    aggregateId: options?.aggregateId,
  }
}

// ============================================================================
// Projection Tests
// ============================================================================

describe('Projection', () => {
  describe('Handler Registration', () => {
    it('should register projection handlers by event type', () => {
      const projection = new Projection<Map<string, UserReadModel>>('users', {
        initialState: () => new Map(),
      })

      const handler: ProjectionHandler<UserCreatedEvent, Map<string, UserReadModel>> = (
        event,
        state
      ) => {
        state.set(event.data.userId, {
          id: event.data.userId,
          name: event.data.name,
          email: event.data.email,
          createdAt: event.timestamp,
          updatedAt: event.timestamp,
        })
        return state
      }

      projection.when('user:created', handler)

      expect(projection.getHandlers()).toHaveProperty('user:created')
      expect(projection.getHandlerCount()).toBe(1)
    })

    it('should support multiple handlers for different event types', () => {
      const projection = new Projection<Map<string, UserReadModel>>('users', {
        initialState: () => new Map(),
      })

      projection.when('user:created', (event, state) => {
        state.set(event.data.userId, {
          id: event.data.userId,
          name: event.data.name,
          email: event.data.email,
          createdAt: event.timestamp,
          updatedAt: event.timestamp,
        })
        return state
      })

      projection.when<UserUpdatedEvent>('user:updated', (event, state) => {
        const user = state.get(event.data.userId)
        if (user) {
          if (event.data.name) user.name = event.data.name
          if (event.data.email) user.email = event.data.email
          user.updatedAt = event.timestamp
        }
        return state
      })

      projection.when<UserDeletedEvent>('user:deleted', (event, state) => {
        state.delete(event.data.userId)
        return state
      })

      expect(projection.getHandlerCount()).toBe(3)
    })

    it('should throw when registering duplicate handler for same event type', () => {
      const projection = new Projection<Map<string, UserReadModel>>('users', {
        initialState: () => new Map(),
      })

      projection.when('user:created', (event, state) => state)

      expect(() => {
        projection.when('user:created', (event, state) => state)
      }).toThrow(/already registered/)
    })
  })

  describe('Event Application', () => {
    it('should apply events to build read model state', async () => {
      const projection = new Projection<Map<string, UserReadModel>>('users', {
        initialState: () => new Map(),
      })

      projection.when<UserCreatedEvent>('user:created', (event, state) => {
        state.set(event.data.userId, {
          id: event.data.userId,
          name: event.data.name,
          email: event.data.email,
          createdAt: event.timestamp,
          updatedAt: event.timestamp,
        })
        return state
      })

      const event = createEvent<UserCreatedEvent>('user:created', {
        userId: 'user-1',
        name: 'Alice',
        email: 'alice@example.com',
      })

      await projection.apply(event)

      const state = projection.getState()
      expect(state.size).toBe(1)
      expect(state.get('user-1')).toMatchObject({
        id: 'user-1',
        name: 'Alice',
        email: 'alice@example.com',
      })
    })

    it('should apply multiple events in sequence', async () => {
      const projection = new Projection<Map<string, UserReadModel>>('users', {
        initialState: () => new Map(),
      })

      projection.when<UserCreatedEvent>('user:created', (event, state) => {
        state.set(event.data.userId, {
          id: event.data.userId,
          name: event.data.name,
          email: event.data.email,
          createdAt: event.timestamp,
          updatedAt: event.timestamp,
        })
        return state
      })

      projection.when<UserUpdatedEvent>('user:updated', (event, state) => {
        const user = state.get(event.data.userId)
        if (user) {
          if (event.data.name) user.name = event.data.name
          user.updatedAt = event.timestamp
        }
        return state
      })

      const createEvent1 = createEvent<UserCreatedEvent>(
        'user:created',
        { userId: 'user-1', name: 'Alice', email: 'alice@example.com' },
        { timestamp: 1000 }
      )

      const updateEvent = createEvent<UserUpdatedEvent>(
        'user:updated',
        { userId: 'user-1', name: 'Alice Smith' },
        { timestamp: 2000 }
      )

      await projection.apply(createEvent1)
      await projection.apply(updateEvent)

      const state = projection.getState()
      const user = state.get('user-1')
      expect(user?.name).toBe('Alice Smith')
      expect(user?.updatedAt).toBe(2000)
    })

    it('should ignore events without registered handlers', async () => {
      const projection = new Projection<Map<string, UserReadModel>>('users', {
        initialState: () => new Map(),
      })

      projection.when<UserCreatedEvent>('user:created', (event, state) => {
        state.set(event.data.userId, {
          id: event.data.userId,
          name: event.data.name,
          email: event.data.email,
          createdAt: event.timestamp,
          updatedAt: event.timestamp,
        })
        return state
      })

      const createEvent1 = createEvent<UserCreatedEvent>('user:created', {
        userId: 'user-1',
        name: 'Alice',
        email: 'alice@example.com',
      })

      const unknownEvent = createEvent('unknown:event', { foo: 'bar' })

      await projection.apply(createEvent1)
      await projection.apply(unknownEvent)

      expect(projection.getState().size).toBe(1)
    })

    it('should apply batch of events efficiently', async () => {
      const projection = new Projection<Map<string, UserReadModel>>('users', {
        initialState: () => new Map(),
      })

      projection.when<UserCreatedEvent>('user:created', (event, state) => {
        state.set(event.data.userId, {
          id: event.data.userId,
          name: event.data.name,
          email: event.data.email,
          createdAt: event.timestamp,
          updatedAt: event.timestamp,
        })
        return state
      })

      const events = Array.from({ length: 100 }, (_, i) =>
        createEvent<UserCreatedEvent>(
          'user:created',
          { userId: `user-${i}`, name: `User ${i}`, email: `user${i}@example.com` },
          { timestamp: 1000 + i }
        )
      )

      await projection.applyBatch(events)

      expect(projection.getState().size).toBe(100)
    })
  })

  describe('Position Tracking', () => {
    it('should track last processed event position', async () => {
      const projection = new Projection<Map<string, UserReadModel>>('users', {
        initialState: () => new Map(),
      })

      projection.when<UserCreatedEvent>('user:created', (event, state) => {
        state.set(event.data.userId, {
          id: event.data.userId,
          name: event.data.name,
          email: event.data.email,
          createdAt: event.timestamp,
          updatedAt: event.timestamp,
        })
        return state
      })

      expect(projection.getPosition()).toBe(0)

      const event1 = createEvent<UserCreatedEvent>(
        'user:created',
        { userId: 'user-1', name: 'Alice', email: 'alice@example.com' },
        { timestamp: 1000 }
      )
      await projection.apply(event1)

      expect(projection.getPosition()).toBe(1000)

      const event2 = createEvent<UserCreatedEvent>(
        'user:created',
        { userId: 'user-2', name: 'Bob', email: 'bob@example.com' },
        { timestamp: 2000 }
      )
      await projection.apply(event2)

      expect(projection.getPosition()).toBe(2000)
    })

    it('should support catching up from a position', async () => {
      const projection = new Projection<Map<string, UserReadModel>>('users', {
        initialState: () => new Map(),
      })

      projection.when<UserCreatedEvent>('user:created', (event, state) => {
        state.set(event.data.userId, {
          id: event.data.userId,
          name: event.data.name,
          email: event.data.email,
          createdAt: event.timestamp,
          updatedAt: event.timestamp,
        })
        return state
      })

      // Simulate events from an event store
      const allEvents = [
        createEvent<UserCreatedEvent>(
          'user:created',
          { userId: 'user-1', name: 'Alice', email: 'alice@example.com' },
          { timestamp: 1000 }
        ),
        createEvent<UserCreatedEvent>(
          'user:created',
          { userId: 'user-2', name: 'Bob', email: 'bob@example.com' },
          { timestamp: 2000 }
        ),
        createEvent<UserCreatedEvent>(
          'user:created',
          { userId: 'user-3', name: 'Charlie', email: 'charlie@example.com' },
          { timestamp: 3000 }
        ),
      ]

      // First catch up
      await projection.catchUp(allEvents.slice(0, 2))
      expect(projection.getPosition()).toBe(2000)
      expect(projection.getState().size).toBe(2)

      // Later catch up from last position
      const newEvents = allEvents.filter((e) => e.timestamp > projection.getPosition())
      await projection.catchUp(newEvents)
      expect(projection.getPosition()).toBe(3000)
      expect(projection.getState().size).toBe(3)
    })

    it('should persist position for recovery', async () => {
      const storage = createMockStorage()
      const ctx = createMockState({ storage })

      const projection = new Projection<Map<string, UserReadModel>>('users', {
        initialState: () => new Map(),
        storage,
      })

      projection.when<UserCreatedEvent>('user:created', (event, state) => {
        state.set(event.data.userId, {
          id: event.data.userId,
          name: event.data.name,
          email: event.data.email,
          createdAt: event.timestamp,
          updatedAt: event.timestamp,
        })
        return state
      })

      const event = createEvent<UserCreatedEvent>(
        'user:created',
        { userId: 'user-1', name: 'Alice', email: 'alice@example.com' },
        { timestamp: 5000 }
      )

      await projection.apply(event)
      await projection.savePosition()

      // Create new projection instance with same storage
      const projection2 = new Projection<Map<string, UserReadModel>>('users', {
        initialState: () => new Map(),
        storage,
      })

      await projection2.loadPosition()
      expect(projection2.getPosition()).toBe(5000)
    })
  })

  describe('Projection Rebuild', () => {
    it('should handle projection rebuild from scratch', async () => {
      const projection = new Projection<Map<string, UserReadModel>>('users', {
        initialState: () => new Map(),
      })

      projection.when<UserCreatedEvent>('user:created', (event, state) => {
        state.set(event.data.userId, {
          id: event.data.userId,
          name: event.data.name,
          email: event.data.email,
          createdAt: event.timestamp,
          updatedAt: event.timestamp,
        })
        return state
      })

      projection.when<UserUpdatedEvent>('user:updated', (event, state) => {
        const user = state.get(event.data.userId)
        if (user) {
          if (event.data.name) user.name = event.data.name
          user.updatedAt = event.timestamp
        }
        return state
      })

      // Build initial state
      const events = [
        createEvent<UserCreatedEvent>(
          'user:created',
          { userId: 'user-1', name: 'Alice', email: 'alice@example.com' },
          { timestamp: 1000 }
        ),
        createEvent<UserUpdatedEvent>(
          'user:updated',
          { userId: 'user-1', name: 'Alice Smith' },
          { timestamp: 2000 }
        ),
      ]

      await projection.applyBatch(events)
      expect(projection.getState().get('user-1')?.name).toBe('Alice Smith')

      // Rebuild from scratch
      await projection.rebuild(events)

      expect(projection.getPosition()).toBe(2000)
      expect(projection.getState().size).toBe(1)
      expect(projection.getState().get('user-1')?.name).toBe('Alice Smith')
    })

    it('should reset state before rebuild', async () => {
      const projection = new Projection<UserStatsReadModel>('user-stats', {
        initialState: () => ({ totalUsers: 0, activeUsers: 0, deletedUsers: 0 }),
      })

      projection.when<UserCreatedEvent>('user:created', (event, state) => {
        state.totalUsers++
        state.activeUsers++
        return state
      })

      projection.when<UserDeletedEvent>('user:deleted', (event, state) => {
        state.activeUsers--
        state.deletedUsers++
        return state
      })

      const events = [
        createEvent<UserCreatedEvent>('user:created', {
          userId: 'user-1',
          name: 'Alice',
          email: 'alice@example.com',
        }),
        createEvent<UserCreatedEvent>('user:created', {
          userId: 'user-2',
          name: 'Bob',
          email: 'bob@example.com',
        }),
        createEvent<UserDeletedEvent>('user:deleted', { userId: 'user-1' }),
      ]

      await projection.applyBatch(events)
      expect(projection.getState()).toEqual({
        totalUsers: 2,
        activeUsers: 1,
        deletedUsers: 1,
      })

      // Rebuild should produce same result from fresh state
      await projection.rebuild(events)

      expect(projection.getState()).toEqual({
        totalUsers: 2,
        activeUsers: 1,
        deletedUsers: 1,
      })
    })
  })

  describe('Multiple Projections', () => {
    it('should support multiple projections per event stream', async () => {
      // Projection 1: User lookup by ID
      const userLookup = new Projection<Map<string, UserReadModel>>('user-lookup', {
        initialState: () => new Map(),
      })

      userLookup.when<UserCreatedEvent>('user:created', (event, state) => {
        state.set(event.data.userId, {
          id: event.data.userId,
          name: event.data.name,
          email: event.data.email,
          createdAt: event.timestamp,
          updatedAt: event.timestamp,
        })
        return state
      })

      // Projection 2: User stats aggregation
      const userStats = new Projection<UserStatsReadModel>('user-stats', {
        initialState: () => ({ totalUsers: 0, activeUsers: 0, deletedUsers: 0 }),
      })

      userStats.when<UserCreatedEvent>('user:created', (event, state) => {
        state.totalUsers++
        state.activeUsers++
        return state
      })

      userStats.when<UserDeletedEvent>('user:deleted', (event, state) => {
        state.activeUsers--
        state.deletedUsers++
        return state
      })

      // Apply same events to both projections
      const events = [
        createEvent<UserCreatedEvent>('user:created', {
          userId: 'user-1',
          name: 'Alice',
          email: 'alice@example.com',
        }),
        createEvent<UserCreatedEvent>('user:created', {
          userId: 'user-2',
          name: 'Bob',
          email: 'bob@example.com',
        }),
        createEvent<UserDeletedEvent>('user:deleted', { userId: 'user-1' }),
      ]

      for (const event of events) {
        await userLookup.apply(event)
        await userStats.apply(event)
      }

      // userLookup still has user-1 (delete not handled)
      expect(userLookup.getState().size).toBe(2)

      // userStats tracked the deletion
      expect(userStats.getState()).toEqual({
        totalUsers: 2,
        activeUsers: 1,
        deletedUsers: 1,
      })
    })
  })
})

// ============================================================================
// ProjectionRegistry Tests
// ============================================================================

describe('ProjectionRegistry', () => {
  it('should register and retrieve projections by name', () => {
    const registry = new ProjectionRegistry()

    const userProjection = new Projection<Map<string, UserReadModel>>('users', {
      initialState: () => new Map(),
    })

    const orderProjection = new Projection<Map<string, OrderReadModel>>('orders', {
      initialState: () => new Map(),
    })

    registry.register(userProjection)
    registry.register(orderProjection)

    expect(registry.get('users')).toBe(userProjection)
    expect(registry.get('orders')).toBe(orderProjection)
    expect(registry.get('unknown')).toBeUndefined()
  })

  it('should apply events to all registered projections', async () => {
    const registry = new ProjectionRegistry()

    const userLookup = new Projection<Map<string, UserReadModel>>('user-lookup', {
      initialState: () => new Map(),
    })
    userLookup.when<UserCreatedEvent>('user:created', (event, state) => {
      state.set(event.data.userId, {
        id: event.data.userId,
        name: event.data.name,
        email: event.data.email,
        createdAt: event.timestamp,
        updatedAt: event.timestamp,
      })
      return state
    })

    const userStats = new Projection<UserStatsReadModel>('user-stats', {
      initialState: () => ({ totalUsers: 0, activeUsers: 0, deletedUsers: 0 }),
    })
    userStats.when<UserCreatedEvent>('user:created', (event, state) => {
      state.totalUsers++
      state.activeUsers++
      return state
    })

    registry.register(userLookup)
    registry.register(userStats)

    const event = createEvent<UserCreatedEvent>('user:created', {
      userId: 'user-1',
      name: 'Alice',
      email: 'alice@example.com',
    })

    await registry.applyToAll(event)

    expect(userLookup.getState().size).toBe(1)
    expect(userStats.getState().totalUsers).toBe(1)
  })

  it('should list all registered projection names', () => {
    const registry = new ProjectionRegistry()

    registry.register(
      new Projection('users', { initialState: () => new Map() })
    )
    registry.register(
      new Projection('orders', { initialState: () => new Map() })
    )
    registry.register(
      new Projection('stats', { initialState: () => ({}) })
    )

    const names = registry.getNames()

    expect(names).toContain('users')
    expect(names).toContain('orders')
    expect(names).toContain('stats')
    expect(names).toHaveLength(3)
  })

  it('should rebuild all projections from event stream', async () => {
    const registry = new ProjectionRegistry()

    const userLookup = new Projection<Map<string, UserReadModel>>('user-lookup', {
      initialState: () => new Map(),
    })
    userLookup.when<UserCreatedEvent>('user:created', (event, state) => {
      state.set(event.data.userId, {
        id: event.data.userId,
        name: event.data.name,
        email: event.data.email,
        createdAt: event.timestamp,
        updatedAt: event.timestamp,
      })
      return state
    })

    const userStats = new Projection<UserStatsReadModel>('user-stats', {
      initialState: () => ({ totalUsers: 0, activeUsers: 0, deletedUsers: 0 }),
    })
    userStats.when<UserCreatedEvent>('user:created', (event, state) => {
      state.totalUsers++
      state.activeUsers++
      return state
    })

    registry.register(userLookup)
    registry.register(userStats)

    const events = [
      createEvent<UserCreatedEvent>('user:created', {
        userId: 'user-1',
        name: 'Alice',
        email: 'alice@example.com',
      }),
      createEvent<UserCreatedEvent>('user:created', {
        userId: 'user-2',
        name: 'Bob',
        email: 'bob@example.com',
      }),
    ]

    await registry.rebuildAll(events)

    expect(userLookup.getState().size).toBe(2)
    expect(userStats.getState().totalUsers).toBe(2)
  })
})

// ============================================================================
// ProjectionState Tests
// ============================================================================

describe('ProjectionState', () => {
  it('should provide query interface for read models', async () => {
    const projection = new Projection<Map<string, UserReadModel>>('users', {
      initialState: () => new Map(),
    })

    projection.when<UserCreatedEvent>('user:created', (event, state) => {
      state.set(event.data.userId, {
        id: event.data.userId,
        name: event.data.name,
        email: event.data.email,
        createdAt: event.timestamp,
        updatedAt: event.timestamp,
      })
      return state
    })

    await projection.applyBatch([
      createEvent<UserCreatedEvent>('user:created', {
        userId: 'user-1',
        name: 'Alice',
        email: 'alice@example.com',
      }),
      createEvent<UserCreatedEvent>('user:created', {
        userId: 'user-2',
        name: 'Bob',
        email: 'bob@example.com',
      }),
    ])

    // Query the projection state
    const state = projection.getState()
    const user = state.get('user-1')

    expect(user).toBeDefined()
    expect(user?.name).toBe('Alice')
  })

  it('should expose read-only view of state', () => {
    const projection = new Projection<UserStatsReadModel>('stats', {
      initialState: () => ({ totalUsers: 0, activeUsers: 0, deletedUsers: 0 }),
    })

    const readOnlyState = projection.getReadOnlyState()

    // Should be able to read
    expect(readOnlyState.totalUsers).toBe(0)

    // Modifying returned state should not affect projection
    // (implementation detail - may be enforced via Object.freeze or proxy)
    const copy = { ...readOnlyState }
    copy.totalUsers = 100

    expect(projection.getState().totalUsers).toBe(0)
  })
})
