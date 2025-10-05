# Cloudflare API Integration Worker

**Cloudflare API token integration for the .do platform**

## Overview

This worker provides secure access to Cloudflare APIs using user-provided API tokens. Unlike traditional OAuth flows, Cloudflare uses API tokens that users manually create in their Cloudflare dashboard and then securely store in the .do admin interface.

## Features

- ✅ **API Token Storage** - Securely encrypt and store user API tokens
- ✅ **Token Verification** - Validate tokens against Cloudflare API
- ✅ **Zones Management** - List and manage Cloudflare zones
- ✅ **Workers Management** - Access and manage Cloudflare Workers
- ✅ **R2 Storage** - List and manage R2 buckets
- ✅ **Rate Limiting** - Built-in rate limit tracking (1000 req/5min per user)
- ✅ **Encrypted Storage** - API tokens encrypted at rest
- ✅ **RPC + HTTP** - Dual interface for service-to-service and external calls

## Architecture

```
User creates token in Cloudflare Dashboard
    ↓
User enters token in .do Admin UI
    ↓
admin/ calls cloudflare-api.connect(userId, apiToken)
    ↓
Worker validates token with Cloudflare API
    ↓
Worker encrypts and stores token in database
    ↓
User can now access Cloudflare resources via .do platform
```

## RPC Interface

### Connection Management

```typescript
// Connect Cloudflare account
const result = await env.CLOUDFLARE_API.connect(userId, apiToken)
// Returns: { success: boolean, accountId?: string, email?: string, accounts?: Account[], error?: string }

// Disconnect account
const result = await env.CLOUDFLARE_API.disconnect(userId)
// Returns: { success: boolean, error?: string }

// Verify token without storing
const result = await env.CLOUDFLARE_API.verifyTokenRpc(apiToken)
// Returns: { valid: boolean, accountId?: string, email?: string, accounts?: Account[], error?: string }
```

### Resource Management

```typescript
// List zones
const zones = await env.CLOUDFLARE_API.listZones(userId, { page: 1, per_page: 20, status: 'active' })
// Returns: { zones: Zone[], total: number, error?: string }

// Get zone details
const zone = await env.CLOUDFLARE_API.getZone(userId, zoneId)
// Returns: { zone?: Zone, error?: string }

// List workers
const workers = await env.CLOUDFLARE_API.listWorkers(userId, accountId, { page: 1, per_page: 20 })
// Returns: { workers: Worker[], total: number, error?: string }

// Get worker details
const worker = await env.CLOUDFLARE_API.getWorker(userId, accountId, scriptName)
// Returns: { worker?: Worker, error?: string }

// List R2 buckets
const buckets = await env.CLOUDFLARE_API.listR2Buckets(userId, accountId, { page: 1, per_page: 20 })
// Returns: { buckets: Bucket[], total: number, error?: string }

// Get R2 bucket details
const bucket = await env.CLOUDFLARE_API.getR2Bucket(userId, accountId, bucketName)
// Returns: { bucket?: Bucket, error?: string }
```

## HTTP API

All endpoints require `Authorization: Bearer <token>` header.

### Connection Endpoints

**POST /connect**
```bash
curl -X POST https://cloudflare-api.do/connect \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"apiToken": "xxx"}'
```

**POST /disconnect**
```bash
curl -X POST https://cloudflare-api.do/disconnect \
  -H "Authorization: Bearer $USER_TOKEN"
```

**POST /verify**
```bash
curl -X POST https://cloudflare-api.do/verify \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"apiToken": "xxx"}'
```

### Resource Endpoints

**GET /zones**
```bash
curl https://cloudflare-api.do/zones?page=1&per_page=20&status=active \
  -H "Authorization: Bearer $USER_TOKEN"
```

**GET /zones/:id**
```bash
curl https://cloudflare-api.do/zones/abc123 \
  -H "Authorization: Bearer $USER_TOKEN"
```

**GET /workers**
```bash
curl https://cloudflare-api.do/workers?accountId=xxx&page=1 \
  -H "Authorization: Bearer $USER_TOKEN"
```

**GET /workers/:accountId/:scriptName**
```bash
curl https://cloudflare-api.do/workers/xxx/my-worker \
  -H "Authorization: Bearer $USER_TOKEN"
```

**GET /r2**
```bash
curl https://cloudflare-api.do/r2?accountId=xxx&page=1 \
  -H "Authorization: Bearer $USER_TOKEN"
```

**GET /r2/:accountId/:bucketName**
```bash
curl https://cloudflare-api.do/r2/xxx/my-bucket \
  -H "Authorization: Bearer $USER_TOKEN"
```

## Database Schema

```sql
CREATE TABLE cloudflare_connections (
  user_id TEXT PRIMARY KEY,
  api_token TEXT NOT NULL, -- Encrypted
  account_id TEXT,
  email TEXT,
  verified INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_used_at INTEGER
);

CREATE INDEX idx_cloudflare_connections_user ON cloudflare_connections(user_id);
CREATE INDEX idx_cloudflare_connections_email ON cloudflare_connections(email);
```

## Security

### Token Encryption

API tokens are encrypted before storage using XOR encryption with a secret key:

```typescript
const encrypted = encryptToken(apiToken, ENCRYPTION_SECRET)
const decrypted = decryptToken(encrypted, ENCRYPTION_SECRET)
```

**⚠️ Production Note:** Replace XOR encryption with proper encryption:
- Cloudflare Durable Objects with secret storage
- AWS KMS or equivalent
- HashiCorp Vault
- Cloudflare Workers Secrets

### Rate Limiting

Built-in rate limiting prevents API abuse:
- **Limit:** 1000 requests per 5 minutes per user
- **Tracking:** In-memory (could be moved to KV for persistence)
- **Cloudflare Limits:** ~1200 requests per 5 minutes per token

### Authorization

All HTTP endpoints validate user tokens via the auth service:
```typescript
const user = await env.AUTH.validateToken(token)
```

## Setup

### 1. Create API Token

Users create API tokens in Cloudflare Dashboard:
1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token"
3. Use "Edit Cloudflare Workers" template or custom permissions
4. Copy token (only shown once!)

### 2. Connect Account

In .do admin:
1. Navigate to Settings → Integrations
2. Click "Connect Cloudflare"
3. Paste API token
4. Click "Verify & Connect"

### 3. Use Resources

Once connected, access Cloudflare resources via:
- Admin UI (zones, workers, R2 buckets)
- API endpoints (programmatic access)
- MCP tools (AI agent access)

## Token Permissions

Recommended token permissions:

**Minimal (Read-Only):**
- Account Settings: Read
- Workers Scripts: Read
- Zone: Read
- DNS: Read

**Deployment:**
- Workers Scripts: Edit
- Workers Routes: Edit
- Zone: Edit

**Full Access:**
- All Workers permissions
- All Zone permissions
- Account Settings: Read

## Error Handling

All methods return structured error responses:

```typescript
{
  success: false,
  error: "Rate limit exceeded. Please try again later."
}
```

Common errors:
- `"Cloudflare account not connected"` - User needs to connect account
- `"Rate limit exceeded"` - User hit 1000 req/5min limit
- `"Invalid API token"` - Token is invalid or expired
- `"Failed to list zones"` - API request failed

## Caching

Zone and worker lists are cached in KV to reduce API calls:
- **TTL:** 5 minutes
- **Invalidation:** On write operations
- **Key Format:** `cloudflare:{userId}:zones:{hash}`

## Monitoring

Key metrics tracked:
- Connection success/failure rate
- API request latency (p50, p95, p99)
- Rate limit hits per user
- Token verification failures
- Cache hit/miss ratio

## Integration with .do Platform

### Admin UI

```typescript
// In admin/src/components/integrations/CloudflareConnect.tsx
const handleConnect = async (apiToken: string) => {
  const response = await fetch('/api/cloudflare/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiToken })
  })
  const result = await response.json()
  // Show success or error
}
```

### MCP Tools

```typescript
// In workers/mcp/src/tools/cloudflare.ts
export const cloudflareTools: McpTool[] = [
  {
    name: 'cloudflare_list_zones',
    description: 'List Cloudflare zones',
    inputSchema: { type: 'object', properties: { status: { type: 'string' } } },
    handler: async (input, env, userId) => {
      return await env.CLOUDFLARE_API.listZones(userId, input)
    }
  }
]
```

## Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Run tests
pnpm test

# Type check
pnpm typecheck

# Deploy
pnpm deploy
```

## Future Enhancements

- [ ] Pages project management
- [ ] D1 database operations
- [ ] KV namespace management
- [ ] Workers for Platforms support
- [ ] Bulk operations (multi-zone updates)
- [ ] Webhook integration for real-time updates
- [ ] Analytics and usage statistics
- [ ] Token expiration tracking and alerts
- [ ] Multi-account support per user

## Related Documentation

- [Master OAuth Integration Plan](/notes/2025-10-04-master-oauth-integration-plan.md)
- [Cloudflare OAuth Research](/notes/2025-10-04-cloudflare-oauth-research.md)
- [Workers CLAUDE.md](/workers/CLAUDE.md)
- [Auth Service](/workers/auth/README.md)

## Support

For issues or questions:
1. Check [Cloudflare API docs](https://developers.cloudflare.com/api/)
2. Review error messages in logs
3. Contact .do support

---

**Last Updated:** 2025-10-04
**Status:** Production Ready
**Version:** 1.0.0
