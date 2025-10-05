# 2025-10-03-openfeature-integration

## Idea Summary

OpenFeature standard for feature flag management

## Original Location

- **Source**: `cloudflare-data-poc-openfeature/`
- **Date**: 2025-10-03
- **Type**: Cloudflare Data POC

## Current State

- Node.js project with package.json
- Cloudflare Workers project
- Source code in src/ directory
- Test suite included

## Key Learnings


## Next Steps

### If Validated ✅
- Extract core functionality to appropriate production repo
- Add comprehensive tests and documentation
- Integrate with platform architecture
- Deploy to production environment

### If Needs More Work ⚙️
- Continue iterating on approach
- Add missing features or capabilities
- Benchmark performance
- Document remaining blockers

### If Deprecated ❌
- Document why approach didn't work
- Extract valuable learnings to notes/
- Archive for reference
- Clean up resources

## Related Documentation

- **Root CLAUDE.md**: `../CLAUDE.md` - Multi-repo management
- **Prototypes Guide**: `../tmp/CLAUDE.md` - Experimental sandbox guidelines
- **POC Process**: `../poc/CLAUDE.md` - Formal POC workflow

---

**Created**: {date}
**Consolidated**: {datetime.now().strftime('%Y-%m-%d')}
**Status**: Archived for evaluation

---

## Original README

# OpenFeature Provider for Cloudflare Workers

OpenFeature-compliant feature flag provider for Cloudflare Workers using D1, KV, and Analytics Engine.

## Features

- ✅ **OpenFeature 0.8.0 Compliant** - Implements full specification
- ✅ **All Flag Types** - Boolean, String, Number, Object
- ✅ **Context-Based Targeting** - Rules-based flag evaluation
- ✅ **A/B Testing** - Variant-based experimentation with weights
- ✅ **KV Caching** - Fast edge-based caching
- ✅ **Analytics Engine** - Real-time metrics and insights
- ✅ **Framework Adapters** - Next.js, SvelteKit support
- ✅ **Type-Safe** - Full TypeScript support

## Installation

```bash
npm install @dot-do/openfeature-cloudflare-provider
# or
pnpm add @dot-do/openfeature-cloudflare-provider
```

## Quick Start

### 1. Set up Cloudflare Resources

```bash
# Create D1 database
wrangler d1 create feature-flags-db

# Create KV namespace
wrangler kv:namespace create CACHE

# Apply schema
wrangler d1 execute feature-flags-db --file=schema.sql
```

### 2. Configure wrangler.jsonc

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "feature-flags-db",
      "database_id": "YOUR_D1_ID"
    }
  ],
  "kv_namespaces": [
    {
      "binding": "CACHE",
      "id": "YOUR_KV_ID"
    }
  ],
  "analytics_engine_datasets": [
    {
      "binding": "ANALYTICS"
    }
  ]
}
```

### 3. Use in Cloudflare Worker

```typescript
import { OpenFeature } from '@openfeature/server-sdk'
import { CloudflareWorkersProvider } from '@dot-do/openfeature-cloudflare-provider'

export default {
  async fetch(request, env) {
    // Initialize provider
    const provider = new CloudflareWorkersProvider({ env })
    await provider.initialize()

    // Set provider and get client
    OpenFeature.setProvider(provider)
    const client = OpenFeature.getClient()

    // Evaluate flags
    const context = {
      targetingKey: 'user-123',
      email: 'user@example.com',
      plan: 'pro'
    }

    const showNewFeature = await client.getBooleanValue(
      'new-feature',
      false,
      context
    )

    return new Response(JSON.stringify({ showNewFeature }))
  }
}
```

## Framework Adapters

### Next.js

```typescript
// app/api/flags/route.ts
import { createNextJsAdapter } from '@dot-do/openfeature-cloudflare-provider/flags-sdk'

export const runtime = 'edge'

export async function GET(request) {
  const adapter = createNextJsAdapter(process.env)
  await adapter.initialize()

  const showNewUI = await adapter.getBooleanFlag('new-ui', false, {
    targetingKey: request.headers.get('x-user-id'),
  })

  return Response.json({ showNewUI })
}
```

### SvelteKit

```typescript
// src/routes/+page.server.ts
import { createSvelteKitAdapter } from '@dot-do/openfeature-cloudflare-provider/flags-sdk'

export async function load({ platform, locals }) {
  const adapter = createSvelteKitAdapter(platform.env)
  await adapter.initialize()

  const context = {
    targetingKey: locals.userId,
    email: locals.email,
  }

  const theme = await adapter.getString('ui-theme', 'light', context)
  const maxItems = await adapter.getNumber('max-items', 20, context)

  return { theme, maxItems }
}
```

## Flag Configuration

### Create a Flag

```sql
INSERT INTO flags (key, type, defaultValue, enabled, description, tags)
VALUES (
  'new-dashboard',
  'boolean',
  'false',
  1,
  'Enable new dashboard UI',
  '["feature", "ui"]'
);
```

### Add Variants for A/B Testing

```sql
-- Create variants with weights
INSERT INTO variants (id, flagKey, name, value, weight, description)
VALUES
  ('v1', 'new-dashboard', 'control', 'false', 50, 'Old dashboard'),
  ('v2', 'new-dashboard', 'treatment', 'true', 50, 'New dashboard');
```

### Add Targeting Rules

```sql
INSERT INTO targeting_rules (id, flagKey, enabled, priority, conditions, variant)
VALUES (
  'rule1',
  'new-dashboard',
  1,
  1,
  '[{"property":"plan","operator":"equals","value":"enterprise"}]',
  'treatment'
);
```

## Context-Based Targeting

The provider supports rich targeting based on evaluation context:

```typescript
const context = {
  targetingKey: 'user-123',    // Required for consistent bucketing
  email: 'user@example.com',
  plan: 'pro',
  country: 'US',
  sessionCount: 5,
  customAttributes: {
    segment: 'power-user'
  }
}

const result = await client.getBooleanDetails('premium-feature', false, context)
```

### Targeting Operators

- `equals` / `notEquals` - Exact match
- `in` / `notIn` - Array membership
- `contains` / `notContains` - String contains
- `greaterThan` / `lessThan` - Numeric comparison
- `matches` - Regex pattern matching

### Example Targeting Rule

```json
{
  "conditions": [
    {
      "property": "plan",
      "operator": "in",
      "value": ["pro", "enterprise"]
    },
    {
      "property": "country",
      "operator": "equals",
      "value": "US"
    }
  ],
  "variant": "premium"
}
```

## Caching

The provider uses Cloudflare KV for intelligent caching:

- **TTL-based expiration** - Default 5 minutes, configurable
- **Context-aware keys** - Different cache entries per user/context
- **Automatic invalidation** - When flags are updated
- **Edge-optimized** - Low-latency reads from KV

```typescript
const provider = new CloudflareWorkersProvider({
  env,
  cacheTTL: 300, // 5 minutes
})
```

## Analytics

Track flag evaluations with Analytics Engine:

```typescript
const provider = new CloudflareWorkersProvider({
  env,
  enableAnalytics: true,
})
```

Query analytics via SQL API:

```sql
SELECT
  blob1 AS flagKey,
  blob2 AS targetingKey,
  blob3 AS variant,
  COUNT(*) AS evaluations,
  AVG(double1) AS avgLatencyMs
FROM ANALYTICS_DATASET
WHERE timestamp > NOW() - INTERVAL '1' DAY
GROUP BY flagKey, variant
ORDER BY evaluations DESC
```

## REST API

The provider includes a REST API for flag management:

### Evaluate Flag

```bash
POST /evaluate/:flagKey
{
  "defaultValue": false,
  "context": {
    "targetingKey": "user-123",
    "plan": "pro"
  }
}
```

### List Flags

```bash
GET /flags?enabled=true&type=boolean
```

### Create Flag

```bash
POST /flags
{
  "key": "new-feature",
  "type": "boolean",
  "defaultValue": false,
  "enabled": true,
  "description": "Enable new feature"
}
```

### Update Flag

```bash
PUT /flags/:flagKey
{
  "enabled": true,
  "defaultValue": true
}
```

### Delete Flag

```bash
DELETE /flags/:flagKey
```

### Get Analytics

```bash
GET /analytics/:flagKey?limit=100
```

## OpenFeature Specification Compliance

This provider implements OpenFeature Specification v0.8.0:

### Required (MUST)

- ✅ Feature provider interface
- ✅ Boolean evaluation
- ✅ String evaluation
- ✅ Number evaluation
- ✅ Object evaluation
- ✅ Provider metadata (name, version)
- ✅ Error handling with proper error codes
- ✅ Evaluation context support

### Recommended (SHOULD)

- ✅ Provider hooks (before, after, error, finally)
- ✅ Named clients support
- ✅ State management (READY, ERROR, NOT_READY)
- ✅ Provider events (READY, ERROR)

### Optional (MAY)

- ✅ Caching layer
- ✅ Analytics tracking
- ✅ Event emission

## Error Codes

The provider returns standard OpenFeature error codes:

- `PROVIDER_NOT_READY` - Provider not initialized
- `FLAG_NOT_FOUND` - Flag key doesn't exist
- `PARSE_ERROR` - Failed to parse flag value
- `TYPE_MISMATCH` - Flag type doesn't match expected type
- `TARGETING_KEY_MISSING` - Required targeting key not provided
- `INVALID_CONTEXT` - Evaluation context is invalid
- `GENERAL` - General error

## TypeScript Types

Full type safety with TypeScript:

```typescript
import type {
  FlagDefinition,
  TargetingRule,
  FlagVariant,
  AnalyticsEvent,
} from '@dot-do/openfeature-cloudflare-provider'
```

## Migration from Proprietary Systems

### From LaunchDarkly

```typescript
// Before (LaunchDarkly)
const ldClient = LaunchDarkly.init(sdkKey)
const showFeature = await ldClient.variation('feature-key', user, false)

// After (OpenFeature + Cloudflare)
const provider = new CloudflareWorkersProvider({ env })
await provider.initialize()
OpenFeature.setProvider(provider)
const client = OpenFeature.getClient()
const showFeature = await client.getBooleanValue('feature-key', false, {
  targetingKey: user.id,
  ...user.attributes
})
```

### From Split.io

```typescript
// Before (Split.io)
const factory = SplitFactory({ authorizationKey })
const client = factory.client()
const treatment = client.getTreatment('user-id', 'feature-key')

// After (OpenFeature + Cloudflare)
const provider = new CloudflareWorkersProvider({ env })
await provider.initialize()
OpenFeature.setProvider(provider)
const client = OpenFeature.getClient()
const result = await client.getStringDetails('feature-key', 'control', {
  targetingKey: 'user-id'
})
const treatment = result.variant // 'control' or 'treatment'
```

## Performance

### Benchmarks

- **Cold start:** ~5ms (with KV cache miss)
- **Warm (cached):** <1ms (KV cache hit)
- **Targeting evaluation:** ~2ms (10 rules)
- **Analytics overhead:** <0.5ms

### Optimization Tips

1. **Use caching** - Set appropriate TTL for your use case
2. **Minimize context size** - Only include attributes used in targeting
3. **Batch evaluations** - Evaluate multiple flags in parallel
4. **Pre-warm cache** - Evaluate flags on worker initialization

## Testing

```bash
# Run tests
pnpm test

# Run conformance tests only
pnpm test:conformance

# Type check
pnpm typecheck
```

## Deployment

```bash
# Deploy to Cloudflare
pnpm deploy

# Or with wrangler
wrangler deploy
```

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.

## Support

- [Documentation](https://docs.openfeature.dev)
- [OpenFeature Spec](https://openfeature.dev/specification)
- [Cloudflare Workers](https://developers.cloudflare.com/workers)

