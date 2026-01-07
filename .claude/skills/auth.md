---
name: auth
description: Use when setting up authentication with Better Auth, Drizzle, and the auth plugins (api-key, mcp, organization, admin, oauth-proxy).
---

# Auth Development Skill

## When to Use

- Setting up Better Auth with Cloudflare DO SQLite
- Adding auth plugins (api-key, mcp, org, admin, oauth-proxy)
- Implementing cookie-based auth with JWT

## Auth Packages

```
auth/
├── core/           # @dotdo/auth - Base Better Auth + Drizzle
├── api-key/        # @dotdo/auth-plugin-apikey
├── mcp/            # @dotdo/auth-plugin-mcp
├── organization/   # @dotdo/auth-plugin-org
├── admin/          # @dotdo/auth-plugin-admin
└── oauth-proxy/    # @dotdo/auth-plugin-oauth-proxy
```

## Basic Setup

```typescript
import { auth } from '@dotdo/auth'
import { apiKey } from '@dotdo/auth-plugin-apikey'
import { organization } from '@dotdo/auth-plugin-org'

export const authConfig = auth({
  database: drizzleAdapter(db),
  plugins: [
    apiKey(),
    organization(),
  ],
})
```

## Cookie Strategy

Three cookies with distinct purposes:

| Cookie | Format | Purpose |
|--------|--------|---------|
| `auth` | JWT | User authentication (signed, verified) |
| `settings` | sqid | Anonymous ID + preferences |
| `session` | sqid | Session tracking |

## JWT for Auth Cookie

- Signed with secret
- Verified by auth snippet or middleware
- Contains: sub (userId), email, roles, exp

## sqid for Settings/Session

Lightweight encoding without crypto overhead:
- Anonymous ID from: ASN, colo, country, language, IP prefix
- Preferences: theme, language, etc.
- Session: sessionId, createdAt

## Better Auth Plugins

### api-key
Programmatic access tokens for CI/CD, scripts, integrations.

### mcp
MCP (Model Context Protocol) authentication for AI tools.

### organization
Multi-tenancy with organizations, members, roles.

### admin
User management UI and admin operations.

### oauth-proxy
OAuth flow handling for third-party providers.

## Checklist for Auth Setup

1. [ ] Configure Better Auth in `auth/core/`
2. [ ] Add required plugins
3. [ ] Set up Drizzle schema (auto from better-auth)
4. [ ] Configure auth middleware
5. [ ] Test auth snippet for JWT verification
6. [ ] Verify cookie handling
