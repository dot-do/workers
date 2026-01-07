# [saaskit.js.org](https://saaskit.js.org)

> The framework for building SaaS in minutes, not months.

```typescript
import { SaaS } from 'saaskit'

const MyCRM = SaaS({
  team: {
    product: 'Priya',
    dev: 'Ralph',
    sales: 'Sally',
  },
  workflows: { sales: 'default', support: 'default' },
})

// That's a CRM. With AI agents. Running.
```

## You're Building a SaaS

You've built SaaS before. You know the drill:

- 3 months building auth
- 2 months on billing
- 6 months on the core product
- Forever maintaining infrastructure

Then you repeat it all for the next product.

**What if you could skip to the part that matters?**

## The Stack

```
DO → App → SaaS
```

That's it. Three classes. Everything else is generated.

### DO (Durable Object)

The foundation. Cloudflare's stateful compute primitive.

```typescript
class DO extends DurableObject<Env> {
  // State management
  // Alarm scheduling
  // WebSocket hibernation
  // SQLite storage
}
```

### App (Application)

Business application patterns built on DO.

```typescript
class App extends DO {
  // Hono routing
  // RPC protocol
  // Tiered storage (hot/warm/cold)
  // MCP tools generation
  // Authentication
  // Multi-tenancy
}
```

### SaaS (Software as a Service)

Everything you need to run a subscription business.

```typescript
class SaaS extends App {
  // database.do schema integration
  // Cascading generation
  // Agent team composition
  // Workflow automation
  // Billing integration
  // Analytics
}
```

## Quick Start

### 1. Install

```bash
npm install saaskit
```

### 2. Define Your SaaS

```typescript
import { SaaS } from 'saaskit'

export default SaaS({
  name: 'My CRM',

  // Optional: AI team
  team: ['priya', 'ralph', 'sally', 'quinn'],

  // Optional: Automated workflows
  workflows: {
    sales: 'default',
    support: 'default',
  },

  // Optional: Extend with custom routes
  routes: {
    'POST /custom': async (c) => {
      // Your custom logic
      return c.json({ ok: true })
    },
  },
})
```

### 3. Deploy

```bash
npx wrangler deploy
```

You now have:
- Full REST/RPC API
- Real-time subscriptions
- Tiered storage
- MCP tools for AI
- Authentication ready
- Billing ready

## The Graph Model

SaaSKit uses [database.do](https://database.do)'s Things + Relationships model:

```typescript
// No schema required - the graph builds itself
const crm = SaaS({ name: 'My CRM' })

// Create things
const contact = await crm.Contact.create({
  name: 'Jane Doe',
  email: 'jane@acme.com',
})

// Relationships are automatic
const company = await crm.Company.create({ name: 'Acme' })
await contact.relateTo(company, 'works_at')

// Query naturally
const acmeContacts = await crm.Contact`who works at Acme`
```

Or define schemas when you want structure:

```typescript
import { SaaS } from 'saaskit'
import { DB } from 'database.do'

export default SaaS({
  schema: DB({
    Contact: {
      name: 'full name',
      email: 'email address',
      company: '->Company',
      deals: ['<-Deal'],
    },
    Company: {
      name: 'company name',
      industry: '~>Industry',
      contacts: ['<-Contact'],
    },
    Deal: {
      title: 'deal title',
      amount: 'dollar amount',
      stage: '~>Stage',
      contact: '->Contact',
    },
  }),
})
```

## AI Team Integration

Add AI agents that work on your SaaS:

```typescript
import { SaaS } from 'saaskit'

export default SaaS({
  team: {
    product: 'Priya',      // Plans features, specs, roadmaps
    dev: 'Ralph',          // Builds features, ships code
    techLead: 'Tom',       // Reviews architecture, code quality
    frontend: 'Rae',       // UI/UX, React, accessibility
    qa: 'Quinn',           // Tests, edge cases, quality
    marketing: 'Mark',     // Content, copy, campaigns
    sales: 'Sally',        // Outbound, demos, closing
  },

  workflows: {
    // When a feature is requested
    feature: {
      trigger: 'feature.requested',
      steps: [
        { agent: 'Priya', action: 'spec the feature' },
        { agent: 'Ralph', action: 'implement' },
        { agent: 'Tom', action: 'review' },
        { agent: 'Quinn', action: 'test' },
      ],
    },

    // When a lead comes in
    sales: {
      trigger: 'lead.created',
      steps: [
        { agent: 'Sally', action: 'qualify' },
        { agent: 'Sally', action: 'schedule demo' },
        { checkpoint: 'human', action: 'close deal' },
      ],
    },
  },
})
```

## Storage Tiers

SaaSKit automatically manages your data across tiers:

| Tier | Technology | Data | Latency | Cost |
|------|------------|------|---------|------|
| **Hot** | SQLite in DO | Active, <2 years | <10ms | $$$ |
| **Warm** | R2 | Historical, 2-7 years | ~100ms | $$ |
| **Cold** | R2 Archive | Compliance, 7+ years | ~1s | $ |

```typescript
// Automatic tiering - you don't think about it
const recentDeals = await crm.Deal.list({ since: '30 days ago' })  // Hot
const oldDeals = await crm.Deal.list({ year: 2020 })  // Warm, transparent

// Force a tier when needed
const archived = await crm.Deal.list({ tier: 'cold' })
```

## MCP Tools

Every SaaS automatically exposes MCP tools for AI:

```typescript
import { tools, invokeTool } from 'my-crm/mcp'

// List available tools
console.log(tools)
// ['Contact_create', 'Contact_get', 'Contact_list', 'Contact_update', ...]

// Use from any AI
await invokeTool('Contact_create', {
  name: 'Jane Doe',
  email: 'jane@acme.com',
})

// Natural language queries work too
await invokeTool('Deal_search', {
  query: 'enterprise deals closing this month',
})
```

## Multi-Level Exports

```typescript
// Full SaaS with everything
import crm from 'my-crm'

// Just the Durable Object class (for workers)
import { MyCrmDO } from 'my-crm/do'

// Just the MCP tools (for AI integration)
import { tools, invokeTool } from 'my-crm/mcp'

// Just the storage layer (for custom implementations)
import { MyCrmStorage } from 'my-crm/storage'

// Just the core types (for type safety)
import type { Contact, Deal } from 'my-crm/types'
```

## Authentication

SaaSKit integrates with [org.ai](https://org.ai) for authentication:

```typescript
import { SaaS } from 'saaskit'

export default SaaS({
  auth: {
    provider: 'org.ai',
    methods: ['email', 'google', 'github'],
    mfa: true,
  },
})
```

Or bring your own:

```typescript
export default SaaS({
  auth: {
    verify: async (token) => {
      // Your verification logic
      return { userId: '...', orgId: '...' }
    },
  },
})
```

## Billing

SaaSKit integrates with [payments.do](https://payments.do) for billing:

```typescript
import { SaaS } from 'saaskit'

export default SaaS({
  billing: {
    provider: 'payments.do',
    plans: {
      free: { price: 0, limits: { contacts: 100 } },
      pro: { price: 29, limits: { contacts: 10000 } },
      enterprise: { price: 299, limits: { contacts: 'unlimited' } },
    },
  },
})
```

## Examples

### CRM

```typescript
import { SaaS } from 'saaskit'

export default SaaS({
  name: 'MyCRM',
  team: { sales: 'Sally', dev: 'Ralph' },
  workflows: { sales: 'default' },
})
```

### Help Desk

```typescript
import { SaaS } from 'saaskit'

export default SaaS({
  name: 'MyHelpDesk',
  team: { support: 'Quinn' },
  workflows: { support: 'default' },
})
```

### Project Management

```typescript
import { SaaS } from 'saaskit'

export default SaaS({
  name: 'MyProjects',
  team: { product: 'Priya', dev: 'Ralph' },
  workflows: { development: 'default' },
})
```

### Custom

```typescript
import { SaaS } from 'saaskit'
import { DB } from 'database.do'

export default SaaS({
  name: 'Custom',

  schema: DB({
    Widget: {
      name: 'widget name',
      type: '~>WidgetType',
      parts: ['->Part'],
    },
    Part: {
      name: 'part name',
      widget: '<-Widget',
    },
  }),

  routes: {
    'GET /widgets/special': async (c) => {
      const widgets = await c.env.DB.Widget`special ones`
      return c.json(widgets)
    },
  },
})
```

## Extending

### Custom Durable Object

```typescript
import { SaaSObject } from 'saaskit/do'

export class MySaaS extends SaaSObject {
  // Override or extend any method
  async onRequest(request: Request) {
    // Custom request handling
    return super.onRequest(request)
  }

  // Add custom alarm handling
  async alarm() {
    // Your alarm logic
  }
}
```

### Custom Storage

```typescript
import { SaaSStorage } from 'saaskit/storage'

export class MyStorage extends SaaSStorage {
  // Override tiering logic
  async shouldArchive(record: any) {
    return record.createdAt < Date.now() - 365 * 24 * 60 * 60 * 1000
  }
}
```

### Custom MCP Tools

```typescript
import { SaaS, defineTool } from 'saaskit'

export default SaaS({
  tools: [
    defineTool({
      name: 'analyze_deals',
      description: 'Analyze deal pipeline health',
      parameters: {
        timeframe: { type: 'string', description: 'e.g., "this quarter"' },
      },
      execute: async ({ timeframe }, ctx) => {
        const deals = await ctx.Deal.list({ timeframe })
        // Your analysis logic
        return { health: 'good', deals: deals.length }
      },
    }),
  ],
})
```

## The opensaas.org Examples

All 65+ clones at [opensaas.org](https://opensaas.org) are built with SaaSKit:

- [hubspot.do](https://github.com/opensaas/hubspot) - Full CRM
- [firebase.do](https://github.com/opensaas/firebase) - Backend-as-a-Service
- [fsx.do](https://github.com/opensaas/fsx) - Virtual filesystem
- [linear.do](https://github.com/opensaas/linear) - Issue tracking
- [and 60+ more...](https://opensaas.org)

Each is a reference implementation showing SaaSKit patterns.

## For Founders

Don't want to code? Use [startups.new](https://startups.new) to launch a SaaS with an AI team - no code required.

## Philosophy

### Convention Over Configuration

Sensible defaults. Override when needed.

```typescript
// This works
export default SaaS({ name: 'My App' })

// So does this
export default SaaS({
  name: 'My App',
  storage: { hot: 'sqlite', warm: 'r2', cold: 's3' },
  auth: { provider: 'custom', verify: myVerifyFn },
  billing: { provider: 'stripe', plans: myPlans },
  // ...100 more options
})
```

### Objects Over Frameworks

Return data, not responses.

```typescript
// Just return objects
export default SaaS({
  routes: {
    'GET /users': () => db.User.list(),  // Auto-serialized
    'GET /users/:id': ({ id }) => db.User.get(id),
  },
})
```

### AI-Native From Day One

Every SaaS should be AI-controllable.

```typescript
// MCP tools generated automatically
// Natural language queries built in
// Agent integration ready

await crm.Deal`find enterprise deals closing this quarter`
await invokeTool('Contact_create', { name: 'Jane' })
```

## Documentation

- [Getting Started](https://saaskit.js.org/docs/getting-started)
- [API Reference](https://saaskit.js.org/docs/api)
- [Examples](https://saaskit.js.org/docs/examples)
- [Deployment](https://saaskit.js.org/docs/deployment)
- [AI Integration](https://saaskit.js.org/docs/ai)

## License

MIT

---

**Stop building infrastructure. Start building product.**

[Get started](https://saaskit.js.org) | [Examples](https://opensaas.org) | [Discord](https://discord.gg/saaskit)

---

Part of [workers.do](https://workers.do) | Clones at [opensaas.org](https://opensaas.org) | Managed at [saas.dev](https://saas.dev) | 1-click at [startups.new](https://startups.new)
