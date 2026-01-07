# @dotdo/auth Architecture

## Overview

The `@dotdo/auth` package provides authentication for workers.do applications with **federated auth by default** through id.org.ai.

## Two-Layer Authentication Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           Your Application                                  │
│                     (uses @dotdo/auth/better-auth)                         │
└─────────────────────────────────┬──────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
            [Default Path]              [Override Path]
            Federated Auth              Direct OAuth
                    │                           │
                    ▼                           ▼
┌───────────────────────────────┐   ┌───────────────────────────┐
│         id.org.ai             │   │   Direct to Provider      │
│   (OAuth 2.1 Provider)        │   │   (GitHub, Google, etc)   │
│                               │   │                           │
│  • oauth-provider plugin      │   │   You provide your own    │
│  • Issues tokens to apps      │   │   clientId/clientSecret   │
│  • Stores tokens in Vault     │   │                           │
└───────────────┬───────────────┘   └───────────────────────────┘
                │
                │ Delegates authentication to
                ▼
┌───────────────────────────────┐
│      WorkOS AuthKit           │
│   (Federation Layer)          │
│                               │
│  • Google, GitHub, Microsoft  │
│  • Apple, LinkedIn            │
│  • Enterprise SAML/OIDC       │
│  • Magic Link, Password       │
└───────────────┬───────────────┘
                │
                │ After auth, stores in
                ▼
┌───────────────────────────────┐
│      WorkOS Vault             │
│   (Per-Org Secret Storage)    │
│                               │
│  • Provider access tokens     │
│  • Refresh tokens             │
│  • Customer API keys (BYOK)   │
└───────────────────────────────┘
```

## Default Behavior: Federated Auth

When you create an auth instance without specifying `socialProviders`, authentication is automatically federated through id.org.ai:

```typescript
import { createAuth } from '@dotdo/auth/better-auth'

const auth = createAuth({
  database: db,
  secret: env.AUTH_SECRET,
  baseURL: 'https://myapp.workers.do',
  // No socialProviders = uses id.org.ai
})
```

### What happens:

1. User clicks "Sign In" in your app
2. Your app redirects to `https://id.org.ai/oauth2/authorize`
3. id.org.ai shows WorkOS AuthKit login (Google, GitHub, Enterprise SSO, etc.)
4. User authenticates with their preferred method
5. id.org.ai issues OAuth tokens back to your app
6. Your app creates a local session with Better Auth
7. Provider tokens are stored in WorkOS Vault (per organization)

### Benefits:

- **Zero OAuth configuration** - No client IDs/secrets to manage
- **Enterprise SSO included** - Okta, Azure AD, Google Workspace work automatically
- **Social login included** - Google, GitHub, Microsoft, Apple
- **Secure token storage** - Provider tokens in WorkOS Vault, not your database
- **Organization context** - Tokens scoped to organizations automatically

## Override: Direct OAuth

If you want to use your own OAuth credentials (e.g., your own GitHub OAuth App):

```typescript
import { createAuth } from '@dotdo/auth/better-auth'

const auth = createAuth({
  database: db,
  secret: env.AUTH_SECRET,
  baseURL: 'https://myapp.workers.do',
  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    },
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
})
```

### When to use direct OAuth:

- You need specific OAuth scopes (e.g., repo access)
- You want provider tokens in your own database
- You're building a GitHub App or similar integration
- Compliance requires you to control all credentials

## Building id.org.ai (OAuth Provider Mode)

If you're building id.org.ai itself, or want your app to be an OAuth provider:

```typescript
import { createAuthProvider } from '@dotdo/auth/better-auth'

const auth = await createAuthProvider({
  database: db,
  secret: env.AUTH_SECRET,
  baseURL: 'https://id.org.ai',
  loginPage: '/login',
  consentPage: '/consent',
  customAccessTokenClaims: ({ user, scopes }) => ({
    org_id: user.organizationId,
    roles: user.roles,
  }),
})
```

This creates an OAuth 2.1 compliant server with:

- `/oauth2/authorize` - Authorization endpoint
- `/oauth2/token` - Token endpoint
- `/oauth2/userinfo` - UserInfo endpoint
- `/.well-known/openid-configuration` - OIDC discovery

## Token Flow

### Federated Flow (default)

```
App                    id.org.ai                WorkOS AuthKit
 │                         │                         │
 │ ──── /authorize ──────> │                         │
 │                         │ ──── redirect ────────> │
 │                         │                         │ (user logs in)
 │                         │ <──── callback ──────── │
 │                         │                         │
 │                         │ (stores provider token  │
 │                         │  in WorkOS Vault)       │
 │                         │                         │
 │ <──── id.org.ai token ─ │                         │
 │                         │                         │
 │ (creates local session) │                         │
```

### Direct Flow (with socialProviders)

```
App                    GitHub/Google
 │                         │
 │ ──── /authorize ──────> │
 │                         │ (user logs in)
 │ <──── callback ──────── │
 │                         │
 │ (stores token locally)  │
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ORG_AI_CLIENT_ID` | Your app's client ID from id.org.ai | For federated auth |
| `ORG_AI_CLIENT_SECRET` | Your app's client secret | For federated auth |
| `AUTH_SECRET` | Secret for signing session tokens | Always |

## Related Packages

| Package | Purpose |
|---------|---------|
| `org.ai` | SDK for id.org.ai services (SSO, Vault, Users) |
| `oauth.do` | OAuth SDK and CLI (uses org.ai internally) |
| `@dotdo/auth` | This package - Better Auth + RBAC |

## RBAC Integration

The main export (`@dotdo/auth`) provides RBAC utilities that work alongside Better Auth:

```typescript
import { createRBAC, type AuthContext } from '@dotdo/auth'
import { createAuth } from '@dotdo/auth/better-auth'

const rbac = createRBAC({
  roles: [
    { id: 'admin', name: 'Admin', permissions: ['*'], inherits: [] },
    { id: 'member', name: 'Member', permissions: ['read:*'], inherits: [] },
  ],
})

const auth = createAuth({ ... })

// In your handler
const session = await auth.api.getSession({ headers: request.headers })
const context: AuthContext = {
  userId: session.user.id,
  roles: session.user.roles || ['member'],
  permissions: [],
}

if (rbac.hasPermission(context, 'admin:delete')) {
  // Allow destructive action
}
```
