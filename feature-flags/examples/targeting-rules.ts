/**
 * Targeting Rules Example
 * Advanced context-based flag evaluation
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
    const provider = new CloudflareWorkersProvider({ env })
    await provider.initialize()

    OpenFeature.setProvider(provider)
    const client = OpenFeature.getClient()

    // Rich evaluation context
    const context = {
      targetingKey: 'user-123',
      email: 'user@company.com',
      plan: 'enterprise',
      country: 'US',
      deviceType: 'mobile',
      sessionCount: 15,
      signupDate: '2024-01-15',
      customAttributes: {
        segment: 'power-user',
        industry: 'technology',
        companySize: 500,
      },
    }

    // Evaluate flag with targeting
    const result = await client.getBooleanDetails('premium-features', false, context)

    return new Response(
      JSON.stringify(
        {
          enabled: result.value,
          reason: result.reason,
          variant: result.variant,
          context,
          metadata: result.flagMetadata,
        },
        null,
        2
      ),
      {
        headers: { 'content-type': 'application/json' },
      }
    )
  },
}

/**
 * D1 Setup for Targeting:
 *
 * -- Create flag
 * INSERT INTO flags (key, type, defaultValue, enabled, description)
 * VALUES ('premium-features', 'boolean', 'false', 1, 'Enable premium features');
 *
 * -- Rule 1: Enterprise plan users in US
 * INSERT INTO targeting_rules (id, flagKey, enabled, priority, conditions, value)
 * VALUES (
 *   'rule1',
 *   'premium-features',
 *   1,
 *   1,
 *   '[
 *     {"property":"plan","operator":"equals","value":"enterprise"},
 *     {"property":"country","operator":"equals","value":"US"}
 *   ]',
 *   'true'
 * );
 *
 * -- Rule 2: Power users with 10+ sessions
 * INSERT INTO targeting_rules (id, flagKey, enabled, priority, conditions, value)
 * VALUES (
 *   'rule2',
 *   'premium-features',
 *   1,
 *   2,
 *   '[
 *     {"property":"customAttributes.segment","operator":"equals","value":"power-user"},
 *     {"property":"sessionCount","operator":"greaterThan","value":10}
 *   ]',
 *   'true'
 * );
 *
 * -- Rule 3: Technology industry with large companies
 * INSERT INTO targeting_rules (id, flagKey, enabled, priority, conditions, value)
 * VALUES (
 *   'rule3',
 *   'premium-features',
 *   1,
 *   3,
 *   '[
 *     {"property":"customAttributes.industry","operator":"equals","value":"technology"},
 *     {"property":"customAttributes.companySize","operator":"greaterThan","value":100}
 *   ]',
 *   'true'
 * );
 */
