/**
 * Migration Runner - Executes migrations with single-flight protection
 *
 * The runner handles:
 * - Single-flight execution (prevents concurrent migrations)
 * - Forward-only migration application
 * - Schema hash validation
 * - Migration tracking in _migrations table
 *
 * @module migrations/runner
 */

import type { SqlStorage, DOState } from '../core.js'
import type {
  Migration,
  MigrationConfig,
  MigrationContext,
  MigrationRecord,
  MigrationResult,
  MigrationRunResult,
  MigrationStatus,
  SchemaDrift,
} from './types.js'
import {
  DEFAULT_MIGRATION_CONFIG,
  MigrationError,
  MigrationInProgressError,
  MigrationSqlError,
  SchemaDriftError,
} from './types.js'
import {
  getMigrations,
  getPendingMigrations,
  getLatestVersion,
} from './registry.js'
import {
  computeSchemaHashFromStorage,
  computeMigrationChecksum,
  schemasMatch,
} from './schema-hash.js'

// ============================================================================
// Types
// ============================================================================

/**
 * Options for creating a migration runner
 */
export interface MigrationRunnerOptions {
  /** DO type identifier */
  doType: string

  /** SQL storage interface */
  sql: SqlStorage

  /** DO state for blockConcurrencyWhile */
  state?: DOState

  /** Configuration overrides */
  config?: Partial<MigrationConfig>
}

// ============================================================================
// Migration Runner Class
// ============================================================================

/**
 * MigrationRunner - Executes migrations for a Durable Object
 *
 * Features:
 * - Single-flight execution prevents concurrent migrations
 * - Automatic _migrations table management
 * - Schema hash validation for drift detection
 * - Comprehensive logging and hooks
 *
 * @example
 * ```typescript
 * const runner = new MigrationRunner({
 *   doType: 'UserDO',
 *   sql: ctx.storage.sql,
 *   state: ctx,
 * })
 *
 * // Run all pending migrations
 * const result = await runner.run()
 *
 * // Check status
 * const status = await runner.getStatus()
 * ```
 */
export class MigrationRunner {
  private readonly doType: string
  private readonly sql: SqlStorage
  private readonly state?: DOState
  private readonly config: Required<MigrationConfig>

  /** In-flight migration promise for single-flight */
  private runningMigration: Promise<MigrationRunResult> | null = null

  /** Cached current version */
  private cachedVersion: number | null = null

  constructor(options: MigrationRunnerOptions) {
    this.doType = options.doType
    this.sql = options.sql
    this.state = options.state

    // Merge config with registered config and defaults
    const registered = getMigrations(options.doType)
    this.config = {
      ...DEFAULT_MIGRATION_CONFIG,
      ...registered?.config,
      ...options.config,
    }
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * Run all pending migrations
   *
   * Uses single-flight pattern: concurrent calls share the same Promise.
   * Uses blockConcurrencyWhile for safety in DO context.
   *
   * @returns Result of running migrations
   * @throws MigrationInProgressError if called while migrations are running in different context
   * @throws MigrationError on migration failure
   */
  async run(): Promise<MigrationRunResult> {
    // Single-flight: return existing promise if running
    if (this.runningMigration) {
      return this.runningMigration
    }

    // Create new migration promise
    this.runningMigration = this.executeRun()

    try {
      return await this.runningMigration
    } finally {
      this.runningMigration = null
    }
  }

  /**
   * Get current migration status
   */
  async getStatus(): Promise<MigrationStatus> {
    await this.ensureMigrationsTable()

    const currentVersion = await this.getCurrentVersion()
    const latestVersion = getLatestVersion(this.doType)
    const pending = getPendingMigrations(this.doType, currentVersion)

    let currentSchemaHash = ''
    let hasDrift = false

    try {
      currentSchemaHash = computeSchemaHashFromStorage(this.sql, [
        this.config.migrationsTable,
      ])

      // Check for drift by comparing with last migration's expected hash
      if (currentVersion > 0) {
        const lastRecord = await this.getLastMigrationRecord()
        if (lastRecord && this.config.validateSchemaHash) {
          hasDrift = !schemasMatch(lastRecord.schema_hash, currentSchemaHash)
        }
      }
    } catch {
      // Schema hash computation might fail on empty/new DB
    }

    const lastRecord = await this.getLastMigrationRecord()

    return {
      doType: this.doType,
      currentVersion,
      latestVersion,
      pendingCount: pending.length,
      pendingVersions: pending.map((m) => m.version),
      currentSchemaHash,
      hasDrift,
      lastMigrationAt: lastRecord?.applied_at ?? null,
    }
  }

  /**
   * Check if there are pending migrations
   */
  async hasPendingMigrations(): Promise<boolean> {
    const currentVersion = await this.getCurrentVersion()
    return getPendingMigrations(this.doType, currentVersion).length > 0
  }

  /**
   * Get current applied version
   */
  async getCurrentVersion(): Promise<number> {
    if (this.cachedVersion !== null) {
      return this.cachedVersion
    }

    await this.ensureMigrationsTable()

    const result = this.sql.exec<{ version: number }>(
      `SELECT MAX(version) as version FROM ${this.config.migrationsTable}`
    ).one()

    this.cachedVersion = result?.version ?? 0
    return this.cachedVersion
  }

  /**
   * Validate schema hash matches expected state
   *
   * @throws SchemaDriftError if drift is detected
   */
  async validateSchema(): Promise<void> {
    const currentVersion = await this.getCurrentVersion()
    if (currentVersion === 0) return

    const lastRecord = await this.getLastMigrationRecord()
    if (!lastRecord) return

    const actualHash = computeSchemaHashFromStorage(this.sql, [
      this.config.migrationsTable,
    ])

    if (!schemasMatch(lastRecord.schema_hash, actualHash)) {
      const drift: SchemaDrift = {
        expected: lastRecord.schema_hash,
        actual: actualHash,
        detectedAtVersion: currentVersion,
        description: 'Schema has been modified outside of migrations',
      }
      await this.config.onDriftDetected(drift)
      throw new SchemaDriftError(drift)
    }
  }

  // ==========================================================================
  // Internal Methods
  // ==========================================================================

  /**
   * Execute the migration run (internal)
   */
  private async executeRun(): Promise<MigrationRunResult> {
    const execute = async (): Promise<MigrationRunResult> => {
      await this.ensureMigrationsTable()

      const currentVersion = await this.getCurrentVersion()
      const pending = getPendingMigrations(this.doType, currentVersion)

      if (pending.length === 0) {
        return {
          results: [],
          applied: 0,
          failed: 0,
          totalDurationMs: 0,
          driftDetected: false,
        }
      }

      // Check for drift before running migrations
      let driftDetected = false
      let driftDetails: SchemaDrift | undefined

      if (this.config.validateSchemaHash && currentVersion > 0) {
        try {
          await this.validateSchema()
        } catch (error) {
          if (error instanceof SchemaDriftError) {
            driftDetected = true
            driftDetails = error.drift
            // Continue with migrations but record drift
          } else {
            throw error
          }
        }
      }

      const results: MigrationResult[] = []
      const startTime = Date.now()
      let applied = 0
      let failed = 0

      for (const migration of pending) {
        const result = await this.runSingleMigration(migration)
        results.push(result)

        if (result.success) {
          applied++
        } else {
          failed++
          // Stop on first failure
          break
        }
      }

      const totalDurationMs = Date.now() - startTime

      // Get final schema hash if all succeeded
      let finalSchemaHash: string | undefined
      if (failed === 0 && applied > 0) {
        finalSchemaHash = computeSchemaHashFromStorage(this.sql, [
          this.config.migrationsTable,
        ])
      }

      // Invalidate cache
      this.cachedVersion = null

      return {
        results,
        applied,
        failed,
        totalDurationMs,
        finalSchemaHash,
        driftDetected,
        driftDetails,
      }
    }

    // Use blockConcurrencyWhile if state is available
    if (this.state) {
      return new Promise((resolve, reject) => {
        this.state!.blockConcurrencyWhile(async () => {
          try {
            resolve(await execute())
          } catch (error) {
            reject(error)
          }
        })
      })
    }

    return execute()
  }

  /**
   * Run a single migration
   */
  private async runSingleMigration(migration: Migration): Promise<MigrationResult> {
    const startTime = Date.now()

    try {
      // Call before hook
      await this.config.onBeforeMigration(migration)

      // Execute SQL statements
      if (migration.sql?.length) {
        for (const statement of migration.sql) {
          try {
            this.sql.exec(statement)
          } catch (error) {
            throw new MigrationSqlError(
              migration.version,
              statement,
              error instanceof Error ? error : new Error(String(error))
            )
          }
        }
      }

      // Execute programmatic migration
      if (migration.up) {
        const context: MigrationContext = {
          version: migration.version,
          doType: this.doType,
          startedAt: startTime,
        }
        await migration.up(this.sql, context)
      }

      // Compute schema hash
      const schemaHash = computeSchemaHashFromStorage(this.sql, [
        this.config.migrationsTable,
      ])

      // Validate expected hash if provided
      if (
        this.config.validateSchemaHash &&
        migration.expectedHash &&
        !schemasMatch(migration.expectedHash, schemaHash)
      ) {
        const drift: SchemaDrift = {
          expected: migration.expectedHash,
          actual: schemaHash,
          detectedAtVersion: migration.version,
          description: 'Schema does not match expected hash after migration',
        }
        await this.config.onDriftDetected(drift)
        throw new SchemaDriftError(drift)
      }

      const durationMs = Date.now() - startTime

      // Record migration
      await this.recordMigration(migration, durationMs, schemaHash)

      const result: MigrationResult = {
        version: migration.version,
        name: migration.name,
        success: true,
        durationMs,
        schemaHash,
      }

      // Call after hook
      await this.config.onAfterMigration(result)

      return result
    } catch (error) {
      const result: MigrationResult = {
        version: migration.version,
        name: migration.name,
        success: false,
        durationMs: Date.now() - startTime,
        error: error instanceof Error ? error : new Error(String(error)),
      }

      // Call after hook even on failure
      await this.config.onAfterMigration(result)

      return result
    }
  }

  /**
   * Ensure _migrations table exists
   */
  private async ensureMigrationsTable(): Promise<void> {
    const tableName = this.config.migrationsTable

    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at INTEGER NOT NULL,
        duration_ms INTEGER NOT NULL,
        schema_hash TEXT NOT NULL,
        migration_checksum TEXT NOT NULL
      )
    `)

    // Create index for faster queries
    this.sql.exec(`
      CREATE INDEX IF NOT EXISTS idx_${tableName}_applied_at
      ON ${tableName} (applied_at DESC)
    `)
  }

  /**
   * Record a successful migration in _migrations table
   */
  private async recordMigration(
    migration: Migration,
    durationMs: number,
    schemaHash: string
  ): Promise<void> {
    const checksum = computeMigrationChecksum(migration.sql, !!migration.up)

    this.sql.exec(
      `INSERT INTO ${this.config.migrationsTable}
       (version, name, applied_at, duration_ms, schema_hash, migration_checksum)
       VALUES (?, ?, ?, ?, ?, ?)`,
      migration.version,
      migration.name,
      Date.now(),
      durationMs,
      schemaHash,
      checksum
    )

    // Update cache
    this.cachedVersion = migration.version
  }

  /**
   * Get the last applied migration record
   */
  private async getLastMigrationRecord(): Promise<MigrationRecord | null> {
    const result = this.sql.exec<MigrationRecord>(
      `SELECT * FROM ${this.config.migrationsTable}
       ORDER BY version DESC LIMIT 1`
    ).one()

    return result ?? null
  }

  /**
   * Get all applied migration records
   */
  async getAppliedMigrations(): Promise<MigrationRecord[]> {
    await this.ensureMigrationsTable()

    return this.sql.exec<MigrationRecord>(
      `SELECT * FROM ${this.config.migrationsTable}
       ORDER BY version ASC`
    ).toArray()
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a migration runner
 *
 * @param options - Runner options
 * @returns New MigrationRunner instance
 */
export function createMigrationRunner(
  options: MigrationRunnerOptions
): MigrationRunner {
  return new MigrationRunner(options)
}
