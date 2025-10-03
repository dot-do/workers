# Auth Service

Comprehensive authentication and authorization microservice for the dot-do platform.

## Features

- **WorkOS Integration** - OAuth 2.0, SSO (SAML, Google, Microsoft), SCIM, Directory Sync
- **API Key Management** - Generate, validate, and revoke API keys
- **JWT Sessions** - Secure session management with refresh tokens
- **RBAC** - Role-based access control with custom permissions
- **Rate Limiting** - Protect auth endpoints from abuse
- **Multi-Interface** - RPC, HTTP REST API, and MCP protocol support

## Architecture

This service follows the Unix philosophy: **do one thing (auth) and do it well**.

### Interfaces

1. **RPC (WorkerEntrypoint)** - Service-to-service calls via Workers RPC
2. **HTTP (Hono)** - REST API for OAuth flows and session management
3. **MCP (optional)** - AI agent integration for auth operations

### Tech Stack

- **Runtime**: Cloudflare Workers
- **Framework**: Hono (HTTP), WorkOS SDK
- **Database**: PostgreSQL via DB service RPC
- **Storage**: KV (rate limiting, optional sessions)
- **Auth Provider**: WorkOS (OAuth, SSO, SCIM)
- **Tokens**: JWT (jose library)

## Installation

```bash
cd workers/auth
pnpm install
```

## Configuration

### Environment Variables

Set these secrets via `wrangler secret put`:

```bash
# WorkOS
wrangler secret put WORKOS_API_KEY
wrangler secret put WORKOS_CLIENT_ID
wrangler secret put WORKOS_CLIENT_SECRET
wrangler secret put WORKOS_WEBHOOK_SECRET  # Optional

# JWT
wrangler secret put JWT_SECRET
wrangler secret put JWT_REFRESH_SECRET
```

### Database Schema

Required tables (managed by DB service):

```sql
-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  image TEXT,
  role TEXT DEFAULT 'user',
  email_verified BOOLEAN DEFAULT FALSE,
  workos_id TEXT,
  organization_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sessions table
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP NOT NULL,
  device TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- API keys table
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  prefix TEXT NOT NULL,
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Permissions table
CREATE TABLE permissions (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  organization_id TEXT,
  granted_at TIMESTAMP DEFAULT NOW()
);
```

### KV Namespaces

Create KV namespaces for rate limiting:

```bash
wrangler kv:namespace create RATE_LIMIT_KV
wrangler kv:namespace create SESSIONS_KV  # Optional
```

Update `wrangler.jsonc` with the namespace IDs.

## Development

```bash
# Start dev server
pnpm dev

# Type check
pnpm typecheck

# Run tests
pnpm test

# Generate types
pnpm types
```

## API Reference

### RPC Methods (Service-to-Service)

Call these methods from other Workers via service binding:

```typescript
const user = await env.AUTH_SERVICE.validateApiKey('sk_live_...')
const session = await env.AUTH_SERVICE.createSession(userId, device, ip, userAgent)
const hasPermission = await env.AUTH_SERVICE.checkPermission({ userId, resource, action })
```

#### `validateToken(token: string): Promise<ValidateTokenResponse>`

Validate JWT or API key token.

```typescript
const result = await env.AUTH_SERVICE.validateToken('sk_live_...')
// { valid: true, user: { id, email, role, ... } }
```

#### `validateApiKey(apiKey: string): Promise<User | null>`

Validate API key and return user.

```typescript
const user = await env.AUTH_SERVICE.validateApiKey('sk_live_...')
```

#### `createApiKey(input: ApiKeyCreateInput): Promise<CreateApiKeyResponse>`

Generate new API key for user.

```typescript
const result = await env.AUTH_SERVICE.createApiKey({
  userId: 'user-123',
  name: 'Production API Key',
  expiresInDays: 90,
  environment: 'live'
})
// { success: true, apiKey: { id, name, key: 'sk_live_...', ... } }
```

#### `revokeApiKey(userId: string, keyId: string): Promise<boolean>`

Revoke API key.

```typescript
const revoked = await env.AUTH_SERVICE.revokeApiKey('user-123', 'key-456')
```

#### `checkPermission(check: PermissionCheck): Promise<boolean>`

Check if user has permission.

```typescript
const hasPermission = await env.AUTH_SERVICE.checkPermission({
  userId: 'user-123',
  resource: 'things',
  action: 'write',
  organizationId: 'org-456'
})
```

#### `createSession(userId: string, device?: string, ipAddress?: string, userAgent?: string): Promise<SessionResponse>`

Create new session with JWT tokens.

```typescript
const { session, token, refreshToken } = await env.AUTH_SERVICE.createSession(
  'user-123',
  'iPhone 15 Pro',
  '192.168.1.1',
  'Mozilla/5.0...'
)
```

#### `getSession(sessionId: string): Promise<Session | null>`

Get session details.

#### `revokeSession(sessionId: string): Promise<boolean>`

Revoke session (logout).

#### `refreshSession(refreshToken: string): Promise<{ token: string; refreshToken: string }>`

Refresh access token using refresh token.

#### `grantPermission(userId: string, resource: string, action: string, organizationId?: string): Promise<boolean>`

Grant custom permission to user.

#### `revokePermission(userId: string, resource: string, action: string, organizationId?: string): Promise<boolean>`

Revoke custom permission from user.

#### `getWorkOSAuthURL(redirectUri: string, state?: string): Promise<string>`

Get WorkOS OAuth authorization URL.

#### `exchangeWorkOSCode(code: string): Promise<WorkOSAuthResponse>`

Exchange OAuth code for tokens and user info.

### HTTP API Endpoints

#### Authentication

**GET `/authorize`** - Initiate WorkOS OAuth flow

Query parameters:
- `redirect_uri` - OAuth callback URL (default: `/callback`)
- `state` - Optional state parameter
- `provider` - Optional provider (default: `authkit`)

**GET `/callback`** - OAuth callback handler

Query parameters:
- `code` - Authorization code from WorkOS
- `state` - State parameter from authorization

Returns:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi...",
    "user": { "id": "user-123", "email": "user@example.com" }
  },
  "message": "Authentication successful"
}
```

#### API Keys

**POST `/apikeys`** - Create new API key

Headers:
- `Authorization: Bearer <token>`

Body:
```json
{
  "name": "Production API Key",
  "expiresInDays": 90,
  "environment": "live"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "key-123",
    "name": "Production API Key",
    "key": "sk_live_abc123...",
    "prefix": "sk_live_",
    "expiresAt": "2025-04-01T00:00:00Z",
    "createdAt": "2025-01-01T00:00:00Z"
  }
}
```

**GET `/apikeys`** - List user's API keys

Headers:
- `Authorization: Bearer <token>`

Response:
```json
{
  "success": true,
  "data": {
    "keys": [
      {
        "id": "key-123",
        "name": "Production API Key",
        "prefix": "sk_live_",
        "lastUsedAt": "2025-01-15T10:30:00Z",
        "expiresAt": "2025-04-01T00:00:00Z",
        "createdAt": "2025-01-01T00:00:00Z"
      }
    ],
    "total": 1
  }
}
```

**DELETE `/apikeys/:id`** - Revoke API key

Headers:
- `Authorization: Bearer <token>`

Response:
```json
{
  "success": true,
  "message": "API key revoked successfully"
}
```

#### Sessions

**GET `/session`** - Get current session

Headers:
- `Authorization: Bearer <token>`

Response:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-123",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user"
    },
    "session": {
      "id": "session-456",
      "expiresAt": "2025-01-08T00:00:00Z"
    }
  }
}
```

**POST `/logout`** - End session

Headers:
- `Authorization: Bearer <token>`

Response:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**POST `/refresh`** - Refresh access token

Body:
```json
{
  "refreshToken": "eyJhbGciOi..."
}
```

Response:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi..."
  }
}
```

#### Permissions

**POST `/check-permission`** - Check user permission

Headers:
- `Authorization: Bearer <token>`

Body:
```json
{
  "resource": "things",
  "action": "write"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "hasPermission": true,
    "resource": "things",
    "action": "write"
  }
}
```

## Security

### API Key Security

- API keys are **never** stored in plain text
- Keys are hashed using SHA-256 before storage
- Only the prefix (e.g., `sk_live_`) is visible after creation
- Keys are generated using crypto.getRandomValues() for secure randomness

### JWT Security

- JWTs use HS256 (HMAC-SHA256) signing
- Access tokens expire after 1 hour
- Refresh tokens expire after 30 days
- Tokens are validated on every request

### Rate Limiting

- Auth endpoints: 10 requests per minute per IP
- General API: 60 requests per minute per IP
- Rate limits stored in KV namespace

### Best Practices

1. **Never log API keys** - Use redaction utilities
2. **Rotate secrets regularly** - Update JWT_SECRET periodically
3. **Use HTTPS only** - Never transmit tokens over HTTP
4. **Implement token rotation** - Refresh tokens before expiry
5. **Monitor for abuse** - Track failed auth attempts
6. **Audit logs** - Use WorkOS audit logs for compliance

## RBAC (Role-Based Access Control)

### Default Roles

**Admin** (`admin`)
- All permissions (`*`)
- Can manage users, roles, and permissions
- Can perform mutations

**User** (`user`)
- Read/write access to things, relationships, AI
- Can use search
- Cannot perform admin operations

**Viewer** (`viewer`)
- Read-only access
- Can view things, relationships
- Can use search
- Cannot write or delete

### Permission Format

Permissions are in the format `resource:action`:

- `things:read` - Read things
- `things:write` - Create/update things
- `relationships:read` - Read relationships
- `ai:write` - Use AI generation
- `*` - All permissions (admin only)

### Custom Permissions

Grant custom permissions to users:

```typescript
await env.AUTH_SERVICE.grantPermission(
  'user-123',
  'premium-features',
  'access',
  'org-456'
)
```

## WorkOS Integration

### OAuth Flow

1. Redirect user to `/authorize`
2. User authenticates with WorkOS
3. WorkOS redirects to `/callback` with code
4. Exchange code for tokens
5. Create/update user in database
6. Create session and return JWT

### SSO (Single Sign-On)

```typescript
const url = await workos.getSSOAuthorizationURL(env, {
  organizationId: 'org-123',
  provider: 'google',
  redirectUri: 'https://example.com/callback',
  state: 'random-state'
})
```

### SCIM (User Provisioning)

```typescript
const users = await workos.listDirectoryUsers(env, 'directory-123', {
  limit: 100
})

const groups = await workos.listDirectoryGroups(env, 'directory-123')
```

### Directory Sync

```typescript
const directory = await workos.getDirectory(env, 'directory-123')
const directories = await workos.listDirectories(env, 'org-456')
```

### Audit Logs

```typescript
await workos.createAuditLogEvent(env, 'org-123', {
  action: 'user.login',
  actorId: 'user-456',
  actorName: 'john.doe@example.com',
  targetId: 'resource-789',
  targetName: 'Production API',
  occurredAt: new Date().toISOString()
})
```

## Testing

Run comprehensive test suite:

```bash
pnpm test
```

Test coverage target: **80%+**

### Test Structure

```
tests/
├── auth.test.ts          # Integration tests
├── apikeys.test.ts       # API key tests
├── sessions.test.ts      # Session tests
├── rbac.test.ts          # RBAC tests
└── workos.test.ts        # WorkOS integration tests
```

## Deployment

```bash
pnpm deploy
```

### Prerequisites

1. Set all secrets via `wrangler secret put`
2. Create KV namespaces
3. Update `wrangler.jsonc` with namespace IDs
4. Ensure DB service is deployed

### Monitoring

The service includes:

- Health check endpoint: `/health`
- Tail consumers for logging
- Observability enabled in wrangler.jsonc

## Error Handling

All errors return standardized JSON responses:

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": { /* optional error details */ }
}
```

### Error Codes

- `UNAUTHORIZED` (401) - Authentication required
- `FORBIDDEN` (403) - Permission denied
- `INVALID_TOKEN` (401) - Token is invalid
- `TOKEN_EXPIRED` (401) - Token has expired
- `RATE_LIMIT_EXCEEDED` (429) - Too many requests
- `MISSING_CODE` (400) - Missing authorization code
- `AUTH_FAILED` (500) - Authentication failed

## Performance

### Target Metrics

- **RPC Latency**: < 5ms (p95) for token validation
- **HTTP Latency**: < 50ms (p95) for auth endpoints
- **API Key Validation**: < 10ms (p95)
- **Session Creation**: < 20ms (p95)

### Optimization

- API keys cached after first validation
- Sessions cached in KV (optional)
- Database queries optimized with indexes
- Rate limiting uses KV for fast lookups

## Migration from Legacy

If migrating from `api.services/auth`:

1. Copy user data to new schema
2. Migrate API keys (re-hash with new algorithm)
3. Invalidate all sessions (users must re-login)
4. Update service bindings in dependent services
5. Update HTTP clients to use new endpoints

## Contributing

1. Follow Unix philosophy: do one thing well
2. Maintain 80%+ test coverage
3. Document all RPC methods and HTTP endpoints
4. Use TypeScript strict mode
5. Follow code style (Prettier with printWidth: 160)

## License

Internal use only - Proprietary

## Support

For issues or questions, create an issue in the dot-do/workers repository.
