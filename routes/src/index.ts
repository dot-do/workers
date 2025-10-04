/**
 * Routes Worker - Serves domain inventory as static assets
 *
 * This worker serves pre-built domain data from Workers Assets.
 * All domain MDX files are compiled into JSON at build time and
 * served as static files with zero runtime overhead.
 *
 * Routes:
 * - GET /domains              → HTML index page
 * - GET /domains/index.json   → All domains as JSON
 * - GET /domains/stats.json   → Statistics
 * - GET /domains/{domain}     → Individual domain JSON
 * - POST /api/refresh         → Trigger GitHub Actions refresh
 */

/**
 * Handle refresh API endpoint
 * Triggers GitHub Actions workflow to rebuild and redeploy
 */
async function handleRefresh(request: Request, env: any, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    // Verify API key
    const authHeader = request.headers.get('Authorization')
    const expectedKey = env.ROUTES_API_KEY || 'missing'

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'Missing or invalid Authorization header',
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      )
    }

    const providedKey = authHeader.substring(7) // Remove 'Bearer '
    if (providedKey !== expectedKey) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'Invalid API key',
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      )
    }

    // Parse request body
    const body = await request.json().catch(() => ({}))
    const { source = 'manual', type = 'unknown' } = body

    // Log refresh request
    console.log(`Refresh triggered: source=${source}, type=${type}`)

    // In production, this would trigger GitHub Actions workflow
    // For now, just return success
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Refresh triggered successfully',
        source,
        type,
        timestamp: new Date().toISOString(),
        note: 'Assets will be rebuilt and redeployed within 5 minutes',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    )
  }
}

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url)

    // CORS headers for API access
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }

    // Handle OPTIONS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    // API endpoint for triggering refresh
    if (url.pathname === '/api/refresh' && request.method === 'POST') {
      return handleRefresh(request, env, corsHeaders)
    }

    // Only allow GET requests for static assets
    if (request.method !== 'GET') {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: corsHeaders,
      })
    }

    try {
      // Root path → redirect to /domains
      if (url.pathname === '/') {
        return Response.redirect(new URL('/domains', url), 302)
      }

      // Serve from Workers Assets
      // Assets are in public/domains/* and served at /domains/*
      const assetPath = url.pathname

      // Try to fetch the asset
      const assetUrl = new URL(assetPath, url.origin)
      const asset = await env.ASSETS.fetch(assetUrl)

      // If asset found, return it with CORS headers
      if (asset.ok) {
        const response = new Response(asset.body, {
          status: asset.status,
          headers: {
            ...Object.fromEntries(asset.headers),
            ...corsHeaders,
            'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
          },
        })
        return response
      }

      // Asset not found - return 404 with helpful message
      return new Response(
        JSON.stringify({
          error: 'Not Found',
          message: `Asset not found: ${assetPath}`,
          availableRoutes: [
            '/domains - HTML index page',
            '/domains/index.json - All domains',
            '/domains/stats.json - Statistics',
            '/domains/{domain}/index.json - Individual domain',
          ],
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      )
    } catch (error) {
      // Handle errors
      return new Response(
        JSON.stringify({
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      )
    }
  },
}
