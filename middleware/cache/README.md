# @dotdo/middleware-cache

Caching middleware for Hono applications using Cloudflare Cache API on Cloudflare Workers.

## Installation

```bash
npm install @dotdo/middleware-cache
# or
pnpm add @dotdo/middleware-cache
```

## Usage

```typescript
import { Hono } from 'hono'
import { cache } from '@dotdo/middleware-cache'
// or
import { cache } from 'workers.do/middleware/cache'

const app = new Hono()

// Cache all GET requests for 1 hour
app.use('*', cache({
  cacheName: 'my-app',
  cacheControl: 'max-age=3600',
}))

export default app
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `cacheName` | `string` | `'default'` | Named cache instance to use. |
| `cacheControl` | `string` | `'max-age=60'` | Cache-Control header value. |
| `vary` | `string[]` | `['Accept-Encoding']` | Headers to vary cache by. |
| `methods` | `string[]` | `['GET', 'HEAD']` | HTTP methods to cache. |
| `keyGenerator` | `(c: Context) => string` | `undefined` | Custom cache key generator. |
| `shouldCache` | `(c: Context) => boolean` | `undefined` | Function to determine if response should be cached. |

## Examples

### Cache API Responses

```typescript
app.use('/api/*', cache({
  cacheName: 'api-cache',
  cacheControl: 'max-age=300, s-maxage=600',
}))
```

### Vary by Headers

```typescript
app.use('*', cache({
  vary: ['Accept-Encoding', 'Accept-Language', 'Authorization'],
}))
```

### Custom Cache Key

```typescript
app.use('/api/*', cache({
  keyGenerator: (c) => {
    const url = new URL(c.req.url)
    return `${url.pathname}?${url.searchParams.toString()}`
  },
}))
```

### Conditional Caching

```typescript
app.use('*', cache({
  shouldCache: (c) => {
    // Don't cache authenticated requests
    return !c.req.header('Authorization')
  },
}))
```

### Different TTL by Route

```typescript
// Long cache for static content
app.use('/static/*', cache({
  cacheControl: 'max-age=86400, immutable',
}))

// Short cache for dynamic content
app.use('/api/*', cache({
  cacheControl: 'max-age=60, stale-while-revalidate=300',
}))
```

### Bypass Cache

```typescript
app.use('*', cache({
  shouldCache: (c) => {
    // Bypass cache if query param present
    return !c.req.query('nocache')
  },
}))
```

## Cache Headers

The middleware sets the following response headers:

- `Cache-Control` - As configured
- `CF-Cache-Status` - `HIT` or `MISS`
- `Age` - Time since cached (on cache hit)

## License

MIT
