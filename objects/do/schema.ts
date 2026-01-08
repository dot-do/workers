/**
 * Drizzle Schema Definitions for dotdo
 *
 * This module provides base schema definitions using Drizzle ORM for SQLite.
 * These schemas are designed to work with Cloudflare Durable Object SQL storage.
 *
 * @example
 * ```typescript
 * import { schema, documents, things } from 'dotdo'
 * import { drizzle } from 'drizzle-orm/d1'
 *
 * class MyDO extends DO {
 *   db = drizzle(this.ctx.storage.sql, { schema })
 *
 *   async getDocuments() {
 *     return this.db.select().from(documents)
 *   }
 * }
 * ```
 */

import { sqliteTable, text, integer, index, uniqueIndex, blob } from 'drizzle-orm/sqlite-core'

// ============================================================================
// Core Document Table
// ============================================================================

/**
 * Documents table - Generic document storage
 *
 * A flexible key-value style table for storing JSON documents
 * organized by collection.
 */
export const documents = sqliteTable('documents', {
  /** Collection name for organizing documents */
  collection: text('collection').notNull(),
  /** Unique document identifier within collection */
  _id: text('_id').notNull(),
  /** JSON-serialized document data */
  data: text('data').notNull(),
  /** Creation timestamp (Unix ms) */
  createdAt: integer('created_at').notNull(),
  /** Last update timestamp (Unix ms) */
  updatedAt: integer('updated_at').notNull(),
}, (table) => ({
  /** Index for collection-based queries */
  collectionIdx: index('idx_documents_collection').on(table.collection),
  /** Unique index for document lookup */
  documentIdIdx: uniqueIndex('idx_documents_id').on(table.collection, table._id),
}))

// ============================================================================
// Things Table (Schema.org Compatible)
// ============================================================================

/**
 * Things table - Schema.org compatible entity storage
 *
 * Stores entities using Schema.org conventions with namespace support
 * for multi-tenant or categorized data.
 */
export const things = sqliteTable('things', {
  /** Namespace for multi-tenant or categorization */
  ns: text('ns').notNull().default('default'),
  /** Schema.org @type (e.g., 'Person', 'Organization') */
  type: text('type').notNull(),
  /** Unique identifier within namespace and type */
  id: text('id').notNull(),
  /** Canonical URL for this thing */
  url: text('url'),
  /** JSON-serialized thing data */
  data: text('data').notNull(),
  /** JSON-LD @context override */
  context: text('context'),
  /** Creation timestamp (Unix ms) */
  createdAt: integer('created_at').notNull(),
  /** Last update timestamp (Unix ms) */
  updatedAt: integer('updated_at').notNull(),
}, (table) => ({
  /** Primary lookup index */
  thingIdIdx: uniqueIndex('idx_things_ns_type_id').on(table.ns, table.type, table.id),
  /** URL lookup index */
  urlIdx: index('idx_things_url').on(table.url),
  /** Type-based queries */
  typeIdx: index('idx_things_type').on(table.ns, table.type),
  /** Namespace-based queries */
  nsIdx: index('idx_things_ns').on(table.ns),
}))

// ============================================================================
// Events Table (Event Sourcing)
// ============================================================================

/**
 * Events table - Event sourcing support
 *
 * Stores immutable events for event-sourced aggregates.
 */
export const events = sqliteTable('events', {
  /** Auto-incrementing event ID */
  id: integer('id').primaryKey({ autoIncrement: true }),
  /** Stream/aggregate identifier */
  streamId: text('stream_id').notNull(),
  /** Stream type (e.g., 'Order', 'User') */
  streamType: text('stream_type').notNull(),
  /** Event type (e.g., 'OrderPlaced', 'UserCreated') */
  eventType: text('event_type').notNull(),
  /** JSON-serialized event payload */
  payload: text('payload').notNull(),
  /** JSON-serialized event metadata */
  metadata: text('metadata'),
  /** Event version within stream */
  version: integer('version').notNull(),
  /** Event timestamp (Unix ms) */
  timestamp: integer('timestamp').notNull(),
}, (table) => ({
  /** Stream lookup index */
  streamIdx: index('idx_events_stream').on(table.streamId, table.streamType),
  /** Version ordering index */
  versionIdx: uniqueIndex('idx_events_version').on(table.streamId, table.version),
  /** Type-based queries */
  typeIdx: index('idx_events_type').on(table.eventType),
  /** Timestamp ordering */
  timestampIdx: index('idx_events_timestamp').on(table.timestamp),
}))

// ============================================================================
// Schema Version Table
// ============================================================================

/**
 * Schema version table - Migration tracking
 *
 * Tracks applied schema versions for migration management.
 */
export const schemaVersion = sqliteTable('schema_version', {
  /** Schema version number */
  version: integer('version').primaryKey(),
  /** When this version was applied (Unix ms) */
  appliedAt: integer('applied_at').notNull(),
})

// ============================================================================
// Key-Value Store Table
// ============================================================================

/**
 * KV table - Simple key-value storage
 *
 * A simple key-value store for configuration, cache, or settings.
 */
export const kv = sqliteTable('kv', {
  /** Key identifier */
  key: text('key').primaryKey(),
  /** JSON-serialized value */
  value: text('value').notNull(),
  /** Optional TTL expiration (Unix ms) */
  expiresAt: integer('expires_at'),
  /** Last update timestamp (Unix ms) */
  updatedAt: integer('updated_at').notNull(),
})

// ============================================================================
// Vector Embeddings Table (for AI/Search)
// ============================================================================

/**
 * Embeddings table - Vector storage for semantic search
 *
 * Stores vector embeddings for similarity search and AI features.
 */
export const embeddings = sqliteTable('embeddings', {
  /** Unique embedding identifier */
  id: text('id').primaryKey(),
  /** Source document/entity ID */
  sourceId: text('source_id').notNull(),
  /** Source type (e.g., 'document', 'thing') */
  sourceType: text('source_type').notNull(),
  /** Text content that was embedded */
  content: text('content'),
  /** Binary vector data */
  vector: blob('vector').notNull(),
  /** Vector dimensions */
  dimensions: integer('dimensions').notNull(),
  /** Embedding model used */
  model: text('model'),
  /** Creation timestamp (Unix ms) */
  createdAt: integer('created_at').notNull(),
}, (table) => ({
  /** Source lookup index */
  sourceIdx: index('idx_embeddings_source').on(table.sourceId, table.sourceType),
  /** Model-based queries */
  modelIdx: index('idx_embeddings_model').on(table.model),
}))

// ============================================================================
// Auth Tables (for dotdo/auth)
// ============================================================================

/**
 * Users table - Better Auth compatible
 */
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  image: text('image'),
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false),
  role: text('role').default('user'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
})

/**
 * Sessions table - Better Auth compatible
 */
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: integer('expires_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at').notNull(),
}, (table) => ({
  userIdx: index('idx_sessions_user').on(table.userId),
  tokenIdx: uniqueIndex('idx_sessions_token').on(table.token),
}))

/**
 * Accounts table - OAuth provider accounts
 */
export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  expiresAt: integer('expires_at'),
  tokenType: text('token_type'),
  scope: text('scope'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => ({
  userIdx: index('idx_accounts_user').on(table.userId),
  providerIdx: uniqueIndex('idx_accounts_provider').on(table.provider, table.providerAccountId),
}))

// ============================================================================
// Combined Schema Export
// ============================================================================

/**
 * Complete schema object for Drizzle
 *
 * @example
 * ```typescript
 * import { schema } from 'dotdo'
 * import { drizzle } from 'drizzle-orm/d1'
 *
 * const db = drizzle(sql, { schema })
 * ```
 */
export const schema = {
  documents,
  things,
  events,
  schemaVersion,
  kv,
  embeddings,
  users,
  sessions,
  accounts,
}

/**
 * Auth schema subset for dotdo/auth
 */
export const authSchema = {
  users,
  sessions,
  accounts,
}
