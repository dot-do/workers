# @dotdo/auth-plugin-admin

Better Auth admin plugin for user management in workers.do applications.

## Overview

This plugin wraps the [Better Auth Admin plugin](https://www.better-auth.com/docs/plugins/admin) to provide administrative user management capabilities. It enables platform administrators to manage users, sessions, and access controls.

## Installation

```bash
npm install @dotdo/auth-plugin-admin
# or
pnpm add @dotdo/auth-plugin-admin
```

## Usage

### With @dotdo/auth

```typescript
import { auth } from '@dotdo/auth'
import { admin } from '@dotdo/auth-plugin-admin'

const authInstance = auth({
  plugins: [
    admin({
      // Optional: admin role name
      adminRole: 'admin',
      // Optional: super admin role
      superAdminRole: 'super_admin',
      // Optional: require email for admin actions
      requireAdminEmail: true
    })
  ]
})
```

### User Management

```typescript
// List all users (admin only)
const users = await authInstance.api.admin.listUsers({
  limit: 50,
  offset: 0,
  search: 'alice'
})

// Get user details
const user = await authInstance.api.admin.getUser({
  userId: 'user_123'
})

// Update user
await authInstance.api.admin.updateUser({
  userId: 'user_123',
  data: {
    name: 'Alice Smith',
    role: 'member'
  }
})

// Ban user
await authInstance.api.admin.banUser({
  userId: 'user_123',
  reason: 'Violation of terms'
})

// Unban user
await authInstance.api.admin.unbanUser({
  userId: 'user_123'
})
```

### Session Management

```typescript
// List user sessions
const sessions = await authInstance.api.admin.listSessions({
  userId: 'user_123'
})

// Revoke all user sessions
await authInstance.api.admin.revokeAllSessions({
  userId: 'user_123'
})

// Revoke specific session
await authInstance.api.admin.revokeSession({
  sessionId: 'session_456'
})
```

### Impersonation

```typescript
// Impersonate a user (for debugging)
const impersonatedSession = await authInstance.api.admin.impersonateUser({
  userId: 'user_123',
  adminId: 'admin_456'
})

// Stop impersonation
await authInstance.api.admin.stopImpersonation()
```

## Key Features

- Complete user CRUD operations
- Session management and revocation
- User ban/unban functionality
- Admin impersonation for debugging
- Audit logging for admin actions
- Role-based admin permissions
- Integration with workers.do admin UI

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/admin/users` | List all users |
| GET | `/api/auth/admin/users/:id` | Get user details |
| PATCH | `/api/auth/admin/users/:id` | Update user |
| DELETE | `/api/auth/admin/users/:id` | Delete user |
| POST | `/api/auth/admin/users/:id/ban` | Ban user |
| POST | `/api/auth/admin/users/:id/unban` | Unban user |
| GET | `/api/auth/admin/sessions` | List sessions |
| DELETE | `/api/auth/admin/sessions/:id` | Revoke session |
| POST | `/api/auth/admin/impersonate` | Start impersonation |

## Admin UI Integration

This plugin integrates with the workers.do admin application:

```
my-site.workers.do/admin
  /users          # User management
  /sessions       # Session management
  /audit-log      # Admin action history
```

## Related

- [@dotdo/auth](../core) - Core Better Auth integration
- [Better Auth Admin Plugin](https://www.better-auth.com/docs/plugins/admin) - Official documentation
