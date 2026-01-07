# @dotdo/middleware-auth

Authentication middleware for Hono applications with Better Auth integration on Cloudflare Workers.

## Installation

```bash
npm install @dotdo/middleware-auth
# or
pnpm add @dotdo/middleware-auth
```

## Usage

```typescript
import { Hono } from 'hono'
import { auth, requireAuth } from '@dotdo/middleware-auth'
// or
import { auth, requireAuth } from 'workers.do/middleware/auth'

const app = new Hono()

// Parse authentication (adds c.var.user if authenticated)
app.use('*', auth())

// Require authentication on specific routes
app.use('/api/*', requireAuth())

app.get('/api/profile', (c) => {
  const user = c.var.user
  return c.json({ user })
})

export default app
```

## Configuration Options

### auth()

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `cookieName` | `string` | `'auth'` | Name of the JWT cookie to read. |
| `headerName` | `string` | `'Authorization'` | Header to check for Bearer token. |
| `jwtSecret` | `string` | `env.JWT_SECRET` | Secret for JWT verification. |

### requireAuth()

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `redirect` | `string` | `undefined` | URL to redirect unauthenticated users. |
| `message` | `string` | `'Unauthorized'` | Error message for API responses. |
| `roles` | `string[]` | `undefined` | Required roles for access. |

## Examples

### JWT from Cookie or Header

```typescript
app.use('*', auth({
  cookieName: 'session',
  headerName: 'X-Auth-Token',
}))
```

### Role-Based Access Control

```typescript
app.use('/admin/*', requireAuth({
  roles: ['admin'],
  message: 'Admin access required',
}))
```

### Redirect Unauthenticated Users

```typescript
app.use('/dashboard/*', requireAuth({
  redirect: '/login',
}))
```

### API Key Authentication

```typescript
import { apiKey } from '@dotdo/middleware-auth'

app.use('/api/*', apiKey({
  headerName: 'X-API-Key',
  queryParam: 'api_key',
}))
```

### Combined Authentication

```typescript
// Try JWT first, fall back to API key
app.use('/api/*', auth())
app.use('/api/*', apiKey({ optional: true }))
app.use('/api/*', requireAuth())
```

## Context Variables

After `auth()` middleware runs, the following are available:

```typescript
c.var.user       // User object (if authenticated)
c.var.session    // Session object
c.var.userId     // User ID string
c.var.isAuth     // Boolean indicating auth status
```

## License

MIT
