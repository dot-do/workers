# @dotdo/auth

Better Auth integration with Drizzle for Cloudflare DO SQLite.

Part of the [workers.do](https://workers.do) platform for building production-grade applications on Cloudflare's edge.

## Overview

`@dotdo/auth` provides the core authentication layer for workers.do applications. It integrates [Better Auth](https://better-auth.com) with Drizzle ORM, optimized for Cloudflare Durable Objects SQLite storage.

## Installation

```bash
npm install @dotdo/auth
# or
pnpm add @dotdo/auth
```

## Quick Start

```typescript
import { createAuth } from '@dotdo/auth'
import { drizzle } from 'drizzle-orm/better-sqlite3'

const db = drizzle(sqliteStorage)

const auth = createAuth({
  database: db,
  secret: env.AUTH_SECRET,
  baseURL: 'https://your-app.workers.do'
})
```

## Usage with Durable Objects

```typescript
import { DO } from 'dotdo'
import { createAuth } from '@dotdo/auth'

export class MyDO extends DO {
  auth = createAuth({
    database: this.db,
    secret: this.env.AUTH_SECRET,
    baseURL: this.env.BASE_URL
  })

  async fetch(request: Request) {
    // Auth routes handled automatically
    if (request.url.includes('/api/auth')) {
      return this.auth.handler(request)
    }

    // Get session in protected routes
    const session = await this.auth.api.getSession({ headers: request.headers })

    if (!session) {
      return new Response('Unauthorized', { status: 401 })
    }

    return new Response(`Hello ${session.user.name}`)
  }
}
```

## Configuration Options

```typescript
const auth = createAuth({
  // Required
  database: db,              // Drizzle database instance
  secret: env.AUTH_SECRET,   // Secret for signing tokens

  // Optional
  baseURL: 'https://...',    // Base URL for callbacks
  trustedOrigins: ['...'],   // Allowed CORS origins

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7,  // 7 days
    updateAge: 60 * 60 * 24        // Update session every 24h
  }
})
```

## Cookie Strategy

The workers.do platform uses three distinct cookies for different purposes:

| Cookie | Format | Purpose |
|--------|--------|---------|
| `auth` | JWT (signed, verified) | User authentication and identity |
| `settings` | sqid | Anonymous ID + user preferences |
| `session` | sqid | Session tracking and analytics |

### Auth Cookie (JWT)

The `auth` cookie contains a signed JWT with user identity claims. It is:
- Cryptographically signed and verified on each request
- Contains user ID, email, and role information
- Verified via the `jose` worker (RPC) or inline depending on bundle mode

### Settings Cookie (sqid)

The `settings` cookie uses [sqid](https://sqids.org) encoding for a lightweight anonymous identifier:
- Generated from: ASN, Cloudflare colo, country/region, language, IP prefix
- Stores user preferences (theme, locale, etc.)
- Works for both authenticated and anonymous users

### Session Cookie (sqid)

The `session` cookie provides session tracking:
- Links requests across a browsing session
- Enables analytics without requiring authentication
- Lightweight and privacy-respecting

## Plugins

All Better Auth plugins are supported via separate packages for tree-shaking:

### @dotdo/auth-plugin-apikey

Programmatic access tokens for API integrations.

```bash
pnpm add @dotdo/auth-plugin-apikey
```

```typescript
import { createAuth } from '@dotdo/auth'
import { apiKey } from '@dotdo/auth-plugin-apikey'

const auth = createAuth({
  database: db,
  secret: env.AUTH_SECRET,
  plugins: [
    apiKey({
      // API key configuration
    })
  ]
})

// Create API key
const key = await auth.api.createApiKey({
  name: 'My Integration',
  userId: session.user.id,
  expiresIn: 60 * 60 * 24 * 365 // 1 year
})

// Verify API key in requests
const apiKeyHeader = request.headers.get('x-api-key')
const keySession = await auth.api.verifyApiKey({ apiKey: apiKeyHeader })
```

### @dotdo/auth-plugin-mcp

AI tool authentication for Model Context Protocol integrations.

```bash
pnpm add @dotdo/auth-plugin-mcp
```

```typescript
import { createAuth } from '@dotdo/auth'
import { mcp } from '@dotdo/auth-plugin-mcp'

const auth = createAuth({
  database: db,
  secret: env.AUTH_SECRET,
  plugins: [
    mcp({
      // MCP-specific token configuration
    })
  ]
})

// Issue MCP tokens for AI agents
const mcpToken = await auth.api.createMCPToken({
  userId: session.user.id,
  scopes: ['read:users', 'write:data'],
  tools: ['database.query', 'files.read']
})
```

### @dotdo/auth-plugin-org

Multi-tenancy and organization management.

```bash
pnpm add @dotdo/auth-plugin-org
```

```typescript
import { createAuth } from '@dotdo/auth'
import { organization } from '@dotdo/auth-plugin-org'

const auth = createAuth({
  database: db,
  secret: env.AUTH_SECRET,
  plugins: [
    organization({
      allowUserToCreateOrganization: true
    })
  ]
})

// Create organization
const org = await auth.api.createOrganization({
  name: 'Acme Inc',
  slug: 'acme'
})

// Add member
await auth.api.addMember({
  organizationId: org.id,
  userId: user.id,
  role: 'admin'
})

// Get user's organizations
const orgs = await auth.api.listOrganizations({
  userId: session.user.id
})
```

### @dotdo/auth-plugin-admin

User and session management for administrators.

```bash
pnpm add @dotdo/auth-plugin-admin
```

```typescript
import { createAuth } from '@dotdo/auth'
import { admin } from '@dotdo/auth-plugin-admin'

const auth = createAuth({
  database: db,
  secret: env.AUTH_SECRET,
  plugins: [
    admin({
      // Admin capabilities
    })
  ]
})

// List all users (admin only)
const users = await auth.api.listUsers({
  limit: 50,
  offset: 0
})

// Ban user
await auth.api.banUser({ userId: 'user-123' })

// Revoke all sessions
await auth.api.revokeUserSessions({ userId: 'user-123' })
```

### @dotdo/auth-plugin-oauth-proxy

OAuth flow handling for third-party providers.

```bash
pnpm add @dotdo/auth-plugin-oauth-proxy
```

```typescript
import { createAuth } from '@dotdo/auth'
import { oauthProxy } from '@dotdo/auth-plugin-oauth-proxy'

const auth = createAuth({
  database: db,
  secret: env.AUTH_SECRET,
  plugins: [
    oauthProxy({
      providers: ['github', 'google', 'workos']
    })
  ]
})
```

## Database Schema

The core package includes Drizzle schema definitions for Better Auth:

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
})

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  token: text('token').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
})

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
  scope: text('scope'),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
})
```

## Import Paths

The package supports multiple import strategies:

```typescript
// Full package
import { createAuth } from '@dotdo/auth'

// Via workers.do umbrella
import { Auth } from 'workers.do/auth'

// With dotdo Durable Object
import { DO } from 'dotdo/auth'  // Includes auth integration
```

## Integration with Snippets

For free-tier deployments using Cloudflare Snippets, JWT verification can be delegated to the `jose` worker:

```typescript
// In snippet (< 32KB)
const response = await fetch('https://jose.workers.do/verify', {
  method: 'POST',
  body: JSON.stringify({ token: authCookie })
})

const { valid, payload } = await response.json()
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `AUTH_SECRET` | Secret key for signing JWTs (required) |
| `BASE_URL` | Base URL for OAuth callbacks |
| `JOSE` | Workers RPC binding for JWT operations (optional) |

## Related Packages

| Package | Description |
|---------|-------------|
| [@dotdo/auth-plugin-apikey](../api-key) | Programmatic access tokens |
| [@dotdo/auth-plugin-mcp](../mcp) | AI tool authentication |
| [@dotdo/auth-plugin-org](../organization) | Multi-tenancy support |
| [@dotdo/auth-plugin-admin](../admin) | User management |
| [@dotdo/auth-plugin-oauth-proxy](../oauth-proxy) | OAuth flow handling |

## License

MIT
