/**
 * Schema Migration System for Durable Object Storage
 *
 * Provides forward-only schema migrations with:
 * - Migration versioning within each DO's SQLite database
 * - Migration discovery and auto-application on DO initialization
 * - Schema hash validation to detect drift
 * - Migration status tracking table
 * - Single-flight execution (prevents concurrent migrations)
 *
 * @example
 * ```typescript
 * import {
 *   registerMigrations,
 *   MigrationMixin,
 *   defineMigrations,
 * } from '@dotdo/do-core/migrations'
 *
 * // Define migrations for a DO type
 * defineMigrations('UserDO', [
 *   {
 *     name: 'create_users_table',
 *     sql: [
 *       `CREATE TABLE users (
 *         id TEXT PRIMARY KEY,
 *         email TEXT NOT NULL UNIQUE,
 *         data TEXT
 *       )`,
 *     ],
 *   },
 *   {
 *     name: 'add_timestamps',
 *     sql: [
 *       'ALTER TABLE users ADD COLUMN created_at INTEGER',
 *       'ALTER TABLE users ADD COLUMN updated_at INTEGER',
 *     ],
 *   },
 * ])
 *
 * // Use in a DO class
 * class UserDO extends MigrationMixin(DOCore) {
 *   getState() { return this.ctx }
 *   getStorage() { return this.ctx.storage }
 *   getDoType() { return 'UserDO' }
 *
 *   async fetch(request: Request) {
 *     await this.ensureMigrated()
 *     // Database is now ready with latest schema
 *   }
 * }
 * ```
 *
 * @module migrations
 */

// Re-export types
export type {
  Migration,
  MigrationContext,
  MigrationRecord,
  MigrationResult,
  MigrationRunResult,
  MigrationStatus,
  MigrationConfig,
  MigrationDefinition,
  RegisteredMigrations,
  SchemaDrift,
} from './types.js'

// Re-export error types
export {
  MigrationError,
  MigrationInProgressError,
  InvalidMigrationVersionError,
  SchemaDriftError,
  MigrationSqlError,
  MigrationTimeoutError,
  DEFAULT_MIGRATION_CONFIG,
} from './types.js'

// Re-export registry functions
export {
  registerMigrations,
  getMigrations,
  getRegisteredTypes,
  hasMigrations,
  getLatestVersion,
  getPendingMigrations,
  clearRegistry,
  unregisterMigrations,
  WithMigrations,
  MigrationBuilder,
  migrations,
} from './registry.js'

// Re-export runner
export { MigrationRunner, createMigrationRunner } from './runner.js'
export type { MigrationRunnerOptions } from './runner.js'

// Re-export mixin
export {
  MigrationMixin,
  MigratableDO,
  defineMigrations,
  isMigratableType,
  RequiresMigration,
} from './mixin.js'
export type { MigrationProvider } from './mixin.js'

// Re-export schema hash utilities
export {
  extractSchema,
  computeSchemaHash,
  computeSchemaHashFromStorage,
  computeMigrationChecksum,
  schemasMatch,
  describeSchemaChanges,
} from './schema-hash.js'
export type {
  SchemaInfo,
  TableInfo,
  ColumnInfo,
  IndexInfo,
  TriggerInfo,
} from './schema-hash.js'
