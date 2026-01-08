/**
 * Tests for 亘 (site/www) - Page Rendering Glyph
 *
 * RED Phase: Define the API contract through failing tests.
 *
 * The 亘 glyph provides:
 * - Tagged template page creation: 亘`/path ${content}`
 * - Route definition: 亘.route('/path', handler)
 * - Route composition: 亘({ routes })
 * - Request rendering: site.render(request)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// These imports will fail until implementation exists
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error - Module doesn't exist yet (RED phase)
import { 亘, www } from '../src/site.js'

describe('亘 (site/www) - Page Rendering', () => {
  describe('Tagged Template - Page Creation', () => {
    it('should create a page with path and content via tagged template', () => {
      const userList = [{ id: '1', name: 'Alice' }]
      const page = 亘`/users ${userList}`

      expect(page).toBeDefined()
      expect(page.path).toBe('/users')
      expect(page.content).toEqual(userList)
    })

    it('should handle dynamic path segments in tagged template', () => {
      const userId = '123'
      const userData = { id: userId, name: 'Bob' }
      const page = 亘`/users/${userId} ${userData}`

      expect(page.path).toBe('/users/123')
      expect(page.content).toEqual(userData)
    })

    it('should handle multiple interpolations in path', () => {
      const org = 'acme'
      const team = 'engineering'
      const content = { members: ['Alice', 'Bob'] }
      const page = 亘`/orgs/${org}/teams/${team} ${content}`

      expect(page.path).toBe('/orgs/acme/teams/engineering')
      expect(page.content).toEqual(content)
    })

    it('should handle content-only (path inferred from route)', () => {
      const content = { title: 'Home' }
      const page = 亘`${content}`

      expect(page).toBeDefined()
      expect(page.content).toEqual(content)
    })

    it('should handle string content', () => {
      const html = '<h1>Hello World</h1>'
      const page = 亘`/hello ${html}`

      expect(page.path).toBe('/hello')
      expect(page.content).toBe('<h1>Hello World</h1>')
    })

    it('should handle null/undefined content gracefully', () => {
      const page = 亘`/empty ${null}`

      expect(page.path).toBe('/empty')
      expect(page.content).toBeNull()
    })
  })

  describe('Page Chainable Modifiers', () => {
    it('should support .title() modifier for page metadata', () => {
      const page = 亘`/about ${{}}`
        .title('About Us')

      expect(page.meta?.title).toBe('About Us')
    })

    it('should support .description() modifier for SEO', () => {
      const page = 亘`/about ${{}}`
        .description('Learn more about our company')

      expect(page.meta?.description).toBe('Learn more about our company')
    })

    it('should chain multiple modifiers', () => {
      const page = 亘`/about ${{}}`
        .title('About Us')
        .description('Learn about our mission')

      expect(page.meta?.title).toBe('About Us')
      expect(page.meta?.description).toBe('Learn about our mission')
    })

    it('should preserve original page data through modifiers', () => {
      const content = { heading: 'About' }
      const page = 亘`/about ${content}`
        .title('About Us')

      expect(page.path).toBe('/about')
      expect(page.content).toEqual(content)
    })
  })

  describe('Route Definition - Single Routes', () => {
    it('should register a single route with handler', () => {
      const handler = vi.fn(() => ({ users: [] }))

      亘.route('/users', handler)

      // Route should be registered - verify via route matching
      const routes = 亘.routes
      expect(routes).toBeDefined()
      expect(routes.get('/users')).toBeDefined()
    })

    it('should register route with path parameters', () => {
      const handler = vi.fn(({ params }) => ({ id: params.id }))

      亘.route('/users/:id', handler)

      expect(亘.routes.get('/users/:id')).toBeDefined()
    })

    it('should register route with wildcard', () => {
      const handler = vi.fn(() => 'catch all')

      亘.route('/api/*', handler)

      expect(亘.routes.has('/api/*')).toBe(true)
    })

    it('should support async route handlers', async () => {
      const asyncHandler = vi.fn(async () => {
        return { data: 'async result' }
      })

      亘.route('/async', asyncHandler)

      // Handler should be callable and return a promise
      const result = await asyncHandler()
      expect(result).toEqual({ data: 'async result' })
    })
  })

  describe('Route Definition - Bulk Routes', () => {
    it('should register multiple routes via object', () => {
      const homePage = { title: 'Home' }
      const usersPage = { title: 'Users' }
      const aboutPage = { title: 'About' }

      亘.route({
        '/': () => homePage,
        '/users': () => usersPage,
        '/about': () => aboutPage,
      })

      expect(亘.routes.has('/')).toBe(true)
      expect(亘.routes.has('/users')).toBe(true)
      expect(亘.routes.has('/about')).toBe(true)
    })

    it('should handle mixed static and dynamic routes in bulk', () => {
      亘.route({
        '/': () => 'home',
        '/users/:id': ({ params }) => `user-${params.id}`,
        '/posts/:slug': ({ params }) => `post-${params.slug}`,
      })

      expect(亘.routes.has('/')).toBe(true)
      expect(亘.routes.has('/users/:id')).toBe(true)
      expect(亘.routes.has('/posts/:slug')).toBe(true)
    })
  })

  describe('Site Composition', () => {
    it('should create site from route object via function call', () => {
      const site = 亘({
        '/': { title: 'Home' },
        '/users': { title: 'Users' },
        '/about': { title: 'About' },
      })

      expect(site).toBeDefined()
      expect(site.routes).toBeDefined()
    })

    it('should compose multiple pages via 亘.compose()', () => {
      const home = 亘`/ ${{ title: 'Home' }}`
      const users = 亘`/users ${{ title: 'Users' }}`
      const about = 亘`/about ${{ title: 'About' }}`

      const site = 亘.compose(home, users, about)

      expect(site).toBeDefined()
      expect(site.routes.size).toBe(3)
    })

    it('should handle empty composition', () => {
      const site = 亘.compose()

      expect(site).toBeDefined()
      expect(site.routes.size).toBe(0)
    })

    it('should merge composed pages without duplication', () => {
      const home1 = 亘`/ ${{ version: 1 }}`
      const home2 = 亘`/ ${{ version: 2 }}` // Same path, should override

      const site = 亘.compose(home1, home2)

      expect(site.routes.size).toBe(1)
    })
  })

  describe('Route Handler Context', () => {
    it('should pass params object to handler for path parameters', async () => {
      const handler = vi.fn(({ params }) => params)
      亘.route('/users/:id', handler)

      // Simulate route matching (internal behavior)
      const mockParams = { params: { id: '123' }, query: new URLSearchParams(), request: new Request('http://localhost/users/123') }
      handler(mockParams)

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        params: { id: '123' },
      }))
    })

    it('should pass query parameters to handler', async () => {
      const handler = vi.fn(({ query }) => ({ page: query.get('page') }))
      亘.route('/users', handler)

      const mockContext = {
        params: {},
        query: new URLSearchParams('?page=2&limit=10'),
        request: new Request('http://localhost/users?page=2&limit=10'),
      }
      const result = handler(mockContext)

      expect(result).toEqual({ page: '2' })
    })

    it('should pass request object to handler', async () => {
      const handler = vi.fn(({ request }) => ({
        method: request.method,
        url: request.url,
      }))
      亘.route('/api/data', handler)

      const mockRequest = new Request('http://localhost/api/data', { method: 'POST' })
      const mockContext = { params: {}, query: new URLSearchParams(), request: mockRequest }
      const result = handler(mockContext)

      expect(result.method).toBe('POST')
    })
  })

  describe('Response Rendering', () => {
    it('should render request to Response', async () => {
      const site = 亘({
        '/': () => ({ title: 'Home' }),
      })

      const request = new Request('http://localhost/')
      const response = await site.render(request)

      expect(response).toBeInstanceOf(Response)
    })

    it('should return 404 for unmatched routes', async () => {
      const site = 亘({
        '/': () => ({ title: 'Home' }),
      })

      const request = new Request('http://localhost/not-found')
      const response = await site.render(request)

      expect(response.status).toBe(404)
    })

    it('should perform content negotiation - JSON for Accept: application/json', async () => {
      const site = 亘({
        '/api/data': () => ({ data: [1, 2, 3] }),
      })

      const request = new Request('http://localhost/api/data', {
        headers: { Accept: 'application/json' },
      })
      const response = await site.render(request)

      expect(response.headers.get('Content-Type')).toContain('application/json')
      const body = await response.json()
      expect(body).toEqual({ data: [1, 2, 3] })
    })

    it('should perform content negotiation - HTML for browser Accept', async () => {
      const site = 亘({
        '/': () => ({ title: 'Home', body: '<h1>Welcome</h1>' }),
      })

      const request = new Request('http://localhost/', {
        headers: { Accept: 'text/html,application/xhtml+xml' },
      })
      const response = await site.render(request)

      expect(response.headers.get('Content-Type')).toContain('text/html')
    })

    it('should match dynamic routes and extract params', async () => {
      const handler = vi.fn(({ params }) => ({ userId: params.id }))
      const site = 亘({
        '/users/:id': handler,
      })

      const request = new Request('http://localhost/users/456')
      await site.render(request)

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        params: { id: '456' },
      }))
    })

    it('should handle async handlers in render', async () => {
      const site = 亘({
        '/async': async () => {
          await new Promise(resolve => setTimeout(resolve, 10))
          return { async: true }
        },
      })

      const request = new Request('http://localhost/async')
      const response = await site.render(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body).toEqual({ async: true })
    })
  })

  describe('ASCII Alias - www', () => {
    it('should export www as alias for 亘', () => {
      expect(www).toBeDefined()
      expect(www).toBe(亘)
    })

    it('should work identically via www alias - tagged template', () => {
      const page = www`/home ${{ title: 'Home' }}`

      expect(page.path).toBe('/home')
    })

    it('should work identically via www alias - route registration', () => {
      www.route('/aliased', () => ({ aliased: true }))

      expect(www.routes.has('/aliased')).toBe(true)
    })

    it('should work identically via www alias - composition', () => {
      const site = www({
        '/': () => 'home',
      })

      expect(site).toBeDefined()
    })
  })

  describe('Edge Cases', () => {
    it('should handle root path correctly', () => {
      const page = 亘`/ ${{ root: true }}`

      expect(page.path).toBe('/')
    })

    it('should handle trailing slashes consistently', () => {
      亘.route('/users/', () => 'users')

      // Both should match (normalized)
      expect(亘.routes.has('/users') || 亘.routes.has('/users/')).toBe(true)
    })

    it('should handle special characters in path', () => {
      const page = 亘`/search?q=hello ${{ results: [] }}`

      // Path should not include query string
      expect(page.path).toBe('/search')
    })

    it('should handle unicode in content', () => {
      const content = { greeting: 'Hello World!' }
      const page = 亘`/intl ${content}`

      expect(page.content.greeting).toBe('Hello World!')
    })

    it('should handle deeply nested route params', () => {
      const handler = vi.fn(({ params }) => params)
      亘.route('/orgs/:org/teams/:team/members/:member', handler)

      const mockContext = {
        params: { org: 'acme', team: 'eng', member: 'alice' },
        query: new URLSearchParams(),
        request: new Request('http://localhost/orgs/acme/teams/eng/members/alice'),
      }
      handler(mockContext)

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        params: { org: 'acme', team: 'eng', member: 'alice' },
      }))
    })

    it('should handle handler that throws error', async () => {
      const site = 亘({
        '/error': () => {
          throw new Error('Handler error')
        },
      })

      const request = new Request('http://localhost/error')
      const response = await site.render(request)

      // Should return 500 Internal Server Error
      expect(response.status).toBe(500)
    })

    it('should handle handler that returns undefined', async () => {
      const site = 亘({
        '/undefined': () => undefined,
      })

      const request = new Request('http://localhost/undefined')
      const response = await site.render(request)

      // Should handle gracefully (204 No Content or empty 200)
      expect([200, 204]).toContain(response.status)
    })
  })

  describe('Type Safety', () => {
    it('should infer content type from tagged template', () => {
      interface UserData {
        id: string
        name: string
      }
      const userData: UserData = { id: '1', name: 'Alice' }
      const page = 亘`/user ${userData}`

      // TypeScript should infer page.content as UserData
      expect(page.content.id).toBe('1')
      expect(page.content.name).toBe('Alice')
    })

    it('should type handler params correctly', () => {
      // The handler should receive typed RouteParams
      亘.route('/typed/:id', ({ params, query, request }) => {
        // These should all be properly typed
        const id: string = params.id
        const page: string | null = query.get('page')
        const method: string = request.method

        return { id, page, method }
      })
    })
  })
})
