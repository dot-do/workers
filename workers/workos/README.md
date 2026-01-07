# @dotdo/worker-workos

WorkOS SDK exposed as a multi-transport RPC worker.

## Overview

This worker wraps the [WorkOS Node.js SDK](https://github.com/workos/workos-node), providing enterprise identity management including SSO, Directory Sync, Admin Portal, and User Management via Cloudflare Workers RPC.

## Installation

```bash
pnpm add @workos-inc/node @dotdo/rpc
```

## Usage

The worker follows the elegant 3-line pattern:

```typescript
import { WorkOS } from '@workos-inc/node'
import { RPC } from 'workers.do/rpc'
export default RPC(new WorkOS(env.WORKOS_API_KEY))
```

## Binding Convention

Configure in `wrangler.json`:

```json
{
  "services": [
    {
      "binding": "WORKOS",
      "service": "worker-workos"
    }
  ]
}
```

Access via:

```typescript
this.env.WORKOS
```

## Available Transports

| Transport | Example |
|-----------|---------|
| Workers RPC | `await env.WORKOS.sso.getAuthorizationUrl(...)` |
| REST | `POST /api/sso/getAuthorizationUrl` |
| CapnWeb | WebSocket RPC protocol |
| MCP | `{ jsonrpc: '2.0', method: 'sso.getAuthorizationUrl', params: [...] }` |

## Common Operations

```typescript
// SSO - Get authorization URL
const authUrl = await env.WORKOS.sso.getAuthorizationUrl({
  clientId: 'client_xxx',
  redirectUri: 'https://example.com/callback',
  organization: 'org_xxx'
})

// SSO - Get profile from code
const profile = await env.WORKOS.sso.getProfileAndToken({
  code: 'auth_code',
  clientId: 'client_xxx'
})

// User Management - Create user
const user = await env.WORKOS.userManagement.createUser({
  email: 'alice@example.com',
  firstName: 'Alice',
  lastName: 'Smith'
})

// Directory Sync - List directories
const directories = await env.WORKOS.directorySync.listDirectories()

// Organizations - Create organization
const org = await env.WORKOS.organizations.createOrganization({
  name: 'Acme Corp',
  domains: ['acme.com']
})
```

## Environment Variables

The worker requires:

- `WORKOS_API_KEY` - Your WorkOS API key
- `WORKOS_CLIENT_ID` - Your WorkOS client ID (for SSO)

## Dependencies

- `@workos-inc/node` ^7.0.0
- `@dotdo/rpc` workspace:*

## License

MIT
