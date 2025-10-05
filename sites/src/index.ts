/**
 * Sites Worker - Serves MDX sites with domain-based routing
 *
 * Routes *.do, *.ai, *.studio, *.mt domains to their compiled MDX content
 */

import { Hono } from 'hono'

type Bindings = {
  ASSETS: KVNamespace
  DB_SERVICE: any
}

type Env = {
  Bindings: Bindings
}

type CompiledSite = {
  domain: string
  tld: string
  name: string
  title?: string
  description?: string
  content: string
  metadata?: Record<string, any>
  frontmatter?: Record<string, any>
}

const app = new Hono<Env>()

/**
 * Extract domain and TLD from hostname
 */
function parseDomain(hostname: string): { domain: string; tld: string; subdomain?: string } {
  // Remove port if present
  hostname = hostname.split(':')[0]

  const parts = hostname.split('.')

  if (parts.length === 2) {
    // example.do
    return { domain: parts[0], tld: parts[1] }
  } else if (parts.length === 3) {
    // subdomain.example.do
    return { subdomain: parts[0], domain: parts[1], tld: parts[2] }
  } else if (parts.length > 3) {
    // nested.subdomain.example.do
    return { subdomain: parts.slice(0, -2).join('.'), domain: parts[parts.length - 2], tld: parts[parts.length - 1] }
  }

  return { domain: hostname, tld: 'do' }
}

/**
 * Load compiled site from KV
 */
async function loadSite(env: Env, tld: string, domain: string): Promise<CompiledSite | null> {
  const key = `${tld}/${domain}`

  try {
    const data = await env.ASSETS.get(key, 'json')
    return data as CompiledSite | null
  } catch (error) {
    console.error(`Error loading site ${key}:`, error)
    return null
  }
}

/**
 * Render site as HTML
 */
function renderSiteHTML(site: CompiledSite): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${site.title || site.name || site.domain}</title>
  ${site.description ? `<meta name="description" content="${site.description}">` : ''}
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      color: #333;
    }
    pre {
      background: #f4f4f4;
      padding: 1rem;
      border-radius: 4px;
      overflow-x: auto;
    }
    code {
      font-family: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace;
    }
    h1, h2, h3 { margin-top: 1.5em; }
    a { color: #0066cc; }
  </style>
</head>
<body>
  ${site.content}
</body>
</html>`
}

/**
 * Main route handler - serves sites based on domain
 */
app.get('/*', async (c) => {
  const hostname = c.req.header('host') || ''
  const { domain, tld, subdomain } = parseDomain(hostname)
  const path = c.req.path

  console.log(`[sites] ${hostname}${path} -> ${tld}/${domain}${subdomain ? ` (subdomain: ${subdomain})` : ''}`)

  // Load compiled site from KV
  const site = await loadSite(c.env, tld, domain)

  if (!site) {
    return c.html(
      `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Site Not Found</title>
  <style>
    body { font-family: sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 2rem; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
  </style>
</head>
<body>
  <h1>Site Not Found</h1>
  <p>The site <code>${domain}.${tld}</code> was not found.</p>
  <p>Parsed as: domain=${domain}, tld=${tld}${subdomain ? `, subdomain=${subdomain}` : ''}</p>

  <h2>Troubleshooting</h2>
  <ol>
    <li>Make sure the site exists in <code>sites/${tld}/${domain}/</code></li>
    <li>Run Velite to compile: <code>pnpm sites:build</code></li>
    <li>Deploy assets to KV: <code>pnpm sites:deploy</code></li>
  </ol>
</body>
</html>`,
      404
    )
  }

  // Serve compiled MDX content
  return c.html(renderSiteHTML(site))
})

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'sites', timestamp: Date.now() })
})

// 404 handler
app.notFound((c) => {
  return c.html(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>404 - Page Not Found</title>
  <style>body { font-family: sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 2rem; }</style>
</head>
<body>
  <h1>404 - Page Not Found</h1>
  <p>The page you're looking for doesn't exist.</p>
</body>
</html>`,
    404
  )
})

// Error handler
app.onError((err, c) => {
  console.error('Error:', err)

  return c.html(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>500 - Internal Server Error</title>
  <style>
    body { font-family: sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 2rem; }
    pre { background: #f4f4f4; padding: 1rem; border-radius: 4px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>500 - Internal Server Error</h1>
  <p><strong>${err.name}:</strong> ${err.message}</p>
  <h2>Stack Trace</h2>
  <pre>${err.stack || 'No stack trace available'}</pre>
</body>
</html>`,
    500
  )
})

export default app
