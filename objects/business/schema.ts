/**
 * business.do - Database schema
 *
 * Drizzle ORM schema for business entity management
 */

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

/**
 * Core business entity
 */
export const businesses = sqliteTable('businesses', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  logoUrl: text('logo_url'),
  website: text('website'),
  industry: text('industry'),
  stage: text('stage').default('idea'), // idea, mvp, growth, scale, exit
  status: text('status').default('active'), // active, paused, archived
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  archivedAt: integer('archived_at', { mode: 'timestamp' }),
})

/**
 * Team members with roles
 */
export const teamMembers = sqliteTable('team_members', {
  id: text('id').primaryKey(),
  businessId: text('business_id').notNull().references(() => businesses.id),
  userId: text('user_id').notNull(),
  email: text('email').notNull(),
  name: text('name'),
  role: text('role').default('member'), // owner, admin, member, viewer
  title: text('title'), // CEO, CTO, etc.
  department: text('department'),
  invitedAt: integer('invited_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  joinedAt: integer('joined_at', { mode: 'timestamp' }),
  removedAt: integer('removed_at', { mode: 'timestamp' }),
})

/**
 * Revenue and metrics tracking
 */
export const metrics = sqliteTable('metrics', {
  id: text('id').primaryKey(),
  businessId: text('business_id').notNull().references(() => businesses.id),
  period: text('period').notNull(), // YYYY-MM format
  mrr: real('mrr').default(0), // Monthly Recurring Revenue
  arr: real('arr').default(0), // Annual Recurring Revenue
  revenue: real('revenue').default(0),
  costs: real('costs').default(0),
  customers: integer('customers').default(0),
  activeUsers: integer('active_users').default(0),
  churnRate: real('churn_rate'),
  ltv: real('ltv'), // Lifetime Value
  cac: real('cac'), // Customer Acquisition Cost
  burnRate: real('burn_rate'),
  runway: integer('runway'), // months
  customMetrics: text('custom_metrics', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

/**
 * Subscription and billing status
 */
export const subscriptions = sqliteTable('subscriptions', {
  id: text('id').primaryKey(),
  businessId: text('business_id').notNull().references(() => businesses.id),
  plan: text('plan').default('free'), // free, starter, growth, enterprise
  status: text('status').default('active'), // active, past_due, canceled, trialing
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  currentPeriodStart: integer('current_period_start', { mode: 'timestamp' }),
  currentPeriodEnd: integer('current_period_end', { mode: 'timestamp' }),
  cancelAtPeriodEnd: integer('cancel_at_period_end', { mode: 'boolean' }).default(false),
  trialEnd: integer('trial_end', { mode: 'timestamp' }),
  seats: integer('seats').default(1),
  usedSeats: integer('used_seats').default(1),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

/**
 * Business settings and configuration
 */
export const settings = sqliteTable('settings', {
  id: text('id').primaryKey(),
  businessId: text('business_id').notNull().references(() => businesses.id),
  key: text('key').notNull(),
  value: text('value', { mode: 'json' }),
  category: text('category').default('general'), // general, billing, notifications, integrations
  isSecret: integer('is_secret', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

/**
 * Activity log for audit trail
 */
export const activityLog = sqliteTable('activity_log', {
  id: text('id').primaryKey(),
  businessId: text('business_id').notNull().references(() => businesses.id),
  actorId: text('actor_id'), // user or system
  actorType: text('actor_type').default('user'), // user, system, ai
  action: text('action').notNull(),
  resource: text('resource').notNull(),
  resourceId: text('resource_id'),
  metadata: text('metadata', { mode: 'json' }),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})
