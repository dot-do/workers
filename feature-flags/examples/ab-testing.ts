/**
 * A/B Testing Example
 * Demonstrates variant-based experimentation
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
    // Initialize provider
    const provider = new CloudflareWorkersProvider({ env, enableAnalytics: true })
    await provider.initialize()

    OpenFeature.setProvider(provider)
    const client = OpenFeature.getClient()

    // Get user context
    const userId = request.headers.get('x-user-id') || crypto.randomUUID()

    const context = {
      targetingKey: userId,
      sessionId: request.headers.get('x-session-id'),
    }

    // Evaluate A/B test flag with details
    const result = await client.getBooleanDetails('new-checkout-flow', false, context)

    // Track which variant user saw
    const variant = result.variant || 'control'
    const showNewCheckout = result.value

    // Simulate conversion tracking
    const url = new URL(request.url)
    if (url.searchParams.get('converted') === 'true') {
      // In production, track this in Analytics Engine
      console.log(`Conversion: variant=${variant}, userId=${userId}`)
    }

    // Return response based on variant
    if (showNewCheckout) {
      return new Response(
        JSON.stringify({
          variant,
          checkoutUrl: '/checkout/new',
          features: {
            oneClickBuy: true,
            applePay: true,
            expressCheckout: true,
          },
        }),
        {
          headers: {
            'content-type': 'application/json',
            'x-variant': variant,
          },
        }
      )
    } else {
      return new Response(
        JSON.stringify({
          variant,
          checkoutUrl: '/checkout/classic',
          features: {
            oneClickBuy: false,
            applePay: false,
            expressCheckout: false,
          },
        }),
        {
          headers: {
            'content-type': 'application/json',
            'x-variant': variant,
          },
        }
      )
    }
  },
}

/**
 * D1 Setup for A/B Testing:
 *
 * -- Create flag
 * INSERT INTO flags (key, type, defaultValue, enabled, description)
 * VALUES ('new-checkout-flow', 'boolean', 'false', 1, 'A/B test new checkout');
 *
 * -- Create variants with 50/50 split
 * INSERT INTO variants (id, flagKey, name, value, weight, description)
 * VALUES
 *   ('control', 'new-checkout-flow', 'control', 'false', 50, 'Old checkout'),
 *   ('treatment', 'new-checkout-flow', 'treatment', 'true', 50, 'New checkout');
 */
