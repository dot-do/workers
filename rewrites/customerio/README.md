# customerio.do

Customer.io on Cloudflare Durable Objects - Marketing automation for every AI agent.

## The Problem

AI agents need marketing automation. Millions of them. Running in parallel. Each with their own customer relationships.

Traditional marketing platforms were built for humans:
- One shared platform for many marketers
- Centralized campaign management
- Manual audience building
- Expensive per-send pricing

AI agents need the opposite:
- One automation engine per agent
- Distributed by default
- Dynamic audiences computed in real-time
- Free at the instance level, pay for delivery

## The Vision

Every AI agent gets their own Customer.io.

```typescript
import { tom, ralph, priya } from 'agents.do'
import { CustomerIO } from 'customerio.do'

// Each agent has their own isolated marketing platform
const tomCRM = CustomerIO.for(tom)
const ralphCRM = CustomerIO.for(ralph)
const priyaCRM = CustomerIO.for(priya)

// Full Customer.io API
await tomCRM.identify('user_123', { email: 'alice@example.com', plan: 'pro' })
await ralphCRM.track('user_123', 'feature_used', { feature: 'export' })
await priyaCRM.workflows.trigger('onboarding', { recipients: ['user_123'] })
```

Not a shared marketing platform. Not a multi-tenant nightmare. Each agent has their own complete Customer.io instance.

## Features

- **Track API** - identify() and track() for user behavior
- **Campaigns/Journeys** - Visual workflow builder with CF Workflows
- **Dynamic Segments** - Real-time audience computation
- **Multi-Channel** - Email, push, SMS, in-app, webhooks
- **Liquid Templates** - Personalized content rendering
- **Preference Management** - User opt-in/opt-out handling
- **MCP Tools** - Model Context Protocol for AI-native marketing

## Architecture

```
                    +-----------------------+
                    |    customerio.do      |
                    |   (Cloudflare Worker) |
                    +-----------------------+
                              |
              +---------------+---------------+
              |               |               |
    +------------------+ +------------------+ +------------------+
    | CustomerDO (Tom) | | CustomerDO (Rae) | | CustomerDO (...) |
    |   SQLite + R2    | |   SQLite + R2    | |   SQLite + R2    |
    +------------------+ +------------------+ +------------------+
              |               |               |
              +---------------+---------------+
                              |
                    +-------------------+
                    |   CF Workflows    |
                    | (Journey Engine)  |
                    +-------------------+
```

**Key insight**: Durable Objects provide single-threaded, strongly consistent state. Each agent's customer data is a Durable Object. SQLite handles queries. Cloudflare Workflows handle multi-step journeys.

## Installation

```bash
npm install @dotdo/customerio
```

## Quick Start

### Event Tracking

```typescript
import { CustomerIO } from 'customerio.do'

const cio = new CustomerIO(env.CUSTOMERIO)

// Identify user with attributes
await cio.identify('user_123', {
  email: 'alice@example.com',
  name: 'Alice',
  plan: 'pro',
  created_at: Date.now()
})

// Track events
await cio.track('user_123', 'order_placed', {
  order_id: 'order_456',
  amount: 99.99,
  items: [{ sku: 'widget-1', qty: 2 }]
})

// Anonymous tracking with later resolution
await cio.track(null, 'page_viewed', { url: '/pricing' }, {
  anonymousId: 'anon_789'
})

// Later, resolve anonymous to user
await cio.identify('user_123', {}, {
  anonymousId: 'anon_789'  // Merges anonymous history
})
```

### Workflow Triggers

```typescript
import { CustomerIO } from 'customerio.do'

const cio = new CustomerIO(env.CUSTOMERIO)

// Trigger a journey
const { runId } = await cio.workflows.trigger('onboarding', {
  recipients: ['user_123'],
  data: {
    trial_days: 14,
    features: ['export', 'api']
  }
})

// Check run status
const status = await cio.workflows.getStatus(runId)
console.log(status)
// { status: 'running', currentStep: 'welcome_email', progress: 2/5 }
```

### Dynamic Segments

```typescript
import { CustomerIO } from 'customerio.do'

const cio = new CustomerIO(env.CUSTOMERIO)

// Create a segment
await cio.segments.create({
  name: 'Active Pro Users',
  rules: {
    and: [
      { attribute: 'plan', operator: 'eq', value: 'pro' },
      { event: 'login', operator: 'did', timeframe: '7d' }
    ]
  }
})

// Query segment membership
const members = await cio.segments.members('active-pro-users')
console.log(`${members.count} users in segment`)
```

### Multi-Channel Delivery

```typescript
import { CustomerIO } from 'customerio.do'

const cio = new CustomerIO(env.CUSTOMERIO)

// Send directly to a channel
await cio.send('user_123', {
  channel: 'email',
  template: 'welcome',
  data: { name: 'Alice' }
})

// Send with fallback
await cio.send('user_123', {
  channel: 'push',
  fallback: 'email',  // If push fails or user opted out
  template: 'notification',
  data: { message: 'New feature available!' }
})
```

### Liquid Templates

```typescript
import { CustomerIO } from 'customerio.do'

const cio = new CustomerIO(env.CUSTOMERIO)

// Create a template
await cio.templates.create({
  id: 'welcome',
  channel: 'email',
  subject: 'Welcome, {{ user.name }}!',
  body: `
    <h1>Welcome to {{ company.name }}</h1>

    {% if user.plan == 'pro' %}
      <p>Thank you for choosing Pro!</p>
    {% else %}
      <p>Upgrade to Pro for more features.</p>
    {% endif %}

    <ul>
    {% for feature in user.features %}
      <li>{{ feature | capitalize }}</li>
    {% endfor %}
    </ul>
  `
})

// Preview a template
const preview = await cio.templates.preview('welcome', {
  user: { name: 'Alice', plan: 'pro', features: ['export', 'api'] },
  company: { name: 'Acme Inc' }
})
```

## API Overview

### Track API (`customerio.do`)

- `identify(userId, traits, options)` - Create/update user profile
- `track(userId, event, properties, options)` - Record event
- `batch(events)` - Bulk event ingestion

### Workflows (`customerio.do/workflows`)

- `trigger(workflowId, options)` - Start a journey
- `getStatus(runId)` - Check run status
- `cancel(runId)` - Cancel in-progress run

### Segments (`customerio.do/segments`)

- `create(definition)` - Define a segment
- `update(segmentId, definition)` - Modify rules
- `members(segmentId)` - Query membership
- `check(segmentId, userId)` - Check single user

### Delivery (`customerio.do/delivery`)

- `send(userId, options)` - Send message
- `status(messageId)` - Delivery status

### Templates (`customerio.do/templates`)

- `create(template)` - Create template
- `update(templateId, template)` - Modify template
- `preview(templateId, context)` - Render preview

## The Rewrites Ecosystem

customerio.do is part of the rewrites family - reimplementations of popular infrastructure on Cloudflare Durable Objects:

| Rewrite | Original | Purpose |
|---------|----------|---------|
| [fsx.do](https://fsx.do) | fs (Node.js) | Filesystem for AI |
| [gitx.do](https://gitx.do) | git | Version control for AI |
| [supabase.do](https://supabase.do) | Supabase | Postgres/BaaS for AI |
| **customerio.do** | Customer.io | Marketing automation for AI |
| [notify.do](https://notify.do) | Novu/Knock | Notification infrastructure |
| kafka.do | Kafka | Event streaming for AI |
| nats.do | NATS | Messaging for AI |

## The workers.do Platform

customerio.do is a core service of [workers.do](https://workers.do) - the platform for building Autonomous Startups.

```typescript
import { priya, ralph, tom, mark } from 'agents.do'
import { CustomerIO } from 'customerio.do'

// AI agents with marketing automation
const startup = {
  product: priya,
  engineering: ralph,
  tech: tom,
  marketing: mark,
}

// Mark runs marketing campaigns
const markCIO = CustomerIO.for(mark)

await markCIO.workflows.trigger('launch-announcement', {
  segment: 'active-users',
  data: { feature: 'AI Assistant', launch_date: '2024-01-15' }
})
```

Both kinds of workers. Working for you.

## License

MIT
