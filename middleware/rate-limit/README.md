# @dotdo/middleware-rate-limit

Rate limiting middleware for Hono applications on Cloudflare Workers.

## Installation

```bash
npm install @dotdo/middleware-rate-limit
# or
pnpm add @dotdo/middleware-rate-limit
```

## Usage

```typescript
import { Hono } from 'hono'
import { rateLimit } from '@dotdo/middleware-rate-limit'
// or
import { rateLimit } from 'workers.do/middleware/rate-limit'

const app = new Hono()

// Limit to 100 requests per minute
app.use('*', rateLimit({
  limit: 100,
  window: 60,
}))

export default app
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `limit` | `number` | `100` | Maximum requests allowed per window. |
| `window` | `number` | `60` | Time window in seconds. |
| `keyGenerator` | `(c: Context) => string` | IP-based | Function to generate rate limit key. |
| `handler` | `(c: Context) => Response` | `undefined` | Custom response when rate limited. |
| `headers` | `boolean` | `true` | Include rate limit headers in response. |
| `store` | `RateLimitStore` | `undefined` | Custom storage backend. |

## Examples

### Rate Limit by User

```typescript
app.use('/api/*', rateLimit({
  limit: 1000,
  window: 3600, // 1 hour
  keyGenerator: (c) => c.var.userId || c.req.header('CF-Connecting-IP') || 'anonymous',
}))
```

### Rate Limit by API Key

```typescript
app.use('/api/*', rateLimit({
  limit: 10000,
  window: 86400, // 24 hours
  keyGenerator: (c) => c.req.header('X-API-Key') || 'no-key',
}))
```

### Custom Rate Limit Response

```typescript
app.use('/api/*', rateLimit({
  limit: 100,
  window: 60,
  handler: (c) => {
    return c.json({
      error: 'Too many requests',
      retryAfter: c.var.rateLimitReset,
    }, 429)
  },
}))
```

### Different Limits by Route

```typescript
// Strict limit for auth endpoints
app.use('/auth/*', rateLimit({
  limit: 5,
  window: 60,
}))

// Relaxed limit for read endpoints
app.use('/api/*', rateLimit({
  limit: 500,
  window: 60,
}))
```

### Using Durable Objects Store

```typescript
import { DurableObjectStore } from '@dotdo/middleware-rate-limit'

app.use('*', rateLimit({
  limit: 100,
  window: 60,
  store: new DurableObjectStore(env.RATE_LIMITER),
}))
```

### Using KV Store

```typescript
import { KVStore } from '@dotdo/middleware-rate-limit'

app.use('*', rateLimit({
  limit: 100,
  window: 60,
  store: new KVStore(env.RATE_LIMIT_KV),
}))
```

## Response Headers

When `headers: true` (default), the following headers are included:

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests allowed |
| `X-RateLimit-Remaining` | Requests remaining in window |
| `X-RateLimit-Reset` | Unix timestamp when window resets |
| `Retry-After` | Seconds until requests allowed (when rate limited) |

## Context Variables

After middleware runs:

```typescript
c.var.rateLimit          // Current count
c.var.rateLimitRemaining // Remaining requests
c.var.rateLimitReset     // Reset timestamp
```

## License

MIT
