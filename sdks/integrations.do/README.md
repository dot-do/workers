# integrations.do

**Connect everything. Code nothing.**

```bash
npm install integrations.do
```

## Quick Start

```typescript
// Cloudflare Workers - import env adapter first
import 'rpc.do/env'
import { integrations } from 'integrations.do'

// Or use the factory for custom config
import { Integrations } from 'integrations.do'
const integrations = Integrations({ baseURL: 'https://custom.example.com' })
```

---

## Your Data Is Trapped in Silos

You have customer data in Stripe, contacts in HubSpot, orders in Shopify, and tasks in Notion. They need to stay in sync.

But connecting services means:
- Custom code for every API (and maintaining it forever)
- Authentication nightmares with OAuth flows and token refresh
- Sync failures that silently corrupt your data
- Weeks building what should take minutes
- No visibility into what synced or what broke

**Your integrations shouldn't require a dedicated engineer.**

## What If Integrations Just Worked?

```typescript
import { integrations } from 'integrations.do'

// Describe what you want in plain English
const sync = await integrations.do`
  Sync new Stripe customers to HubSpot contacts,
  map email and name, update on changes
`

// Or connect with full control (API keys from environment via rpc.do/env)
const stripe = await integrations.connect('stripe', {
  apiKey: env.STRIPE_API_KEY
})

const hubspot = await integrations.connect('hubspot', {
  apiKey: env.HUBSPOT_API_KEY
})

// Define your mapping
await integrations.map({
  source: { service: 'stripe', object: 'customer' },
  target: { service: 'hubspot', object: 'contact' },
  fields: {
    'email': 'email',
    'name': 'firstname',
    'metadata.company': 'company'
  }
})

// Sync automatically
await integrations.sync('stripe-to-hubspot')
```

**integrations.do** gives you:
- AI-powered integration setup from natural language
- 100+ pre-built connectors
- Visual data mapping with transformations
- Real-time and scheduled sync
- Full visibility into every record

## Integrate in 3 Steps

### 1. Connect Your Service

```typescript
import { integrations } from 'integrations.do'

// API key authentication (API keys from environment via rpc.do/env)
const stripe = await integrations.connect('stripe', {
  apiKey: env.STRIPE_API_KEY
})

// OAuth authentication (redirects user)
const salesforce = await integrations.connect('salesforce', {
  oauth: {
    clientId: env.SF_CLIENT_ID,
    clientSecret: env.SF_CLIENT_SECRET
  }
})

// Check what's available
const connectors = await integrations.connectors()
// ['stripe', 'hubspot', 'salesforce', 'shopify', 'notion', ...]
```

### 2. Map Your Data

```typescript
// Simple field mapping
await integrations.map({
  source: { service: 'stripe', object: 'customer' },
  target: { service: 'hubspot', object: 'contact' },
  fields: {
    'email': 'email',
    'name': 'firstname',
    'metadata.company': 'company'
  }
})

// With transformations
await integrations.map({
  source: { service: 'shopify', object: 'order' },
  target: { service: 'notion', object: 'database' },
  fields: {
    'id': 'order_id',
    'total_price': { source: 'total_price', transform: 'number' },
    'created_at': { source: 'created_at', transform: 'date' },
    'line_items': { source: 'line_items', transform: 'json' }
  },
  defaults: {
    'status': 'New'
  }
})
```

### 3. Sync

```typescript
// Manual sync
const run = await integrations.sync('stripe-to-hubspot')
console.log(`Synced ${run.recordsProcessed} records`)

// Preview before syncing
const preview = await integrations.sync('stripe-to-hubspot', { dryRun: true })

// Check sync status
const status = await integrations.status('stripe')
console.log(status.health.status) // 'healthy'

// View logs
const logs = await integrations.logs('stripe', { level: 'error' })
```

## The Difference

**Without integrations.do:**
- Weeks writing API clients
- Fragile auth that breaks randomly
- No idea if data is in sync
- Silent failures everywhere
- Custom code for every connection
- Debugging sync issues at 2am

**With integrations.do:**
- Minutes to connect anything
- Auth handled automatically
- Real-time sync status
- Errors surfaced immediately
- Pre-built connectors
- Full visibility and logs

## Everything You Need

```typescript
// Natural language setup
const sync = await integrations.do`
  When a new Shopify order comes in,
  create a task in Notion and
  add the customer to Mailchimp
`

// Webhooks for real-time events
await integrations.webhook('stripe', {
  url: 'https://my-app.com/webhooks/stripe',
  events: ['customer.created', 'customer.updated']
})

// Pause and resume syncs
await integrations.pauseSync('stripe-to-hubspot')
await integrations.resumeSync('stripe-to-hubspot')

// View sync history
const runs = await integrations.runs('stripe-to-hubspot', { limit: 10 })
for (const run of runs) {
  console.log(`${run.status}: ${run.recordsProcessed} records`)
}

// Force full resync
await integrations.sync('stripe-to-hubspot', { force: true })
```

## Sync Status

| Status | Description |
|--------|-------------|
| `connected` | Service is connected and ready |
| `disconnected` | Service needs to be reconnected |
| `error` | Connection has errors |
| `pending` | Connection is being established |

| Sync Status | Description |
|-------------|-------------|
| `active` | Sync is running on schedule |
| `paused` | Sync is temporarily paused |
| `error` | Sync has encountered errors |

## Configuration

```typescript
import { Integrations } from 'integrations.do'

// For Cloudflare Workers, import env adapter first
import 'rpc.do/env'

const integrations = Integrations({
  // API key is read from INTEGRATIONS_API_KEY or DO_API_KEY environment variables
})
```

Or set `INTEGRATIONS_API_KEY` or `DO_API_KEY` in your environment.

## Stop Building Plumbing

Connecting services should take minutes, not weeks. Describe your integration, map your data, and let AI handle the rest.

**Your time is too valuable for API documentation.**

```bash
npm install integrations.do
```

[Start connecting at integrations.do](https://integrations.do)

---

MIT License
