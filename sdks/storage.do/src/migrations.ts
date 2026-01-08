/**
 * Storage Migration System
 *
 * Provides data migration functionality for Durable Object storage with:
 * - Version tracking in storage metadata
 * - Sequential migration execution
 * - Rollback support
 * - Partial failure recovery
 * - Dry-run capability
 *
 * @module migrations
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Durable Object Storage interface
 */
export interface DurableObjectStorage {
  get<T = unknown>(key: string): Promise<T | undefined>
  get<T = unknown>(keys: string[]): Promise<Map<string, T>>
  put<T>(key: string, value: T): Promise<void>
  put<T>(entries: Record<string, T>): Promise<void>
  delete(key: string): Promise<boolean>
  delete(keys: string[]): Promise<number>
  list<T = unknown>(options?: {
    start?: string
    end?: string
    prefix?: string
    reverse?: boolean
    limit?: number
  }): Promise<Map<string, T>>
}

/**
 * A storage migration definition
 */
export interface StorageMigration {
  /** Migration version (format: YYYY.MM.NNN) */
  version: string
  /** Migration name */
  name: string
  /** Function to apply the migration */
  up: (storage: DurableObjectStorage) => Promise<void>
  /** Function to rollback the migration */
  down: (storage: DurableObjectStorage) => Promise<void>
}

/**
 * Configuration for migration manager
 */
export interface MigrationConfig {
  /** Whether to run in dry-run mode (don't apply changes) */
  dryRun?: boolean
  /** Key prefix for storing migration metadata */
  metadataPrefix?: string
}

/**
 * Result of a migration execution
 */
export interface MigrationResult {
  /** Migration version */
  version: string
  /** Migration name */
  name: string
  /** Whether the migration succeeded */
  success: boolean
  /** Duration in milliseconds */
  durationMs: number
  /** Error if migration failed */
  error?: Error
}

/**
 * Status of a migration
 */
export interface MigrationStatus {
  /** Migration version */
  version: string
  /** Migration name */
  name: string
  /** Whether migration has been applied */
  applied: boolean
  /** When migration was applied */
  appliedAt?: Date
}

// ============================================================================
// Migration Manager Implementation
// ============================================================================

const VERSION_REGEX = /^\d{4}\.\d{2}\.\d{3}$/
const METADATA_KEY_VERSION = '__storage_migration_version'
const METADATA_KEY_PREFIX = '__storage_migration_'

/**
 * Manages storage migrations for Durable Objects
 */
export class StorageMigrationManager {
  private storage: DurableObjectStorage
  private config: Required<MigrationConfig>
  private migrations: Map<string, StorageMigration> = new Map()

  constructor(storage: DurableObjectStorage, config: MigrationConfig = {}) {
    this.storage = storage
    this.config = {
      dryRun: config.dryRun ?? false,
      metadataPrefix: config.metadataPrefix ?? METADATA_KEY_PREFIX,
    }
  }

  /**
   * Get the current schema version from storage
   */
  async getCurrentVersion(): Promise<string | null> {
    const version = await this.storage.get<string>(METADATA_KEY_VERSION)
    return version ?? null
  }

  /**
   * Register a migration
   */
  register(migration: StorageMigration): void {
    // Validate version format
    if (!VERSION_REGEX.test(migration.version)) {
      throw new Error(
        `Invalid version format: ${migration.version}. Expected format: YYYY.MM.NNN`
      )
    }

    // Check for duplicate
    if (this.migrations.has(migration.version)) {
      throw new Error(`Migration with version ${migration.version} already registered (duplicate)`)
    }

    this.migrations.set(migration.version, migration)
  }

  /**
   * Get all migrations sorted by version
   */
  private getSortedMigrations(): StorageMigration[] {
    return Array.from(this.migrations.values()).sort((a, b) => a.version.localeCompare(b.version))
  }

  /**
   * Get pending (unapplied) migrations
   */
  async getPending(): Promise<StorageMigration[]> {
    const currentVersion = await this.getCurrentVersion()
    const sorted = this.getSortedMigrations()

    if (!currentVersion) {
      return sorted
    }

    return sorted.filter((m) => m.version > currentVersion)
  }

  /**
   * Get applied migrations
   */
  async getApplied(): Promise<StorageMigration[]> {
    const currentVersion = await this.getCurrentVersion()
    const sorted = this.getSortedMigrations()

    if (!currentVersion) {
      return []
    }

    return sorted.filter((m) => m.version <= currentVersion)
  }

  /**
   * Get status of all migrations
   */
  async getStatus(): Promise<MigrationStatus[]> {
    const currentVersion = await this.getCurrentVersion()
    const sorted = this.getSortedMigrations()

    const statuses: MigrationStatus[] = []

    for (const migration of sorted) {
      const applied = currentVersion !== null && migration.version <= currentVersion
      let appliedAt: Date | undefined

      if (applied) {
        // Try to get the timestamp from metadata
        const metadata = await this.storage.get<{ appliedAt: string }>(
          `${this.config.metadataPrefix}${migration.version}`
        )
        if (metadata?.appliedAt) {
          appliedAt = new Date(metadata.appliedAt)
        }
      }

      statuses.push({
        version: migration.version,
        name: migration.name,
        applied,
        appliedAt,
      })
    }

    return statuses
  }

  /**
   * Run all pending migrations
   */
  async migrate(): Promise<MigrationResult[]> {
    const pending = await this.getPending()
    const results: MigrationResult[] = []

    for (const migration of pending) {
      const result = await this.executeMigration(migration)
      results.push(result)

      // Stop on first failure
      if (!result.success) {
        break
      }
    }

    return results
  }

  /**
   * Execute a single migration
   */
  private async executeMigration(migration: StorageMigration): Promise<MigrationResult> {
    const startTime = Date.now()

    try {
      if (this.config.dryRun) {
        // In dry-run mode, just return success without executing
        return {
          version: migration.version,
          name: migration.name,
          success: true,
          durationMs: 0,
        }
      }

      // Execute the migration
      await migration.up(this.storage)

      // Store metadata
      await this.storage.put({
        [METADATA_KEY_VERSION]: migration.version,
        [`${this.config.metadataPrefix}${migration.version}`]: {
          appliedAt: new Date().toISOString(),
          name: migration.name,
        },
      })

      const durationMs = Date.now() - startTime

      return {
        version: migration.version,
        name: migration.name,
        success: true,
        durationMs,
      }
    } catch (error) {
      const durationMs = Date.now() - startTime

      return {
        version: migration.version,
        name: migration.name,
        success: false,
        durationMs,
        error: error instanceof Error ? error : new Error(String(error)),
      }
    }
  }

  /**
   * Rollback migrations
   * @param steps Number of migrations to rollback (default: 1)
   */
  async rollback(steps: number = 1): Promise<MigrationResult[]> {
    const applied = await this.getApplied()

    if (applied.length === 0) {
      throw new Error('No migrations to rollback')
    }

    // Get last N migrations in reverse order
    const toRollback = applied.slice(-steps).reverse()
    const results: MigrationResult[] = []

    for (const migration of toRollback) {
      const result = await this.rollbackMigration(migration)
      results.push(result)
    }

    return results
  }

  /**
   * Rollback to a specific version (exclusive - keeps that version)
   * @param targetVersion The version to rollback to (this version will be kept)
   */
  async rollbackTo(targetVersion: string): Promise<MigrationResult[]> {
    const migration = this.migrations.get(targetVersion)
    if (!migration) {
      throw new Error(`Migration with version ${targetVersion} not found`)
    }

    const applied = await this.getApplied()
    const targetIndex = applied.findIndex((m) => m.version === targetVersion)

    if (targetIndex === -1) {
      throw new Error(`Migration ${targetVersion} has not been applied`)
    }

    // Rollback all migrations after the target
    const toRollback = applied.slice(targetIndex + 1).reverse()
    const results: MigrationResult[] = []

    for (const migration of toRollback) {
      const result = await this.rollbackMigration(migration)
      results.push(result)
    }

    return results
  }

  /**
   * Rollback a single migration
   */
  private async rollbackMigration(migration: StorageMigration): Promise<MigrationResult> {
    const startTime = Date.now()

    try {
      // Execute the down migration
      await migration.down(this.storage)

      // Update version to previous migration
      const applied = await this.getApplied()
      const currentIndex = applied.findIndex((m) => m.version === migration.version)

      let newVersion: string | null = null
      if (currentIndex > 0) {
        newVersion = applied[currentIndex - 1].version
      }

      // Update or delete version
      if (newVersion) {
        await this.storage.put(METADATA_KEY_VERSION, newVersion)
      } else {
        await this.storage.delete(METADATA_KEY_VERSION)
      }

      // Delete migration metadata
      await this.storage.delete(`${this.config.metadataPrefix}${migration.version}`)

      const durationMs = Date.now() - startTime

      return {
        version: migration.version,
        name: migration.name,
        success: true,
        durationMs,
      }
    } catch (error) {
      const durationMs = Date.now() - startTime

      return {
        version: migration.version,
        name: migration.name,
        success: false,
        durationMs,
        error: error instanceof Error ? error : new Error(String(error)),
      }
    }
  }
}

/**
 * Create a new migration manager
 */
export function createMigrationManager(
  storage: DurableObjectStorage,
  config?: MigrationConfig
): StorageMigrationManager {
  return new StorageMigrationManager(storage, config)
}
