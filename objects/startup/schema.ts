/**
 * startup.do - Database schema
 *
 * Drizzle ORM schema for startup lifecycle management
 */

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

/**
 * Core startup entity
 */
export const startups = sqliteTable('startups', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  tagline: text('tagline'),
  description: text('description'),
  logoUrl: text('logo_url'),
  website: text('website'),
  industry: text('industry'),
  vertical: text('vertical'),
  stage: text('stage').default('idea'), // idea, pre-seed, seed, series-a, series-b, series-c, growth, exit
  status: text('status').default('active'), // active, stealth, paused, acquired, shutdown
  foundedAt: integer('founded_at', { mode: 'timestamp' }),
  launchedAt: integer('launched_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  archivedAt: integer('archived_at', { mode: 'timestamp' }),
})

/**
 * Founders and team members
 */
export const founders = sqliteTable('founders', {
  id: text('id').primaryKey(),
  startupId: text('startup_id').notNull().references(() => startups.id),
  userId: text('user_id'),
  email: text('email').notNull(),
  name: text('name').notNull(),
  title: text('title'), // CEO, CTO, COO, etc.
  role: text('role').default('founder'), // founder, co-founder, advisor, employee
  linkedin: text('linkedin'),
  twitter: text('twitter'),
  bio: text('bio'),
  equity: real('equity'), // percentage
  vesting: text('vesting', { mode: 'json' }), // { cliff, schedule, startDate }
  isLead: integer('is_lead', { mode: 'boolean' }).default(false),
  joinedAt: integer('joined_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  departedAt: integer('departed_at', { mode: 'timestamp' }),
})

/**
 * Funding rounds and investment history
 */
export const fundingRounds = sqliteTable('funding_rounds', {
  id: text('id').primaryKey(),
  startupId: text('startup_id').notNull().references(() => startups.id),
  type: text('type').notNull(), // pre-seed, seed, series-a, series-b, bridge, debt, grant
  status: text('status').default('planned'), // planned, raising, closed, failed
  targetAmount: real('target_amount'),
  raisedAmount: real('raised_amount'),
  valuation: real('valuation'), // pre-money valuation
  dilution: real('dilution'), // percentage
  leadInvestor: text('lead_investor'),
  termSheet: text('term_sheet', { mode: 'json' }),
  announcedAt: integer('announced_at', { mode: 'timestamp' }),
  closedAt: integer('closed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

/**
 * Investor relationships
 */
export const investors = sqliteTable('investors', {
  id: text('id').primaryKey(),
  startupId: text('startup_id').notNull().references(() => startups.id),
  roundId: text('round_id').references(() => fundingRounds.id),
  name: text('name').notNull(),
  type: text('type'), // angel, vc, strategic, family-office, accelerator
  firm: text('firm'),
  email: text('email'),
  phone: text('phone'),
  investedAmount: real('invested_amount'),
  ownership: real('ownership'), // percentage
  boardSeat: integer('board_seat', { mode: 'boolean' }).default(false),
  proRataRights: integer('pro_rata_rights', { mode: 'boolean' }).default(false),
  notes: text('notes'),
  relationship: text('relationship').default('active'), // prospect, active, former, passed
  lastContactAt: integer('last_contact_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

/**
 * Pitch decks and documents
 */
export const documents = sqliteTable('documents', {
  id: text('id').primaryKey(),
  startupId: text('startup_id').notNull().references(() => startups.id),
  type: text('type').notNull(), // pitch-deck, one-pager, financial-model, cap-table, term-sheet, safe, business-plan
  name: text('name').notNull(),
  version: text('version'),
  url: text('url'),
  r2Key: text('r2_key'),
  mimeType: text('mime_type'),
  size: integer('size'),
  isLatest: integer('is_latest', { mode: 'boolean' }).default(true),
  sharedWith: text('shared_with', { mode: 'json' }), // list of investor IDs or emails
  viewCount: integer('view_count').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

/**
 * Key metrics tracking (MRR, ARR, users, etc.)
 */
export const metrics = sqliteTable('metrics', {
  id: text('id').primaryKey(),
  startupId: text('startup_id').notNull().references(() => startups.id),
  period: text('period').notNull(), // YYYY-MM format
  mrr: real('mrr').default(0),
  arr: real('arr').default(0),
  revenue: real('revenue').default(0),
  gmv: real('gmv').default(0), // Gross Merchandise Value
  users: integer('users').default(0),
  activeUsers: integer('active_users').default(0),
  dau: integer('dau').default(0),
  mau: integer('mau').default(0),
  customers: integer('customers').default(0),
  paidCustomers: integer('paid_customers').default(0),
  churnRate: real('churn_rate'),
  nrr: real('nrr'), // Net Revenue Retention
  ltv: real('ltv'),
  cac: real('cac'),
  ltvCacRatio: real('ltv_cac_ratio'),
  burnRate: real('burn_rate'),
  runway: integer('runway'), // months
  growth: real('growth'), // MoM percentage
  customMetrics: text('custom_metrics', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

/**
 * Milestones and roadmap
 */
export const milestones = sqliteTable('milestones', {
  id: text('id').primaryKey(),
  startupId: text('startup_id').notNull().references(() => startups.id),
  title: text('title').notNull(),
  description: text('description'),
  type: text('type'), // product, revenue, funding, team, launch, partnership
  status: text('status').default('planned'), // planned, in-progress, completed, missed
  targetDate: integer('target_date', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  evidence: text('evidence'), // proof/link
  impact: text('impact'), // what changed after hitting this
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

/**
 * Investor updates
 */
export const investorUpdates = sqliteTable('investor_updates', {
  id: text('id').primaryKey(),
  startupId: text('startup_id').notNull().references(() => startups.id),
  period: text('period').notNull(), // YYYY-MM
  subject: text('subject').notNull(),
  content: text('content').notNull(), // markdown
  highlights: text('highlights', { mode: 'json' }), // key wins
  lowlights: text('lowlights', { mode: 'json' }), // challenges
  asks: text('asks', { mode: 'json' }), // what you need from investors
  metricsSnapshot: text('metrics_snapshot', { mode: 'json' }),
  sentAt: integer('sent_at', { mode: 'timestamp' }),
  recipientCount: integer('recipient_count'),
  openRate: real('open_rate'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

/**
 * Activity log for audit trail
 */
export const activityLog = sqliteTable('activity_log', {
  id: text('id').primaryKey(),
  startupId: text('startup_id').notNull().references(() => startups.id),
  actorId: text('actor_id'),
  actorType: text('actor_type').default('user'), // user, system, ai, investor
  action: text('action').notNull(),
  resource: text('resource').notNull(),
  resourceId: text('resource_id'),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})
