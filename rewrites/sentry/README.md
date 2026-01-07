# @dotdo/sentry

Sentry-compatible error monitoring on Cloudflare Durable Objects - edge-native error tracking for AI agents and humans.

## The Problem

Error monitoring platforms were built for centralized infrastructure:
- High latency from edge to central ingestion
- Expensive per-event pricing at scale
- Complex self-hosting requirements
- Limited integration with AI workflows

AI agents need error monitoring that:
- Ingests at the edge with minimal latency
- Scales to millions of isolated projects
- Integrates with MCP for AI-native debugging
- Provides drop-in Sentry SDK compatibility

## The Vision

Every AI agent gets their own error monitoring instance.

```typescript
import * as Sentry from '@dotdo/sentry'

// Drop-in replacement - just change the DSN host
Sentry.init({
  dsn: 'https://key@errors.do/123',  // That's it!
})

// All existing Sentry code works unchanged
Sentry.captureException(new Error('Something went wrong'))
Sentry.setUser({ id: 'user-123' })
Sentry.addBreadcrumb({ category: 'ui', message: 'Button clicked' })
```

## Features

- **Sentry Protocol Compatible** - Drop-in replacement via DSN change
- **Edge-Native Ingestion** - Sub-50ms p50 latency
- **Intelligent Grouping** - Fingerprinting with optional ML-based semantic matching
- **Source Map Support** - Upload, storage, and symbolication
- **Real-Time Alerting** - Webhooks, Slack, Discord, PagerDuty
- **MCP Tools** - AI-native error investigation
- **Per-Project Isolation** - Each agent/project gets dedicated Durable Object

## Architecture

```
                    +-----------------------+
                    |     errors.do         |
                    |   (Cloudflare Worker) |
                    +-----------------------+
                              |
              +---------------+---------------+
              |               |               |
    +------------------+ +------------------+ +------------------+
    | ErrorIngestionDO | | IssueGroupingDO  | | SymbolicationDO  |
    |  Rate limiting   | |  Fingerprinting  | |  Source maps     |
    +------------------+ +------------------+ +------------------+
              |               |               |
              +---------------+---------------+
                              |
                    +-------------------+
                    |    D1 / R2 / KV   |
                    +-------------------+
```

## Installation

```bash
npm install @dotdo/sentry
```

## Quick Start

### Basic Error Capture

```typescript
import * as Sentry from '@dotdo/sentry'

Sentry.init({
  dsn: 'https://key@errors.do/123',
  release: '1.0.0',
  environment: 'production',
})

// Auto-capture unhandled errors
Sentry.captureException(new Error('Database connection failed'))

// Capture with context
Sentry.captureException(error, {
  tags: { feature: 'checkout' },
  extra: { orderId: '12345' },
})
```

### Cloudflare Workers Integration

```typescript
import { withSentry } from '@dotdo/sentry/cloudflare'

export default withSentry({
  dsn: 'https://key@errors.do/123',
  handler: {
    async fetch(request, env, ctx) {
      // Errors automatically captured
      throw new Error('Worker error')
    }
  }
})
```

### MCP Tools for AI Agents

```typescript
import { quinn } from 'agents.do'

// Quinn (QA agent) investigates errors
quinn`what are the top unresolved errors this week?`

// Ralph (Dev agent) debugs specific issues
ralph`investigate error sentry-abc123 and suggest a fix`
```

## API Reference

### Initialization

```typescript
Sentry.init({
  dsn: string,              // Required: errors.do DSN
  release?: string,         // App version for source maps
  environment?: string,     // production, staging, etc.
  sampleRate?: number,      // 0.0 to 1.0 (default: 1.0)
  beforeSend?: (event) => event | null,  // Filter/modify events
})
```

### Error Capture

```typescript
Sentry.captureException(error, options?)
Sentry.captureMessage(message, level?)
```

### Context

```typescript
Sentry.setUser({ id, email, username })
Sentry.setTag(key, value)
Sentry.setExtra(key, value)
Sentry.addBreadcrumb({ category, message, level, data })
```

### Scope

```typescript
Sentry.withScope((scope) => {
  scope.setTag('transaction', 'checkout')
  Sentry.captureException(error)
})
```

## Source Maps

Upload source maps during your build:

```bash
# Using CLI
npx @dotdo/sentry-cli releases new 1.0.0
npx @dotdo/sentry-cli releases files 1.0.0 upload-sourcemaps ./dist

# Or via API
curl -X POST https://errors.do/api/123/sourcemaps \
  -H "Authorization: Bearer $API_KEY" \
  -F "release=1.0.0" \
  -F "file=@dist/app.js.map"
```

## Alerting

Configure alerts in the dashboard or via API:

```typescript
// Webhook notification
{
  "type": "new_issue",
  "channel": "webhook",
  "url": "https://your-app.com/webhook",
  "conditions": {
    "level": ["error", "fatal"]
  }
}

// Slack notification
{
  "type": "error_spike",
  "channel": "slack",
  "webhook_url": "https://hooks.slack.com/...",
  "threshold": { "increase_percent": 50, "window_minutes": 5 }
}
```

## The Rewrites Ecosystem

@dotdo/sentry is part of the rewrites family - reimplementations of popular infrastructure on Cloudflare Durable Objects:

| Rewrite | Original | Purpose |
|---------|----------|---------|
| [fsx.do](https://fsx.do) | fs (Node.js) | Filesystem for AI |
| [gitx.do](https://gitx.do) | git | Version control for AI |
| [supabase.do](https://supabase.do) | Supabase | Postgres/BaaS for AI |
| **@dotdo/sentry** | Sentry | Error monitoring for AI |
| mongo.do | MongoDB | Document database for AI |
| kafka.do | Kafka | Event streaming for AI |

## License

MIT
