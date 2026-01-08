# org.ai

**Ship enterprise features today. Close enterprise deals tomorrow.**

```bash
npm install org.ai
```

## Quick Start

```typescript
// Workers - import env adapter first
import 'rpc.do/env'
import { org } from 'org.ai'

// Or use the factory for custom config
import { Org } from 'org.ai'
const org = Org({ baseURL: 'https://custom.example.com' })
```

---

## You're Losing Enterprise Deals You Should Be Winning

Your product is ready. Enterprise customers are knocking. But their security questionnaires keep coming back with the same blockers:

- "Do you support SAML SSO?"
- "How do you handle SCIM provisioning?"
- "Where's your audit log?"
- "What's your SOC 2 story?"

You know what happens next. Weeks of integration work. Months of security reviews. Meanwhile, your competitor with "Enterprise SSO" on their features page closes the deal.

**Enterprise auth shouldn't take 6 months to implement.**

## Meet Your Enterprise Auth Co-Pilot

```typescript
import { org } from 'org.ai'

// Enterprise SSO in 3 lines
const authUrl = await org.sso.getAuthorizationUrl({
  organization: 'acme-corp',
  redirectUri: 'https://app.example.com/callback'
})

// Their employees sign in with Okta, Azure AD, Google Workspace
// You get a verified user. They get seamless access.
const { profile, token } = await org.sso.getProfile(code)
```

**org.ai** gives you everything enterprises demand:
- SAML, OIDC, and OAuth SSO out of the box
- SCIM user provisioning
- Secure secrets vault for customer API keys
- Audit-ready user management
- All powered by WorkOS

## Enterprise-Ready in 3 Steps

### 1. Add SSO to Your Login

```typescript
import { org } from 'org.ai'

// Generate SSO link for any enterprise customer
const loginUrl = await org.sso.getAuthorizationUrl({
  organization: 'org_acme',
  redirectUri: 'https://yourapp.com/auth/callback',
  state: 'csrf_token_here'
})

// Redirect user to their identity provider
// They sign in with Okta, Azure AD, OneLogin, etc.
```

### 2. Handle the Callback

```typescript
// Exchange the code for user profile
const { profile, token } = await org.sso.getProfile(authCode)

console.log(profile.email)          // john@acme.com
console.log(profile.organizationId) // org_acme
console.log(profile.connectionType) // 'SAML'

// Create session, grant access, you're done
```

### 3. Manage Their Organization

```typescript
// Create organizations for your customers
const acme = await org.organizations.create({
  name: 'Acme Corporation',
  domains: ['acme.com', 'acme.io']
})

// Provision users (or let SCIM do it automatically)
await org.users.create(acme.id, {
  email: 'cto@acme.com',
  firstName: 'Sarah',
  lastName: 'Chen'
})

// Store their API keys securely
await org.vault.store(acme.id, 'OPENAI_KEY', 'sk-...')
```

## Before and After

**Without org.ai:**
- 3-6 months implementing SAML from scratch
- Custom code for every identity provider
- Building your own user provisioning
- Security questionnaires full of red flags
- Losing deals to "we need SSO" objections
- Enterprise customers going to competitors

**With org.ai:**
- SSO live in an afternoon
- Every major IdP supported automatically
- SCIM provisioning built in
- Check every security checkbox
- "Yes, we support enterprise SSO"
- Close the deals you've been losing

## Everything Enterprises Demand

### Single Sign-On

Support Okta, Azure AD, Google Workspace, OneLogin, and any SAML 2.0 or OIDC provider:

```typescript
// SSO just works, regardless of their identity provider
const authUrl = await org.sso.getAuthorizationUrl({
  organization: 'org_123',
  redirectUri: 'https://app.example.com/callback',
  state: crypto.randomUUID()
})

// Get verified user profile after authentication
const { profile, token } = await org.sso.getProfile(code)
// profile.connectionType: 'SAML' | 'OIDC' | 'OAuth'
```

### Secure Vault

Store your customers' secrets (API keys, credentials) with enterprise-grade encryption:

```typescript
// Store customer API keys securely
await org.vault.store('org_123', 'STRIPE_KEY', 'sk_live_...')
await org.vault.store('org_123', 'OPENAI_KEY', 'sk-...')

// Retrieve when needed
const stripeKey = await org.vault.get('org_123', 'STRIPE_KEY')

// Audit what's stored
const keys = await org.vault.list('org_123')
// ['STRIPE_KEY', 'OPENAI_KEY']
```

### User Management

Full control over organization users with roles and permissions:

```typescript
// Create users
const user = await org.users.create('org_123', {
  email: 'admin@acme.com',
  firstName: 'Alex',
  lastName: 'Kim'
})

// List organization members
const team = await org.users.list('org_123')

// User comes with organization context
console.log(user.organizationId) // org_123
console.log(user.roles)          // ['admin']
```

### Organization Management

Multi-tenant by design:

```typescript
// Create customer organizations
const org = await org.organizations.create({
  name: 'Acme Inc',
  domains: ['acme.com']
})

// Domain verification means only @acme.com can join
// No more unauthorized access

// List all your enterprise customers
const enterprises = await org.organizations.list()
```

## Error Handling

Handle authentication errors gracefully with typed exceptions:

```typescript
import { org } from 'org.ai'
import { RPCError } from 'rpc.do'

try {
  const { profile } = await org.sso.getProfile(authCode)
} catch (error) {
  if (error instanceof RPCError) {
    switch (error.code) {
      case 400:
        console.error('Invalid auth code - may be expired')
        // Redirect user to login again
        break
      case 401:
        console.error('SSO configuration invalid')
        break
      case 404:
        console.error('Organization not found')
        break
      default:
        console.error(`Auth error ${error.code}: ${error.message}`)
    }
  }
  throw error
}
```

### Common Error Codes

| Code | Meaning | What to Do |
|------|---------|------------|
| 400 | Invalid request | Auth code expired or malformed - restart flow |
| 401 | Authentication failed | Check API key and SSO configuration |
| 403 | Access denied | User not allowed in this organization |
| 404 | Resource not found | Organization or user doesn't exist |
| 409 | Conflict | User already exists with different IdP |
| 422 | Validation failed | Domain not verified for organization |
| 429 | Rate limited | Wait and retry with backoff |

### SSO Error Recovery

```typescript
import { org } from 'org.ai'
import { RPCError } from 'rpc.do'

async function handleSSOCallback(code: string, state: string) {
  try {
    const { profile, token } = await org.sso.getProfile(code)
    return { success: true, profile, token }
  } catch (error) {
    if (error instanceof RPCError) {
      if (error.code === 400) {
        // Auth code expired - redirect to login
        return { success: false, redirect: '/login', reason: 'expired' }
      }
      if (error.code === 403) {
        // User not authorized for this org
        return { success: false, redirect: '/unauthorized', reason: 'forbidden' }
      }
    }
    throw error
  }
}
```

### Vault Operations with Fallback

```typescript
import { org } from 'org.ai'
import { RPCError } from 'rpc.do'

async function getSecret(orgId: string, key: string, fallback?: string) {
  try {
    return await org.vault.get(orgId, key)
  } catch (error) {
    if (error instanceof RPCError && error.code === 404) {
      if (fallback !== undefined) {
        console.warn(`Secret ${key} not found, using fallback`)
        return fallback
      }
    }
    throw error
  }
}
```

## Configuration

```typescript
// Workers - import env adapter for automatic env resolution
import 'rpc.do/env'
import { org } from 'org.ai'

// Or use factory with custom config
import { Org } from 'org.ai'
const customOrg = Org({
  baseURL: 'https://custom.example.com'
})
// API key resolved automatically from ORG_API_KEY or DO_API_KEY
```

Set `ORG_API_KEY` or `DO_API_KEY` in your environment.

## TypeScript First

Full type safety for everything:

```typescript
import type {
  Organization,
  User,
  SSOOptions,
  SSOProfile,
  OrgClient,
  ClientOptions
} from 'org.ai'
```

## Stop Losing Enterprise Deals

Every day without enterprise SSO is a deal going to your competitor.

Every security questionnaire with gaps is a "no" waiting to happen.

Every enterprise customer asking "do you support SAML?" is revenue slipping away.

**You can fix this today.**

```bash
npm install org.ai
```

[Start closing enterprise deals at org.ai](https://org.ai)

---

Part of the [workers.do](https://workers.do) platform.

MIT License
