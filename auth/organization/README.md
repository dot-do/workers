# @dotdo/auth-plugin-org

Better Auth organization plugin for multi-tenancy in workers.do applications.

## Overview

This plugin wraps the [Better Auth Organization plugin](https://www.better-auth.com/docs/plugins/organization) to provide multi-tenant support. Organizations allow grouping users, managing team access, and isolating data between tenants.

## Installation

```bash
npm install @dotdo/auth-plugin-org
# or
pnpm add @dotdo/auth-plugin-org
```

## Usage

### With @dotdo/auth

```typescript
import { auth } from '@dotdo/auth'
import { organization } from '@dotdo/auth-plugin-org'

const authInstance = auth({
  plugins: [
    organization({
      // Optional: allow users to create organizations
      allowUserCreation: true,
      // Optional: default role for new members
      defaultRole: 'member',
      // Optional: custom roles
      roles: ['owner', 'admin', 'member', 'viewer']
    })
  ]
})
```

### Creating Organizations

```typescript
// Server-side
const org = await authInstance.api.createOrganization({
  name: 'Acme Corp',
  slug: 'acme',
  ownerId: 'user_123'
})
```

### Managing Members

```typescript
// Invite a member
await authInstance.api.inviteMember({
  organizationId: org.id,
  email: 'alice@example.com',
  role: 'admin'
})

// List members
const members = await authInstance.api.listMembers({
  organizationId: org.id
})

// Update member role
await authInstance.api.updateMemberRole({
  organizationId: org.id,
  userId: 'user_456',
  role: 'member'
})
```

### Accessing Organization Context

```typescript
// In your API handlers
app.get('/api/data', async (c) => {
  const session = await authInstance.api.getSession(c.req)
  const orgId = session?.activeOrganizationId

  // Query data scoped to organization
  const data = await db.query('SELECT * FROM items WHERE org_id = ?', [orgId])
  return c.json(data)
})
```

## Key Features

- Multi-tenant data isolation
- Role-based access control (RBAC)
- Member invitations via email
- Organization switching for users in multiple orgs
- Automatic org context in sessions
- Integration with workers.do free-tier multi-tenancy

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/organization/create` | Create organization |
| GET | `/api/auth/organization/list` | List user's organizations |
| POST | `/api/auth/organization/invite` | Invite member |
| POST | `/api/auth/organization/switch` | Switch active organization |
| DELETE | `/api/auth/organization/remove-member` | Remove member |

## Database Schema

The plugin adds organization-related tables:

```typescript
// organizations table
{
  id: string,
  name: string,
  slug: string,
  createdAt: Date
}

// organization_members table
{
  id: string,
  organizationId: string,
  userId: string,
  role: string,
  createdAt: Date
}

// organization_invitations table
{
  id: string,
  organizationId: string,
  email: string,
  role: string,
  expiresAt: Date
}
```

## Related

- [@dotdo/auth](../core) - Core Better Auth integration
- [Better Auth Organization Plugin](https://www.better-auth.com/docs/plugins/organization) - Official documentation
