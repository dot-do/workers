# Azure Integration Worker

Complete OAuth 2.0 integration with Microsoft Azure/Entra ID, providing access to Microsoft Graph API and Azure Resource Manager.

## Features

- ✅ **OAuth 2.0 with PKCE** - Secure authorization code flow
- ✅ **Multi-Tenant Support** - Single-tenant and multi-tenant applications
- ✅ **Token Management** - Automatic refresh with 90-day storage
- ✅ **Microsoft Graph API** - User info, mail, calendar, files
- ✅ **Azure Resource Manager** - Subscriptions, resource groups, resources
- ✅ **RPC Interface** - Service-to-service calls
- ✅ **HTTP API** - External REST endpoints
- ✅ **MCP Integration** - AI agent tools (coming soon)

## Architecture

```
User Browser
     │
     ├─> GET /connect?user_id=123
     │       ↓
     │   Azure Worker (generates PKCE + state)
     │       ↓
     ├─> Redirect to Microsoft Entra ID
     │       ↓
     │   User consents to permissions
     │       ↓
     ├─> Redirect to /callback?code=xxx&state=yyy
     │       ↓
     │   Azure Worker (exchanges code for tokens)
     │       ↓
     │   Store tokens in KV + DB
     │       ↓
     └─> Success page

Later Requests:
     │
     ├─> RPC: env.AZURE.getUser({ userId })
     │       ↓
     │   Azure Worker (loads tokens from KV)
     │       ↓
     │   Auto-refresh if expiring (< 5min)
     │       ↓
     │   Call Microsoft Graph API
     │       ↓
     └─> Return user info
```

## Setup

### 1. Register Application in Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Microsoft Entra ID** → **App registrations**
3. Click **+ New registration**
4. Fill in:
   - **Name**: "Your App Name"
   - **Supported account types**:
     - Single tenant (your organization only)
     - Multi-tenant (any organization)
     - Multi-tenant + personal accounts
   - **Redirect URI**: `https://azure.do/callback` (or your domain)
5. Click **Register**

### 2. Create Client Secret

1. In your app registration, go to **Certificates & secrets**
2. Click **+ New client secret**
3. Enter description and expiration (12 months recommended)
4. Click **Add**
5. **COPY THE SECRET VALUE IMMEDIATELY** (you won't see it again!)

### 3. Configure API Permissions

1. Go to **API permissions**
2. Click **+ Add a permission**
3. Select **Microsoft Graph** → **Delegated permissions**
4. Add permissions:
   - `User.Read` - Read user profile
   - `Mail.Read` - Read user mail
   - `Calendars.Read` - Read user calendar
   - `Files.Read` - Read user files
5. Select **Azure Service Management** → **Delegated permissions**
6. Add permission:
   - `user_impersonation` - Access Azure Resource Manager
7. Click **Grant admin consent** (if required)

### 4. Configure Environment Variables

Add to `.dev.vars`:

```bash
AZURE_CLIENT_ID=12345678-1234-1234-1234-123456789012
AZURE_CLIENT_SECRET=your-secret-value
AZURE_TENANT_ID=optional-tenant-id  # Optional: for single-tenant apps
AZURE_REDIRECT_URI=https://azure.do/callback
```

### 5. Deploy Worker

```bash
cd workers/azure
pnpm install
pnpm deploy
```

## Usage

### RPC Interface (Service-to-Service)

```typescript
// Connect user account
const result = await env.AZURE.connect({
  userId: 'user_123',
  code: 'authorization_code_from_callback',
  codeVerifier: 'pkce_code_verifier',
  tenantId: 'optional-tenant-id', // Optional: for multi-tenant apps
})

// Get user profile
const user = await env.AZURE.getUser({
  userId: 'user_123',
})

// List Azure subscriptions
const subscriptions = await env.AZURE.listSubscriptions({
  userId: 'user_123',
})

// List resource groups
const resourceGroups = await env.AZURE.listResourceGroups({
  userId: 'user_123',
  subscriptionId: 'sub_456',
})

// List resources
const resources = await env.AZURE.listResources({
  userId: 'user_123',
  subscriptionId: 'sub_456',
  resourceGroupName: 'my-resource-group', // Optional
})

// Get email messages
const mail = await env.AZURE.getMail({
  userId: 'user_123',
  top: 10,
  skip: 0,
  filter: "isRead eq false",
})

// Get calendar events
const events = await env.AZURE.getCalendarEvents({
  userId: 'user_123',
  startDateTime: '2025-10-04T00:00:00Z',
  endDateTime: '2025-10-11T23:59:59Z',
})

// Disconnect account
await env.AZURE.disconnect({
  userId: 'user_123',
})
```

### HTTP API (REST)

#### Start OAuth Flow

```bash
GET /connect?user_id=123&tenant_id=optional-tenant-id

Response:
{
  "auth_url": "https://login.microsoftonline.com/...",
  "state": "random-uuid"
}

# Redirect user to auth_url
```

#### OAuth Callback

```bash
GET /callback?code=xxx&state=yyy

# Automatically exchanges code for tokens and stores connection
# Shows success page to user
```

#### Get User Info

```bash
GET /user?user_id=123

Response:
{
  "id": "user_azure_id",
  "displayName": "John Doe",
  "mail": "john@example.com",
  "userPrincipalName": "john@company.onmicrosoft.com",
  ...
}
```

#### List Subscriptions

```bash
GET /subscriptions?user_id=123

Response:
{
  "subscriptions": [
    {
      "id": "/subscriptions/xxx",
      "subscriptionId": "xxx",
      "displayName": "Production",
      "state": "Enabled",
      "tenantId": "yyy"
    }
  ]
}
```

#### List Resource Groups

```bash
GET /subscriptions/xxx/resourceGroups?user_id=123

Response:
{
  "resourceGroups": [
    {
      "id": "/subscriptions/xxx/resourceGroups/my-rg",
      "name": "my-rg",
      "location": "eastus",
      "properties": {
        "provisioningState": "Succeeded"
      }
    }
  ]
}
```

#### List Resources

```bash
GET /subscriptions/xxx/resources?user_id=123&resource_group=my-rg

Response:
{
  "resources": [
    {
      "id": "/subscriptions/xxx/resourceGroups/my-rg/providers/Microsoft.Web/sites/my-app",
      "name": "my-app",
      "type": "Microsoft.Web/sites",
      "location": "eastus"
    }
  ]
}
```

## Token Management

- **Access tokens** expire in **1 hour**
- **Refresh tokens** expire in **90 days** (rolling expiration)
- Tokens are automatically refreshed when they expire within 5 minutes
- Tokens are stored in:
  - **KV** for fast access (90-day TTL)
  - **Database** for persistence and backup

## Multi-Tenant Applications

For multi-tenant applications, users from different Azure AD tenants can connect:

1. Set **Supported account types** to multi-tenant in Azure Portal
2. Use `common` authority (default) or pass `tenantId` explicitly
3. Each tenant's admin must consent to permissions
4. Tokens are tenant-specific (stored with `tenantId`)

### Admin Consent URL

To get admin consent for a tenant:

```bash
https://login.microsoftonline.com/{tenant}/adminconsent
  ?client_id={client_id}
  &redirect_uri={redirect_uri}
```

## Security

### PKCE (Proof Key for Code Exchange)

All OAuth flows use PKCE for security:

1. Generate code verifier (random string)
2. Generate code challenge (SHA-256 hash, base64url encoded)
3. Send code challenge in authorization request
4. Send code verifier in token exchange
5. Azure validates the verifier matches the challenge

### State Parameter

All OAuth flows use state parameter for CSRF protection:

1. Generate random UUID as state
2. Store state with user ID and code verifier
3. Validate state matches on callback
4. Expire state after 10 minutes

### Token Storage

Tokens are encrypted at rest:

- **KV storage**: Tokens stored with 90-day expiration
- **Database**: Encrypted tokens for persistence
- **Memory**: Never stored in memory longer than request

## API Scopes

### Microsoft Graph Scopes

| Scope | Permission | Admin Consent |
|-------|------------|---------------|
| `openid` | OIDC authentication | No |
| `profile` | User profile | No |
| `email` | User email | No |
| `offline_access` | Refresh tokens | No |
| `User.Read` | Read user profile | No |
| `Mail.Read` | Read user mail | No |
| `Calendars.Read` | Read user calendar | No |
| `Files.Read` | Read user files | No |

### Azure Resource Manager Scopes

| Scope | Permission | Admin Consent |
|-------|------------|---------------|
| `https://management.azure.com/user_impersonation` | Access ARM as user | No |

## Rate Limits

### Microsoft Graph

- **Per-user limits**: Varies by endpoint
- **Per-app limits**: Varies by endpoint
- **Throttling**: HTTP 429 with `Retry-After` header

### Azure Resource Manager

- **Reads**: 12,000 per hour per subscription
- **Writes**: 1,200 per hour per subscription

## Error Handling

All errors are returned in consistent format:

```typescript
{
  success: false,
  error: "Error message"
}
```

Common errors:

- `invalid_grant` - Authorization code expired or invalid
- `invalid_client` - Client ID or secret incorrect
- `invalid_token` - Access token expired (auto-refreshed)
- `insufficient_privileges` - Missing required permissions
- `Authorization_RequestDenied` - User or admin denied consent

## Testing

```bash
# Run tests
pnpm test

# Run in watch mode
pnpm test -- --watch
```

## Documentation

- [Azure OAuth Guide](/notes/2025-10-04-azure-entra-id-oauth-setup-guide.md)
- [Master OAuth Plan](/notes/2025-10-04-master-oauth-integration-plan.md)
- [Microsoft Identity Platform Docs](https://learn.microsoft.com/en-us/entra/identity-platform/)
- [Microsoft Graph API Docs](https://learn.microsoft.com/en-us/graph/api/overview)

## Related Services

- **oauth** - WorkOS OAuth service
- **auth** - Platform authentication service
- **db** - Database service for persistence

## License

Private - Internal use only
