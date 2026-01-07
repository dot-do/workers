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

## Configuration

Set your API key via environment variable:

```bash
export ORG_API_KEY=your_api_key
```

Or configure directly:

```typescript
import { Org } from 'org.ai'

const org = Org({
  apiKey: 'your_api_key'
})
```

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
