# org.do

## **Enterprise Identity That Just Works**

> SSO, members, roles, and audit logs in one line of code.

---

## The Problem

You're shipping a B2B SaaS. Enterprise customers need SSO. Your team needs member management. Compliance needs audit logs. But here's what you're facing:

**SSO integration is a nightmare.** Every identity provider has different SAML quirks. Your authentication code has become a graveyard of edge cases.

**User management is scattered everywhere.** Members in Auth0. Roles in your database. Permissions checked with 15-line functions. One wrong query and the wrong user sees sensitive data.

**Audit logging is an afterthought.** "Who deleted that org?" is a question you dread. Your compliance audit is next month, and you're not ready.

**Seat-based billing is a house of cards.** Stripe says 10 seats. Your database says 12. Your support team is fielding angry emails.

You didn't start a company to debug identity infrastructure.

---

## The Solution

**org.do** gives you enterprise-grade organization management in a Durable Object. One import. One source of truth. Zero scattered state.

```typescript
import { Org } from 'org.do'

// Configure SSO in one call
await org.configureSso({
  type: 'saml',
  provider: 'okta',
  config: { entityId, ssoUrl, certificate },
  domains: ['acme.com']
})

// Manage members with automatic seat enforcement
await org.inviteMember({ email: 'alice@acme.com', roleId: 'admin' })

// Check permissions - one line, not fifteen
const canAccess = await org.hasPermission(memberId, 'billing:write')

// Audit logs? Already captured. Automatically.
const logs = await org.getAuditLogs({ action: 'member.*' })
```

Every action is logged. Every permission is checked at the source. Every seat is counted correctly.

---

## 3 Steps to Multi-Tenant Orgs

### Step 1: Install

```bash
npm install org.do
```

### Step 2: Export the Durable Object

```typescript
// worker.ts
import { Org } from 'org.do'

export { Org }

export default {
  async fetch(request: Request, env: Env) {
    const orgId = getOrgFromRequest(request)
    const stub = env.ORG.get(env.ORG.idFromName(orgId))
    return stub.fetch(request)
  }
}
```

### Step 3: Build Your App

```typescript
// Create organizations with default roles
const acme = await org.createOrg({
  name: 'Acme Corp',
  slug: 'acme',
  domain: 'acme.com'
})
// Owner, Admin, Member roles created automatically

// Invite users - seat limits enforced automatically
await org.inviteMember({ email: 'ceo@acme.com' })

// Enterprise SSO ready when they are
await org.configureSso({
  type: 'saml',
  provider: 'okta',
  config: ssoConfig
})
```

---

## Before and After

### Before: The Permission Check From Hell

```typescript
// 20 lines just to check one permission
async function canAccessBilling(userId: string, orgId: string) {
  const auth0User = await auth0.getUser(userId)
  const stripeCustomer = await stripe.customers.retrieve(customerId)
  const dbOrg = await db.organizations.findUnique({ where: { id: orgId } })
  const membership = await db.memberships.findFirst({
    where: { userId, organizationId: orgId }
  })
  const role = await db.roles.findUnique({ where: { id: membership.roleId } })

  const canAccess = role.permissions.includes('billing:read')
    && stripeCustomer.id === dbOrg.stripeCustomerId
    && auth0User.app_metadata.organizations?.includes(orgId)

  // Better log this... somewhere
  await auditLogger.log({
    action: 'billing.access_check',
    userId,
    orgId,
    result: canAccess
  })

  return canAccess
}
```

### After: One Line of Truth

```typescript
const canAccess = await org.hasPermission(memberId, 'billing:read')
// Audit log? Already recorded.
```

---

## Why org.do Wins

| Challenge | Without org.do | With org.do |
|-----------|----------------|-------------|
| **SSO Setup** | Weeks of SAML debugging | One method call |
| **Permission Checks** | Query 3+ tables | One line |
| **Audit Compliance** | Manual, inconsistent | Automatic, complete |
| **Seat Enforcement** | Custom logic everywhere | Built in |
| **Data Consistency** | Hope for the best | Guaranteed by Durable Object |
| **Time to Enterprise** | Months | Days |

---

## Complete API

### Organizations

```typescript
await org.createOrg({ name, slug, domain })    // Initialize with defaults
await org.getOrg()                              // Get details
await org.updateOrg({ name, settings })         // Update configuration
await org.deleteOrg()                           // Clean removal
```

### Members

```typescript
await org.inviteMember({ email, roleId })       // Invite (respects seat limits)
await org.acceptInvite(memberId, userId)        // Complete invitation
await org.listMembers({ status: 'active' })     // Query members
await org.updateMember(id, { roleId })          // Change role
await org.removeMember(memberId)                // Remove (frees seat)
```

### Roles and Permissions

```typescript
await org.createRole({ name, permissions })     // Custom roles
await org.hasPermission(memberId, 'billing:*')  // Check access
await org.listRoles()                           // All roles
```

### SSO/SAML

```typescript
await org.configureSso({ type, provider, config, domains })
await org.activateSso(connectionId)
await org.getSsoByDomain('acme.com')           // Route to right IdP
```

### Billing

```typescript
await org.getSubscription()                     // Current state
await org.updateSubscription({ plan, seats })   // From Stripe webhook
await org.canAddSeat()                          // Check before invite
await org.getPlanUsage()                        // Dashboard data
```

### Audit Logs

```typescript
await org.getAuditLogs({ action: 'member.*', since: lastWeek })
// Every action is logged automatically
```

### API Keys

```typescript
const { key } = await org.createApiKey({ name, permissions })
await org.validateApiKey(key)                   // Returns key details
await org.revokeApiKey(keyId)
```

---

## Part of workers.do

org.do integrates seamlessly with the workers.do platform:

- **org.ai** - Enterprise SSO via WorkOS
- **payments.do** - Stripe Connect billing
- **llm.do** - AI with organization-scoped usage

```typescript
// Inside workers.do platform
await this.env.ORG.createOrg({ name, slug })

// External SDK access
import { org } from 'org.do'
await org.createOrg({ name, slug })
```

---

## Start Now

Your enterprise customers are waiting. Your compliance audit is coming. Your team shouldn't be debugging identity infrastructure.

```bash
npm install org.do
```

**One Durable Object. One source of truth. Zero identity headaches.**

---

[Documentation](https://org.do) | [GitHub](https://github.com/dot-do/workers) | [Discord](https://discord.gg/dotdo)

MIT License
