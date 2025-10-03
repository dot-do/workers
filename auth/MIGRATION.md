# Migration Guide: Better-Auth → WorkOS Auth

**Version:** 1.0
**Date:** 2025-10-03
**Status:** Ready for Implementation

## Overview

This guide provides step-by-step instructions for migrating from better-auth to the unified WorkOS authentication system. The migration affects:

- Authentication flow (OAuth, sessions, API keys)
- Database schema (users, sessions, permissions)
- Service integration (RPC bindings)
- Environment variables and secrets

## Breaking Changes

### 1. Session Format

**Before (better-auth):**
```json
{
  "token": "session_abc123",
  "expiresAt": "2025-10-10T00:00:00Z"
}
```

**After (WorkOS):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "role": "user"
  }
}
```

**Impact:** Existing session tokens will be invalid. Users must re-authenticate.

### 2. OAuth Callback Response

**Before:**
```typescript
// POST /auth/callback
{
  "user": { ... },
  "session": { ... }
}
```

**After:**
```typescript
// POST /auth/callback
{
  "token": "JWT...",
  "refreshToken": "JWT...",
  "user": { ... }
}
```

**Impact:** Frontend clients must update to store JWT tokens instead of session IDs.

### 3. API Key Format

**Before:** Not available in better-auth

**After:**
```typescript
{
  "id": "key-123",
  "key": "sk_live_abc123...", // Only shown once
  "prefix": "sk_live_",
  "expiresAt": "2026-01-01T00:00:00Z"
}
```

**Impact:** New feature! Users can now generate API keys for programmatic access.

### 4. Permission System

**Before:** Role-based only (admin check)

**After:** Resource:action permissions with RBAC

```typescript
// Check permission via AUTH_SERVICE
const hasPermission = await env.AUTH_SERVICE.checkPermission({
  userId: 'user-123',
  resource: 'things',
  action: 'write',
  organizationId: 'org-456' // Optional
})
```

**Impact:** More granular permission control. Admin role still works via wildcard permissions.

## Migration Steps

### Step 1: Pre-Migration Preparation

**1.1 Backup Database**

```bash
# Backup production database
pg_dump $POSTGRES_URL > backup-$(date +%Y%m%d).sql

# Verify backup
psql $POSTGRES_URL < backup-$(date +%Y%m%d).sql
```

**1.2 Deploy AUTH_SERVICE**

```bash
cd workers/auth

# Set secrets
wrangler secret put WORKOS_API_KEY
wrangler secret put WORKOS_CLIENT_ID
wrangler secret put WORKOS_CLIENT_SECRET
wrangler secret put JWT_SECRET
wrangler secret put JWT_REFRESH_SECRET

# Deploy
pnpm deploy
```

**1.3 Verify Deployment**

```bash
# Health check
curl https://auth.your-domain.workers.dev/health

# Expected response:
# {"status":"ok","service":"auth","timestamp":"..."}
```

### Step 2: Database Migration

**2.1 Run Migration Script**

```bash
cd api.services

# Run migration (idempotent - safe to run multiple times)
pnpm tsx db/migrations/migrate-to-workos-auth.ts
```

**Migration Script:**

```typescript
// db/migrations/migrate-to-workos-auth.ts
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { sql } from 'drizzle-orm'

export async function migrate() {
  const connection = neon(process.env.POSTGRES_URL!)
  const db = drizzle(connection)

  console.log('Starting migration to WorkOS auth schema...')

  // Step 1: Add new columns to users
  await db.execute(sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user',
    ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS workos_id TEXT,
    ADD COLUMN IF NOT EXISTS organization_id TEXT;
  `)
  console.log('✓ Added new user columns')

  // Step 2: Rename camelCase to snake_case
  await db.execute(sql`
    DO $$
    BEGIN
      -- Users table
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'emailVerified') THEN
        ALTER TABLE users RENAME COLUMN "emailVerified" TO email_verified;
      END IF;

      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'createdAt') THEN
        ALTER TABLE users RENAME COLUMN "createdAt" TO created_at;
      END IF;

      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updatedAt') THEN
        ALTER TABLE users RENAME COLUMN "updatedAt" TO updated_at;
      END IF;

      -- Sessions table
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'userId') THEN
        ALTER TABLE sessions RENAME COLUMN "userId" TO user_id;
      END IF;

      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'expiresAt') THEN
        ALTER TABLE sessions RENAME COLUMN "expiresAt" TO expires_at;
      END IF;

      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'ipAddress') THEN
        ALTER TABLE sessions RENAME COLUMN "ipAddress" TO ip_address;
      END IF;

      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'userAgent') THEN
        ALTER TABLE sessions RENAME COLUMN "userAgent" TO user_agent;
      END IF;
    END $$;
  `)
  console.log('✓ Renamed columns to snake_case')

  // Step 3: Add new session columns
  await db.execute(sql`
    ALTER TABLE sessions
    ADD COLUMN IF NOT EXISTS refresh_token TEXT,
    ADD COLUMN IF NOT EXISTS device TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
  `)
  console.log('✓ Added new session columns')

  // Step 4: Create api_keys table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      prefix TEXT NOT NULL,
      last_used_at TIMESTAMP,
      expires_at TIMESTAMP,
      revoked_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
    CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(prefix);
    CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
  `)
  console.log('✓ Created api_keys table')

  // Step 5: Create permissions table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS permissions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      resource TEXT NOT NULL,
      action TEXT NOT NULL,
      organization_id TEXT,
      granted_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_permissions_user_id ON permissions(user_id);
    CREATE INDEX IF NOT EXISTS idx_permissions_resource_action ON permissions(resource, action);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_permissions_unique
      ON permissions(user_id, resource, action, COALESCE(organization_id, ''));
  `)
  console.log('✓ Created permissions table')

  // Step 6: Set email_verified for existing users
  await db.execute(sql`
    UPDATE users
    SET email_verified = TRUE
    WHERE email IS NOT NULL;
  `)
  console.log('✓ Set email_verified for existing users')

  // Step 7: Invalidate old sessions (users must re-authenticate)
  await db.execute(sql`
    DELETE FROM sessions;
  `)
  console.log('✓ Invalidated old sessions')

  // Step 8: Drop better-auth specific tables
  await db.execute(sql`
    DROP TABLE IF EXISTS accounts CASCADE;
    DROP TABLE IF EXISTS verifications CASCADE;
  `)
  console.log('✓ Dropped better-auth tables')

  // Note: Keep subscriptions table if using Stripe
  // await db.execute(sql`DROP TABLE IF EXISTS subscriptions CASCADE;`)

  console.log('✅ Migration complete!')
}

// Run migration
migrate().catch(console.error)
```

**2.2 Verify Migration**

```bash
# Check tables
psql $POSTGRES_URL -c "\dt"

# Should include:
# - users (with new columns)
# - sessions (with new columns)
# - api_keys (new table)
# - permissions (new table)

# Check columns
psql $POSTGRES_URL -c "\d users"
psql $POSTGRES_URL -c "\d sessions"
```

### Step 3: Update Service Bindings

**3.1 Update wrangler.jsonc**

Add AUTH_SERVICE binding to all workers:

```jsonc
// api.services/wrangler.jsonc
{
  "services": [
    {
      "binding": "AUTH_SERVICE",
      "service": "auth"
    },
    {
      "binding": "DB",
      "service": "do-db"
    }
    // ... other bindings
  ]
}

// workers/mcp/wrangler.jsonc
{
  "services": [
    {
      "binding": "AUTH_SERVICE",
      "service": "auth"
    }
  ]
}

// workers/gateway/wrangler.jsonc
{
  "services": [
    {
      "binding": "AUTH_SERVICE",
      "service": "auth"
    }
  ]
}
```

**3.2 Update Type Definitions**

```typescript
// worker.d.ts (auto-generated by wrangler types)
interface Env {
  AUTH_SERVICE: typeof import('./workers/auth/src/index').default
  DB: any
  // ... other bindings
}
```

### Step 4: Update Middleware

**4.1 Replace Authentication Middleware**

```typescript
// api.services/api/middleware.ts
import type { Context } from 'hono'
import type { User } from '@/types'

export async function authenticate(c: Context): Promise<void> {
  const authHeader = c.req.header('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  const token = authHeader.substring(7)

  // Validate via AUTH_SERVICE
  const result = await c.env.AUTH_SERVICE.validateToken(token)

  if (!result.valid) {
    return c.json({ error: result.error || 'Invalid token' }, 401)
  }

  // Set user in context
  c.set('user', result.user)
  if (result.session) {
    c.set('session', result.session)
  }
}

export async function requireAuth(c: Context, next: () => Promise<void>): Promise<void> {
  await authenticate(c)
  await next()
}

export async function requirePermission(resource: string, action: string) {
  return async (c: Context, next: () => Promise<void>): Promise<void> => {
    const user = c.get('user') as User

    if (!user) {
      return c.json({ error: 'Authentication required' }, 401)
    }

    const hasPermission = await c.env.AUTH_SERVICE.checkPermission({
      userId: user.id,
      resource,
      action,
      organizationId: user.organizationId
    })

    if (!hasPermission) {
      return c.json({ error: `Permission denied: ${resource}:${action}` }, 403)
    }

    await next()
  }
}
```

### Step 5: Update OAuth Routes

**5.1 Replace OAuth Handlers**

```typescript
// api.services/api/routes/auth.ts
import { Hono } from 'hono'

const app = new Hono()

// Initiate OAuth flow
app.get('/authorize', async (c) => {
  const redirectUri = c.req.query('redirect_uri') || `${new URL(c.req.url).origin}/callback`
  const state = c.req.query('state')
  const provider = c.req.query('provider') // Optional: 'google', 'microsoft', etc.

  const url = await c.env.AUTH_SERVICE.getWorkOSAuthURL(redirectUri, state)

  return c.redirect(url)
})

// OAuth callback
app.get('/callback', async (c) => {
  const code = c.req.query('code')
  const state = c.req.query('state')

  if (!code) {
    return c.json({ error: 'Missing authorization code' }, 400)
  }

  try {
    const authResponse = await c.env.AUTH_SERVICE.exchangeWorkOSCode(code)

    return c.json({
      token: authResponse.accessToken,
      refreshToken: authResponse.refreshToken,
      user: {
        id: authResponse.user.id,
        email: authResponse.user.email,
        name: `${authResponse.user.firstName || ''} ${authResponse.user.lastName || ''}`.trim()
      }
    })
  } catch (error) {
    console.error('OAuth callback error:', error)
    return c.json({ error: 'Authentication failed' }, 500)
  }
})

// Get current user
app.get('/me', async (c) => {
  await authenticate(c)
  const user = c.get('user')

  return c.json({ user })
})

// Logout
app.post('/logout', async (c) => {
  await authenticate(c)
  const session = c.get('session')

  if (session) {
    await c.env.AUTH_SERVICE.revokeSession(session.id)
  }

  return c.json({ message: 'Logged out successfully' })
})

// Refresh token
app.post('/refresh', async (c) => {
  const { refreshToken } = await c.req.json()

  if (!refreshToken) {
    return c.json({ error: 'Refresh token required' }, 400)
  }

  try {
    const { token, refreshToken: newRefreshToken } = await c.env.AUTH_SERVICE.refreshSession(refreshToken)

    return c.json({ token, refreshToken: newRefreshToken })
  } catch (error) {
    return c.json({ error: 'Invalid refresh token' }, 401)
  }
})

export default app
```

### Step 6: Update API Key Routes

**6.1 Create API Key Management**

```typescript
// api.services/api/routes/apikeys.ts
import { Hono } from 'hono'
import { authenticate } from '../middleware'

const app = new Hono()

// Create API key
app.post('/', async (c) => {
  await authenticate(c)
  const user = c.get('user')

  const { name, expiresInDays, environment } = await c.req.json()

  if (!name) {
    return c.json({ error: 'Name is required' }, 400)
  }

  const result = await c.env.AUTH_SERVICE.createApiKey({
    userId: user.id,
    name,
    expiresInDays: expiresInDays || 90,
    environment: environment || 'live'
  })

  if (!result.success) {
    return c.json({ error: result.error }, 500)
  }

  return c.json(result.apiKey)
})

// List API keys
app.get('/', async (c) => {
  await authenticate(c)
  const user = c.get('user')

  const keys = await c.env.DB.query({
    sql: `
      SELECT id, name, prefix, last_used_at, expires_at, created_at
      FROM api_keys
      WHERE user_id = ? AND revoked_at IS NULL
      ORDER BY created_at DESC
    `,
    params: [user.id]
  })

  return c.json({ keys: keys.rows || [] })
})

// Revoke API key
app.delete('/:id', async (c) => {
  await authenticate(c)
  const user = c.get('user')
  const keyId = c.req.param('id')

  const revoked = await c.env.AUTH_SERVICE.revokeApiKey(user.id, keyId)

  if (!revoked) {
    return c.json({ error: 'API key not found' }, 404)
  }

  return c.json({ message: 'API key revoked successfully' })
})

export default app
```

### Step 7: Update Frontend Integration

**7.1 Authentication Flow**

```typescript
// Frontend: Login with OAuth
async function login() {
  // Redirect to OAuth
  window.location.href = '/auth/authorize?redirect_uri=/dashboard'
}

// Frontend: Handle callback
async function handleCallback() {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')

  if (!code) {
    throw new Error('Missing authorization code')
  }

  // Exchange code for token
  const response = await fetch('/auth/callback?' + params.toString())
  const { token, refreshToken, user } = await response.json()

  // Store tokens
  localStorage.setItem('access_token', token)
  localStorage.setItem('refresh_token', refreshToken)
  localStorage.setItem('user', JSON.stringify(user))

  // Redirect to dashboard
  window.location.href = '/dashboard'
}

// Frontend: Make authenticated requests
async function fetchData(url: string) {
  const token = localStorage.getItem('access_token')

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })

  if (response.status === 401) {
    // Token expired, try refresh
    await refreshToken()
    return fetchData(url) // Retry
  }

  return response.json()
}

// Frontend: Refresh token
async function refreshToken() {
  const refresh = localStorage.getItem('refresh_token')

  const response = await fetch('/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: refresh })
  })

  if (!response.ok) {
    // Refresh failed, logout
    logout()
    throw new Error('Session expired')
  }

  const { token, refreshToken: newRefresh } = await response.json()

  localStorage.setItem('access_token', token)
  localStorage.setItem('refresh_token', newRefresh)
}

// Frontend: Logout
async function logout() {
  const token = localStorage.getItem('access_token')

  await fetch('/auth/logout', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  })

  localStorage.clear()
  window.location.href = '/login'
}
```

### Step 8: Remove Better-Auth

**8.1 Remove Dependencies**

```bash
cd api.services
pnpm remove better-auth @better-auth/stripe
```

**8.2 Remove Files**

```bash
# Remove auth config
rm -rf auth/

# Remove old OAuth routes (now in workers/auth/)
rm api/routes/workos.ts
rm api/routes/workos-sso.ts
```

**8.3 Update Imports**

Find and replace across codebase:
- `import { createAuth } from '../auth/config'` → remove
- `auth.validateSession` → `env.AUTH_SERVICE.validateToken`
- `auth.createSession` → `env.AUTH_SERVICE.createSession`

### Step 9: Deploy & Verify

**9.1 Deploy Updated Workers**

```bash
# Deploy api.services with new bindings
cd api.services
pnpm deploy

# Deploy other workers
cd ../workers/mcp
pnpm deploy

cd ../workers/gateway
pnpm deploy
```

**9.2 Verify Endpoints**

```bash
# Test OAuth flow
curl https://api.your-domain.com/auth/authorize

# Test token validation
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.your-domain.com/auth/me

# Test API key creation
curl -X POST https://api.your-domain.com/apikeys \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Key"}'
```

## Rollback Procedure

If migration fails:

**1. Revert Database**

```bash
psql $POSTGRES_URL < backup-YYYYMMDD.sql
```

**2. Revert Code**

```bash
git revert HEAD~5  # Revert last 5 commits
```

**3. Remove AUTH_SERVICE Binding**

```jsonc
// wrangler.jsonc - remove this:
{
  "binding": "AUTH_SERVICE",
  "service": "auth"
}
```

**4. Restore Better-Auth**

```bash
pnpm install better-auth @better-auth/stripe
```

**5. Redeploy**

```bash
pnpm deploy
```

## Monitoring & Support

**Check Auth Service Health:**

```bash
curl https://auth.your-domain.workers.dev/health
```

**Monitor Error Logs:**

```bash
wrangler tail auth
wrangler tail api-services
```

**Check Database Connections:**

```bash
psql $POSTGRES_URL -c "SELECT COUNT(*) FROM sessions;"
psql $POSTGRES_URL -c "SELECT COUNT(*) FROM api_keys;"
```

## FAQ

**Q: Will users need to re-authenticate?**
A: Yes, all existing sessions will be invalidated during migration. Users must log in again via OAuth.

**Q: Are API keys backwards compatible?**
A: No, this is a new feature. Users must generate new API keys via the new endpoints.

**Q: Can I migrate gradually (phased rollout)?**
A: No, the database schema changes are breaking. You must migrate all at once. However, you can test on staging first.

**Q: What happens to Stripe subscriptions?**
A: The `subscriptions` table is preserved by default. You'll need to update subscription logic to use the new user schema.

**Q: How long does migration take?**
A: Database migration: 2-5 minutes. Deployment: 5-10 minutes. Total downtime: 10-15 minutes.

**Q: Can I test migration on staging first?**
A: Absolutely! Clone production database to staging, run migration, test thoroughly before production.

## Support

For issues during migration:

1. Check error logs: `wrangler tail`
2. Verify database state: `psql $POSTGRES_URL`
3. Review this guide and workers/auth/README.md
4. Create issue in GitHub repository

---

**Document Version:** 1.0
**Last Updated:** 2025-10-03
**Next Review:** After first production migration
