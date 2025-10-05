# Vercel Integration Worker

OAuth integration and deployment service for Vercel platform.

## Overview

The Vercel worker provides complete integration with Vercel's platform, enabling users to:

- **Connect Vercel accounts** via OAuth 2.0
- **Deploy projects** to Vercel from the .do platform
- **Manage deployments** (create, monitor, cancel)
- **List projects** and teams
- **Check deployment status** in real-time

## Architecture

```
Client Request
      ↓
┌──────────────┐
│   Gateway    │ ◄── Routes /api/vercel/*
└──────┬───────┘
       │ RPC
       ▼
┌──────────────┐
│    Vercel    │ ◄── Vercel API service
│   Service    │
└──────┬───────┘
       │
   ┌───┴────┐
   │        │
   ▼        ▼
┌─────┐  ┌─────┐
│ DB  │  │ Auth│
└─────┘  └─────┘
```

## Features

### OAuth Integration
- Standard OAuth 2.0 authorization code flow
- Secure token storage in database
- Automatic token refresh (if supported)
- Multi-team support

### Deployment Management
- Deploy from files or Git repositories
- Support for all Vercel deployment options
- Real-time deployment status tracking
- Deployment cancellation
- Preview and production deployments

### Project Management
- List all user projects
- Get project details
- Team-scoped project access

### Team Support
- List user's teams
- Team-scoped deployments
- Team-based project filtering

## RPC Interface

The `VercelService` class provides service-to-service communication:

```typescript
export class VercelService extends WorkerEntrypoint<Env> {
  // OAuth
  async connect(input: ConnectInput): Promise<ConnectResponse>
  async disconnect(userId: string): Promise<boolean>
  async getConnection(userId: string): Promise<VercelConnection | null>

  // Deployments
  async deploy(input: DeploymentInput): Promise<VercelDeployment>
  async getDeploymentStatus(input: GetDeploymentInput): Promise<VercelDeployment>
  async listDeployments(input: ListDeploymentsInput): Promise<VercelDeployment[]>
  async cancelDeployment(userId: string, deploymentId: string, teamId?: string): Promise<void>

  // Projects
  async listProjects(input: ListProjectsInput): Promise<VercelProject[]>
  async getProject(userId: string, projectIdOrName: string, teamId?: string): Promise<VercelProject>

  // Teams & User
  async listTeams(userId: string): Promise<any[]>
  async getUser(userId: string): Promise<any>
}
```

### Usage Example

```typescript
// Deploy to Vercel
const deployment = await env.VERCEL_SERVICE.deploy({
  userId: 'user_123',
  options: {
    name: 'my-app',
    gitSource: {
      type: 'github',
      repo: 'username/repo',
      ref: 'main',
    },
    target: 'production',
    env: {
      API_KEY: 'xxx',
    },
  },
})

// Check deployment status
const status = await env.VERCEL_SERVICE.getDeploymentStatus({
  userId: 'user_123',
  deploymentId: deployment.id,
})

// List projects
const projects = await env.VERCEL_SERVICE.listProjects({
  userId: 'user_123',
  limit: 10,
})
```

## HTTP API

### Authentication

All endpoints (except `/health` and `/callback`) require Bearer token authentication:

```bash
Authorization: Bearer <token>
```

### Endpoints

#### `GET /health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "vercel"
}
```

#### `GET /callback`
OAuth callback endpoint. Redirects to admin with authorization code.

**Query Parameters:**
- `code` - Authorization code from Vercel
- `state` - CSRF protection state

#### `POST /connect`
Connect user's Vercel account.

**Request Body:**
```json
{
  "code": "authorization_code_from_oauth_flow"
}
```

**Response:**
```json
{
  "userId": "user_123",
  "accessToken": "...",
  "vercelUserId": "vercel_user_123",
  "teamId": "team_123",
  "connectedAt": 1609459200000,
  "lastUsedAt": 1609459200000
}
```

#### `POST /disconnect`
Disconnect user's Vercel account.

**Response:**
```json
{
  "success": true
}
```

#### `GET /connection`
Get connection status.

**Response:**
```json
{
  "connected": true,
  "vercelUserId": "vercel_user_123",
  "teamId": "team_123",
  "connectedAt": 1609459200000,
  "lastUsedAt": 1609459200000
}
```

#### `POST /deploy`
Create a new deployment.

**Request Body:**
```json
{
  "name": "my-app",
  "gitSource": {
    "type": "github",
    "repo": "username/repo",
    "ref": "main"
  },
  "target": "production",
  "env": {
    "API_KEY": "xxx"
  }
}
```

**Response:**
```json
{
  "id": "dpl_123",
  "uid": "dpl_123",
  "name": "my-app",
  "url": "my-app-abc123.vercel.app",
  "state": "BUILDING",
  "target": "production",
  "createdAt": 1609459200000
}
```

#### `GET /deployments/:id`
Get deployment status.

**Query Parameters:**
- `teamId` - Optional team ID

**Response:**
```json
{
  "id": "dpl_123",
  "state": "READY",
  "url": "my-app-abc123.vercel.app",
  "target": "production"
}
```

#### `GET /deployments`
List deployments.

**Query Parameters:**
- `projectId` - Filter by project ID
- `teamId` - Filter by team ID
- `limit` - Maximum number of results
- `state` - Filter by state (BUILDING, ERROR, READY, QUEUED, CANCELED)

**Response:**
```json
[
  {
    "id": "dpl_123",
    "name": "my-app",
    "url": "my-app-abc123.vercel.app",
    "state": "READY",
    "target": "production",
    "createdAt": 1609459200000
  }
]
```

#### `POST /deployments/:id/cancel`
Cancel a deployment.

**Query Parameters:**
- `teamId` - Optional team ID

**Response:**
```json
{
  "success": true
}
```

#### `GET /projects`
List user's projects.

**Query Parameters:**
- `teamId` - Filter by team ID
- `limit` - Maximum number of results

**Response:**
```json
[
  {
    "id": "prj_123",
    "name": "my-app",
    "framework": "nextjs",
    "createdAt": 1609459200000
  }
]
```

#### `GET /projects/:idOrName`
Get project details.

**Query Parameters:**
- `teamId` - Optional team ID

**Response:**
```json
{
  "id": "prj_123",
  "name": "my-app",
  "framework": "nextjs",
  "link": {
    "type": "github",
    "repo": "username/repo"
  },
  "createdAt": 1609459200000
}
```

#### `GET /teams`
List user's teams.

**Response:**
```json
[
  {
    "id": "team_123",
    "slug": "my-team",
    "name": "My Team",
    "membership": {
      "role": "OWNER"
    }
  }
]
```

#### `GET /user`
Get current Vercel user info.

**Response:**
```json
{
  "user": {
    "id": "vercel_user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "username": "johndoe"
  }
}
```

## Database Schema

### `vercel_connections` Table

```sql
CREATE TABLE vercel_connections (
  user_id TEXT PRIMARY KEY,
  access_token TEXT NOT NULL,
  vercel_user_id TEXT NOT NULL,
  team_id TEXT,
  connected_at INTEGER NOT NULL,
  last_used_at INTEGER NOT NULL
);

CREATE INDEX idx_vercel_connections_vercel_user_id
  ON vercel_connections(vercel_user_id);
```

### `vercel_deployments` Table

```sql
CREATE TABLE vercel_deployments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  deployment_id TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  state TEXT NOT NULL,
  target TEXT NOT NULL,
  project_id TEXT,
  team_id TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_vercel_deployments_user_id
  ON vercel_deployments(user_id);

CREATE INDEX idx_vercel_deployments_deployment_id
  ON vercel_deployments(deployment_id);
```

## Configuration

### Environment Variables

Required secrets (set via Wrangler):

```bash
# Vercel OAuth credentials
VERCEL_CLIENT_ID=xxx
VERCEL_CLIENT_SECRET=xxx
```

### Service Bindings

Configured in `wrangler.jsonc`:

```jsonc
{
  "services": [
    { "binding": "DB", "service": "db" },
    { "binding": "AUTH", "service": "auth" }
  ]
}
```

## Development

### Install Dependencies

```bash
pnpm install
```

### Run Local Development Server

```bash
pnpm dev
```

### Run Tests

```bash
pnpm test
```

### Type Check

```bash
pnpm typecheck
```

### Deploy

```bash
pnpm deploy
```

## Security Considerations

### Token Storage
- Access tokens are stored encrypted in the database
- Tokens are never logged or exposed in responses
- Connection tracking includes last usage timestamp

### CSRF Protection
- OAuth flow includes state parameter validation
- All API endpoints require authentication
- Bearer tokens validated via AUTH service

### Rate Limiting
- Respects Vercel API rate limits
- Implements client-side request throttling
- Returns appropriate error messages on rate limit

### Error Handling
- Sanitized error messages (no sensitive data)
- Proper HTTP status codes
- Detailed logging for debugging

## Testing

### Unit Tests

```bash
pnpm test
```

### Integration Tests

```bash
# Test OAuth flow
curl https://vercel.do/callback?code=xxx&state=xxx

# Test deployment
curl -X POST https://vercel.do/deploy \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-app",
    "files": [
      {
        "file": "index.html",
        "data": "PGh0bWw+SGVsbG8gV29ybGQhPC9odG1sPg==",
        "encoding": "base64"
      }
    ],
    "target": "preview"
  }'
```

## Troubleshooting

### OAuth Connection Failed
- Verify Vercel integration is approved
- Check client ID and secret are correct
- Ensure redirect URI matches registered URL

### Deployment Failed
- Check user has connected Vercel account
- Verify project settings are correct
- Check Vercel API status

### Token Expired
- Tokens don't expire by default
- User may need to reconnect if access is revoked
- Check token is stored correctly in database

## Related Documentation

- [Vercel OAuth Plan](/notes/2025-10-04-vercel-oauth-integration.md)
- [Master OAuth Plan](/notes/2025-10-04-master-oauth-integration-plan.md)
- [Workers CLAUDE.md](../CLAUDE.md)
- [Vercel API Docs](https://vercel.com/docs/rest-api)

## License

Private - Internal use only

---

**Last Updated:** 2025-10-04
**Status:** Complete - Ready for Testing
**Version:** 1.0.0
