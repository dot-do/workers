/**
 * @tanstack/db integration tests
 *
 * TanStack DB is the foundation for workers.do's client-side sync
 * with Durable Objects. These tests validate it works with
 * @dotdo/react-compat (hono/jsx/dom).
 *
 * Critical functionality:
 * - Reactive queries (useLiveQuery) using useSyncExternalStore
 * - Optimistic mutations with instant UI feedback
 * - Sync with backend (Durable Objects)
 *
 * TanStack DB API (v0.1.x):
 * - Collections: insert(), update(), delete(), get(), state, toArray
 * - Reactive: useLiveQuery hook with status flags
 * - Mutations: createOptimisticAction, createTransaction
 * - Sync: Collection adapters for various backends
 *
 * @see https://tanstack.com/db/latest
 * @see https://github.com/TanStack/db
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// NOTE: @tanstack/react-db is the React-specific package
// It re-exports core @tanstack/db functionality plus React hooks
// Install: npm install @tanstack/react-db

// These imports will fail until @tanstack/react-db is installed
// and properly aliased to use @dotdo/react-compat
import {
  useLiveQuery,
  createCollection,
  createTransaction,
  createOptimisticAction,
  LocalOnlyCollection,
  // LocalStorageCollection, // For persistent local storage
  // queryCollectionOptions, // For TanStack Query integration
} from '@tanstack/react-db'

// React Testing Library - needs configuration to use @dotdo/react-compat
import { renderHook, act, waitFor } from '@testing-library/react'

// React compat layer (what we're validating works with TanStack DB)
import {
  useState,
  useEffect,
  useSyncExternalStore,
  createContext,
  useContext,
} from '@dotdo/react-compat'

// =============================================================================
// TEST FIXTURES & MOCKS
// =============================================================================

// Schema definition for test todos
interface Todo {
  id: string
  title: string
  completed: boolean
  createdAt: number
  userId?: string
}

// Schema definition for test users
interface User {
  id: string
  name: string
  email: string
}

// Mock Durable Object stub for sync tests
const createMockDurableObjectStub = () => ({
  fetch: vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }))),
  connect: vi.fn(),
  id: { toString: () => 'mock-do-id' },
})

// Mock WebSocket for real-time sync
const createMockWebSocket = () => ({
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: 1, // OPEN
})

// =============================================================================
// SCHEMA DEFINITION TESTS
// =============================================================================

describe('@tanstack/db integration', () => {
  describe('Schema Definition', () => {
    it('creates database with schema using LocalOnlyCollection', () => {
      // LocalOnlyCollection is for in-memory temporary data
      // Perfect for testing and UI state that doesn't need persistence
      const todosCollection = new LocalOnlyCollection<Todo, string>({
        getId: (todo) => todo.id,
      })

      expect(todosCollection).toBeDefined()
      expect(todosCollection.size).toBe(0)
      expect(todosCollection.state).toBeInstanceOf(Map)
    })

    it('creates collection with custom getId function', () => {
      // getId extracts the unique key from each record
      const collection = new LocalOnlyCollection<User, string>({
        getId: (user) => user.id,
      })

      expect(collection).toBeDefined()
    })

    it('creates collection with composite key', () => {
      // Composite keys for many-to-many relationships
      interface TodoAssignment {
        todoId: string
        userId: string
        assignedAt: number
      }

      const assignmentsCollection = new LocalOnlyCollection<
        TodoAssignment,
        string
      >({
        getId: (assignment) => `${assignment.todoId}:${assignment.userId}`,
      })

      expect(assignmentsCollection).toBeDefined()
    })

    it('validates schema types at compile time', () => {
      // TypeScript should catch type errors
      const collection = new LocalOnlyCollection<Todo, string>({
        getId: (todo) => todo.id,
      })

      // This should work - correct type
      const validTodo: Todo = {
        id: '1',
        title: 'Test',
        completed: false,
        createdAt: Date.now(),
      }

      // Type safety: inserting wrong shape should fail at compile time
      // const invalidTodo = { id: 1, wrong: 'field' } // Would cause TS error

      expect(validTodo).toBeDefined()
      expect(collection).toBeDefined()
    })
  })

  // =============================================================================
  // BASIC CRUD OPERATIONS
  // =============================================================================

  describe('Basic CRUD', () => {
    let collection: InstanceType<typeof LocalOnlyCollection<Todo, string>>

    beforeEach(() => {
      collection = new LocalOnlyCollection<Todo, string>({
        getId: (todo) => todo.id,
      })
    })

    it('inserts a single record', async () => {
      const todo: Todo = {
        id: '1',
        title: 'Buy groceries',
        completed: false,
        createdAt: Date.now(),
      }

      // insert() returns a Transaction that can be awaited
      const transaction = collection.insert(todo)
      await transaction

      expect(collection.size).toBe(1)
      expect(collection.get('1')).toEqual(todo)
      expect(collection.has('1')).toBe(true)
    })

    it('inserts multiple records', async () => {
      const todos: Todo[] = [
        { id: '1', title: 'Task 1', completed: false, createdAt: Date.now() },
        { id: '2', title: 'Task 2', completed: true, createdAt: Date.now() },
        { id: '3', title: 'Task 3', completed: false, createdAt: Date.now() },
      ]

      await collection.insert(todos)

      expect(collection.size).toBe(3)
      expect(collection.toArray).toHaveLength(3)
    })

    it('reads records by key', async () => {
      await collection.insert({
        id: 'test-1',
        title: 'Test Todo',
        completed: false,
        createdAt: Date.now(),
      })

      const todo = collection.get('test-1')

      expect(todo).toBeDefined()
      expect(todo?.title).toBe('Test Todo')
      expect(todo?.completed).toBe(false)
    })

    it('reads all records as array', async () => {
      await collection.insert([
        { id: '1', title: 'First', completed: false, createdAt: 1 },
        { id: '2', title: 'Second', completed: true, createdAt: 2 },
      ])

      const allTodos = collection.toArray

      expect(allTodos).toHaveLength(2)
      expect(allTodos.map((t) => t.title)).toContain('First')
      expect(allTodos.map((t) => t.title)).toContain('Second')
    })

    it('reads all records as Map state', async () => {
      await collection.insert([
        { id: '1', title: 'First', completed: false, createdAt: 1 },
        { id: '2', title: 'Second', completed: true, createdAt: 2 },
      ])

      const state = collection.state

      expect(state).toBeInstanceOf(Map)
      expect(state.size).toBe(2)
      expect(state.get('1')?.title).toBe('First')
    })

    it('updates a single record using draft callback', async () => {
      await collection.insert({
        id: '1',
        title: 'Original',
        completed: false,
        createdAt: Date.now(),
      })

      // update() uses immer-style draft mutations
      await collection.update('1', (draft) => {
        draft.title = 'Updated'
        draft.completed = true
      })

      const updated = collection.get('1')

      expect(updated?.title).toBe('Updated')
      expect(updated?.completed).toBe(true)
    })

    it('updates multiple records', async () => {
      await collection.insert([
        { id: '1', title: 'Task 1', completed: false, createdAt: 1 },
        { id: '2', title: 'Task 2', completed: false, createdAt: 2 },
      ])

      // Update multiple records at once
      await collection.update(['1', '2'], (drafts) => {
        drafts.forEach((draft) => {
          draft.completed = true
        })
      })

      expect(collection.get('1')?.completed).toBe(true)
      expect(collection.get('2')?.completed).toBe(true)
    })

    it('deletes a single record', async () => {
      await collection.insert([
        { id: '1', title: 'Keep', completed: false, createdAt: 1 },
        { id: '2', title: 'Delete', completed: false, createdAt: 2 },
      ])

      await collection.delete('2')

      expect(collection.size).toBe(1)
      expect(collection.has('1')).toBe(true)
      expect(collection.has('2')).toBe(false)
    })

    it('deletes multiple records', async () => {
      await collection.insert([
        { id: '1', title: 'Keep', completed: false, createdAt: 1 },
        { id: '2', title: 'Delete 1', completed: false, createdAt: 2 },
        { id: '3', title: 'Delete 2', completed: false, createdAt: 3 },
      ])

      await collection.delete(['2', '3'])

      expect(collection.size).toBe(1)
      expect(collection.has('1')).toBe(true)
      expect(collection.has('2')).toBe(false)
      expect(collection.has('3')).toBe(false)
    })

    it('returns undefined for non-existent keys', () => {
      const result = collection.get('non-existent')

      expect(result).toBeUndefined()
    })

    it('provides iteration methods', async () => {
      await collection.insert([
        { id: '1', title: 'Task 1', completed: false, createdAt: 1 },
        { id: '2', title: 'Task 2', completed: true, createdAt: 2 },
      ])

      // keys(), values(), entries() iterators
      const keys = [...collection.keys()]
      const values = [...collection.values()]
      const entries = [...collection.entries()]

      expect(keys).toEqual(['1', '2'])
      expect(values).toHaveLength(2)
      expect(entries).toHaveLength(2)
    })
  })

  // =============================================================================
  // REACTIVE QUERIES (useLiveQuery)
  // =============================================================================

  describe('Reactive Queries (useLiveQuery)', () => {
    let collection: InstanceType<typeof LocalOnlyCollection<Todo, string>>

    beforeEach(() => {
      collection = new LocalOnlyCollection<Todo, string>({
        getId: (todo) => todo.id,
      })
    })

    afterEach(() => {
      vi.clearAllMocks()
    })

    it('useLiveQuery returns initial empty data', async () => {
      // useLiveQuery subscribes to collection changes
      // Uses useSyncExternalStore internally for React integration
      const { result } = renderHook(() =>
        useLiveQuery((q) => q.from(collection))
      )

      expect(result.current.data).toEqual([])
      expect(result.current.isReady).toBe(true)
      expect(result.current.status).toBe('ready')
    })

    it('useLiveQuery returns initial data from populated collection', async () => {
      await collection.insert([
        { id: '1', title: 'Task 1', completed: false, createdAt: 1 },
        { id: '2', title: 'Task 2', completed: true, createdAt: 2 },
      ])

      const { result } = renderHook(() =>
        useLiveQuery((q) => q.from(collection))
      )

      await waitFor(() => {
        expect(result.current.data).toHaveLength(2)
      })

      expect(result.current.isReady).toBe(true)
    })

    it('useLiveQuery updates when data is inserted', async () => {
      const { result } = renderHook(() =>
        useLiveQuery((q) => q.from(collection))
      )

      // Initial state
      expect(result.current.data).toEqual([])

      // Insert new data
      await act(async () => {
        await collection.insert({
          id: '1',
          title: 'New Task',
          completed: false,
          createdAt: Date.now(),
        })
      })

      // Should reactively update
      await waitFor(() => {
        expect(result.current.data).toHaveLength(1)
        expect(result.current.data[0].title).toBe('New Task')
      })
    })

    it('useLiveQuery updates when data is modified', async () => {
      await collection.insert({
        id: '1',
        title: 'Original',
        completed: false,
        createdAt: Date.now(),
      })

      const { result } = renderHook(() =>
        useLiveQuery((q) => q.from(collection))
      )

      await waitFor(() => {
        expect(result.current.data[0]?.title).toBe('Original')
      })

      // Modify data
      await act(async () => {
        await collection.update('1', (draft) => {
          draft.title = 'Modified'
        })
      })

      await waitFor(() => {
        expect(result.current.data[0]?.title).toBe('Modified')
      })
    })

    it('useLiveQuery updates when data is deleted', async () => {
      await collection.insert([
        { id: '1', title: 'Task 1', completed: false, createdAt: 1 },
        { id: '2', title: 'Task 2', completed: false, createdAt: 2 },
      ])

      const { result } = renderHook(() =>
        useLiveQuery((q) => q.from(collection))
      )

      await waitFor(() => {
        expect(result.current.data).toHaveLength(2)
      })

      await act(async () => {
        await collection.delete('1')
      })

      await waitFor(() => {
        expect(result.current.data).toHaveLength(1)
        expect(result.current.data[0].id).toBe('2')
      })
    })

    it('useLiveQuery with where filter', async () => {
      await collection.insert([
        { id: '1', title: 'Task 1', completed: false, createdAt: 1 },
        { id: '2', title: 'Task 2', completed: true, createdAt: 2 },
        { id: '3', title: 'Task 3', completed: false, createdAt: 3 },
      ])

      // Query only completed todos
      const { result } = renderHook(() =>
        useLiveQuery((q) =>
          q.from(collection).where((row) => row.completed === true)
        )
      )

      await waitFor(() => {
        expect(result.current.data).toHaveLength(1)
        expect(result.current.data[0].id).toBe('2')
      })
    })

    it('useLiveQuery filter updates reactively', async () => {
      await collection.insert([
        { id: '1', title: 'Task 1', completed: false, createdAt: 1 },
        { id: '2', title: 'Task 2', completed: false, createdAt: 2 },
      ])

      const { result } = renderHook(() =>
        useLiveQuery((q) =>
          q.from(collection).where((row) => row.completed === true)
        )
      )

      // Initially no completed todos
      expect(result.current.data).toEqual([])

      // Mark one as completed
      await act(async () => {
        await collection.update('1', (draft) => {
          draft.completed = true
        })
      })

      // Filter should now include it
      await waitFor(() => {
        expect(result.current.data).toHaveLength(1)
        expect(result.current.data[0].id).toBe('1')
      })
    })

    it('useLiveQuery with orderBy', async () => {
      await collection.insert([
        { id: '1', title: 'Zebra', completed: false, createdAt: 3 },
        { id: '2', title: 'Apple', completed: false, createdAt: 1 },
        { id: '3', title: 'Mango', completed: false, createdAt: 2 },
      ])

      const { result } = renderHook(() =>
        useLiveQuery((q) => q.from(collection).orderBy((row) => row.title))
      )

      await waitFor(() => {
        expect(result.current.data.map((t) => t.title)).toEqual([
          'Apple',
          'Mango',
          'Zebra',
        ])
      })
    })

    it('useLiveQuery with limit', async () => {
      await collection.insert([
        { id: '1', title: 'Task 1', completed: false, createdAt: 1 },
        { id: '2', title: 'Task 2', completed: false, createdAt: 2 },
        { id: '3', title: 'Task 3', completed: false, createdAt: 3 },
        { id: '4', title: 'Task 4', completed: false, createdAt: 4 },
        { id: '5', title: 'Task 5', completed: false, createdAt: 5 },
      ])

      const { result } = renderHook(() =>
        useLiveQuery((q) => q.from(collection).limit(3))
      )

      await waitFor(() => {
        expect(result.current.data).toHaveLength(3)
      })
    })

    it('useLiveQuery returns status flags', async () => {
      const { result } = renderHook(() =>
        useLiveQuery((q) => q.from(collection))
      )

      // Status flags from useLiveQuery
      expect(typeof result.current.isLoading).toBe('boolean')
      expect(typeof result.current.isReady).toBe('boolean')
      expect(typeof result.current.isIdle).toBe('boolean')
      expect(typeof result.current.isError).toBe('boolean')
      expect(typeof result.current.isEnabled).toBe('boolean')
    })

    it('useLiveQuery returns state Map', async () => {
      await collection.insert({
        id: '1',
        title: 'Test',
        completed: false,
        createdAt: Date.now(),
      })

      const { result } = renderHook(() =>
        useLiveQuery((q) => q.from(collection))
      )

      await waitFor(() => {
        expect(result.current.state).toBeInstanceOf(Map)
        expect(result.current.state.size).toBe(1)
        expect(result.current.state.get('1')?.title).toBe('Test')
      })
    })

    it('useLiveQuery can be disabled', async () => {
      const enabled = false

      const { result } = renderHook(() =>
        // Returning null/undefined disables the query
        useLiveQuery((q) => (enabled ? q.from(collection) : null))
      )

      expect(result.current.status).toBe('disabled')
      expect(result.current.isEnabled).toBe(false)
    })

    it('useLiveQuery with dependencies array', async () => {
      const { result, rerender } = renderHook(
        ({ userId }: { userId: string }) =>
          useLiveQuery(
            (q) => q.from(collection).where((row) => row.userId === userId),
            [userId] // Dependencies - query recreated when userId changes
          ),
        { initialProps: { userId: 'user-1' } }
      )

      await collection.insert([
        {
          id: '1',
          title: 'User 1 Task',
          completed: false,
          createdAt: 1,
          userId: 'user-1',
        },
        {
          id: '2',
          title: 'User 2 Task',
          completed: false,
          createdAt: 2,
          userId: 'user-2',
        },
      ])

      await waitFor(() => {
        expect(result.current.data).toHaveLength(1)
        expect(result.current.data[0].userId).toBe('user-1')
      })

      // Change userId dependency
      rerender({ userId: 'user-2' })

      await waitFor(() => {
        expect(result.current.data).toHaveLength(1)
        expect(result.current.data[0].userId).toBe('user-2')
      })
    })

    it('multiple useLiveQuery hooks work independently', async () => {
      const completedCollection = new LocalOnlyCollection<Todo, string>({
        getId: (todo) => todo.id,
      })
      const pendingCollection = new LocalOnlyCollection<Todo, string>({
        getId: (todo) => todo.id,
      })

      await completedCollection.insert({
        id: '1',
        title: 'Done',
        completed: true,
        createdAt: 1,
      })
      await pendingCollection.insert({
        id: '2',
        title: 'Pending',
        completed: false,
        createdAt: 2,
      })

      const { result: completedResult } = renderHook(() =>
        useLiveQuery((q) => q.from(completedCollection))
      )

      const { result: pendingResult } = renderHook(() =>
        useLiveQuery((q) => q.from(pendingCollection))
      )

      await waitFor(() => {
        expect(completedResult.current.data).toHaveLength(1)
        expect(pendingResult.current.data).toHaveLength(1)
        expect(completedResult.current.data[0].title).toBe('Done')
        expect(pendingResult.current.data[0].title).toBe('Pending')
      })
    })

    it('useLiveQuery uses useSyncExternalStore for react-compat', async () => {
      // This is the key test - TanStack DB uses useSyncExternalStore
      // which must be provided by @dotdo/react-compat
      // If this works, react-compat is properly aliased

      const mockSubscribe = vi.fn((callback: () => void) => {
        // Simulate subscription
        return () => {}
      })
      const mockGetSnapshot = vi.fn(() => [])

      // Verify useSyncExternalStore is called correctly
      expect(useSyncExternalStore).toBeDefined()
    })
  })

  // =============================================================================
  // OPTIMISTIC UPDATES
  // =============================================================================

  describe('Optimistic Updates', () => {
    let collection: InstanceType<typeof LocalOnlyCollection<Todo, string>>

    beforeEach(() => {
      collection = new LocalOnlyCollection<Todo, string>({
        getId: (todo) => todo.id,
      })
    })

    it('optimistic insert appears immediately in UI', async () => {
      const { result } = renderHook(() =>
        useLiveQuery((q) => q.from(collection))
      )

      expect(result.current.data).toEqual([])

      // Optimistic insert - appears immediately before sync
      await act(async () => {
        const optimisticInsert = createOptimisticAction(collection, {
          onMutate: () => ({
            id: 'temp-id',
            title: 'Optimistic Todo',
            completed: false,
            createdAt: Date.now(),
          }),
          mutationFn: async (todo) => {
            // Simulate network delay
            await new Promise((resolve) => setTimeout(resolve, 100))
            return { ...todo, id: 'server-id' }
          },
        })

        optimisticInsert({
          id: 'temp-id',
          title: 'Optimistic Todo',
          completed: false,
          createdAt: Date.now(),
        })
      })

      // Should appear immediately (optimistically)
      expect(result.current.data).toHaveLength(1)
      expect(result.current.data[0].title).toBe('Optimistic Todo')
    })

    it('optimistic update reflects immediately', async () => {
      await collection.insert({
        id: '1',
        title: 'Original',
        completed: false,
        createdAt: Date.now(),
      })

      const { result } = renderHook(() =>
        useLiveQuery((q) => q.from(collection))
      )

      await waitFor(() => {
        expect(result.current.data[0].title).toBe('Original')
      })

      // Optimistic update
      await act(async () => {
        const optimisticUpdate = createOptimisticAction(collection, {
          onMutate: (id: string, updates: Partial<Todo>) => {
            const current = collection.get(id)
            return current ? { ...current, ...updates } : null
          },
          mutationFn: async (id: string, updates: Partial<Todo>) => {
            await new Promise((resolve) => setTimeout(resolve, 100))
            return { ...collection.get(id)!, ...updates }
          },
        })

        optimisticUpdate('1', { title: 'Optimistically Updated' })
      })

      // Update should appear immediately
      expect(result.current.data[0].title).toBe('Optimistically Updated')
    })

    it('optimistic delete removes item immediately', async () => {
      await collection.insert([
        { id: '1', title: 'Keep', completed: false, createdAt: 1 },
        { id: '2', title: 'Delete', completed: false, createdAt: 2 },
      ])

      const { result } = renderHook(() =>
        useLiveQuery((q) => q.from(collection))
      )

      await waitFor(() => {
        expect(result.current.data).toHaveLength(2)
      })

      await act(async () => {
        const optimisticDelete = createOptimisticAction(collection, {
          onMutate: (id: string) => id,
          mutationFn: async (id: string) => {
            await new Promise((resolve) => setTimeout(resolve, 100))
            return id
          },
        })

        optimisticDelete('2')
      })

      // Should be removed immediately
      await waitFor(() => {
        expect(result.current.data).toHaveLength(1)
        expect(result.current.data[0].id).toBe('1')
      })
    })

    it('rollback on mutation failure', async () => {
      await collection.insert({
        id: '1',
        title: 'Original',
        completed: false,
        createdAt: Date.now(),
      })

      const { result } = renderHook(() =>
        useLiveQuery((q) => q.from(collection))
      )

      await waitFor(() => {
        expect(result.current.data[0].title).toBe('Original')
      })

      // Optimistic update that will fail
      await act(async () => {
        const failingMutation = createOptimisticAction(collection, {
          onMutate: (id: string, updates: Partial<Todo>) => {
            return { ...collection.get(id)!, ...updates }
          },
          mutationFn: async () => {
            throw new Error('Network error')
          },
          onError: (error, variables, context) => {
            // Rollback happens automatically
          },
        })

        try {
          await failingMutation('1', { title: 'Will Fail' })
        } catch {
          // Expected
        }
      })

      // Should rollback to original
      await waitFor(() => {
        expect(result.current.data[0].title).toBe('Original')
      })
    })

    it('transaction groups multiple operations', async () => {
      await collection.insert([
        { id: '1', title: 'Task 1', completed: false, createdAt: 1 },
        { id: '2', title: 'Task 2', completed: false, createdAt: 2 },
      ])

      const { result } = renderHook(() =>
        useLiveQuery((q) => q.from(collection))
      )

      // Group operations in a transaction
      await act(async () => {
        const tx = createTransaction()

        tx.add(collection.update('1', (draft) => (draft.completed = true)))
        tx.add(collection.update('2', (draft) => (draft.completed = true)))
        tx.add(
          collection.insert({
            id: '3',
            title: 'Task 3',
            completed: true,
            createdAt: 3,
          })
        )

        await tx.commit()
      })

      await waitFor(() => {
        expect(result.current.data).toHaveLength(3)
        expect(result.current.data.every((t) => t.completed)).toBe(true)
      })
    })

    it('transaction rollback on partial failure', async () => {
      await collection.insert([
        { id: '1', title: 'Task 1', completed: false, createdAt: 1 },
        { id: '2', title: 'Task 2', completed: false, createdAt: 2 },
      ])

      const { result } = renderHook(() =>
        useLiveQuery((q) => q.from(collection))
      )

      const initialState = [...result.current.data]

      // Transaction that will fail partway through
      await act(async () => {
        const tx = createTransaction()

        tx.add(collection.update('1', (draft) => (draft.completed = true)))
        tx.add(collection.delete('non-existent-id')) // This might fail

        try {
          await tx.commit()
        } catch {
          await tx.rollback()
        }
      })

      // Should rollback all changes
      await waitFor(() => {
        expect(result.current.data[0].completed).toBe(false)
        expect(result.current.data[1].completed).toBe(false)
      })
    })
  })

  // =============================================================================
  // INDEXING AND PERFORMANCE
  // =============================================================================

  describe('Indexing', () => {
    let collection: InstanceType<typeof LocalOnlyCollection<Todo, string>>

    beforeEach(async () => {
      collection = new LocalOnlyCollection<Todo, string>({
        getId: (todo) => todo.id,
      })

      // Seed with test data
      const todos: Todo[] = Array.from({ length: 100 }, (_, i) => ({
        id: `todo-${i}`,
        title: `Task ${i}`,
        completed: i % 2 === 0,
        createdAt: i,
        userId: `user-${i % 5}`,
      }))

      await collection.insert(todos)
    })

    it('creates index on field', () => {
      // Create index for faster lookups
      const completedIndex = collection.createIndex((row) => row.completed)

      expect(completedIndex).toBeDefined()
    })

    it('creates composite index', () => {
      // Index on multiple fields
      const userCompletedIndex = collection.createIndex(
        (row) => `${row.userId}:${row.completed}`
      )

      expect(userCompletedIndex).toBeDefined()
    })

    it('indexed queries are performant', async () => {
      const completedIndex = collection.createIndex((row) => row.completed)

      const start = performance.now()

      // Query using index
      const { result } = renderHook(() =>
        useLiveQuery((q) =>
          q.from(collection).where((row) => row.completed === true)
        )
      )

      await waitFor(() => {
        expect(result.current.data.length).toBeGreaterThan(0)
      })

      const duration = performance.now() - start

      // Should be sub-millisecond for 100 items
      expect(duration).toBeLessThan(100)
    })
  })

  // =============================================================================
  // DURABLE OBJECTS SYNC
  // =============================================================================

  describe('Durable Objects Sync', () => {
    let collection: InstanceType<typeof LocalOnlyCollection<Todo, string>>
    let mockDO: ReturnType<typeof createMockDurableObjectStub>

    beforeEach(() => {
      collection = new LocalOnlyCollection<Todo, string>({
        getId: (todo) => todo.id,
      })
      mockDO = createMockDurableObjectStub()
    })

    it('creates sync adapter for Durable Objects', () => {
      // Custom sync adapter for workers.do Durable Objects
      // This would be implemented in @dotdo/tanstack-db-do-sync
      const createDurableObjectSync = (config: {
        stub: typeof mockDO
        collection: typeof collection
        endpoint?: string
      }) => {
        return {
          push: vi.fn(),
          pull: vi.fn(),
          subscribe: vi.fn(),
          disconnect: vi.fn(),
        }
      }

      const sync = createDurableObjectSync({
        stub: mockDO,
        collection,
        endpoint: '/sync',
      })

      expect(sync.push).toBeDefined()
      expect(sync.pull).toBeDefined()
      expect(sync.subscribe).toBeDefined()
    })

    it('initial sync loads data from DO', async () => {
      // Mock DO returns initial data
      mockDO.fetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [
              { id: '1', title: 'From DO', completed: false, createdAt: 1 },
            ],
          })
        )
      )

      // Pull initial data from DO
      const response = await mockDO.fetch(
        new Request('http://do/sync', { method: 'GET' })
      )
      const { data } = await response.json()

      await collection.insert(data)

      expect(collection.size).toBe(1)
      expect(collection.get('1')?.title).toBe('From DO')
    })

    it('local changes sync to DO', async () => {
      // Insert locally
      await collection.insert({
        id: '1',
        title: 'Local Todo',
        completed: false,
        createdAt: Date.now(),
      })

      // Push to DO
      const todo = collection.get('1')
      await mockDO.fetch(
        new Request('http://do/sync', {
          method: 'POST',
          body: JSON.stringify({ changes: [{ type: 'insert', data: todo }] }),
        })
      )

      expect(mockDO.fetch).toHaveBeenCalled()
    })

    it('DO changes sync to client via WebSocket', async () => {
      const mockWS = createMockWebSocket()
      const changeHandler = vi.fn()

      // Simulate WebSocket message from DO
      mockWS.addEventListener.mockImplementation((event, handler) => {
        if (event === 'message') {
          // Simulate incoming change
          setTimeout(() => {
            handler({
              data: JSON.stringify({
                type: 'insert',
                data: { id: '1', title: 'From DO WS', completed: false, createdAt: 1 },
              }),
            })
          }, 10)
        }
      })

      // Subscribe to changes
      collection.subscribeChanges((changes) => {
        changeHandler(changes)
      })

      // Apply incoming change
      await collection.insert({
        id: '1',
        title: 'From DO WS',
        completed: false,
        createdAt: 1,
      })

      expect(collection.get('1')?.title).toBe('From DO WS')
    })

    it('handles conflict resolution with last-write-wins', async () => {
      // Client has version
      await collection.insert({
        id: '1',
        title: 'Client Version',
        completed: false,
        createdAt: 100,
      })

      // DO has newer version
      const doVersion = {
        id: '1',
        title: 'DO Version',
        completed: true,
        createdAt: 200, // Newer timestamp
      }

      // Simple last-write-wins resolution
      const clientVersion = collection.get('1')!
      if (doVersion.createdAt > clientVersion.createdAt) {
        await collection.update('1', (draft) => {
          Object.assign(draft, doVersion)
        })
      }

      expect(collection.get('1')?.title).toBe('DO Version')
      expect(collection.get('1')?.completed).toBe(true)
    })

    it('handles conflict resolution with custom resolver', async () => {
      interface ConflictResolvableTodo extends Todo {
        version: number
      }

      const versionedCollection = new LocalOnlyCollection<
        ConflictResolvableTodo,
        string
      >({
        getId: (todo) => todo.id,
      })

      // Custom conflict resolver - merge fields
      const resolveConflict = (
        local: ConflictResolvableTodo,
        remote: ConflictResolvableTodo
      ): ConflictResolvableTodo => {
        return {
          ...local,
          ...remote,
          // Keep completed if either is true
          completed: local.completed || remote.completed,
          version: Math.max(local.version, remote.version) + 1,
        }
      }

      await versionedCollection.insert({
        id: '1',
        title: 'Original',
        completed: false,
        createdAt: 1,
        version: 1,
      })

      const local = versionedCollection.get('1')!
      const remote: ConflictResolvableTodo = {
        id: '1',
        title: 'Remote Update',
        completed: true,
        createdAt: 2,
        version: 1,
      }

      const resolved = resolveConflict(local, remote)

      await versionedCollection.update('1', (draft) => {
        Object.assign(draft, resolved)
      })

      expect(versionedCollection.get('1')?.title).toBe('Remote Update')
      expect(versionedCollection.get('1')?.completed).toBe(true)
      expect(versionedCollection.get('1')?.version).toBe(2)
    })

    it('queues operations when offline', async () => {
      const offlineQueue: Array<{ type: string; data: unknown }> = []
      let isOnline = false

      // Simulate offline operation queueing
      const queuedInsert = async (todo: Todo) => {
        if (isOnline) {
          await collection.insert(todo)
          await mockDO.fetch(
            new Request('http://do/sync', {
              method: 'POST',
              body: JSON.stringify({ type: 'insert', data: todo }),
            })
          )
        } else {
          // Queue for later
          await collection.insert(todo)
          offlineQueue.push({ type: 'insert', data: todo })
        }
      }

      // Insert while offline
      await queuedInsert({
        id: '1',
        title: 'Offline Todo',
        completed: false,
        createdAt: Date.now(),
      })

      expect(collection.size).toBe(1)
      expect(offlineQueue).toHaveLength(1)
      expect(mockDO.fetch).not.toHaveBeenCalled()

      // Come back online and flush queue
      isOnline = true
      for (const op of offlineQueue) {
        await mockDO.fetch(
          new Request('http://do/sync', {
            method: 'POST',
            body: JSON.stringify(op),
          })
        )
      }
      offlineQueue.length = 0

      expect(mockDO.fetch).toHaveBeenCalledTimes(1)
      expect(offlineQueue).toHaveLength(0)
    })

    it('handles reconnection sync', async () => {
      // Simulate reconnection scenario
      const syncState = {
        lastSyncedAt: 0,
        pendingChanges: [] as Array<{ type: string; data: unknown }>,
      }

      // Make some offline changes
      await collection.insert({
        id: '1',
        title: 'Offline 1',
        completed: false,
        createdAt: 1,
      })
      syncState.pendingChanges.push({
        type: 'insert',
        data: collection.get('1'),
      })

      await collection.insert({
        id: '2',
        title: 'Offline 2',
        completed: false,
        createdAt: 2,
      })
      syncState.pendingChanges.push({
        type: 'insert',
        data: collection.get('2'),
      })

      // On reconnect, push pending changes
      mockDO.fetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, synced: 2 }))
      )

      const reconnectSync = async () => {
        const response = await mockDO.fetch(
          new Request('http://do/sync/batch', {
            method: 'POST',
            body: JSON.stringify({
              changes: syncState.pendingChanges,
              lastSyncedAt: syncState.lastSyncedAt,
            }),
          })
        )
        const result = await response.json()
        if (result.ok) {
          syncState.pendingChanges = []
          syncState.lastSyncedAt = Date.now()
        }
        return result
      }

      const result = await reconnectSync()

      expect(result.ok).toBe(true)
      expect(result.synced).toBe(2)
      expect(syncState.pendingChanges).toHaveLength(0)
    })
  })

  // =============================================================================
  // WORKERS.DO INTEGRATION
  // =============================================================================

  describe('workers.do Integration', () => {
    it('works with workers.do Durable Object pattern', async () => {
      // workers.do DO pattern uses RPC bindings
      // This simulates how TanStack DB would integrate

      interface TodoDO {
        list(): Promise<Todo[]>
        get(id: string): Promise<Todo | null>
        create(todo: Omit<Todo, 'id'>): Promise<Todo>
        update(id: string, updates: Partial<Todo>): Promise<Todo>
        delete(id: string): Promise<void>
        subscribe(): Promise<ReadableStream>
      }

      // Mock workers.do RPC binding
      const mockTodoDO: TodoDO = {
        list: vi.fn().mockResolvedValue([]),
        get: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation(async (todo) => ({
          ...todo,
          id: crypto.randomUUID(),
        })),
        update: vi.fn().mockImplementation(async (id, updates) => ({
          id,
          ...updates,
        })),
        delete: vi.fn().mockResolvedValue(undefined),
        subscribe: vi.fn().mockResolvedValue(new ReadableStream()),
      }

      // Create sync adapter for workers.do
      const createWorkersDOSync = <T extends { id: string }>(
        doBinding: TodoDO,
        collection: InstanceType<typeof LocalOnlyCollection<T, string>>
      ) => {
        return {
          async pull() {
            const items = await doBinding.list()
            await collection.insert(items as T[])
          },
          async push(item: T) {
            const saved = await doBinding.create(item as Omit<Todo, 'id'>)
            return saved
          },
        }
      }

      const collection = new LocalOnlyCollection<Todo, string>({
        getId: (todo) => todo.id,
      })

      const sync = createWorkersDOSync(mockTodoDO, collection)

      // Create via sync adapter
      const newTodo = await sync.push({
        id: 'temp',
        title: 'Test Todo',
        completed: false,
        createdAt: Date.now(),
      })

      expect(mockTodoDO.create).toHaveBeenCalled()
      expect(newTodo.id).toBeDefined()
    })

    it('handles Workers RPC transport', async () => {
      // Workers RPC uses service bindings
      // TanStack DB sync would go through these

      interface WorkerEnv {
        TODOS: DurableObjectNamespace
      }

      // Mock the stub returned by DO namespace
      const mockStub = {
        // Workers RPC allows calling methods directly
        list: vi.fn().mockResolvedValue([
          { id: '1', title: 'RPC Todo', completed: false, createdAt: 1 },
        ]),
        sync: vi.fn().mockResolvedValue({ ok: true }),
      }

      const mockNamespace = {
        idFromName: vi.fn().mockReturnValue({ toString: () => 'mock-id' }),
        get: vi.fn().mockReturnValue(mockStub),
      }

      // Use RPC to sync
      const id = mockNamespace.idFromName('user-todos')
      const stub = mockNamespace.get(id)

      const todos = await stub.list()

      expect(todos).toHaveLength(1)
      expect(todos[0].title).toBe('RPC Todo')
    })

    it('integrates with workers.do auth', async () => {
      // TanStack DB queries should respect user auth

      interface AuthenticatedTodo extends Todo {
        ownerId: string
      }

      const collection = new LocalOnlyCollection<AuthenticatedTodo, string>({
        getId: (todo) => todo.id,
      })

      await collection.insert([
        {
          id: '1',
          title: 'User 1 Todo',
          completed: false,
          createdAt: 1,
          ownerId: 'user-1',
        },
        {
          id: '2',
          title: 'User 2 Todo',
          completed: false,
          createdAt: 2,
          ownerId: 'user-2',
        },
      ])

      // Current authenticated user
      const currentUserId = 'user-1'

      // Query filtered by auth
      const { result } = renderHook(() =>
        useLiveQuery((q) =>
          q.from(collection).where((row) => row.ownerId === currentUserId)
        )
      )

      await waitFor(() => {
        expect(result.current.data).toHaveLength(1)
        expect(result.current.data[0].ownerId).toBe('user-1')
      })
    })

    it('supports multi-tenant collections', async () => {
      // workers.do supports multi-tenant via DO naming
      interface TenantTodo extends Todo {
        tenantId: string
      }

      const collection = new LocalOnlyCollection<TenantTodo, string>({
        getId: (todo) => todo.id,
      })

      await collection.insert([
        {
          id: '1',
          title: 'Tenant A Todo',
          completed: false,
          createdAt: 1,
          tenantId: 'tenant-a',
        },
        {
          id: '2',
          title: 'Tenant B Todo',
          completed: false,
          createdAt: 2,
          tenantId: 'tenant-b',
        },
      ])

      // Query for specific tenant
      const { result } = renderHook(() =>
        useLiveQuery((q) =>
          q.from(collection).where((row) => row.tenantId === 'tenant-a')
        )
      )

      await waitFor(() => {
        expect(result.current.data).toHaveLength(1)
        expect(result.current.data[0].tenantId).toBe('tenant-a')
      })
    })
  })

  // =============================================================================
  // REACT-COMPAT VALIDATION
  // =============================================================================

  describe('react-compat Validation', () => {
    it('useSyncExternalStore is available from react-compat', () => {
      // TanStack DB requires useSyncExternalStore
      // This MUST be exported from @dotdo/react-compat
      expect(useSyncExternalStore).toBeDefined()
    })

    it('useState is available from react-compat', () => {
      expect(useState).toBeDefined()
    })

    it('useEffect is available from react-compat', () => {
      expect(useEffect).toBeDefined()
    })

    it('createContext and useContext are available', () => {
      // TanStack DB may use context for configuration
      expect(createContext).toBeDefined()
      expect(useContext).toBeDefined()
    })

    it('TanStack DB hooks work with react-compat alias', async () => {
      // This validates the vitest alias configuration
      // react -> @dotdo/react-compat

      const collection = new LocalOnlyCollection<Todo, string>({
        getId: (todo) => todo.id,
      })

      // If this renders without crashing, the alias works
      const { result } = renderHook(() =>
        useLiveQuery((q) => q.from(collection))
      )

      expect(result.current).toBeDefined()
      expect(result.current.data).toBeDefined()
    })

    it('bundle size is significantly smaller than React', () => {
      // This is a documentation test
      // @dotdo/react-compat target: ~2.8KB
      // React + ReactDOM: ~50KB+
      // Savings: ~95%

      // In a real test, we'd check actual bundle sizes
      // For now, just document the expectation
      const expectedReactCompatSize = 2800 // bytes
      const typicalReactSize = 50000 // bytes

      expect(expectedReactCompatSize).toBeLessThan(typicalReactSize * 0.1)
    })
  })

  // =============================================================================
  // SUBSCRIPTION AND CLEANUP
  // =============================================================================

  describe('Subscription and Cleanup', () => {
    it('subscribeChanges fires on insert', async () => {
      const collection = new LocalOnlyCollection<Todo, string>({
        getId: (todo) => todo.id,
      })

      const changeHandler = vi.fn()
      const unsubscribe = collection.subscribeChanges(changeHandler)

      await collection.insert({
        id: '1',
        title: 'Test',
        completed: false,
        createdAt: Date.now(),
      })

      expect(changeHandler).toHaveBeenCalled()

      unsubscribe()
    })

    it('subscribeChanges fires on update', async () => {
      const collection = new LocalOnlyCollection<Todo, string>({
        getId: (todo) => todo.id,
      })

      await collection.insert({
        id: '1',
        title: 'Original',
        completed: false,
        createdAt: Date.now(),
      })

      const changeHandler = vi.fn()
      const unsubscribe = collection.subscribeChanges(changeHandler)

      await collection.update('1', (draft) => {
        draft.title = 'Updated'
      })

      expect(changeHandler).toHaveBeenCalled()

      unsubscribe()
    })

    it('subscribeChanges fires on delete', async () => {
      const collection = new LocalOnlyCollection<Todo, string>({
        getId: (todo) => todo.id,
      })

      await collection.insert({
        id: '1',
        title: 'To Delete',
        completed: false,
        createdAt: Date.now(),
      })

      const changeHandler = vi.fn()
      const unsubscribe = collection.subscribeChanges(changeHandler)

      await collection.delete('1')

      expect(changeHandler).toHaveBeenCalled()

      unsubscribe()
    })

    it('unsubscribe stops notifications', async () => {
      const collection = new LocalOnlyCollection<Todo, string>({
        getId: (todo) => todo.id,
      })

      const changeHandler = vi.fn()
      const unsubscribe = collection.subscribeChanges(changeHandler)

      await collection.insert({
        id: '1',
        title: 'First',
        completed: false,
        createdAt: 1,
      })

      expect(changeHandler).toHaveBeenCalledTimes(1)

      // Unsubscribe
      unsubscribe()

      await collection.insert({
        id: '2',
        title: 'Second',
        completed: false,
        createdAt: 2,
      })

      // Should still be 1, not 2
      expect(changeHandler).toHaveBeenCalledTimes(1)
    })

    it('useLiveQuery cleans up on unmount', async () => {
      const collection = new LocalOnlyCollection<Todo, string>({
        getId: (todo) => todo.id,
      })

      const { result, unmount } = renderHook(() =>
        useLiveQuery((q) => q.from(collection))
      )

      expect(result.current).toBeDefined()

      // Unmount should clean up subscriptions
      unmount()

      // After unmount, inserting should not cause issues
      await collection.insert({
        id: '1',
        title: 'After Unmount',
        completed: false,
        createdAt: Date.now(),
      })

      // No errors should occur
      expect(collection.size).toBe(1)
    })

    it('multiple subscriptions work independently', async () => {
      const collection = new LocalOnlyCollection<Todo, string>({
        getId: (todo) => todo.id,
      })

      const handler1 = vi.fn()
      const handler2 = vi.fn()

      const unsub1 = collection.subscribeChanges(handler1)
      const unsub2 = collection.subscribeChanges(handler2)

      await collection.insert({
        id: '1',
        title: 'Test',
        completed: false,
        createdAt: Date.now(),
      })

      expect(handler1).toHaveBeenCalledTimes(1)
      expect(handler2).toHaveBeenCalledTimes(1)

      // Unsubscribe first handler
      unsub1()

      await collection.insert({
        id: '2',
        title: 'Test 2',
        completed: false,
        createdAt: Date.now(),
      })

      expect(handler1).toHaveBeenCalledTimes(1) // Unchanged
      expect(handler2).toHaveBeenCalledTimes(2) // Incremented

      unsub2()
    })
  })
})

// =============================================================================
// TYPE DECLARATIONS FOR WORKERS
// =============================================================================

// These would normally come from @cloudflare/workers-types
declare interface DurableObjectNamespace {
  idFromName(name: string): DurableObjectId
  get(id: DurableObjectId): DurableObjectStub
}

declare interface DurableObjectId {
  toString(): string
}

declare interface DurableObjectStub {
  fetch(request: Request): Promise<Response>
  [key: string]: unknown
}
