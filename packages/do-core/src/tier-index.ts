/**
 * TierIndex - Repository for tracking data location across storage tiers
 *
 * Tracks where data lives across storage tiers:
 * - hot: SQLite storage in DO (fast, limited)
 * - warm: R2 storage (medium speed, larger)
 * - cold: Archive/external storage (slow, unlimited)
 *
 * @module tier-index
 */

import type { SqlStorage } from './core.js'

// ============================================================================
// Schema Definition
// ============================================================================

/**
 * SQL statements for TierIndex table initialization
 */
export const TIER_INDEX_SCHEMA_SQL = `
-- Tier Index table (tracks data location across storage tiers)
CREATE TABLE IF NOT EXISTS tier_index (
  id TEXT PRIMARY KEY,
  source_table TEXT NOT NULL,
  tier TEXT NOT NULL CHECK(tier IN ('hot', 'warm', 'cold')),
  location TEXT,
  created_at INTEGER NOT NULL,
  migrated_at INTEGER,
  accessed_at INTEGER,
  access_count INTEGER DEFAULT 0
);

-- Index for tier queries
CREATE INDEX IF NOT EXISTS idx_tier_index_tier ON tier_index(tier);

-- Index for source table queries
CREATE INDEX IF NOT EXISTS idx_tier_index_source ON tier_index(source_table);

-- Index for migration eligibility queries (finding stale items)
CREATE INDEX IF NOT EXISTS idx_tier_index_accessed ON tier_index(accessed_at);
`

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Storage tier type
 */
export type StorageTier = 'hot' | 'warm' | 'cold'

/**
 * Tier index entry representing an item's location
 */
export interface TierIndexEntry {
  /** Unique identifier for the item */
  id: string
  /** Source table name (e.g., 'events', 'things', 'search') */
  sourceTable: string
  /** Current storage tier */
  tier: StorageTier
  /** Location URI for warm/cold tiers (R2 key, archive path) */
  location: string | null
  /** Timestamp when first recorded */
  createdAt: number
  /** Timestamp when last migrated between tiers */
  migratedAt: number | null
  /** Timestamp when last accessed */
  accessedAt: number | null
  /** Total number of accesses */
  accessCount: number
}

/**
 * Input for creating a new tier index entry
 */
export interface CreateTierIndexInput {
  /** Unique identifier for the item */
  id: string
  /** Source table name */
  sourceTable: string
  /** Storage tier */
  tier: StorageTier
  /** Location URI for warm/cold tiers */
  location?: string
}

/**
 * Input for updating a tier index entry
 */
export interface UpdateTierIndexInput {
  /** New storage tier */
  tier?: StorageTier
  /** New location URI */
  location?: string
}

/**
 * Options for finding items eligible for migration
 */
export interface MigrationEligibility {
  /** Source tier to migrate from */
  fromTier: StorageTier
  /** Threshold in milliseconds - items not accessed within this time are eligible */
  accessThresholdMs?: number
  /** Maximum access count for eligibility */
  maxAccessCount?: number
  /** Maximum number of items to return */
  limit?: number
  /** Order by field */
  orderBy?: 'accessed_at' | 'created_at' | 'access_count'
  /** Order direction */
  orderDirection?: 'asc' | 'desc'
  /** Filter by source table */
  sourceTable?: string
}

/**
 * Statistics about tier distribution
 */
export interface TierStatistics {
  /** Count of items in hot tier */
  hot: number
  /** Count of items in warm tier */
  warm: number
  /** Count of items in cold tier */
  cold: number
  /** Total item count */
  total: number
}

/**
 * Options for batch migration
 */
export interface BatchMigrateOptions {
  /** If true, entire batch fails if any item fails */
  atomic?: boolean
}

/**
 * Migration update for batch operations
 */
export interface MigrationUpdate {
  id: string
  tier: StorageTier
  location: string
}

// ============================================================================
// TierIndex Repository
// ============================================================================

/**
 * Repository for tracking data location across storage tiers.
 *
 * This is the index that tracks where every piece of data lives,
 * enabling efficient tiered storage management.
 *
 * @example
 * ```typescript
 * const tierIndex = new TierIndex(sql)
 * await tierIndex.ensureSchema()
 *
 * // Record a hot item
 * await tierIndex.record({
 *   id: 'event-001',
 *   sourceTable: 'events',
 *   tier: 'hot',
 * })
 *
 * // Find items eligible for migration
 * const staleItems = await tierIndex.findEligibleForMigration({
 *   fromTier: 'hot',
 *   accessThresholdMs: 24 * 60 * 60 * 1000, // 24 hours
 *   limit: 100,
 * })
 *
 * // Migrate to warm tier
 * for (const item of staleItems) {
 *   await tierIndex.migrate(item.id, {
 *     tier: 'warm',
 *     location: `r2://bucket/events/${item.id}.json`,
 *   })
 * }
 * ```
 */
export class TierIndex {
  private schemaInitialized = false

  constructor(private readonly sql: SqlStorage) {}

  /**
   * Ensure the tier_index schema is initialized
   */
  async ensureSchema(): Promise<void> {
    if (this.schemaInitialized) {
      return
    }
    // Execute the full schema SQL (split by statement boundaries)
    // Remove comment lines first, then split by semicolons
    const cleanedSql = TIER_INDEX_SCHEMA_SQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n')

    const statements = cleanedSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    for (const stmt of statements) {
      this.sql.exec(stmt)
    }
    this.schemaInitialized = true
  }

  /**
   * Record a new item's location
   */
  async record(input: CreateTierIndexInput): Promise<TierIndexEntry> {
    await this.ensureSchema()

    // Validate location requirement for warm/cold tiers
    if ((input.tier === 'warm' || input.tier === 'cold') && !input.location) {
      throw new Error(`location is required for ${input.tier} tier`)
    }

    const now = Date.now()
    const migratedAt = input.tier !== 'hot' ? now : null
    const location = input.location ?? null

    this.sql.exec(
      `INSERT INTO tier_index (id, source_table, tier, location, created_at, migrated_at, accessed_at, access_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      input.id,
      input.sourceTable,
      input.tier,
      location,
      now,
      migratedAt,
      null,
      0
    )

    return {
      id: input.id,
      sourceTable: input.sourceTable,
      tier: input.tier,
      location,
      createdAt: now,
      migratedAt,
      accessedAt: null,
      accessCount: 0,
    }
  }

  /**
   * Get an entry by ID
   */
  async get(id: string): Promise<TierIndexEntry | null> {
    await this.ensureSchema()

    const cursor = this.sql.exec<Record<string, unknown>>(
      `SELECT id, source_table, tier, location, created_at, migrated_at, accessed_at, access_count
       FROM tier_index WHERE id = ?`,
      id
    )

    const row = cursor.one()
    if (!row) {
      return null
    }

    return this.rowToEntry(row)
  }

  /**
   * Delete an entry by ID
   */
  async delete(id: string): Promise<boolean> {
    await this.ensureSchema()

    // First check if the entry exists
    const existing = await this.get(id)
    if (!existing) {
      return false
    }

    this.sql.exec(`DELETE FROM tier_index WHERE id = ?`, id)
    return true
  }

  /**
   * Find all items in a specific tier
   */
  async findByTier(tier: StorageTier, options?: { sourceTable?: string }): Promise<TierIndexEntry[]> {
    await this.ensureSchema()

    let query = `SELECT id, source_table, tier, location, created_at, migrated_at, accessed_at, access_count
                 FROM tier_index WHERE tier = ?`
    const params: unknown[] = [tier]

    if (options?.sourceTable) {
      query += ` AND source_table = ?`
      params.push(options.sourceTable)
    }

    const cursor = this.sql.exec<Record<string, unknown>>(query, ...params)

    return cursor.toArray().map(row => this.rowToEntry(row))
  }

  /**
   * Find items eligible for migration
   */
  async findEligibleForMigration(criteria: MigrationEligibility): Promise<TierIndexEntry[]> {
    await this.ensureSchema()

    const conditions: string[] = ['tier = ?']
    const params: unknown[] = [criteria.fromTier]

    // Filter by access threshold
    if (criteria.accessThresholdMs !== undefined) {
      const thresholdTime = Date.now() - criteria.accessThresholdMs
      conditions.push(`(accessed_at < ? OR accessed_at IS NULL)`)
      params.push(thresholdTime)
    }

    // Filter by max access count
    if (criteria.maxAccessCount !== undefined) {
      conditions.push(`access_count <= ?`)
      params.push(criteria.maxAccessCount)
    }

    // Filter by source table
    if (criteria.sourceTable) {
      conditions.push(`source_table = ?`)
      params.push(criteria.sourceTable)
    }

    let query = `SELECT id, source_table, tier, location, created_at, migrated_at, accessed_at, access_count
                 FROM tier_index WHERE ${conditions.join(' AND ')}`

    // Order by
    const orderBy = criteria.orderBy ?? 'accessed_at'
    const orderDirection = criteria.orderDirection ?? 'asc'
    query += ` ORDER BY ${orderBy} ${orderDirection.toUpperCase()} NULLS FIRST`

    // Limit
    if (criteria.limit !== undefined) {
      query += ` LIMIT ?`
      params.push(criteria.limit)
    }

    const cursor = this.sql.exec<Record<string, unknown>>(query, ...params)

    return cursor.toArray().map(row => this.rowToEntry(row))
  }

  /**
   * Migrate an item to a new tier
   */
  async migrate(
    id: string,
    update: { tier: StorageTier; location: string }
  ): Promise<TierIndexEntry | null> {
    await this.ensureSchema()

    // Check if entry exists
    const existing = await this.get(id)
    if (!existing) {
      return null
    }

    const now = Date.now()

    this.sql.exec(
      `UPDATE tier_index SET tier = ?, location = ?, migrated_at = ? WHERE id = ?`,
      update.tier,
      update.location,
      now,
      id
    )

    return {
      ...existing,
      tier: update.tier,
      location: update.location,
      migratedAt: now,
    }
  }

  /**
   * Batch migrate multiple items
   */
  async batchMigrate(
    updates: MigrationUpdate[],
    options?: BatchMigrateOptions
  ): Promise<(TierIndexEntry | null)[]> {
    await this.ensureSchema()

    if (options?.atomic) {
      // For atomic mode, first verify all items exist
      const results: (TierIndexEntry | null)[] = []
      const existingItems: TierIndexEntry[] = []

      for (const update of updates) {
        const existing = await this.get(update.id)
        if (!existing) {
          throw new Error(`batch migration failed: item ${update.id} not found`)
        }
        existingItems.push(existing)
      }

      // All items exist, perform the migrations
      for (let i = 0; i < updates.length; i++) {
        const update = updates[i]!
        const result = await this.migrate(update.id, { tier: update.tier, location: update.location })
        results.push(result)
      }

      return results
    }

    // Non-atomic mode: try each migration, allow partial failures
    const results: (TierIndexEntry | null)[] = []
    for (const update of updates) {
      const result = await this.migrate(update.id, { tier: update.tier, location: update.location })
      results.push(result)
    }

    return results
  }

  /**
   * Record an access to an item
   */
  async recordAccess(id: string): Promise<void> {
    await this.ensureSchema()

    const now = Date.now()
    this.sql.exec(
      `UPDATE tier_index SET accessed_at = ?, access_count = access_count + 1 WHERE id = ?`,
      now,
      id
    )
  }

  /**
   * Batch record accesses
   */
  async batchRecordAccess(ids: string[]): Promise<void> {
    await this.ensureSchema()

    for (const id of ids) {
      await this.recordAccess(id)
    }
  }

  /**
   * Get tier distribution statistics
   */
  async getStatistics(options?: { sourceTable?: string }): Promise<TierStatistics> {
    await this.ensureSchema()

    // For mock compatibility, get all items and count them manually
    // The mock doesn't support GROUP BY well
    const allTiers: StorageTier[] = ['hot', 'warm', 'cold']
    const stats: TierStatistics = {
      hot: 0,
      warm: 0,
      cold: 0,
      total: 0,
    }

    for (const tier of allTiers) {
      const items = await this.findByTier(tier, options)
      stats[tier] = items.length
      stats.total += items.length
    }

    return stats
  }

  /**
   * Convert a database row to a TierIndexEntry
   * Handles both snake_case (real SQLite) and camelCase (mock) formats
   */
  private rowToEntry(row: Record<string, unknown>): TierIndexEntry {
    // Handle both snake_case (real DB) and camelCase (mock) formats
    return {
      id: (row.id as string),
      sourceTable: (row.source_table ?? row.sourceTable) as string,
      tier: (row.tier) as StorageTier,
      location: (row.location ?? null) as string | null,
      createdAt: (row.created_at ?? row.createdAt) as number,
      migratedAt: (row.migrated_at ?? row.migratedAt ?? null) as number | null,
      accessedAt: (row.accessed_at ?? row.accessedAt ?? null) as number | null,
      accessCount: (row.access_count ?? row.accessCount ?? 0) as number,
    }
  }
}
