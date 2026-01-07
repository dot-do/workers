/**
 * @tanstack/react-query integration tests
 *
 * These tests validate that TanStack Query works with @dotdo/react-compat
 * replacing React with hono/jsx/dom.
 *
 * TanStack Query uses useSyncExternalStore internally, which is the critical
 * hook that must work for this integration to succeed. It also relies on:
 * - React.createContext / useContext for QueryClientProvider
 * - React.useState for internal state management
 * - React.useEffect for side effects
 * - React.useRef for mutable references
 * - React.useMemo for memoization
 * - React.useCallback for stable callbacks
 *
 * Expected behavior: All tests should FAIL in the RED phase because
 * the react-compat hooks are not yet implemented (they throw errors).
 *
 * @see https://tanstack.com/query/latest
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useMutation,
  useQueryClient,
  useIsFetching,
  useQueries,
  QueryCache,
  MutationCache,
} from '@tanstack/react-query'
import { render, screen, waitFor, renderHook, act } from '@testing-library/react'
import { createElement, type ReactNode } from '@dotdo/react-compat'

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Creates a QueryClient instance with test-friendly defaults
 * - Disables retries for predictable test behavior
 * - Disables gcTime to prevent cleanup during tests
 */
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

/**
 * Creates a wrapper component for renderHook that provides QueryClient context
 * This tests that our createContext/useContext implementation works with TanStack Query
 */
function createWrapper(client?: QueryClient) {
  const queryClient = client ?? createTestQueryClient()

  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

/**
 * Simple component that uses useQuery for render testing
 */
function QueryComponent({
  queryKey,
  queryFn
}: {
  queryKey: string[]
  queryFn: () => Promise<unknown>
}) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn,
  })

  if (isLoading) {
    return createElement('div', { 'data-testid': 'loading' }, 'Loading...')
  }

  if (isError) {
    return createElement('div', { 'data-testid': 'error' }, `Error: ${(error as Error).message}`)
  }

  return createElement('div', { 'data-testid': 'data' }, JSON.stringify(data))
}

/**
 * Component that uses multiple queries
 */
function MultiQueryComponent() {
  const query1 = useQuery({
    queryKey: ['query1'],
    queryFn: async () => ({ id: 1, name: 'First' }),
  })

  const query2 = useQuery({
    queryKey: ['query2'],
    queryFn: async () => ({ id: 2, name: 'Second' }),
  })

  return createElement('div', { 'data-testid': 'multi' },
    `Q1: ${query1.data?.name ?? 'loading'}, Q2: ${query2.data?.name ?? 'loading'}`
  )
}

// ============================================================================
// Test Suites
// ============================================================================

describe('@tanstack/react-query integration', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = createTestQueryClient()
  })

  afterEach(() => {
    queryClient.clear()
  })

  // --------------------------------------------------------------------------
  // QueryClientProvider Tests
  // --------------------------------------------------------------------------
  describe('QueryClientProvider', () => {
    it('renders children when provided with QueryClient', () => {
      // This test validates that QueryClientProvider works with our createElement
      // It uses React.createContext internally which must be compatible
      const TestChild = () => createElement('div', { 'data-testid': 'child' }, 'Hello')

      render(
        createElement(QueryClientProvider, { client: queryClient },
          createElement(TestChild, null)
        )
      )

      expect(screen.getByTestId('child')).toBeDefined()
      expect(screen.getByTestId('child').textContent).toBe('Hello')
    })

    it('provides QueryClient to nested components', () => {
      // Tests that the context value is accessible to children
      let capturedClient: QueryClient | undefined

      const Consumer = () => {
        capturedClient = useQueryClient()
        return createElement('div', null, 'Consumer')
      }

      render(
        createElement(QueryClientProvider, { client: queryClient },
          createElement(Consumer, null)
        )
      )

      expect(capturedClient).toBe(queryClient)
    })

    it('allows nested QueryClientProviders with different clients', () => {
      // Tests context shadowing works correctly
      const innerClient = createTestQueryClient()
      let outerCaptured: QueryClient | undefined
      let innerCaptured: QueryClient | undefined

      const OuterConsumer = () => {
        outerCaptured = useQueryClient()
        return createElement('div', null, 'Outer')
      }

      const InnerConsumer = () => {
        innerCaptured = useQueryClient()
        return createElement('div', null, 'Inner')
      }

      render(
        createElement(QueryClientProvider, { client: queryClient },
          createElement('div', null,
            createElement(OuterConsumer, null),
            createElement(QueryClientProvider, { client: innerClient },
              createElement(InnerConsumer, null)
            )
          )
        )
      )

      expect(outerCaptured).toBe(queryClient)
      expect(innerCaptured).toBe(innerClient)
    })
  })

  // --------------------------------------------------------------------------
  // useQuery Tests
  // --------------------------------------------------------------------------
  describe('useQuery', () => {
    it('fetches and returns data successfully', async () => {
      // Core test: useQuery must work with our hooks
      // Internally uses useSyncExternalStore for subscription
      const mockData = { id: 1, name: 'Test User' }
      const queryFn = vi.fn().mockResolvedValue(mockData)

      const { result } = renderHook(
        () => useQuery({
          queryKey: ['user', 1],
          queryFn,
        }),
        { wrapper: createWrapper(queryClient) }
      )

      // Initially loading
      expect(result.current.isLoading).toBe(true)
      expect(result.current.data).toBeUndefined()

      // Wait for data
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockData)
      expect(queryFn).toHaveBeenCalledTimes(1)
    })

    it('handles loading state correctly', async () => {
      // Tests that isLoading/isFetching states work
      let resolveQuery: (value: unknown) => void
      const queryFn = () => new Promise((resolve) => {
        resolveQuery = resolve
      })

      const { result } = renderHook(
        () => useQuery({
          queryKey: ['delayed'],
          queryFn,
        }),
        { wrapper: createWrapper(queryClient) }
      )

      // Check loading state
      expect(result.current.isLoading).toBe(true)
      expect(result.current.isFetching).toBe(true)
      expect(result.current.isPending).toBe(true)
      expect(result.current.isSuccess).toBe(false)
      expect(result.current.status).toBe('pending')

      // Resolve the query
      await act(async () => {
        resolveQuery!({ done: true })
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isFetching).toBe(false)
      expect(result.current.isSuccess).toBe(true)
      expect(result.current.status).toBe('success')
    })

    it('handles error state correctly', async () => {
      // Tests error handling in useQuery
      const error = new Error('Network request failed')
      const queryFn = vi.fn().mockRejectedValue(error)

      const { result } = renderHook(
        () => useQuery({
          queryKey: ['failing-query'],
          queryFn,
        }),
        { wrapper: createWrapper(queryClient) }
      )

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBe(error)
      expect(result.current.status).toBe('error')
      expect(result.current.data).toBeUndefined()
    })

    it('respects enabled option', async () => {
      // Tests that queries can be disabled
      const queryFn = vi.fn().mockResolvedValue({ data: 'test' })

      const { result, rerender } = renderHook(
        ({ enabled }) => useQuery({
          queryKey: ['conditional'],
          queryFn,
          enabled,
        }),
        {
          wrapper: createWrapper(queryClient),
          initialProps: { enabled: false }
        }
      )

      // Query should not execute when disabled
      expect(result.current.fetchStatus).toBe('idle')
      expect(queryFn).not.toHaveBeenCalled()

      // Enable the query
      rerender({ enabled: true })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(queryFn).toHaveBeenCalledTimes(1)
    })

    it('returns cached data on subsequent renders', async () => {
      // Tests that query caching works
      const queryFn = vi.fn().mockResolvedValue({ cached: true })
      const queryKey = ['cached-query']

      // First render
      const { result: result1 } = renderHook(
        () => useQuery({ queryKey, queryFn }),
        { wrapper: createWrapper(queryClient) }
      )

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true)
      })

      // Second render with same key - should use cache
      const { result: result2 } = renderHook(
        () => useQuery({ queryKey, queryFn }),
        { wrapper: createWrapper(queryClient) }
      )

      // Should have cached data immediately
      expect(result2.current.data).toEqual({ cached: true })
      // queryFn should only be called once
      expect(queryFn).toHaveBeenCalledTimes(1)
    })

    it('refetches when query key changes', async () => {
      // Tests query key dependency tracking
      const queryFn = vi.fn().mockImplementation(async ({ queryKey }) => ({
        id: queryKey[1],
      }))

      const { result, rerender } = renderHook(
        ({ id }) => useQuery({
          queryKey: ['user', id],
          queryFn,
        }),
        {
          wrapper: createWrapper(queryClient),
          initialProps: { id: 1 }
        }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual({ id: 1 })
      expect(queryFn).toHaveBeenCalledTimes(1)

      // Change the query key
      rerender({ id: 2 })

      await waitFor(() => {
        expect(result.current.data).toEqual({ id: 2 })
      })

      expect(queryFn).toHaveBeenCalledTimes(2)
    })

    it('provides select option for data transformation', async () => {
      // Tests the select option for deriving data
      const queryFn = vi.fn().mockResolvedValue({
        users: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ]
      })

      const { result } = renderHook(
        () => useQuery({
          queryKey: ['users-list'],
          queryFn,
          select: (data) => data.users.map((u: { name: string }) => u.name),
        }),
        { wrapper: createWrapper(queryClient) }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(['Alice', 'Bob'])
    })
  })

  // --------------------------------------------------------------------------
  // useMutation Tests
  // --------------------------------------------------------------------------
  describe('useMutation', () => {
    it('executes mutation function when mutate is called', async () => {
      // Tests basic mutation execution
      const mutationFn = vi.fn().mockResolvedValue({ success: true })

      const { result } = renderHook(
        () => useMutation({ mutationFn }),
        { wrapper: createWrapper(queryClient) }
      )

      expect(result.current.isIdle).toBe(true)

      await act(async () => {
        result.current.mutate({ userId: 1, action: 'update' })
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mutationFn).toHaveBeenCalledWith({ userId: 1, action: 'update' })
      expect(result.current.data).toEqual({ success: true })
    })

    it('handles mutation loading state', async () => {
      // Tests isPending state during mutation
      let resolveMutation: (value: unknown) => void
      const mutationFn = () => new Promise((resolve) => {
        resolveMutation = resolve
      })

      const { result } = renderHook(
        () => useMutation({ mutationFn }),
        { wrapper: createWrapper(queryClient) }
      )

      // Start mutation
      act(() => {
        result.current.mutate({})
      })

      expect(result.current.isPending).toBe(true)
      expect(result.current.status).toBe('pending')

      // Complete mutation
      await act(async () => {
        resolveMutation!({ done: true })
      })

      await waitFor(() => {
        expect(result.current.isPending).toBe(false)
      })

      expect(result.current.isSuccess).toBe(true)
    })

    it('handles mutation error state', async () => {
      // Tests error handling in mutations
      const error = new Error('Mutation failed')
      const mutationFn = vi.fn().mockRejectedValue(error)

      const { result } = renderHook(
        () => useMutation({ mutationFn }),
        { wrapper: createWrapper(queryClient) }
      )

      await act(async () => {
        result.current.mutate({})
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBe(error)
      expect(result.current.status).toBe('error')
    })

    it('calls onSuccess callback with correct arguments', async () => {
      // Tests mutation lifecycle callbacks
      const onSuccess = vi.fn()
      const mutationFn = vi.fn().mockResolvedValue({ id: 123 })
      const variables = { name: 'New Item' }

      const { result } = renderHook(
        () => useMutation({
          mutationFn,
          onSuccess,
        }),
        { wrapper: createWrapper(queryClient) }
      )

      await act(async () => {
        result.current.mutate(variables)
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(onSuccess).toHaveBeenCalledWith(
        { id: 123 },
        variables,
        expect.any(Object)
      )
    })

    it('calls onError callback when mutation fails', async () => {
      // Tests error callback in mutations
      const onError = vi.fn()
      const error = new Error('Server error')
      const mutationFn = vi.fn().mockRejectedValue(error)

      const { result } = renderHook(
        () => useMutation({
          mutationFn,
          onError,
        }),
        { wrapper: createWrapper(queryClient) }
      )

      await act(async () => {
        result.current.mutate({ data: 'test' })
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(onError).toHaveBeenCalledWith(
        error,
        { data: 'test' },
        expect.any(Object)
      )
    })

    it('supports mutateAsync for Promise-based usage', async () => {
      // Tests async mutation interface
      const mutationFn = vi.fn().mockResolvedValue({ created: true })

      const { result } = renderHook(
        () => useMutation({ mutationFn }),
        { wrapper: createWrapper(queryClient) }
      )

      let asyncResult: unknown
      await act(async () => {
        asyncResult = await result.current.mutateAsync({ type: 'create' })
      })

      expect(asyncResult).toEqual({ created: true })
    })

    it('can reset mutation state', async () => {
      // Tests mutation reset functionality
      const mutationFn = vi.fn().mockResolvedValue({ ok: true })

      const { result } = renderHook(
        () => useMutation({ mutationFn }),
        { wrapper: createWrapper(queryClient) }
      )

      await act(async () => {
        result.current.mutate({})
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Reset the mutation
      act(() => {
        result.current.reset()
      })

      expect(result.current.isIdle).toBe(true)
      expect(result.current.data).toBeUndefined()
    })
  })

  // --------------------------------------------------------------------------
  // useQueryClient Tests
  // --------------------------------------------------------------------------
  describe('useQueryClient', () => {
    it('returns the QueryClient instance from context', () => {
      // Tests that useContext works correctly with QueryClient context
      const { result } = renderHook(
        () => useQueryClient(),
        { wrapper: createWrapper(queryClient) }
      )

      expect(result.current).toBeInstanceOf(QueryClient)
      expect(result.current).toBe(queryClient)
    })

    it('throws error when used outside QueryClientProvider', () => {
      // Tests that context validation works
      expect(() => {
        renderHook(() => useQueryClient())
      }).toThrow()
    })
  })

  // --------------------------------------------------------------------------
  // Query Invalidation Tests
  // --------------------------------------------------------------------------
  describe('query invalidation', () => {
    it('invalidateQueries triggers refetch', async () => {
      // Tests that query invalidation works
      let callCount = 0
      const queryFn = vi.fn().mockImplementation(async () => {
        callCount++
        return { count: callCount }
      })

      const { result } = renderHook(
        () => ({
          query: useQuery({
            queryKey: ['invalidation-test'],
            queryFn,
          }),
          client: useQueryClient(),
        }),
        { wrapper: createWrapper(queryClient) }
      )

      await waitFor(() => {
        expect(result.current.query.isSuccess).toBe(true)
      })

      expect(result.current.query.data).toEqual({ count: 1 })

      // Invalidate the query
      await act(async () => {
        await result.current.client.invalidateQueries({
          queryKey: ['invalidation-test'],
        })
      })

      await waitFor(() => {
        expect(result.current.query.data).toEqual({ count: 2 })
      })

      expect(queryFn).toHaveBeenCalledTimes(2)
    })

    it('setQueryData updates cache without refetch', async () => {
      // Tests manual cache updates
      const queryFn = vi.fn().mockResolvedValue({ original: true })

      const { result } = renderHook(
        () => ({
          query: useQuery({
            queryKey: ['manual-update'],
            queryFn,
          }),
          client: useQueryClient(),
        }),
        { wrapper: createWrapper(queryClient) }
      )

      await waitFor(() => {
        expect(result.current.query.isSuccess).toBe(true)
      })

      // Manually update the cache
      act(() => {
        result.current.client.setQueryData(['manual-update'], { manual: true })
      })

      expect(result.current.query.data).toEqual({ manual: true })
      // queryFn should not be called again
      expect(queryFn).toHaveBeenCalledTimes(1)
    })

    it('removeQueries clears cache', async () => {
      // Tests cache removal
      const queryFn = vi.fn().mockResolvedValue({ data: 'cached' })

      const { result } = renderHook(
        () => ({
          query: useQuery({
            queryKey: ['removable'],
            queryFn,
          }),
          client: useQueryClient(),
        }),
        { wrapper: createWrapper(queryClient) }
      )

      await waitFor(() => {
        expect(result.current.query.isSuccess).toBe(true)
      })

      // Remove the query from cache
      act(() => {
        result.current.client.removeQueries({ queryKey: ['removable'] })
      })

      // Cache should be empty for this key
      const cachedData = result.current.client.getQueryData(['removable'])
      expect(cachedData).toBeUndefined()
    })
  })

  // --------------------------------------------------------------------------
  // prefetchQuery Tests
  // --------------------------------------------------------------------------
  describe('prefetchQuery', () => {
    it('prefetches data before component mounts', async () => {
      // Tests query prefetching
      const queryFn = vi.fn().mockResolvedValue({ prefetched: true })
      const queryKey = ['prefetched-data']

      // Prefetch before rendering component
      await queryClient.prefetchQuery({
        queryKey,
        queryFn,
      })

      expect(queryFn).toHaveBeenCalledTimes(1)

      // Now use the query in a component
      const { result } = renderHook(
        () => useQuery({ queryKey, queryFn }),
        { wrapper: createWrapper(queryClient) }
      )

      // Should have data immediately (no loading state)
      expect(result.current.data).toEqual({ prefetched: true })
      expect(result.current.isLoading).toBe(false)
      // queryFn should not be called again
      expect(queryFn).toHaveBeenCalledTimes(1)
    })

    it('ensureQueryData fetches only if not cached', async () => {
      // Tests ensure query data functionality
      const queryFn = vi.fn().mockResolvedValue({ ensured: true })
      const queryKey = ['ensure-test']

      // First call should fetch
      const data1 = await queryClient.ensureQueryData({
        queryKey,
        queryFn,
      })

      expect(data1).toEqual({ ensured: true })
      expect(queryFn).toHaveBeenCalledTimes(1)

      // Second call should use cache
      const data2 = await queryClient.ensureQueryData({
        queryKey,
        queryFn,
      })

      expect(data2).toEqual({ ensured: true })
      expect(queryFn).toHaveBeenCalledTimes(1) // Still 1
    })
  })

  // --------------------------------------------------------------------------
  // Multiple Queries Tests
  // --------------------------------------------------------------------------
  describe('multiple queries', () => {
    it('handles multiple useQuery calls in same component', async () => {
      // Tests that multiple hooks work simultaneously
      const queryFn1 = vi.fn().mockResolvedValue({ source: 'query1' })
      const queryFn2 = vi.fn().mockResolvedValue({ source: 'query2' })

      const { result } = renderHook(
        () => ({
          query1: useQuery({ queryKey: ['multi-1'], queryFn: queryFn1 }),
          query2: useQuery({ queryKey: ['multi-2'], queryFn: queryFn2 }),
        }),
        { wrapper: createWrapper(queryClient) }
      )

      await waitFor(() => {
        expect(result.current.query1.isSuccess).toBe(true)
        expect(result.current.query2.isSuccess).toBe(true)
      })

      expect(result.current.query1.data).toEqual({ source: 'query1' })
      expect(result.current.query2.data).toEqual({ source: 'query2' })
    })

    it('useQueries handles array of queries', async () => {
      // Tests useQueries hook
      const queries = [
        { queryKey: ['batch-1'], queryFn: () => Promise.resolve({ id: 1 }) },
        { queryKey: ['batch-2'], queryFn: () => Promise.resolve({ id: 2 }) },
        { queryKey: ['batch-3'], queryFn: () => Promise.resolve({ id: 3 }) },
      ]

      const { result } = renderHook(
        () => useQueries({ queries }),
        { wrapper: createWrapper(queryClient) }
      )

      await waitFor(() => {
        expect(result.current.every((q) => q.isSuccess)).toBe(true)
      })

      expect(result.current[0].data).toEqual({ id: 1 })
      expect(result.current[1].data).toEqual({ id: 2 })
      expect(result.current[2].data).toEqual({ id: 3 })
    })
  })

  // --------------------------------------------------------------------------
  // useIsFetching Tests
  // --------------------------------------------------------------------------
  describe('useIsFetching', () => {
    it('returns count of fetching queries', async () => {
      // Tests global fetching state tracking
      let resolvers: Array<(value: unknown) => void> = []

      const createSlowQuery = () => new Promise((resolve) => {
        resolvers.push(resolve)
      })

      const { result } = renderHook(
        () => ({
          isFetching: useIsFetching(),
          query1: useQuery({ queryKey: ['slow-1'], queryFn: createSlowQuery }),
          query2: useQuery({ queryKey: ['slow-2'], queryFn: createSlowQuery }),
        }),
        { wrapper: createWrapper(queryClient) }
      )

      // Should have 2 fetching queries
      expect(result.current.isFetching).toBe(2)

      // Resolve first query
      await act(async () => {
        resolvers[0]({ done: 1 })
      })

      await waitFor(() => {
        expect(result.current.isFetching).toBe(1)
      })

      // Resolve second query
      await act(async () => {
        resolvers[1]({ done: 2 })
      })

      await waitFor(() => {
        expect(result.current.isFetching).toBe(0)
      })
    })

    it('filters by query key', async () => {
      // Tests filtered fetching count
      let resolvers: Array<(value: unknown) => void> = []

      const createSlowQuery = () => new Promise((resolve) => {
        resolvers.push(resolve)
      })

      const { result } = renderHook(
        () => ({
          allFetching: useIsFetching(),
          usersFetching: useIsFetching({ queryKey: ['users'] }),
          query1: useQuery({ queryKey: ['users', 1], queryFn: createSlowQuery }),
          query2: useQuery({ queryKey: ['posts', 1], queryFn: createSlowQuery }),
        }),
        { wrapper: createWrapper(queryClient) }
      )

      expect(result.current.allFetching).toBe(2)
      expect(result.current.usersFetching).toBe(1)

      // Resolve all
      await act(async () => {
        resolvers.forEach(r => r({ done: true }))
      })

      await waitFor(() => {
        expect(result.current.allFetching).toBe(0)
      })
    })
  })

  // --------------------------------------------------------------------------
  // QueryCache and MutationCache Tests
  // --------------------------------------------------------------------------
  describe('cache callbacks', () => {
    it('QueryCache onSuccess callback fires', async () => {
      // Tests cache-level callbacks
      const onSuccess = vi.fn()
      const client = new QueryClient({
        queryCache: new QueryCache({
          onSuccess,
        }),
        defaultOptions: {
          queries: { retry: false },
        },
      })

      const { result } = renderHook(
        () => useQuery({
          queryKey: ['cache-callback'],
          queryFn: async () => ({ success: true }),
        }),
        { wrapper: createWrapper(client) }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(onSuccess).toHaveBeenCalled()

      client.clear()
    })

    it('MutationCache onSuccess callback fires', async () => {
      // Tests mutation cache callbacks
      const onSuccess = vi.fn()
      const client = new QueryClient({
        mutationCache: new MutationCache({
          onSuccess,
        }),
        defaultOptions: {
          mutations: { retry: false },
        },
      })

      const { result } = renderHook(
        () => useMutation({
          mutationFn: async () => ({ mutated: true }),
        }),
        { wrapper: createWrapper(client) }
      )

      await act(async () => {
        result.current.mutate({})
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(onSuccess).toHaveBeenCalled()

      client.clear()
    })
  })

  // --------------------------------------------------------------------------
  // Render Tests (Full Component)
  // --------------------------------------------------------------------------
  describe('full component rendering', () => {
    it('renders QueryComponent with loading then data states', async () => {
      // Tests full render cycle
      const mockData = { message: 'Hello World' }
      const queryFn = vi.fn().mockResolvedValue(mockData)

      render(
        createElement(QueryClientProvider, { client: queryClient },
          createElement(QueryComponent, {
            queryKey: ['render-test'],
            queryFn,
          })
        )
      )

      // Should show loading initially
      expect(screen.getByTestId('loading')).toBeDefined()

      // Should show data after loading
      await waitFor(() => {
        expect(screen.getByTestId('data')).toBeDefined()
      })

      expect(screen.getByTestId('data').textContent).toContain('Hello World')
    })

    it('renders QueryComponent with error state', async () => {
      // Tests error rendering
      const error = new Error('API Error')
      const queryFn = vi.fn().mockRejectedValue(error)

      render(
        createElement(QueryClientProvider, { client: queryClient },
          createElement(QueryComponent, {
            queryKey: ['error-render-test'],
            queryFn,
          })
        )
      )

      await waitFor(() => {
        expect(screen.getByTestId('error')).toBeDefined()
      })

      expect(screen.getByTestId('error').textContent).toContain('API Error')
    })

    it('renders MultiQueryComponent with multiple queries', async () => {
      // Tests component with multiple hooks
      render(
        createElement(QueryClientProvider, { client: queryClient },
          createElement(MultiQueryComponent, null)
        )
      )

      await waitFor(() => {
        const element = screen.getByTestId('multi')
        expect(element.textContent).toContain('First')
        expect(element.textContent).toContain('Second')
      })
    })
  })
})

// ============================================================================
// Critical Hook Integration Tests
// ============================================================================

describe('critical hook dependencies', () => {
  /**
   * These tests specifically target the React hooks that TanStack Query
   * depends on. They help identify exactly which hooks are failing.
   */

  describe('useSyncExternalStore', () => {
    it('is required by TanStack Query for store subscription', () => {
      // TanStack Query uses useSyncExternalStore internally
      // This test documents the dependency
      const { useSyncExternalStore } = require('@dotdo/react-compat')

      // The hook should exist
      expect(useSyncExternalStore).toBeDefined()

      // It should be callable (even if it throws)
      expect(typeof useSyncExternalStore).toBe('function')
    })
  })

  describe('useContext for QueryClientProvider', () => {
    it('is required for QueryClientProvider context', () => {
      // QueryClientProvider uses React.createContext + useContext
      const { createContext, useContext } = require('@dotdo/react-compat')

      expect(createContext).toBeDefined()
      expect(useContext).toBeDefined()
    })
  })

  describe('memo for performance optimizations', () => {
    it('is used by TanStack Query for component memoization', () => {
      // TanStack Query uses React.memo for performance
      const { memo } = require('@dotdo/react-compat')

      expect(memo).toBeDefined()
    })
  })
})
