# Netlify OAuth Integration Worker

OAuth 2.0 integration with Netlify for deployment and site management.

## Features

- **OAuth 2.0 Authentication** - Secure user authorization flow
- **Site Management** - List, get, and manage Netlify sites
- **Deployment Operations** - Create, monitor, and manage deployments
- **RPC Interface** - Service-to-service communication via RPC
- **HTTP API** - RESTful endpoints for external access
- **Caching** - KV-based caching for fast access to connections

## Quick Start

### Prerequisites

1. **Register OAuth Application** in Netlify Dashboard
   - Go to User Settings → OAuth applications
   - Create new OAuth application
   - Set redirect URI: `https://netlify.do/callback`
   - Obtain Client ID and Client Secret

2. **Configure Environment Variables**

```bash
# .dev.vars
NETLIFY_CLIENT_ID=your_client_id
NETLIFY_CLIENT_SECRET=your_client_secret
NETLIFY_REDIRECT_URI=https://netlify.do/callback
```

### Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Run tests
pnpm test

# Deploy to production
pnpm deploy
```

## Architecture

### Service Layers

```
┌─────────────────────────────────────────┐
│         NetlifyService (RPC)            │
│  - connect()                            │
│  - disconnect()                         │
│  - deploy()                             │
│  - listSites()                          │
│  - getDeployment()                      │
└──────────────┬──────────────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
┌───▼────────┐   ┌────────▼────────┐
│   HTTP     │   │   Netlify API   │
│   Routes   │   │     Client      │
│  (Hono)    │   │                 │
└────────────┘   └─────────────────┘
```

### File Structure

```
workers/netlify/
├── src/
│   ├── index.ts        # RPC + HTTP interfaces
│   ├── api.ts          # Netlify API client
│   ├── deployments.ts  # Deployment operations
│   ├── sites.ts        # Site management
│   └── types.ts        # TypeScript types
├── wrangler.jsonc      # Worker configuration
├── package.json        # Dependencies
└── README.md          # This file
```

## RPC Interface

### Connect Account

```typescript
const result = await env.NETLIFY.connect(userId, authorizationCode)
// Returns: { success: true, userId, netlifyUserId, email }
```

### Disconnect Account

```typescript
const result = await env.NETLIFY.disconnect(userId)
// Returns: { success: true, userId }
```

### Deploy Site

```typescript
const result = await env.NETLIFY.deploy(userId, {
  siteId: 'site-id',
  files: {
    'index.html': '<html>...</html>',
    'style.css': 'body { ... }',
  },
  draft: false,
  title: 'Deploy from API',
  branch: 'main',
})
// Returns: { success: true, deployment, siteId, deployId }
```

### List Sites

```typescript
const result = await env.NETLIFY.listSites(userId, {
  page: 1,
  perPage: 20,
  filter: 'my-site',
})
// Returns: { success: true, sites: [...], total }
```

### Get Deployment

```typescript
const result = await env.NETLIFY.getDeployment(userId, siteId, deployId)
// Returns: { success: true, deployment, siteId }
```

### Get Site

```typescript
const site = await env.NETLIFY.getSite(userId, siteId)
// Returns: NetlifySite object
```

### Get Site Stats

```typescript
const stats = await env.NETLIFY.getSiteStats(userId, siteId)
// Returns: { site: {...}, deploys: { total, successful, failed, latest } }
```

### List Deployments

```typescript
const deployments = await env.NETLIFY.listDeployments(userId, siteId, 10)
// Returns: NetlifyDeployment[]
```

## HTTP API

### Health Check

```bash
GET /health
```

Response:
```json
{
  "status": "ok",
  "service": "netlify"
}
```

### OAuth Callback

```bash
GET /callback?code=AUTH_CODE&userId=USER_ID
```

Response:
```json
{
  "success": true,
  "userId": "user_123",
  "netlifyUserId": "netlify_456",
  "email": "user@example.com"
}
```

### Disconnect Account

```bash
POST /disconnect
Content-Type: application/json

{
  "userId": "user_123"
}
```

Response:
```json
{
  "success": true,
  "userId": "user_123"
}
```

### List Sites

```bash
GET /sites?userId=user_123
```

Response:
```json
{
  "success": true,
  "sites": [
    {
      "id": "site-id",
      "name": "my-site",
      "url": "https://my-site.netlify.app",
      "state": "ready",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 1
}
```

### Get Site

```bash
GET /sites/:siteId?userId=user_123
```

Response:
```json
{
  "success": true,
  "site": {
    "id": "site-id",
    "name": "my-site",
    "url": "https://my-site.netlify.app",
    "state": "ready"
  }
}
```

### Deploy Site

```bash
POST /deploy
Content-Type: application/json

{
  "userId": "user_123",
  "siteId": "site-id",
  "files": {
    "index.html": "<html>...</html>"
  },
  "draft": false,
  "title": "Deploy from API"
}
```

Response:
```json
{
  "success": true,
  "deployment": {
    "id": "deploy-id",
    "state": "building",
    "url": "https://deploy-url.netlify.app"
  },
  "siteId": "site-id",
  "deployId": "deploy-id"
}
```

### Get Deployment

```bash
GET /sites/:siteId/deploys/:deployId?userId=user_123
```

Response:
```json
{
  "success": true,
  "deployment": {
    "id": "deploy-id",
    "state": "ready",
    "url": "https://deploy-url.netlify.app"
  },
  "siteId": "site-id"
}
```

### List Deployments

```bash
GET /sites/:siteId/deploys?userId=user_123&limit=10
```

Response:
```json
{
  "success": true,
  "deployments": [...]
}
```

### Get Site Stats

```bash
GET /sites/:siteId/stats?userId=user_123
```

Response:
```json
{
  "success": true,
  "stats": {
    "site": {
      "id": "site-id",
      "name": "my-site",
      "url": "https://my-site.netlify.app",
      "state": "ready"
    },
    "deploys": {
      "total": 42,
      "successful": 40,
      "failed": 2,
      "latest": {
        "id": "deploy-id",
        "state": "ready",
        "created_at": "2025-10-04T12:00:00Z"
      }
    }
  }
}
```

## OAuth Flow

### 1. Authorization URL

```typescript
const authUrl = `https://app.netlify.com/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}&state=${STATE}`

// Redirect user to authUrl
```

### 2. User Authorizes

User grants permission on Netlify's authorization page.

### 3. Callback

Netlify redirects to:
```
https://netlify.do/callback?code=AUTH_CODE&state=STATE
```

### 4. Connect Account

```typescript
const result = await env.NETLIFY.connect(userId, authCode)
```

### 5. Access Token Stored

Connection stored in database and cached in KV for fast access.

## Rate Limits

- **General API**: 500 requests per minute
- **Deployments**: 3 per minute, 100 per day
- **Protocol**: HTTPS only

Monitor rate limits via response headers:
- `X-RateLimit-Limit`: Total limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset timestamp

## Database Schema

```sql
CREATE TABLE oauth_connections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(user_id, provider)
);

CREATE INDEX idx_oauth_connections_user ON oauth_connections(user_id);
CREATE INDEX idx_oauth_connections_provider ON oauth_connections(provider);
```

## Security

- ✅ OAuth 2.0 authorization code flow
- ✅ CSRF protection via state parameter
- ✅ Access tokens encrypted at rest
- ✅ No tokens in logs
- ✅ KV caching with TTL
- ✅ Rate limit monitoring

## Error Handling

All errors return consistent format:

```json
{
  "error": "Error message"
}
```

Common errors:
- `Missing code or userId` - Invalid OAuth callback
- `Netlify account not connected` - User must connect first
- `Token exchange failed` - OAuth code invalid or expired
- `Deployment failed` - Deployment error

## Testing

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test -- --watch

# Coverage
pnpm test -- --coverage
```

## Deployment

### Via Workers for Platforms (Recommended)

```bash
# Build
pnpm build

# Deploy via Deploy API
curl -X POST https://deploy.do/deploy \
  -H "Authorization: Bearer $DEPLOY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "service": "netlify",
    "environment": "production",
    "script": "BASE64_ENCODED_SCRIPT"
  }'
```

### Via Wrangler (Direct)

```bash
pnpm deploy
```

## Related Documentation

- **Netlify OAuth Setup**: `/notes/2025-10-04-netlify-oauth-setup.md`
- **Master OAuth Plan**: `/notes/2025-10-04-master-oauth-integration-plan.md`
- **Workers Architecture**: `/workers/CLAUDE.md`

## Support

For issues or questions:
- GitHub: https://github.com/dot-do/workers
- Documentation: https://docs.netlify.com/api/get-started/

---

**Status**: Ready for implementation
**Version**: 1.0.0
**Last Updated**: 2025-10-04
