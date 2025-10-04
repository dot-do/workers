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
 */

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url)

    // CORS headers for API access
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    // Handle OPTIONS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    // Only allow GET requests
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
