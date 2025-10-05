/**
 * Documentation Handler
 *
 * Generates OpenAPI/AsyncAPI documentation
 */

import type { Context } from 'hono'
import type { DocsHandler } from './types'

/**
 * Handle documentation request
 */
export async function handleDocsRequest(handler: DocsHandler, c: Context): Promise<Response> {
  try {
    // Check if requesting OpenAPI spec
    if (c.req.path.endsWith('/openapi.json') || c.req.path.endsWith('/spec.json')) {
      const spec = await handler.generate()
      return c.json(spec)
    }

    // Otherwise return Scalar UI HTML
    const html = generateScalarUI(c.req.url)
    return c.html(html)
  } catch (error: any) {
    console.error('Docs handler error:', error)
    return c.json(
      {
        error: 'Documentation generation failed',
        message: error.message,
      },
      500
    )
  }
}

/**
 * Generate Scalar UI HTML
 *
 * Scalar is a modern OpenAPI documentation viewer
 * https://github.com/scalar/scalar
 */
function generateScalarUI(baseUrl: string): string {
  const specUrl = new URL('/docs/openapi.json', baseUrl).toString()

  return `<!DOCTYPE html>
<html>
<head>
  <title>API Documentation</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body>
  <script
    id="api-reference"
    data-url="${specUrl}"></script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
</body>
</html>`
}
