# @dotdo/auth-plugin-apikey

Better Auth API key plugin for programmatic access in workers.do applications.

## Overview

This plugin wraps the [Better Auth API Key plugin](https://www.better-auth.com/docs/plugins/api-key) to provide programmatic access tokens for machine-to-machine authentication. API keys allow services, scripts, and integrations to authenticate without user credentials.

## Installation

```bash
npm install @dotdo/auth-plugin-apikey
# or
pnpm add @dotdo/auth-plugin-apikey
```

## Usage

### With @dotdo/auth

```typescript
import { auth } from '@dotdo/auth'
import { apiKey } from '@dotdo/auth-plugin-apikey'

const authInstance = auth({
  plugins: [
    apiKey({
      // Optional: customize key prefix
      prefix: 'wdo_',
      // Optional: set default expiration (in seconds)
      defaultExpiration: 60 * 60 * 24 * 30 // 30 days
    })
  ]
})
```

### Creating API Keys

```typescript
// Server-side
const key = await authInstance.api.createApiKey({
  userId: 'user_123',
  name: 'Production API Key',
  expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365) // 1 year
})

// Returns: { key: 'wdo_abc123...', id: 'key_id' }
```

### Authenticating with API Keys

```typescript
// Client request with API key in header
fetch('/api/resource', {
  headers: {
    'Authorization': 'Bearer wdo_abc123...'
  }
})
```

## Key Features

- Prefixed API keys for easy identification
- Configurable expiration times
- Key rotation support
- Scoped permissions (optional)
- Integration with workers.do multi-transport RPC

## API Endpoints

The plugin adds the following endpoints:

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/api-key/create` | Create a new API key |
| GET | `/api/auth/api-key/list` | List all API keys for user |
| DELETE | `/api/auth/api-key/revoke` | Revoke an API key |

## Related

- [@dotdo/auth](../core) - Core Better Auth integration
- [Better Auth API Key Plugin](https://www.better-auth.com/docs/plugins/api-key) - Official documentation
