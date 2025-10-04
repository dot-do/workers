# OAuth Worker

Cloudflare Worker providing OAuth endpoints for WorkOS authentication integration with cli.do.

## Endpoints

### `GET /health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "oauth",
  "timestamp": "2025-10-04T12:00:00.000Z"
}
```

### `GET /authorize`

Get WorkOS authorization URL for browser-based OAuth flow.

**Query Parameters:**
- `redirect_uri` - OAuth callback URL (required)
- `code_challenge` - PKCE code challenge (required)
- `state` - CSRF protection state (required)
- `scope` - OAuth scopes (optional, defaults to 'openai profile email')

**Response:**
```json
{
  "auth_url": "https://api.workos.com/sso/authorize?client_id=xxx&..."
}
```

### `POST /token`

Exchange authorization code for access and refresh tokens.

**Request Body:**
```json
{
  "code": "authorization_code",
  "code_verifier": "pkce_verifier",
  "redirect_uri": "http://localhost:8888/callback"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "expires_in": 3600,
  "token_type": "Bearer",
  "scope": "openai profile email"
}
```

### `POST /refresh`

Refresh an expired access token.

**Request Body:**
```json
{
  "refresh_token": "eyJhbGc..."
}
```

**Response:**
```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "expires_in": 3600,
  "token_type": "Bearer",
  "scope": "openai profile email"
}
```

### `POST /device`

Request device authorization (device code flow).

**Request Body:**
```json
{
  "scope": "openai profile email"
}
```

**Response:**
```json
{
  "device_code": "device_xxx",
  "user_code": "ABCD-1234",
  "verification_uri": "https://workos.com/device",
  "verification_uri_complete": "https://workos.com/device?user_code=ABCD-1234",
  "expires_in": 900,
  "interval": 5
}
```

### `POST /device/token`

Poll for device authorization completion.

**Request Body:**
```json
{
  "device_code": "device_xxx"
}
```

**Success Response:**
```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "expires_in": 3600,
  "token_type": "Bearer",
  "scope": "openai profile email"
}
```

**Pending Response:** (HTTP 400)
```json
{
  "error": "authorization_pending"
}
```

### `GET /user`

Get current user information.

**Headers:**
- `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "id": "user_xxx",
  "email": "nathan@do.industries",
  "name": "Nathan Clevenger",
  "organization": "Do Industries",
  "organization_id": "org_xxx",
  "scopes": ["openai", "profile", "email"],
  "created_at": "2025-01-01T00:00:00Z"
}
```

## Deployment

### Set Secrets

```bash
# Set WorkOS credentials
wrangler secret put WORKOS_CLIENT_ID
wrangler secret put WORKOS_CLIENT_SECRET
```

### Deploy

```bash
pnpm deploy
```

### Test

```bash
# Health check
curl https://oauth.do/health

# Get auth URL
curl "https://oauth.do/authorize?redirect_uri=http://localhost:8888/callback&code_challenge=xyz&state=abc"
```

## Environment Variables

### Required Secrets

- `WORKOS_CLIENT_ID` - WorkOS OAuth client ID
- `WORKOS_CLIENT_SECRET` - WorkOS API key (client secret)

### Optional Vars (Defaults Provided)

- `WORKOS_AUTH_URL` - WorkOS authorization endpoint
- `WORKOS_TOKEN_URL` - WorkOS token endpoint
- `WORKOS_DEVICE_AUTH_URL` - WorkOS device authorization endpoint
- `WORKOS_USERINFO_URL` - WorkOS user info endpoint

## Architecture

This worker acts as a proxy between cli.do and WorkOS, handling:

1. **Security** - Keeps WorkOS credentials server-side (never exposed to client)
2. **Simplification** - Provides simple JSON API for OAuth flows
3. **Abstraction** - Decouples cli.do from WorkOS-specific implementation

## Integration

Used by:
- `cli.do` - Authentication CLI package
- `mdxe` - MDX development environment (via cli.do)
- `sdk.do` - Business-as-Code SDK (via cli.do)

## License

MIT
