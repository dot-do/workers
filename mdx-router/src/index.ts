/**
 * MDX Router Worker
 *
 * Routes MDX content to appropriate renderer workers based on $type and $style
 * Fetches MDX from URL parameters, KV, R2, or request body
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import matter from 'gray-matter'

// Environment bindings
interface Env {
  // KV namespace
  MDX_CONTENT: KVNamespace

  // R2 bucket
  MDX_BUCKET: R2Bucket

  // Service bindings - WaitList
  WAITLIST_TAILWIND: Fetcher
  WAITLIST_PICO: Fetcher
  WAITLIST_CHAKRA: Fetcher

  // Service bindings - LandingPage
  LANDING_TAILWIND: Fetcher
  LANDING_PICO: Fetcher
  LANDING_CHAKRA: Fetcher

  // Service bindings - Blog
  BLOG_TAILWIND: Fetcher
  BLOG_PICO: Fetcher
  BLOG_CHAKRA: Fetcher

  // Service bindings - Site
  SITE_TAILWIND: Fetcher
  SITE_PICO: Fetcher
  SITE_CHAKRA: Fetcher

  // Service bindings - Directory
  DIRECTORY_TAILWIND: Fetcher
  DIRECTORY_PICO: Fetcher
  DIRECTORY_CHAKRA: Fetcher
}

// Service map for routing
const SERVICE_MAP: Record<string, keyof Env> = {
  'WaitList:tailwind': 'WAITLIST_TAILWIND',
  'WaitList:picocss': 'WAITLIST_PICO',
  'WaitList:chakra': 'WAITLIST_CHAKRA',

  'LandingPage:tailwind': 'LANDING_TAILWIND',
  'LandingPage:picocss': 'LANDING_PICO',
  'LandingPage:chakra': 'LANDING_CHAKRA',

  'Blog:tailwind': 'BLOG_TAILWIND',
  'Blog:picocss': 'BLOG_PICO',
  'Blog:chakra': 'BLOG_CHAKRA',

  'Site:tailwind': 'SITE_TAILWIND',
  'Site:picocss': 'SITE_PICO',
  'Site:chakra': 'SITE_CHAKRA',

  'Directory:tailwind': 'DIRECTORY_TAILWIND',
  'Directory:picocss': 'DIRECTORY_PICO',
  'Directory:chakra': 'DIRECTORY_CHAKRA',
}

// Default values
const DEFAULT_TYPE = 'Site'
const DEFAULT_STYLE = 'tailwind'

const app = new Hono<{ Bindings: Env }>()

// Enable CORS
app.use('*', cors())

/**
 * Fetch MDX content from various sources
 */
async function fetchMDX(c: any, path?: string): Promise<string> {
  // 1. Try URL parameter
  const url = c.req.query('url')
  if (url) {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch from URL: ${response.statusText}`)
    }
    return await response.text()
  }

  // 2. Try request body (for POST requests)
  if (c.req.method === 'POST') {
    const contentType = c.req.header('content-type') || ''
    if (contentType.includes('text/markdown') || contentType.includes('text/plain')) {
      return await c.req.text()
    }
    if (contentType.includes('application/json')) {
      const json = await c.req.json()
      if (json.content) {
        return json.content
      }
    }
  }

  // 3. Try KV storage
  if (path && c.env.MDX_CONTENT) {
    const kvContent = await c.env.MDX_CONTENT.get(path)
    if (kvContent) {
      return kvContent
    }
  }

  // 4. Try R2 storage
  if (path && c.env.MDX_BUCKET) {
    const r2Object = await c.env.MDX_BUCKET.get(path)
    if (r2Object) {
      return await r2Object.text()
    }
  }

  throw new Error('No MDX content found')
}

/**
 * Parse frontmatter and route to appropriate service
 */
async function routeToRenderer(c: any, mdx: string): Promise<Response> {
  // Parse frontmatter
  const { data, content } = matter(mdx)

  // Extract $type and $style
  const type = data.$type || data.type || DEFAULT_TYPE
  const style = data.$style || data.style || DEFAULT_STYLE

  // Normalize style name
  const normalizedStyle = style.toLowerCase().replace(/^pico(css)?$/, 'picocss')

  // Build service key
  const serviceKey = `${type}:${normalizedStyle}`

  // Get service binding
  const bindingName = SERVICE_MAP[serviceKey]
  if (!bindingName) {
    return c.json(
      {
        error: 'No renderer available',
        type,
        style: normalizedStyle,
        available: Object.keys(SERVICE_MAP),
      },
      404
    )
  }

  const service = c.env[bindingName] as Fetcher
  if (!service) {
    return c.json(
      {
        error: 'Renderer service not bound',
        binding: bindingName,
        type,
        style: normalizedStyle,
      },
      500
    )
  }

  // Forward to renderer service
  try {
    const request = new Request('https://renderer.internal/render', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: mdx,
        frontmatter: data,
      }),
    })

    return await service.fetch(request)
  } catch (error) {
    return c.json(
      {
        error: 'Renderer failed',
        message: error instanceof Error ? error.message : String(error),
        type,
        style: normalizedStyle,
      },
      500
    )
  }
}

/**
 * Health check endpoint
 */
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    worker: 'mdx-router',
    timestamp: new Date().toISOString(),
  })
})

/**
 * List available renderers
 */
app.get('/renderers', (c) => {
  return c.json({
    renderers: Object.keys(SERVICE_MAP).map((key) => {
      const [type, style] = key.split(':')
      return { type, style, key }
    }),
  })
})

/**
 * Render MDX from URL parameter
 */
app.get('/render', async (c) => {
  try {
    const mdx = await fetchMDX(c)
    return await routeToRenderer(c, mdx)
  } catch (error) {
    return c.json(
      {
        error: 'Failed to render',
        message: error instanceof Error ? error.message : String(error),
      },
      400
    )
  }
})

/**
 * Render MDX from POST body
 */
app.post('/render', async (c) => {
  try {
    const mdx = await fetchMDX(c)
    return await routeToRenderer(c, mdx)
  } catch (error) {
    return c.json(
      {
        error: 'Failed to render',
        message: error instanceof Error ? error.message : String(error),
      },
      400
    )
  }
})

/**
 * Render MDX from path (KV or R2)
 */
app.get('/:path{.+}', async (c) => {
  try {
    const path = c.req.param('path')

    // Add .mdx extension if missing
    const mdxPath = path.endsWith('.mdx') ? path : `${path}.mdx`

    const mdx = await fetchMDX(c, mdxPath)
    return await routeToRenderer(c, mdx)
  } catch (error) {
    return c.json(
      {
        error: 'Failed to render',
        message: error instanceof Error ? error.message : String(error),
        path: c.req.param('path'),
      },
      404
    )
  }
})

/**
 * Home page - documentation
 */
app.get('/', (c) => {
  return c.html(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>MDX Router</title>
  <style>
    body { font-family: sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; }
    h1 { color: #333; }
    code { background: #f5f5f5; padding: 0.2rem 0.4rem; border-radius: 3px; }
    pre { background: #f5f5f5; padding: 1rem; border-radius: 5px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>MDX Router</h1>
  <p>Routes MDX content to specialized renderer workers based on <code>$type</code> and <code>$style</code>.</p>

  <h2>Endpoints</h2>
  <ul>
    <li><code>GET /health</code> - Health check</li>
    <li><code>GET /renderers</code> - List available renderers</li>
    <li><code>GET /render?url=...</code> - Render from URL</li>
    <li><code>POST /render</code> - Render from body</li>
    <li><code>GET /:path</code> - Render from KV/R2</li>
  </ul>

  <h2>Example: Render from URL</h2>
  <pre>GET /render?url=https://example.com/page.mdx</pre>

  <h2>Example: Render from body</h2>
  <pre>POST /render
Content-Type: text/markdown

---
$type: LandingPage
$style: tailwind
---

# Hello World</pre>

  <h2>Example: Render from KV/R2</h2>
  <pre>GET /pages/landing</pre>

  <h2>Frontmatter</h2>
  <pre>---
$type: WaitList | LandingPage | Blog | Site | Directory
$style: tailwind | picocss | chakra
---</pre>
</body>
</html>
  `)
})

export default app
