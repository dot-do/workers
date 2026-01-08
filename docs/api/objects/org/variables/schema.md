[**@dotdo/workers API Documentation v0.0.1**](../../../README.md)

***

[@dotdo/workers API Documentation](../../../modules.md) / [objects/org](../README.md) / schema

# Variable: schema

> `const` **schema**: `object`

Defined in: [objects/org/schema.ts:242](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/org/schema.ts#L242)

## Type Declaration

### organizations

> **organizations**: `SQLiteTableWithColumns`\<\{ \}\>

Organizations table - the tenant root

### members

> **members**: `SQLiteTableWithColumns`\<\{ \}\>

Members table - users within an organization

### roles

> **roles**: `SQLiteTableWithColumns`\<\{ \}\>

Roles table - permission groups

### ssoConnections

> **ssoConnections**: `SQLiteTableWithColumns`\<\{ \}\>

SSO Connections table - SAML/OIDC configurations

### subscriptions

> **subscriptions**: `SQLiteTableWithColumns`\<\{ \}\>

Subscriptions table - billing and plan state

### auditLogs

> **auditLogs**: `SQLiteTableWithColumns`\<\{ \}\>

Audit Logs table - immutable event stream

### apiKeys

> **apiKeys**: `SQLiteTableWithColumns`\<\{ \}\>

API Keys table - for programmatic access
