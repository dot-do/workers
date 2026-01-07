# @dotdo/middleware-cors

CORS (Cross-Origin Resource Sharing) middleware for Hono applications on Cloudflare Workers.

## Installation

```bash
npm install @dotdo/middleware-cors
# or
pnpm add @dotdo/middleware-cors
```

## Usage

```typescript
import { Hono } from 'hono'
import { cors } from '@dotdo/middleware-cors'
// or
import { cors } from 'workers.do/middleware/cors'

const app = new Hono()

// Apply CORS to all routes
app.use('*', cors())

// Or with custom configuration
app.use('*', cors({
  origin: 'https://example.com',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['X-Custom-Header'],
  maxAge: 86400,
  credentials: true,
}))

export default app
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `origin` | `string \| string[] \| (origin: string) => string \| null` | `*` | Allowed origin(s). Can be a string, array, or function returning the allowed origin. |
| `allowMethods` | `string[]` | `['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH']` | HTTP methods to allow. |
| `allowHeaders` | `string[]` | `[]` | Headers the client is allowed to send. |
| `exposeHeaders` | `string[]` | `[]` | Headers exposed to the client. |
| `maxAge` | `number` | `undefined` | How long preflight results can be cached (seconds). |
| `credentials` | `boolean` | `false` | Whether to include credentials in CORS requests. |

## Examples

### Allow Multiple Origins

```typescript
app.use('*', cors({
  origin: ['https://app.example.com', 'https://admin.example.com'],
}))
```

### Dynamic Origin

```typescript
app.use('*', cors({
  origin: (origin) => {
    if (origin.endsWith('.example.com')) {
      return origin
    }
    return null
  },
}))
```

### API Routes Only

```typescript
app.use('/api/*', cors({
  origin: 'https://app.example.com',
  credentials: true,
}))
```

## License

MIT
