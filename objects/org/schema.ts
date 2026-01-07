/**
 * org.do - Database schema for organization state
 *
 * This schema defines the core tables for multi-tenant organization management:
 * - Organizations (settings, configuration, metadata)
 * - Members (users within organizations)
 * - Roles (permission groups)
 * - SSO/SAML connections
 * - Billing/subscriptions
 * - Audit logs
 */

import { sqliteTable, text, integer, blob, index, uniqueIndex } from 'drizzle-orm/sqlite-core'

/**
 * Organizations table - the tenant root
 */
export const organizations = sqliteTable('organizations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  logoUrl: text('logo_url'),
  domain: text('domain'),

  // Settings stored as JSON
  settings: text('settings', { mode: 'json' }).$type<OrganizationSettings>(),

  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

/**
 * Members table - users within an organization
 */
export const members = sqliteTable('members', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(), // External user ID (from Better Auth / WorkOS)
  email: text('email').notNull(),
  name: text('name'),
  avatarUrl: text('avatar_url'),

  // Role assignment
  roleId: text('role_id').references(() => roles.id),

  // Status
  status: text('status', { enum: ['active', 'invited', 'suspended', 'deactivated'] }).default('active'),
  invitedAt: integer('invited_at', { mode: 'timestamp' }),
  joinedAt: integer('joined_at', { mode: 'timestamp' }),

  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, (table) => [
  uniqueIndex('members_org_user_idx').on(table.organizationId, table.userId),
  index('members_org_idx').on(table.organizationId),
  index('members_email_idx').on(table.email),
])

/**
 * Roles table - permission groups
 */
export const roles = sqliteTable('roles', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),

  // Permissions stored as JSON array
  permissions: text('permissions', { mode: 'json' }).$type<string[]>().default([]),

  // Built-in roles cannot be deleted
  isBuiltIn: integer('is_built_in', { mode: 'boolean' }).default(false),

  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, (table) => [
  uniqueIndex('roles_org_name_idx').on(table.organizationId, table.name),
  index('roles_org_idx').on(table.organizationId),
])

/**
 * SSO Connections table - SAML/OIDC configurations
 */
export const ssoConnections = sqliteTable('sso_connections', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),

  // Connection type and status
  type: text('type', { enum: ['saml', 'oidc', 'oauth'] }).notNull(),
  provider: text('provider'), // e.g., 'okta', 'azure-ad', 'google'
  status: text('status', { enum: ['active', 'inactive', 'pending'] }).default('pending'),

  // Configuration (encrypted in production)
  config: text('config', { mode: 'json' }).$type<SSOConfig>(),

  // Domain for automatic SSO routing
  domains: text('domains', { mode: 'json' }).$type<string[]>().default([]),

  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, (table) => [
  index('sso_org_idx').on(table.organizationId),
])

/**
 * Subscriptions table - billing and plan state
 */
export const subscriptions = sqliteTable('subscriptions', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),

  // External billing IDs (Stripe)
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),

  // Plan details
  plan: text('plan', { enum: ['free', 'starter', 'pro', 'enterprise'] }).default('free'),
  status: text('status', { enum: ['active', 'trialing', 'past_due', 'canceled', 'unpaid'] }).default('active'),

  // Limits and usage
  seats: integer('seats').default(5),
  seatsUsed: integer('seats_used').default(0),

  // Billing cycle
  currentPeriodStart: integer('current_period_start', { mode: 'timestamp' }),
  currentPeriodEnd: integer('current_period_end', { mode: 'timestamp' }),
  trialEnd: integer('trial_end', { mode: 'timestamp' }),
  cancelAt: integer('cancel_at', { mode: 'timestamp' }),

  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, (table) => [
  uniqueIndex('subscriptions_org_idx').on(table.organizationId),
  index('subscriptions_stripe_customer_idx').on(table.stripeCustomerId),
])

/**
 * Audit Logs table - immutable event stream
 */
export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),

  // Actor (who did it)
  actorId: text('actor_id'), // User ID or 'system'
  actorType: text('actor_type', { enum: ['user', 'api_key', 'system', 'webhook'] }).default('user'),
  actorEmail: text('actor_email'),
  actorIp: text('actor_ip'),

  // Action details
  action: text('action').notNull(), // e.g., 'member.invited', 'role.created', 'settings.updated'
  resource: text('resource'), // e.g., 'member', 'role', 'settings'
  resourceId: text('resource_id'),

  // Change details stored as JSON
  changes: text('changes', { mode: 'json' }).$type<AuditChanges>(),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),

  // Timestamp (immutable, no updated_at)
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, (table) => [
  index('audit_org_idx').on(table.organizationId),
  index('audit_actor_idx').on(table.actorId),
  index('audit_action_idx').on(table.action),
  index('audit_created_idx').on(table.createdAt),
])

/**
 * API Keys table - for programmatic access
 */
export const apiKeys = sqliteTable('api_keys', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),

  // Key details
  name: text('name').notNull(),
  keyHash: text('key_hash').notNull(), // SHA-256 of the key
  keyPrefix: text('key_prefix').notNull(), // First 8 chars for identification

  // Permissions
  permissions: text('permissions', { mode: 'json' }).$type<string[]>().default([]),

  // Expiration and status
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  lastUsedAt: integer('last_used_at', { mode: 'timestamp' }),
  revokedAt: integer('revoked_at', { mode: 'timestamp' }),

  // Created by
  createdBy: text('created_by'),

  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, (table) => [
  index('api_keys_org_idx').on(table.organizationId),
  uniqueIndex('api_keys_hash_idx').on(table.keyHash),
])

// Type definitions

export interface OrganizationSettings {
  allowEmailSignup?: boolean
  requireSso?: boolean
  defaultRole?: string
  allowedDomains?: string[]
  features?: Record<string, boolean>
  branding?: {
    primaryColor?: string
    logoUrl?: string
    faviconUrl?: string
  }
}

export interface SSOConfig {
  // SAML
  entityId?: string
  ssoUrl?: string
  certificate?: string

  // OIDC
  clientId?: string
  clientSecret?: string
  issuer?: string
  authorizationUrl?: string
  tokenUrl?: string
  userInfoUrl?: string

  // Common
  attributeMapping?: Record<string, string>
}

export interface AuditChanges {
  before?: Record<string, unknown>
  after?: Record<string, unknown>
}

// Export all tables for Drizzle
export const schema = {
  organizations,
  members,
  roles,
  ssoConnections,
  subscriptions,
  auditLogs,
  apiKeys,
}
