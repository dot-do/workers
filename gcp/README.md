# GCP Worker

Google Cloud Platform OAuth 2.0 integration service for the .do platform.

## Overview

The GCP worker provides OAuth 2.0 authentication and API integration with Google Cloud Platform services. It enables users to securely connect their Google accounts and interact with GCP resources programmatically.

## Features

### OAuth 2.0 Integration
- ✅ Complete OAuth flow (authorization + token exchange)
- ✅ Automatic token refresh
- ✅ Token storage in KV + PostgreSQL
- ✅ Token revocation
- ✅ PKCE support (Proof Key for Code Exchange)
- ✅ State parameter validation (CSRF protection)

### GCP Services Supported
- ✅ **Cloud Resource Manager** - List projects
- ✅ **Cloud Storage** - List buckets
- ✅ **Cloud Functions** - List and invoke functions
- ✅ **Compute Engine** - List instances
- ✅ **BigQuery** - List datasets
- ✅ **Cloud SQL** - List instances

### Additional Features
- ✅ Automatic token refresh before expiration
- ✅ Comprehensive error handling
- ✅ RPC, HTTP, and MCP interfaces
- ✅ TypeScript types for all APIs
- ✅ Connection management per user
- ✅ Observability and logging

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      GCP Worker                             │
└─────────────────────────────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ OAuth Handler│    │ API Client   │    │ Services     │
│              │    │              │    │              │
│ - Auth URL   │    │ - Projects   │    │ - Storage    │
│ - Exchange   │    │ - Buckets    │    │ - Functions  │
│ - Refresh    │    │ - Functions  │    │ - Compute    │
│ - Revoke     │    │ - Instances  │    │ - BigQuery   │
└──────────────┘    └──────────────┘    └──────────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Token KV     │    │ PostgreSQL   │    │ Google APIs  │
│ (Cache)      │    │ (Persistence)│    │ (External)   │
└──────────────┘    └──────────────┘    └──────────────┘
```

## Setup

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable required APIs:
   - Cloud Resource Manager API
   - Cloud Storage JSON API
   - Cloud Functions API
   - Compute Engine API
   - BigQuery API
   - Cloud SQL Admin API

### 2. Configure OAuth Consent Screen

1. Navigate to **APIs & Services > OAuth consent screen**
2. Select **External** (or **Internal** for Google Workspace)
3. Fill in required information:
   - App name
   - User support email
   - Developer contact email
4. Add scopes:
   - `openid`
   - `email`
   - `profile`
   - `https://www.googleapis.com/auth/cloud-platform`
5. Add test users (if in testing mode)

### 3. Create OAuth Client ID

1. Navigate to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth client ID**
3. Select **Web application**
4. Add authorized redirect URI:
   - `https://gcp.do/callback` (production)
   - `http://localhost:8787/callback` (development)
5. Download credentials JSON

### 4. Configure Worker

Create `.dev.vars` file:

```bash
GCP_CLIENT_ID=your-client-id.apps.googleusercontent.com
GCP_CLIENT_SECRET=your-client-secret
GCP_REDIRECT_URI=https://gcp.do/callback
```

### 5. Deploy Worker

```bash
# Install dependencies
pnpm install

# Deploy to production
pnpm deploy

# Or run locally
pnpm dev
```

## Usage

### RPC Interface

```typescript
// Connect user's Google account
const result = await env.GCP_SERVICE.connect(userId, authorizationCode)

// Disconnect user's Google account
await env.GCP_SERVICE.disconnect(userId)

// List GCP projects
const { projects } = await env.GCP_SERVICE.listProjects(userId)

// List Cloud Storage buckets
const { buckets } = await env.GCP_SERVICE.listBuckets(userId, projectId)

// List Cloud Functions
const { functions } = await env.GCP_SERVICE.listFunctions(userId, projectId)

// Invoke Cloud Function
const result = await env.GCP_SERVICE.invokeFunction(userId, projectId, functionName, { data: 'value' })
```

### HTTP API

#### Get Authorization URL

```bash
GET /connect?user_id=user123

Response:
{
  "url": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

#### OAuth Callback

```bash
GET /callback?code=xxx&state=yyy

Response:
{
  "success": true,
  "userInfo": {
    "sub": "123456789",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

#### Disconnect Account

```bash
POST /disconnect
Content-Type: application/json

{
  "userId": "user123"
}

Response:
{
  "success": true
}
```

#### List Projects

```bash
GET /projects?user_id=user123

Response:
{
  "projects": [
    {
      "projectId": "my-project",
      "name": "My Project",
      "lifecycleState": "ACTIVE"
    }
  ]
}
```

#### List Buckets

```bash
GET /buckets?user_id=user123&project_id=my-project

Response:
{
  "buckets": [
    {
      "name": "my-bucket",
      "location": "US",
      "storageClass": "STANDARD"
    }
  ]
}
```

#### List Functions

```bash
GET /functions?user_id=user123&project_id=my-project&location=us-central1

Response:
{
  "functions": [
    {
      "name": "my-function",
      "status": "ACTIVE",
      "runtime": "nodejs20"
    }
  ]
}
```

#### Invoke Function

```bash
POST /functions/invoke
Content-Type: application/json

{
  "userId": "user123",
  "projectId": "my-project",
  "functionName": "my-function",
  "data": {
    "key": "value"
  }
}

Response:
{
  "executionId": "abc-123",
  "result": {
    "status": "success"
  }
}
```

## OAuth Scopes

### Default Scopes
- `openid` - OpenID Connect
- `email` - User's email address
- `profile` - User's basic profile
- `https://www.googleapis.com/auth/cloud-platform` - Full GCP access

### Additional Scopes (Optional)
- `https://www.googleapis.com/auth/compute` - Compute Engine
- `https://www.googleapis.com/auth/devstorage.full_control` - Cloud Storage
- `https://www.googleapis.com/auth/bigquery` - BigQuery

## Security

### Token Storage
- Access tokens stored in KV namespace (encrypted at rest)
- Refresh tokens stored in PostgreSQL (encrypted)
- Tokens never exposed in logs or error messages

### CSRF Protection
- State parameter validated on OAuth callback
- State stored in KV with 10-minute expiration
- Random UUID generated for each OAuth flow

### Token Refresh
- Automatic refresh before expiration
- Refresh tokens used when access token expires
- Connection updated in KV and database

### Token Revocation
- Tokens revoked with Google on disconnect
- All stored tokens deleted from KV and database

## Error Handling

All RPC methods return structured responses:

```typescript
{
  success: boolean
  error?: string
  // ... additional fields
}
```

Common errors:
- `User not connected to GCP` - User needs to complete OAuth flow
- `Access token expired and no refresh token available` - User needs to re-authenticate
- `Failed to refresh access token` - Refresh token invalid/revoked
- `GCP API error: 403` - Insufficient permissions

## Development

### Local Development

```bash
# Start dev server
pnpm dev

# Run tests
pnpm test

# Type check
pnpm typecheck

# Format code
pnpm format
```

### Testing OAuth Flow

1. Start local server: `pnpm dev`
2. Get auth URL: `curl http://localhost:8787/connect?user_id=test`
3. Open URL in browser and authorize
4. Copy authorization code from redirect URL
5. Test callback: `curl http://localhost:8787/callback?code=xxx&state=yyy`

## Deployment

### Workers for Platforms

```bash
# Deploy via Deploy API
curl -X POST https://deploy.do/deploy \
  -H "Authorization: Bearer $DEPLOY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "service": "gcp",
    "environment": "production",
    "script": "<base64-encoded-bundle>"
  }'
```

### Direct Deployment

```bash
# Deploy to production
wrangler deploy

# Deploy to staging
wrangler deploy --env staging
```

## Monitoring

### Key Metrics
- OAuth flow success rate
- Token refresh success rate
- API call success rate
- Average response time

### Logging
All operations logged to logger service via tail consumers.

## Limitations

### Google OAuth
- External apps in testing mode: 7-day refresh token expiration
- 100 refresh tokens per user per OAuth client
- Rate limits: 10,000 token requests/day

### GCP APIs
- Rate limits vary per service
- Some APIs require additional IAM permissions
- Quota limits apply per project

## Roadmap

### Planned Features
- [ ] Service-specific modules (more Compute, BigQuery operations)
- [ ] Batch operations support
- [ ] Webhook support for GCP events
- [ ] MCP server for AI agent integration
- [ ] Queue consumer for async operations

### Future Integrations
- [ ] Google Workspace APIs (Drive, Gmail, Calendar)
- [ ] Firebase integration
- [ ] Cloud Run deployments
- [ ] Kubernetes Engine management

## Resources

### Documentation
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [GCP API Reference](https://cloud.google.com/apis/docs/overview)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)

### Related Workers
- [auth](../auth/) - Platform authentication
- [db](../db/) - Database layer
- [gateway](../gateway/) - API gateway

## Support

For issues or questions:
- GitHub: https://github.com/dot-do/workers
- Documentation: https://docs.do

---

**Last Updated:** 2025-10-04
**Version:** 1.0.0
**Status:** Production Ready
