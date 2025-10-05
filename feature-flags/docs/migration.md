# Migration Guide

## Migrating to OpenFeature Cloudflare Provider

This guide helps you migrate from proprietary feature flag systems to the OpenFeature-compliant Cloudflare provider.

## Table of Contents

- [From Proprietary to OpenFeature](#from-proprietary-to-openfeature)
- [From LaunchDarkly](#from-launchdarkly)
- [From Split.io](#from-splitio)
- [From ConfigCat](#from-configcat)
- [From Unleash](#from-unleash)
- [Breaking Changes](#breaking-changes)
- [Compatibility Notes](#compatibility-notes)

## From Proprietary to OpenFeature

### Benefits of Migration

1. **Vendor Independence** - Switch providers without code changes
2. **Open Standard** - OpenFeature is vendor-neutral
3. **Cost Reduction** - Cloudflare Workers pricing vs. SaaS fees
4. **Performance** - Edge evaluation with KV caching
5. **Data Ownership** - Your data stays in your Cloudflare account

### Migration Steps

#### 1. Export Existing Flags

Most providers offer export functionality:

```bash
# Example: LaunchDarkly CLI
ld-cli export --project my-project --environment production > flags.json
```

#### 2. Transform to D1 Schema

Create a transformation script:

```typescript
// transform-flags.ts
import flags from './flags.json'

const transformedFlags = flags.map((flag) => ({
  key: flag.key,
  type: flag.type.toLowerCase(),
  defaultValue: JSON.stringify(flag.variations[0].value),
  enabled: flag.on,
  description: flag.description,
  tags: JSON.stringify(flag.tags),
  targeting: JSON.stringify(flag.rules),
  variants: JSON.stringify(
    flag.variations.map((v, i) => ({
      name: v.name,
      value: v.value,
      weight: flag.rollout?.variations?.[i]?.weight || 0,
    }))
  ),
}))

// Generate SQL insert statements
const sql = transformedFlags
  .map(
    (f) => `
  INSERT INTO flags (key, type, defaultValue, enabled, description, tags, targeting, variants)
  VALUES (
    '${f.key}',
    '${f.type}',
    '${f.defaultValue}',
    ${f.enabled ? 1 : 0},
    '${f.description}',
    '${f.tags}',
    '${f.targeting}',
    '${f.variants}'
  );
`
  )
  .join('\n')

console.log(sql)
```

#### 3. Import to D1

```bash
# Generate SQL from transformation
npx tsx transform-flags.ts > import.sql

# Import to D1
wrangler d1 execute feature-flags-db --file=import.sql
```

#### 4. Update Application Code

Before:

```typescript
// Proprietary SDK
import FeatureFlags from '@vendor/feature-flags'

const client = FeatureFlags.init({ apiKey: process.env.API_KEY })

export async function handler(request) {
  const user = await getUser(request)

  const showNewUI = await client.getBooleanFlag('new-ui', user, false)

  return render({ showNewUI })
}
```

After:

```typescript
// OpenFeature
import { OpenFeature } from '@openfeature/server-sdk'
import { CloudflareWorkersProvider } from '@dot-do/openfeature-cloudflare-provider'

export default {
  async fetch(request, env) {
    // Initialize provider (do this once, cache in global scope)
    const provider = new CloudflareWorkersProvider({ env })
    await provider.initialize()
    OpenFeature.setProvider(provider)

    const client = OpenFeature.getClient()
    const user = await getUser(request)

    const showNewUI = await client.getBooleanValue('new-ui', false, {
      targetingKey: user.id,
      email: user.email,
      plan: user.plan,
    })

    return render({ showNewUI })
  },
}
```

#### 5. Test Parity

Validate that flags behave identically:

```typescript
// test-parity.ts
import { testFlags } from './test-cases'

for (const testCase of testFlags) {
  const oldResult = await oldClient.evaluate(testCase.flag, testCase.user)
  const newResult = await newClient.getBooleanValue(testCase.flag, false, {
    targetingKey: testCase.user.id,
    ...testCase.user.attributes,
  })

  if (oldResult !== newResult) {
    console.error(`Mismatch for ${testCase.flag}: ${oldResult} !== ${newResult}`)
  }
}
```

## From LaunchDarkly

### Code Changes

#### Flag Evaluation

Before (LaunchDarkly):

```typescript
import LaunchDarkly from 'launchdarkly-node-server-sdk'

const ldClient = LaunchDarkly.init(process.env.LD_SDK_KEY)
await ldClient.waitForInitialization()

const user = {
  key: 'user-123',
  email: 'user@example.com',
  custom: {
    plan: 'pro',
  },
}

const showFeature = await ldClient.variation('feature-key', user, false)
```

After (OpenFeature):

```typescript
import { OpenFeature } from '@openfeature/server-sdk'
import { CloudflareWorkersProvider } from '@dot-do/openfeature-cloudflare-provider'

const provider = new CloudflareWorkersProvider({ env })
await provider.initialize()
OpenFeature.setProvider(provider)

const client = OpenFeature.getClient()

const context = {
  targetingKey: 'user-123',
  email: 'user@example.com',
  plan: 'pro',
}

const showFeature = await client.getBooleanValue('feature-key', false, context)
```

#### Targeting Rules

LaunchDarkly rules:

```json
{
  "rules": [
    {
      "clauses": [
        {
          "attribute": "plan",
          "op": "in",
          "values": ["pro", "enterprise"]
        }
      ],
      "variation": 1
    }
  ]
}
```

OpenFeature targeting rules (D1):

```sql
INSERT INTO targeting_rules (id, flagKey, enabled, priority, conditions, variant)
VALUES (
  'rule1',
  'feature-key',
  1,
  1,
  '[{"property":"plan","operator":"in","value":["pro","enterprise"]}]',
  'treatment'
);
```

### Feature Mapping

| LaunchDarkly           | OpenFeature Cloudflare         |
| ---------------------- | ------------------------------ |
| `variation()`          | `getBooleanValue()`            |
| `variationDetail()`    | `getBooleanDetails()`          |
| User object            | EvaluationContext              |
| User.key               | context.targetingKey           |
| User.custom            | context custom attributes      |
| Rules                  | TargetingRule[]                |
| Variations             | FlagVariant[]                  |
| Rollout percentage     | variant.weight                 |
| Events                 | Analytics Engine               |
| Streaming updates      | Not supported (use cache TTL)  |
| Relay Proxy            | Not needed (edge evaluation)   |

## From Split.io

### Code Changes

Before (Split.io):

```typescript
import { SplitFactory } from '@splitsoftware/splitio'

const factory = SplitFactory({
  core: {
    authorizationKey: process.env.SPLIT_API_KEY,
  },
})

const client = factory.client()
await client.ready()

const treatment = client.getTreatment('user-123', 'feature-key', {
  plan: 'pro',
})

if (treatment === 'on') {
  // Feature enabled
}
```

After (OpenFeature):

```typescript
import { OpenFeature } from '@openfeature/server-sdk'
import { CloudflareWorkersProvider } from '@dot-do/openfeature-cloudflare-provider'

const provider = new CloudflareWorkersProvider({ env })
await provider.initialize()
OpenFeature.setProvider(provider)

const client = OpenFeature.getClient()

const result = await client.getStringDetails('feature-key', 'control', {
  targetingKey: 'user-123',
  plan: 'pro',
})

if (result.variant === 'on' || result.value === 'on') {
  // Feature enabled
}
```

### Treatment Mapping

Split.io uses "treatments" (on/off/control), OpenFeature uses variants:

```sql
-- Map Split.io treatments to variants
INSERT INTO variants (id, flagKey, name, value, weight)
VALUES
  ('control', 'feature-key', 'control', 'false', 33),
  ('off', 'feature-key', 'off', 'false', 33),
  ('on', 'feature-key', 'on', 'true', 34);
```

## From ConfigCat

### Code Changes

Before (ConfigCat):

```typescript
import * as configcat from 'configcat-node'

const client = configcat.getClient(process.env.CONFIGCAT_SDK_KEY)

const user = {
  identifier: 'user-123',
  email: 'user@example.com',
  custom: {
    plan: 'pro',
  },
}

const showFeature = await client.getValueAsync('feature-key', false, user)
```

After (OpenFeature):

```typescript
import { OpenFeature } from '@openfeature/server-sdk'
import { CloudflareWorkersProvider } from '@dot-do/openfeature-cloudflare-provider'

const provider = new CloudflareWorkersProvider({ env })
await provider.initialize()
OpenFeature.setProvider(provider)

const client = OpenFeature.getClient()

const showFeature = await client.getBooleanValue('feature-key', false, {
  targetingKey: 'user-123',
  email: 'user@example.com',
  plan: 'pro',
})
```

## From Unleash

### Code Changes

Before (Unleash):

```typescript
import { startUnleash } from 'unleash-client'

const unleash = await startUnleash({
  url: process.env.UNLEASH_URL,
  appName: 'my-app',
  customHeaders: { Authorization: process.env.UNLEASH_API_KEY },
})

const context = {
  userId: 'user-123',
  properties: {
    plan: 'pro',
  },
}

const isEnabled = unleash.isEnabled('feature-key', context)
```

After (OpenFeature):

```typescript
import { OpenFeature } from '@openfeature/server-sdk'
import { CloudflareWorkersProvider } from '@dot-do/openfeature-cloudflare-provider'

const provider = new CloudflareWorkersProvider({ env })
await provider.initialize()
OpenFeature.setProvider(provider)

const client = OpenFeature.getClient()

const isEnabled = await client.getBooleanValue('feature-key', false, {
  targetingKey: 'user-123',
  plan: 'pro',
})
```

## Breaking Changes

### 1. Synchronous to Asynchronous

**Old (synchronous):**

```typescript
const value = client.getBooleanFlag('key', false)
```

**New (async):**

```typescript
const value = await client.getBooleanValue('key', false, context)
```

### 2. User Object to EvaluationContext

**Old:**

```typescript
const user = {
  id: 'user-123',
  attributes: { plan: 'pro' },
}
```

**New:**

```typescript
const context = {
  targetingKey: 'user-123',
  plan: 'pro',
}
```

### 3. Flag Configuration

**Old (vendor UI or API):**

- Configure flags in vendor dashboard
- SDK polls for updates

**New (D1 database):**

- Configure flags in D1 via SQL or REST API
- Use cache TTL for updates

### 4. Streaming Updates

**Old:**

- Real-time streaming of flag changes
- Immediate propagation

**New:**

- Cache-based updates (TTL expiration)
- Manual cache invalidation
- No real-time streaming (future feature)

## Compatibility Notes

### Supported Features

- ✅ Boolean flags
- ✅ String flags
- ✅ Number flags
- ✅ Object flags
- ✅ Context-based targeting
- ✅ A/B testing with variants
- ✅ Weighted rollouts
- ✅ Analytics tracking

### Not Supported (Yet)

- ❌ Real-time streaming updates
- ❌ Percentage rollouts based on attributes
- ❌ Multi-variate testing (>2 variants per flag)
- ❌ Dependency between flags
- ❌ Scheduled flag changes
- ❌ Approval workflows

### Workarounds

#### Real-Time Updates

Use cache invalidation API:

```typescript
// Invalidate cache after flag update
await env.CACHE.delete(`flag:${flagKey}:*`)
```

#### Percentage Rollouts

Use variant weights:

```sql
INSERT INTO variants (id, flagKey, name, value, weight)
VALUES
  ('control', 'feature-key', 'control', 'false', 95),
  ('treatment', 'feature-key', 'treatment', 'true', 5); -- 5% rollout
```

#### Multi-Variate Testing

Create separate flags for each variant:

```typescript
const variant = await client.getStringValue('experiment-variant', 'A', context)

switch (variant) {
  case 'A':
    // Variant A
    break
  case 'B':
    // Variant B
    break
  case 'C':
    // Variant C
    break
}
```

## Testing Migration

### Parallel Evaluation

Run both old and new systems in parallel:

```typescript
// Parallel evaluation for testing
const [oldValue, newValue] = await Promise.all([oldClient.evaluate('key', user), newClient.getBooleanValue('key', false, context)])

if (oldValue !== newValue) {
  console.warn(`Mismatch: old=${oldValue}, new=${newValue}`)
  // Log for analysis
}

// Return old value during migration
return oldValue
```

### Gradual Rollout

1. **Phase 1:** Parallel evaluation (log discrepancies)
2. **Phase 2:** Use new system, fallback to old on error
3. **Phase 3:** Fully migrated, remove old system

### Validation Checklist

- [ ] All flags exported and imported
- [ ] Targeting rules migrated
- [ ] Variants configured
- [ ] Parity tests passing
- [ ] Performance acceptable
- [ ] Analytics working
- [ ] Monitoring in place
- [ ] Rollback plan documented

## Support

For migration help:

- [OpenFeature Docs](https://openfeature.dev/docs)
- [Cloudflare Workers](https://developers.cloudflare.com/workers)
- [GitHub Issues](https://github.com/dot-do/openfeature-cloudflare-provider/issues)
