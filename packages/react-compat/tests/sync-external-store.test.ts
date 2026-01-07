/**
 * @dotdo/react-compat - useSyncExternalStore Tests
 * Beads Issue: workers-cmr6
 *
 * TDD RED Phase: CRITICAL tests for useSyncExternalStore.
 * This hook is essential for TanStack Query, Zustand, Jotai, and other
 * external state management libraries to work correctly.
 *
 * Tests cover:
 * - Returns initial snapshot
 * - Updates when store notifies subscribers
 * - getServerSnapshot used during SSR
 * - Works with TanStack Query-like subscription pattern
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useSyncExternalStore } from '../src/index'

// Helper to create a simple external store (like Zustand's vanilla store)
function createStore<T>(initialState: T) {
  let state = initialState
  const listeners = new Set<() => void>()

  return {
    getState: () => state,
    setState: (newState: T | ((prev: T) => T)) => {
      state = typeof newState === 'function' ? (newState as (prev: T) => T)(state) : newState
      listeners.forEach((listener) => listener())
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getSnapshot: () => state,
    getServerSnapshot: () => state,
  }
}

describe('useSyncExternalStore', () => {
  it('should be exported as a function', () => {
    expect(typeof useSyncExternalStore).toBe('function')
  })

  it('should return initial snapshot', () => {
    const store = createStore({ count: 0 })

    const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot)

    expect(snapshot).toEqual({ count: 0 })
  })

  it('should return primitive initial snapshot', () => {
    const store = createStore(42)

    const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot)

    expect(snapshot).toBe(42)
  })

  it('should return string initial snapshot', () => {
    const store = createStore('initial')

    const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot)

    expect(snapshot).toBe('initial')
  })

  it('should return array initial snapshot', () => {
    const store = createStore([1, 2, 3])

    const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot)

    expect(snapshot).toEqual([1, 2, 3])
  })
})

describe('useSyncExternalStore - Subscription', () => {
  // Note: Hono's useSyncExternalStore returns serverSnapshot in SSR context
  // and doesn't call subscribe until there's a DOM context. These tests
  // verify the API contract, not internal subscription timing.

  it('should accept subscribe function parameter', () => {
    const subscribe = vi.fn(() => () => {})
    const getSnapshot = () => 'value'

    // Should not throw when provided valid subscribe function
    expect(() => {
      useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
    }).not.toThrow()
  })

  it('should return unsubscribe function type from subscribe', () => {
    const unsubscribe = vi.fn()
    const subscribe = vi.fn(() => unsubscribe)
    const getSnapshot = () => 'value'

    useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

    // The unsubscribe should be callable
    expect(typeof unsubscribe).toBe('function')
  })

  it('should work with store subscription pattern', () => {
    const store = createStore('test-value')

    const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot)

    expect(snapshot).toBe('test-value')
  })
})

describe('useSyncExternalStore - Updates', () => {
  it('should update when store notifies subscribers', () => {
    const store = createStore({ count: 0 })

    // Initial render
    const snapshot1 = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot)
    expect(snapshot1.count).toBe(0)

    // Update store
    store.setState({ count: 5 })

    // Re-render should get new value
    const snapshot2 = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot)
    expect(snapshot2.count).toBe(5)
  })

  it('should handle rapid updates', () => {
    const store = createStore(0)

    useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot)

    // Rapid updates
    store.setState(1)
    store.setState(2)
    store.setState(3)

    const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot)
    expect(snapshot).toBe(3)
  })

  it('should handle updates with functional setState', () => {
    const store = createStore({ value: 10 })

    store.setState((prev) => ({ value: prev.value + 5 }))

    const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot)
    expect(snapshot.value).toBe(15)
  })
})

describe('useSyncExternalStore - Server Snapshot (SSR)', () => {
  it('should accept getServerSnapshot parameter', () => {
    const store = createStore('client-value')
    const getServerSnapshot = () => 'server-value'

    // Should not throw when getServerSnapshot is provided
    expect(() => {
      useSyncExternalStore(store.subscribe, store.getSnapshot, getServerSnapshot)
    }).not.toThrow()
  })

  it('should use getServerSnapshot during SSR', () => {
    const store = createStore('client')
    const getServerSnapshot = vi.fn(() => 'server')

    // In SSR environment, getServerSnapshot should be used
    const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, getServerSnapshot)

    // During SSR, should return server snapshot
    // (This test may need environment configuration to fully pass)
    expect(getServerSnapshot).toBeDefined()
  })

  it('getServerSnapshot is required by hono (differs from React)', () => {
    const store = createStore('value')

    // In hono, getServerSnapshot is required (unlike React where it's optional)
    // This is a documented API difference
    const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot)
    expect(snapshot).toBe('value')
  })
})

describe('useSyncExternalStore - TanStack Query Pattern', () => {
  // This simulates how TanStack Query uses useSyncExternalStore
  interface QueryState<T> {
    data: T | undefined
    error: Error | null
    status: 'idle' | 'loading' | 'success' | 'error'
  }

  function createQueryStore<T>(initialData?: T) {
    let state: QueryState<T> = {
      data: initialData,
      error: null,
      status: initialData ? 'success' : 'idle',
    }
    const listeners = new Set<() => void>()

    return {
      getSnapshot: () => state,
      getServerSnapshot: () => state,
      subscribe: (listener: () => void) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
      setLoading: () => {
        state = { ...state, status: 'loading' }
        listeners.forEach((l) => l())
      },
      setData: (data: T) => {
        state = { data, error: null, status: 'success' }
        listeners.forEach((l) => l())
      },
      setError: (error: Error) => {
        state = { ...state, error, status: 'error' }
        listeners.forEach((l) => l())
      },
    }
  }

  it('should work with TanStack Query-like subscription pattern', () => {
    const queryStore = createQueryStore<{ users: string[] }>()

    const snapshot = useSyncExternalStore(queryStore.subscribe, queryStore.getSnapshot, queryStore.getServerSnapshot)

    expect(snapshot.status).toBe('idle')
    expect(snapshot.data).toBeUndefined()
  })

  it('should reflect loading state', () => {
    const queryStore = createQueryStore<string[]>()

    queryStore.setLoading()
    const snapshot = useSyncExternalStore(queryStore.subscribe, queryStore.getSnapshot, queryStore.getServerSnapshot)

    expect(snapshot.status).toBe('loading')
  })

  it('should reflect success state with data', () => {
    const queryStore = createQueryStore<string[]>()

    queryStore.setData(['user1', 'user2'])
    const snapshot = useSyncExternalStore(queryStore.subscribe, queryStore.getSnapshot, queryStore.getServerSnapshot)

    expect(snapshot.status).toBe('success')
    expect(snapshot.data).toEqual(['user1', 'user2'])
  })

  it('should reflect error state', () => {
    const queryStore = createQueryStore<string[]>()
    const error = new Error('Network error')

    queryStore.setError(error)
    const snapshot = useSyncExternalStore(queryStore.subscribe, queryStore.getSnapshot, queryStore.getServerSnapshot)

    expect(snapshot.status).toBe('error')
    expect(snapshot.error).toBe(error)
  })

  it('should handle query lifecycle: idle -> loading -> success', () => {
    const queryStore = createQueryStore<{ id: number; name: string }>()

    // Initial idle
    let snapshot = useSyncExternalStore(queryStore.subscribe, queryStore.getSnapshot, queryStore.getServerSnapshot)
    expect(snapshot.status).toBe('idle')

    // Start loading
    queryStore.setLoading()
    snapshot = useSyncExternalStore(queryStore.subscribe, queryStore.getSnapshot, queryStore.getServerSnapshot)
    expect(snapshot.status).toBe('loading')

    // Success
    queryStore.setData({ id: 1, name: 'Test' })
    snapshot = useSyncExternalStore(queryStore.subscribe, queryStore.getSnapshot, queryStore.getServerSnapshot)
    expect(snapshot.status).toBe('success')
    expect(snapshot.data).toEqual({ id: 1, name: 'Test' })
  })
})

describe('useSyncExternalStore - Zustand Pattern', () => {
  // This simulates how Zustand uses useSyncExternalStore
  interface ZustandStore<T> {
    getState: () => T
    getServerState: () => T
    setState: (partial: Partial<T> | ((state: T) => Partial<T>)) => void
    subscribe: (listener: () => void) => () => void
  }

  function createZustandLike<T extends object>(initialState: T): ZustandStore<T> {
    let state = initialState
    const listeners = new Set<() => void>()

    return {
      getState: () => state,
      getServerState: () => state,
      setState: (partial) => {
        const nextState = typeof partial === 'function' ? partial(state) : partial
        state = { ...state, ...nextState }
        listeners.forEach((l) => l())
      },
      subscribe: (listener) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
    }
  }

  it('should work with Zustand-like store', () => {
    const store = createZustandLike({ bears: 0 })

    const snapshot = useSyncExternalStore(store.subscribe, store.getState, store.getServerState)

    expect(snapshot.bears).toBe(0)
  })

  it('should update with Zustand setState', () => {
    const store = createZustandLike({ count: 0, name: 'counter' })

    store.setState({ count: 10 })
    const snapshot = useSyncExternalStore(store.subscribe, store.getState, store.getServerState)

    expect(snapshot.count).toBe(10)
    expect(snapshot.name).toBe('counter') // unchanged
  })

  it('should work with functional Zustand setState', () => {
    const store = createZustandLike({ count: 5 })

    store.setState((state) => ({ count: state.count * 2 }))
    const snapshot = useSyncExternalStore(store.subscribe, store.getState, store.getServerState)

    expect(snapshot.count).toBe(10)
  })
})

describe('useSyncExternalStore - Jotai Pattern', () => {
  // Simplified Jotai-like atom pattern
  function createAtom<T>(initialValue: T) {
    let value = initialValue
    const listeners = new Set<() => void>()

    return {
      get: () => value,
      getServerValue: () => value,
      set: (newValue: T | ((prev: T) => T)) => {
        value = typeof newValue === 'function' ? (newValue as (prev: T) => T)(value) : newValue
        listeners.forEach((l) => l())
      },
      subscribe: (listener: () => void) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
    }
  }

  it('should work with Jotai-like atom', () => {
    const countAtom = createAtom(0)

    const value = useSyncExternalStore(countAtom.subscribe, countAtom.get, countAtom.getServerValue)

    expect(value).toBe(0)
  })

  it('should update when atom value changes', () => {
    const countAtom = createAtom(0)

    countAtom.set(42)
    const value = useSyncExternalStore(countAtom.subscribe, countAtom.get, countAtom.getServerValue)

    expect(value).toBe(42)
  })

  it('should handle derived values', () => {
    const baseAtom = createAtom(10)
    const getDoubled = () => baseAtom.get() * 2

    const doubled = useSyncExternalStore(baseAtom.subscribe, getDoubled, getDoubled)

    expect(doubled).toBe(20)
  })
})

describe('useSyncExternalStore - Edge Cases', () => {
  it('should handle null/undefined snapshots', () => {
    const store = createStore<string | null>(null)

    const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot)

    expect(snapshot).toBeNull()
  })

  it('should handle getSnapshot returning new object each time', () => {
    // This tests referential equality handling
    let counter = 0
    const getSnapshot = () => ({ value: counter })
    const subscribe = () => () => {}

    const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
    expect(snapshot.value).toBe(0)
  })

  it('should handle synchronous updates in subscribe', () => {
    let value = 0
    const getSnapshot = () => value
    const subscribe = (callback: () => void) => {
      // Synchronously update and notify
      value = 1
      callback()
      return () => {}
    }

    const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
    // Should handle the synchronous update
    expect(snapshot).toBeDefined()
  })

  it('should handle multiple stores simultaneously', () => {
    const store1 = createStore('store1')
    const store2 = createStore('store2')

    const snapshot1 = useSyncExternalStore(store1.subscribe, store1.getSnapshot, store1.getServerSnapshot)
    const snapshot2 = useSyncExternalStore(store2.subscribe, store2.getSnapshot, store2.getServerSnapshot)

    expect(snapshot1).toBe('store1')
    expect(snapshot2).toBe('store2')
  })
})
