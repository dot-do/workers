/**
 * Basic Cloudflare Worker Example
 * Simple feature flag evaluation
 */

import { OpenFeature } from '@openfeature/server-sdk'
import { CloudflareWorkersProvider } from '@dot-do/openfeature-cloudflare-provider'

interface Env {
  DB: D1Database
  CACHE: KVNamespace
  ANALYTICS?: AnalyticsEngineDataset
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      // Initialize provider (cache this globally in production)
      const provider = new CloudflareWorkersProvider({ env })
      await provider.initialize()

      // Set provider and get client
      OpenFeature.setProvider(provider)
      const client = OpenFeature.getClient()

      // Extract user info from request
      const url = new URL(request.url)
      const userId = url.searchParams.get('userId') || 'anonymous'
      const email = url.searchParams.get('email') || ''

      // Evaluation context
      const context = {
        targetingKey: userId,
        email,
        userAgent: request.headers.get('user-agent') || '',
        country: request.cf?.country || 'unknown',
      }

      // Evaluate flags
      const showNewUI = await client.getBooleanValue('new-ui', false, context)

      const theme = await client.getStringValue('ui-theme', 'light', context)

      const maxItems = await client.getNumberValue('max-items-per-page', 20, context)

      const config = await client.getObjectValue(
        'feature-config',
        {
          enabled: false,
          settings: {},
        },
        context
      )

      // Return results
      return new Response(
        JSON.stringify(
          {
            userId,
            flags: {
              showNewUI,
              theme,
              maxItems,
              config,
            },
            context,
          },
          null,
          2
        ),
        {
          headers: { 'content-type': 'application/json' },
        }
      )
    } catch (error) {
      return new Response(JSON.stringify({ error: (error as Error).message }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      })
    }
  },
}
