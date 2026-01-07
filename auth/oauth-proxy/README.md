# @dotdo/auth-plugin-oauth-proxy

Better Auth OAuth proxy plugin for OAuth flow handling in workers.do applications.

## Overview

This plugin provides OAuth proxy functionality for handling OAuth flows on behalf of client applications. It enables secure OAuth authentication without exposing client secrets to frontend applications, particularly useful for the workers.do CLI and multi-tenant deployments.

## Installation

```bash
npm install @dotdo/auth-plugin-oauth-proxy
# or
pnpm add @dotdo/auth-plugin-oauth-proxy
```

## Usage

### With @dotdo/auth

```typescript
import { auth } from '@dotdo/auth'
import { oauthProxy } from '@dotdo/auth-plugin-oauth-proxy'

const authInstance = auth({
  plugins: [
    oauthProxy({
      // Configure supported OAuth providers
      providers: {
        github: {
          clientId: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET
        },
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET
        },
        workos: {
          clientId: process.env.WORKOS_CLIENT_ID,
          clientSecret: process.env.WORKOS_API_KEY
        }
      },
      // Optional: allowed redirect URIs
      allowedRedirectUris: [
        'http://localhost:*',
        'https://*.workers.do'
      ]
    })
  ]
})
```

### CLI Authentication Flow

The OAuth proxy enables CLI authentication via browser:

```bash
# CLI initiates OAuth flow
workers.do login

# Opens browser to:
# https://oauth.do/authorize?provider=workos&cli_session=abc123

# After OAuth completes, CLI receives token via callback
```

### Programmatic OAuth

```typescript
// Initiate OAuth flow
const authUrl = await authInstance.api.oauthProxy.authorize({
  provider: 'github',
  redirectUri: 'https://my-app.workers.do/callback',
  state: 'random_state_value',
  scopes: ['user', 'repo']
})

// Handle callback
const tokens = await authInstance.api.oauthProxy.callback({
  provider: 'github',
  code: 'oauth_code_from_provider',
  state: 'random_state_value'
})
```

### Multi-Tenant OAuth

```typescript
// Each tenant can configure their own OAuth apps
await authInstance.api.oauthProxy.configureTenant({
  tenantId: 'acme',
  provider: 'github',
  clientId: 'tenant_github_client_id',
  clientSecret: 'tenant_github_client_secret'
})

// OAuth flow uses tenant-specific credentials
const authUrl = await authInstance.api.oauthProxy.authorize({
  provider: 'github',
  tenantId: 'acme',
  redirectUri: 'https://acme.workers.do/callback'
})
```

## Key Features

- Secure client secret handling on the server
- Support for multiple OAuth providers
- CLI authentication via browser flow
- PKCE support for public clients
- Multi-tenant OAuth configuration
- Token refresh handling
- Integration with WorkOS for enterprise SSO

## Supported Providers

| Provider | Scopes | Notes |
|----------|--------|-------|
| GitHub | `user`, `repo`, `read:org` | Default for developers |
| Google | `email`, `profile` | Consumer authentication |
| WorkOS | SSO, Directory Sync | Enterprise authentication |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/oauth/authorize` | Initiate OAuth flow |
| GET | `/api/auth/oauth/callback` | Handle OAuth callback |
| POST | `/api/auth/oauth/token` | Exchange code for tokens |
| POST | `/api/auth/oauth/refresh` | Refresh access token |
| POST | `/api/auth/oauth/revoke` | Revoke tokens |

## CLI Integration

The plugin works with the workers.do CLI:

```bash
# Login via OAuth
workers.do login

# Login with specific provider
workers.do login --provider github

# Logout (revokes tokens)
workers.do logout
```

## Security Considerations

- Client secrets never exposed to frontend or CLI
- PKCE required for public clients
- Strict redirect URI validation
- State parameter for CSRF protection
- Short-lived authorization codes

## Related

- [@dotdo/auth](../core) - Core Better Auth integration
- [Better Auth OAuth](https://www.better-auth.com/docs/concepts/oauth) - Official OAuth documentation
- [WorkOS](https://workos.com/) - Enterprise SSO provider
