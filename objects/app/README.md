# app.do

> Ship faster. Stop rebuilding the same user infrastructure.

You have a brilliant app idea. You start building. Then reality hits: user auth, profiles, preferences, feature flags, analytics, multi-tenancy... suddenly you're spending more time on infrastructure than your actual product.

**Your users deserve your best work. Not another auth implementation.**

## The Problem

Every developer knows this pain:

- **Reinventing the wheel** - Building user management for the 10th time this year
- **Fragmented user state** - Profiles in one place, preferences in another, sessions somewhere else
- **Feature flag chaos** - Hardcoded booleans, environment variables, or expensive third-party services
- **Analytics black hole** - No idea what users actually do in your app
- **Multi-tenant nightmares** - Bolt-on solutions that never quite work right

You should be building features that delight users. Instead, you're debugging session tokens at 2am.

## The Solution

**app.do** is a single Durable Object that handles your entire app's user infrastructure. One import. One API. Ship your actual product.

```typescript
import { App } from 'app.do'

// Everything about your app's users, in one place
const dashboard = await app.getDashboard()
// {
//   analytics: { totalUsers, activeUsers, sessions },
//   featureFlags: { total, enabled, flags },
//   config: [...],
//   recentActivity: [...]
// }
```

## Three Steps to Launch

### 1. Install

```bash
npm install app.do
```

### 2. Create Users

```typescript
import { App } from 'app.do'

// Create a user - profiles, sessions, preferences included
const user = await app.createUser({
  email: 'alice@example.com',
  name: 'Alice',
  role: 'admin',
})

// Create a session
const session = await app.createSession({
  userId: user.id,
  token: crypto.randomUUID(),
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
})

// Set preferences
await app.setPreference(user.id, 'theme', 'dark', 'display')
await app.setPreference(user.id, 'notifications', true, 'general')
```

### 3. Ship Features

```typescript
// Feature flags with intelligent targeting
await app.setFeatureFlag('new-dashboard', {
  name: 'New Dashboard',
  enabled: true,
  rolloutPercentage: 25, // 25% of users
  targetRoles: ['admin'], // All admins get it
})

// Check if enabled for current user
if (await app.isFeatureEnabled('new-dashboard', user.id)) {
  return <NewDashboard />
}

// Track what matters
await app.trackEvent('dashboard_viewed', {
  userId: user.id,
  category: 'engagement',
  properties: { version: 'new' },
})
```

## Before & After

| Before app.do | After app.do |
|---------------|--------------|
| 3 weeks building auth | 3 minutes to first user |
| User data in 5 different tables | Single source of truth |
| Hardcoded feature flags | Intelligent targeting & rollout |
| "We should add analytics" | Built-in event tracking |
| Multi-tenant = rewrite | First-class tenant support |
| Session bugs at 2am | Just works |
| Custom preference systems | `setPreference()` / `getPreference()` |

## Full API

### User Management

```typescript
// Create and manage users
await app.createUser({ email, name, role })
await app.getUser(id)
await app.getUserByEmail(email)
await app.updateUser(id, { name: 'New Name' })
await app.deleteUser(id) // soft delete
await app.listUsers({ role: 'admin', limit: 50 })

// Track logins
await app.recordLogin(userId)
```

### Preferences

```typescript
// Per-user settings with categories
await app.setPreference(userId, 'theme', 'dark', 'display')
await app.setPreference(userId, 'email_digest', 'weekly', 'notifications')

const theme = await app.getPreference(userId, 'theme')
const displayPrefs = await app.getPreferences(userId, 'display')

await app.deletePreference(userId, 'old_setting')
```

### Sessions

```typescript
// Full session management
await app.createSession({ userId, token, expiresAt, deviceType })
await app.getSessionByToken(token)
await app.getUserSessions(userId)
await app.touchSession(sessionId) // update last active
await app.revokeSession(sessionId)
await app.revokeAllUserSessions(userId) // logout everywhere
await app.cleanupExpiredSessions() // maintenance
```

### App Configuration

```typescript
// Global app settings
await app.setConfig('stripe_mode', 'live', {
  category: 'billing',
  description: 'Stripe environment',
})

const mode = await app.getConfig('stripe_mode')
const billingConfig = await app.getAllConfig('billing')
```

### Feature Flags

```typescript
// Create flags with intelligent targeting
await app.setFeatureFlag('beta-feature', {
  name: 'Beta Feature',
  description: 'New experimental feature',
  enabled: true,
  rolloutPercentage: 10, // 10% rollout
  targetUserIds: ['user-123'], // Specific users always see it
  targetRoles: ['beta-tester'], // Role-based access
  targetTenants: ['enterprise-customer'], // Tenant targeting
})

// Check if enabled
const showFeature = await app.isFeatureEnabled('beta-feature', userId, tenantId)

// Manage flags
await app.listFeatureFlags()
await app.deleteFeatureFlag('old-feature')
```

### Analytics

```typescript
// Track events
await app.trackEvent('button_clicked', {
  userId,
  category: 'engagement',
  properties: { buttonId: 'signup' },
  page: '/landing',
})

// Query events
const events = await app.getEvents({
  event: 'button_clicked',
  userId,
  since: new Date('2024-01-01'),
  limit: 100,
})

// Record aggregated metrics
await app.recordMetrics('2024-01', {
  activeUsers: 1234,
  newUsers: 89,
  sessions: 5678,
  pageViews: 12345,
})

// Get summary
const summary = await app.getAnalyticsSummary()
```

### Multi-Tenant

```typescript
// Create tenants
const tenant = await app.createTenant({
  name: 'Acme Corp',
  slug: 'acme',
  plan: 'enterprise',
})

// Manage membership
await app.addUserToTenant(tenant.id, userId, 'admin')
await app.getTenantMembers(tenant.id)
await app.getUserTenants(userId)
await app.removeUserFromTenant(tenant.id, userId)

// Query tenants
await app.getTenant(id)
await app.getTenantBySlug('acme')
await app.listTenants()
```

### Activity & Audit

```typescript
// Automatic audit trail for all operations
const activity = await app.getActivityLog({
  userId,
  tenantId,
  resource: 'user',
  limit: 50,
})

// Full dashboard
const dashboard = await app.getDashboard()
```

## Built on dotdo

app.do extends the [dotdo](https://github.com/workers-do/workers/tree/main/objects/do) base class, inheriting:

- **Drizzle ORM** - Type-safe SQLite queries
- **Multi-transport** - REST, Workers RPC, WebSocket, MCP
- **Agentic capabilities** - Natural language via the `do()` method
- **Better Auth** - Optional authentication integration

```typescript
// REST API
POST /users { "email": "alice@example.com" }
GET /users/alice

// Workers RPC
const app = await env.APP.get('my-app')
await app.createUser({ email: 'alice@example.com' })

// AI Agent
await env.APP.do("Create a new admin user for alice@example.com")
```

## Why app.do?

| Feature | Benefit |
|---------|---------|
| **Durable Object** | Strong consistency, survives restarts, global routing |
| **SQLite storage** | Full SQL queries, ACID transactions, zero latency |
| **Type-safe** | Full TypeScript types for schema and API |
| **Audit trail** | Every change logged automatically |
| **Feature flags** | Built-in targeting, rollout, A/B testing |
| **Multi-tenant** | First-class support, not an afterthought |

## Part of workers.do

app.do is part of the [workers.do](https://workers.do) platform for building Autonomous Startups:

- **[dotdo](../do)** - Base Durable Object with AI agent
- **[business.do](../business)** - Business entity management
- **[llm.do](https://llm.do)** - AI gateway with billing
- **[payments.do](https://payments.do)** - Stripe Connect integration
- **[id.org.ai](https://id.org.ai)** - Auth for AI and humans

## Get Started

```bash
npm install app.do
```

Stop rebuilding user infrastructure. Start shipping features.

[Read the docs](https://app.do) | [View on GitHub](https://github.com/workers-do/workers/tree/main/objects/app)
