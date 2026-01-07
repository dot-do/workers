# auth.do / id.do - Authentication & Identity Rewrite Scope

**Cloudflare Workers Edge Authentication Platform**

A comprehensive authentication and identity platform running entirely on Cloudflare Workers with Durable Objects, providing enterprise-grade security at the edge with zero cold starts.

---

## Executive Summary

This document scopes the development of `auth.do` (or `id.do`), a Cloudflare Workers rewrite of authentication platforms like Auth0, Clerk, Supabase Auth, WorkOS, Stytch, and FusionAuth. The platform will provide:

- **Zero-latency JWT validation** at the edge with cached JWKS
- **Stateful session management** using Durable Objects
- **Complete OAuth 2.1/OIDC provider** capabilities
- **Enterprise SSO** (SAML, OIDC) with directory sync (SCIM)
- **Modern passwordless auth** (magic links, passkeys/WebAuthn)
- **Multi-tenant B2B** support with per-organization settings

---

## Platform Research Summary

### 1. Auth0 (Okta)

**Core Value Proposition**: Enterprise-grade identity-as-a-service with comprehensive protocol support.

**Key Features**:
- Universal Login with customizable UX
- Token Vault for external API access (Google Calendar, GitHub, etc.)
- Multi-Resource Refresh Tokens (MRRT) - single refresh token for multiple APIs
- Auth for GenAI - identity for AI agents
- Organizations - up to 2M business customers per tenant
- Fine-Grained Authorization (FGA)
- FAPI 2 certification (Q2 2025)

**Edge Rewrite Opportunities**:
- JWT validation happens server-side - move to edge
- JWKS caching strategy (15-second max-age with stale-while-revalidate)
- Token introspection latency - eliminate with edge validation

**Sources**:
- [Auth0 Platform](https://auth0.com/)
- [Auth0 APIs Documentation](https://auth0.com/docs/api)
- [Auth0 July 2025 Updates](https://auth0.com/blog/july-2025-product-updates-new-security-features-global-regions-and-developer-previews/)

---

### 2. Clerk

**Core Value Proposition**: Developer-first authentication with React-native components.

**Key Features**:
- Pre-built UI components (`<SignIn />`, `<UserProfile />`)
- Short-lived JWTs (60 seconds) with automatic background refresh
- API Keys for machine authentication (2025)
- Organizations with RBAC
- Session tokens stored in `__session` cookie
- Native Android components (2025)

**Architecture Insights**:
- JWT verification via `clerkMiddleware()` at request start
- Public key available at `/.well-known/jwks.json`
- Cookie size limit: 4KB (browser limitation)
- Claims: `exp`, `nbf`, `azp` (authorized parties)

**Edge Rewrite Opportunities**:
- Middleware already edge-optimized - match or exceed
- Session sync across regions needs Durable Objects
- Cookie-based sessions ideal for edge

**Sources**:
- [Clerk Documentation](https://clerk.com/docs)
- [Clerk Session Tokens](https://clerk.com/docs/guides/sessions/session-tokens)
- [Clerk JWT Verification](https://clerk.com/docs/guides/sessions/manual-jwt-verification)

---

### 3. Supabase Auth

**Core Value Proposition**: Open-source auth tightly integrated with PostgreSQL and Row Level Security.

**Key Features**:
- OAuth 2.1 and OpenID Connect provider (new)
- Asymmetric keys (RS256 default, ECC/Ed25519 optional)
- Row Level Security (RLS) integration
- "Sign in with [Your App]" capability
- MCP authentication support
- Self-hostable (GoTrue-based)

**Architecture Insights**:
- JWTs include `user_id`, `role`, `client_id` claims
- RLS policies automatically apply to OAuth tokens
- Authorization code flow with PKCE

**Edge Rewrite Opportunities**:
- RLS-like authorization at edge with D1
- OAuth 2.1 server running on Workers
- JWT signing/verification with WebCrypto

**Sources**:
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase OAuth 2.1 Server](https://supabase.com/docs/guides/auth/oauth-server)
- [Supabase Auth GitHub](https://github.com/supabase/auth)

---

### 4. WorkOS

**Core Value Proposition**: Enterprise-ready features (SSO, SCIM) for B2B SaaS.

**Key Features**:
- Single Sign-On supporting SAML + OIDC with one API
- Directory Sync (SCIM) with real-time webhooks
- Admin Portal for self-service configuration
- Audit Logs with SIEM streaming
- Radar for fraud detection
- Vault for encryption key management
- Fine-grained authorization (Warrant acquisition)

**Pricing Model** (2025):
- SSO: $125/connection/month
- Directory Sync: $125/connection/month
- User Management: Free up to 1M MAU

**Edge Rewrite Opportunities**:
- SAML assertion validation at edge
- Directory sync webhooks via Workers
- Audit log streaming to R2

**Sources**:
- [WorkOS Documentation](https://workos.com/docs)
- [WorkOS SSO](https://workos.com/single-sign-on)
- [SCIM vs SSO Guide](https://workos.com/guide/scim-vs-sso)

---

### 5. Stytch

**Core Value Proposition**: Passwordless-first authentication with fraud detection.

**Key Features**:
- Magic links, OTPs, passkeys (FIDO2/WebAuthn)
- Native mobile biometrics
- 99.99% bot detection accuracy
- Device fingerprinting
- Multi-tenant RBAC
- Per-organization auth settings

**Edge Rewrite Opportunities**:
- Passwordless flows ideal for edge (stateless)
- Device fingerprinting at edge
- Rate limiting at edge

**Sources**:
- [Stytch Platform](https://stytch.com/)
- [Stytch Passwordless](https://stytch.com/solutions/passwordless)
- [Passwordless Authentication Guide](https://stytch.com/blog/what-is-passwordless-authentication/)

---

### 6. FusionAuth

**Core Value Proposition**: Self-hosted, downloadable CIAM with full API access.

**Key Features**:
- Completely self-hostable (Docker, K8s, bare metal)
- RESTful API for everything (UI built on same APIs)
- Community edition free for unlimited users
- No rate limits when self-hosted
- Machine-to-machine authentication
- SCIM provisioning

**Edge Rewrite Opportunities**:
- Full API surface to replicate
- Self-hosted model maps to DO isolation
- No rate limits = edge-native scaling

**Sources**:
- [FusionAuth Platform](https://fusionauth.io/)
- [FusionAuth Self-Hosting](https://fusionauth.io/platform/self-hosting)
- [FusionAuth API Overview](https://fusionauth.io/docs/apis/)

---

## Architecture Vision

```
auth.do / id.do
|
+-- Edge Layer (Cloudflare Workers)
|   |
|   +-- JWT Validation (cached JWKS, zero-latency)
|   +-- Session Cookie Management
|   +-- Rate Limiting (per IP, per user)
|   +-- Device Fingerprinting
|   +-- Geographic Restrictions
|
+-- Auth Durable Objects
|   |
|   +-- UserDO (per-user state)
|   |   +-- Sessions
|   |   +-- MFA enrollment
|   |   +-- Passkey credentials
|   |   +-- Login history
|   |
|   +-- OrganizationDO (per-org state)
|   |   +-- SSO connections
|   |   +-- Directory sync
|   |   +-- RBAC policies
|   |   +-- Audit logs
|   |
|   +-- SessionDO (per-session state)
|       +-- Refresh token rotation
|       +-- Device binding
|       +-- Activity tracking
|
+-- Storage Layer
|   |
|   +-- D1 (SQLite)
|   |   +-- Users table
|   |   +-- Sessions table
|   |   +-- Organizations table
|   |   +-- SAML/OIDC connections
|   |
|   +-- KV (Caching)
|   |   +-- JWKS cache
|   |   +-- Session cache
|   |   +-- Rate limit counters
|   |
|   +-- R2 (Object Storage)
|       +-- SAML certificates
|       +-- Audit log archives
|       +-- SCIM sync snapshots
|
+-- OAuth/OIDC Provider
|   |
|   +-- Authorization Server
|   +-- Token Endpoint
|   +-- Introspection Endpoint
|   +-- Revocation Endpoint
|   +-- JWKS Endpoint
|   +-- Discovery (.well-known/openid-configuration)
|
+-- Enterprise SSO
|   |
|   +-- SAML SP (Service Provider)
|   +-- OIDC Client
|   +-- IdP Metadata Parser
|   +-- Assertion Validation
|
+-- Directory Sync
|   |
|   +-- SCIM 2.0 Server
|   +-- Webhook Delivery
|   +-- Delta Sync
|
+-- Admin API
    |
    +-- User Management
    +-- Organization Management
    +-- Connection Management
    +-- Audit Log Queries
```

---

## Core Features Specification

### 1. JWT Validation at Edge (Zero Latency)

**Implementation**:
```typescript
// Using jose library with WebCrypto
import { jwtVerify, createRemoteJWKSet } from 'jose'

const JWKS = createRemoteJWKSet(new URL('https://auth.do/.well-known/jwks.json'))

// Cache JWKS in KV with stale-while-revalidate pattern
async function validateJWT(token: string, env: Env): Promise<JWTPayload> {
  // Try cached JWKS first
  const cachedJWKS = await env.KV.get('jwks', { type: 'json', cacheTtl: 60 })

  const { payload } = await jwtVerify(token, JWKS, {
    issuer: 'https://auth.do',
    audience: env.CLIENT_ID,
  })

  return payload
}
```

**JWKS Caching Strategy**:
- Primary cache: KV with 60-second TTL
- Background refresh: Stale-while-revalidate pattern
- Fallback: Direct fetch if cache miss
- Key rotation: Support multiple active keys

**Performance Target**: <5ms JWT validation at edge

---

### 2. Session Management with Durable Objects

**SessionDO Architecture**:
```typescript
export class SessionDO extends DurableObject {
  private session: SessionState | null = null

  async create(userId: string, deviceInfo: DeviceInfo): Promise<Session> {
    const sessionId = crypto.randomUUID()
    const refreshToken = generateSecureToken()

    this.session = {
      id: sessionId,
      userId,
      deviceInfo,
      refreshToken: await hashToken(refreshToken),
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      expiresAt: Date.now() + SESSION_TTL,
    }

    await this.ctx.storage.put('session', this.session)

    return {
      sessionId,
      accessToken: await this.generateAccessToken(),
      refreshToken,
      expiresIn: ACCESS_TOKEN_TTL,
    }
  }

  async refresh(refreshToken: string): Promise<Session> {
    // Validate refresh token
    // Rotate refresh token (single-use)
    // Generate new access token
    // Update last activity
  }

  async revoke(): Promise<void> {
    await this.ctx.storage.deleteAll()
    this.session = null
  }
}
```

**Session Consistency Across Regions**:
- Durable Objects provide single-writer guarantee
- Session state lives in one location (user's primary region)
- Access tokens validated at edge (stateless JWT)
- Refresh requires round-trip to session DO

---

### 3. OAuth 2.1 / OIDC Provider

**Endpoints**:
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/.well-known/openid-configuration` | GET | Discovery document |
| `/.well-known/jwks.json` | GET | JSON Web Key Set |
| `/authorize` | GET | Authorization endpoint |
| `/token` | POST | Token endpoint |
| `/userinfo` | GET | User info endpoint |
| `/introspect` | POST | Token introspection |
| `/revoke` | POST | Token revocation |

**Supported Flows**:
- Authorization Code with PKCE (recommended)
- Client Credentials (machine-to-machine)
- Refresh Token with rotation

**Token Types**:
- Access Token: Short-lived JWT (15 min - 1 hour)
- Refresh Token: Long-lived, single-use with rotation
- ID Token: OpenID Connect identity assertion

---

### 4. Enterprise SSO (SAML + OIDC)

**SAML Service Provider**:
```typescript
interface SAMLConnection {
  id: string
  organizationId: string
  idpMetadataUrl?: string
  idpMetadata?: string
  idpEntityId: string
  idpSsoUrl: string
  idpCertificate: string
  spEntityId: string
  spAcsUrl: string
  attributeMapping: Record<string, string>
}
```

**SAML Flow at Edge**:
1. User initiates login with organization domain
2. Worker generates AuthnRequest, redirects to IdP
3. IdP authenticates user, posts SAMLResponse to ACS
4. Worker validates signature, extracts assertions
5. Creates session, issues tokens

**OIDC Federation**:
- Support for Google, Microsoft, Okta as IdPs
- Dynamic client registration
- Standard claims mapping

---

### 5. Multi-Factor Authentication

**Supported Methods**:
| Method | Implementation | Storage |
|--------|----------------|---------|
| TOTP | RFC 6238 | Secret in UserDO |
| WebAuthn/Passkeys | FIDO2 | Credential in D1 |
| SMS OTP | External provider | Temporary in KV |
| Email OTP | SendGrid/Resend | Temporary in KV |
| Recovery Codes | One-time use | Hashed in UserDO |

**WebAuthn/Passkeys at Edge**:
```typescript
// Registration
async function registerPasskey(challenge: string, attestation: AttestationObject) {
  // Verify attestation using WebCrypto
  // Extract public key
  // Store credential in D1
}

// Authentication
async function verifyPasskey(challenge: string, assertion: AssertionObject) {
  // Retrieve credential from D1
  // Verify signature using stored public key
  // Update sign count
}
```

---

### 6. Directory Sync (SCIM 2.0)

**SCIM Endpoints**:
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/scim/v2/Users` | GET, POST | List/create users |
| `/scim/v2/Users/{id}` | GET, PUT, PATCH, DELETE | User operations |
| `/scim/v2/Groups` | GET, POST | List/create groups |
| `/scim/v2/Groups/{id}` | GET, PUT, PATCH, DELETE | Group operations |
| `/scim/v2/Schemas` | GET | Schema discovery |

**Webhook Events**:
- `user.created`, `user.updated`, `user.deleted`
- `group.created`, `group.updated`, `group.deleted`
- `membership.added`, `membership.removed`

---

## Security Considerations

### 1. Key Rotation

**JWKS Rotation Strategy**:
```typescript
interface JWKSRotation {
  currentKey: JWK       // Primary signing key
  nextKey?: JWK         // Pre-published for rotation
  previousKey?: JWK     // Grace period for existing tokens
  rotationSchedule: string  // Cron expression
}
```

- New key published 24 hours before activation
- Old key retained for token lifetime
- Automatic rotation with zero downtime

### 2. Brute Force Protection

**Rate Limiting Layers**:
```typescript
// Layer 1: Global rate limit (Cloudflare WAF)
// Layer 2: Per-IP rate limit (KV counters)
// Layer 3: Per-account rate limit (UserDO)

async function checkRateLimit(ip: string, userId?: string): Promise<boolean> {
  const ipKey = `ratelimit:ip:${ip}`
  const ipCount = await env.KV.get(ipKey, { type: 'json' }) || 0

  if (ipCount > IP_RATE_LIMIT) {
    return false // Block
  }

  await env.KV.put(ipKey, ipCount + 1, { expirationTtl: 60 })

  if (userId) {
    // Check per-user rate limit in UserDO
  }

  return true
}
```

**Account Lockout**:
- Progressive delays after failed attempts
- Lockout after N failures (configurable)
- CAPTCHA challenge on suspicious activity
- Breach detection integration (HaveIBeenPwned)

### 3. CSRF/XSS Prevention

**CSRF Protection**:
- State parameter in OAuth flows (stored in DO)
- SameSite=Strict cookies for sessions
- Origin header validation

**XSS Prevention**:
- HTTPOnly cookies for tokens
- Content-Security-Policy headers
- Input sanitization in UI

### 4. Audit Logging

**Logged Events**:
| Event | Data | Retention |
|-------|------|-----------|
| `auth.login.success` | userId, ip, device, method | 90 days |
| `auth.login.failure` | email, ip, reason | 30 days |
| `auth.logout` | userId, sessionId | 90 days |
| `auth.mfa.enrolled` | userId, method | Permanent |
| `auth.password.changed` | userId | Permanent |
| `auth.token.revoked` | userId, tokenId | 90 days |

**Storage**:
- Hot: D1 for recent events (30 days)
- Warm: R2 for archives (1 year)
- SIEM streaming: Webhooks to external systems

---

## Compliance Requirements

### SOC 2 Type II

**Requirements**:
- Access controls and authentication
- Encryption at rest and in transit
- Audit logging and monitoring
- Incident response procedures
- Vendor management

**Implementation**:
- Cloudflare provides infrastructure compliance
- auth.do provides application-level controls
- Audit logs exportable for auditors

### GDPR

**Requirements**:
- Right to access (data export)
- Right to erasure (account deletion)
- Data portability
- Consent management

**Implementation**:
- User data export API
- Hard delete capability
- Consent tracking in UserDO

### HIPAA (Optional)

**BAA Required**:
- Cloudflare Enterprise with BAA
- PHI never stored in auth system
- Audit logs for access tracking

---

## API Surface

### Authentication API

```typescript
interface AuthAPI {
  // User Authentication
  signup(email: string, password: string): Promise<Session>
  login(email: string, password: string): Promise<Session>
  loginWithMagicLink(email: string): Promise<void>
  loginWithPasskey(credential: Credential): Promise<Session>
  logout(): Promise<void>

  // Session Management
  refreshToken(refreshToken: string): Promise<Session>
  revokeSession(sessionId: string): Promise<void>
  listSessions(): Promise<Session[]>

  // MFA
  enrollTOTP(): Promise<TOTPEnrollment>
  verifyTOTP(code: string): Promise<void>
  enrollPasskey(): Promise<PasskeyEnrollment>

  // Password
  resetPassword(email: string): Promise<void>
  changePassword(current: string, newPassword: string): Promise<void>
}
```

### Management API

```typescript
interface ManagementAPI {
  // Users
  createUser(user: CreateUserInput): Promise<User>
  getUser(userId: string): Promise<User>
  updateUser(userId: string, updates: UpdateUserInput): Promise<User>
  deleteUser(userId: string): Promise<void>
  listUsers(filters?: UserFilters): Promise<PaginatedUsers>

  // Organizations
  createOrganization(org: CreateOrgInput): Promise<Organization>
  getOrganization(orgId: string): Promise<Organization>
  addMember(orgId: string, userId: string, role: string): Promise<void>
  removeMember(orgId: string, userId: string): Promise<void>

  // SSO Connections
  createSSOConnection(connection: SSOConnectionInput): Promise<SSOConnection>
  updateSSOConnection(id: string, updates: SSOConnectionInput): Promise<SSOConnection>
  deleteSSOConnection(id: string): Promise<void>

  // Directory Sync
  createDirectory(directory: DirectoryInput): Promise<Directory>
  syncDirectory(directoryId: string): Promise<SyncResult>
}
```

---

## SDK Design

### JavaScript/TypeScript SDK

```typescript
import { Auth } from 'auth.do'

// Initialize
const auth = Auth({
  domain: 'myapp.auth.do',
  clientId: 'xxx',
})

// Login
const session = await auth.login({
  email: 'user@example.com',
  password: 'secret',
})

// Access protected resources
const response = await fetch('/api/data', {
  headers: {
    Authorization: `Bearer ${session.accessToken}`,
  },
})

// Refresh token
const newSession = await auth.refreshToken()

// Logout
await auth.logout()
```

### Middleware Integration

```typescript
// Hono middleware
import { authMiddleware } from 'auth.do/hono'

app.use('/*', authMiddleware({
  publicPaths: ['/health', '/docs'],
  requireAuth: true,
}))

// Next.js middleware
import { withAuth } from 'auth.do/nextjs'

export default withAuth({
  publicPaths: ['/', '/login'],
})
```

---

## Implementation Phases

### Phase 1: Core Authentication (4-6 weeks)

- [ ] JWT signing/verification with WebCrypto
- [ ] JWKS endpoint with rotation
- [ ] Email/password authentication
- [ ] Session management (DO)
- [ ] Refresh token rotation
- [ ] Basic user management API

### Phase 2: OAuth/OIDC Provider (4-6 weeks)

- [ ] Authorization endpoint
- [ ] Token endpoint
- [ ] PKCE support
- [ ] OpenID Connect
- [ ] Discovery document
- [ ] Token introspection/revocation

### Phase 3: Passwordless (2-4 weeks)

- [ ] Magic link authentication
- [ ] Email OTP
- [ ] WebAuthn/Passkeys registration
- [ ] WebAuthn/Passkeys authentication

### Phase 4: Social Logins (2-3 weeks)

- [ ] Google OAuth
- [ ] GitHub OAuth
- [ ] Microsoft OAuth
- [ ] Apple Sign In
- [ ] Generic OIDC provider

### Phase 5: Enterprise SSO (4-6 weeks)

- [ ] SAML Service Provider
- [ ] OIDC Federation
- [ ] IdP metadata parsing
- [ ] Attribute mapping
- [ ] Just-in-time provisioning

### Phase 6: Directory Sync (3-4 weeks)

- [ ] SCIM 2.0 server
- [ ] Webhook delivery
- [ ] Delta sync
- [ ] Group membership

### Phase 7: Multi-Factor Authentication (2-3 weeks)

- [ ] TOTP enrollment/verification
- [ ] Recovery codes
- [ ] MFA enforcement policies
- [ ] Step-up authentication

### Phase 8: Admin & Compliance (3-4 weeks)

- [ ] Admin dashboard
- [ ] Audit logging
- [ ] Data export/deletion
- [ ] SIEM integration

---

## Competitive Positioning

| Feature | auth.do | Auth0 | Clerk | Supabase | WorkOS |
|---------|---------|-------|-------|----------|--------|
| Edge JWT Validation | Native | Proxy | Native | Proxy | Proxy |
| Session Storage | DO | Cloud | Cloud | Postgres | Cloud |
| Cold Start | None | ~100ms | ~50ms | ~200ms | ~100ms |
| Self-Host Option | Yes | No | No | Yes | No |
| Open Source | Yes | No | No | Yes | No |
| AI Agent Auth | Native | New | No | New | No |
| Pricing | Usage | Seat | MAU | Usage | Connection |

---

## Estimated Effort

| Phase | Effort | Priority |
|-------|--------|----------|
| Phase 1: Core Auth | 4-6 weeks | P0 |
| Phase 2: OAuth/OIDC | 4-6 weeks | P0 |
| Phase 3: Passwordless | 2-4 weeks | P1 |
| Phase 4: Social Logins | 2-3 weeks | P1 |
| Phase 5: Enterprise SSO | 4-6 weeks | P1 |
| Phase 6: Directory Sync | 3-4 weeks | P2 |
| Phase 7: MFA | 2-3 weeks | P1 |
| Phase 8: Admin | 3-4 weeks | P2 |

**Total: 24-36 weeks** for full feature parity

**MVP (Phase 1-2): 8-12 weeks** for core authentication platform

---

## Open Questions

1. **Domain Strategy**: Use `auth.do` or `id.do`? (Current codebase has `id.org.ai` for WorkOS integration)

2. **Key Management**: Should we integrate with Cloudflare's native key management or implement our own with KV/R2?

3. **Social Providers**: Which providers are priority? (Google, GitHub, Microsoft seem essential)

4. **SAML Complexity**: Build full SAML SP or recommend WorkOS/Auth0 for complex enterprise needs?

5. **Pricing Model**: Per-MAU (Clerk), per-connection (WorkOS), or pure usage-based?

6. **AI Agent Authentication**: How deep should Agent Token support go? (Currently implemented in WorkOSDO)

---

## References

### Primary Sources
- [Auth0 Platform](https://auth0.com/)
- [Clerk Documentation](https://clerk.com/docs)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [WorkOS Documentation](https://workos.com/docs)
- [Stytch Platform](https://stytch.com/)
- [FusionAuth Documentation](https://fusionauth.io/docs/)

### Edge Authentication
- [JWT Validation at Edge](https://securityboulevard.com/2025/11/how-to-validate-jwts-efficiently-at-the-edge-with-cloudflare-workers-and-vercel/)
- [Cloudflare Workers JWT](https://github.com/tsndr/cloudflare-worker-jwt)
- [jose library](https://www.npmjs.com/package/jose)

### Durable Objects Session Management
- [UserDO Authentication Pattern](https://github.com/acoyfellow/UserDO)
- [Durable Objects Sessions Demo](https://github.com/saibotsivad/cloudflare-durable-object-sessions)
- [MCP Agent Auth with DO](https://blog.cloudflare.com/building-ai-agents-with-mcp-authn-authz-and-durable-objects/)

### Standards
- [OAuth 2.1 Draft](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-12)
- [OpenID Connect](https://openid.net/connect/)
- [SAML 2.0](http://docs.oasis-open.org/security/saml/v2.0/)
- [SCIM 2.0](https://www.rfc-editor.org/rfc/rfc7644)
- [WebAuthn](https://www.w3.org/TR/webauthn/)
- [FIDO2/Passkeys](https://fidoalliance.org/passkeys/)
