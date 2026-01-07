# startups.new

> Launch Autonomous Startups instantly - Business-as-Code creation

Part of the [workers.do](https://workers.do) Autonomous Startup platform.

## Overview

Like `docs.new` creates a document, `startups.new` creates a business.

Launch a fully-functional Autonomous Startup with AI capabilities, payments, authentication, and analytics - all from a single API call or natural language prompt.

## Installation

```bash
npm install startups.new
```

## Quick Start

```typescript
import { launch, create } from 'startups.new'

// Launch from a template
const startup = await launch.launch({
  name: 'acme-ai',
  template: 'saas',
  domain: 'acme.hq.com.ai'
})

console.log(startup.urls.app)  // https://acme.hq.com.ai
console.log(startup.urls.api)  // https://api.acme.hq.com.ai
console.log(startup.urls.docs) // https://docs.acme.hq.com.ai

// Or just describe what you want
const generated = await create('A SaaS that helps developers write better docs')
console.log(generated.startup.domain)
console.log(generated.code.worker) // Generated MDX worker code
```

## Features

### Template-Based Launch

Start from proven templates:

```typescript
const startup = await launch.launch({
  name: 'my-saas',
  template: 'saas',
  model: {
    type: 'subscription',
    pricing: [
      { name: 'Free', price: 0, features: ['5 projects', 'Community support'] },
      { name: 'Pro', price: 29, interval: 'month', features: ['Unlimited projects', 'Priority support'] },
      { name: 'Enterprise', price: 299, interval: 'month', features: ['Custom integrations', 'SLA'] }
    ]
  }
})
```

Available templates:

| Template | Description | Included Services |
|----------|-------------|-------------------|
| `saas` | Subscription SaaS business | Auth, Payments, Analytics |
| `marketplace` | Two-sided marketplace | Auth, Payments (Connect), Search |
| `api` | API-as-a-product | Auth, Usage billing, Docs |
| `agency` | Service agency with clients | Auth, Payments, Workflows |
| `ecommerce` | Online store | Payments, Inventory, Analytics |
| `media` | Content/media business | Auth, Subscriptions, CDN |
| `blank` | Empty starting point | None (add what you need) |

### AI-Powered Creation

Describe your business idea in natural language:

```typescript
import { create } from 'startups.new'

const result = await create(`
  A developer tool that automatically generates API documentation
  from code comments. Should have a free tier for open source projects
  and paid plans for private repos.
`)

// AI generates:
// - Startup configuration
// - MDX worker code
// - Database schema
// - Pricing tiers
// - README

console.log(result.startup)     // Created startup
console.log(result.code.worker) // Generated code
console.log(result.suggestions) // AI recommendations
```

### Service Configuration

Enable platform services at launch:

```typescript
const startup = await launch.launch({
  name: 'my-app',
  template: 'saas',
  services: [
    { service: 'llm', config: { defaultModel: 'claude-3-opus' } },
    { service: 'payments', config: { currency: 'usd' } },
    { service: 'auth', config: { providers: ['google', 'github'] } },
    { service: 'analytics' },
    { service: 'search', config: { type: 'vector' } }
  ]
})
```

### Domain Options

**Free tier domains:**
- `*.hq.com.ai` - AI Headquarters
- `*.app.net.ai` - AI Applications
- `*.api.net.ai` - AI APIs
- `*.hq.sb` - StartupBuilder
- `*.io.sb` - StartupBuilder IO

```typescript
// Free subdomain
const startup = await launch.launch({
  name: 'acme',
  domain: 'acme.hq.com.ai'
})

// Or bring your own domain
const startup = await launch.launch({
  name: 'acme',
  domain: 'acme.com' // Configure DNS separately
})
```

### Clone & Fork

Clone existing startups:

```typescript
// Clone your own startup
const clone = await launch.clone({
  source: 'my-startup-id',
  name: 'my-startup-v2',
  includeData: false
})

// Fork a public template
const fork = await launch.clone({
  source: 'https://template.startups.new/saas-starter',
  name: 'my-saas'
})
```

## API Reference

### `launch.launch(config)`

Create a new startup from configuration.

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | Startup name/slug |
| `template` | `string` | Template ID |
| `domain` | `string` | Custom domain or subdomain |
| `model` | `object` | Business model config |
| `services` | `array` | Services to enable |

### `launch.create(prompt)`

Create a startup from natural language description.

### `launch.templates()`

List available templates.

### `launch.clone(config)`

Clone an existing startup.

### `launch.status(startupId)`

Check creation progress.

### `launch.list(options)`

List your startups.

### `launch.validate({ name, domain })`

Check name/domain availability.

## Configuration

```typescript
import { StartupsNew } from 'startups.new'

const client = StartupsNew({
  apiKey: process.env.DO_API_KEY,
  timeout: 120000, // Startup creation can take time
})
```

## Part of the Startup Journey

startups.new is the creation step in the workers.do Autonomous Startup platform:

1. **[startups.new](https://startups.new)** - Launch your Autonomous Startup (you are here)
2. **[startups.studio](https://startups.studio)** - Build and manage your startup
3. **[startup.games](https://startup.games)** - Learn and practice startup skills

## License

MIT
