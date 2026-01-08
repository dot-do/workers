/**
 * Migration Mixin for Durable Objects
 *
 * Provides automatic migration support for DOCore subclasses.
 * Migrations run on first access (lazy initialization pattern).
 *
 * @module migrations/mixin
 */

import type { DOState, DOStorage, DOEnv } from '../core.js'
import type {
  MigrationConfig,
  MigrationStatus,
  MigrationRunResult,
  MigrationDefinition,
  Migration,
} from './types.js'
import { MigrationRunner } from './runner.js'
import { registerMigrations, hasMigrations } from './registry.js'

// ============================================================================
// Types
// ============================================================================

/**
 * Interface for classes that provide migration context
 */
export interface MigrationProvider {
  /** Get the DO state */
  getState(): DOState

  /** Get the storage interface */
  getStorage(): DOStorage

  /** Get the DO type name for migration registry */
  getDoType(): string
}

/**
 * Type helper for constructors
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Constructor<T = object> = new (...args: any[]) => T

// ============================================================================
// Mixin Factory
// ============================================================================

/**
 * Migration Mixin factory function
 *
 * Creates a mixin class that adds automatic migration support to any base class
 * that implements the MigrationProvider interface.
 *
 * Features:
 * - Lazy migration on first access (ensureMigrated)
 * - Single-flight execution (concurrent calls share one migration)
 * - Schema hash validation
 * - Status tracking
 *
 * @example
 * ```typescript
 * class MyDO extends MigrationMixin(DOCore) {
 *   getState() { return this.ctx }
 *   getStorage() { return this.ctx.storage }
 *   getDoType() { return 'MyDO' }
 *
 *   async fetch(request: Request) {
 *     // Ensure migrations are run before any operation
 *     await this.ensureMigrated()
 *
 *     // Now safe to use the database
 *     const result = this.ctx.storage.sql.exec('SELECT * FROM users')
 *     return Response.json(result.toArray())
 *   }
 * }
 * ```
 *
 * @param Base - The base class to extend
 * @param config - Optional migration configuration
 * @returns A new class with migration support mixed in
 */
export function MigrationMixin<TBase extends Constructor<MigrationProvider>>(
  Base: TBase,
  config?: Partial<MigrationConfig>
) {
  return class extends Base {
    /** Migration runner instance */
    private _migrationRunner: MigrationRunner | null = null

    /** Whether migrations have been run */
    private _migrationsApplied = false

    /** In-flight migration promise */
    private _migrationPromise: Promise<MigrationRunResult> | null = null

    /**
     * Get or create the migration runner
     */
    private getMigrationRunner(): MigrationRunner {
      if (!this._migrationRunner) {
        this._migrationRunner = new MigrationRunner({
          doType: this.getDoType(),
          sql: this.getStorage().sql,
          state: this.getState(),
          config,
        })
      }
      return this._migrationRunner
    }

    /**
     * Ensure migrations are applied before database access
     *
     * This method should be called at the start of any operation
     * that accesses the database. It uses single-flight pattern
     * so concurrent calls share the same migration.
     *
     * @returns Result of running migrations (empty if already migrated)
     *
     * @example
     * ```typescript
     * async fetch(request: Request) {
     *   await this.ensureMigrated()
     *   // Database is now ready
     * }
     * ```
     */
    async ensureMigrated(): Promise<MigrationRunResult> {
      // Already migrated this session
      if (this._migrationsApplied) {
        return {
          results: [],
          applied: 0,
          failed: 0,
          totalDurationMs: 0,
          driftDetected: false,
        }
      }

      // Single-flight: return existing promise if running
      if (this._migrationPromise) {
        return this._migrationPromise
      }

      // Run migrations
      this._migrationPromise = this.getMigrationRunner().run()

      try {
        const result = await this._migrationPromise
        if (result.failed === 0) {
          this._migrationsApplied = true
        }
        return result
      } finally {
        this._migrationPromise = null
      }
    }

    /**
     * Check if migrations have been applied this session
     */
    isMigrated(): boolean {
      return this._migrationsApplied
    }

    /**
     * Get migration status
     */
    async getMigrationStatus(): Promise<MigrationStatus> {
      return this.getMigrationRunner().getStatus()
    }

    /**
     * Check if there are pending migrations
     */
    async hasPendingMigrations(): Promise<boolean> {
      return this.getMigrationRunner().hasPendingMigrations()
    }

    /**
     * Get current migration version
     */
    async getMigrationVersion(): Promise<number> {
      return this.getMigrationRunner().getCurrentVersion()
    }

    /**
     * Validate schema has not drifted
     *
     * @throws SchemaDriftError if drift detected
     */
    async validateSchema(): Promise<void> {
      return this.getMigrationRunner().validateSchema()
    }

    /**
     * Reset migration state (for testing)
     */
    resetMigrationState(): void {
      this._migrationsApplied = false
      this._migrationPromise = null
    }
  }
}

// ============================================================================
// Convenience Base Classes
// ============================================================================

/**
 * Abstract base class for Durable Objects with migration support
 *
 * Use this if you prefer classical inheritance over mixins.
 *
 * @example
 * ```typescript
 * class MyDO extends MigratableDO<Env> {
 *   getDoType() { return 'MyDO' }
 *
 *   async fetch(request: Request) {
 *     await this.ensureMigrated()
 *     // ...
 *   }
 * }
 * ```
 */
export abstract class MigratableDO<Env extends DOEnv = DOEnv>
  implements MigrationProvider
{
  protected readonly ctx: DOState
  protected readonly env: Env

  private _migrationRunner: MigrationRunner | null = null
  private _migrationsApplied = false
  private _migrationPromise: Promise<MigrationRunResult> | null = null

  constructor(ctx: DOState, env: Env) {
    this.ctx = ctx
    this.env = env
  }

  // Implement MigrationProvider interface
  getState(): DOState {
    return this.ctx
  }

  getStorage(): DOStorage {
    return this.ctx.storage
  }

  /** Subclasses must provide their DO type name */
  abstract getDoType(): string

  /**
   * Handle incoming HTTP requests
   */
  async fetch(_request: Request): Promise<Response> {
    throw new Error('MigratableDO.fetch() not implemented')
  }

  /**
   * Handle scheduled alarms
   */
  async alarm(): Promise<void> {
    throw new Error('MigratableDO.alarm() not implemented')
  }

  // Migration methods
  private getMigrationRunner(): MigrationRunner {
    if (!this._migrationRunner) {
      this._migrationRunner = new MigrationRunner({
        doType: this.getDoType(),
        sql: this.ctx.storage.sql,
        state: this.ctx,
      })
    }
    return this._migrationRunner
  }

  async ensureMigrated(): Promise<MigrationRunResult> {
    if (this._migrationsApplied) {
      return {
        results: [],
        applied: 0,
        failed: 0,
        totalDurationMs: 0,
        driftDetected: false,
      }
    }

    if (this._migrationPromise) {
      return this._migrationPromise
    }

    this._migrationPromise = this.getMigrationRunner().run()

    try {
      const result = await this._migrationPromise
      if (result.failed === 0) {
        this._migrationsApplied = true
      }
      return result
    } finally {
      this._migrationPromise = null
    }
  }

  isMigrated(): boolean {
    return this._migrationsApplied
  }

  async getMigrationStatus(): Promise<MigrationStatus> {
    return this.getMigrationRunner().getStatus()
  }

  async hasPendingMigrations(): Promise<boolean> {
    return this.getMigrationRunner().hasPendingMigrations()
  }

  async getMigrationVersion(): Promise<number> {
    return this.getMigrationRunner().getCurrentVersion()
  }

  async validateSchema(): Promise<void> {
    return this.getMigrationRunner().validateSchema()
  }

  protected resetMigrationState(): void {
    this._migrationsApplied = false
    this._migrationPromise = null
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Define migrations for a DO type
 *
 * This is a convenience function that combines migration definition
 * and registration in one step.
 *
 * @param doType - DO type identifier
 * @param migrations - Array of migration definitions
 * @param config - Optional configuration
 *
 * @example
 * ```typescript
 * defineMigrations('UserDO', [
 *   {
 *     name: 'create_users_table',
 *     sql: [`
 *       CREATE TABLE users (
 *         id TEXT PRIMARY KEY,
 *         email TEXT NOT NULL UNIQUE,
 *         data TEXT,
 *         created_at INTEGER NOT NULL
 *       )
 *     `],
 *   },
 *   {
 *     name: 'add_users_name_column',
 *     sql: ['ALTER TABLE users ADD COLUMN name TEXT'],
 *   },
 * ])
 * ```
 */
export function defineMigrations(
  doType: string,
  migrations: MigrationDefinition[],
  config?: Partial<MigrationConfig>
): void {
  registerMigrations(doType, migrations, config)
}

/**
 * Check if a DO type has migrations defined
 */
export function isMigratableType(doType: string): boolean {
  return hasMigrations(doType)
}

// ============================================================================
// Decorator for Auto-Migration
// ============================================================================

/**
 * Decorator that ensures a method runs migrations first
 *
 * Apply to async methods that require database access.
 *
 * @example
 * ```typescript
 * class MyDO extends MigratableDO {
 *   @RequiresMigration
 *   async fetch(request: Request) {
 *     // Migrations guaranteed to be complete
 *     return this.handleRequest(request)
 *   }
 * }
 * ```
 */
export function RequiresMigration(
  target: MigratableDO,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const original = descriptor.value as (...args: unknown[]) => Promise<unknown>

  descriptor.value = async function (this: MigratableDO, ...args: unknown[]) {
    await this.ensureMigrated()
    return original.apply(this, args)
  }

  return descriptor
}
