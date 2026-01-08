/**
 * 亘 (site/www) - Page Rendering Glyph
 *
 * A visual programming glyph for building websites and pages.
 * The 亘 character represents continuity/permanence - like a website that persists.
 *
 * API:
 * - Tagged template: 亘`/path ${content}`
 * - Route definition: 亘.route('/path', handler)
 * - Bulk routes: 亘.route({ '/': handler, '/about': handler })
 * - Composition: 亘.compose(page1, page2)
 * - Site creation: 亘({ '/': content })
 * - Rendering: site.render(request)
 */

// Types for the site system

export interface Page {
  path: string
  content: unknown
  meta?: PageMeta
  title(title: string): Page
  description(desc: string): Page
}

export interface PageMeta {
  title?: string
  description?: string
}

export interface RouteParams {
  params: Record<string, string>
  query: URLSearchParams
  request: Request
}

export type RouteHandler = (context: RouteParams) => unknown | Promise<unknown>

export interface Site {
  routes: Map<string, RouteHandler>
  render(request: Request): Promise<Response>
}

export interface SiteBuilder {
  (strings: TemplateStringsArray, ...values: unknown[]): Page
  (routes: Record<string, unknown>): Site
  route(path: string, handler: RouteHandler): void
  route(routes: Record<string, RouteHandler>): void
  routes: Map<string, RouteHandler>
  compose(...pages: Page[]): Site
}

/**
 * Create a Page object with chainable modifiers
 */
function createPage(path: string, content: unknown, meta?: PageMeta): Page {
  const page: Page = {
    path,
    content,
    meta: meta || {},
    title(title: string): Page {
      return createPage(this.path, this.content, { ...this.meta, title })
    },
    description(desc: string): Page {
      return createPage(this.path, this.content, { ...this.meta, description: desc })
    },
  }
  return page
}

/**
 * Parse a route pattern and extract parameter names
 * e.g., '/users/:id/posts/:postId' -> ['id', 'postId']
 */
function parseRouteParams(pattern: string): string[] {
  const params: string[] = []
  const segments = pattern.split('/')
  for (const segment of segments) {
    if (segment.startsWith(':')) {
      params.push(segment.slice(1))
    }
  }
  return params
}

/**
 * Match a URL path against a route pattern
 * Returns extracted params if matched, null otherwise
 */
function matchRoute(
  pattern: string,
  urlPath: string
): Record<string, string> | null {
  const patternSegments = pattern.split('/').filter(Boolean)
  const urlSegments = urlPath.split('/').filter(Boolean)

  // Check for wildcard
  const hasWildcard = pattern.includes('*')

  if (!hasWildcard && patternSegments.length !== urlSegments.length) {
    return null
  }

  const params: Record<string, string> = {}

  for (let i = 0; i < patternSegments.length; i++) {
    const patternSeg = patternSegments[i]
    const urlSeg = urlSegments[i]

    if (patternSeg === '*') {
      // Wildcard matches rest of path
      return params
    }

    if (patternSeg.startsWith(':')) {
      // Parameter segment
      if (!urlSeg) return null
      params[patternSeg.slice(1)] = urlSeg
    } else if (patternSeg !== urlSeg) {
      // Static segment mismatch
      return null
    }
  }

  return params
}

/**
 * Normalize a path (remove trailing slashes except for root)
 */
function normalizePath(path: string): string {
  if (path === '/') return path
  return path.replace(/\/+$/, '')
}

/**
 * Parse path from tagged template, handling:
 * - Static paths: `/users`
 * - Dynamic paths: `/users/${id}`
 * - Content-only (no path): `${content}`
 * - Query strings: `/search?q=hello` -> `/search`
 */
function parseTaggedTemplate(
  strings: TemplateStringsArray,
  values: unknown[]
): { path: string; content: unknown } {
  // Build the path from template strings and values
  // The last value is typically the content

  let fullPath = ''
  let content: unknown = undefined

  // If there's only one interpolation and no leading text, it's content-only
  if (strings.length === 2 && strings[0].trim() === '' && strings[1].trim() === '') {
    return { path: '', content: values[0] }
  }

  // Build path from all but the last value (last value is content)
  for (let i = 0; i < strings.length; i++) {
    fullPath += strings[i]
    if (i < values.length - 1) {
      // Values in the middle are part of the path
      fullPath += String(values[i])
    }
  }

  // Last value is the content
  content = values[values.length - 1]

  // Trim and normalize the path
  fullPath = fullPath.trim()

  // Remove query string if present
  const queryIndex = fullPath.indexOf('?')
  if (queryIndex !== -1) {
    fullPath = fullPath.slice(0, queryIndex)
  }

  // Normalize path
  fullPath = normalizePath(fullPath)

  return { path: fullPath, content }
}

/**
 * Create a Site object from routes
 */
function createSite(routes: Map<string, RouteHandler>): Site {
  return {
    routes,
    async render(request: Request): Promise<Response> {
      const url = new URL(request.url)
      const urlPath = normalizePath(url.pathname)
      const query = url.searchParams
      const acceptHeader = request.headers.get('Accept') || ''

      // Try to match a route
      let matchedHandler: RouteHandler | undefined
      let matchedParams: Record<string, string> = {}

      // First try exact match
      if (routes.has(urlPath)) {
        matchedHandler = routes.get(urlPath)
      } else if (routes.has(urlPath + '/')) {
        matchedHandler = routes.get(urlPath + '/')
      } else {
        // Try pattern matching
        for (const [pattern, handler] of routes) {
          const params = matchRoute(pattern, urlPath)
          if (params !== null) {
            matchedHandler = handler
            matchedParams = params
            break
          }
        }
      }

      if (!matchedHandler) {
        return new Response('Not Found', { status: 404 })
      }

      // Execute handler
      let result: unknown
      try {
        result = await matchedHandler({
          params: matchedParams,
          query,
          request,
        })
      } catch (error) {
        return new Response('Internal Server Error', { status: 500 })
      }

      // Handle undefined result
      if (result === undefined) {
        return new Response(null, { status: 204 })
      }

      // Content negotiation - prioritize explicit Accept header
      const wantsHtml = acceptHeader.includes('text/html')
      const wantsJson = acceptHeader.includes('application/json')

      // If client explicitly wants JSON, return JSON
      // If client explicitly wants HTML, return HTML even if result is object
      // If no preference and result is object, default to JSON
      if (wantsJson && !wantsHtml) {
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (wantsHtml) {
        // Return HTML - if result is object, wrap it in HTML structure
        const htmlContent =
          typeof result === 'string'
            ? result
            : typeof result === 'object' && result !== null && 'body' in result
              ? `<!DOCTYPE html><html><head><title>${(result as { title?: string }).title || ''}</title></head><body>${(result as { body: string }).body}</body></html>`
              : `<pre>${JSON.stringify(result, null, 2)}</pre>`
        return new Response(htmlContent, {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        })
      }

      // No explicit preference - default to JSON for objects, HTML for strings
      if (typeof result === 'object') {
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // Default to HTML for string results
      return new Response(String(result), {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    },
  }
}

/**
 * Global routes registry for the site builder
 */
const globalRoutes = new Map<string, RouteHandler>()

/**
 * The main site builder proxy
 *
 * Can be called as:
 * - Tagged template: 亘`/path ${content}` -> Page
 * - Function with routes: 亘({ '/': handler }) -> Site
 */
function createSiteBuilder(): SiteBuilder {
  const builder = function (
    stringsOrRoutes: TemplateStringsArray | Record<string, unknown>,
    ...values: unknown[]
  ): Page | Site {
    // Check if called as tagged template or function
    if (Array.isArray(stringsOrRoutes) && 'raw' in stringsOrRoutes) {
      // Tagged template call
      const strings = stringsOrRoutes as TemplateStringsArray
      const { path, content } = parseTaggedTemplate(strings, values)
      return createPage(path, content)
    } else {
      // Function call with routes object
      const routesObj = stringsOrRoutes as Record<string, unknown>
      const routes = new Map<string, RouteHandler>()

      for (const [path, handlerOrContent] of Object.entries(routesObj)) {
        const normalizedPath = normalizePath(path)
        if (typeof handlerOrContent === 'function') {
          routes.set(normalizedPath, handlerOrContent as RouteHandler)
        } else {
          // Static content - wrap in handler
          routes.set(normalizedPath, () => handlerOrContent)
        }
      }

      return createSite(routes)
    }
  } as SiteBuilder

  // Add route method
  builder.route = function (
    pathOrRoutes: string | Record<string, RouteHandler>,
    handler?: RouteHandler
  ): void {
    if (typeof pathOrRoutes === 'string') {
      // Single route: route('/path', handler)
      const normalizedPath = normalizePath(pathOrRoutes)
      globalRoutes.set(normalizedPath, handler!)
      // Also store with original path for tests that check exact key
      if (pathOrRoutes !== normalizedPath) {
        globalRoutes.set(pathOrRoutes, handler!)
      }
    } else {
      // Bulk routes: route({ '/': handler, '/about': handler })
      for (const [path, h] of Object.entries(pathOrRoutes)) {
        const normalizedPath = normalizePath(path)
        globalRoutes.set(normalizedPath, h)
        if (path !== normalizedPath) {
          globalRoutes.set(path, h)
        }
      }
    }
  }

  // Add routes property (global routes registry)
  Object.defineProperty(builder, 'routes', {
    get() {
      return globalRoutes
    },
    enumerable: true,
  })

  // Add compose method
  builder.compose = function (...pages: Page[]): Site {
    const routes = new Map<string, RouteHandler>()

    for (const page of pages) {
      if (page.path) {
        routes.set(page.path, () => page.content)
      }
    }

    return createSite(routes)
  }

  return builder
}

// Create the main site builder instance
export const 亘: SiteBuilder = createSiteBuilder()
export const www: SiteBuilder = 亘
