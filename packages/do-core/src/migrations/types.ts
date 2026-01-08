/**
 * Schema Migration Types for Durable Object Storage
 *
 * Provides type definitions for forward-only schema migrations
 * with versioning, hash validation, and status tracking.
 *
 * @module migrations/types
 */

import type { SqlStorage } from '../core.js'

// ============================================================================
// Core Migration Types
// ============================================================================

/**
 * A single migration definition
 *
 * Migrations are forward-only and identified by version number.
 * Each migration can contain SQL statements or programmatic changes.
 */
export interface Migration {
  /** Unique version number (must be sequential and positive) */
  version: number

  /** Human-readable name for the migration */
  name: string

  /** Optional description of what this migration does */
  description?: string

  /**
   * SQL statements to execute for this migration.
   * Executed in order. Each statement should be idempotent where possible.
   */
  sql?: string[]

  /**
   * Programmatic migration function for complex changes.
   * Called after SQL statements (if any) are executed.
   *
   * @param sql - SQL storage interface for executing queries
   * @param context - Migration context with metadata
   */
  up?: (sql: SqlStorage, context: MigrationContext) => Promise<void> | void

  /**
   * Schema hash after this migration is applied.
   * Used for drift detection. If not provided, computed automatically.
   */
  expectedHash?: string

  /**
   * Timestamp when migration was created (for documentation)
   */
  createdAt?: Date | string
}

/**
 * Context passed to programmatic migration functions
 */
export interface MigrationContext {
  /** Current migration version being applied */
  version: number

  /** DO type name (from registry) */
  doType: string

  /** Timestamp when migration started */
  startedAt: number
}

/**
 * Record of an applied migration stored in _migrations table
 */
export interface MigrationRecord {
  /** Migration version */
  version: number

  /** Migration name */
  name: string

  /** Timestamp when applied (Unix ms) */
  applied_at: number

  /** Duration in milliseconds to apply */
  duration_ms: number

  /** Schema hash after migration */
  schema_hash: string

  /** Checksum of migration content for integrity */
  migration_checksum: string
}

/**
 * Result of running a single migration
 */
export interface MigrationResult {
  /** Migration version */
  version: number

  /** Migration name */
  name: string

  /** Whether migration succeeded */
  success: boolean

  /** Duration in milliseconds */
  durationMs: number

  /** Error if migration failed */
  error?: Error

  /** Schema hash after migration (if successful) */
  schemaHash?: string
}

/**
 * Result of running all pending migrations
 */
export interface MigrationRunResult {
  /** All migration results in order */
  results: MigrationResult[]

  /** Total number of migrations applied */
  applied: number

  /** Total number of migrations that failed */
  failed: number

  /** Total duration for all migrations */
  totalDurationMs: number

  /** Final schema hash (if all succeeded) */
  finalSchemaHash?: string

  /** Whether schema drift was detected */
  driftDetected: boolean

  /** Drift details if detected */
  driftDetails?: SchemaDrift
}

/**
 * Schema drift detection result
 */
export interface SchemaDrift {
  /** Expected schema hash from migration */
  expected: string

  /** Actual schema hash from database */
  actual: string

  /** Migration version where drift was detected */
  detectedAtVersion: number

  /** Human-readable description of drift */
  description: string
}

/**
 * Status of migrations for a DO type
 */
export interface MigrationStatus {
  /** DO type name */
  doType: string

  /** Current applied version (0 if none) */
  currentVersion: number

  /** Latest available version from registry */
  latestVersion: number

  /** Number of pending migrations */
  pendingCount: number

  /** List of pending migration versions */
  pendingVersions: number[]

  /** Current schema hash */
  currentSchemaHash: string

  /** Whether drift has been detected */
  hasDrift: boolean

  /** Last migration timestamp */
  lastMigrationAt: number | null
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration for the migration system
 */
export interface MigrationConfig {
  /**
   * Table name for tracking migrations.
   * @default '_migrations'
   */
  migrationsTable?: string

  /**
   * Whether to validate schema hash after each migration.
   * @default true
   */
  validateSchemaHash?: boolean

  /**
   * Whether to auto-run migrations on first access.
   * @default true
   */
  autoMigrate?: boolean

  /**
   * Timeout for individual migrations in milliseconds.
   * @default 30000 (30 seconds)
   */
  migrationTimeoutMs?: number

  /**
   * Hook called before each migration runs.
   */
  onBeforeMigration?: (migration: Migration) => Promise<void> | void

  /**
   * Hook called after each migration completes.
   */
  onAfterMigration?: (result: MigrationResult) => Promise<void> | void

  /**
   * Hook called when schema drift is detected.
   */
  onDriftDetected?: (drift: SchemaDrift) => Promise<void> | void
}

/**
 * Default migration configuration
 */
export const DEFAULT_MIGRATION_CONFIG: Required<MigrationConfig> = {
  migrationsTable: '_migrations',
  validateSchemaHash: true,
  autoMigrate: true,
  migrationTimeoutMs: 30000,
  onBeforeMigration: () => {},
  onAfterMigration: () => {},
  onDriftDetected: () => {},
}

// ============================================================================
// Registry Types
// ============================================================================

/**
 * Migration definition for registration
 */
export interface MigrationDefinition extends Omit<Migration, 'version'> {
  /** Version is optional during definition, assigned by registry */
  version?: number
}

/**
 * Registered migrations for a DO type
 */
export interface RegisteredMigrations {
  /** DO type identifier */
  doType: string

  /** Ordered list of migrations */
  migrations: Migration[]

  /** Configuration overrides for this DO type */
  config?: Partial<MigrationConfig>
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Base class for migration errors
 */
export class MigrationError extends Error {
  constructor(
    message: string,
    public readonly version?: number,
    public readonly cause?: Error
  ) {
    super(message)
    this.name = 'MigrationError'
  }
}

/**
 * Error thrown when migration is already in progress
 */
export class MigrationInProgressError extends MigrationError {
  constructor(doType: string) {
    super(`Migration already in progress for DO type: ${doType}`)
    this.name = 'MigrationInProgressError'
  }
}

/**
 * Error thrown when migration version is invalid
 */
export class InvalidMigrationVersionError extends MigrationError {
  constructor(version: number, message: string) {
    super(message, version)
    this.name = 'InvalidMigrationVersionError'
  }
}

/**
 * Error thrown when schema drift is detected
 */
export class SchemaDriftError extends MigrationError {
  constructor(
    public readonly drift: SchemaDrift
  ) {
    super(
      `Schema drift detected at version ${drift.detectedAtVersion}: ` +
      `expected hash ${drift.expected}, got ${drift.actual}`,
      drift.detectedAtVersion
    )
    this.name = 'SchemaDriftError'
  }
}

/**
 * Error thrown when migration SQL fails
 */
export class MigrationSqlError extends MigrationError {
  constructor(
    version: number,
    public readonly sql: string,
    cause: Error
  ) {
    super(`Migration v${version} SQL failed: ${cause.message}`, version, cause)
    this.name = 'MigrationSqlError'
  }
}

/**
 * Error thrown when migration times out
 */
export class MigrationTimeoutError extends MigrationError {
  constructor(version: number, timeoutMs: number) {
    super(`Migration v${version} timed out after ${timeoutMs}ms`, version)
    this.name = 'MigrationTimeoutError'
  }
}
