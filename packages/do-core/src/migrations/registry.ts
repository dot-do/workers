/**
 * Migration Registry - Central registration point for DO migrations
 *
 * The registry allows each DO type to define its own migrations
 * and provides discovery at runtime.
 *
 * @module migrations/registry
 */

import type {
  Migration,
  MigrationDefinition,
  MigrationConfig,
  RegisteredMigrations,
} from './types.js'
import { InvalidMigrationVersionError, MigrationError } from './types.js'

// ============================================================================
// Global Registry
// ============================================================================

/**
 * Global registry of migrations by DO type
 */
const migrationRegistry = new Map<string, RegisteredMigrations>()

// ============================================================================
// Registration Functions
// ============================================================================

/**
 * Register migrations for a Durable Object type.
 *
 * Migrations should be registered in order (version 1, 2, 3, etc.).
 * Versions must be sequential starting from 1.
 *
 * @param doType - Unique identifier for the DO type
 * @param migrations - Array of migration definitions
 * @param config - Optional configuration overrides
 *
 * @example
 * ```typescript
 * registerMigrations('UserDO', [
 *   {
 *     name: 'create_users_table',
 *     sql: [
 *       'CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, data TEXT)',
 *     ],
 *   },
 *   {
 *     name: 'add_email_index',
 *     sql: [
 *       'CREATE INDEX IF NOT EXISTS idx_users_email ON users (json_extract(data, "$.email"))',
 *     ],
 *   },
 * ])
 * ```
 */
export function registerMigrations(
  doType: string,
  migrations: MigrationDefinition[],
  config?: Partial<MigrationConfig>
): void {
  // Validate DO type
  if (!doType || doType.trim() === '') {
    throw new MigrationError('DO type cannot be empty')
  }

  // Convert definitions to migrations with version numbers
  const versionedMigrations: Migration[] = migrations.map((def, index) => {
    const version = def.version ?? index + 1

    // Validate version
    if (version <= 0) {
      throw new InvalidMigrationVersionError(
        version,
        `Migration version must be positive, got ${version}`
      )
    }

    if (!def.name || def.name.trim() === '') {
      throw new MigrationError(`Migration at version ${version} must have a name`)
    }

    // Must have either SQL or up function
    if (!def.sql?.length && !def.up) {
      throw new MigrationError(
        `Migration v${version} (${def.name}) must have sql or up function`
      )
    }

    return {
      version,
      name: def.name,
      description: def.description,
      sql: def.sql,
      up: def.up,
      expectedHash: def.expectedHash,
      createdAt: def.createdAt,
    }
  })

  // Sort by version
  versionedMigrations.sort((a, b) => a.version - b.version)

  // Validate version sequence
  for (let i = 0; i < versionedMigrations.length; i++) {
    const expected = i + 1
    const actual = versionedMigrations[i]!.version
    if (actual !== expected) {
      throw new InvalidMigrationVersionError(
        actual,
        `Migration versions must be sequential. Expected v${expected}, got v${actual}`
      )
    }
  }

  // Check for duplicates
  const versions = new Set<number>()
  for (const m of versionedMigrations) {
    if (versions.has(m.version)) {
      throw new InvalidMigrationVersionError(
        m.version,
        `Duplicate migration version: ${m.version}`
      )
    }
    versions.add(m.version)
  }

  // Register
  migrationRegistry.set(doType, {
    doType,
    migrations: versionedMigrations,
    config,
  })
}

/**
 * Get registered migrations for a DO type
 *
 * @param doType - The DO type identifier
 * @returns Registered migrations or undefined if not found
 */
export function getMigrations(doType: string): RegisteredMigrations | undefined {
  return migrationRegistry.get(doType)
}

/**
 * Get all registered DO types
 *
 * @returns Array of registered DO type names
 */
export function getRegisteredTypes(): string[] {
  return Array.from(migrationRegistry.keys())
}

/**
 * Check if a DO type has registered migrations
 *
 * @param doType - The DO type identifier
 * @returns true if migrations are registered
 */
export function hasMigrations(doType: string): boolean {
  return migrationRegistry.has(doType)
}

/**
 * Get the latest migration version for a DO type
 *
 * @param doType - The DO type identifier
 * @returns Latest version number or 0 if not registered
 */
export function getLatestVersion(doType: string): number {
  const registered = migrationRegistry.get(doType)
  if (!registered || registered.migrations.length === 0) {
    return 0
  }
  return registered.migrations[registered.migrations.length - 1]!.version
}

/**
 * Get migrations pending from a specific version
 *
 * @param doType - The DO type identifier
 * @param fromVersion - Current version (0 for fresh database)
 * @returns Array of pending migrations
 */
export function getPendingMigrations(
  doType: string,
  fromVersion: number
): Migration[] {
  const registered = migrationRegistry.get(doType)
  if (!registered) {
    return []
  }

  return registered.migrations.filter((m) => m.version > fromVersion)
}

/**
 * Clear all registered migrations (primarily for testing)
 */
export function clearRegistry(): void {
  migrationRegistry.clear()
}

/**
 * Unregister migrations for a specific DO type (primarily for testing)
 *
 * @param doType - The DO type to unregister
 * @returns true if the type was registered
 */
export function unregisterMigrations(doType: string): boolean {
  return migrationRegistry.delete(doType)
}

// ============================================================================
// Decorator-style Registration (Optional)
// ============================================================================

/**
 * Decorator factory for registering migrations on a DO class
 *
 * @param migrations - Array of migration definitions
 * @param config - Optional configuration overrides
 * @returns Class decorator
 *
 * @example
 * ```typescript
 * @WithMigrations([
 *   { name: 'initial', sql: ['CREATE TABLE users (...)'] },
 * ])
 * class UserDO extends DOCore {
 *   // ...
 * }
 * ```
 */
export function WithMigrations(
  migrations: MigrationDefinition[],
  config?: Partial<MigrationConfig>
) {
  return function <T extends { new (...args: unknown[]): unknown }>(target: T) {
    // Use class name as DO type
    const doType = target.name
    registerMigrations(doType, migrations, config)
    return target
  }
}

// ============================================================================
// Builder Pattern for Fluent Registration
// ============================================================================

/**
 * Migration builder for fluent registration
 */
export class MigrationBuilder {
  private doType: string
  private migrations: MigrationDefinition[] = []
  private config?: Partial<MigrationConfig>

  private constructor(doType: string) {
    this.doType = doType
  }

  /**
   * Start building migrations for a DO type
   */
  static for(doType: string): MigrationBuilder {
    return new MigrationBuilder(doType)
  }

  /**
   * Add a migration
   */
  add(migration: MigrationDefinition): this {
    this.migrations.push(migration)
    return this
  }

  /**
   * Add a SQL-only migration
   */
  sql(name: string, statements: string[]): this {
    return this.add({ name, sql: statements })
  }

  /**
   * Add a programmatic migration
   */
  up(
    name: string,
    fn: Migration['up']
  ): this {
    return this.add({ name, up: fn })
  }

  /**
   * Set configuration options
   */
  withConfig(config: Partial<MigrationConfig>): this {
    this.config = { ...this.config, ...config }
    return this
  }

  /**
   * Register all migrations
   */
  register(): void {
    registerMigrations(this.doType, this.migrations, this.config)
  }
}

/**
 * Convenience function to start building migrations
 *
 * @example
 * ```typescript
 * migrations('UserDO')
 *   .sql('create_users', ['CREATE TABLE users (...)'])
 *   .sql('add_index', ['CREATE INDEX ...'])
 *   .register()
 * ```
 */
export function migrations(doType: string): MigrationBuilder {
  return MigrationBuilder.for(doType)
}
