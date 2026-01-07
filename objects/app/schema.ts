/**
 * app.do - Database schema
 *
 * Drizzle ORM schema for app management including users, preferences,
 * feature flags, analytics, and multi-tenant state.
 */

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

/**
 * User profiles - the core identity within an app
 */
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  appId: text('app_id').notNull(),
  externalId: text('external_id'), // ID from auth provider (WorkOS, etc.)
  email: text('email').notNull(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  role: text('role').default('user'), // user, admin, owner
  status: text('status').default('active'), // active, suspended, deleted
  metadata: text('metadata', { mode: 'json' }),
  lastLoginAt: integer('last_login_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
})

/**
 * User preferences - per-user settings
 */
export const preferences = sqliteTable('preferences', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  key: text('key').notNull(),
  value: text('value', { mode: 'json' }),
  category: text('category').default('general'), // general, notifications, privacy, display
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

/**
 * User sessions - active authentication sessions
 */
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  token: text('token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  deviceType: text('device_type'), // desktop, mobile, tablet
  location: text('location'),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  lastActiveAt: integer('last_active_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  revokedAt: integer('revoked_at', { mode: 'timestamp' }),
})

/**
 * App configuration - global app settings
 */
export const config = sqliteTable('config', {
  id: text('id').primaryKey(),
  appId: text('app_id').notNull(),
  key: text('key').notNull(),
  value: text('value', { mode: 'json' }),
  category: text('category').default('general'), // general, auth, billing, integrations, limits
  description: text('description'),
  isSecret: integer('is_secret', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

/**
 * Feature flags - control feature rollout
 */
export const featureFlags = sqliteTable('feature_flags', {
  id: text('id').primaryKey(),
  appId: text('app_id').notNull(),
  key: text('key').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  enabled: integer('enabled', { mode: 'boolean' }).default(false),
  rolloutPercentage: integer('rollout_percentage').default(0), // 0-100
  targetUserIds: text('target_user_ids', { mode: 'json' }), // specific users
  targetRoles: text('target_roles', { mode: 'json' }), // specific roles
  targetTenants: text('target_tenants', { mode: 'json' }), // specific tenants
  rules: text('rules', { mode: 'json' }), // advanced targeting rules
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

/**
 * Analytics events - track user behavior
 */
export const analyticsEvents = sqliteTable('analytics_events', {
  id: text('id').primaryKey(),
  appId: text('app_id').notNull(),
  userId: text('user_id').references(() => users.id),
  sessionId: text('session_id'),
  event: text('event').notNull(),
  category: text('category'), // navigation, engagement, conversion, error
  properties: text('properties', { mode: 'json' }),
  timestamp: integer('timestamp', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  referrer: text('referrer'),
  page: text('page'),
})

/**
 * Analytics metrics - aggregated metrics over time
 */
export const analyticsMetrics = sqliteTable('analytics_metrics', {
  id: text('id').primaryKey(),
  appId: text('app_id').notNull(),
  period: text('period').notNull(), // YYYY-MM-DD or YYYY-MM
  granularity: text('granularity').default('day'), // hour, day, week, month
  activeUsers: integer('active_users').default(0),
  newUsers: integer('new_users').default(0),
  sessions: integer('sessions').default(0),
  pageViews: integer('page_views').default(0),
  avgSessionDuration: real('avg_session_duration').default(0), // seconds
  bounceRate: real('bounce_rate').default(0),
  conversionRate: real('conversion_rate').default(0),
  customMetrics: text('custom_metrics', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

/**
 * Tenants - for multi-tenant apps
 */
export const tenants = sqliteTable('tenants', {
  id: text('id').primaryKey(),
  appId: text('app_id').notNull(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  domain: text('domain'), // custom domain
  logoUrl: text('logo_url'),
  plan: text('plan').default('free'), // free, starter, pro, enterprise
  status: text('status').default('active'), // active, suspended, deleted
  settings: text('settings', { mode: 'json' }),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
})

/**
 * Tenant membership - user to tenant relationship
 */
export const tenantMemberships = sqliteTable('tenant_memberships', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  userId: text('user_id').notNull().references(() => users.id),
  role: text('role').default('member'), // owner, admin, member, viewer
  invitedAt: integer('invited_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  joinedAt: integer('joined_at', { mode: 'timestamp' }),
  removedAt: integer('removed_at', { mode: 'timestamp' }),
})

/**
 * Activity log - audit trail for app events
 */
export const activityLog = sqliteTable('activity_log', {
  id: text('id').primaryKey(),
  appId: text('app_id').notNull(),
  tenantId: text('tenant_id'),
  userId: text('user_id'),
  actorType: text('actor_type').default('user'), // user, system, ai, api
  action: text('action').notNull(),
  resource: text('resource').notNull(),
  resourceId: text('resource_id'),
  metadata: text('metadata', { mode: 'json' }),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})
