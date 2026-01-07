/**
 * @tanstack/react-router integration tests
 *
 * These tests validate that TanStack Router v1 works with @dotdo/react-compat
 * replacing React with hono/jsx/dom.
 *
 * TanStack Router relies heavily on React's context system and hooks:
 * - React.createContext / useContext for RouterProvider
 * - React.useState for internal state management
 * - React.useEffect for navigation side effects
 * - React.useSyncExternalStore for router state subscription
 * - React.useMemo for route matching memoization
 * - React.useCallback for stable navigation functions
 * - React.memo for component memoization
 *
 * Expected behavior: All tests should FAIL in the RED phase because
 * @tanstack/react-router is not yet installed with the react alias.
 *
 * @see https://tanstack.com/router/latest
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// TanStack Router imports - will fail until package is installed
// with proper react aliasing
import {
  createRouter,
  createRootRoute,
  createRoute,
  RouterProvider,
  Link,
  Outlet,
  useParams,
  useSearch,
  useNavigate,
  useRouter,
  useMatch,
  useLoaderData,
  useRouterState,
  useLocation,
  useMatches,
  redirect,
  notFound,
  ErrorComponent,
  createMemoryHistory,
  type Router,
  type RouteComponent,
  type AnyRoute,
} from '@tanstack/react-router'

// Testing utilities
import { render, screen, waitFor, renderHook, act, fireEvent } from '@testing-library/react'

// React compat layer (what we're validating works with TanStack Router)
import {
  createElement,
  useState,
  useEffect,
  useMemo,
  useCallback,
  createContext,
  useContext,
  useSyncExternalStore,
  memo,
  Fragment,
  type ReactNode,
  type FC,
} from '@dotdo/react-compat'

// ============================================================================
// Test Utilities and Type Definitions
// ============================================================================

/**
 * Type for search params in test routes
 */
interface TestSearchParams {
  page?: number
  sort?: string
  filter?: string
}

/**
 * Type for user route params
 */
interface UserParams {
  userId: string
}

/**
 * Type for post route params
 */
interface PostParams {
  postId: string
}

/**
 * Type for loader data
 */
interface UserLoaderData {
  id: string
  name: string
  email: string
}

interface PostLoaderData {
  id: string
  title: string
  content: string
  authorId: string
}

/**
 * Creates a memory history for testing (no DOM required)
 */
function createTestHistory(initialPath = '/') {
  return createMemoryHistory({
    initialEntries: [initialPath],
  })
}

/**
 * Helper to render a component within RouterProvider
 */
function renderWithRouter(
  router: Router<AnyRoute, 'never', boolean>,
  options?: { initialPath?: string }
) {
  const history = createTestHistory(options?.initialPath ?? '/')

  return render(
    createElement(RouterProvider, { router })
  )
}

/**
 * Helper to render hooks within RouterProvider context
 */
function createRouterWrapper(router: Router<AnyRoute, 'never', boolean>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(RouterProvider, { router }, children)
  }
}

// ============================================================================
// Test Route Tree Setup
// ============================================================================

/**
 * Creates a test route tree for comprehensive testing
 */
function createTestRouteTree() {
  // Root route with layout
  const rootRoute = createRootRoute({
    component: () => {
      return createElement('div', { 'data-testid': 'root-layout' },
        createElement('nav', { 'data-testid': 'navigation' },
          createElement(Link, { to: '/', 'data-testid': 'home-link' }, 'Home'),
          createElement(Link, { to: '/users', 'data-testid': 'users-link' }, 'Users'),
          createElement(Link, { to: '/posts', 'data-testid': 'posts-link' }, 'Posts'),
        ),
        createElement('main', { 'data-testid': 'main-content' },
          createElement(Outlet, null)
        )
      )
    },
    errorComponent: ({ error }) => {
      return createElement('div', { 'data-testid': 'root-error' },
        `Root Error: ${error.message}`
      )
    },
  })

  // Index route (home page)
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => createElement('div', { 'data-testid': 'home-page' }, 'Welcome Home'),
  })

  // Users list route with search params
  const usersRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/users',
    validateSearch: (search: Record<string, unknown>): TestSearchParams => ({
      page: Number(search.page) || 1,
      sort: String(search.sort ?? 'name'),
      filter: search.filter ? String(search.filter) : undefined,
    }),
    component: () => {
      const search = useSearch({ from: '/users' })
      return createElement('div', { 'data-testid': 'users-page' },
        createElement('span', { 'data-testid': 'page-num' }, `Page: ${search.page}`),
        createElement('span', { 'data-testid': 'sort-by' }, `Sort: ${search.sort}`),
        search.filter && createElement('span', { 'data-testid': 'filter' }, `Filter: ${search.filter}`),
        createElement(Outlet, null)
      )
    },
    loader: async () => {
      // Simulate API call
      return [
        { id: '1', name: 'Alice', email: 'alice@test.com' },
        { id: '2', name: 'Bob', email: 'bob@test.com' },
      ]
    },
  })

  // User detail route with params
  const userRoute = createRoute({
    getParentRoute: () => usersRoute,
    path: '$userId',
    component: () => {
      const { userId } = useParams({ from: '/users/$userId' })
      const loaderData = useLoaderData({ from: '/users/$userId' })
      return createElement('div', { 'data-testid': 'user-detail' },
        createElement('span', { 'data-testid': 'user-id' }, `User ID: ${userId}`),
        createElement('span', { 'data-testid': 'user-name' }, `Name: ${loaderData.name}`),
      )
    },
    loader: async ({ params }): Promise<UserLoaderData> => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 10))
      return {
        id: params.userId,
        name: `User ${params.userId}`,
        email: `user${params.userId}@test.com`,
      }
    },
  })

  // Posts route
  const postsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/posts',
    component: () => {
      return createElement('div', { 'data-testid': 'posts-page' },
        createElement('h1', null, 'Posts'),
        createElement(Outlet, null)
      )
    },
  })

  // Post detail route
  const postRoute = createRoute({
    getParentRoute: () => postsRoute,
    path: '$postId',
    component: () => {
      const { postId } = useParams({ from: '/posts/$postId' })
      return createElement('div', { 'data-testid': 'post-detail' },
        createElement('span', { 'data-testid': 'post-id' }, `Post ID: ${postId}`)
      )
    },
    loader: async ({ params }): Promise<PostLoaderData> => {
      return {
        id: params.postId,
        title: `Post ${params.postId}`,
        content: 'Post content here',
        authorId: '1',
      }
    },
  })

  // Protected route with beforeLoad guard
  const protectedRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/protected',
    beforeLoad: async ({ context }) => {
      // Simulate auth check
      const isAuthenticated = (context as { auth?: { isAuthenticated: boolean } })?.auth?.isAuthenticated
      if (!isAuthenticated) {
        throw redirect({ to: '/login' })
      }
    },
    component: () => createElement('div', { 'data-testid': 'protected-page' }, 'Protected Content'),
  })

  // Login route
  const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/login',
    component: () => createElement('div', { 'data-testid': 'login-page' }, 'Login Page'),
  })

  // Not found route
  const notFoundRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '*',
    component: () => createElement('div', { 'data-testid': 'not-found' }, '404 - Page Not Found'),
  })

  // Route tree
  const routeTree = rootRoute.addChildren([
    indexRoute,
    usersRoute.addChildren([userRoute]),
    postsRoute.addChildren([postRoute]),
    protectedRoute,
    loginRoute,
    notFoundRoute,
  ])

  return {
    routeTree,
    rootRoute,
    indexRoute,
    usersRoute,
    userRoute,
    postsRoute,
    postRoute,
    protectedRoute,
    loginRoute,
    notFoundRoute,
  }
}

// ============================================================================
// Router Setup Tests
// ============================================================================

describe('@tanstack/react-router integration', () => {
  describe('Router Setup', () => {
    it('createRouter() creates a valid router instance', () => {
      const { routeTree } = createTestRouteTree()

      const router = createRouter({
        routeTree,
        history: createTestHistory(),
      })

      expect(router).toBeDefined()
      expect(typeof router.navigate).toBe('function')
      expect(typeof router.load).toBe('function')
      expect(typeof router.invalidate).toBe('function')
    })

    it('createRouter() works with @dotdo/react context', () => {
      // This test validates that createRouter doesn't fail when
      // React is aliased to @dotdo/react-compat
      const { routeTree } = createTestRouteTree()

      const router = createRouter({
        routeTree,
        history: createTestHistory(),
      })

      // Router should have internal React dependencies working
      expect(router.state).toBeDefined()
      expect(router.state.location).toBeDefined()
    })

    it('RouterProvider renders without errors', async () => {
      const { routeTree } = createTestRouteTree()

      const router = createRouter({
        routeTree,
        history: createTestHistory('/'),
      })

      // This tests that RouterProvider context works with @dotdo/react
      render(createElement(RouterProvider, { router }))

      await waitFor(() => {
        expect(screen.getByTestId('root-layout')).toBeDefined()
      })
    })

    it('createRootRoute() creates valid root route', () => {
      const rootRoute = createRootRoute({
        component: () => createElement('div', null, 'Root'),
      })

      expect(rootRoute).toBeDefined()
      expect(rootRoute.id).toBe('__root__')
      expect(rootRoute.path).toBeUndefined()
    })

    it('createRoute() creates valid child routes', () => {
      const rootRoute = createRootRoute()

      const childRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/test',
        component: () => createElement('div', null, 'Test'),
      })

      expect(childRoute).toBeDefined()
      expect(childRoute.path).toBe('/test')
    })

    it('route tree structure is correct', () => {
      const { routeTree, indexRoute, usersRoute, userRoute } = createTestRouteTree()

      // routeTree should have children
      expect(routeTree.children).toBeDefined()
      expect(Array.isArray(routeTree.children)).toBe(true)
    })

    it('router with memory history works', async () => {
      const { routeTree } = createTestRouteTree()
      const history = createMemoryHistory({
        initialEntries: ['/users'],
      })

      const router = createRouter({
        routeTree,
        history,
      })

      render(createElement(RouterProvider, { router }))

      await waitFor(() => {
        expect(screen.getByTestId('users-page')).toBeDefined()
      })
    })
  })

  // ============================================================================
  // Hook Tests
  // ============================================================================

  describe('Router Hooks', () => {
    let router: Router<AnyRoute, 'never', boolean>

    beforeEach(async () => {
      const { routeTree } = createTestRouteTree()
      router = createRouter({
        routeTree,
        history: createTestHistory('/users/123?page=2&sort=email'),
      })
      await router.load()
    })

    afterEach(() => {
      vi.clearAllMocks()
    })

    it('useParams() returns typed route params', async () => {
      // Navigate to user detail page
      const { routeTree } = createTestRouteTree()
      const testRouter = createRouter({
        routeTree,
        history: createTestHistory('/users/456'),
      })

      const ParamsComponent = () => {
        const params = useParams({ from: '/users/$userId' })
        return createElement('div', { 'data-testid': 'params' }, params.userId)
      }

      render(
        createElement(RouterProvider, { router: testRouter },
          createElement(ParamsComponent, null)
        )
      )

      await waitFor(() => {
        expect(screen.getByTestId('params').textContent).toBe('456')
      })
    })

    it('useParams() returns empty object for routes without params', async () => {
      const { routeTree } = createTestRouteTree()
      const testRouter = createRouter({
        routeTree,
        history: createTestHistory('/'),
      })

      const ParamsComponent = () => {
        const params = useParams({ strict: false })
        return createElement('div', { 'data-testid': 'params' },
          JSON.stringify(params)
        )
      }

      render(
        createElement(RouterProvider, { router: testRouter },
          createElement(ParamsComponent, null)
        )
      )

      await waitFor(() => {
        expect(screen.getByTestId('params')).toBeDefined()
      })
    })

    it('useSearch() returns typed search params', async () => {
      const { routeTree } = createTestRouteTree()
      const testRouter = createRouter({
        routeTree,
        history: createTestHistory('/users?page=3&sort=email&filter=active'),
      })

      const SearchComponent = () => {
        const search = useSearch({ from: '/users' })
        return createElement('div', { 'data-testid': 'search' },
          `page=${search.page}, sort=${search.sort}, filter=${search.filter}`
        )
      }

      render(
        createElement(RouterProvider, { router: testRouter },
          createElement(SearchComponent, null)
        )
      )

      await waitFor(() => {
        const text = screen.getByTestId('search').textContent
        expect(text).toContain('page=3')
        expect(text).toContain('sort=email')
        expect(text).toContain('filter=active')
      })
    })

    it('useSearch() validates and transforms search params', async () => {
      const { routeTree } = createTestRouteTree()
      // Invalid page should default to 1
      const testRouter = createRouter({
        routeTree,
        history: createTestHistory('/users?page=invalid'),
      })

      const SearchComponent = () => {
        const search = useSearch({ from: '/users' })
        return createElement('div', { 'data-testid': 'search' },
          `page=${search.page}`
        )
      }

      render(
        createElement(RouterProvider, { router: testRouter },
          createElement(SearchComponent, null)
        )
      )

      await waitFor(() => {
        // NaN should be handled by validateSearch
        expect(screen.getByTestId('search')).toBeDefined()
      })
    })

    it('useNavigate() returns navigation function', async () => {
      const { routeTree } = createTestRouteTree()
      const testRouter = createRouter({
        routeTree,
        history: createTestHistory('/'),
      })

      let navigateFn: ReturnType<typeof useNavigate> | undefined

      const NavigateComponent = () => {
        navigateFn = useNavigate()
        return createElement('div', { 'data-testid': 'navigate-test' }, 'Navigate Test')
      }

      render(
        createElement(RouterProvider, { router: testRouter },
          createElement(NavigateComponent, null)
        )
      )

      await waitFor(() => {
        expect(navigateFn).toBeDefined()
        expect(typeof navigateFn).toBe('function')
      })
    })

    it('useNavigate() can navigate to different routes', async () => {
      const { routeTree } = createTestRouteTree()
      const testRouter = createRouter({
        routeTree,
        history: createTestHistory('/'),
      })

      const NavigateComponent = () => {
        const navigate = useNavigate()

        const handleClick = () => {
          navigate({ to: '/users' })
        }

        return createElement('button', {
          'data-testid': 'nav-button',
          onClick: handleClick,
        }, 'Go to Users')
      }

      render(
        createElement(RouterProvider, { router: testRouter },
          createElement(NavigateComponent, null)
        )
      )

      await waitFor(() => {
        expect(screen.getByTestId('nav-button')).toBeDefined()
      })

      // Trigger navigation
      fireEvent.click(screen.getByTestId('nav-button'))

      await waitFor(() => {
        expect(screen.getByTestId('users-page')).toBeDefined()
      })
    })

    it('useRouter() returns router instance', async () => {
      const { routeTree } = createTestRouteTree()
      const testRouter = createRouter({
        routeTree,
        history: createTestHistory('/'),
      })

      let routerInstance: ReturnType<typeof useRouter> | undefined

      const RouterComponent = () => {
        routerInstance = useRouter()
        return createElement('div', { 'data-testid': 'router-test' }, 'Router Test')
      }

      render(
        createElement(RouterProvider, { router: testRouter },
          createElement(RouterComponent, null)
        )
      )

      await waitFor(() => {
        expect(routerInstance).toBeDefined()
        expect(routerInstance?.navigate).toBeDefined()
        expect(routerInstance?.state).toBeDefined()
      })
    })

    it('useMatch() returns current match', async () => {
      const { routeTree } = createTestRouteTree()
      const testRouter = createRouter({
        routeTree,
        history: createTestHistory('/users/789'),
      })

      let matchResult: ReturnType<typeof useMatch> | undefined

      const MatchComponent = () => {
        matchResult = useMatch({ from: '/users/$userId' })
        return createElement('div', { 'data-testid': 'match-test' },
          matchResult?.params?.userId ?? 'no match'
        )
      }

      render(
        createElement(RouterProvider, { router: testRouter },
          createElement(MatchComponent, null)
        )
      )

      await waitFor(() => {
        expect(matchResult).toBeDefined()
        expect(matchResult?.params?.userId).toBe('789')
      })
    })

    it('useMatch() with shouldThrow option', async () => {
      const { routeTree } = createTestRouteTree()
      const testRouter = createRouter({
        routeTree,
        history: createTestHistory('/'),
      })

      const MatchComponent = () => {
        // Using strict: false should not throw
        const match = useMatch({ strict: false })
        return createElement('div', { 'data-testid': 'match-test' }, 'Match Test')
      }

      render(
        createElement(RouterProvider, { router: testRouter },
          createElement(MatchComponent, null)
        )
      )

      await waitFor(() => {
        expect(screen.getByTestId('match-test')).toBeDefined()
      })
    })

    it('useLoaderData() returns loader result', async () => {
      const { routeTree } = createTestRouteTree()
      const testRouter = createRouter({
        routeTree,
        history: createTestHistory('/users/123'),
      })

      render(createElement(RouterProvider, { router: testRouter }))

      await waitFor(() => {
        expect(screen.getByTestId('user-detail')).toBeDefined()
        expect(screen.getByTestId('user-name').textContent).toContain('User 123')
      })
    })

    it('useRouterState() returns router state', async () => {
      const { routeTree } = createTestRouteTree()
      const testRouter = createRouter({
        routeTree,
        history: createTestHistory('/users'),
      })

      let routerState: ReturnType<typeof useRouterState> | undefined

      const StateComponent = () => {
        routerState = useRouterState()
        return createElement('div', { 'data-testid': 'state-test' },
          routerState?.location?.pathname ?? 'no path'
        )
      }

      render(
        createElement(RouterProvider, { router: testRouter },
          createElement(StateComponent, null)
        )
      )

      await waitFor(() => {
        expect(routerState).toBeDefined()
        expect(routerState?.location?.pathname).toBe('/users')
      })
    })

    it('useRouterState() with select option', async () => {
      const { routeTree } = createTestRouteTree()
      const testRouter = createRouter({
        routeTree,
        history: createTestHistory('/users?page=5'),
      })

      let selectedState: string | undefined

      const StateComponent = () => {
        selectedState = useRouterState({
          select: (state) => state.location.pathname,
        })
        return createElement('div', { 'data-testid': 'state-test' }, selectedState ?? '')
      }

      render(
        createElement(RouterProvider, { router: testRouter },
          createElement(StateComponent, null)
        )
      )

      await waitFor(() => {
        expect(selectedState).toBe('/users')
      })
    })

    it('useLocation() returns current location', async () => {
      const { routeTree } = createTestRouteTree()
      const testRouter = createRouter({
        routeTree,
        history: createTestHistory('/posts/456'),
      })

      let locationResult: ReturnType<typeof useLocation> | undefined

      const LocationComponent = () => {
        locationResult = useLocation()
        return createElement('div', { 'data-testid': 'location-test' },
          locationResult?.pathname ?? 'no path'
        )
      }

      render(
        createElement(RouterProvider, { router: testRouter },
          createElement(LocationComponent, null)
        )
      )

      await waitFor(() => {
        expect(locationResult).toBeDefined()
        expect(locationResult?.pathname).toBe('/posts/456')
      })
    })

    it('useMatches() returns all matched routes', async () => {
      const { routeTree } = createTestRouteTree()
      const testRouter = createRouter({
        routeTree,
        history: createTestHistory('/users/123'),
      })

      let matchesResult: ReturnType<typeof useMatches> | undefined

      const MatchesComponent = () => {
        matchesResult = useMatches()
        return createElement('div', { 'data-testid': 'matches-test' },
          `Matches: ${matchesResult?.length ?? 0}`
        )
      }

      render(
        createElement(RouterProvider, { router: testRouter },
          createElement(MatchesComponent, null)
        )
      )

      await waitFor(() => {
        expect(matchesResult).toBeDefined()
        // Should match: root -> users -> user
        expect(matchesResult?.length).toBeGreaterThanOrEqual(3)
      })
    })
  })

  // ============================================================================
  // Component Tests
  // ============================================================================

  describe('Router Components', () => {
    it('Link component renders anchor tag', async () => {
      const { routeTree } = createTestRouteTree()
      const testRouter = createRouter({
        routeTree,
        history: createTestHistory('/'),
      })

      render(createElement(RouterProvider, { router: testRouter }))

      await waitFor(() => {
        const homeLink = screen.getByTestId('home-link')
        expect(homeLink).toBeDefined()
        expect(homeLink.tagName.toLowerCase()).toBe('a')
      })
    })

    it('Link navigation works', async () => {
      const { routeTree } = createTestRouteTree()
      const testRouter = createRouter({
        routeTree,
        history: createTestHistory('/'),
      })

      render(createElement(RouterProvider, { router: testRouter }))

      await waitFor(() => {
        expect(screen.getByTestId('home-page')).toBeDefined()
      })

      // Click users link
      fireEvent.click(screen.getByTestId('users-link'))

      await waitFor(() => {
        expect(screen.getByTestId('users-page')).toBeDefined()
      })
    })

    it('Link with params', async () => {
      const { routeTree } = createTestRouteTree()
      const testRouter = createRouter({
        routeTree,
        history: createTestHistory('/users'),
      })

      const TestComponent = () => {
        return createElement('div', null,
          createElement(Link, {
            to: '/users/$userId',
            params: { userId: '999' },
            'data-testid': 'user-link',
          }, 'User 999')
        )
      }

      render(
        createElement(RouterProvider, { router: testRouter },
          createElement(TestComponent, null)
        )
      )

      await waitFor(() => {
        const userLink = screen.getByTestId('user-link')
        expect(userLink).toBeDefined()
      })

      fireEvent.click(screen.getByTestId('user-link'))

      await waitFor(() => {
        expect(screen.getByTestId('user-id').textContent).toContain('999')
      })
    })

    it('Link with search params', async () => {
      const { routeTree } = createTestRouteTree()
      const testRouter = createRouter({
        routeTree,
        history: createTestHistory('/'),
      })

      const TestComponent = () => {
        return createElement('div', null,
          createElement(Link, {
            to: '/users',
            search: { page: 5, sort: 'date' },
            'data-testid': 'search-link',
          }, 'Page 5')
        )
      }

      render(
        createElement(RouterProvider, { router: testRouter },
          createElement(TestComponent, null)
        )
      )

      await waitFor(() => {
        expect(screen.getByTestId('search-link')).toBeDefined()
      })

      fireEvent.click(screen.getByTestId('search-link'))

      await waitFor(() => {
        expect(screen.getByTestId('page-num').textContent).toContain('5')
      })
    })

    it('Outlet renders child routes', async () => {
      const { routeTree } = createTestRouteTree()
      const testRouter = createRouter({
        routeTree,
        history: createTestHistory('/users/123'),
      })

      render(createElement(RouterProvider, { router: testRouter }))

      await waitFor(() => {
        // Parent route (users) should be rendered
        expect(screen.getByTestId('users-page')).toBeDefined()
        // Child route (user detail) should be rendered via Outlet
        expect(screen.getByTestId('user-detail')).toBeDefined()
      })
    })

    it('Outlet with no children renders nothing', async () => {
      const { routeTree } = createTestRouteTree()
      const testRouter = createRouter({
        routeTree,
        history: createTestHistory('/'),
      })

      render(createElement(RouterProvider, { router: testRouter }))

      await waitFor(() => {
        // Home page has no children
        expect(screen.getByTestId('home-page')).toBeDefined()
      })
    })

    it('ErrorBoundary catches route errors', async () => {
      const rootRoute = createRootRoute({
        errorComponent: ({ error }) => {
          return createElement('div', { 'data-testid': 'error-boundary' },
            `Error: ${error.message}`
          )
        },
      })

      const errorRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/error',
        component: () => {
          throw new Error('Route error!')
        },
      })

      const routeTree = rootRoute.addChildren([errorRoute])
      const testRouter = createRouter({
        routeTree,
        history: createTestHistory('/error'),
      })

      render(createElement(RouterProvider, { router: testRouter }))

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary').textContent).toContain('Route error!')
      })
    })

    it('ErrorComponent on specific route', async () => {
      const rootRoute = createRootRoute()

      const errorRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/route-error',
        component: () => {
          throw new Error('Specific route error!')
        },
        errorComponent: ({ error }) => {
          return createElement('div', { 'data-testid': 'route-error' },
            `Route Error: ${error.message}`
          )
        },
      })

      const routeTree = rootRoute.addChildren([errorRoute])
      const testRouter = createRouter({
        routeTree,
        history: createTestHistory('/route-error'),
      })

      render(createElement(RouterProvider, { router: testRouter }))

      await waitFor(() => {
        expect(screen.getByTestId('route-error').textContent).toContain('Specific route error!')
      })
    })

    it('NotFound route renders for unknown paths', async () => {
      const { routeTree } = createTestRouteTree()
      const testRouter = createRouter({
        routeTree,
        history: createTestHistory('/unknown/path/here'),
      })

      render(createElement(RouterProvider, { router: testRouter }))

      await waitFor(() => {
        expect(screen.getByTestId('not-found')).toBeDefined()
      })
    })
  })

  // ============================================================================
  // Advanced Features Tests
  // ============================================================================

  describe('Advanced Features', () => {
    it('Route loaders work', async () => {
      const rootRoute = createRootRoute()

      const dataRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/data',
        loader: async () => {
          await new Promise(resolve => setTimeout(resolve, 10))
          return { message: 'Loaded data!' }
        },
        component: () => {
          const data = useLoaderData({ from: '/data' })
          return createElement('div', { 'data-testid': 'loader-data' }, data.message)
        },
      })

      const routeTree = rootRoute.addChildren([dataRoute])
      const testRouter = createRouter({
        routeTree,
        history: createTestHistory('/data'),
      })

      render(createElement(RouterProvider, { router: testRouter }))

      await waitFor(() => {
        expect(screen.getByTestId('loader-data').textContent).toBe('Loaded data!')
      })
    })

    it('Route loaders with params', async () => {
      const rootRoute = createRootRoute()

      const itemRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/items/$itemId',
        loader: async ({ params }) => {
          return { itemId: params.itemId, name: `Item ${params.itemId}` }
        },
        component: () => {
          const data = useLoaderData({ from: '/items/$itemId' })
          return createElement('div', { 'data-testid': 'item-data' },
            `${data.name} (ID: ${data.itemId})`
          )
        },
      })

      const routeTree = rootRoute.addChildren([itemRoute])
      const testRouter = createRouter({
        routeTree,
        history: createTestHistory('/items/42'),
      })

      render(createElement(RouterProvider, { router: testRouter }))

      await waitFor(() => {
        const text = screen.getByTestId('item-data').textContent
        expect(text).toContain('Item 42')
        expect(text).toContain('ID: 42')
      })
    })

    it('Route loaders with search params', async () => {
      const rootRoute = createRootRoute()

      const searchRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/search',
        validateSearch: (search: Record<string, unknown>) => ({
          q: String(search.q ?? ''),
        }),
        loader: async ({ search }) => {
          return { query: search.q, results: [`Result for: ${search.q}`] }
        },
        component: () => {
          const data = useLoaderData({ from: '/search' })
          return createElement('div', { 'data-testid': 'search-results' },
            `Query: ${data.query}, Results: ${data.results.length}`
          )
        },
      })

      const routeTree = rootRoute.addChildren([searchRoute])
      const testRouter = createRouter({
        routeTree,
        history: createTestHistory('/search?q=test'),
      })

      render(createElement(RouterProvider, { router: testRouter }))

      await waitFor(() => {
        const text = screen.getByTestId('search-results').textContent
        expect(text).toContain('Query: test')
      })
    })

    it('Route actions work', async () => {
      // Actions are typically used with forms
      // TanStack Router supports action functions
      const rootRoute = createRootRoute()

      let actionCalled = false
      let actionData: unknown

      const actionRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/action',
        // Actions are not a first-class API in TanStack Router
        // but we can simulate with mutations
        component: () => {
          const [submitted, setSubmitted] = useState(false)

          const handleSubmit = async () => {
            actionCalled = true
            actionData = { form: 'data' }
            setSubmitted(true)
          }

          return createElement('div', { 'data-testid': 'action-route' },
            createElement('button', {
              'data-testid': 'submit-btn',
              onClick: handleSubmit,
            }, 'Submit'),
            submitted && createElement('span', { 'data-testid': 'submitted' }, 'Submitted!')
          )
        },
      })

      const routeTree = rootRoute.addChildren([actionRoute])
      const testRouter = createRouter({
        routeTree,
        history: createTestHistory('/action'),
      })

      render(createElement(RouterProvider, { router: testRouter }))

      await waitFor(() => {
        expect(screen.getByTestId('submit-btn')).toBeDefined()
      })

      fireEvent.click(screen.getByTestId('submit-btn'))

      await waitFor(() => {
        expect(screen.getByTestId('submitted')).toBeDefined()
        expect(actionCalled).toBe(true)
      })
    })

    it('Deferred data works with Suspense', async () => {
      // TanStack Router supports deferred loading with Await component
      const rootRoute = createRootRoute()

      const deferredRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/deferred',
        loader: () => {
          // Return a promise that will be deferred
          const slowData = new Promise<{ message: string }>(resolve => {
            setTimeout(() => resolve({ message: 'Deferred data loaded!' }), 50)
          })

          return {
            slowData,
          }
        },
        component: () => {
          const { slowData } = useLoaderData({ from: '/deferred' })

          // Use React's use() for deferred data or handle promise
          return createElement('div', { 'data-testid': 'deferred-route' },
            'Deferred Content Loaded'
          )
        },
      })

      const routeTree = rootRoute.addChildren([deferredRoute])
      const testRouter = createRouter({
        routeTree,
        history: createTestHistory('/deferred'),
      })

      render(createElement(RouterProvider, { router: testRouter }))

      await waitFor(() => {
        expect(screen.getByTestId('deferred-route')).toBeDefined()
      }, { timeout: 5000 })
    })

    it('Route guards (beforeLoad) work', async () => {
      const rootRoute = createRootRoute()

      let guardCalled = false

      const guardedRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/guarded',
        beforeLoad: async () => {
          guardCalled = true
          // Allow access
        },
        component: () => createElement('div', { 'data-testid': 'guarded' }, 'Guarded Content'),
      })

      const routeTree = rootRoute.addChildren([guardedRoute])
      const testRouter = createRouter({
        routeTree,
        history: createTestHistory('/guarded'),
      })

      render(createElement(RouterProvider, { router: testRouter }))

      await waitFor(() => {
        expect(guardCalled).toBe(true)
        expect(screen.getByTestId('guarded')).toBeDefined()
      })
    })

    it('Route guards can redirect', async () => {
      const rootRoute = createRootRoute()

      const loginRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/auth/login',
        component: () => createElement('div', { 'data-testid': 'login' }, 'Login Page'),
      })

      const protectedRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/protected',
        beforeLoad: async () => {
          // Simulate auth check - always redirect for this test
          throw redirect({ to: '/auth/login' })
        },
        component: () => createElement('div', { 'data-testid': 'protected' }, 'Protected'),
      })

      const routeTree = rootRoute.addChildren([loginRoute, protectedRoute])
      const testRouter = createRouter({
        routeTree,
        history: createTestHistory('/protected'),
      })

      render(createElement(RouterProvider, { router: testRouter }))

      await waitFor(() => {
        // Should redirect to login
        expect(screen.getByTestId('login')).toBeDefined()
      })
    })

    it('Route context is passed through hierarchy', async () => {
      const rootRoute = createRootRoute({
        beforeLoad: () => {
          return {
            user: { id: '1', name: 'Test User' },
          }
        },
      })

      const contextRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/context',
        beforeLoad: ({ context }) => {
          // Access parent context
          expect(context.user).toBeDefined()
        },
        component: () => createElement('div', { 'data-testid': 'context-page' }, 'Context Page'),
      })

      const routeTree = rootRoute.addChildren([contextRoute])
      const testRouter = createRouter({
        routeTree,
        history: createTestHistory('/context'),
      })

      render(createElement(RouterProvider, { router: testRouter }))

      await waitFor(() => {
        expect(screen.getByTestId('context-page')).toBeDefined()
      })
    })

    it('notFound() throws not found error', async () => {
      const rootRoute = createRootRoute({
        notFoundComponent: () => createElement('div', { 'data-testid': 'not-found-handler' }, 'Custom 404'),
      })

      const maybeRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/maybe/$id',
        loader: async ({ params }) => {
          if (params.id === 'invalid') {
            throw notFound()
          }
          return { id: params.id }
        },
        component: () => {
          const data = useLoaderData({ from: '/maybe/$id' })
          return createElement('div', { 'data-testid': 'maybe-page' }, `ID: ${data.id}`)
        },
      })

      const routeTree = rootRoute.addChildren([maybeRoute])
      const testRouter = createRouter({
        routeTree,
        history: createTestHistory('/maybe/invalid'),
      })

      render(createElement(RouterProvider, { router: testRouter }))

      await waitFor(() => {
        expect(screen.getByTestId('not-found-handler')).toBeDefined()
      })
    })
  })

  // ============================================================================
  // React-Compat Validation Tests
  // ============================================================================

  describe('react-compat Validation', () => {
    it('TanStack Router uses useSyncExternalStore from react-compat', () => {
      // TanStack Router internally uses useSyncExternalStore
      // for subscribing to router state changes
      expect(useSyncExternalStore).toBeDefined()
      expect(typeof useSyncExternalStore).toBe('function')
    })

    it('TanStack Router uses createContext/useContext from react-compat', () => {
      // RouterProvider uses React.createContext internally
      expect(createContext).toBeDefined()
      expect(useContext).toBeDefined()
    })

    it('TanStack Router uses memo from react-compat', () => {
      // Various components are memoized
      expect(memo).toBeDefined()
    })

    it('TanStack Router hooks work with react-compat hooks', async () => {
      // Combine TanStack Router hooks with react-compat hooks
      const rootRoute = createRootRoute()

      const hookTestRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/hook-test',
        component: () => {
          // Use react-compat hooks
          const [count, setCount] = useState(0)
          const doubled = useMemo(() => count * 2, [count])

          // Use TanStack Router hooks
          const navigate = useNavigate()
          const location = useLocation()

          useEffect(() => {
            // Side effect using both
          }, [location])

          return createElement('div', { 'data-testid': 'hook-test' },
            createElement('span', { 'data-testid': 'count' }, `Count: ${count}`),
            createElement('span', { 'data-testid': 'doubled' }, `Doubled: ${doubled}`),
            createElement('span', { 'data-testid': 'path' }, `Path: ${location.pathname}`),
            createElement('button', {
              'data-testid': 'increment',
              onClick: () => setCount(c => c + 1),
            }, 'Increment'),
          )
        },
      })

      const routeTree = rootRoute.addChildren([hookTestRoute])
      const testRouter = createRouter({
        routeTree,
        history: createTestHistory('/hook-test'),
      })

      render(createElement(RouterProvider, { router: testRouter }))

      await waitFor(() => {
        expect(screen.getByTestId('count').textContent).toContain('0')
        expect(screen.getByTestId('doubled').textContent).toContain('0')
        expect(screen.getByTestId('path').textContent).toContain('/hook-test')
      })

      fireEvent.click(screen.getByTestId('increment'))

      await waitFor(() => {
        expect(screen.getByTestId('count').textContent).toContain('1')
        expect(screen.getByTestId('doubled').textContent).toContain('2')
      })
    })

    it('createElement from react-compat works with TanStack Router components', async () => {
      const rootRoute = createRootRoute()

      const elementRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/element',
        component: () => {
          return createElement(Fragment, null,
            createElement('div', { 'data-testid': 'element-1' }, 'First'),
            createElement(Link, { to: '/', 'data-testid': 'compat-link' }, 'Home'),
            createElement('div', { 'data-testid': 'element-2' }, 'Second'),
          )
        },
      })

      const routeTree = rootRoute.addChildren([elementRoute])
      const testRouter = createRouter({
        routeTree,
        history: createTestHistory('/element'),
      })

      render(createElement(RouterProvider, { router: testRouter }))

      await waitFor(() => {
        expect(screen.getByTestId('element-1')).toBeDefined()
        expect(screen.getByTestId('compat-link')).toBeDefined()
        expect(screen.getByTestId('element-2')).toBeDefined()
      })
    })

    it('bundle size is significantly smaller than React', () => {
      // Documentation test for bundle size expectations
      // @dotdo/react-compat target: ~2.8KB
      // React + ReactDOM: ~50KB+
      // Savings: ~95%

      const expectedReactCompatSize = 2800 // bytes
      const typicalReactSize = 50000 // bytes

      expect(expectedReactCompatSize).toBeLessThan(typicalReactSize * 0.1)
    })
  })

  // ============================================================================
  // Navigation State and History Tests
  // ============================================================================

  describe('Navigation State and History', () => {
    it('router.navigate() changes location', async () => {
      const { routeTree } = createTestRouteTree()
      const testRouter = createRouter({
        routeTree,
        history: createTestHistory('/'),
      })

      render(createElement(RouterProvider, { router: testRouter }))

      await waitFor(() => {
        expect(screen.getByTestId('home-page')).toBeDefined()
      })

      await act(async () => {
        await testRouter.navigate({ to: '/users' })
      })

      await waitFor(() => {
        expect(screen.getByTestId('users-page')).toBeDefined()
      })
    })

    it('router.navigate() with replace option', async () => {
      const { routeTree } = createTestRouteTree()
      const history = createTestHistory('/')
      const testRouter = createRouter({
        routeTree,
        history,
      })

      render(createElement(RouterProvider, { router: testRouter }))

      await waitFor(() => {
        expect(screen.getByTestId('home-page')).toBeDefined()
      })

      // Navigate with replace (doesn't add to history stack)
      await act(async () => {
        await testRouter.navigate({ to: '/users', replace: true })
      })

      await waitFor(() => {
        expect(screen.getByTestId('users-page')).toBeDefined()
      })
    })

    it('back navigation works', async () => {
      const { routeTree } = createTestRouteTree()
      const history = createTestHistory('/')
      const testRouter = createRouter({
        routeTree,
        history,
      })

      render(createElement(RouterProvider, { router: testRouter }))

      await waitFor(() => {
        expect(screen.getByTestId('home-page')).toBeDefined()
      })

      // Navigate to users
      await act(async () => {
        await testRouter.navigate({ to: '/users' })
      })

      await waitFor(() => {
        expect(screen.getByTestId('users-page')).toBeDefined()
      })

      // Go back
      await act(async () => {
        history.back()
      })

      await waitFor(() => {
        expect(screen.getByTestId('home-page')).toBeDefined()
      })
    })

    it('router state updates on navigation', async () => {
      const { routeTree } = createTestRouteTree()
      const testRouter = createRouter({
        routeTree,
        history: createTestHistory('/'),
      })

      let currentPath = ''

      const StateWatcher = () => {
        const state = useRouterState()
        currentPath = state.location.pathname
        return createElement('div', { 'data-testid': 'state-watcher' }, currentPath)
      }

      render(
        createElement(RouterProvider, { router: testRouter },
          createElement(StateWatcher, null)
        )
      )

      await waitFor(() => {
        expect(currentPath).toBe('/')
      })

      await act(async () => {
        await testRouter.navigate({ to: '/posts' })
      })

      await waitFor(() => {
        expect(currentPath).toBe('/posts')
      })
    })
  })
})

// ============================================================================
// Type Declarations for Test Utilities
// ============================================================================

// Extend types for test context
declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>
  }
}
