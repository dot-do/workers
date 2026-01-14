/**
 * Static Asset Serving for Workers for Platforms
 * Serves static assets from WfP workers with caching
 */

import { getCacheHeaders, isStaticAsset } from './router'

export interface Env {
  apps: DispatchNamespace
}

/**
 * Serve static asset from WfP worker
 *
 * @param request - HTTP request for static asset
 * @param workerId - Worker identifier
 * @param env - Worker environment bindings
 * @returns Response with asset content and cache headers
 */
export async function serveAsset(request: Request, workerId: string, env: Env): Promise<Response> {
  try {
    // Forward request to worker (which has ASSETS binding)
    const response = await env.apps.get(workerId).fetch(request)

    // If asset not found, return 404
    if (response.status === 404) {
      return new Response('Not Found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    // Clone response to modify headers
    const modifiedResponse = new Response(response.body, response)

    // Add cache headers based on asset type
    const url = new URL(request.url)
    const cacheHeaders = getCacheHeaders(url.pathname)
    Object.entries(cacheHeaders).forEach(([key, value]) => {
      modifiedResponse.headers.set(key, value)
    })

    // Add CORS headers for assets
    modifiedResponse.headers.set('Access-Control-Allow-Origin', '*')
    modifiedResponse.headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')

    // Add asset serving metadata
    modifiedResponse.headers.set('X-Asset-Worker', workerId)
    modifiedResponse.headers.set('X-Asset-Served', 'true')

    return modifiedResponse
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Asset serving error:', {
      workerId,
      url: request.url,
      error: errorMessage
    })

    return new Response('Internal Server Error', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    })
  }
}

/**
 * Handle range requests for media files
 *
 * @param request - HTTP request with Range header
 * @param workerId - Worker identifier
 * @param env - Worker environment bindings
 * @returns Partial content response
 */
export async function serveRangeRequest(
  request: Request,
  workerId: string,
  env: Env
): Promise<Response> {
  try {
    // Forward range request to worker
    const response = await env.apps.get(workerId).fetch(request)

    // Worker's asset handler should handle range requests
    // Just pass through the response
    return response
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Range request error:', {
      workerId,
      url: request.url,
      error: errorMessage
    })

    return new Response('Internal Server Error', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    })
  }
}

/**
 * Check if request includes Range header
 *
 * @param request - HTTP request
 * @returns True if request has Range header
 */
export function hasRangeHeader(request: Request): boolean {
  return request.headers.has('Range')
}

/**
 * Get appropriate content type for file extension
 *
 * @param path - File path
 * @returns Content-Type header value
 */
export function getContentType(path: string): string {
  const extension = path.split('.').pop()?.toLowerCase()

  const mimeTypes: Record<string, string> = {
    html: 'text/html; charset=utf-8',
    htm: 'text/html; charset=utf-8',
    css: 'text/css; charset=utf-8',
    js: 'application/javascript; charset=utf-8',
    mjs: 'application/javascript; charset=utf-8',
    json: 'application/json; charset=utf-8',
    xml: 'application/xml; charset=utf-8',
    txt: 'text/plain; charset=utf-8',
    md: 'text/markdown; charset=utf-8',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    webp: 'image/webp',
    ico: 'image/x-icon',
    woff: 'font/woff',
    woff2: 'font/woff2',
    ttf: 'font/ttf',
    otf: 'font/otf',
    eot: 'application/vnd.ms-fontobject',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    pdf: 'application/pdf',
    zip: 'application/zip',
    webmanifest: 'application/manifest+json'
  }

  return extension && mimeTypes[extension] ? mimeTypes[extension] : 'application/octet-stream'
}

/**
 * Escape HTML entities to prevent XSS
 *
 * @param str - String to escape
 * @returns Escaped string safe for HTML insertion
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Serve 404 page
 *
 * @param appId - Application identifier
 * @returns 404 response
 */
export function serve404(appId: string): Response {
  // Escape appId to prevent XSS
  const safeAppId = escapeHtml(appId)

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>404 - Not Found</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    h1 {
      font-size: 8rem;
      margin: 0;
      font-weight: 900;
    }
    p {
      font-size: 1.5rem;
      margin: 1rem 0;
    }
    .app-id {
      opacity: 0.8;
      font-size: 1rem;
      margin-top: 2rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>404</h1>
    <p>Page not found</p>
    <div class="app-id">App: ${safeAppId}</div>
  </div>
</body>
</html>
  `.trim()

  return new Response(html, {
    status: 404,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache'
    }
  })
}
