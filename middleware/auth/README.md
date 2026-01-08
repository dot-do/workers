# @dotdo/middleware-auth

Hono authentication middleware for workers.do, built on top of `@dotdo/auth` primitives.

## Architecture

This package provides HTTP-layer integration for authentication. Core auth logic lives in `@dotdo/auth`:

```
@dotdo/auth                    @dotdo/middleware-auth
├── RBAC (roles, permissions)  ├── auth() middleware (JWT/session parsing)
├── JWT utilities              ├── requireAuth() middleware (enforcement)
├── JWKS caching               ├── apiKey() middleware (API key validation)
├── Better Auth integration    └── Hono context variables (c.var.user, etc.)
└── Plugins (api-key, mcp...)
```

## Installation

```bash
npm install @dotdo/middleware-auth
# or
pnpm add @dotdo/middleware-auth
```

## Usage

```typescript
import { Hono } from 'hono'
import { auth, requireAuth, apiKey } from '@dotdo/middleware-auth'

const app = new Hono()

// Parse authentication (adds c.var.user if authenticated)
app.use('*', auth())

// Require authentication on specific routes
app.use('/api/*', requireAuth())

// Require specific roles
app.use('/admin/*', requireAuth({ roles: ['admin'] }))

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
| `cookieName` | `string` | `'auth'` | Name of the JWT cookie to read |
| `headerName` | `string` | `'Authorization'` | Header to check for Bearer token |
| `betterAuth` | `BetterAuthInstance` | - | Better Auth instance for session verification |
| `skipPaths` | `string[]` | - | Paths to skip auth parsing |

### requireAuth()

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `redirect` | `string` | - | URL to redirect unauthenticated users |
| `message` | `string` | `'Unauthorized'` | Error message for API responses |
| `roles` | `string[]` | - | Required roles for access |
| `permissions` | `string[]` | - | Required permissions (needs RBAC) |
| `rbac` | `RBAC` | - | RBAC instance for permission checking |

### apiKey()

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `headerName` | `string` | `'X-API-Key'` | Header name for API key |
| `queryParam` | `string` | - | Query parameter name |
| `validator` | `(key: string) => Promise<AuthUser \| null>` | Required | Validation function |
| `optional` | `boolean` | `false` | Whether API key auth is optional |

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
import { createRBAC } from '@dotdo/middleware-auth'

const rbac = createRBAC({
  roles: [
    { id: 'admin', name: 'Admin', permissions: ['*'], inherits: [] },
    { id: 'member', name: 'Member', permissions: ['read:*'], inherits: [] },
  ],
})

app.use('/admin/*', requireAuth({
  roles: ['admin'],
  message: 'Admin access required',
}))

// Or with fine-grained permissions
app.use('/settings/*', requireAuth({
  permissions: ['settings:write'],
  rbac,
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
app.use('/api/*', apiKey({
  headerName: 'X-API-Key',
  queryParam: 'api_key',
  validator: async (key) => {
    const result = await db.query.apiKeys.findFirst({
      where: eq(apiKeys.key, key),
    })
    return result ? { id: result.userId } : null
  },
}))
```

### Combined Authentication

```typescript
import { combined } from '@dotdo/middleware-auth'

// Try JWT first, fall back to API key
app.use('/api/*', combined({
  auth: { cookieName: 'session' },
  apiKey: {
    validator: async (key) => validateApiKey(key),
  },
}))
app.use('/api/*', requireAuth())
```

### With Better Auth

```typescript
import { createAuth } from '@dotdo/auth/better-auth'

const betterAuth = createAuth({
  database: db,
  secret: env.AUTH_SECRET,
})

app.use('*', auth({ betterAuth }))
```

## Context Variables

After `auth()` middleware runs, the following are available:

```typescript
c.var.user       // AuthUser object (if authenticated)
c.var.session    // Session object (if using Better Auth)
c.var.userId     // User ID string
c.var.isAuth     // Boolean indicating auth status
c.var.authContext // AuthContext for RBAC permission checks
```

## Re-exports

For convenience, this package re-exports commonly used types and functions from `@dotdo/auth`:

```typescript
import {
  // RBAC
  createRBAC,
  hasRole,
  hasPermission,
  checkPermission,
  requirePermissions,
  requireRole,
  PermissionDeniedError,

  // Types
  type AuthContext,
  type RBAC,
  type Role,
  type Permission,
  type RBACConfig,
} from '@dotdo/middleware-auth'
```

## Related Packages

| Package | Purpose |
|---------|---------|
| `@dotdo/auth` | Core auth logic (RBAC, JWT, Better Auth) |
| `@dotdo/auth/jwt` | JWT parsing and validation utilities |
| `@dotdo/auth/jwks-cache` | JWKS caching for JWT verification |
| `@dotdo/auth/better-auth` | Better Auth integration |
| `@dotdo/auth/plugins` | Better Auth plugins (api-key, mcp, org) |

## License

MIT
