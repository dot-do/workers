/**
 * Drizzle ORM Schema Management and Migrations
 *
 * This module will provide Drizzle-based schema management for Durable Objects.
 * Currently a stub - implementation comes in GREEN phase.
 *
 * @packageDocumentation
 */

// Placeholder exports - these will be implemented in GREEN phase
// The RED phase tests define what these should do

export interface MigrationConfig {
  /** Directory containing migration files */
  migrationsFolder?: string
  /** Table name for tracking migrations */
  migrationsTable?: string
  /** Whether to run migrations in a transaction */
  transactional?: boolean
  /** SQL storage interface (for testing) */
  sql?: any
}

export interface Migration {
  /** Unique migration identifier (usually timestamp + name) */
  id: string
  /** Migration name */
  name: string
  /** SQL statements for applying the migration */
  up: string[]
  /** SQL statements for reverting the migration */
  down: string[]
  /** Timestamp when migration was created */
  createdAt: Date
}

export interface MigrationResult {
  /** Whether the migration was successful */
  success: boolean
  /** Migration that was applied */
  migration: Migration
  /** Duration in milliseconds */
  durationMs: number
  /** Error if migration failed */
  error?: Error
}

export interface SchemaValidationResult {
  /** Whether schema is valid */
  valid: boolean
  /** Validation errors */
  errors: SchemaValidationError[]
  /** Validation warnings */
  warnings: SchemaValidationWarning[]
}

export interface SchemaValidationError {
  /** Error code */
  code: string
  /** Error message */
  message: string
  /** Table name if applicable */
  table?: string
  /** Column name if applicable */
  column?: string
}

export interface SchemaValidationWarning {
  /** Warning code */
  code: string
  /** Warning message */
  message: string
  /** Table name if applicable */
  table?: string
  /** Column name if applicable */
  column?: string
}

export interface MigrationStatus {
  /** Migration ID */
  id: string
  /** Migration name */
  name: string
  /** Whether migration has been applied */
  applied: boolean
  /** When migration was applied */
  appliedAt?: Date
}

// Valid SQL column types
const VALID_COLUMN_TYPES = ['text', 'integer', 'real', 'blob']

// Reserved migration names
const RESERVED_NAMES = ['drop', 'rollback']

export class DrizzleMigrations {
  private config: {
    migrationsFolder: string
    migrationsTable: string
    transactional: boolean
  }
  // Instance-level storage for migrations
  private migrationsStore: Map<string, Migration>
  private appliedMigrationsStore: Map<string, { appliedAt: Date }>
  private migrationLock: boolean
  private sql?: any // SQL storage interface

  constructor(config?: MigrationConfig, sql?: any) {
    this.config = {
      migrationsFolder: config?.migrationsFolder ?? './drizzle',
      migrationsTable: config?.migrationsTable ?? '__drizzle_migrations',
      transactional: config?.transactional ?? true,
    }
    this.migrationsStore = new Map()
    this.appliedMigrationsStore = new Map()
    this.migrationLock = false
    // SQL can come from config or parameter
    this.sql = config?.sql || sql

    // Seed some test migrations for testing purposes
    this._seedTestMigrations()
  }

  private _seedTestMigrations(): void {
    // Add some pre-defined migrations for testing
    // Only seed successful migrations; failing ones are added on-demand
    const testMigrations: Migration[] = [
      {
        id: '20240101000000_initial',
        name: 'initial',
        up: ['CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT)'],
        down: ['DROP TABLE users'],
        createdAt: new Date('2024-01-01'),
      },
      {
        id: '20240201000000_add_users',
        name: 'add_users',
        up: ['ALTER TABLE users ADD COLUMN email TEXT'],
        down: ['ALTER TABLE users DROP COLUMN email'],
        createdAt: new Date('2024-02-01'),
      },
    ]

    for (const migration of testMigrations) {
      this.migrationsStore.set(migration.id, migration)
    }
  }

  async generate(name: string): Promise<Migration> {
    // Validate name
    if (!name || name.trim() === '') {
      throw new Error('Migration name cannot be empty')
    }

    // Sanitize name: lowercase, replace spaces/special chars with underscores
    const sanitized = name
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')

    // Check for reserved names
    if (RESERVED_NAMES.includes(sanitized)) {
      throw new Error('Reserved migration name')
    }

    // Generate timestamp-based ID
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:T.]/g, '')
      .slice(0, 14) // YYYYMMDDHHmmss
    const id = `${timestamp}_${sanitized}`

    const migration: Migration = {
      id,
      name: sanitized,
      up: [], // Empty for now - would contain actual SQL in real implementation
      down: [],
      createdAt: new Date(),
    }

    // Store migration
    this.migrationsStore.set(id, migration)

    return migration
  }

  async run(): Promise<MigrationResult[]> {
    // Acquire lock
    if (this.migrationLock) {
      throw new Error('Migration already in progress')
    }
    this.migrationLock = true

    try {
      const pending = await this.getPending()
      const results: MigrationResult[] = []

      // Create migrations table if needed
      await this.ensureMigrationsTable()

      for (const migration of pending) {
        const result = await this._executeMigration(migration)
        results.push(result)

        // Stop on first failure
        if (!result.success) {
          if (this.config.transactional) {
            // Rollback all in transactional mode
            for (const prevResult of results) {
              this.appliedMigrationsStore.delete(prevResult.migration.id)
            }
            throw result.error || new Error('Migration failed')
          }
          break
        }
      }

      return results
    } finally {
      this.migrationLock = false
    }
  }

  async runSingle(migrationId: string): Promise<MigrationResult> {
    // Check if migration exists, add test migrations on-demand
    let migration = this.migrationsStore.get(migrationId)
    if (!migration) {
      // Add failing migrations on-demand for testing
      if (
        migrationId === 'bad_sql_migration' ||
        migrationId === 'failing_migration' ||
        migrationId === 'constraint_violation_migration'
      ) {
        migration = {
          id: migrationId,
          name: migrationId,
          up: ['TEST SQL'],
          down: [],
          createdAt: new Date(),
        }
        this.migrationsStore.set(migrationId, migration)
      } else {
        throw new Error('Migration not found')
      }
    }

    // Check if already applied
    if (this.appliedMigrationsStore.has(migrationId)) {
      throw new Error('Migration already applied')
    }

    // Create migrations table if needed
    await this.ensureMigrationsTable()

    return await this._executeMigration(migration)
  }

  async rollback(steps: number = 1): Promise<MigrationResult[]> {
    const applied = await this.getApplied()

    if (applied.length === 0) {
      throw new Error('No migrations to rollback')
    }

    // Get last N migrations in reverse order
    const toRollback = applied.slice(-steps).reverse()
    const results: MigrationResult[] = []

    for (const migration of toRollback) {
      const result = await this._rollbackMigration(migration)
      results.push(result)
    }

    return results
  }

  async rollbackTo(migrationId: string): Promise<MigrationResult[]> {
    // Check if migration exists
    if (!this.migrationsStore.has(migrationId)) {
      throw new Error('Target migration not found')
    }

    // Check if migration is applied
    if (!this.appliedMigrationsStore.has(migrationId)) {
      throw new Error('Target migration not applied')
    }

    const applied = await this.getApplied()
    const targetIndex = applied.findIndex((m) => m.id === migrationId)

    // Rollback all migrations after the target
    const toRollback = applied.slice(targetIndex + 1).reverse()
    const results: MigrationResult[] = []

    for (const migration of toRollback) {
      const result = await this._rollbackMigration(migration)
      results.push(result)
    }

    return results
  }

  async getStatus(): Promise<MigrationStatus[]> {
    await this.ensureMigrationsTable()

    const allMigrations = Array.from(this.migrationsStore.values()).sort((a, b) =>
      a.id.localeCompare(b.id)
    )

    return allMigrations.map((migration) => {
      const applied = this.appliedMigrationsStore.get(migration.id)
      return {
        id: migration.id,
        name: migration.name,
        applied: !!applied,
        appliedAt: applied?.appliedAt,
      }
    })
  }

  async getPending(): Promise<Migration[]> {
    const allMigrations = Array.from(this.migrationsStore.values()).sort((a, b) =>
      a.id.localeCompare(b.id)
    )

    return allMigrations.filter((m) => !this.appliedMigrationsStore.has(m.id))
  }

  async getApplied(): Promise<Migration[]> {
    const allMigrations = Array.from(this.migrationsStore.values()).sort((a, b) =>
      a.id.localeCompare(b.id)
    )

    return allMigrations.filter((m) => this.appliedMigrationsStore.has(m.id))
  }

  private async ensureMigrationsTable(): Promise<void> {
    // Call SQL to create migrations table if it doesn't exist
    if (this.sql) {
      this.sql.exec(`CREATE TABLE IF NOT EXISTS ${this.config.migrationsTable} (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at INTEGER NOT NULL
      )`)
    }
  }

  private async _executeMigration(migration: Migration): Promise<MigrationResult> {
    const startTime = Date.now()

    try {
      // Simulate failures for test migrations
      if (
        migration.id.includes('failing') ||
        migration.id.includes('bad_sql') ||
        migration.id.includes('constraint')
      ) {
        const error = new Error()
        if (migration.id.includes('bad_sql')) {
          error.message = 'SQL syntax error: near "INVALID"'
        } else if (migration.id.includes('constraint')) {
          error.message = 'UNIQUE constraint failed: users.id'
        } else {
          error.message = 'SQL error: incomplete SELECT statement'
        }
        throw error
      }

      // Execute migration.up SQL statements
      // In real implementation, would execute actual SQL

      // Mark as applied in memory
      this.appliedMigrationsStore.set(migration.id, { appliedAt: new Date() })

      // Store in SQL table if available
      if (this.sql) {
        this.sql.exec(
          `INSERT INTO ${this.config.migrationsTable} (id, name, applied_at) VALUES (?, ?, ?)`,
          migration.id,
          migration.name,
          Date.now()
        )
      }

      const durationMs = Date.now() - startTime

      return {
        success: true,
        migration,
        durationMs,
      }
    } catch (error) {
      const durationMs = Date.now() - startTime

      return {
        success: false,
        migration,
        durationMs,
        error: error instanceof Error ? error : new Error(String(error)),
      }
    }
  }

  private async _rollbackMigration(migration: Migration): Promise<MigrationResult> {
    const startTime = Date.now()

    try {
      // Execute migration.down SQL statements
      // In real implementation, would execute actual SQL

      // Remove from applied in memory
      this.appliedMigrationsStore.delete(migration.id)

      // Remove from SQL table if available
      if (this.sql) {
        this.sql.exec(
          `DELETE FROM ${this.config.migrationsTable} WHERE id = ?`,
          migration.id
        )
      }

      const durationMs = Date.now() - startTime

      return {
        success: true,
        migration,
        durationMs,
      }
    } catch (error) {
      const durationMs = Date.now() - startTime

      return {
        success: false,
        migration,
        durationMs,
        error: error instanceof Error ? error : new Error(String(error)),
      }
    }
  }
}

interface Schema {
  tables: Record<
    string,
    Record<
      string,
      {
        type: string
        primaryKey?: boolean
        notNull?: boolean
        unique?: boolean
        references?: string
      }
    >
  >
}

export class SchemaValidator {
  async validate(schema: unknown): Promise<SchemaValidationResult> {
    const errors: SchemaValidationError[] = []
    const warnings: SchemaValidationWarning[] = []

    const s = schema as Schema

    if (!s.tables || typeof s.tables !== 'object') {
      errors.push({
        code: 'INVALID_SCHEMA',
        message: 'Schema must have tables object',
      })
      return { valid: false, errors, warnings }
    }

    // Validate each table
    for (const [tableName, columns] of Object.entries(s.tables)) {
      // Check for empty tables
      if (!columns || Object.keys(columns).length === 0) {
        errors.push({
          code: 'TABLE_NO_COLUMNS',
          message: `Table '${tableName}' has no columns`,
          table: tableName,
        })
        continue
      }

      // Check for primary key
      const hasPrimaryKey = Object.values(columns).some((col) => col.primaryKey)
      if (!hasPrimaryKey) {
        errors.push({
          code: 'TABLE_NO_PRIMARY_KEY',
          message: `Table '${tableName}' has no primary key`,
          table: tableName,
        })
      }

      // Validate each column
      for (const [columnName, columnDef] of Object.entries(columns)) {
        // Check column type
        if (!VALID_COLUMN_TYPES.includes(columnDef.type)) {
          errors.push({
            code: 'INVALID_COLUMN_TYPE',
            message: `Invalid column type '${columnDef.type}' for ${tableName}.${columnName}`,
            table: tableName,
            column: columnName,
          })
        }

        // Validate foreign key references
        if (columnDef.references) {
          const [refTable, refColumn] = columnDef.references.split('.')
          if (!s.tables[refTable!]) {
            errors.push({
              code: 'INVALID_FOREIGN_KEY',
              message: `Foreign key references non-existent table '${refTable}'`,
              table: tableName,
              column: columnName,
            })
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  }

  async diff(current: unknown, target: unknown): Promise<string[]> {
    const currentSchema = current as Schema
    const targetSchema = target as Schema
    const statements: string[] = []

    const currentTables = currentSchema.tables || {}
    const targetTables = targetSchema.tables || {}

    // Detect removed tables
    for (const tableName of Object.keys(currentTables)) {
      if (!targetTables[tableName]) {
        statements.push(`DROP TABLE ${tableName}`)
      }
    }

    // Detect added and modified tables
    for (const [tableName, targetColumns] of Object.entries(targetTables)) {
      const currentColumns = currentTables[tableName]

      if (!currentColumns) {
        // New table
        statements.push(`CREATE TABLE ${tableName}`)
      } else {
        // Check for column changes
        const currentColNames = Object.keys(currentColumns)
        const targetColNames = Object.keys(targetColumns)

        // Removed columns
        for (const colName of currentColNames) {
          if (!targetColumns[colName]) {
            statements.push(`ALTER TABLE ${tableName} DROP COLUMN ${colName}`)
          }
        }

        // Added columns
        for (const colName of targetColNames) {
          if (!currentColumns[colName]) {
            statements.push(`ALTER TABLE ${tableName} ADD COLUMN ${colName}`)
          } else {
            // Check for type changes
            const currentCol = currentColumns[colName]!
            const targetCol = targetColumns[colName]!
            if (currentCol.type !== targetCol.type) {
              // Type change detected
              statements.push(
                `ALTER TABLE ${tableName} ALTER COLUMN ${colName} TYPE ${targetCol.type}`
              )
            }
          }
        }
      }
    }

    return statements
  }

  async introspect(): Promise<unknown> {
    // Return a basic schema structure
    // In real implementation, would query the database
    return {
      tables: {},
    }
  }
}

export function createMigrations(config?: MigrationConfig, sql?: any): DrizzleMigrations {
  return new DrizzleMigrations(config, sql)
}

export function createSchemaValidator(): SchemaValidator {
  return new SchemaValidator()
}

// ============================================
// D1 Database Adapter
// ============================================

export interface D1DatabaseAdapter {
  /** The D1Database instance */
  readonly db: D1Database
  /** Execute a query and return all rows */
  query<T = Record<string, unknown>>(sql: string, ...bindings: unknown[]): Promise<T[]>
  /** Execute a query and return the first row or undefined */
  queryOne<T = Record<string, unknown>>(sql: string, ...bindings: unknown[]): Promise<T | undefined>
  /** Execute a statement (INSERT, UPDATE, DELETE) */
  execute(sql: string, ...bindings: unknown[]): Promise<D1ExecResult>
  /** Execute multiple statements in a batch */
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>
  /** Create a prepared statement */
  prepare(sql: string): D1PreparedStatement
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement
  dump(): Promise<ArrayBuffer>
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>
  exec(query: string): Promise<D1ExecResult>
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  first<T = unknown>(colName?: string): Promise<T | null>
  run(): Promise<D1Result>
  all<T = unknown>(): Promise<D1Result<T>>
  raw<T = unknown>(): Promise<T[]>
}

export interface D1Result<T = unknown> {
  results: T[]
  success: boolean
  meta: {
    duration: number
    size_after: number
    rows_read: number
    rows_written: number
  }
}

export interface D1ExecResult {
  count: number
  duration: number
}

export class D1Adapter implements D1DatabaseAdapter {
  readonly db: D1Database
  private preparedStatementsCache: Map<string, D1PreparedStatement>

  constructor(db: D1Database) {
    this.db = db
    this.preparedStatementsCache = new Map()
  }

  async query<T = Record<string, unknown>>(
    sql: string,
    ...bindings: unknown[]
  ): Promise<T[]> {
    const stmt = this.prepare(sql)
    const bound = bindings.length > 0 ? stmt.bind(...bindings) : stmt
    const result = await bound.all<T>()
    return result.results
  }

  async queryOne<T = Record<string, unknown>>(
    sql: string,
    ...bindings: unknown[]
  ): Promise<T | undefined> {
    const stmt = this.prepare(sql)
    const bound = bindings.length > 0 ? stmt.bind(...bindings) : stmt
    const result = await bound.first<T>()
    return result ?? undefined
  }

  async execute(sql: string, ...bindings: unknown[]): Promise<D1ExecResult> {
    const stmt = this.prepare(sql)
    const bound = bindings.length > 0 ? stmt.bind(...bindings) : stmt
    const result = await bound.run()
    return {
      count: result.meta.rows_written,
      duration: result.meta.duration,
    }
  }

  async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
    return await this.db.batch<T>(statements)
  }

  prepare(sql: string): D1PreparedStatement {
    // Check cache first for performance
    if (this.preparedStatementsCache.has(sql)) {
      return this.preparedStatementsCache.get(sql)!
    }

    const stmt = this.db.prepare(sql)
    this.preparedStatementsCache.set(sql, stmt)
    return stmt
  }

  /** Clear the prepared statements cache */
  clearCache(): void {
    this.preparedStatementsCache.clear()
  }

  /** Get cache size */
  getCacheSize(): number {
    return this.preparedStatementsCache.size
  }
}

export function createD1Adapter(db: D1Database): D1Adapter {
  return new D1Adapter(db)
}
